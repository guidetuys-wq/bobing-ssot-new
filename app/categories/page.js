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
        <div className="max-w-4xl mx-auto space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
                    <p className="text-sm text-gray-500">Product classification.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={syncFromProducts} disabled={syncing} className="btn-secondary text-xs">
                        {syncing ? 'Syncing...' : 'Sync from Products'}
                    </button>
                    <button onClick={() => { setFormData({name:''}); setModalOpen(true); }} className="btn-primary">
                        New Category
                    </button>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="table-modern">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="2" className="text-center py-8 text-gray-400">Loading...</td></tr> : categories.map(c => (
                                <tr key={c.id}>
                                    <td className="font-medium text-gray-800">{c.name}</td>
                                    <td className="text-right space-x-2">
                                        <button onClick={() => { setFormData({...c}); setModalOpen(true); }} className="text-xs font-bold text-brand-600 hover:text-brand-800">Edit</button>
                                        <button onClick={() => deleteCategory(c.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Del</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 fade-in-up">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">{formData.id ? 'Edit Category' : 'New Category'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Name</label>
                                <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}