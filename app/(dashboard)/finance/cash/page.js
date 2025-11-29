// app/(dashboard)/finance/cash/page.js
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, writeBatch, addDoc, serverTimestamp, doc, increment, getDoc } from 'firebase/firestore'; // Ditambah getDoc
import { formatRupiah } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext'; 
import toast from 'react-hot-toast';

// UI Imports
import { 
    ArrowUpCircle, ArrowDownCircle, Wallet, Search, Filter, 
    Calendar, ChevronDown, ArrowUpRight, ArrowDownLeft, Plus, X, Save, Building,
    Trash2, Edit2, AlertTriangle, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Cache Configuration
const CACHE_KEY_ACCOUNTS = 'lumina_finance_accounts_v2';

// Helper Date
const safeDate = (dateInput) => {
    if (!dateInput) return new Date();
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
};

export default function CashTransactionsPage() {
  const { user } = useAuth();

  // Data State
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]); 
  const [metrics, setMetrics] = useState({ totalIn: 0, totalOut: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all'); 
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  
  // UI State
  const [expandedDate, setExpandedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ 
      type: 'out', amount: '', wallet_account_id: '', category_account_id: '', description: '', date: '' 
  });

  useEffect(() => { fetchMasterData(); }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      let coaList = [];
      const cachedCOA = localStorage.getItem(CACHE_KEY_ACCOUNTS);
      if (cachedCOA) {
          const { data, timestamp } = JSON.parse(cachedCOA);
          if (Date.now() - timestamp < 3600000) coaList = data; 
      }
      
      if (coaList.length === 0) {
          const qAcc = query(collection(db, "chart_of_accounts"), orderBy("code", "asc"));
          const snapAcc = await getDocs(qAcc);
          coaList = snapAcc.docs.map(d => ({ id: d.id, ...d.data() }));
          localStorage.setItem(CACHE_KEY_ACCOUNTS, JSON.stringify({ data: coaList, timestamp: Date.now() }));
      }
      setAccounts(coaList);

      const defWallet = coaList.find(a => a.code.startsWith('1') && (a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')));
      if(defWallet) setForm(f => ({ ...f, wallet_account_id: defWallet.id }));

      await fetchTransactions();

    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTransactions = async () => {
      try {
        const qTrans = query(collection(db, "cash_transactions"), orderBy("date", "desc"), limit(300));
        const snapTrans = await getDocs(qTrans);
        const transList = snapTrans.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id, ...d,
                date: d.date?.toDate ? d.date.toDate() : safeDate(d.date)
            };
        });

        const totalIn = transList.filter(t => t.type === 'in').reduce((a,b) => a + (b.amount||0), 0);
        const totalOut = transList.filter(t => t.type === 'out').reduce((a,b) => a + (b.amount||0), 0);

        setTransactions(transList);
        setMetrics({ totalIn, totalOut, netBalance: totalIn - totalOut });
        
        if(transList.length > 0 && !expandedDate) {
            setExpandedDate(safeDate(transList[0].date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
      } catch(e) { console.error(e); }
  };

  // --- RESET DATABASE (DEV TOOL) ---
  const handleResetTransactions = async () => {
      if(!confirm("⚠️ DANGER: Reset TOTAL Database Transaksi & Saldo Akun?")) return;
      const check = prompt("Ketik 'RESET' untuk konfirmasi:");
      if(check !== 'RESET') return;

      const tId = toast.loading("Wiping Data...");
      try {
          const batch = writeBatch(db);
          
          // 1. Hapus Transaksi
          const qTrans = query(collection(db, "cash_transactions"), limit(500));
          const snapTrans = await getDocs(qTrans);
          snapTrans.forEach(doc => batch.delete(doc.ref));

          // 2. Reset Saldo Akun
          const qAcc = query(collection(db, "chart_of_accounts"));
          const snapAcc = await getDocs(qAcc);
          snapAcc.forEach(doc => batch.update(doc.ref, { balance: 0 }));

          await batch.commit();
          
          localStorage.clear(); // Clear all caches
          fetchMasterData(); 
          toast.success("Database Bersih!", { id: tId });
      } catch(e) { toast.error(e.message, { id: tId }); }
  };

  const openAddModal = () => {
      setEditingId(null);
      setForm(prev => ({ ...prev, type: 'out', amount: '', category_account_id: '', description: '', date: '' }));
      setIsModalOpen(true);
  };

  const openEditModal = (item) => {
      setEditingId(item.id);
      const dateStr = item.date.toISOString().split('T')[0];
      setForm({
          type: item.type, amount: item.amount,
          wallet_account_id: item.account_id,
          category_account_id: item.category_account_id || '',
          description: item.description, date: dateStr
      });
      setIsModalOpen(true);
  };

  // --- SAVE LOGIC (DOUBLE ENTRY) ---
  const handleSave = async (e) => {
      e.preventDefault();
      if(!form.amount || !form.wallet_account_id || !form.category_account_id) return toast.error("Data tidak lengkap!");
      
      const toastId = toast.loading("Menyimpan...");
      try {
          const amountVal = parseFloat(form.amount);
          const walletAcc = accounts.find(a => a.id === form.wallet_account_id);
          const categoryAcc = accounts.find(a => a.id === form.category_account_id);
          const batch = writeBatch(db);
          const timestamp = serverTimestamp();
          
          const payload = {
              type: form.type, amount: amountVal,
              account_id: form.wallet_account_id,
              account_name: walletAcc?.name, account_code: walletAcc?.code,
              category_account_id: form.category_account_id,
              category: categoryAcc?.name || 'General', category_code: categoryAcc?.code,
              description: form.description || `${form.type==='in'?'Terima':'Bayar'} ${categoryAcc?.name}`,
              date: form.date ? new Date(form.date) : timestamp,
              updated_at: timestamp
          };

          if (editingId) {
              // --- EDIT: REVERT OLD & APPLY NEW ---
              const oldItem = transactions.find(t => t.id === editingId);
              
              // 1. Revert Wallet Lama
              const oldWalletRef = doc(db, "chart_of_accounts", oldItem.account_id);
              const revertWallet = oldItem.type === 'in' ? -oldItem.amount : oldItem.amount;
              batch.update(oldWalletRef, { balance: increment(revertWallet) });

              // 2. Revert Category Lama
              if(oldItem.category_account_id) {
                  const oldCatRef = doc(db, "chart_of_accounts", oldItem.category_account_id);
                  batch.update(oldCatRef, { balance: increment(-oldItem.amount) }); // Asumsi saldo category selalu positif accumulating
              }

              // 3. Apply Wallet Baru
              const newWalletRef = doc(db, "chart_of_accounts", form.wallet_account_id);
              const applyWallet = form.type === 'in' ? amountVal : -amountVal;
              batch.update(newWalletRef, { balance: increment(applyWallet) });

              // 4. Apply Category Baru
              const newCatRef = doc(db, "chart_of_accounts", form.category_account_id);
              batch.update(newCatRef, { balance: increment(amountVal) });

              // 5. Update Transaksi
              batch.update(doc(db, "cash_transactions", editingId), { ...payload, updated_by: user?.email });

          } else {
              // --- CREATE BARU ---
              payload.created_by = user?.email; payload.created_at = timestamp; payload.ref_type = 'manual';
              const transRef = doc(collection(db, "cash_transactions"));
              batch.set(transRef, payload);

              // 1. Update Wallet
              const walletRef = doc(db, "chart_of_accounts", form.wallet_account_id);
              const walletAdj = form.type === 'in' ? amountVal : -amountVal;
              batch.update(walletRef, { balance: increment(walletAdj) });

              // 2. Update Category (Lawan)
              const catRef = doc(db, "chart_of_accounts", form.category_account_id);
              batch.update(catRef, { balance: increment(amountVal) });
          }

          await batch.commit();
          toast.success("Berhasil!", { id: toastId });
          setIsModalOpen(false); fetchTransactions();

      } catch(e) { console.error(e); toast.error(e.message, { id: toastId }); }
  };

  // --- DELETE LOGIC (DOUBLE REVERT) ---
  const handleDelete = async (item) => {
      if(!confirm("Hapus transaksi? Saldo akun akan dikembalikan.")) return;
      const tId = toast.loading("Menghapus...");
      try {
          const batch = writeBatch(db);

          // 1. Revert Wallet
          const walletRef = doc(db, "chart_of_accounts", item.account_id);
          const revertWallet = item.type === 'in' ? -item.amount : item.amount;
          batch.update(walletRef, { balance: increment(revertWallet) });

          // 2. Revert Category
          if(item.category_account_id && item.category_account_id !== 'unassigned') {
              const catRef = doc(db, "chart_of_accounts", item.category_account_id);
              batch.update(catRef, { balance: increment(-item.amount) });
          }

          batch.delete(doc(db, "cash_transactions", item.id));
          await batch.commit();
          
          toast.success("Terhapus & Saldo Kembali", { id: tId });
          fetchTransactions();
      } catch(e) { toast.error(e.message, { id: tId }); }
  };

  const groupedTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter(t => (t.description||'').toLowerCase().includes(lower) || (t.category||'').toLowerCase().includes(lower));
    }
    if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
    if (filterAccount !== 'all') filtered = filtered.filter(t => t.account_id === filterAccount);
    if (dateFilter.start) filtered = filtered.filter(t => t.date >= new Date(dateFilter.start));
    if (dateFilter.end) {
        const endDate = new Date(dateFilter.end); endDate.setHours(23,59,59,999);
        filtered = filtered.filter(t => t.date <= endDate);
    }

    const groups = {};
    filtered.forEach(t => {
        const dateKey = safeDate(t.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = { items: [], totalIn: 0, totalOut: 0 };
        groups[dateKey].items.push(t);
        if (t.type === 'in') groups[dateKey].totalIn += t.amount; else groups[dateKey].totalOut += t.amount;
    });

    return Object.entries(groups).map(([dateLabel, data]) => ({ dateLabel, ...data, netFlow: data.totalIn - data.totalOut }));
  }, [transactions, searchTerm, filterType, filterAccount, dateFilter]);

  const getCategoryOptions = () => {
      const allowedCodes = form.type === 'in' ? ['4','3','2'] : ['5','1','2','5']; // Filter kode akun yang relevan
      return accounts.filter(a => allowedCodes.includes(String(a.code).charAt(0)));
  };
  
  const walletOptions = accounts.filter(a => {
      const cat = (a.category || '').toUpperCase();
      return a.code.startsWith('1') && (cat.includes('ASET') || a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'));
  });

  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <div className={`p-5 rounded-2xl border shadow-sm flex justify-between items-center ${color==='emerald'?'bg-emerald-50 border-emerald-100 text-emerald-700':color==='rose'?'bg-rose-50 border-rose-100 text-rose-700':'bg-blue-50 border-blue-100 text-blue-700'}`}>
        <div><p className="text-[10px] font-bold uppercase opacity-70 mb-1">{title}</p><h3 className="text-2xl font-display font-bold">{loading ? <Skeleton className="h-8 w-24 opacity-20 bg-current"/> : value}</h3></div>
        <div className="p-3 rounded-xl bg-white/50 backdrop-blur-sm"><Icon className="w-6 h-6" /></div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-2xl font-bold text-text-primary">Cash Flow</h1><p className="text-sm text-text-secondary">Jurnal transaksi (Double Entry).</p></div>
          <div className="flex gap-2">
              <button onClick={handleResetTransactions} className="btn-ghost-dark border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-2 text-xs flex items-center gap-2"><Zap className="w-3.5 h-3.5"/> Reset Data</button>
              <button onClick={openAddModal} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Input Transaksi</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Pemasukan" value={formatRupiah(metrics.totalIn)} color="emerald" icon={ArrowUpCircle} />
        <MetricCard title="Pengeluaran" value={formatRupiah(metrics.totalOut)} color="rose" icon={ArrowDownCircle} />
        <MetricCard title="Net Cash" value={formatRupiah(metrics.netBalance)} color="blue" icon={Wallet} />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col xl:flex-row gap-4">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/><input className="pl-10 pr-4 py-2.5 bg-gray-50 border border-border rounded-xl text-sm w-full" placeholder="Cari..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
            <select className="pl-3 pr-8 py-2.5 bg-gray-50 border border-border rounded-xl text-sm font-bold appearance-none cursor-pointer" value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">Semua Tipe</option><option value="in">Masuk (IN)</option><option value="out">Keluar (OUT)</option></select>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
              <select className="pl-3 pr-8 py-2.5 bg-white border border-border rounded-xl text-xs font-bold appearance-none cursor-pointer" value={filterAccount} onChange={e=>setFilterAccount(e.target.value)}><option value="all">Semua Akun</option>{walletOptions.map(a=><option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select>
              <input type="date" className="bg-transparent border border-border rounded-xl text-xs p-2 font-bold" value={dateFilter.start} onChange={e=>setDateFilter({...dateFilter, start:e.target.value})} />
              <span className="text-gray-300">-</span>
              <input type="date" className="bg-transparent border border-border rounded-xl text-xs p-2 font-bold" value={dateFilter.end} onChange={e=>setDateFilter({...dateFilter, end:e.target.value})} />
          </div>
      </div>

      <div className="space-y-4">
          {loading ? [1,2].map(i=><Skeleton key={i} className="h-24 w-full rounded-2xl"/>) : groupedTransactions.length===0 ? <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl text-text-secondary">Tidak ada data.</div> : 
           groupedTransactions.map((group) => (
              <div key={group.dateLabel} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div onClick={()=>setExpandedDate(expandedDate===group.dateLabel?null:group.dateLabel)} className={`p-4 flex justify-between items-center cursor-pointer ${expandedDate===group.dateLabel?'bg-gray-50':'bg-white'}`}>
                      <div className="flex items-center gap-4"><div className="p-2 bg-gray-100 rounded-lg"><Calendar className="w-5 h-5 text-secondary"/></div><div><h3 className="font-bold text-sm">{group.dateLabel}</h3><div className="text-xs text-text-secondary">{group.items.length} Tx • <span className={group.netFlow>=0?'text-emerald-600':'text-rose-600'}>Net: {formatRupiah(group.netFlow)}</span></div></div></div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedDate===group.dateLabel?'rotate-180':''}`}/>
                  </div>
                  <AnimatePresence>{expandedDate===group.dateLabel && (
                      <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="border-t border-border bg-gray-50/30">
                          {group.items.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-4 border-b border-border last:border-0 hover:bg-white group/item">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${item.type==='in'?'bg-emerald-100 text-emerald-600':'bg-rose-100 text-rose-600'}`}>{item.type==='in'?<ArrowDownLeft className="w-5 h-5"/>:<ArrowUpRight className="w-5 h-5"/>}</div>
                                      <div>
                                          <p className="font-bold text-sm text-text-primary">{item.description}</p>
                                          <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                                              <span className="bg-white px-1.5 py-0.5 rounded border">{item.account_name}</span> <span className="opacity-50">→</span> <span className="bg-white px-1.5 py-0.5 rounded border">{item.category}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <p className={`font-mono font-bold text-sm ${item.type==='in'?'text-emerald-600':'text-text-primary'}`}>{item.type==='in'?'+':'-'}{formatRupiah(item.amount)}</p>
                                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <button onClick={()=>openEditModal(item)} className="p-1.5 rounded hover:bg-blue-50 text-text-secondary hover:text-primary"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={()=>handleDelete(item)} className="p-1.5 rounded hover:bg-rose-50 text-text-secondary hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </motion.div>
                  )}</AnimatePresence>
              </div>
           ))}
      </div>

      <AnimatePresence>{isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border">
                  <div className="flex justify-between mb-6"><h3 className="text-lg font-bold">{editingId?'Edit Transaksi':'Input Transaksi'}</h3><button onClick={()=>setIsModalOpen(false)}><X/></button></div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
                          <button type="button" onClick={()=>setForm({...form, type:'in'})} className={`py-2 rounded-lg text-xs font-bold ${form.type==='in'?'bg-emerald-500 text-white shadow':'text-secondary'}`}>Pemasukan (IN)</button>
                          <button type="button" onClick={()=>setForm({...form, type:'out'})} className={`py-2 rounded-lg text-xs font-bold ${form.type==='out'?'bg-rose-500 text-white shadow':'text-secondary'}`}>Pengeluaran (OUT)</button>
                      </div>
                      <div><label className="text-xs font-bold uppercase mb-1 block">Sumber Dana (Wallet)</label><select className="input-luxury" value={form.wallet_account_id} onChange={e=>setForm({...form, wallet_account_id:e.target.value})}>{walletOptions.map(a=><option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                      <div><label className="text-xs font-bold uppercase mb-1 block">Kategori (Akun Lawan)</label><select className="input-luxury" value={form.category_account_id} onChange={e=>setForm({...form, category_account_id:e.target.value})}><option value="">-- Pilih Kategori --</option>{getCategoryOptions().map(a=><option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                      <div><label className="text-xs font-bold uppercase mb-1 block">Jumlah</label><input type="number" className="input-luxury text-lg font-bold" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})}/></div>
                      <div><label className="text-xs font-bold uppercase mb-1 block">Keterangan</label><textarea className="input-luxury" rows="2" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}></textarea></div>
                      <button type="submit" className={`btn-primary w-full py-3 mt-2 ${form.type==='out'?'!bg-rose-600':''}`}>{editingId?'Update':'Simpan'}</button>
                  </form>
              </motion.div>
          </div>
      )}</AnimatePresence>
    </div>
  );
}