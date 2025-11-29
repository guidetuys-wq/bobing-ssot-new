// app/(dashboard)/sales/customers/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, limit, where, getDoc } from 'firebase/firestore';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { formatRupiah } from '@/lib/utils';

// --- MODERN UI IMPORTS ---
import { 
    Users, Plus, Search, Trash2, Edit2, ScanLine, X, 
    Phone, MapPin, User, CheckCircle, AlertCircle, Wallet, ArrowDownLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- INTEGRASI FINANCE ---
import { recordTransaction } from '@/lib/transactionService';

// --- KONFIGURASI CACHE ---
const CACHE_KEY = 'lumina_customers_v2';
const CACHE_DURATION = 30 * 60 * 1000; // 30 Menit

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [debtMap, setDebtMap] = useState({}); // Mapping CustID -> Total Piutang
    const [wallets, setWallets] = useState([]); // Akun Kas untuk terima bayar
    const [loading, setLoading] = useState(true);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    
    // Payment State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [payForm, setPayForm] = useState({ customerId: '', customerName: '', amount: '', walletId: '' });
    const [processingPay, setProcessingPay] = useState(false);

    const [scanning, setScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchData(); }, []);

    // 1. Fetch Data
    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            // A. Customers (Cache-first)
            let dataCustomers = null;
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) dataCustomers = data;
                }
            }

            if (!dataCustomers) {
                const q = query(collection(db, "customers"), orderBy("name", "asc"), limit(200));
                const snap = await getDocs(q);
                dataCustomers = snap.docs.map(d => ({id: d.id, ...d.data()}));
                if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify({ data: dataCustomers, timestamp: Date.now() }));
            }
            setCustomers(dataCustomers);

            // B. Piutang (Real-time Debt Calculation)
            // Ambil semua Sales Order yang belum lunas
            const debtQuery = query(collection(db, "sales_orders"), where("payment_status", "==", "unpaid")); // Atau 'partial'
            const debtSnap = await getDocs(debtQuery);
            
            const debts = {};
            debtSnap.forEach(d => {
                const so = d.data();
                if (so.customer_id) {
                    // Hitung sisa tagihan (Total - Sudah Dibayar)
                    // Gunakan field financial.gross atau total_sales
                    const total = so.financial?.total_sales || so.gross_amount || 0;
                    const paid = so.amount_paid || 0;
                    const remaining = total - paid;
                    
                    if (remaining > 0) {
                        debts[so.customer_id] = (debts[so.customer_id] || 0) + remaining;
                    }
                }
            });
            setDebtMap(debts);

            // C. Wallets (Untuk terima pembayaran)
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
            toast.error("Gagal memuat customers");
        } finally { 
            setLoading(false); 
        }
    };

    // 2. Scan Logic (Original Feature Preserved)
    const scanFromSales = async () => {
        if(!confirm("Scan 500 transaksi terakhir untuk pelanggan baru?")) return;
        setScanning(true);
        const scanPromise = new Promise(async (resolve, reject) => {
            try {
                const qSales = query(collection(db, "sales_orders"), orderBy("order_date", "desc"), limit(500));
                const snapSales = await getDocs(qSales);
                const newCandidates = {};
                
                snapSales.forEach(doc => {
                    const s = doc.data();
                    const name = s.customer_name || s.buyer_name || '';
                    const phone = s.customer_phone || s.buyer_phone || ''; 
                    
                    if (name && !name.toLowerCase().includes('guest') && !name.includes('*')) {
                        const key = phone.length > 5 ? phone : name.toLowerCase();
                        if (!newCandidates[key]) {
                            newCandidates[key] = { 
                                name, 
                                phone, 
                                address: s.shipping_address || s.buyer_address || '', 
                                type: 'end_customer' 
                            };
                        }
                    }
                });

                const existingNames = new Set(customers.map(c => c.name.toLowerCase()));
                const existingPhones = new Set(customers.map(c => c.phone));

                const finalToAdd = Object.values(newCandidates).filter(c => {
                    const hasPhone = c.phone && existingPhones.has(c.phone);
                    const hasName = existingNames.has(c.name.toLowerCase());
                    return !hasPhone && !hasName;
                });

                if (finalToAdd.length === 0) {
                    resolve("Tidak ditemukan pelanggan baru.");
                } else {
                    const batch = writeBatch(db);
                    const batchList = finalToAdd.slice(0, 400);
                    
                    batchList.forEach(c => {
                        const ref = doc(collection(db, "customers"));
                        batch.set(ref, { ...c, created_at: serverTimestamp(), source: 'auto_scan' });
                    });
                    
                    await batch.commit();
                    if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
                    fetchData(true);
                    
                    resolve(`Berhasil menyimpan ${batchList.length} pelanggan baru!`);
                }
            } catch (e) { reject(e); } finally { setScanning(false); }
        });

        toast.promise(scanPromise, {
            loading: 'Scanning sales history...',
            success: (msg) => msg,
            error: (err) => `Gagal: ${err.message}`,
        });
    };

    // 3. Actions CRUD
    const openModal = (cust = null) => {
        setFormData(cust ? { ...cust } : { name: '', type: 'end_customer', phone: '', address: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const savePromise = new Promise(async (resolve, reject) => {
            try {
                const payload = {
                    name: formData.name,
                    type: formData.type,
                    phone: formData.phone,
                    address: formData.address,
                    updated_at: serverTimestamp()
                };
                
                if (formData.id) {
                    await updateDoc(doc(db, "customers", formData.id), payload);
                } else { 
                    payload.created_at = serverTimestamp(); 
                    await addDoc(collection(db, "customers"), payload); 
                }
                
                if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
                setModalOpen(false); 
                fetchData(true);
                resolve();
            } catch (e) { reject(e); }
        });

        toast.promise(savePromise, {
            loading: 'Menyimpan...',
            success: 'Data berhasil disimpan',
            error: (err) => `Gagal: ${err.message}`
        });
    };

    const deleteItem = async (id) => {
        if(confirm("Hapus pelanggan?")) { 
            try {
                await deleteDoc(doc(db, "customers", id)); 
                if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
                fetchData(true);
                toast.success("Pelanggan dihapus");
            } catch(e) {
                toast.error("Gagal menghapus");
            }
        }
    };

    // --- PAYMENT HANDLERS (NEW AR FEATURE) ---
    const openPayment = (cust) => {
        setPayForm({ 
            customerId: cust.id, 
            customerName: cust.name, 
            amount: debtMap[cust.id] || '', 
            walletId: wallets[0]?.id || '' 
        });
        setPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        const amountToPay = parseFloat(payForm.amount);
        if(!amountToPay || amountToPay <= 0) return toast.error("Nominal tidak valid");
        if(!payForm.walletId) return toast.error("Pilih akun kas penerima");

        setProcessingPay(true);
        const tId = toast.loading("Memproses Penerimaan (FIFO)...");

        try {
            const batch = writeBatch(db);
            
            // 1. Ambil Config Finance (Untuk Akun Piutang)
            const settingSnap = await getDoc(doc(db, "settings", "general"));
            const financeConfig = settingSnap.exists() ? settingSnap.data().financeConfig : {};
            const arAccountId = financeConfig.defaultReceivableId || '1201'; // Default Piutang Usaha

            // 2. Ambil SO Unpaid Customer Ini (FIFO)
            const qSO = query(
                collection(db, "sales_orders"), 
                where("customer_id", "==", payForm.customerId), 
                where("payment_status", "==", "unpaid"),
                orderBy("order_date", "asc") 
            );
            const soSnap = await getDocs(qSO);

            let remaining = amountToPay;
            const paidSOIds = [];

            // 3. Loop Alokasi Pembayaran
            soSnap.docs.forEach(docSnap => {
                if (remaining <= 0) return;

                const so = docSnap.data();
                const soRef = doc(db, "sales_orders", docSnap.id);
                const total = so.financial?.total_sales || so.gross_amount || 0;
                const debt = total - (so.amount_paid || 0);
                
                let pay = 0;
                if (remaining >= debt) {
                    pay = debt;
                    remaining -= debt;
                    batch.update(soRef, { payment_status: 'paid', amount_paid: (so.amount_paid||0) + pay });
                } else {
                    pay = remaining;
                    remaining = 0;
                    batch.update(soRef, { amount_paid: (so.amount_paid||0) + pay });
                }
                paidSOIds.push(docSnap.id);
            });

            if (remaining > 0) {
                toast("Info: Ada kelebihan bayar, tercatat sebagai deposit (Sistem Deposit belum aktif, masuk ke kas saja).", { icon: 'ℹ️' });
            }

            // 4. Catat Jurnal Keuangan (Single Entry Total)
            // Debit: Kas (Wallet), Kredit: Piutang Usaha (AR)
            recordTransaction(db, batch, {
                type: 'in',
                amount: amountToPay,
                walletId: payForm.walletId, // Debit Kas
                categoryId: arAccountId, // Kredit Piutang
                categoryName: 'Pelunasan Piutang Pelanggan',
                description: `Terima Bayar ${payForm.customerName}`,
                refType: 'bulk_receivable_payment',
                refId: paidSOIds.join(','),
                userEmail: 'admin'
            });

            await batch.commit();
            
            // Clear Cache
            localStorage.removeItem('lumina_sales_history_v2'); 
            localStorage.removeItem('lumina_cash_transactions_v2');
            
            toast.success("Pembayaran Diterima!", { id: tId });
            setPaymentModalOpen(false);
            fetchData(true); 

        } catch (e) {
            console.error(e);
            toast.error("Gagal proses: " + e.message, { id: tId });
        } finally {
            setProcessingPay(false);
        }
    };

    // Filter Logic Client Side
    const filteredData = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone && c.phone.includes(searchTerm))
    );

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 px-4 md:px-8 pt-6 bg-background min-h-screen text-text-primary">
            
            <PageHeader 
                title="Customers CRM" 
                subtitle="Database pelanggan, reseller, dan manajemen piutang."
                actions={
                    <div className="flex gap-3">
                        <button 
                            onClick={scanFromSales} 
                            disabled={scanning} 
                            className="btn-ghost-dark text-xs flex items-center gap-2 border-border bg-white shadow-sm"
                        >
                            <ScanLine className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                            {scanning ? 'Scanning...' : 'Scan Sales'}
                        </button>
                       <button
                            onClick={() => openModal()}
                            className="btn-gold inline-flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-lg hover:shadow-xl"
                            >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>New Customer</span>
                        </button>
                    </div>
                }
            />

            {/* Total Piutang Card */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Wallet className="w-6 h-6"/></div>
                    <div>
                        <p className="text-xs font-bold text-blue-800 uppercase">Total Piutang Pelanggan</p>
                        <h3 className="text-xl font-bold text-blue-600">
                            {formatRupiah(Object.values(debtMap).reduce((a,b)=>a+b, 0))}
                        </h3>
                    </div>
                </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Cari nama atau nomor HP..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="input-luxury pl-10 py-2.5"
                />
            </div>

            {/* TABLE CARD */}
            <div className="card-luxury overflow-hidden border border-border">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="table-modern w-full">
                        <thead>
                            <tr>
                                <th className="pl-6 w-1/3">Name & Type</th>
                                <th>Contact Info</th>
                                <th>Location</th>
                                <th className="text-right">Piutang</th>
                                <th className="text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-20 text-text-secondary animate-pulse">Loading Customers...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-20 text-text-secondary">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                filteredData.map(c => {
                                    const debt = debtMap[c.id] || 0;
                                    return (
                                        <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="pl-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-text-primary text-sm">{c.name}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide border ${
                                                            c.type === 'vip' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                            c.type === 'reseller' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                            'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                            {c.type?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    <span className="font-mono">{c.phone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-start gap-2 text-sm text-text-secondary max-w-xs">
                                                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                    <span className="truncate">{c.address || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right font-mono font-bold text-blue-600">
                                                {debt > 0 ? formatRupiah(debt) : '-'}
                                            </td>
                                            <td className="pr-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {debt > 0 && (
                                                        <button onClick={() => openPayment(c)} className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-1">
                                                            <ArrowDownLeft className="w-3 h-3"/> Terima
                                                        </button>
                                                    )}
                                                    <button onClick={() => openModal(c)} className="p-2 bg-white border border-border rounded-lg text-text-secondary hover:text-primary hover:border-primary shadow-sm transition-all">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => deleteItem(c.id)} className="p-2 bg-white border border-border rounded-lg text-rose-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: ADD/EDIT */}
            <Portal>
                <AnimatePresence>
                    {modalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="px-6 py-5 border-b border-border bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">{formData.id ? 'Edit Customer' : 'New Customer'}</h3>
                                        <p className="text-xs text-text-secondary mt-0.5">Manage details and classification.</p>
                                    </div>
                                    <button onClick={() => setModalOpen(false)} className="bg-white p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block group-focus-within:text-primary transition-colors">Nama Lengkap</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                <input required className="input-luxury pl-10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama Pelanggan" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block group-focus-within:text-primary transition-colors">Tipe</label>
                                                <select className="input-luxury cursor-pointer" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                                    <option value="end_customer">Umum</option>
                                                    <option value="reseller">Reseller</option>
                                                    <option value="vip">VIP</option>
                                                </select>
                                            </div>
                                            <div className="group">
                                                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block group-focus-within:text-primary transition-colors">No. HP</label>
                                                <input className="input-luxury font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="08..." />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block group-focus-within:text-primary transition-colors">Alamat Lengkap</label>
                                            <textarea rows="3" className="input-luxury resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Alamat pengiriman..."></textarea>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-gray-50 border border-transparent hover:border-border transition-all">
                                            Batal
                                        </button>
                                        <button type="submit" className="btn-gold px-6 py-2.5 shadow-md">
                                            Simpan Data
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>

            {/* MODAL 2: RECEIVE PAYMENT (NEW) */}
            <Portal>
            {paymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white border border-border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
                            <h3 className="text-lg font-bold text-emerald-800">Terima Pembayaran</h3>
                            <p className="text-xs text-emerald-600">{payForm.customerName}</p>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Nominal Diterima</label>
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
                                    Total Piutang: <span className="font-bold text-blue-600">{formatRupiah(debtMap[payForm.customerId] || 0)}</span>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Masuk Ke Kas</label>
                                <select className="input-luxury" value={payForm.walletId} onChange={e => setPayForm({...payForm, walletId: e.target.value})}>
                                    <option value="">-- Pilih Kas / Bank --</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => setPaymentModalOpen(false)} className="btn-ghost-dark text-xs">Batal</button>
                                <button type="submit" disabled={processingPay} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2">
                                    {processingPay ? 'Memproses...' : <><Wallet className="w-4 h-4"/> Terima Sekarang</>}
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