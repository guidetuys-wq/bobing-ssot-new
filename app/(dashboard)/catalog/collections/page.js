// app/(dashboard)/catalog/collections/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Plus, Edit2, Trash2, Tag, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CACHE_KEY = 'lumina_collections_v1';
const CACHE_DURATION = 60 * 60 * 1000;

export default function CollectionsPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data: cachedData, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setData(cachedData);
                        setLoading(false);
                        return;
                    }
                }
            }
            const q = query(collection(db, "collections"), orderBy("created_at", "desc"), limit(100));
            const s = await getDocs(q);
            const d = []; 
            s.forEach(x => d.push({id:x.id, ...x.data()}));
            setData(d);
            if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, timestamp: Date.now() }));
        } catch(e) { console.error(e); toast.error("Gagal memuat collections"); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        const savePromise = new Promise(async (resolve, reject) => {
            try { 
                const payload = { ...formData, updated_at: serverTimestamp() };
                if(formData.id) await updateDoc(doc(db,"collections",formData.id), payload); 
                else await addDoc(collection(db,"collections"), {...payload, created_at: serverTimestamp()});
                
                if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
                setModalOpen(false); fetchData(true); resolve();
            } catch(e) { reject(e); }
        });
        toast.promise(savePromise, { loading: 'Menyimpan...', success: 'Koleksi berhasil disimpan!', error: (err) => `Gagal: ${err.message}` });
    };

    const handleDelete = async (id) => {
        if(!confirm("Hapus koleksi ini?")) return;
        try {
            await deleteDoc(doc(db, "collections", id));
            if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
            fetchData(true);
            toast.success("Koleksi dihapus");
        } catch(e) { toast.error("Gagal menghapus"); }
    };

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 px-4 md:px-8 pt-6 bg-background min-h-screen text-text-primary">
            <PageHeader 
                title="Master Collections" 
                subtitle="Kelola Season, Batch Rilis, atau Edisi Khusus untuk analisa performa."
                actions={
                    <button onClick={() => { setFormData({ name:'', description:'', status:'active' }); setModalOpen(true); }} className="btn-gold flex items-center gap-2 shadow-lg">
                        <Plus className="w-4 h-4 stroke-[3px]" /> New Collection
                    </button>
                }
            />

            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border">
                            <tr><th className="pl-6 py-4">Collection Name</th><th className="py-4">Status</th><th className="text-right pr-6 py-4">Actions</th></tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-border/60">
                            {loading ? <tr><td colSpan="3" className="text-center py-10 text-text-secondary animate-pulse">Loading...</td></tr> : 
                            data.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="pl-6 py-4 font-medium text-text-primary">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Sparkles className="w-4 h-4"/></div>
                                            <div>
                                                <div>{c.name}</div>
                                                <div className="text-[10px] text-text-secondary">{c.description || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${c.status==='active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="text-right pr-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={()=>{setFormData({...c}); setModalOpen(true)}} className="p-2 text-text-secondary hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={()=>handleDelete(c.id)} className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Portal>
                <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-white border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                            <h3 className="text-lg font-bold text-text-primary mb-4">{formData.id ? 'Edit Collection' : 'New Collection'}</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary block mb-1">Nama Koleksi</label>
                                    <input className="input-luxury" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} autoFocus placeholder="Contoh: Lebaran 2024" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary block mb-1">Deskripsi</label>
                                    <input className="input-luxury" value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Opsional..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary block mb-1">Status</label>
                                    <select className="input-luxury" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})}>
                                        <option value="active">Active (Tampil di Laporan)</option>
                                        <option value="archived">Archived (Selesai)</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={()=>setModalOpen(false)} className="btn-ghost-dark">Cancel</button>
                                    <button type="submit" className="btn-gold px-6">Save</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                </AnimatePresence>
            </Portal>
        </div>
    );
}