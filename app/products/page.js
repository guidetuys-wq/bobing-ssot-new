// app/products/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
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
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchData(); }, []);

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

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.base_sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (prod = null) => {
        setFormData(prod ? { ...prod } : { brand_id: '', name: '', base_sku: '', category: '', description: '', status: 'active' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, updated_at: serverTimestamp() };
            if (formData.id) await updateDoc(doc(db, "products", formData.id), payload);
            else { payload.created_at = serverTimestamp(); await addDoc(collection(db, "products"), payload); }
            setModalOpen(false); fetchData();
        } catch (err) { alert(err.message); }
    };

    const deleteProduct = async (id) => {
        if(confirm("Hapus produk ini?")) { await deleteDoc(doc(db, "products", id)); fetchData(); }
    };

    const openVariants = async (prod) => {
        setCurrentProduct(prod);
        setModalVariantsOpen(true);
        setCurrentVariants([]); 
        const q = query(collection(db, "product_variants"), where("product_id", "==", prod.id));
        const snap = await getDocs(q);
        const vars = []; snap.forEach(d => vars.push({id: d.id, ...d.data()}));
        setCurrentVariants(vars);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 fade-in pb-20">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Products</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your product catalog and base models.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                    Add Product
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input 
                        type="text" 
                        placeholder="Search by name or SKU..." 
                        className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 bg-transparent border-none focus:ring-0 placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-6 w-px bg-gray-200"></div>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    Filters
                </button>
            </div>

            {/* Data Table */}
            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper border-0 rounded-none shadow-none">
                    <table className="table-modern">
                        <thead>
                            <tr>
                                <th className="w-10 pl-6">
                                    <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                </th>
                                <th>Product Info</th>
                                <th>Brand</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th className="text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-12 text-gray-400">Loading data...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-gray-400">No products found.</td></tr>
                            ) : (
                                filteredProducts.map(p => (
                                    <tr key={p.id} className="group">
                                        <td className="pl-6">
                                            <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{p.name}</span>
                                                <button onClick={() => openVariants(p)} className="text-xs font-mono text-brand-600 hover:underline text-left w-fit">
                                                    {p.base_sku}
                                                </button>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-neutral">{p.brand_name || '-'}</span></td>
                                        <td><span className="text-sm text-gray-600">{p.category}</span></td>
                                        <td>
                                            <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                                                {p.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="text-right pr-6">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal(p)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                                </button>
                                                <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Simple Pagination Placeholder */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs text-gray-500">Showing <span className="font-medium">{filteredProducts.length}</span> results</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>

            {/* Modal Product Form */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">{formData.id ? 'Edit Product' : 'New Product'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                                    <select required className="select-field" value={formData.brand_id} onChange={e=>setFormData({...formData, brand_id:e.target.value})}>
                                        <option value="">Select Brand</option>
                                        {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Base SKU</label>
                                    <input required className="input-field font-mono uppercase" value={formData.base_sku} onChange={e=>setFormData({...formData, base_sku:e.target.value})} placeholder="PRD-001" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                                <input required className="input-field" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} placeholder="e.g. Cotton T-Shirt" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                <select required className="select-field" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                                    <option value="">Select Category</option>
                                    {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Description</label>
                                <textarea 
                                    className="w-full border p-2 rounded" 
                                    rows="3"
                                    value={formData.description || ''} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                    placeholder="Product details..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Save Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Variants View */}
            {modalVariantsOpen && currentProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[85vh] flex flex-col fade-in-up">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">{currentProduct.name}</h3>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">{currentProduct.base_sku}</p>
                            </div>
                            <button onClick={() => setModalVariantsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-0">
                            <table className="table-modern">
                                <thead>
                                    <tr><th className="pl-6">Variant SKU</th><th>Color</th><th>Size</th><th className="text-right pr-6">Price</th></tr>
                                </thead>
                                <tbody>
                                    {currentVariants.length === 0 ? <tr><td colSpan="4" className="text-center py-12 text-gray-400 italic">No variants found.</td></tr> : 
                                    currentVariants.sort(sortBySize).map(v => (
                                        <tr key={v.id}>
                                            <td className="pl-6 font-mono text-brand-600 font-medium text-xs">{v.sku}</td>
                                            <td><span className="badge badge-neutral">{v.color}</span></td>
                                            <td><span className="badge badge-neutral">{v.size}</span></td>
                                            <td className="text-right pr-6 font-semibold text-gray-900 text-xs">{formatRupiah(v.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button onClick={() => setModalVariantsOpen(false)} className="btn-secondary text-xs">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}