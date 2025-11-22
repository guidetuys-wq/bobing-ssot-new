// app/inventory/page.js
"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, writeBatch, query, orderBy, where, serverTimestamp, limit } from 'firebase/firestore';
import { sortBySize } from '@/lib/utils';

export default function InventoryPage() {
    // State Data
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    const [loading, setLoading] = useState(true);
    
    // State UI
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState('sku');
    const [modalDetailOpen, setModalDetailOpen] = useState(false);
    const [modalAdjOpen, setModalAdjOpen] = useState(false);
    const [modalCardOpen, setModalCardOpen] = useState(false);
    
    // State Selected Item
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [adjData, setAdjData] = useState({}); // { variantId, warehouseId, currentQty, realQty, note }
    const [cardData, setCardData] = useState([]); // Riwayat kartu stok
    const [modalGroup, setModalGroup] = useState('color');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [snapWh, snapProd, snapVar, snapShot] = await Promise.all([
                getDocs(query(collection(db, "warehouses"), orderBy("created_at", "asc"))),
                getDocs(collection(db, "products")),
                getDocs(query(collection(db, "product_variants"), orderBy("sku", "asc"))),
                getDocs(collection(db, "stock_snapshots"))
            ]);

            const whList = []; snapWh.forEach(d => whList.push({id: d.id, ...d.data()}));
            setWarehouses(whList);

            const shots = {}; snapShot.forEach(d => shots[d.id] = d.data().qty || 0);
            setSnapshots(shots);

            const vars = []; snapVar.forEach(d => vars.push({id: d.id, ...d.data()}));
            
            // Grouping Logic
            const prodMap = {};
            snapProd.forEach(d => {
                const p = d.data();
                prodMap[d.id] = { id: d.id, ...p, variants: [], totalStock: 0 };
            });

            vars.forEach(v => {
                if (prodMap[v.product_id]) {
                    let total = 0;
                    whList.forEach(w => total += (shots[`${v.id}_${w.id}`] || 0));
                    prodMap[v.product_id].variants.push(v);
                    prodMap[v.product_id].totalStock += total;
                }
            });

            setProducts(Object.values(prodMap));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // --- Logic Modal Detail ---
    const openDetail = (prod) => {
        setSelectedProduct(prod);
        setModalDetailOpen(true);
    };

    // --- Logic Stock Opname ---
    const openOpname = (v, prodName) => {
        setAdjData({ 
            variantId: v.id, 
            sku: v.sku, 
            productName: prodName, 
            warehouseId: warehouses[0]?.id, 
            currentQty: snapshots[`${v.id}_${warehouses[0]?.id}`] || 0,
            realQty: '',
            note: ''
        });
        setModalAdjOpen(true);
    };

    const handleAdjWarehouseChange = (e) => {
        const whId = e.target.value;
        setAdjData(prev => ({
            ...prev,
            warehouseId: whId,
            currentQty: snapshots[`${prev.variantId}_${whId}`] || 0
        }));
    };

    const submitOpname = async (e) => {
        e.preventDefault();
        const { variantId, warehouseId, currentQty, realQty, note } = adjData;
        const diff = parseInt(realQty) - currentQty;
        if (isNaN(diff) || diff === 0) { alert("Tidak ada perubahan."); return; }

        try {
            await runTransaction(db, async (t) => {
                const mRef = doc(collection(db, "stock_movements"));
                t.set(mRef, { 
                    variant_id: variantId, warehouse_id: warehouseId, type: 'adjustment', 
                    qty: diff, ref_id: mRef.id, ref_type: 'opname', date: serverTimestamp(), 
                    notes: note, created_by: auth.currentUser?.email 
                });
                
                const sRef = doc(db, "stock_snapshots", `${variantId}_${warehouseId}`);
                const sDoc = await t.get(sRef);
                if(sDoc.exists()) t.update(sRef, { qty: parseInt(realQty) });
                else t.set(sRef, { id: sRef.id, variant_id: variantId, warehouse_id: warehouseId, qty: parseInt(realQty) });
            });
            
            alert("Berhasil!");
            setModalAdjOpen(false);
            setSnapshots(prev => ({ ...prev, [`${variantId}_${warehouseId}`]: parseInt(realQty) }));
            fetchData(); // Refresh data global
        } catch (e) { alert(e.message); }
    };

    // --- Logic Kartu Stok ---
    const openCard = async (vId, sku) => {
        setModalCardOpen(true);
        setCardData(null); // Loading state
        try {
            const q = query(collection(db, "stock_movements"), where("variant_id", "==", vId), orderBy("date", "desc"), limit(20));
            const snap = await getDocs(q);
            const history = snap.docs.map(d => ({id: d.id, ...d.data()}));
            setCardData(history);
        } catch (e) { console.error(e); setCardData([]); }
    };

    // --- Rendering Helpers ---
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.base_sku && p.base_sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
        if (sortMode === 'sku') return (a.base_sku || '').localeCompare(b.base_sku || '');
        if (sortMode === 'stock_high') return b.totalStock - a.totalStock;
        return 0;
    });

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Inventory Control</h2>
                    <p className="text-sm text-slate-500">Monitoring stok fisik & virtual.</p>
                </div>
                <div className="flex gap-3">
                    <select className="border rounded-lg px-3 text-sm" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                        <option value="sku">Sort: SKU</option>
                        <option value="stock_high">Stok Terbanyak</option>
                    </select>
                    <input type="text" placeholder="Cari Produk..." className="border rounded-lg px-3 py-2 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => openDetail(p)} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-indigo-700 font-mono">{p.base_sku || 'NO-SKU'}</h3>
                            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded uppercase">{p.category}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 line-clamp-2 h-10 mb-4">{p.name}</p>
                        <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                            <div><p className="text-[10px] text-slate-400 uppercase">Varian</p><p className="font-bold text-slate-700 text-sm">{p.variants.length} SKU</p></div>
                            <div className="text-right"><p className="text-[10px] text-slate-400 uppercase">Total Stok</p><p className={`text-xl font-extrabold ${p.totalStock > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{p.totalStock}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* DETAIL MODAL */}
            {modalDetailOpen && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-indigo-700 font-mono">{selectedProduct.base_sku}</h3>
                                <p className="text-sm text-slate-500">{selectedProduct.name}</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="bg-slate-100 p-1 rounded-lg flex">
                                    <button onClick={() => setModalGroup('color')} className={`px-3 py-1 text-xs font-bold rounded ${modalGroup==='color' ? 'bg-white shadow' : ''}`}>Color</button>
                                    <button onClick={() => setModalGroup('size')} className={`px-3 py-1 text-xs font-bold rounded ${modalGroup==='size' ? 'bg-white shadow' : ''}`}>Size</button>
                                </div>
                                <button onClick={() => setModalDetailOpen(false)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Variant</th>
                                        {warehouses.map(w => <th key={w.id} className={`px-4 py-3 text-center text-xs font-bold uppercase ${w.type==='virtual_supplier'?'text-purple-700 bg-purple-50/50':'text-slate-600'}`}>{w.name}</th>)}
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {selectedProduct.variants.sort(sortBySize).map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-sm font-medium text-slate-700">
                                                {modalGroup === 'color' ? v.size : v.color} 
                                                <span className="ml-2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">{v.sku}</span>
                                            </td>
                                            {warehouses.map(w => {
                                                const qty = snapshots[`${v.id}_${w.id}`] || 0;
                                                return <td key={w.id} className={`px-4 py-3 text-center font-bold ${qty>0 ? 'text-slate-800' : 'text-slate-200'}`}>{qty}</td>
                                            })}
                                            <td className="px-6 py-3 text-center flex justify-center gap-2">
                                                <button onClick={() => openOpname(v, selectedProduct.name)} className="px-2 py-1 border rounded text-[10px] font-bold hover:bg-slate-50">Opname</button>
                                                <button onClick={() => openCard(v.id, v.sku)} className="px-2 py-1 border rounded text-[10px] font-bold hover:bg-slate-50">Kartu</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* OPNAME MODAL */}
            {modalAdjOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-xl font-bold mb-4">Stock Opname</h3>
                        <div className="bg-slate-50 p-3 rounded border mb-4">
                            <p className="font-mono font-bold text-indigo-700">{adjData.sku}</p>
                            <p className="text-xs text-slate-500">{adjData.productName}</p>
                        </div>
                        <form onSubmit={submitOpname} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gudang</label>
                                <select className="w-full border rounded p-2" value={adjData.warehouseId} onChange={handleAdjWarehouseChange}>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sistem</label>
                                    <input disabled className="w-full bg-slate-100 border-transparent rounded p-2 text-center font-bold" value={adjData.currentQty} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">Fisik (Real)</label>
                                    <input type="number" required className="w-full border-indigo-500 border-2 rounded p-2 text-center font-bold" value={adjData.realQty} onChange={e => setAdjData({...adjData, realQty: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan</label>
                                <textarea required className="w-full border rounded p-2" rows="2" value={adjData.note} onChange={e => setAdjData({...adjData, note: e.target.value})}></textarea>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalAdjOpen(false)} className="px-4 py-2 rounded text-slate-600 font-bold">Batal</button>
                                <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CARD MODAL */}
            {modalCardOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Kartu Stok</h3>
                            <button onClick={() => setModalCardOpen(false)} className="text-2xl">&times;</button>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto border rounded">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Tanggal</th>
                                        <th className="p-2 text-left">Tipe</th>
                                        <th className="p-2 text-left">Gudang</th>
                                        <th className="p-2 text-right">Qty</th>
                                        <th className="p-2 text-left">Ket</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!cardData ? <tr><td colSpan="5" className="text-center p-4">Loading...</td></tr> : cardData.length === 0 ? <tr><td colSpan="5" className="text-center p-4">Belum ada mutasi.</td></tr> : cardData.map(m => (
                                        <tr key={m.id} className="border-b">
                                            <td className="p-2">{new Date(m.date.toDate()).toLocaleDateString()}</td>
                                            <td className="p-2"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold">{m.type}</span></td>
                                            <td className="p-2">{warehouses.find(w => w.id === m.warehouse_id)?.name}</td>
                                            <td className={`p-2 text-right font-mono font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                                            <td className="p-2 text-xs text-slate-500 truncate max-w-[150px]">{m.notes}</td>
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