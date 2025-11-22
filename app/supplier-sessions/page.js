// app/supplier-sessions/page.js
"use client";
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { sortBySize } from '@/lib/utils';
import Sortable from 'sortablejs';

export default function VirtualStockPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [visibleProducts, setVisibleProducts] = useState([]);
    
    const gridRef = useRef(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentModalProd, setCurrentModalProd] = useState(null);
    const [modalUpdates, setModalUpdates] = useState({}); // { variantId: realQty }

    useEffect(() => { fetchData(); }, []);

    // Initialize SortableJS
    useEffect(() => {
        if (gridRef.current && visibleProducts.length > 0) {
            new Sortable(gridRef.current, { animation: 150, ghostClass: 'bg-indigo-50' });
        }
    }, [visibleProducts]);

    const fetchData = async () => {
        try {
            const [sSupp, sWh, sProd, sVar, sSnap] = await Promise.all([
                getDocs(query(collection(db, "suppliers"), orderBy("name"))),
                getDocs(collection(db, "warehouses")),
                getDocs(collection(db, "products")),
                getDocs(query(collection(db, "product_variants"), orderBy("sku"))),
                getDocs(collection(db, "stock_snapshots"))
            ]);

            const supps = []; sSupp.forEach(d => supps.push({id: d.id, ...d.data()}));
            setSuppliers(supps);
            
            const whs = []; sWh.forEach(d => whs.push({id: d.id, ...d.data()}));
            setWarehouses(whs);

            const prods = []; sProd.forEach(d => prods.push({id: d.id, ...d.data()}));
            setProducts(prods);

            const vars = []; sVar.forEach(d => vars.push({id: d.id, ...d.data()}));
            setVariants(vars);

            const snaps = {}; sSnap.forEach(d => snaps[d.id] = d.data());
            setSnapshots(snaps);

        } catch (e) { console.error(e); }
    };

    const handleSupplierChange = (e) => {
        const suppId = e.target.value;
        setSelectedSupplierId(suppId);
        if (!suppId) { setVisibleProducts([]); return; }

        const wh = warehouses.find(w => w.type === 'virtual_supplier' && w.supplier_id === suppId);
        if (!wh) { alert("Supplier ini belum punya Gudang Virtual."); return; }

        // Filter products related to this supplier logic (simplified: show all for now or filter by brand if needed)
        // Logic asli: show all variants then group.
        const grouped = {};
        variants.forEach(v => {
            if (!grouped[v.product_id]) {
                const p = products.find(x => x.id === v.product_id);
                if(p) grouped[v.product_id] = { ...p, variants: [], totalStock: 0 };
            }
            if(grouped[v.product_id]) {
                grouped[v.product_id].variants.push(v);
                grouped[v.product_id].totalStock += (snapshots[`${v.id}_${wh.id}`]?.qty || 0);
            }
        });
        
        setVisibleProducts(Object.values(grouped).sort((a,b) => (a.base_sku||'').localeCompare(b.base_sku||'')));
    };

    const openModal = (prod) => {
        setCurrentModalProd(prod);
        setModalUpdates({});
        setModalOpen(true);
    };

    const saveModal = async () => {
        const wh = warehouses.find(w => w.type === 'virtual_supplier' && w.supplier_id === selectedSupplierId);
        const updates = [];
        
        Object.keys(modalUpdates).forEach(vid => {
            const real = parseInt(modalUpdates[vid]);
            const current = snapshots[`${vid}_${wh.id}`]?.qty || 0;
            if (!isNaN(real) && real !== current) {
                updates.push({ variantId: vid, real, diff: real - current });
            }
        });

        if(updates.length === 0) { setModalOpen(false); return; }

        try {
            await runTransaction(db, async (t) => {
                const sessRef = doc(collection(db, "supplier_stock_sessions"));
                t.set(sessRef, {
                    supplier_id: selectedSupplierId, warehouse_id: wh.id,
                    date: serverTimestamp(), created_by: auth.currentUser?.email, type: 'overwrite'
                });

                for(const up of updates) {
                    const k = `${up.variantId}_${wh.id}`;
                    const snapRef = doc(db, "stock_snapshots", k);
                    const sDoc = await t.get(snapRef);
                    
                    t.set(doc(collection(db, "stock_movements")), {
                        variant_id: up.variantId, warehouse_id: wh.id,
                        type: 'supplier_sync', qty: up.diff, ref_id: sessRef.id,
                        ref_type: 'supplier_session', date: serverTimestamp()
                    });

                    if(sDoc.exists()) t.update(snapRef, { qty: up.real, updated_at: serverTimestamp() });
                    else t.set(snapRef, { id: k, variant_id: up.variantId, warehouse_id: wh.id, qty: up.real, updated_at: serverTimestamp() });
                }
            });
            alert("Stok terupdate!");
            setModalOpen(false); fetchData(); // Refresh UI
        } catch(e) { alert(e.message); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Virtual Stock Map</h2>
                    <p className="text-sm text-slate-500">Drag & Drop kartu untuk menyusun urutan rak supplier.</p>
                </div>
                <select className="bg-indigo-50 border-indigo-100 text-indigo-900 font-bold rounded-lg py-2 px-4" value={selectedSupplierId} onChange={handleSupplierChange}>
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {selectedSupplierId && (
                <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visibleProducts.map(p => (
                        <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md" onClick={() => openModal(p)}>
                            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-1 rounded uppercase">{p.base_sku}</span>
                            <h3 className="text-sm font-bold text-slate-800 mt-2 mb-4 line-clamp-2 h-10">{p.name}</h3>
                            <div className="flex justify-between items-end border-t pt-3">
                                <span className="text-xs text-slate-500 font-bold">{p.variants.length} Items</span>
                                <span className="text-lg font-extrabold text-emerald-600">{p.totalStock}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && currentModalProd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentModalProd.name}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-2xl">&times;</button>
                        </div>
                        <div className="overflow-auto p-0">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 text-left">Varian</th>
                                        <th className="p-3 text-center">Sistem</th>
                                        <th className="p-3 text-center w-32 bg-indigo-50">Real</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentModalProd.variants.sort(sortBySize).map(v => {
                                        const whId = warehouses.find(w => w.supplier_id === selectedSupplierId)?.id;
                                        const qty = snapshots[`${v.id}_${whId}`]?.qty || 0;
                                        return (
                                            <tr key={v.id} className="border-b">
                                                <td className="p-3 font-bold">{v.color} / {v.size} <span className="text-xs font-mono text-slate-400 ml-2">{v.sku}</span></td>
                                                <td className="p-3 text-center">{qty}</td>
                                                <td className="p-3 bg-indigo-50/30">
                                                    <input type="number" className="w-full text-center border rounded p-1 font-bold text-indigo-700" placeholder={qty}
                                                        onChange={(e) => setModalUpdates({...modalUpdates, [v.id]: e.target.value})} />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end">
                            <button onClick={saveModal} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700">Simpan Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}