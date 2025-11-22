// app/suppliers/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "suppliers"), orderBy("name", "asc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setSuppliers(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openModal = (sup = null) => {
        setFormData(sup ? { ...sup } : { name: '', phone: '', address: '', notes: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                notes: formData.notes,
                updated_at: serverTimestamp()
            };
            if (formData.id) await updateDoc(doc(db, "suppliers", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "suppliers"), payload); }
            setModalOpen(false); fetchData();
        } catch (e) { alert("Gagal: " + e.message); }
    };

    const deleteItem = async (id) => {
        if(confirm("Hapus supplier ini?")) { await deleteDoc(doc(db, "suppliers", id)); fetchData(); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Master Supplier</h2>
                    <p className="text-sm text-slate-500">Database kontak supplier.</p>
                </div>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                    + Tambah Supplier
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nama</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Kontak</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Alamat</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="4" className="text-center py-12">Loading...</td></tr> : suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{s.phone || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">{s.address || '-'}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => openModal(s)} className="text-blue-600 font-bold text-xs">Edit</button>
                                    <button onClick={() => deleteItem(s.id)} className="text-red-600 font-bold text-xs">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit Supplier' : 'Supplier Baru'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Nama Supplier</label>
                                    <input type="text" required className="w-full border p-2.5 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">No. Telepon / WA</label>
                                    <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Alamat</label>
                                <textarea rows="2" className="w-full border p-2.5 rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Catatan</label>
                                <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-md">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}