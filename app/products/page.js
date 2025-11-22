// app/products/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, where } from 'firebase/firestore';
import { sortBySize, formatRupiah } from '@/lib/utils';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalVariantsOpen, setModalVariantsOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [currentVariants, setCurrentVariants] = useState([]);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [modalGroup, setModalGroup] = useState('color');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [snapBrands, snapCats, snapProds] = await Promise.all([
                getDocs(query(collection(db, "brands"), orderBy("name", "asc"))),
                getDocs(query(collection(db, "categories"), orderBy("name", "asc"))),
                getDocs(collection(db, "products"))
            ]);

            const brandsData = []; snapBrands.forEach(d => brandsData.push({id: d.id, ...d.data()}));
            setBrands(brandsData);

            const catsData = []; snapCats.forEach(d => catsData.push({id: d.id, ...d.data()}));
            setCategories(catsData);

            const prodsData = [];
            snapProds.forEach(d => {
                const data = d.data();
                const brandName = brandsData.find(b => b.id === data.brand_id)?.name || '';
                prodsData.push({id: d.id, ...data, brand_name: brandName});
            });
            prodsData.sort((a,b) => (a.base_sku || '').localeCompare(b.base_sku || ''));
            setProducts(prodsData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openModal = (prod = null) => {
        if (prod) {
            setFormData({ ...prod });
        } else {
            setFormData({ brand_id: '', name: '', base_sku: '', category: '', description: '', status: 'active' });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                brand_id: formData.brand_id,
                name: formData.name,
                base_sku: formData.base_sku,
                category: formData.category,
                description: formData.description,
                status: formData.status,
                updated_at: serverTimestamp()
            };

            if (formData.id) {
                await updateDoc(doc(db, "products", formData.id), payload);
            } else {
                payload.created_at = serverTimestamp();
                await addDoc(collection(db, "products"), payload);
            }
            setModalOpen(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const deleteProduct = async (id) => {
        if(confirm("Hapus produk ini?")) {
            await deleteDoc(doc(db, "products", id)); 
            fetchData();
        }
    };

    const openVariants = async (prod) => {
        setCurrentProduct(prod);
        setModalVariantsOpen(true);
        setCurrentVariants([]); // Reset logic fetch here usually
        const q = query(collection(db, "product_variants"), where("product_id", "==", prod.id));
        const snap = await getDocs(q);
        const vars = [];
        snap.forEach(d => vars.push({id: d.id, ...d.data()}));
        setCurrentVariants(vars);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Product Models</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage base definitions.</p>
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all">
                    + New Product
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Base SKU</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Brand</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="5" className="text-center py-10">Loading...</td></tr> : products.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => openVariants(p)}>{p.base_sku}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                                <td className="px-6 py-4 text-slate-600">{p.brand_name}</td>
                                <td className="px-6 py-4 text-slate-500">{p.category}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => openModal(p)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Edit</button>
                                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 text-sm font-bold">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL ADD/EDIT PRODUCT */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                        <h3 className="text-xl font-bold mb-6">{formData.id ? 'Edit Product' : 'New Product'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Brand</label>
                                    <select required className="w-full border p-2 rounded" value={formData.brand_id} onChange={e=>setFormData({...formData, brand_id:e.target.value})}>
                                        <option value="">Select Brand</option>
                                        {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Base SKU</label>
                                    <input required className="w-full border p-2 rounded" value={formData.base_sku} onChange={e=>setFormData({...formData, base_sku:e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Product Name</label>
                                <input required className="w-full border p-2 rounded" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Category</label>
                                <select required className="w-full border p-2 rounded" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                                    <option value="">Select Category</option>
                                    {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL VARIANTS VIEW */}
            {modalVariantsOpen && currentProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">{currentProduct.name}</h3>
                                <p className="text-sm text-slate-500 font-mono">{currentProduct.base_sku}</p>
                            </div>
                            <button onClick={() => setModalVariantsOpen(false)} className="text-2xl">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 text-left">SKU</th>
                                        <th className="p-3 text-left">Color</th>
                                        <th className="p-3 text-left">Size</th>
                                        <th className="p-3 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentVariants.length === 0 ? <tr><td colSpan="4" className="text-center p-4">No variants found.</td></tr> : 
                                    currentVariants.sort(sortBySize).map(v => (
                                        <tr key={v.id} className="border-b">
                                            <td className="p-3 font-mono text-blue-600">{v.sku}</td>
                                            <td className="p-3">{v.color}</td>
                                            <td className="p-3">{v.size}</td>
                                            <td className="p-3 text-right font-bold">{formatRupiah(v.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}