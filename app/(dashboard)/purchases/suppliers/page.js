// app/(dashboard)/purchases/suppliers/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, limit, where, writeBatch, getDoc } from 'firebase/firestore';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import { formatRupiah } from '@/lib/utils';

// --- MODERN UI IMPORTS ---
import { 
    Search, Plus, Trash2, Edit2, Wallet, 
    ArrowRight, Building, Phone, MapPin, X, Save 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- INTEGRASI FINANCE ---
import { recordTransaction } from '@/lib/transactionService';

const CACHE_KEY = 'lumina_suppliers_v2';
const CACHE_DURATION = 60 * 60 * 1000;

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [debtMap, setDebtMap] = useState({}); // Mapping SupplierID -> Total Hutang
    const [wallets, setWallets] = useState([]); // Akun Kas untuk bayar
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    
    // Payment State
    const [payForm, setPayForm] = useState({ supplierId: '', supplierName: '', amount: '', walletId: '' });
    const [processingPay, setProcessingPay] = useState(false);

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            // 1. Fetch Suppliers (Cache-first)
            let dataSuppliers = null;
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < CACHE_DURATION) dataSuppliers = parsed.data;
                }
            }

            if (!dataSuppliers) {
                const snap = await getDocs(query(collection(db, "suppliers"), orderBy("name"), limit(100)));
                dataSuppliers = snap.docs.map(d => ({id: d.id, ...d.data()}));
                if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify({ data: dataSuppliers, timestamp: Date.now() }));
            }
            setSuppliers(dataSuppliers);

            // 2. Fetch Unpaid POs (Real-time Debt Calculation)
            // Kita ambil semua PO unpaid untuk menghitung hutang per supplier
            const debtQuery = query(collection(db, "purchase_orders"), where("payment_status", "==", "unpaid"));
            const debtSnap = await getDocs(debtQuery);
            
            const debts = {};
            debtSnap.forEach(d => {
                const po = d.data();
                // Cari ID Supplier berdasarkan Nama (karena PO menyimpan supplier_name)
                // Idealnya PO menyimpan supplier_id. Jika ada, pakai itu.
                const supId = dataSuppliers.find(s => s.name === po.supplier_name)?.id;
                if (supId) {
                    const debtAmt = (po.total_amount || 0) - (po.amount_paid || 0);
                    if (debtAmt > 0) {
                        debts[supId] = (debts[supId] || 0) + debtAmt;
                    }
                }
            });
            setDebtMap(debts);

            // 3. Fetch Wallets (untuk dropdown bayar)
            const walletSnap = await getDocs(query(collection(db, "chart_of_accounts"), orderBy("code")));
            const wList = [];
            walletSnap.forEach(d => {
                const a = d.data();
                if (String(a.code).startsWith('1') && (a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'))) {
                    wList.push({ id: d.id, ...a });
                }
            });
            setWallets(wList);

        } catch (e) { 
            console.error(e); 
            toast.error("Gagal memuat data");
        } finally { 
            setLoading(false); 
        }
    };

    // --- CRUD HANDLERS ---
    const openModal = (sup = null) => {
        setFormData(sup ? { ...sup } : { name: '', phone: '', address: '', notes: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const tId = toast.loading("Menyimpan...");
        try {
            const payload = {
                name: formData.name, phone: formData.phone, 
                address: formData.address, notes: formData.notes, updated_at: serverTimestamp()
            };
            
            if (formData.id) await updateDoc(doc(db, "suppliers", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "suppliers"), payload); }
            
            localStorage.removeItem(CACHE_KEY);
            setModalOpen(false); fetchData(true);
            toast.success("Tersimpan!", { id: tId });
        } catch (e) { toast.error(e.message, { id: tId }); }
    };

    const deleteItem = async (id) => {
        if(!confirm("Hapus supplier ini?")) return;
        try {
            await deleteDoc(doc(db, "suppliers", id));
            localStorage.removeItem(CACHE_KEY); fetchData(true);
            toast.success("Dihapus");
        } catch(e) { toast.error("Gagal hapus"); }
    };

    // --- PAYMENT HANDLERS ---
    const openPayment = (sup) => {
        setPayForm({ 
            supplierId: sup.id, 
            supplierName: sup.name, 
            amount: debtMap[sup.id] || '', // Default full payment
            walletId: wallets[0]?.id || '' 
        });
        setPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        const amountToPay = parseFloat(payForm.amount);
        if(!amountToPay || amountToPay <= 0) return toast.error("Nominal tidak valid");
        if(!payForm.walletId) return toast.error("Pilih akun kas");

        setProcessingPay(true);
        const tId = toast.loading("Memproses Pembayaran (FIFO)...");

        try {
            const batch = writeBatch(db);
            
            // 1. Ambil Config untuk akun Hutang
            const settingSnap = await getDoc(doc(db, "settings", "general"));
            const financeConfig = settingSnap.exists() ? settingSnap.data().financeConfig : {};
            const apAccountId = financeConfig.defaultPayableId || '2101'; 

            // 2. Ambil PO Unpaid Supplier Ini (Urutkan dari terlama/FIFO)
            const qPO = query(
                collection(db, "purchase_orders"), 
                where("supplier_name", "==", payForm.supplierName), 
                where("payment_status", "==", "unpaid"),
                orderBy("order_date", "asc") 
            );
            const poSnap = await getDocs(qPO);

            let remaining = amountToPay;
            const paidPOIds = [];

            // 3. Loop Alokasi Pembayaran
            poSnap.docs.forEach(docSnap => {
                if (remaining <= 0) return;

                const po = docSnap.data();
                const poRef = doc(db, "purchase_orders", docSnap.id);
                const debt = (po.total_amount || 0) - (po.amount_paid || 0);
                
                let pay = 0;
                if (remaining >= debt) {
                    pay = debt;
                    remaining -= debt;
                    batch.update(poRef, { payment_status: 'paid', amount_paid: (po.amount_paid||0) + pay });
                } else {
                    pay = remaining;
                    remaining = 0;
                    // Tetap unpaid tapi amount_paid nambah
                    batch.update(poRef, { amount_paid: (po.amount_paid||0) + pay });
                }
                paidPOIds.push(docSnap.id);
            });

            if (remaining > 0) {
                toast("Peringatan: Nominal melebihi total hutang tercatat.", { icon: '⚠️' });
            }

            // 4. Catat Jurnal Keuangan (Single Entry Total)
            // Kredit: Kas (Wallet), Debit: Hutang Usaha (AP)
            recordTransaction(db, batch, {
                type: 'out',
                amount: amountToPay,
                walletId: payForm.walletId,
                categoryId: apAccountId,
                categoryName: 'Pelunasan Hutang Usaha',
                description: `Byr Hutang ${payForm.supplierName}`,
                refType: 'bulk_payment',
                refId: paidPOIds.join(','), // Tracking ID PO yg dibayar
                userEmail: 'admin' // Ganti user context
            });

            await batch.commit();
            
            // Clear Cache
            localStorage.removeItem('lumina_purchases_history_v2'); 
            localStorage.removeItem('lumina_cash_transactions_v2');
            
            toast.success("Pembayaran Berhasil!", { id: tId });
            setPaymentModalOpen(false);
            fetchData(true); // Refresh hutang

        } catch (e) {
            console.error(e);
            toast.error("Gagal bayar: " + e.message, { id: tId });
        } finally {
            setProcessingPay(false);
        }
    };

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 px-4 md:px-8 pt-6 bg-background min-h-screen text-text-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Suppliers</h2>
                    <p className="text-sm text-text-secondary mt-1 font-light">Kelola data supplier & pembayaran hutang.</p>
                </div>
                <button onClick={() => openModal()} className="btn-gold flex items-center gap-2 shadow-lg">
                    <Plus className="w-4 h-4 stroke-[3px]" /> Add Supplier
                </button>
            </div>

            {/* Total Hutang Card */}
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-rose-600 shadow-sm"><Wallet className="w-6 h-6"/></div>
                    <div>
                        <p className="text-xs font-bold text-rose-800 uppercase">Total Hutang Usaha</p>
                        <h3 className="text-xl font-bold text-rose-600">
                            {formatRupiah(Object.values(debtMap).reduce((a,b)=>a+b, 0))}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border">
                            <tr>
                                <th className="pl-6 py-4">Name</th>
                                <th className="py-4">Contact</th>
                                <th className="py-4">Address</th>
                                <th className="py-4 text-right">Sisa Hutang</th>
                                <th className="text-right pr-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border/60">
                            {loading ? <tr><td colSpan="5" className="text-center py-12 text-text-secondary animate-pulse">Loading...</td></tr> : suppliers.map(s => {
                                const debt = debtMap[s.id] || 0;
                                return (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="pl-6 py-4 font-medium text-text-primary flex items-center gap-2">
                                            <Building className="w-4 h-4 text-text-secondary"/> {s.name}
                                        </td>
                                        <td className="py-4 text-text-secondary text-xs">
                                            {s.phone ? <div className="flex items-center gap-1"><Phone className="w-3 h-3"/> {s.phone}</div> : '-'}
                                        </td>
                                        <td className="py-4 text-text-secondary truncate max-w-xs text-xs">
                                            {s.address || '-'}
                                        </td>
                                        <td className="py-4 text-right font-mono font-bold text-rose-600">
                                            {debt > 0 ? formatRupiah(debt) : '-'}
                                        </td>
                                        <td className="text-right pr-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {debt > 0 && (
                                                    <button onClick={() => openPayment(s)} className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-1">
                                                        <Wallet className="w-3 h-3"/> Bayar
                                                    </button>
                                                )}
                                                <button onClick={() => openModal(s)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                                                <button onClick={() => deleteItem(s.id)} className="p-1.5 text-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: ADD/EDIT */}
            <Portal>
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-text-primary">{formData.id ? 'Edit Supplier' : 'New Supplier'}</h3>
                            <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-text-secondary hover:text-rose-500"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-text-secondary mb-1 block">Name</label><input required className="input-luxury" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="PT. Supplier" /></div>
                                <div><label className="text-xs font-bold text-text-secondary mb-1 block">Phone / WA</label><input className="input-luxury" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="08..." /></div>
                            </div>
                            <div><label className="text-xs font-bold text-text-secondary mb-1 block">Address</label><textarea rows="2" className="input-luxury resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Complete address"></textarea></div>
                            <div><label className="text-xs font-bold text-text-secondary mb-1 block">Notes</label><input className="input-luxury" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Additional info..." /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost-dark">Cancel</button>
                                <button type="submit" className="btn-gold shadow-md">Save Supplier</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            </Portal>

            {/* MODAL 2: PAYMENT (QUICK PAY) */}
            <Portal>
            {paymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white border border-border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
                            <h3 className="text-lg font-bold text-emerald-800">Bayar Hutang</h3>
                            <p className="text-xs text-emerald-600">{payForm.supplierName}</p>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Nominal Bayar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-text-secondary font-bold">Rp</span>
                                    <input 
                                        type="number" 
                                        className="input-luxury pl-10 text-lg font-bold text-emerald-600" 
                                        value={payForm.amount} 
                                        onChange={e => setPayForm({...payForm, amount: e.target.value})} 
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-text-secondary mt-1">
                                    Total Hutang: <span className="font-bold text-rose-500">{formatRupiah(debtMap[payForm.supplierId] || 0)}</span>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Sumber Dana</label>
                                <select className="input-luxury" value={payForm.walletId} onChange={e => setPayForm({...payForm, walletId: e.target.value})}>
                                    <option value="">-- Pilih Kas / Bank --</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => setPaymentModalOpen(false)} className="btn-ghost-dark text-xs">Batal</button>
                                <button type="submit" disabled={processingPay} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2">
                                    {processingPay ? 'Memproses...' : <><Wallet className="w-4 h-4"/> Bayar Sekarang</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            </Portal>
        </div>
    );
}