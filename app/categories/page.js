// app/categories/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [syncing, setSyncing] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "categories"), orderBy("name", "asc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setCategories(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const syncFromProducts = async () => {
        setSyncing(true);
        try {
            const pSnap = await getDocs(collection(db, "products"));
            const uniqueNames = new Set();
            pSnap.forEach(d => { const cat = d.data().category; if(cat) uniqueNames.add(cat.trim()); });
            
            const existingNames = new Set(categories.map(c => c.name));
            const batch = writeBatch(db);
            let count = 0;
            
            uniqueNames.forEach(name => {
                if(!existingNames.has(name)) {
                    const ref = doc(collection(db, "categories"));
                    batch.set(ref, { name: name, created_at: serverTimestamp() });
                    count++;
                }
            });
            
            if(count > 0) { await batch.commit(); fetchData(); alert(`Synced ${count} categories.`); }
            else alert("All synced.");
        } catch(e) { alert("Sync error: " + e.message); } 
        finally { setSyncing(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) await updateDoc(doc(db, "categories", formData.id), { name: formData.name });
            else await addDoc(collection(db, "categories"), { name: formData.name, created_at: serverTimestamp() });
            setModalOpen(false); fetchData();
        } catch (e) { alert(e.message); }
    };

    const deleteCategory = async (id) => {
        if(confirm("Delete category?")) { await deleteDoc(doc(db, "categories", id)); fetchData(); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Master Categories</h2>
                    <p className="text-sm text-slate-500">Product classification.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={syncFromProducts} disabled={syncing} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border border-indigo-200 disabled:opacity-50">
                        {syncing ? 'Syncing...' : 'Sync from Products'}
                    </button>
                    <button onClick={() => { setFormData({name:''}); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                        + New Category
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase w-full">Category Name</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="2" className="text-center py-8">Loading...</td></tr> : categories.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => { setFormData({...c}); setModalOpen(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Edit</button>
                                    <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600 font-bold text-sm">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit Category' : 'New Category'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold mb-1">Name</label>
                                <input type="text" required className="w-full border p-2.5 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
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