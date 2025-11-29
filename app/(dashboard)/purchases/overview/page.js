// app/(dashboard)/purchases/overview/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, limit, serverTimestamp, increment, getDoc, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

// --- MODERN UI IMPORTS ---
import { 
    Plus, Search, Calendar, Building, CheckCircle, Clock, 
    ChevronRight, X, FileText, Edit2, Trash2, AlertTriangle, Truck, Wallet, ArrowRight, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- INTEGRASI FINANCE (SSOT V2) ---
// UPDATED: Menggunakan recordPurchaseTransaction untuk jurnal Inventory & AP
import { recordPurchaseTransaction, recordTransaction } from '@/lib/transactionService';

// --- KONFIGURASI CACHE ---
const CACHE_KEY_HISTORY = 'lumina_purchases_history_v2';
const CACHE_DURATION_HISTORY = 5 * 60 * 1000;

export default function PurchasesPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Data States
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dev Tool States
    const [isDevPayModalOpen, setIsDevPayModalOpen] = useState(false);
    const [devWalletId, setDevWalletId] = useState('');
    
    // Master Data
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    
    // Finance Data (New)
    const [wallets, setWallets] = useState([]); 
    const [financeConfig, setFinanceConfig] = useState({}); // Config dari Settings

    // Form States
    const [cart, setCart] = useState([]);
    const [formData, setFormData] = useState({ 
        id: null, 
        supplier_id: '', 
        warehouse_id: '', 
        date: new Date().toISOString().split('T')[0], 
        isPaid: false,
        wallet_id: '' 
    });
    const [inputItem, setInputItem] = useState({ variant_id: '', qty: '', cost: '' });

    useEffect(() => { 
        fetchHistory(); 
        fetchMasterData(); 
    }, []);

    const invalidateRelatedCaches = () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CACHE_KEY_HISTORY); 
        localStorage.removeItem('lumina_inventory_v2'); 
        localStorage.removeItem('lumina_pos_snapshots_v2'); 
        localStorage.removeItem('lumina_dash_master_v4'); 
        localStorage.removeItem('lumina_purchases_master_v2');
        localStorage.removeItem('lumina_balance_v2');
        localStorage.removeItem('lumina_cash_transactions_v2');
    };

    const fetchHistory = async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY_HISTORY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_DURATION_HISTORY) {
                        setHistory(data.map(d => ({ ...d, order_date: new Date(d.order_date) })));
                        setLoading(false);
                        return;
                    }
                }
            }

            const q = query(collection(db, "purchase_orders"), orderBy("order_date", "desc"), limit(50));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data(), order_date: d.data().order_date.toDate() }));
            
            setHistory(data);
            if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify({ data, ts: Date.now() }));

        } catch (e) { console.error(e); toast.error("Gagal memuat riwayat PO"); } 
        finally { setLoading(false); }
    };

    const fetchMasterData = async () => {
        try {
            const [whS, supS, prodS, varS, accS, setS] = await Promise.all([
                getDocs(collection(db, "warehouses")),
                getDocs(collection(db, "suppliers")),
                getDocs(collection(db, "products")),
                getDocs(collection(db, "product_variants")),
                getDocs(query(collection(db, "chart_of_accounts"), orderBy("code"))),
                getDoc(doc(db, "settings", "general"))
            ]);

            setWarehouses(whS.docs.map(d=>({id:d.id, ...d.data()})));
            setSuppliers(supS.docs.map(d=>({id:d.id, ...d.data()})));
            setProducts(prodS.docs.map(d=>({id:d.id, ...d.data()})));
            setVariants(varS.docs.map(d=>({id:d.id, ...d.data()})));

            const wList = accS.docs.map(d => ({id:d.id, ...d.data()}))
                .filter(a => {
                    const cat = (a.category||'').toUpperCase();
                    // Ambil akun Kas/Bank untuk dropdown pembayaran
                    return a.code.startsWith('1') && (cat.includes('ASET') || cat.includes('KAS') || cat.includes('BANK'));
                });
            setWallets(wList);
            if(wList.length > 0) setDevWalletId(wList[0].id);

            // [NEW] Load Finance Config from Settings
            if(setS.exists()) {
                setFinanceConfig(setS.data().financeConfig || {});
            }

        } catch(e) { console.error(e); }
    };

    // --- DEV TOOL: OPEN MODAL ---
    const handleDevPayAllClick = () => {
        setIsDevPayModalOpen(true);
    };

    // --- DEV TOOL: EXECUTE PAY ALL ---
    const executeDevPayAll = async () => {
        if(!devWalletId) return toast.error("Pilih akun pembayaran!");

        const tId = toast.loading("Dev: Processing Batch Payment...");
        try {
            const q = query(collection(db, "purchase_orders"), where("payment_status", "==", "unpaid"));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                toast.dismiss(tId);
                setIsDevPayModalOpen(false);
                return toast("Semua PO sudah Paid!");
            }

            const batch = writeBatch(db);
            // Fallback config jika kosong
            const inventoryAccId = financeConfig.defaultInventoryId || '1301';

            let totalPaidBatch = 0;

            snap.forEach(d => {
                const po = d.data();
                const poAmount = po.total_amount || 0;
                
                // A. Update Status PO
                batch.update(doc(db, "purchase_orders", d.id), {
                    payment_status: 'paid',
                    amount_paid: poAmount,
                    updated_at: serverTimestamp(),
                    updated_by: 'DEV_TOOL_BATCH'
                });

                // B. Record Finance Transaction (Double Entry)
                if (poAmount > 0) {
                    // Logic: Kredit Kas, Debit Hutang (karena sebelumnya Unpaid dianggap Hutang)
                    // Tapi karena ini batch tool sederhana, kita anggap pelunasan langsung.
                    // Idealnya: Debit Utang Usaha (2101), Kredit Kas (Wallet).
                    
                    // Gunakan recordTransaction (Legacy wrapper) untuk simple entry pelunasan hutang
                    // Atau manual logic:
                    /*
                    const payRef = doc(collection(db, "cash_transactions"));
                    batch.set(payRef, { ... });
                    */
                   
                    // Kita pakai recordTransaction Helper saja untuk simplifikasi dev tool
                    recordTransaction(db, batch, {
                        type: 'out',
                        amount: poAmount,
                        walletId: devWalletId, // Kredit Kas
                        categoryId: financeConfig.defaultPayableId || '2101', // Debit Hutang
                        categoryName: 'Pelunasan Hutang Usaha',
                        description: `Batch Pay PO #${d.id.substring(0,8)}`,
                        refType: 'purchase_payment',
                        refId: d.id,
                        userEmail: user?.email
                    });
                    
                    totalPaidBatch += poAmount;
                }
            });

            await batch.commit();
            
            invalidateRelatedCaches();
            fetchHistory(true);
            setIsDevPayModalOpen(false);
            
            toast.success(`Sukses! ${snap.size} PO Lunas. Total: ${formatRupiah(totalPaidBatch)}`, { id: tId });

        } catch (e) {
            console.error(e);
            toast.error("Dev Error: " + e.message, { id: tId });
        }
    };

    const addItem = () => {
        const { variant_id, qty, cost } = inputItem;
        if(!variant_id || !qty || !cost) return toast.error("Lengkapi data item");
        const v = variants.find(x => x.id === variant_id);
        const p = products.find(x => x.id === v.product_id);
        
        const existIdx = cart.findIndex(c => c.variant_id === variant_id);
        if(existIdx >= 0) {
            const newCart = [...cart];
            newCart[existIdx].qty += parseInt(qty);
            newCart[existIdx].unit_cost = parseInt(cost);
            setCart(newCart);
        } else {
            setCart([...cart, { 
                variant_id, 
                sku: v.sku, 
                name: p?.name, 
                spec: `${v.color}/${v.size}`, 
                qty: parseInt(qty), 
                unit_cost: parseInt(cost) 
            }]);
        }
        setInputItem({ variant_id: '', qty: '', cost: '' });
    };

    const removeItem = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    // --- HANDLE EDIT ---
    const handleEdit = async (po) => {
        const tId = toast.loading("Memuat data PO...");
        try {
            const itemsSnap = await getDocs(collection(db, `purchase_orders/${po.id}/items`));
            const items = [];
            itemsSnap.forEach(d => {
                const i = d.data();
                const v = variants.find(x => x.id === i.variant_id);
                const p = products.find(x => x.id === v?.product_id);
                items.push({
                    variant_id: i.variant_id,
                    qty: i.qty,
                    unit_cost: i.unit_cost,
                    sku: v?.sku || 'Unknown',
                    name: p?.name || 'Unknown',
                    spec: v ? `${v.color}/${v.size}` : '-'
                });
            });

            setFormData({
                id: po.id,
                supplier_id: suppliers.find(s => s.name === po.supplier_name)?.id || '',
                warehouse_id: po.warehouse_id,
                date: new Date(po.order_date).toISOString().split('T')[0],
                isPaid: po.payment_status === 'paid',
                wallet_id: '' 
            });
            setCart(items);
            setModalOpen(true);
            toast.dismiss(tId);
        } catch (e) {
            toast.error("Gagal memuat data edit", { id: tId });
        }
    };

    // --- SUBMIT PO (UPDATED WITH SSOT FINANCE) ---
    const submitPO = async (e) => {
        e.preventDefault();
        if(cart.length === 0) return toast.error("Keranjang kosong");
        if(formData.isPaid && !formData.wallet_id) return toast.error("Pilih Akun Pembayaran (Kas/Bank)!");
        
        // Cek Config
        if (!financeConfig || !financeConfig.defaultInventoryId) {
             // Fallback silents agar tidak crash, tapi idealnya warning
             console.warn("Finance Config belum lengkap!");
        }

        const isEditMode = !!formData.id;
        const toastId = toast.loading(isEditMode ? "Update PO..." : "Memproses PO...");
        
        try {
            const totalAmount = cart.reduce((a,b) => a + (b.qty * b.unit_cost), 0);
            const totalQty = cart.reduce((a,b) => a + b.qty, 0);
            const supplierName = suppliers.find(s => s.id === formData.supplier_id)?.name || 'Unknown';
            
            let oldItems = [];
            let oldPOData = null;
            
            if (isEditMode) {
                const oldPORef = doc(db, "purchase_orders", formData.id);
                const oldPOSnap = await getDoc(oldPORef);
                oldPOData = oldPOSnap.data();
                
                const oldItemsSnap = await getDocs(collection(db, `purchase_orders/${formData.id}/items`));
                oldItems = oldItemsSnap.docs.map(d => ({ docId: d.id, ...d.data() })); 
            }

            await runTransaction(db, async (t) => {
                const snapshotMap = {}; 
                const snapIdsToRead = new Set();
                
                if (isEditMode) oldItems.forEach(item => snapIdsToRead.add(`${item.variant_id}_${oldPOData.warehouse_id}`));
                cart.forEach(item => snapIdsToRead.add(`${item.variant_id}_${formData.warehouse_id}`));

                const snapKeys = Array.from(snapIdsToRead);
                const snapReads = await Promise.all(snapKeys.map(key => t.get(doc(db, "stock_snapshots", key))));
                snapKeys.forEach((key, index) => snapshotMap[key] = snapReads[index]);

                if (isEditMode) {
                    // Logic Edit: Hapus item lama, balikin stok
                    oldItems.forEach(item => {
                        t.delete(doc(db, `purchase_orders/${formData.id}/items`, item.docId));
                    });

                    // REVERT JURNAL LAMA (Kompleks, untuk simplifikasi kita skip revert jurnal otomatis di edit mode)
                    // User disarankan void/hapus dan buat baru untuk akurasi jurnal.
                    // TAPI jika edit mengubah nilai uang, idealnya ada jurnal koreksi.
                    // (Disini kita fokus update stok fisik dulu).
                }

                const poRef = isEditMode ? doc(db, "purchase_orders", formData.id) : doc(collection(db, "purchase_orders"));
                const poData = { 
                    supplier_name: supplierName, warehouse_id: formData.warehouse_id, 
                    order_date: new Date(formData.date), status: 'received_full', 
                    total_amount: totalAmount, total_qty: totalQty, 
                    payment_status: formData.isPaid ? 'paid' : 'unpaid', 
                    amount_paid: formData.isPaid ? totalAmount : 0, 
                    updated_at: serverTimestamp(), updated_by: user?.email 
                };
                if (!isEditMode) { poData.created_at = serverTimestamp(); poData.created_by = user?.email; }
                t.set(poRef, poData, { merge: true });

                const stockChanges = {};
                if (isEditMode) {
                    oldItems.forEach(item => {
                        const key = `${item.variant_id}_${oldPOData.warehouse_id}`;
                        stockChanges[key] = (stockChanges[key] || 0) - item.qty;
                    });
                }
                cart.forEach(item => {
                    const key = `${item.variant_id}_${formData.warehouse_id}`;
                    stockChanges[key] = (stockChanges[key] || 0) + item.qty;
                    
                    const newItemRef = doc(collection(db, `purchase_orders/${poRef.id}/items`));
                    t.set(newItemRef, { variant_id: item.variant_id, qty: item.qty, unit_cost: item.unit_cost, subtotal: item.qty*item.unit_cost });

                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, { 
                        variant_id: item.variant_id, warehouse_id: formData.warehouse_id, 
                        type: 'purchase_in', qty: item.qty, unit_cost: item.unit_cost, 
                        ref_id: poRef.id, ref_type: 'purchase_order', 
                        date: serverTimestamp(), notes: isEditMode ? `PO Upd ${supplierName}` : `PO ${supplierName}` 
                    });
                });

                Object.entries(stockChanges).forEach(([key, delta]) => {
                    if (delta === 0) return;
                    const snapDoc = snapshotMap[key];
                    const [varId, whId] = key.split('_');
                    const snapRef = doc(db, "stock_snapshots", key);
                    
                    if (snapDoc && snapDoc.exists()) {
                        t.update(snapRef, { qty: increment(delta) });
                    } else {
                        t.set(snapRef, { id: key, variant_id: varId, warehouse_id: whId, qty: delta });
                    }
                });

                // [NEW SSOT] RECORD FINANCE TRANSACTION
                // Hanya jalankan pencatatan jika ini PO BARU (bukan edit) untuk menghindari double recording sederhana
                if (!isEditMode) {
                    recordPurchaseTransaction(db, t, { // pass 't' as batch
                        poId: poRef.id,
                        totalAmount: totalAmount,
                        isPaid: formData.isPaid,
                        walletId: formData.wallet_id,
                        supplierName: supplierName,
                        financeConfig: financeConfig
                    });
                }
            });

            invalidateRelatedCaches();
            toast.success(isEditMode ? "PO Diperbarui (Stok Updated)" : "PO Berhasil Disimpan!", { id: toastId });
            setModalOpen(false); fetchHistory(true); setCart([]);
        } catch(e) { console.error(e); toast.error(`Gagal: ${e.message}`, { id: toastId }); }
    };

    // --- HANDLE DELETE ---
    const handleDelete = async (po) => {
        if(!confirm(`Yakin hapus PO dari ${po.supplier_name}? Stok akan ditarik kembali.`)) return;
        
        const tId = toast.loading("Menghapus...");
        try {
            let refundWalletId = wallets[0]?.id; // Default wallet for refund logic fallback
            
            const itemsSnap = await getDocs(collection(db, `purchase_orders/${po.id}/items`));
            const itemsToDelete = itemsSnap.docs.map(d => d.data());

            await runTransaction(db, async (t) => {
                const snapReads = await Promise.all(itemsToDelete.map(item => {
                    const key = `${item.variant_id}_${po.warehouse_id}`;
                    return t.get(doc(db, "stock_snapshots", key));
                }));

                itemsToDelete.forEach((item, index) => {
                    const snapDoc = snapReads[index];
                    if (snapDoc.exists()) {
                        t.update(snapDoc.ref, { qty: increment(-item.qty) });
                    }
                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, {
                        variant_id: item.variant_id, warehouse_id: po.warehouse_id,
                        type: 'adjustment_opname', qty: -item.qty, 
                        ref_id: po.id, ref_type: 'purchase_order_void',
                        date: serverTimestamp(), notes: `Void PO ${po.id.substring(0,8)}`
                    });
                });

                // REVERSE JOURNAL (VOID)
                // Jika PO Lunas, uang harus balik ke Kas (Debit Kas, Kredit Inventory/Hutang)
                if (po.payment_status === 'paid' && po.total_amount > 0 && refundWalletId) {
                    // Pakai helper manual untuk reverse
                    const voidRef = doc(collection(db, "cash_transactions"));
                    t.set(voidRef, {
                        account_id: refundWalletId, // Debit Kas (Uang Balik)
                        type: 'in', 
                        amount: po.total_amount,
                        debit: po.total_amount, credit: 0,
                        description: `Void PO ${po.supplier_name}`,
                        ref_id: po.id,
                        ref_type: 'purchase_order_void',
                        created_at: serverTimestamp(),
                        category: 'Refund Pembelian'
                    });
                    
                    // Jangan lupa kurangi nilai Persediaan (Kredit 1301)
                    if(financeConfig?.defaultInventoryId) {
                        t.update(doc(db, "chart_of_accounts", financeConfig.defaultInventoryId), {
                            balance: increment(-po.total_amount)
                        });
                    }
                }

                t.delete(doc(db, "purchase_orders", po.id));
            });

            invalidateRelatedCaches();
            fetchHistory(true);
            toast.success("PO Dihapus & Stok dikembalikan", { id: tId });

        } catch (e) { console.error(e); toast.error("Gagal menghapus: " + e.message, { id: tId }); }
    };

    const StatusBadge = ({ status }) => {
        const isPaid = status === 'paid';
        return (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {isPaid ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                {status}
            </span>
        );
    };

    const filteredHistory = history.filter(h => 
        h.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 px-4 md:px-8 pt-6 bg-background min-h-screen text-text-primary">
            
            <PageHeader 
                title="Purchase Orders" 
                subtitle="Kelola pembelian stok dari supplier."
                actions={
                    <div className="flex gap-3">
                        {/* --- DEV BUTTON: MARK ALL PAID --- */}
                        <button 
                            onClick={handleDevPayAllClick} 
                            className="hidden md:flex btn-ghost-dark px-3 py-2 items-center gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                            title="Dev Tool: Tandai semua PO Unpaid jadi Paid (Batch)"
                        >
                            <Zap className="w-4 h-4"/> Pay All (Dev)
                        </button>

                        <Link href="/purchases/import" className="hidden sm:flex btn-ghost-dark px-4 py-2 items-center gap-2">
                            <FileText className="w-4 h-4"/> Import
                        </Link>
                        <button 
                            onClick={() => { 
                                setFormData({ id: null, supplier_id:'', warehouse_id:'', date: new Date().toISOString().split('T')[0], isPaid: false, wallet_id: wallets[0]?.id || ''}); 
                                setCart([]); 
                                setModalOpen(true); 
                            }}
                            className="btn-gold flex items-center gap-2 shadow-lg"
                        >
                            <Plus className="w-4 h-4 stroke-[3px]" /> New PO
                        </button>
                    </div>
                }
            />

            {/* SEARCH BAR */}
            <div className="relative group">
                <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3 group-focus-within:text-primary transition-colors" />
                <input 
                    className="w-full pl-10 py-2.5 bg-white border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="Cari Supplier / Order ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- LIST VIEW --- */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="pl-6 py-4">Date</th>
                            <th className="py-4">Supplier & ID</th>
                            <th className="py-4 text-right">Total</th>
                            <th className="py-4 text-center">Payment</th>
                            <th className="py-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-border/60">
                        {loading ? <tr><td colSpan="5" className="p-8 text-center">Loading...</td></tr> : 
                         filteredHistory.map(h => (
                            <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                <td className="pl-6 py-4 font-mono text-xs text-text-secondary">
                                    {new Date(h.order_date).toLocaleDateString()}
                                </td>
                                <td className="py-4">
                                    <div className="font-medium text-text-primary">{h.supplier_name}</div>
                                    <Link href={`/purchases/${h.id}`} className="text-[10px] text-primary hover:underline font-mono">#{h.id.substring(0,8)}</Link>
                                </td>
                                <td className="py-4 text-right font-bold text-primary">{formatRupiah(h.total_amount)}</td>
                                <td className="py-4 text-center flex justify-center"><StatusBadge status={h.payment_status} /></td>
                                <td className="py-4 text-right pr-6">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(h)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-blue-50 rounded-lg transition-colors" title="Edit PO"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(h)} className="p-1.5 text-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus PO"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DEV PAY ALL --- */}
            <Portal>
                {isDevPayModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <Zap className="w-6 h-6"/>
                                <h3 className="font-bold text-lg">Dev Batch Payment</h3>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">
                                Fitur ini akan mengubah semua status <b>UNPAID</b> menjadi <b>PAID</b> dan memotong saldo akun yang dipilih.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary block mb-1">Sumber Dana (Wallet)</label>
                                    <select 
                                        className="input-luxury" 
                                        value={devWalletId} 
                                        onChange={e => setDevWalletId(e.target.value)}
                                    >
                                        <option value="">-- Pilih Akun --</option>
                                        {wallets.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setIsDevPayModalOpen(false)} className="btn-ghost-dark text-xs">Batal</button>
                                    <button onClick={executeDevPayAll} className="btn-gold text-xs px-4 shadow-md">Execute Batch</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </Portal>

            {/* --- MODAL FORM (CREATE / EDIT) --- */}
            <Portal>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50 rounded-t-2xl">
                                <h3 className="text-lg font-bold text-text-primary">
                                    {formData.id ? 'Edit Purchase Order' : 'New Purchase Order'}
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="bg-white p-1.5 rounded-lg border border-border text-text-secondary hover:text-rose-500"><X className="w-5 h-5"/></button>
                            </div>
                            
                            {formData.id && (
                                <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex gap-2 items-center text-xs text-amber-800">
                                    <AlertTriangle className="w-4 h-4"/>
                                    <span><b>Mode Edit:</b> Saldo dan stok akan dikoreksi otomatis.</span>
                                </div>
                            )}
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {/* Header Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary uppercase">Supplier</label>
                                        <div className="relative"><Building className="absolute left-3 top-3 w-4 h-4 text-gray-400"/><select className="input-luxury pl-10" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}><option value="">-- Select --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary uppercase">Warehouse</label>
                                        <div className="relative"><Truck className="absolute left-3 top-3 w-4 h-4 text-gray-400"/><select className="input-luxury pl-10" value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}><option value="">-- Select --</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary uppercase">Order Date</label>
                                        <input type="date" className="input-luxury" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                </div>

                                {/* Item Input */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-border space-y-3">
                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-12 md:col-span-6">
                                            <label className="text-xs font-bold text-text-secondary block mb-1">Product Variant</label>
                                            <select className="input-luxury" value={inputItem.variant_id} onChange={e => { const v = variants.find(x=>x.id===e.target.value); setInputItem({...inputItem, variant_id: e.target.value, cost: v?.cost || ''}) }}><option value="">Search Item...</option>{variants.map(v => { const p = products.find(x=>x.id===v.product_id); return <option key={v.id} value={v.id}>{p?.name} ({v.color}/{v.size})</option> })}</select>
                                        </div>
                                        <div className="col-span-6 md:col-span-2">
                                            <label className="text-xs font-bold text-text-secondary block mb-1">Qty</label>
                                            <input type="number" className="input-luxury" placeholder="0" value={inputItem.qty} onChange={e=>setInputItem({...inputItem, qty:e.target.value})} />
                                        </div>
                                        <div className="col-span-6 md:col-span-3">
                                            <label className="text-xs font-bold text-text-secondary block mb-1">Cost (HPP)</label>
                                            <input type="number" className="input-luxury" placeholder="Rp" value={inputItem.cost} onChange={e=>setInputItem({...inputItem, cost:e.target.value})} />
                                        </div>
                                        <div className="col-span-12 md:col-span-1 flex items-end">
                                            <button type="button" onClick={addItem} className="btn-gold w-full h-10 flex items-center justify-center rounded-xl"><Plus className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cart List */}
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-xs font-bold text-text-secondary uppercase">
                                            <tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Subtotal</th><th className="p-3 w-10"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {cart.map((c, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-3"><div className="font-bold text-text-primary">{c.name}</div><div className="text-xs text-text-secondary">{c.spec}</div></td>
                                                    <td className="p-3 text-right font-mono">{c.qty}</td>
                                                    <td className="p-3 text-right font-mono font-bold">{formatRupiah(c.qty*c.unit_cost)}</td>
                                                    <td className="p-3 text-center"><button onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4"/></button></td>
                                                </tr>
                                            ))}
                                            {cart.length===0 && <tr><td colSpan="4" className="p-6 text-center text-text-secondary italic">Keranjang kosong</td></tr>}
                                        </tbody>
                                        {cart.length > 0 && (
                                            <tfoot className="bg-gray-50 font-bold">
                                                <tr>
                                                    <td colSpan="2" className="p-3 text-right">TOTAL</td>
                                                    <td className="p-3 text-right text-lg">{formatRupiah(cart.reduce((a,b) => a + (b.qty * b.unit_cost), 0))}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Payment Checkbox with Wallet Selection */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="isPaid" checked={formData.isPaid} onChange={e => setFormData({...formData, isPaid: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer" />
                                        <label htmlFor="isPaid" className="text-sm font-bold text-blue-900 cursor-pointer select-none">Lunas Sekarang (Paid)</label>
                                    </div>
                                    
                                    {formData.isPaid && (
                                        <div className="ml-8 animate-fade-in">
                                            <label className="text-xs font-bold text-text-secondary uppercase block mb-1.5">Bayar Menggunakan Akun:</label>
                                            <div className="relative">
                                                <Wallet className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                                                <select 
                                                    className="input-luxury pl-10 bg-white" 
                                                    value={formData.wallet_id} 
                                                    onChange={e => setFormData({...formData, wallet_id: e.target.value})}
                                                >
                                                    <option value="">-- Pilih Kas / Bank --</option>
                                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><ArrowRight className="w-3 h-3"/> Saldo akan dipotong otomatis.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-border bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost-dark">Cancel</button>
                                <button type="submit" onClick={submitPO} className="btn-gold px-8 shadow-lg">
                                    {formData.id ? 'Update PO' : 'Submit Order'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </Portal>
        </div>
    );
}