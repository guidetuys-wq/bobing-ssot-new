"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast'; // Import toast

// Konfigurasi Cache
const CACHE_KEY = 'lumina_brands_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 Menit

export default function BrandsPage() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (!forceRefresh) {
                const cached = sessionStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setBrands(data);
                        setLoading(false);
                        return; 
                    }
                }
            }

            const q = query(
                collection(db, "brands"), 
                orderBy("name"), 
                limit(100) 
            );
            
            const s = await getDocs(q);
            const d = []; 
            s.forEach(x => d.push({id:x.id, ...x.data()}));
            
            setBrands(d);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                data: d,
                timestamp: Date.now()
            }));

        } catch(e) {
            console.error(e);
            toast.error("Gagal memuat data brands");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        
        // Menggunakan toast.promise untuk feedback loading/sukses/gagal
        const savePromise = new Promise(async (resolve, reject) => {
            try { 
                if(formData.id) {
                    await updateDoc(doc(db,"brands",formData.id), formData);
                } else {
                    await addDoc(collection(db,"brands"), {...formData, created_at: serverTimestamp()}); 
                }
                
                sessionStorage.removeItem(CACHE_KEY);
                setModalOpen(false); 
                fetchData(true); 
                resolve();
            } catch(e) {
                reject(e);
            } 
        });

        toast.promise(savePromise, {
            loading: 'Menyimpan...',
            success: 'Brand berhasil disimpan!',
            error: (err) => `Gagal: ${err.message}`,
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 fade-in">
            <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-3xl font-bold text-lumina-text">Brands</h2>
            <button onClick={() => { setFormData({ name:'', type:'own_brand' }); setModalOpen(true); }} className="btn-gold">
                Add Brand
            </button>
        </div>

            
            <div className="card-luxury overflow-hidden">
                <table className="table-dark w-full">
                    <thead>
                        <tr>
                            <th className="pl-6">Name</th>
                            <th>Type</th>
                            <th className="text-right pr-6">Act</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" className="text-center py-4 text-lumina-muted">Loading...</td></tr>
                        ) : brands.map(b => (
                            <tr key={b.id}>
                                <td className="pl-6 text-white font-medium">{b.name}</td>
                                <td><span className="badge-luxury badge-neutral">{b.type}</span></td>
                                <td className="text-right pr-6">
                                    <button onClick={()=>{setFormData({...b}); setModalOpen(true)}} className="text-xs text-lumina-gold">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Portal>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <div className="bg-lumina-surface border border-lumina-border rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-lg font-bold text-white mb-4">Brand Form</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input 
                                    className="input-luxury" 
                                    placeholder="Brand Name" 
                                    value={formData.name} 
                                    onChange={e=>setFormData({...formData,name:e.target.value})}
                                />
                                <select 
                                    className="input-luxury" 
                                    value={formData.type} 
                                    onChange={e=>setFormData({...formData,type:e.target.value})}
                                >
                                    <option value="own_brand">Own Brand</option>
                                    <option value="supplier_brand">Supplier</option>
                                </select>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={()=>setModalOpen(false)} className="btn-ghost-dark">Cancel</button>
                                    <button className="btn-gold">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Portal>
        </div>
    );
}