// app/variants/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { sortBySize, formatRupiah } from '@/lib/utils';

export default function VariantsPage() {
    const [variants, setVariants] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    
    // State untuk Base SKU display di modal
    const [selectedBaseSku, setSelectedBaseSku] = useState('-');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [snapProd, snapVar] = await Promise.all([
                getDocs(query(collection(db, "products"), orderBy("name", "asc"))),
                getDocs(query(collection(db, "product_variants"), orderBy("sku", "asc")))
            ]);

            const prodsData = []; 
            snapProd.forEach(d => prodsData.push({id: d.id, ...d.data()}));
            setProducts(prodsData);

            const varsData = [];
            snapVar.forEach(d => varsData.push({id: d.id, ...d.data()}));
            setVariants(varsData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleParentChange = (e) => {
        const pid = e.target.value;
        const prod = products.find(p => p.id === pid);
        setFormData({ ...formData, product_id: pid });
        setSelectedBaseSku(prod ? (prod.base_sku || 'No SKU') : '-');
    };

    const generateSku = () => {
        if (selectedBaseSku === '-' || !formData.color || !formData.size) {
            alert("Pilih Produk Induk, Warna, dan Ukuran dulu!");
            return;
        }
        const colorClean = formData.color.trim().toUpperCase().replace(/\s+/g, '-');
        const sizeClean = formData.size.trim().toUpperCase().replace(/\s+/g, '-');
        const newSku = `${selectedBaseSku}-${colorClean}-${sizeClean}`;
        setFormData({ ...formData, sku: newSku, barcode: formData.barcode || newSku });
    };

    const openModal = (v = null) => {
        if (v) {
            const prod = products.find(p => p.id === v.product_id);
            setFormData({ ...v });
            setSelectedBaseSku(prod ? prod.base_sku : '-');
        } else {
            setFormData({ 
                product_id: '', sku: '', barcode: '', color: '', size: '', 
                weight: 0, cost: 0, price: 0, min_stock: 5, status: 'active' 
            });
            setSelectedBaseSku('-');
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                product_id: formData.product_id,
                sku: formData.sku.toUpperCase(),
                barcode: formData.barcode ? formData.barcode.toUpperCase() : formData.sku.toUpperCase(),
                color: formData.color.toUpperCase(),
                size: formData.size.toUpperCase(),
                weight: Number(formData.weight) || 0,
                cost: Number(formData.cost) || 0,
                price: Number(formData.price) || 0,
                min_stock: Number(formData.min_stock) || 5,
                status: formData.status,
                updated_at: serverTimestamp()
            };

            if (formData.id) {
                await updateDoc(doc(db, "product_variants", formData.id), payload);
            } else {
                payload.created_at = serverTimestamp();
                await addDoc(collection(db, "product_variants"), payload);
            }
            setModalOpen(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const deleteVariant = async (id) => {
        if(confirm("Hapus SKU ini?")) {
            await deleteDoc(doc(db, "product_variants", id));
            fetchData();
        }
    };

    // Filtering Logic
    const filteredVariants = variants.filter(v => {
        const pName = products.find(p => p.id === v.product_id)?.name.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return v.sku.toLowerCase().includes(term) || pName.includes(term) || (v.barcode && v.barcode.toLowerCase().includes(term));
    }).sort(sortBySize);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Master SKU</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage variants, prices & barcodes.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search SKU / Name..." 
                        className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all whitespace-nowrap">
                        + Add SKU
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">SKU Final</th>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Parent Product</th>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Variant</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase">HPP</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase">Price</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {loading ? <tr><td colSpan="7" className="text-center py-10">Loading...</td></tr> : filteredVariants.map(v => {
                                const parent = products.find(p => p.id === v.product_id);
                                return (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{v.sku}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{parent ? parent.name : <span className="text-red-400">Deleted Parent</span>}</td>
                                        <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded border">{v.color} / {v.size}</span></td>
                                        <td className="px-6 py-4 text-right text-slate-500">{formatRupiah(v.cost)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatRupiah(v.price)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openModal(v)} className="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                                            <button onClick={() => deleteVariant(v.id)} className="text-red-400 hover:text-red-600 font-bold">Del</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'Edit SKU' : 'New SKU'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <label className="block text-sm font-bold text-blue-800 mb-2">1. Select Parent Product</label>
                                <select required className="w-full border-blue-200 rounded-lg p-2.5 text-sm focus:ring-blue-500" value={formData.product_id} onChange={handleParentChange}>
                                    <option value="">-- Select Model --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.base_sku})</option>)}
                                </select>
                                <div className="text-xs text-blue-600 mt-2 font-mono">Base SKU: {selectedBaseSku}</div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Color</label>
                                    <input type="text" className="w-full border p-2 rounded" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Black" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Size</label>
                                    <input type="text" className="w-full border p-2 rounded" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} placeholder="XL" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Weight (gr)</label>
                                    <input type="number" className="w-full border p-2 rounded" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Final SKU</label>
                                    <div className="flex gap-2">
                                        <input required className="w-full border p-2 rounded font-mono uppercase bg-slate-50" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                                        <button type="button" onClick={generateSku} className="bg-slate-200 px-3 rounded text-xs font-bold hover:bg-slate-300">Auto</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Barcode</label>
                                    <input className="w-full border p-2 rounded font-mono" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Scan..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-bold mb-1">HPP (Cost)</label>
                                    <input type="number" required className="w-full border p-2 rounded" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-blue-600">Sell Price</label>
                                    <input type="number" required className="w-full border p-2 rounded font-bold" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Status</label>
                                    <select className="w-full border p-2 rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-lg">Save SKU</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}