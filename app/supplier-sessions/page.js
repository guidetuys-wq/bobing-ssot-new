"use client";
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { sortBySize } from '@/lib/utils';
import Sortable from 'sortablejs';
import { Portal } from '@/lib/usePortal';

// Cache Configuration
const CACHE_KEY = 'lumina_virtual_stock_master';
const CACHE_DURATION = 5 * 60 * 1000; 

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
    const [modalUpdates, setModalUpdates] = useState({});

    useEffect(() => { fetchData(); }, []);

    // Set default supplier
    useEffect(() => {
        if (suppliers.length > 0 && !selectedSupplierId) {
            const masTohir = suppliers.find(s => s.name === 'Mas Tohir');
            if (masTohir) {
                setSelectedSupplierId(masTohir.id);
            }
        }
    }, [suppliers]);

    // Trigger load products when supplier selected
    useEffect(() => {
        if(selectedSupplierId) {
            handleSupplierChange(selectedSupplierId);
        }
    }, [selectedSupplierId]);

    useEffect(() => {
        if (gridRef.current && visibleProducts.length > 0) {
            new Sortable(gridRef.current, { animation: 150, ghostClass: 'opacity-50' });
        }
    }, [visibleProducts]);

    const fetchData = async () => {
        try {
            // 1. Cek Cache
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const { suppliers, warehouses, products, variants, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setSuppliers(suppliers);
                    setWarehouses(warehouses);
                    setProducts(products);
                    setVariants(variants);
                    // Snapshots tetap fetch fresh
                    const sSnap = await getDocs(collection(db, "stock_snapshots"));
                    const snaps = {}; 
                    sSnap.forEach(d => snaps[d.id] = d.data());
                    setSnapshots(snaps);
                    return;
                }
            }

            // 2. Fetch Fresh
            const [sSupp, sWh, sProd, sVar, sSnap] = await Promise.all([
                getDocs(query(collection(db, "suppliers"), orderBy("name"))),
                getDocs(collection(db, "warehouses")),
                getDocs(query(collection(db, "products"), limit(100))), // Limit products
                getDocs(query(collection(db, "product_variants"), orderBy("sku"))),
                getDocs(collection(db, "stock_snapshots"))
            ]);

            const supps = []; sSupp.forEach(d => supps.push({id: d.id, ...d.data()}));
            const whs = []; sWh.forEach(d => whs.push({id: d.id, ...d.data()}));
            const prods = []; sProd.forEach(d => prods.push({id: d.id, ...d.data()}));
            const vars = []; sVar.forEach(d => vars.push({id: d.id, ...d.data()}));
            const snaps = {}; sSnap.forEach(d => snaps[d.id] = d.data());

            setSuppliers(supps);
            setWarehouses(whs);
            setProducts(prods);
            setVariants(vars);
            setSnapshots(snaps);

            // 3. Save Cache (Exclude snapshots because they change frequently)
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                suppliers: supps,
                warehouses: whs,
                products: prods,
                variants: vars,
                timestamp: Date.now()
            }));

        } catch (e) { console.error(e); }
    };

    const handleSupplierChange = (suppId) => {
        if (!suppId) { setVisibleProducts([]); return; }
        const wh = warehouses.find(w => w.type === 'virtual_supplier' && w.supplier_id === suppId);
        
        if (!wh) { 
            // Don't alert immediately on auto-select to avoid spam
            // alert("Supplier ini belum punya Gudang Virtual."); 
            setVisibleProducts([]);
            return; 
        }

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

    const openModal = (prod) => { setCurrentModalProd(prod); setModalUpdates({}); setModalOpen(true); };

    const saveModal = async () => {
        const wh = warehouses.find(w => w.type === 'virtual_supplier' && w.supplier_id === selectedSupplierId);
        const updates = [];
        Object.keys(modalUpdates).forEach(vid => {
            const real = parseInt(modalUpdates[vid]);
            const current = snapshots[`${vid}_${wh.id}`]?.qty || 0;
            if (!isNaN(real) && real !== current) updates.push({ variantId: vid, real, diff: real - current });
        });
        if(updates.length === 0) { setModalOpen(false); return; }

        try {
            await runTransaction(db, async (t) => {
                const sessRef = doc(collection(db, "supplier_stock_sessions"));
                t.set(sessRef, { supplier_id: selectedSupplierId, warehouse_id: wh.id, date: serverTimestamp(), created_by: user?.email, type: 'overwrite' });
                for(const up of updates) {
                    const k = `${up.variantId}_${wh.id}`;
                    const snapRef = doc(db, "stock_snapshots", k);
                    const sDoc = await t.get(snapRef);
                    t.set(doc(collection(db, "stock_movements")), { variant_id: up.variantId, warehouse_id: wh.id, type: 'supplier_sync', qty: up.diff, ref_id: sessRef.id, ref_type: 'supplier_session', date: serverTimestamp() });
                    if(sDoc.exists()) t.update(snapRef, { qty: up.real, updated_at: serverTimestamp() }); else t.set(snapRef, { id: k, variant_id: up.variantId, warehouse_id: wh.id, qty: up.real, updated_at: serverTimestamp() });
                }
            });
            alert("Stok terupdate!"); 
            setModalOpen(false); 
            // Invalidate cache stock
            sessionStorage.removeItem('lumina_inventory_data'); 
            fetchData(); // Refresh snapshots
        } catch(e) { alert(e.message); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-lumina-text tracking-tight">Virtual Stock Map</h2>
                    <p className="text-sm text-lumina-muted mt-1 font-light">Drag & Drop cards to organize supplier products.</p>
                </div>
                <select className="input-luxury w-full sm:w-64 font-medium" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {selectedSupplierId && (
                <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visibleProducts.map(p => (
                        <div key={p.id} className="card-luxury p-5 cursor-grab active:cursor-grabbing hover:border-lumina-gold/50 transition-all relative group" onClick={() => openModal(p)}>
                            <span className="text-[10px] font-bold bg-lumina-base text-lumina-gold px-2 py-1 rounded uppercase tracking-wide border border-lumina-border">{p.base_sku}</span>
                            <h3 className="text-sm font-bold text-lumina-text mt-3 mb-4 line-clamp-2 leading-relaxed group-hover:text-lumina-gold transition-colors">{p.name}</h3>
                            <div className="flex justify-between items-end border-t border-lumina-border pt-3">
                                <span className="text-xs text-lumina-muted">{p.variants.length} Items</span>
                                <span className={`text-lg font-bold ${p.totalStock > 0 ? 'text-emerald-400' : 'text-lumina-border'}`}>{p.totalStock}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Update Stock Modal (Centered Dark) */}
            <Portal>
            {modalOpen && currentModalProd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
                    <div className="bg-lumina-surface border border-lumina-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col ring-1 ring-lumina-gold/20">
                        <div className="p-6 border-b border-lumina-border flex justify-between items-center bg-lumina-surface rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-white">{currentModalProd.name}</h3>
                                <p className="text-xs text-lumina-muted font-mono mt-1">{currentModalProd.base_sku}</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-2xl text-lumina-muted hover:text-white transition-colors">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-0 bg-lumina-base custom-scrollbar">
                            <table className="table-dark">
                                <thead className="sticky top-0 z-10 bg-lumina-surface shadow-md border-b border-lumina-border">
                                    <tr>
                                        <th className="pl-6">Varian</th>
                                        <th className="text-center">System</th>
                                        <th className="text-center w-32 bg-lumina-highlight/30">Real</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentModalProd.variants.sort(sortBySize).map(v => {
                                        const whId = warehouses.find(w => w.supplier_id === selectedSupplierId)?.id;
                                        const qty = snapshots[`${v.id}_${whId}`]?.qty || 0;
                                        return (
                                            <tr key={v.id} className="hover:bg-lumina-highlight/20 transition-colors">
                                                <td className="pl-6 font-medium text-lumina-text">
                                                    {v.color} / {v.size} <span className="text-xs font-mono text-lumina-muted ml-2">{v.sku}</span>
                                                </td>
                                                <td className="text-center font-mono text-lumina-muted">{qty}</td>
                                                <td className="bg-lumina-highlight/20 p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        className="w-24 text-center bg-lumina-base border border-lumina-border rounded-lg py-1.5 font-bold text-lumina-gold focus:ring-1 focus:ring-lumina-gold outline-none" 
                                                        placeholder={qty}
                                                        onChange={(e) => setModalUpdates({...modalUpdates, [v.id]: e.target.value})} 
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-6 border-t border-lumina-border bg-lumina-surface rounded-b-2xl flex justify-end">
                            <button onClick={saveModal} className="btn-gold">Save Updates</button>
                        </div>
                    </div>
                </div>
            )}
            </Portal>
        </div>
    );
}