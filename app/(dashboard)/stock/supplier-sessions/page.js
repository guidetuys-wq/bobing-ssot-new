"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { sortBySize, sizeRank } from '@/lib/utils';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

// --- MODERN UI IMPORTS ---
import { 
    Search, Filter, MapPin, ScanBarcode, Box, 
    ChevronDown, ChevronUp, Save, X, RotateCcw,
    Minus, Plus, Trash2, CheckCircle, Store 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Cache Configuration
const CACHE_KEY = 'lumina_virtual_stock_master';
const CACHE_DURATION = 5 * 60 * 1000; 

export default function VirtualStockPage() {
    // Data State
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    
    const [snapshots, setSnapshots] = useState({});
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);
    
    // UI State
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isRackMode, setIsRackMode] = useState(true);
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [currentModalProd, setCurrentModalProd] = useState(null);
    const [tempStock, setTempStock] = useState({}); 
    const [modalSortMode, setModalSortMode] = useState('size'); 

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Cek Cache
                const cached = localStorage.getItem(CACHE_KEY);
                let loaded = false;
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.ts < CACHE_DURATION) {
                        setWarehouses(parsed.warehouses);
                        setProducts(parsed.products);
                        setVariants(parsed.variants);
                        const defWh = parsed.warehouses.find(w => w.name.toLowerCase().includes('kuning')) || parsed.warehouses[0];
                        if (defWh && !selectedSupplierId) setSelectedSupplierId(defWh.id);
                        loaded = true;
                    }
                }

                if (!loaded) {
                    const [whSnap, prodSnap, varSnap] = await Promise.all([
                        getDocs(query(collection(db, "warehouses"), orderBy("created_at"))),
                        getDocs(collection(db, "products")),
                        getDocs(collection(db, "product_variants"))
                    ]);

                    const whList = [];
                    whSnap.forEach(d => whList.push({ id: d.id, ...d.data() }));
                    const prodList = []; prodSnap.forEach(d => prodList.push({id:d.id, ...d.data()}));
                    const varList = []; varSnap.forEach(d => varList.push({id:d.id, ...d.data()}));

                    setWarehouses(whList);
                    setProducts(prodList);
                    setVariants(varList);
                    
                    const defWh = whList.find(w => w.name.toLowerCase().includes('kuning')) || whList[0];
                    if (defWh && !selectedSupplierId) setSelectedSupplierId(defWh.id);

                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        suppliers: [], warehouses: whList, products: prodList, variants: varList, ts: Date.now()
                    }));
                }
            } catch(e) { console.error(e); } finally { setLoading(false); }
        };
        init();
    }, []);

    // --- 2. LOAD SNAPSHOTS ---
    useEffect(() => {
        if (!selectedSupplierId) return;
        const loadStock = async () => {
            setLoadingSnapshots(true);
            try {
                const q = query(collection(db, "stock_snapshots"), where("warehouse_id", "==", selectedSupplierId));
                const snap = await getDocs(q);
                const map = {};
                snap.forEach(d => { map[d.data().variant_id] = d.data().qty || 0; });
                setSnapshots(map);
            } catch(e) { console.error(e); } finally { setLoadingSnapshots(false); }
        };
        loadStock();
    }, [selectedSupplierId]);

    const handleUpdateRack = async (prodId, newRack) => {
        const cleanRack = newRack.toUpperCase().trim();
        setProducts(prev => prev.map(p => p.id === prodId ? { ...p, rack: cleanRack } : p));
        try {
            await updateDoc(doc(db, "products", prodId), { rack: cleanRack });
            toast.success(`Rak: ${cleanRack}`, { duration: 1500, icon: '📍' });
            // Update Cache Local
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                parsed.products = parsed.products.map(p => p.id === prodId ? { ...p, rack: cleanRack } : p);
                localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
            }
        } catch (e) { toast.error("Gagal simpan rak"); }
    };

    // --- OPEN MODAL ---
    const openScreening = (prod) => {
        const prodVars = variants.filter(v => v.product_id === prod.id);
        const initialTemp = {};
        prodVars.forEach(v => { initialTemp[v.id] = snapshots[v.id] || 0; });

        setCurrentModalProd({ ...prod, variants: prodVars });
        setTempStock(initialTemp);
        setModalSortMode('size'); 
        setModalOpen(true);
    };

    const updateTemp = (variantId, type) => {
        setTempStock(prev => {
            const current = prev[variantId] || 0;
            let newVal = current;
            if (type === 'zero') newVal = 0;
            else if (type === 'add_5') newVal += 5;
            else if (type === 'add_10') newVal += 10;
            else if (type === 'min_1') newVal = Math.max(0, current - 1);
            else if (type === 'plus_1') newVal += 1;
            return { ...prev, [variantId]: newVal };
        });
    };

    const saveModal = async () => {
        if (!selectedSupplierId || !currentModalProd) return;

        let hasChanges = false;
        const updates = [];

        currentModalProd.variants.forEach(v => {
            const oldQty = snapshots[v.id] || 0;
            const newQty = tempStock[v.id];
            if (oldQty !== newQty) {
                hasChanges = true;
                updates.push({ variantId: v.id, diff: newQty - oldQty, newQty });
            }
        });

        if (!hasChanges) { setModalOpen(false); return; }

        const tId = toast.loading("Menyimpan Stok...");
        try {
            await runTransaction(db, async (transaction) => {
                updates.forEach(u => {
                    const moveRef = doc(collection(db, "stock_movements"));
                    transaction.set(moveRef, {
                        variant_id: u.variantId, warehouse_id: selectedSupplierId,
                        type: 'virtual_adjustment', qty: u.diff, date: serverTimestamp(),
                        notes: 'Screening Gudang Supplier', created_by: 'app_user'
                    });
                    const snapRef = doc(db, "stock_snapshots", `${u.variantId}_${selectedSupplierId}`);
                    transaction.set(snapRef, {
                        id: `${u.variantId}_${selectedSupplierId}`, variant_id: u.variantId,
                        warehouse_id: selectedSupplierId, qty: u.newQty, updated_at: serverTimestamp()
                    }, { merge: true });
                });
            });

            setSnapshots(prev => {
                const next = { ...prev };
                updates.forEach(u => next[u.variantId] = u.newQty);
                return next;
            });

            setModalOpen(false);
            toast.success("Stok Terupdate!", { id: tId });
        } catch(e) {
            console.error(e);
            toast.error("Gagal menyimpan", { id: tId });
        }
    };

    const filteredProducts = products
        .filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.rack || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (isRackMode) {
                const rackA = a.rack || 'ZZZ'; 
                const rackB = b.rack || 'ZZZ';
                if (rackA < rackB) return -1;
                if (rackA > rackB) return 1;
            }
            return a.name.localeCompare(b.name);
        });

    // COMPONENT: QUICK CONTROL ROW (Optimized for Mobile Touch)
    const QuickControlRow = ({ v, qty, mode }) => (
        <div className="bg-white p-3 rounded-xl border border-border shadow-sm mb-3">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="text-sm font-bold text-text-primary">
                        {mode === 'size' ? v.color : v.size}
                    </div>
                    <div className="text-xs font-mono text-text-secondary bg-gray-100 px-1.5 rounded inline-block mt-1">
                        {v.sku}
                    </div>
                </div>
                <button 
                    onClick={() => updateTemp(v.id, 'zero')} 
                    className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg active:scale-95 transition-transform"
                >
                    RESET 0
                </button>
            </div>
            
            {/* Control Bar */}
            <div className="flex items-center gap-2">
                {/* Stepper */}
                <div className="flex items-center bg-gray-50 border border-border rounded-xl h-10 flex-1">
                    <button onClick={() => updateTemp(v.id, 'min_1')} className="w-10 h-full flex items-center justify-center text-text-secondary hover:bg-gray-200 rounded-l-xl active:bg-gray-300">
                        <Minus className="w-4 h-4" />
                    </button>
                    <input 
                        type="number" 
                        className="flex-1 w-full text-center bg-transparent font-bold text-text-primary outline-none text-lg"
                        value={qty}
                        onChange={(e) => setTempStock({...tempStock, [v.id]: parseInt(e.target.value)||0})}
                    />
                    <button onClick={() => updateTemp(v.id, 'plus_1')} className="w-10 h-full flex items-center justify-center text-text-secondary hover:bg-gray-200 rounded-r-xl active:bg-gray-300">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Adds */}
                <button onClick={() => updateTemp(v.id, 'add_5')} className="h-10 px-3 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-xl active:scale-95 transition-transform shadow-sm">+5</button>
                <button onClick={() => updateTemp(v.id, 'add_10')} className="h-10 px-3 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl active:scale-95 transition-transform shadow-sm">+10</button>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-4 fade-in pb-24 px-4 pt-4 md:pt-0 bg-background min-h-screen">
            
            {/* HEADER & FILTERS */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-2 pt-2 -mx-4 px-4 shadow-sm border-b border-border">
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary"/> Stok Virtual
                        </h1>
                        <button 
                            onClick={() => setIsRackMode(!isRackMode)} 
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${isRackMode ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-secondary border-border'}`}
                        >
                            {isRackMode ? <MapPin className="w-3 h-3"/> : <Filter className="w-3 h-3"/>}
                            {isRackMode ? 'Urut Rak' : 'Urut Nama'}
                        </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                        {/* WAREHOUSE SELECTOR */}
                        <div className="col-span-5 relative">
                            <select 
                                className="w-full h-10 pl-2 pr-6 text-xs font-bold bg-white border border-border rounded-xl focus:outline-none focus:border-primary shadow-sm appearance-none"
                                value={selectedSupplierId} 
                                onChange={e => setSelectedSupplierId(e.target.value)}
                            >
                                <option value="">Pilih Gudang...</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-text-secondary absolute right-2 top-3.5 pointer-events-none"/>
                        </div>

                        {/* SEARCH INPUT */}
                        <div className="col-span-7 relative">
                            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
                            <input 
                                type="text" 
                                className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-primary shadow-sm" 
                                placeholder="Cari Produk / Rak..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* PRODUCT GRID */}
            {!selectedSupplierId ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-60">
                    <Store className="w-12 h-12 mb-2" />
                    <p className="text-sm font-medium">Pilih Gudang Belanja Dulu</p>
                </div>
            ) : loadingSnapshots ? (
                <div className="space-y-3 pt-4">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 pt-2">
                    {filteredProducts.map((p, idx) => {
                        const pVars = variants.filter(v => v.product_id === p.id);
                        const totalStock = pVars.reduce((acc, v) => acc + (snapshots[v.id] || 0), 0);
                        
                        return (
                            <motion.div 
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => openScreening(p)} 
                                className="bg-white p-0 rounded-xl border border-border shadow-sm active:scale-[0.98] transition-transform flex overflow-hidden cursor-pointer group"
                            >
                                {/* LEFT: RACK INDICATOR */}
                                <div className="w-16 bg-gray-50 border-r border-dashed border-border flex flex-col items-center justify-center p-2" onClick={e => e.stopPropagation()}>
                                    <span className="text-[9px] font-bold text-text-secondary uppercase mb-1">RAK</span>
                                    <input 
                                        type="text" 
                                        className="w-full text-center font-mono font-bold text-xl bg-white border border-border rounded-lg p-1 uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-primary" 
                                        placeholder="--" 
                                        defaultValue={p.rack || ''} 
                                        onBlur={(e) => handleUpdateRack(p.id, e.target.value)} 
                                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }} 
                                    />
                                </div>

                                {/* RIGHT: INFO */}
                                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center relative">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{p.base_sku}</span>
                                        {totalStock > 0 && (
                                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3"/> {totalStock} pcs
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-text-primary text-sm leading-tight line-clamp-2 pr-6">{p.name}</h3>
                                    <p className="text-[10px] text-text-secondary mt-1">{pVars.length} Varian Available</p>
                                    
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/30">
                                        <ChevronDown className="w-5 h-5 -rotate-90"/>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* --- SCREENING MODAL (BOTTOM SHEET STYLE) --- */}
            <Portal>
                <AnimatePresence>
                    {modalOpen && currentModalProd && (
                        <>
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={()=>setModalOpen(false)} />
                            <motion.div 
                                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl"
                            >
                                {/* HEADER */}
                                <div className="p-5 border-b border-border bg-white rounded-t-[2rem] relative shrink-0">
                                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" /> {/* Handle */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">RAK: {currentModalProd.rack || '-'}</span>
                                                <span className="font-mono text-sm font-extrabold text-primary">{currentModalProd.base_sku}</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-text-primary leading-tight line-clamp-2">{currentModalProd.name}</h3>
                                        </div>
                                        <button onClick={() => setModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-text-secondary hover:bg-gray-200"><X className="w-5 h-5"/></button>
                                    </div>
                                    
                                    {/* Sort Toggle */}
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            onClick={() => setModalSortMode(modalSortMode === 'size' ? 'color' : 'size')} 
                                            className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-border bg-gray-50 flex items-center gap-1 transition-all active:scale-95"
                                        >
                                            <ScanBarcode className="w-3 h-3 text-text-secondary"/>
                                            Group by: <span className="text-primary uppercase">{modalSortMode}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* CONTENT SCROLL */}
                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar pb-24">
                                    {modalSortMode === 'size' ? (
                                        // MODE: GROUP BY SIZE
                                        <div className="space-y-4">
                                            {Object.entries(
                                                currentModalProd.variants.reduce((acc, v) => {
                                                    const k = (v.size || 'No Size').toUpperCase();
                                                    if(!acc[k]) acc[k] = []; acc[k].push(v); return acc;
                                                }, {})
                                            ).sort((a, b) => {
                                                const idxA = sizeRank.indexOf(a[0]); const idxB = sizeRank.indexOf(b[0]);
                                                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                                return a[0].localeCompare(b[0]);
                                            }).map(([size, vars]) => (
                                                <div key={size} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                                                    <div className="px-3 py-2 bg-gray-100/50 border-b border-border flex justify-between items-center">
                                                        <span className="text-xs font-bold text-text-secondary uppercase">{size}</span>
                                                        <span className="text-[10px] bg-white border border-border px-1.5 rounded text-text-secondary">{vars.length} Items</span>
                                                    </div>
                                                    <div className="p-3">
                                                        {vars.sort((a,b) => (a.color||'').localeCompare(b.color||'')).map(v => (
                                                            <QuickControlRow key={v.id} v={v} qty={tempStock[v.id] || 0} mode="size" />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // MODE: GROUP BY COLOR
                                        <div className="space-y-4">
                                            {Object.entries(
                                                currentModalProd.variants.reduce((acc, v) => {
                                                    const k = v.color || 'General';
                                                    if(!acc[k]) acc[k] = []; acc[k].push(v); return acc;
                                                }, {})
                                            ).sort().map(([color, vars]) => (
                                                <div key={color} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                                                    <div className="px-3 py-2 bg-gray-100/50 border-b border-border flex justify-between items-center">
                                                        <span className="text-xs font-bold text-text-secondary uppercase">{color}</span>
                                                        <span className="text-[10px] bg-white border border-border px-1.5 rounded text-text-secondary">{vars.length} Items</span>
                                                    </div>
                                                    <div className="p-3">
                                                        {vars.sort(sortBySize).map(v => (
                                                            <QuickControlRow key={v.id} v={v} qty={tempStock[v.id] || 0} mode="color" />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER ACTIONS */}
                                <div className="p-4 border-t border-border bg-white pb-safe absolute bottom-0 w-full shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-2xl">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-text-secondary uppercase">Total Count</span>
                                        <span className="text-2xl font-display font-bold text-primary">{Object.values(tempStock).reduce((a,b)=>a+b,0)}</span>
                                    </div>
                                    <button onClick={saveModal} className="w-full btn-gold py-3.5 text-sm shadow-lg flex items-center justify-center gap-2">
                                        <Save className="w-4 h-4"/> SIMPAN PERUBAHAN
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </Portal>
        </div>
    );
}