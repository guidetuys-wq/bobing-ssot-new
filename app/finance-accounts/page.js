// app/finance-accounts/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function CoaPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "chart_of_accounts"), orderBy("code", "asc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setAccounts(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const toggleStatus = async (id, current) => {
        try {
            const newState = current === 'Aktif' ? 'Nonaktif' : 'Aktif';
            await updateDoc(doc(db, "chart_of_accounts", id), { status: newState, updated_at: serverTimestamp() });
            fetchData();
        } catch (e) { alert(e.message); }
    };

    const deleteAccount = async (id) => {
        if(confirm("Hapus akun ini?")) {
            await deleteDoc(doc(db, "chart_of_accounts", id));
            fetchData();
        }
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = ev.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);

                if (rows.length === 0) throw new Error("File kosong");
                if (!rows[0]['AccountID']) throw new Error("Format salah! Kolom harus: AccountID, Account Name, Account Type");
                if (!confirm(`Import ${rows.length} akun?`)) return;

                const batch = writeBatch(db);
                rows.forEach(row => {
                    const docRef = doc(db, "chart_of_accounts", String(row['AccountID']));
                    batch.set(docRef, {
                        code: String(row['AccountID']),
                        name: row['Account Name'],
                        category: row['Account Type'],
                        status: 'Aktif',
                        updated_at: serverTimestamp()
                    });
                });

                await batch.commit();
                alert("Import Berhasil!");
                fetchData();
            } catch (err) { alert("Gagal Import: " + err.message); }
            e.target.value = ''; // Reset input
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Chart of Accounts</h2>
                    <p className="text-sm text-slate-500">Daftar Akun (Aset, Kewajiban, Modal, Pendapatan, Beban).</p>
                </div>
                <label className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center cursor-pointer">
                    <span>Import CSV / Excel</span>
                    <input type="file" className="hidden" accept=".csv, .xlsx" onChange={handleImport} />
                </label>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Kode</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nama Akun</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Kategori</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="5" className="text-center py-12">Loading...</td></tr> : accounts.map(acc => {
                            let catColor = 'bg-slate-100 text-slate-600';
                            if (acc.category.includes('Aset')) catColor = 'bg-blue-50 text-blue-700 border-blue-100';
                            if (acc.category.includes('Pendapatan')) catColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            if (acc.category.includes('Beban')) catColor = 'bg-rose-50 text-rose-700 border-rose-100';

                            return (
                                <tr key={acc.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{acc.code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{acc.name}</td>
                                    <td className="px-6 py-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${catColor}`}>{acc.category}</span></td>
                                    <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleStatus(acc.id, acc.status)}>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${acc.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${acc.status === 'Aktif' ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteAccount(acc.id)} className="text-red-400 hover:text-red-600 font-bold text-xs">Del</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}