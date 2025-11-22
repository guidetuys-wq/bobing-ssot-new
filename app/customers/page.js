// app/customers/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [scanning, setScanning] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "customers"), orderBy("name", "asc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setCustomers(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const scanFromSales = async () => {
        if(!confirm("Scan riwayat penjualan untuk data pelanggan baru?")) return;
        setScanning(true);
        try {
            const snapSales = await getDocs(collection(db, "sales_orders"));
            const newCandidates = {};
            snapSales.forEach(doc => {
                const s = doc.data();
                const name = s.customer_name || '';
                const phone = s.customer_phone || '';
                if (phone.length > 9 && !phone.includes('*') && !name.includes('*')) {
                    if (!newCandidates[phone]) {
                        newCandidates[phone] = { name, phone, address: s.shipping_address || '', type: 'end_customer' };
                    }
                }
            });

            const existingPhones = new Set(customers.map(c => c.phone));
            const finalToAdd = Object.values(newCandidates).filter(c => !existingPhones.has(c.phone));

            if (finalToAdd.length === 0) {
                alert("Scan selesai. Tidak ditemukan data baru.");
            } else {
                const batch = writeBatch(db);
                finalToAdd.forEach(c => {
                    const ref = doc(collection(db, "customers"));
                    batch.set(ref, { ...c, created_at: serverTimestamp(), source: 'auto_scan' });
                });
                await batch.commit();
                alert(`Berhasil menyimpan ${finalToAdd.length} pelanggan baru!`);
                fetchData();
            }
        } catch (e) { alert(e.message); } finally { setScanning(false); }
    };

    const openModal = (cust = null) => {
        setFormData(cust ? { ...cust } : { name: '', type: 'end_customer', phone: '', address: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                phone: formData.phone,
                address: formData.address,
                updated_at: serverTimestamp()
            };
            if (formData.id) await updateDoc(doc(db, "customers", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "customers"), payload); }
            setModalOpen(false); fetchData();
        } catch (e) { alert(e.message); }
    };

    const deleteItem = async (id) => {
        if(confirm("Hapus pelanggan?")) { await deleteDoc(doc(db, "customers", id)); fetchData(); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Customer CRM</h2>
                    <p className="text-sm text-slate-500">Database Reseller & Pelanggan Loyal.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={scanFromSales} disabled={scanning} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all">
                        {scanning ? 'Scanning...' : 'Scan dari Penjualan'}
                    </button>
                    <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                        + New Customer
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nama</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Tipe</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Kontak</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Lokasi</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="5" className="text-center py-12">Loading...</td></tr> : customers.map(c => {
                            let badgeClass = 'bg-slate-100 text-slate-600';
                            if(c.type === 'reseller') badgeClass = 'bg-purple-100 text-purple-700 border border-purple-200';
                            if(c.type === 'vip') badgeClass = 'bg-amber-100 text-amber-700 border border-amber-200';
                            
                            return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                                    <td className="px-6 py-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>{c.type}</span></td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{c.phone || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">{c.address || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openModal(c)} className="text-blue-600 font-bold text-xs">Edit</button>
                                        <button onClick={() => deleteItem(c.id)} className="text-red-400 font-bold text-xs">Del</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit Customer' : 'Pelanggan Baru'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Nama Lengkap</label>
                                    <input type="text" required className="w-full border p-2.5 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Tipe</label>
                                    <select className="w-full border p-2.5 rounded-lg" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option value="end_customer">Customer Umum</option>
                                        <option value="reseller">Reseller / Agen</option>
                                        <option value="vip">VIP</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">WhatsApp</label>
                                <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Alamat</label>
                                <textarea rows="3" className="w-full border p-2.5 rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold">Batal</button>
                                <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}