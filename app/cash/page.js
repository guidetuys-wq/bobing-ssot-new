// app/cash/page.js
"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, runTransaction, query, orderBy, where, serverTimestamp, limit, writeBatch } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';

export default function CashFlowPage() {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ in: 0, out: 0 });
    
    // Modals
    const [modalExpOpen, setModalExpOpen] = useState(false);
    const [modalTfOpen, setModalTfOpen] = useState(false);
    const [formData, setFormData] = useState({ type: 'out', account_id: '', category: '', amount: '', description: '', date: '' });
    const [tfData, setTfData] = useState({ from: '', to: '', amount: '', note: '' });
    const [categories, setCategories] = useState([]); // COA Expenses

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [accSnap, coaSnap] = await Promise.all([
                getDocs(query(collection(db, "cash_accounts"), orderBy("created_at"))),
                getDocs(query(collection(db, "chart_of_accounts"), orderBy("code")))
            ]);

            const accList = []; accSnap.forEach(d => accList.push({id:d.id, ...d.data()}));
            setAccounts(accList);

            const cats = []; 
            coaSnap.forEach(d => {
                const c = d.data();
                if(c.category.includes('Beban') || c.category.includes('Pendapatan')) cats.push(c);
            });
            setCategories(cats);

            await fetchTransactions();
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchTransactions = async () => {
        const q = query(collection(db, "cash_transactions"), orderBy("date", "desc"), limit(50));
        const snap = await getDocs(q);
        const list = [];
        let totalIn = 0, totalOut = 0;
        
        snap.forEach(d => {
            const t = d.data();
            list.push({id: d.id, ...t});
            if(t.type === 'in') totalIn += (t.amount||0); else totalOut += (t.amount||0);
        });
        setTransactions(list);
        setSummary({ in: totalIn, out: totalOut });
    };

    const submitTransaction = async (e) => {
        e.preventDefault();
        try {
            const amt = parseInt(formData.amount);
            await runTransaction(db, async (t) => {
                const ref = doc(collection(db, "cash_transactions"));
                t.set(ref, {
                    type: formData.type,
                    amount: amt,
                    account_id: formData.account_id,
                    category: formData.category,
                    description: formData.description,
                    date: new Date(formData.date),
                    created_at: serverTimestamp(),
                    ref_type: 'manual_entry'
                });

                const accRef = doc(db, "cash_accounts", formData.account_id);
                const accDoc = await t.get(accRef);
                const oldBal = accDoc.data().balance || 0;
                const newBal = formData.type === 'in' ? oldBal + amt : oldBal - amt;
                t.update(accRef, { balance: newBal });
            });
            setModalExpOpen(false); fetchData();
        } catch(e) { alert(e.message); }
    };

    const submitTransfer = async (e) => {
        e.preventDefault();
        if(tfData.from === tfData.to) return alert("Akun asal dan tujuan sama!");
        try {
            const amt = parseInt(tfData.amount);
            await runTransaction(db, async (t) => {
                const fromRef = doc(db, "cash_accounts", tfData.from);
                const toRef = doc(db, "cash_accounts", tfData.to);
                const fromDoc = await t.get(fromRef);
                const toDoc = await t.get(toRef);

                t.update(fromRef, { balance: (fromDoc.data().balance||0) - amt });
                t.update(toRef, { balance: (toDoc.data().balance||0) + amt });

                const logRef = doc(collection(db, "cash_transactions"));
                t.set(logRef, {
                    type: 'transfer', amount: amt, date: serverTimestamp(),
                    description: `Transfer to ${toDoc.data().name}: ${tfData.note}`,
                    account_id: tfData.from, ref_type: 'transfer_out'
                });
                
                const logRefIn = doc(collection(db, "cash_transactions"));
                t.set(logRefIn, {
                    type: 'transfer', amount: amt, date: serverTimestamp(),
                    description: `Transfer from ${fromDoc.data().name}: ${tfData.note}`,
                    account_id: tfData.to, ref_type: 'transfer_in'
                });
            });
            setModalTfOpen(false); fetchData();
        } catch(e) { alert(e.message); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Cash Flow & Wallets</h2>
                    <p className="text-sm text-slate-500">Manajemen kas operasional.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setModalTfOpen(true)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold">Transfer</button>
                    <button onClick={() => { setFormData({type:'out', date: new Date().toISOString().split('T')[0], account_id:'', category:'', amount:'', description:''}); setModalExpOpen(true); }} 
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg">
                        Catat Biaya / Masuk
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700">{acc.name}</h4>
                        <p className="text-xs text-slate-400 mb-3">{acc.code}</p>
                        <h3 className="text-2xl font-extrabold text-slate-800">{formatRupiah(acc.balance)}</h3>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">Riwayat Transaksi (50 Terakhir)</div>
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-slate-500">Tanggal</th>
                            <th className="px-6 py-3 text-left text-slate-500">Akun</th>
                            <th className="px-6 py-3 text-left text-slate-500">Kategori</th>
                            <th className="px-6 py-3 text-left text-slate-500">Ket</th>
                            <th className="px-6 py-3 text-right text-slate-500">Masuk</th>
                            <th className="px-6 py-3 text-right text-slate-500">Keluar</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-slate-600 font-mono">{new Date(t.date.toDate()).toLocaleDateString()}</td>
                                <td className="px-6 py-3 font-bold text-slate-700">{accounts.find(a=>a.id===t.account_id)?.name || 'Unknown'}</td>
                                <td className="px-6 py-3 text-slate-600">{t.category || '-'}</td>
                                <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{t.description}</td>
                                <td className="px-6 py-3 text-right font-bold text-emerald-600">{t.type==='in' || t.ref_type==='transfer_in' ? formatRupiah(t.amount) : '-'}</td>
                                <td className="px-6 py-3 text-right font-bold text-red-600">{t.type==='out' || t.ref_type==='transfer_out' ? formatRupiah(t.amount) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold">
                        <tr>
                            <td colSpan="4" className="px-6 py-3 text-right">Total Periode Ini:</td>
                            <td className="px-6 py-3 text-right text-emerald-600">{formatRupiah(summary.in)}</td>
                            <td className="px-6 py-3 text-right text-red-600">{formatRupiah(summary.out)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* MODAL EXPENSE */}
            {modalExpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-xl font-bold mb-6">Catat Transaksi</h3>
                        <form onSubmit={submitTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" required className="border p-2 rounded" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})} />
                                <select className="border p-2 rounded font-bold" value={formData.type} onChange={e=>setFormData({...formData, type:e.target.value})}>
                                    <option value="out">Pengeluaran</option>
                                    <option value="in">Pemasukan</option>
                                </select>
                            </div>
                            <select required className="w-full border p-2 rounded" value={formData.account_id} onChange={e=>setFormData({...formData, account_id:e.target.value})}>
                                <option value="">-- Sumber Dana --</option>
                                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <select required className="w-full border p-2 rounded" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                                <option value="">-- Kategori (COA) --</option>
                                {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                                <option value="Lainnya">Lainnya</option>
                            </select>
                            <input type="text" placeholder="Keterangan" required className="w-full border p-2 rounded" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} />
                            <input type="number" placeholder="Nominal (Rp)" required className="w-full border p-2 rounded font-bold text-lg" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} />
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={()=>setModalExpOpen(false)} className="px-4 py-2 rounded text-slate-600 font-bold">Batal</button>
                                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TRANSFER */}
            {modalTfOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-xl font-bold mb-6">Transfer Antar Akun</h3>
                        <form onSubmit={submitTransfer} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold">Dari</label>
                                    <select required className="w-full border p-2 rounded bg-red-50" value={tfData.from} onChange={e=>setTfData({...tfData, from:e.target.value})}>
                                        <option value="">Pilih</option>
                                        {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold">Ke</label>
                                    <select required className="w-full border p-2 rounded bg-green-50" value={tfData.to} onChange={e=>setTfData({...tfData, to:e.target.value})}>
                                        <option value="">Pilih</option>
                                        {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <input type="number" placeholder="Nominal" required className="w-full border p-2 rounded font-bold text-lg" value={tfData.amount} onChange={e=>setTfData({...tfData, amount:e.target.value})} />
                            <input type="text" placeholder="Catatan" className="w-full border p-2 rounded" value={tfData.note} onChange={e=>setTfData({...tfData, note:e.target.value})} />
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={()=>setModalTfOpen(false)} className="px-4 py-2 rounded text-slate-600 font-bold">Batal</button>
                                <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white font-bold">Proses</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}