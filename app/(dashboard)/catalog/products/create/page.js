// app/(dashboard)/catalog/products/create/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Save, ArrowLeft, Plus, Trash2, Box, Info } from 'lucide-react';

// --- INTEGRASI FINANCE SSOT ---
import { recordAdjustmentTransaction } from '@/lib/transactionService';

export default function CreateProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Config Data
    const [warehouses, setWarehouses] = useState([]);
    const [financeConfig, setFinanceConfig] = useState(null);

    // Form State
    const [product, setProduct] = useState({ 
        name: '', 
        base_sku: '', 
        description: '',
        brand_name: '',
        category_name: ''
    });

    // Variants State (Multi-variant creation)
    const [variants, setVariants] = useState([
        { color: '', size: '', price: 0, cost: 0, weight: 0, initial_stock: 0 }
    ]);

    const [targetWh, setTargetWh] = useState(''); // Gudang untuk initial stock

    useEffect(() => {
        const init = async () => {
            const [whSnap, settingSnap] = await Promise.all([
                getDocs(collection(db, "warehouses")),
                getDoc(doc(db, "settings", "general"))
            ]);
            
            const whList = whSnap.docs.map(d => ({id:d.id, ...d.data()}));
            setWarehouses(whList);
            if(whList.length > 0) setTargetWh(whList[0].id);

            if(settingSnap.exists()) {
                setFinanceConfig(settingSnap.data().financeConfig);
            }
        };
        init();
    }, []);

    const addVariantRow = () => {
        setVariants([...variants, { color: '', size: '', price: 0, cost: 0, weight: 0, initial_stock: 0 }]);
    };

    const removeVariantRow = (idx) => {
        if(variants.length > 1) {
            const n = [...variants];
            n.splice(idx, 1);
            setVariants(n);
        }
    };

    const updateVariant = (idx, field, val) => {
        const n = [...variants];
        n[idx][field] = val;
        setVariants(n);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!product.name || !product.base_sku) return toast.error("Nama & Base SKU wajib diisi");
        
        setLoading(true);
        const tId = toast.loading("Membuat Produk...");

        try {
            const batch = writeBatch(db);

            // 1. Create Product Parent
            const prodRef = doc(collection(db, "products"));
            batch.set(prodRef, {
                ...product,
                base_sku: product.base_sku.toUpperCase(),
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });

            // 2. Create Variants
            for (const v of variants) {
                const varRef = doc(collection(db, "product_variants"));
                const fullSku = `${product.base_sku.toUpperCase()}${v.color?'-'+v.color:''}${v.size?'-'+v.size:''}`.toUpperCase();
                
                batch.set(varRef, {
                    product_id: prodRef.id,
                    sku: fullSku,
                    color: v.color,
                    size: v.size,
                    price: parseFloat(v.price),
                    cost: parseFloat(v.cost), // HPP Penting!
                    weight: parseFloat(v.weight),
                    status: 'active',
                    created_at: serverTimestamp()
                });

                // 3. Handle Initial Stock (Jika ada)
                const initQty = parseInt(v.initial_stock);
                if (initQty > 0 && targetWh) {
                    // A. Snapshot
                    const snapRef = doc(db, "stock_snapshots", `${varRef.id}_${targetWh}`);
                    batch.set(snapRef, {
                        id: `${varRef.id}_${targetWh}`,
                        variant_id: varRef.id,
                        warehouse_id: targetWh,
                        qty: initQty,
                        updated_at: serverTimestamp()
                    });

                    // B. Movement (Adjustment In)
                    const moveRef = doc(collection(db, "stock_movements"));
                    batch.set(moveRef, {
                        variant_id: varRef.id,
                        warehouse_id: targetWh,
                        type: 'adjustment_opname', // Opname Awal
                        qty: initQty,
                        date: serverTimestamp(),
                        notes: 'Initial Stock via Create Product',
                        created_by: 'system'
                    });

                    // C. FINANCE JOURNAL (Opening Balance)
                    // Jika stok bertambah, Aset Persediaan bertambah.
                    // Lawannya adalah Modal Awal (Equity) atau Pendapatan Lain-lain (jika dianggap temuan).
                    // Kita gunakan 'recordAdjustmentTransaction' dengan tipe 'found' (reverse logic of loss)
                    // TAPI karena recordAdjustmentTransaction saat ini hanya support 'loss', kita manualkan disini
                    // atau kita update transactionService untuk support 'found'.
                    
                    // Untuk simplifikasi & keamanan, kita pakai jurnal manual disini:
                    if (financeConfig) {
                        // Debit: Persediaan (1301)
                        // Kredit: Modal Awal / Opening Balance Equity (3xxx) -> Fallback ke 3101 Modal
                        // Hitung Value
                        const totalValue = initQty * parseFloat(v.cost);
                        
                        if (totalValue > 0) {
                            // Helper internal untuk catat jurnal
                            const jRef = doc(collection(db, "cash_transactions"));
                            batch.set(jRef, {
                                type: 'in', // Non-cash in (Asset increase)
                                amount: totalValue,
                                account_id: financeConfig.defaultInventoryId || '1301', // Debit Inventory
                                category_account_id: '3101', // Kredit Modal (Asumsi)
                                category: 'Saldo Awal Persediaan',
                                description: `Initial Stock ${fullSku}`,
                                debit: totalValue,
                                credit: 0,
                                ref_id: prodRef.id,
                                created_at: serverTimestamp(),
                                date: serverTimestamp()
                            });
                            
                            // Update Saldo Inventory
                            if(financeConfig.defaultInventoryId) {
                                batch.update(doc(db, "chart_of_accounts", financeConfig.defaultInventoryId), {
                                    balance: increment(totalValue)
                                });
                            }
                            // Update Saldo Modal
                            batch.update(doc(db, "chart_of_accounts", '3101'), { // Hardcode Modal Awal sementara
                                balance: increment(totalValue)
                            });
                        }
                    }
                }
            }

            await batch.commit();
            
            // Clear Cache
            localStorage.removeItem('lumina_products_data_v2');
            localStorage.removeItem('lumina_variants_v2');
            localStorage.removeItem('lumina_dash_master_v4');

            toast.success("Produk Berhasil Dibuat!", { id: tId });
            router.push('/catalog/products');

        } catch (e) {
            console.error(e);
            toast.error("Gagal: " + e.message, { id: tId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in pb-20">
            <PageHeader 
                title="Create New Product" 
                subtitle="Tambah produk baru beserta varian dan stok awal."
                actions={
                    <button onClick={()=>router.back()} className="btn-ghost-dark flex items-center gap-2 text-xs">
                        <ArrowLeft className="w-4 h-4"/> Kembali
                    </button>
                }
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Info */}
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
                    <h3 className="font-bold text-lg text-text-primary border-b border-border pb-2">Informasi Utama</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-text-secondary mb-1 block">Nama Produk</label>
                            <input className="input-luxury" value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} placeholder="Nama produk..." required/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-secondary mb-1 block">Base SKU (Induk)</label>
                            <input className="input-luxury uppercase font-mono" value={product.base_sku} onChange={e=>setProduct({...product, base_sku:e.target.value})} placeholder="e.g. TSHIRT-001" required/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-text-secondary mb-1 block">Deskripsi</label>
                            <textarea className="input-luxury resize-none" rows="2" value={product.description} onChange={e=>setProduct({...product, description:e.target.value})} placeholder="Deskripsi singkat..."/>
                        </div>
                    </div>
                </div>

                {/* 2. Variants Generator */}
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                        <h3 className="font-bold text-lg text-text-primary">Varian & Stok Awal</h3>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-text-secondary">Gudang Stok Awal:</label>
                            <select className="input-luxury py-1 px-2 text-xs w-32" value={targetWh} onChange={e=>setTargetWh(e.target.value)}>
                                {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {variants.map((v, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-3 rounded-xl border border-border relative group">
                                <div className="w-20"><label className="text-[10px] font-bold text-text-secondary">Warna</label><input className="input-luxury text-xs py-1.5" value={v.color} onChange={e=>updateVariant(idx,'color',e.target.value)}/></div>
                                <div className="w-20"><label className="text-[10px] font-bold text-text-secondary">Size</label><input className="input-luxury text-xs py-1.5" value={v.size} onChange={e=>updateVariant(idx,'size',e.target.value)}/></div>
                                <div className="flex-1"><label className="text-[10px] font-bold text-emerald-600">Harga Jual</label><input type="number" className="input-luxury text-xs py-1.5 font-bold text-emerald-600" value={v.price} onChange={e=>updateVariant(idx,'price',e.target.value)}/></div>
                                <div className="flex-1"><label className="text-[10px] font-bold text-rose-500">HPP (Modal)</label><input type="number" className="input-luxury text-xs py-1.5 font-bold text-rose-500" value={v.cost} onChange={e=>updateVariant(idx,'cost',e.target.value)}/></div>
                                <div className="w-24"><label className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Box className="w-3 h-3"/> Stok Awal</label><input type="number" className="input-luxury text-xs py-1.5 bg-blue-50 border-blue-200" value={v.initial_stock} onChange={e=>updateVariant(idx,'initial_stock',e.target.value)}/></div>
                                
                                {variants.length > 1 && (
                                    <button type="button" onClick={()=>removeVariantRow(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <button type="button" onClick={addVariantRow} className="w-full py-2 border-2 border-dashed border-border rounded-xl text-xs font-bold text-text-secondary hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4"/> Tambah Varian Lain
                    </button>
                </div>

                {/* INFO */}
                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 text-xs items-start">
                    <Info className="w-5 h-5 shrink-0"/>
                    <p>
                        <b>Catatan Akuntansi:</b> Jika Anda mengisi "Stok Awal", sistem akan otomatis mencatat jurnal 
                        <b> [Debit] Persediaan</b> dan <b>[Kredit] Modal Awal</b> senilai (Stok x HPP).
                        Pastikan HPP diisi dengan benar.
                    </p>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                    <button type="button" onClick={()=>router.back()} className="btn-ghost-dark px-6">Batal</button>
                    <button type="submit" disabled={loading} className="btn-gold px-8 py-3 shadow-lg font-bold">
                        {loading ? 'Menyimpan...' : 'SIMPAN PRODUK'}
                    </button>
                </div>
            </form>
        </div>
    );
}