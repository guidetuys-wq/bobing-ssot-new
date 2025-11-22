// app/brands/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function BrandsPage() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "brands"), orderBy("name", "asc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setBrands(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openModal = (brand = null) => {
        setFormData(brand ? { ...brand } : { name: '', type: 'own_brand' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { name: formData.name, type: formData.type, updated_at: serverTimestamp() };
            if (formData.id) await updateDoc(doc(db, "brands", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "brands"), payload); }
            setModalOpen(false); fetchData();
        } catch (e) { alert(e.message); }
    };

    const deleteBrand = async (id) => {
        if(confirm("Delete brand?")) { await deleteDoc(doc(db, "brands", id)); fetchData(); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Master Brands</h2>
                    <p className="text-sm text-slate-500">Own brands & Supplier brands.</p>
                </div>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                    + Add Brand
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Brand Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="3" className="text-center py-8">Loading...</td></tr> : brands.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                                <td className="px-6 py-4">
                                    {b.type === 'own_brand' 
                                        ? <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">Own Brand</span>
                                        : <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">Supplier</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => openModal(b)} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Edit</button>
                                    <button onClick={() => deleteBrand(b.id)} className="text-red-400 hover:text-red-600 font-bold text-sm">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit Brand' : 'New Brand'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold mb-1">Brand Name</label>
                                <input type="text" required className="w-full border p-2.5 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Al Muslim" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Type</label>
                                <select className="w-full border p-2.5 rounded-lg" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="own_brand">Own Brand (Internal)</option>
                                    <option value="supplier_brand">Supplier Brand</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}