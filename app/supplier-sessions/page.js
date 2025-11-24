"use client";
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { sortBySize } from '@/lib/utils';
import Sortable from 'sortablejs';
import { Portal } from '@/lib/usePortal';
import React from 'react'; // Import React explicit for Fragments

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
    
    // Mobile State
    const [expandedProductId, setExpandedProductId] = useState(null);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [currentModalProd, setCurrentModalProd] = useState(null);
    const [modalUpdates, setModalUpdates] = useState({});
    
    // Grouping State for Modal
    const [groupBy, setGroupBy] = useState('size'); // 'size' | 'color'

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

    const openModal = (prod) => { 
        setCurrentModalProd(prod); 
        setModalUpdates({}); 
        setGroupBy('size'); // Default sort by Size
        setModalOpen(true); 
    };

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

    const toggleAccordion = (id) => {
        setExpandedProductId(expandedProductId === id ? null : id);
    };

    // --- HELPER FOR GROUPING IN MODAL ---
    const getGroupedVariants = (variants) => {
        const groups = {};
        variants.forEach(v => {
            // Tentukan key berdasarkan mode grouping
            const key = groupBy === 'size' ? (v.size || 'Other') : (v.color || 'Other');
            if (!groups[key]) groups[key] = [];
            groups[key].push(v);
        });
        return groups;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 fade-in pb-20">
             {/* Header Solid & Sticky */}
             <div className="sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-lumina-base -mx-4 px-4 md:-mx-8 md:px-8 py-4 border-b border-lumina-border/50 shadow-md">
                <div>
                    <h2 className="text-xl md:text-3xl font-display font-bold text-lumina-text tracking-tight">Virtual Stock Map</h2>
                    <p className="text-sm text-lumina-muted mt-1 font-light hidden md:block">Drag & Drop cards to organize supplier products.</p>
                </div>
                <select className="input-luxury w-full md:w-64 font-medium" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {selectedSupplierId && (
                <>
                    {/* --- DESKTOP GRID VIEW --- */}
                    <div ref={gridRef} className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                    {/* --- MOBILE LIST VIEW (ACCORDION) --- */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {visibleProducts.map(p => {
                             const isExpanded = expandedProductId === p.id;
                             const wh = warehouses.find(w => w.type === 'virtual_supplier' && w.supplier_id === selectedSupplierId);

                             return (
                                 <div key={p.id} onClick={() => toggleAccordion(p.id)} className="card-luxury p-4 active:scale-[0.98] transition-transform">
                                    {/* Card Header */}
                                    <div className="flex gap-4 items-start">
                                        <div className="w-16 h-16 rounded-lg bg-lumina-base border border-lumina-border flex-shrink-0 overflow-hidden">
                                             {p.image_url ? (
                                                <img src={p.image_url} alt="Product" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lumina-muted"><span className="text-xs">IMG</span></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                 <span className="text-xs font-mono font-bold text-lumina-gold bg-lumina-base px-1.5 py-0.5 rounded border border-lumina-border">{p.base_sku}</span>
                                                 <span className={`text-sm font-bold font-mono ${p.totalStock === 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                    {p.totalStock} <span className="text-[10px] text-lumina-muted font-normal">qty</span>
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-white mt-1 truncate">{p.name}</h3>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-lumina-muted">{p.variants.length} Varian</span>
                                                <span className="badge-luxury badge-neutral text-[9px]">{p.category}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content (Mobile Input) */}
                                    {isExpanded && (
                                        <div className="mt-4 border-t border-lumina-border pt-3 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                            {p.variants.sort(sortBySize).map(v => {
                                                const qty = snapshots[`${v.id}_${wh?.id}`]?.qty || 0;
                                                return (
                                                    <div key={v.id} className="bg-lumina-base/50 rounded-lg p-3 border border-lumina-border/50 flex justify-between items-center">
                                                        <div>
                                                            <div className="text-xs font-mono text-lumina-gold">{v.sku}</div>
                                                            <div className="text-[10px] text-white">{v.color} / {v.size}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-lumina-muted">Real:</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-20 text-center bg-lumina-surface border border-lumina-border rounded py-1 font-bold text-white focus:border-lumina-gold outline-none" 
                                                                placeholder={qty}
                                                                onChange={(e) => setModalUpdates({...modalUpdates, [v.id]: e.target.value})} 
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            <button onClick={saveModal} className="btn-gold w-full py-2 text-xs mt-2">Simpan Perubahan Stok</button>
                                        </div>
                                    )}
                                 </div>
                             );
                        })}
                    </div>
                </>
            )}

            {/* Update Stock Modal (Centered Dark) - DESKTOP & MOBILE SHARED */}
            <Portal>
            {modalOpen && currentModalProd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
                    <div className="bg-lumina-surface border border-lumina-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col ring-1 ring-lumina-gold/20">
                        
                        {/* MODAL HEADER COMPACT - UPDATED */}
                        <div className="p-5 border-b border-lumina-border bg-lumina-surface rounded-t-2xl flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold text-white font-mono tracking-wide">{currentModalProd.base_sku}</h3>
                                <p className="text-sm text-lumina-muted truncate mt-1">{currentModalProd.name}</p>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Grouping Controls */}
                                <div className="flex items-center bg-lumina-base/50 rounded-lg border border-lumina-border/30 p-1">
                                    <span className="text-[10px] text-lumina-muted font-bold uppercase px-2 hidden sm:block">Group By:</span>
                                    <button 
                                        onClick={() => setGroupBy('size')} 
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy==='size' ? 'bg-lumina-gold text-black' : 'text-lumina-muted hover:text-white'}`}
                                    >
                                        Size
                                    </button>
                                    <button 
                                        onClick={() => setGroupBy('color')} 
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy==='color' ? 'bg-lumina-gold text-black' : 'text-lumina-muted hover:text-white'}`}
                                    >
                                        Color
                                    </button>
                                </div>

                                <button onClick={() => setModalOpen(false)} className="text-2xl text-lumina-muted hover:text-white transition-colors px-2">&times;</button>
                            </div>
                        </div>
                        
                        {/* MODAL BODY (GROUPED LIST) */}
                        <div className="flex-1 overflow-y-auto p-0 bg-lumina-base custom-scrollbar">
                            <table className="table-dark w-full">
                                <thead className="sticky top-0 z-10 bg-lumina-surface shadow-md border-b border-lumina-border">
                                    <tr>
                                        <th className="pl-6 py-3 text-left text-xs font-bold text-lumina-muted uppercase">Varian</th>
                                        <th className="text-center py-3 text-xs font-bold text-lumina-muted uppercase">System</th>
                                        <th className="text-center w-32 bg-lumina-highlight/10 py-3 text-xs font-bold text-lumina-gold uppercase">Real</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-lumina-border/30">
                                    {(() => {
                                        const groups = getGroupedVariants(currentModalProd.variants);
                                        
                                        // Sort Keys: Jika Size, urutkan XS->S->M dst. Jika Color, Alphabetical.
                                        const sortedKeys = Object.keys(groups).sort((a,b) => {
                                             if(groupBy === 'size') {
                                                 const sizes = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL','ALL','STD'];
                                                 const iA = sizes.indexOf(a.toUpperCase());
                                                 const iB = sizes.indexOf(b.toUpperCase());
                                                 // Jika dua-duanya size standar, urutkan index
                                                 if(iA !== -1 && iB !== -1) return iA - iB;
                                                 // Jika salah satu tidak ada di list, taruh di akhir
                                                 if(iA !== -1) return -1;
                                                 if(iB !== -1) return 1;
                                             }
                                             return a.localeCompare(b);
                                        });

                                        return sortedKeys.map(key => (
                                            <React.Fragment key={key}>
                                                {/* GROUP HEADER ROW */}
                                                <tr className="bg-lumina-surface/50">
                                                    <td colSpan="3" className="px-6 py-2 text-[10px] font-extrabold text-lumina-gold uppercase tracking-widest border-y border-lumina-border/50">
                                                        {groupBy === 'size' ? `Size: ${key}` : `Color: ${key}`}
                                                    </td>
                                                </tr>

                                                {/* VARIANT ROWS IN GROUP */}
                                                {groups[key]
                                                    .sort((a,b) => groupBy === 'size' 
                                                        ? a.color.localeCompare(b.color) // Kalau group by Size, sort item by Color
                                                        : sortBySize(a, b) // Kalau group by Color, sort item by Size
                                                    )
                                                    .map(v => {
                                                        const whId = warehouses.find(w => w.supplier_id === selectedSupplierId)?.id;
                                                        const qty = snapshots[`${v.id}_${whId}`]?.qty || 0;
                                                        const isUpdated = modalUpdates[v.id] !== undefined && modalUpdates[v.id] !== "";
                                                        
                                                        return (
                                                            <tr key={v.id} className={`transition-colors ${isUpdated ? 'bg-lumina-gold/5' : 'hover:bg-lumina-highlight/10'}`}>
                                                                <td className="pl-6 py-3 font-medium text-lumina-text">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-white">
                                                                            {groupBy === 'size' ? v.color : v.size} 
                                                                            <span className="text-lumina-muted font-normal ml-1">/ {groupBy === 'size' ? v.size : v.color}</span>
                                                                        </span>
                                                                        <span className="text-[10px] font-mono text-lumina-muted mt-0.5">{v.sku}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="text-center font-mono text-sm text-lumina-muted">{qty}</td>
                                                                <td className="bg-lumina-highlight/10 p-2 text-center align-middle">
                                                                    <input 
                                                                        type="number" 
                                                                        className={`w-full text-center bg-lumina-base border rounded-lg py-2 font-bold text-lg focus:ring-2 outline-none transition-all ${
                                                                            isUpdated 
                                                                            ? 'border-lumina-gold text-lumina-gold ring-lumina-gold/30' 
                                                                            : 'border-lumina-border text-white ring-transparent focus:border-lumina-gold'
                                                                        }`} 
                                                                        placeholder={qty}
                                                                        value={modalUpdates[v.id] || ''}
                                                                        onChange={(e) => setModalUpdates({...modalUpdates, [v.id]: e.target.value})} 
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )
                                                })}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-6 border-t border-lumina-border bg-lumina-surface rounded-b-2xl flex justify-end">
                            <button onClick={saveModal} className="btn-gold w-full md:w-auto shadow-gold-glow">Save Updates</button>
                        </div>
                    </div>
                </div>
            )}
            </Portal>
        </div>
    );
}