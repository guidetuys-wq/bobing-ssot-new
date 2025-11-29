// app/(dashboard)/catalog/products/[id]/page.js
"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { formatRupiah, sortBySize } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Portal } from '@/lib/usePortal';

// --- UI ICONS ---
import { 
    ArrowLeft, Edit, Tag, Layers, Box, TrendingUp, 
    AlertTriangle, Package, CheckCircle, Sparkles, Save, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    
    // Data State
    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalQty: 0, totalAsset: 0, avgMargin: 0 });

    // Edit Variant State
    const [editingVariant, setEditingVariant] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        if(id) loadProductData();
    }, [id]);

    const loadProductData = async () => {
        setLoading(true);
        try {
            // 1. Get Product Header
            const prodSnap = await getDoc(doc(db, "products", id));
            if (!prodSnap.exists()) {
                toast.error("Produk tidak ditemukan");
                return router.push('/catalog/products');
            }
            const prodData = { id: prodSnap.id, ...prodSnap.data() };

            // 2. Resolve Relations (Brand, Category, Collection) - Manual fetch for detail
            // Note: Idealnya di master product sudah ada _name, tapi untuk memastikan update terbaru kita fetch lagi jika perlu.
            // Untuk efisiensi, kita pakai data yang ada di dokumen produk saja (Category Name, Brand Name sudah tersimpan saat save).
            // Tapi khusus Collection ID, kita mungkin perlu ambil namanya jika belum disimpan.
            if(prodData.collection_id) {
                const colSnap = await getDoc(doc(db, "collections", prodData.collection_id));
                if(colSnap.exists()) prodData.collection_name = colSnap.data().name;
            }

            setProduct(prodData);

            // 3. Get Variants
            const varQuery = query(collection(db, "product_variants"), where("product_id", "==", id));
            const varSnap = await getDocs(varQuery);
            const varList = varSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVariants(varList);

            // 4. Get Stock Snapshots
            const stockQuery = query(collection(db, "stock_snapshots"), where("variant_id", "in", varList.map(v=>v.id).slice(0,30))); // Limit 30 variants for query
            // Note: Jika varian > 30, perlu logic batch. Untuk saat ini asumsi < 30.
            const stockSnap = varList.length > 0 ? await getDocs(stockQuery) : { empty: true, docs: [] };
            
            const stockMap = {};
            stockSnap.docs.forEach(d => {
                const s = d.data();
                if(!stockMap[s.variant_id]) stockMap[s.variant_id] = {};
                stockMap[s.variant_id][s.warehouse_id] = s.qty;
            });
            setSnapshots(stockMap);

            // 5. Get Warehouses (For headers)
            const whSnap = await getDocs(collection(db, "warehouses"));
            setWarehouses(whSnap.docs.map(d => ({id:d.id, ...d.data()})));

            // 6. Calculate Stats
            let tQty = 0;
            let tAsset = 0;
            let totalMargin = 0;
            let countMargin = 0;

            varList.forEach(v => {
                const qty = Object.values(stockMap[v.id] || {}).reduce((a,b) => a+b, 0);
                const cost = v.cost || 0;
                const price = v.price || 0;
                
                tQty += qty;
                tAsset += (qty * cost);
                
                if (price > 0 && cost > 0) {
                    totalMargin += ((price - cost) / price) * 100;
                    countMargin++;
                }
            });

            setStats({
                totalQty: tQty,
                totalAsset: tAsset,
                avgMargin: countMargin > 0 ? (totalMargin / countMargin).toFixed(1) : 0
            });

        } catch (e) {
            console.error(e);
            toast.error("Gagal memuat detail");
        } finally {
            setLoading(false);
        }
    };

    // --- QUICK EDIT VARIANT ---
    const handleEditVariant = (v) => {
        setEditingVariant(v);
        setEditForm({ cost: v.cost || 0, price: v.price || 0 });
    };

    const saveVariant = async () => {
        if(!editingVariant) return;
        const tId = toast.loading("Updating...");
        try {
            await updateDoc(doc(db, "product_variants", editingVariant.id), {
                cost: parseFloat(editForm.cost),
                price: parseFloat(editForm.price),
                updated_at: serverTimestamp()
            });
            
            // Update Local State
            setVariants(prev => prev.map(v => v.id === editingVariant.id ? {...v, ...editForm} : v));
            setEditingVariant(null);
            toast.success("Harga Updated", { id: tId });
            
            // Recalc Stats Simple
            loadProductData(); // Refresh full untuk aman
            
            // Clear Caches
            localStorage.removeItem('lumina_products_variants_v2');
            localStorage.removeItem('lumina_variants_v2');

        } catch(e) {
            toast.error("Gagal update", { id: tId });
        }
    };

    if (loading) return <div className="p-12 text-center text-text-secondary animate-pulse">Loading Product Data...</div>;
    if (!product) return <div className="p-12 text-center text-text-secondary">Product Not Found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
            <PageHeader 
                title="Product Detail" 
                subtitle={`Analisa performa dan stok untuk ${product.base_sku}.`}
                actions={
                    <button onClick={()=>router.back()} className="btn-ghost-dark flex items-center gap-2 text-xs">
                        <ArrowLeft className="w-4 h-4"/> Kembali
                    </button>
                }
            />

            {/* TOP STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Image & Basic Info */}
                <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-border shadow-sm flex gap-5 items-start">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border border-border overflow-hidden shrink-0">
                        {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <Package className="w-10 h-10 text-gray-300"/>}
                    </div>
                    <div>
                        <div className="flex gap-2 mb-1">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded uppercase border border-blue-100">{product.base_sku}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${product.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-100':'bg-rose-50 text-rose-700 border-rose-100'}`}>{product.status}</span>
                        </div>
                        <h2 className="text-xl font-display font-bold text-text-primary leading-tight mb-2">{product.name}</h2>
                        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded"><Tag className="w-3 h-3"/> {product.brand_name || '-'}</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded"><Layers className="w-3 h-3"/> {product.category_name || '-'}</span>
                            {product.collection_name && (
                                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded">
                                    <Sparkles className="w-3 h-3"/> {product.collection_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Total Aset Stok</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{formatRupiah(stats.totalAsset)}</h3>
                    <p className="text-[10px] text-text-secondary mt-1">{stats.totalQty} pcs in warehouses</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Avg. Margin</p>
                    <h3 className={`text-2xl font-bold ${stats.avgMargin < 30 ? 'text-amber-500' : 'text-blue-600'}`}>{stats.avgMargin}%</h3>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full rounded-full ${stats.avgMargin < 30 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{width: `${Math.min(stats.avgMargin, 100)}%`}}></div>
                    </div>
                </div>
            </div>

            {/* VARIANTS TABLE */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <Box className="w-4 h-4"/> Daftar Varian & Stok
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                            <tr>
                                <th className="pl-6 py-3">SKU Varian</th>
                                <th className="py-3">Spec</th>
                                <th className="py-3 text-right">HPP (Modal)</th>
                                <th className="py-3 text-right">Harga Jual</th>
                                <th className="py-3 text-center">Margin</th>
                                {/* Warehouse Columns */}
                                {warehouses.map(w => (
                                    <th key={w.id} className="py-3 text-center w-24 bg-gray-50/50 border-l border-border/50">{w.name}</th>
                                ))}
                                <th className="pr-6 py-3 text-right w-20">Edit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {variants.sort(sortBySize).map(v => {
                                const stockData = snapshots[v.id] || {};
                                const margin = v.price > 0 ? ((v.price - v.cost)/v.price)*100 : 0;
                                const isEditing = editingVariant?.id === v.id;

                                return (
                                    <tr key={v.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="pl-6 py-3 font-mono font-bold text-primary text-xs">{v.sku}</td>
                                        <td className="py-3 text-text-secondary text-xs">{v.color} / {v.size}</td>
                                        
                                        {/* Editable Columns */}
                                        <td className="py-3 text-right">
                                            {isEditing ? (
                                                <input className="input-luxury py-1 px-2 w-24 text-right text-xs" type="number" value={editForm.cost} onChange={e=>setEditForm({...editForm, cost:e.target.value})}/>
                                            ) : (
                                                <span className="font-mono text-rose-600">{formatRupiah(v.cost)}</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            {isEditing ? (
                                                <input className="input-luxury py-1 px-2 w-24 text-right text-xs font-bold" type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price:e.target.value})}/>
                                            ) : (
                                                <span className="font-bold text-text-primary">{formatRupiah(v.price)}</span>
                                            )}
                                        </td>

                                        <td className="py-3 text-center">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${margin < 20 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                        </td>

                                        {/* Stock per Warehouse */}
                                        {warehouses.map(w => (
                                            <td key={w.id} className="py-3 text-center border-l border-border/50">
                                                <span className={`text-xs font-bold ${stockData[w.id] > 0 ? 'text-text-primary' : 'text-gray-300'}`}>
                                                    {stockData[w.id] || 0}
                                                </span>
                                            </td>
                                        ))}

                                        <td className="pr-6 py-3 text-right">
                                            {isEditing ? (
                                                <div className="flex gap-1 justify-end">
                                                    <button onClick={saveVariant} className="p-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><CheckCircle className="w-4 h-4"/></button>
                                                    <button onClick={()=>setEditingVariant(null)} className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"><X className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <button onClick={()=>handleEditVariant(v)} className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit className="w-4 h-4"/></button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}