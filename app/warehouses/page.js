// app/warehouses/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [snapSupp, snapWh] = await Promise.all([
                getDocs(query(collection(db, "suppliers"), orderBy("name"))),
                getDocs(query(collection(db, "warehouses"), orderBy("created_at")))
            ]);
            
            const suppData = []; snapSupp.forEach(d => suppData.push({id: d.id, ...d.data()}));
            setSuppliers(suppData);

            const whData = []; snapWh.forEach(d => whData.push({id: d.id, ...d.data()}));
            setWarehouses(whData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openModal = (wh = null) => {
        setFormData(wh ? { ...wh } : { name: '', type: 'physical', supplier_id: '', address: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                address: formData.address,
                supplier_id: formData.type === 'virtual_supplier' ? formData.supplier_id : null,
                updated_at: serverTimestamp()
            };
            if (formData.id) await updateDoc(doc(db, "warehouses", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "warehouses"), payload); }
            setModalOpen(false); fetchData();
        } catch (err) { alert(err.message); }
    };

    const deleteWh = async (id) => {
        if(confirm("Hapus gudang?")) { await deleteDoc(doc(db, "warehouses", id)); fetchData(); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Master Gudang</h2>
                    <p className="text-sm text-slate-500">Kelola Gudang Fisik & Virtual.</p>
                </div>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                    + Gudang Baru
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <div className="col-span-full text-center py-12 text-slate-400">Loading...</div> : warehouses.map(w => {
                    const isVirtual = w.type === 'virtual_supplier';
                    const supName = isVirtual ? (suppliers.find(s => s.id === w.supplier_id)?.name || 'Unknown') : '-';
                    
                    return (
                        <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${isVirtual ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {/* Ikon diganti text agar tidak error SVG class */}
                                    <span className="font-bold text-xl">{isVirtual ? '☁️' : '🏠'}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${isVirtual ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                    {isVirtual ? 'Virtual' : 'Fisik'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{w.name}</h3>
                            
                            {isVirtual && <div className="mb-4 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">Supplier: {supName}</div>}
                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{w.address || 'Tidak ada alamat'}</p>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(w)} className="text-slate-400 hover:text-indigo-600 font-bold text-sm">Edit</button>
                                <button onClick={() => deleteWh(w.id)} className="text-slate-400 hover:text-red-600 font-bold text-sm">Del</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit Gudang' : 'Gudang Baru'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nama Gudang</label>
                                <input type="text" required className="w-full border p-2.5 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Tipe</label>
                                <select className="w-full border p-2.5 rounded-lg" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="physical">🏠 Fisik (Gudang Utama)</option>
                                    <option value="virtual_supplier">☁️ Virtual (Supplier)</option>
                                </select>
                            </div>
                            {formData.type === 'virtual_supplier' && (
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <label className="block text-sm font-bold text-indigo-800 mb-1">Pilih Supplier</label>
                                    <select className="w-full border p-2.5 rounded-lg" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                                        <option value="">-- Pilih Supplier --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold mb-1">Alamat</label>
                                <textarea rows="2" className="w-full border p-2.5 rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
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