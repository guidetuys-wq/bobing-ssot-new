// app/(dashboard)/stock/inventory/page.js
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, where, limit, serverTimestamp, getDoc } from 'firebase/firestore';
import { sortBySize, formatRupiah } from '@/lib/utils';
import { Portal } from '@/lib/usePortal';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

// --- MODERN UI IMPORTS ---
import { 
    Search, RotateCcw, ChevronRight, ChevronDown, 
    Plus, History, ClipboardList, Warehouse, Package, 
    ShoppingCart, Trash2, X, FileText, AlertCircle, Filter, Tag, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- INTEGRASI FINANCE (SSOT) ---
import { recordAdjustmentTransaction, recordPurchaseTransaction } from '@/lib/transactionService';

const CACHE_KEY = 'lumina_inventory_v3_filters'; // Bump version
const CACHE_DURATION = 15 * 60 * 1000;

export default function InventoryPage() {
    // Data State
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]); 
    const [categories, setCategories] = useState([]); 
    const [collections, setCollections] = useState([]); 
    const [snapshots, setSnapshots] = useState({}); 
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all'); 
    const [filterCollection, setFilterCollection] = useState('all'); 
    const [expandedProductId, setExpandedProductId] = useState(null); 
    
    // Cart PO State
    const [poCart, setPoCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    // Modals State
    const [modalAdjOpen, setModalAdjOpen] = useState(false);
    const [modalCardOpen, setModalCardOpen] = useState(false);
    const [modalFinalizeOpen, setModalFinalizeOpen] = useState(false); 
    
    // Forms Data
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [adjForm, setAdjForm] = useState({ qty: 0, notes: '', type: 'opname' });
    const [poForm, setPoForm] = useState({ supplier_id: '', warehouse_id: '', date: new Date().toISOString().split('T')[0] });
    const [cardData, setCardData] = useState([]); 

    useEffect(() => { fetchData(); }, []);

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (!forceRefresh) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { products: cp, warehouses: cw, categories: cc, collections: ccol, snapshots: cs, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setProducts(cp);
                        setWarehouses(cw);
                        setCategories(cc || []);
                        setCollections(ccol || []);
                        setSnapshots(cs);
                        setLoading(false);
                        fetchSuppliers();
                        return;
                    }
                }
            }

            const [prodSnap, whSnap, snapSnap, varSnap, catSnap, colSnap] = await Promise.all([
                getDocs(collection(db, "products")),
                getDocs(query(collection(db, "warehouses"), orderBy("created_at"))),
                getDocs(collection(db, "stock_snapshots")),
                getDocs(collection(db, "product_variants")),
                getDocs(query(collection(db, "categories"), orderBy("name"))), 
                getDocs(query(collection(db, "collections"), orderBy("name"))) 
            ]);

            const variantsMap = {}; 
            varSnap.forEach(d => {
                const v = { id: d.id, ...d.data() };
                if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
                variantsMap[v.product_id].push(v);
            });

            const prods = [];
            prodSnap.forEach(d => {
                const p = d.data();
                const pVars = variantsMap[d.id] || [];
                if (pVars.length > 0) {
                    prods.push({ id: d.id, ...p, variants: pVars });
                }
            });

            const whs = [];
            whSnap.forEach(d => whs.push({ id: d.id, ...d.data() }));

            const cats = []; catSnap.forEach(d => cats.push({id:d.id, ...d.data()}));
            const cols = []; colSnap.forEach(d => cols.push({id:d.id, ...d.data()}));

            const snapMap = {};
            snapSnap.forEach(d => { snapMap[d.id] = d.data().qty || 0; });

            setProducts(prods);
            setWarehouses(whs);
            setCategories(cats);
            setCollections(cols);
            setSnapshots(snapMap);
            
            await fetchSuppliers();

            localStorage.setItem(CACHE_KEY, JSON.stringify({
                products: prods, warehouses: whs, categories: cats, collections: cols, snapshots: snapMap, timestamp: Date.now()
            }));

        } catch (e) {
            console.error(e);
            toast.error("Gagal memuat inventory");
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        const snap = await getDocs(query(collection(db, "suppliers"), orderBy("name")));
        const s = [];
        snap.forEach(d => s.push({id: d.id, ...d.data()}));
        setSuppliers(s);
    };

    const handleRefresh = () => {
        const t = toast.loading("Menyegarkan data...");
        fetchData(true).then(() => toast.success("Inventory Terupdate!", { id: t }));
    };

    // --- CART LOGIC ---
    const addToPoCart = (variant, product) => {
        setPoCart(prev => {
            const existing = prev.find(i => i.variant_id === variant.id);
            if (existing) {
                toast.success(<div className="text-xs"><b>{product.name}</b><br/>Qty Updated: {variant.sku}</div>, { icon: '➕', duration: 2000 });
                return prev.map(i => i.variant_id === variant.id ? { ...i, qty: i.qty + 1 } : i);
            }
            toast.success(<div className="text-xs"><b>{product.name}</b><br/>Ditambahkan ke Draft PO</div>, { icon: '🛒', duration: 2000 });
            return [...prev, {
                variant_id: variant.id,
                sku: variant.sku,
                product_name: product.name,
                variant_name: `${variant.color} / ${variant.size}`,
                qty: 1,
                cost: variant.cost || 0
            }];
        });
    };

    const removeFromCart = (idx) => {
        setPoCart(prev => prev.filter((_, i) => i !== idx));
    };

    // --- FINALIZE PO (SSOT FIXED) ---
    const handleFinalizePO = async () => {
        if(!poForm.supplier_id || !poForm.warehouse_id) return toast.error("Pilih Supplier & Gudang!");
        if(poCart.length === 0) return toast.error("Keranjang kosong!");

        const tId = toast.loading("Membuat Purchase Order...");
        try {
            // 1. Finance Config
            const settingSnap = await getDoc(doc(db, "settings", "general"));
            const financeConfig = settingSnap.exists() ? settingSnap.data().financeConfig : null;

            const totalAmount = poCart.reduce((a, b) => a + (b.qty * b.cost), 0);
            const totalQty = poCart.reduce((a, b) => a + b.qty, 0);
            const supplierName = suppliers.find(s => s.id === poForm.supplier_id)?.name || 'Unknown';

            await runTransaction(db, async (t) => {
                // FASE 1: PRE-FETCH SNAPSHOTS
                const snapshotDataMap = new Map();
                for (const item of poCart) {
                    const snapId = `${item.variant_id}_${poForm.warehouse_id}`;
                    const snapRef = doc(db, "stock_snapshots", snapId);
                    const snapDoc = await t.get(snapRef);
                    snapshotDataMap.set(item.variant_id, { ref: snapRef, doc: snapDoc });
                }

                // FASE 2: EXECUTE WRITES
                const poRef = doc(collection(db, "purchase_orders"));
                t.set(poRef, {
                    supplier_name: supplierName,
                    warehouse_id: poForm.warehouse_id,
                    order_date: new Date(poForm.date),
                    status: 'received_full', 
                    total_amount: totalAmount,
                    total_qty: totalQty,
                    payment_status: 'unpaid',
                    created_at: serverTimestamp(),
                    source: 'inventory_quick_po'
                });

                for (const item of poCart) {
                    const itemRef = doc(collection(db, `purchase_orders/${poRef.id}/items`));
                    t.set(itemRef, {
                        variant_id: item.variant_id,
                        qty: item.qty,
                        unit_cost: item.cost,
                        subtotal: item.qty * item.cost
                    });

                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, {
                        variant_id: item.variant_id,
                        warehouse_id: poForm.warehouse_id,
                        type: 'purchase_in',
                        qty: item.qty,
                        ref_id: poRef.id,
                        date: serverTimestamp(),
                        notes: `Quick PO ${supplierName}`
                    });

                    const { ref: snapRef, doc: snapDoc } = snapshotDataMap.get(item.variant_id);
                    if (snapDoc.exists()) {
                        t.update(snapRef, { qty: (snapDoc.data().qty || 0) + item.qty });
                    } else {
                        t.set(snapRef, { id: snapRef.id, variant_id: item.variant_id, warehouse_id: poForm.warehouse_id, qty: item.qty });
                    }
                }

                // FINANCE JURNAL
                if (financeConfig) {
                    recordPurchaseTransaction(db, t, {
                        poId: poRef.id,
                        totalAmount: totalAmount,
                        isPaid: false,
                        walletId: null,
                        supplierName: supplierName,
                        financeConfig: financeConfig
                    });
                }
            });

            setPoCart([]);
            setModalFinalizeOpen(false);
            setIsCartOpen(false);
            
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem('lumina_purchases_history_v2');
            
            toast.success("PO Berhasil & Jurnal Hutang Tercatat!", { id: tId });
            fetchData(true);

        } catch (e) {
            console.error(e);
            toast.error("Gagal membuat PO", { id: tId });
        }
    };

    const getProductTotalStock = (product, whId) => {
        return product.variants.reduce((acc, v) => acc + (snapshots[`${v.id}_${whId}`] || 0), 0);
    };

    const getProductGlobalStock = (product) => {
        let total = 0;
        // Filter by warehouse if selected
        const targetWhs = filterWarehouse === 'all' ? warehouses : warehouses.filter(w => w.id === filterWarehouse);
        targetWhs.forEach(w => { total += getProductTotalStock(product, w.id); });
        return total;
    };

    // Calculate Asset Value for Filtered View
    const getFilteredAssetValue = () => {
        let totalVal = 0;
        filteredProducts.forEach(p => {
            p.variants.forEach(v => {
                let qty = 0;
                if(filterWarehouse === 'all') {
                    qty = warehouses.reduce((acc, w) => acc + (snapshots[`${v.id}_${w.id}`] || 0), 0);
                } else {
                    qty = snapshots[`${v.id}_${filterWarehouse}`] || 0;
                }
                totalVal += qty * (v.cost || 0);
            });
        });
        return totalVal;
    };

    const openAdjustment = (variant, whId) => {
        const currentQty = snapshots[`${variant.id}_${whId}`] || 0;
        setSelectedVariant({ ...variant, warehouse_id: whId, current_qty: currentQty });
        setAdjForm({ qty: currentQty, notes: '', type: 'opname' });
        setModalAdjOpen(true);
    };

    const handleSaveAdjustment = async () => {
        if (!selectedVariant) return;
        const tId = toast.loading("Menyimpan & Menghitung Cost...");
        try {
            const settingSnap = await getDoc(doc(db, "settings", "general"));
            const financeConfig = settingSnap.exists() ? settingSnap.data().financeConfig : null;

            const { id: variantId, warehouse_id } = selectedVariant;
            const targetQty = parseInt(adjForm.qty);
            const diff = targetQty - selectedVariant.current_qty;
            const unitCost = selectedVariant.cost || 0;
            const totalValue = Math.abs(diff * unitCost);

            await runTransaction(db, async (transaction) => {
                const moveRef = doc(collection(db, "stock_movements"));
                transaction.set(moveRef, {
                    variant_id: variantId, warehouse_id: warehouse_id,
                    type: adjForm.type === 'opname' ? 'adjustment_opname' : 'adjustment_in',
                    qty: diff, date: serverTimestamp(), notes: adjForm.notes || 'Manual Adj',
                    created_by: 'admin'
                });

                const snapRef = doc(db, "stock_snapshots", `${variantId}_${warehouse_id}`);
                transaction.set(snapRef, {
                    id: `${variantId}_${warehouse_id}`, variant_id: variantId, warehouse_id: warehouse_id,
                    qty: targetQty, updated_at: serverTimestamp()
                }, { merge: true });

                if (diff < 0 && financeConfig && totalValue > 0) {
                    recordAdjustmentTransaction(db, transaction, {
                        refId: moveRef.id,
                        totalValue: totalValue,
                        type: 'loss',
                        financeConfig: financeConfig
                    });
                }
            });

            const newSnaps = { ...snapshots, [`${variantId}_${warehouse_id}`]: targetQty };
            setSnapshots(newSnaps);
            localStorage.setItem(CACHE_KEY, JSON.stringify({ products, warehouses, categories, collections, snapshots: newSnaps, timestamp: Date.now() }));
            
            toast.success("Stok & Jurnal Tersimpan!", { id: tId });
            setModalAdjOpen(false);
        } catch (e) { toast.error(e.message, { id: tId }); }
    };

    const openStockCard = async (variant, whId) => {
        setCardData(null); 
        setModalCardOpen(true);
        setSelectedVariant({ ...variant, warehouse_id: whId });
        try {
            const q = query(
                collection(db, "stock_movements"),
                where("variant_id", "==", variant.id),
                where("warehouse_id", "==", whId),
                orderBy("date", "desc"),
                limit(20)
            );
            const snap = await getDocs(q);
            setCardData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { 
            toast.error("Gagal load history"); 
            setCardData([]); 
        }
    };

    // --- HELPER: RECURSIVE CATEGORY FINDER ---
    const getCategoryFamily = (parentId, allCats) => {
        let ids = [parentId];
        const children = allCats.filter(c => c.parent_id === parentId);
        children.forEach(child => {
            ids = [...ids, ...getCategoryFamily(child.id, allCats)];
        });
        return ids;
    };

    // --- FILTER LOGIC (UPDATED WITH RECURSION) ---
    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Recursive Category Filter
        let matchCat = true;
        if (filterCategory !== 'all') {
            const familyIds = getCategoryFamily(filterCategory, categories);
            matchCat = familyIds.includes(p.category_id);
        }

        const matchCol = filterCollection === 'all' || p.collection_id === filterCollection;
        return matchSearch && matchCat && matchCol;
    });

    const displayedWarehouses = filterWarehouse === 'all' 
        ? warehouses 
        : warehouses.filter(w => w.id === filterWarehouse);

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 text-text-primary bg-background min-h-screen relative">
            
            {/* HEADER */}
            <PageHeader 
                title="Inventory Management" 
                subtitle="Real-time stock monitoring & procurement." 
                actions={
                    <div className="flex gap-3 items-center">
                        {/* Cart Button */}
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="bg-white border border-border text-text-primary p-2.5 rounded-xl shadow-sm hover:bg-gray-50 relative group hidden md:flex"
                            title="Open Draft PO"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {poCart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm animate-bounce">
                                    {poCart.length}
                                </span>
                            )}
                        </button>

                        <button onClick={handleRefresh} className="bg-white border border-border p-2.5 rounded-xl shadow-sm hover:bg-gray-50 text-text-secondary hover:text-primary">
                            <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                }
            />

            {/* FILTER BAR (ADVANCED) */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full group">
                    <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        className="w-full pl-10 py-2.5 text-sm bg-gray-50 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-text-primary placeholder:text-text-secondary transition-all shadow-sm"
                        placeholder="Cari Produk / SKU..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {/* Warehouse Filter */}
                    <div className="relative min-w-[140px]">
                        <Warehouse className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                        <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="w-full pl-9 pr-8 py-2.5 text-xs font-bold bg-white border border-border rounded-xl appearance-none focus:outline-none focus:border-primary cursor-pointer">
                            <option value="all">Semua Gudang</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    <div className="relative min-w-[140px]">
                        <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full pl-9 pr-8 py-2.5 text-xs font-bold bg-white border border-border rounded-xl appearance-none focus:outline-none focus:border-primary cursor-pointer">
                            <option value="all">Semua Kategori</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* Collection Filter */}
                    <div className="relative min-w-[140px]">
                        <Tag className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                        <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)} className="w-full pl-9 pr-8 py-2.5 text-xs font-bold bg-white border border-border rounded-xl appearance-none focus:outline-none focus:border-primary cursor-pointer">
                            <option value="all">Semua Koleksi</option>
                            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            {/* === 1. MOBILE CARD VIEW (Hanya muncul di HP) === */}
            <div className="md:hidden space-y-3 pb-4">
                {loading ? <Skeleton className="h-32"/> : 
                filteredProducts.length === 0 ? <div className="text-center p-8 text-gray-400">Tidak ada produk</div> :
                filteredProducts.map(prod => {
                    const isExpanded = expandedProductId === prod.id;
                    const globalTotal = getProductGlobalStock(prod); // Pastikan fungsi ini ada/accessible
                    
                    return (
                        <div key={prod.id} className="bg-white p-4 rounded-xl border border-border shadow-sm active:scale-[0.99] transition-transform" onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className={`mt-1 transition-transform ${isExpanded ? 'rotate-90 text-primary' : 'text-gray-300'}`}>
                                        <ChevronRight className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-text-primary text-sm leading-tight">{prod.name}</h4>
                                        <span className="text-[10px] font-mono bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded border border-gray-200 mt-1 inline-block">{prod.base_sku}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-lg font-bold ${globalTotal > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{globalTotal}</span>
                                    <p className="text-[9px] text-gray-400 uppercase">Total Qty</p>
                                </div>
                            </div>

                            {/* Dropdown Detail Varian di Mobile */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="mt-3 pt-3 border-t border-dashed border-gray-200 overflow-hidden">
                                        {prod.variants.sort(sortBySize).map(v => (
                                            <div key={v.id} className="bg-gray-50 p-3 rounded-lg mb-2 last:mb-0">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-xs text-primary">{v.sku}</span>
                                                    <span className="text-xs text-text-secondary">{v.color} / {v.size}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Tampilkan stok per gudang */}
                                                    {displayedWarehouses.map(w => {
                                                        const qty = snapshots[`${v.id}_${w.id}`] || 0;
                                                        return (
                                                            <button 
                                                                key={w.id} 
                                                                onClick={(e)=>{e.stopPropagation(); openAdjustment(v, w.id)}}
                                                                className="flex justify-between items-center bg-white border border-gray-200 px-2 py-1.5 rounded text-[10px]"
                                                            >
                                                                <span className="truncate max-w-[60px] text-gray-500">{w.name}</span>
                                                                <span className={`font-bold ${qty>0?'text-emerald-600':'text-rose-500'}`}>{qty}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                <button 
                                                    onClick={(e)=>{e.stopPropagation(); addToPoCart(v, prod)}} 
                                                    className="w-full mt-2 bg-blue-100 text-blue-700 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1"
                                                >
                                                    <ShoppingCart className="w-3 h-3"/> Tambah PO
                                                </button>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {/* INVENTORY TABLE MATRIX */}
            <div className="hidden md:bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 sticky top-0 z-10 text-[11px] font-bold text-text-secondary uppercase tracking-wider backdrop-blur-sm border-b border-border">
                            <tr>
                                <th className="py-4 pl-6 w-[350px]">Produk / SKU</th>
                                {/* DYNAMIC WAREHOUSE COLUMNS */}
                                {displayedWarehouses.map(w => (
                                    <th key={w.id} className="py-4 px-2 text-center min-w-[120px] border-l border-border/50">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1">
                                                <Warehouse className="w-3.5 h-3.5 opacity-50" />
                                                <span>{w.name}</span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                {/* TOTAL ASSET COLUMN (FILTERED) */}
                                <th className="py-4 px-4 text-center min-w-[150px] border-l border-border/50 bg-emerald-50/50 text-emerald-800">
                                    Total Asset<br/>
                                    <span className="text-[10px] font-normal opacity-70">
                                        (Selection: {formatRupiah(getFilteredAssetValue())})
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-text-primary divide-y divide-border/60">
                            {loading ? (
                                <tr><td colSpan={warehouses.length + 2} className="p-12 text-center text-text-secondary animate-pulse">Memuat data stok...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={warehouses.length + 2} className="p-12 text-center text-text-secondary flex flex-col items-center justify-center opacity-60">
                                        <Package className="w-12 h-12 mb-3" />
                                        <p>Tidak ada produk ditemukan.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(prod => {
                                    const isExpanded = expandedProductId === prod.id;
                                    const globalTotal = getProductGlobalStock(prod);

                                    return (
                                        <React.Fragment key={prod.id}>
                                            <tr 
                                                className={`cursor-pointer transition-all hover:bg-gray-50/80 ${isExpanded ? 'bg-blue-50/40 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                                                onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                                            >
                                                <td className="py-3 pl-4 pr-2">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 transition-transform ${isExpanded ? 'rotate-90 text-primary' : 'text-text-secondary'}`}>
                                                            <ChevronRight className="w-4 h-4"/>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-text-primary text-sm line-clamp-1">{prod.name}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-mono text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded border border-border">{prod.base_sku}</span>
                                                                {/* Category Badge */}
                                                                {prod.category_id && categories.find(c=>c.id===prod.category_id) && (
                                                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                                        <Layers className="w-3 h-3"/> {categories.find(c=>c.id===prod.category_id).name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {displayedWarehouses.map(w => {
                                                    const totalWh = getProductTotalStock(prod, w.id);
                                                    return (
                                                        <td key={w.id} className="py-3 px-2 text-center border-l border-border/50">
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${totalWh > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                {totalWh}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                {/* Global Total Column */}
                                                <td className="py-3 px-4 text-center border-l border-border/50 bg-emerald-50/10">
                                                    <span className="font-bold text-sm text-emerald-700">{globalTotal}</span>
                                                </td>
                                            </tr>

                                            <AnimatePresence>
                                                {isExpanded && prod.variants.sort(sortBySize).map(v => (
                                                    <motion.tr 
                                                        key={v.id} 
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                        className="bg-gray-50/30 border-b border-border/30 hover:bg-blue-50/20 group"
                                                    >
                                                        <td className="py-2 pl-12 pr-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1 h-8 bg-border/50 rounded-full"></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-[11px] font-bold text-primary">{v.sku}</span>
                                                                        <span className="text-xs text-text-secondary">{v.color} / {v.size}</span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); addToPoCart(v, prod); }} 
                                                                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 font-bold shadow-sm"
                                                                >
                                                                    <Plus className="w-3 h-3"/> PO
                                                                </button>
                                                            </div>
                                                        </td>
                                                        {displayedWarehouses.map(w => {
                                                            const qty = snapshots[`${v.id}_${w.id}`] || 0;
                                                            return (
                                                                <td key={w.id} className="py-2 px-2 text-center border-l border-border/30 relative group/cell">
                                                                    <span className={`text-sm font-mono font-bold ${qty < 0 ? 'text-rose-500' : qty === 0 ? 'text-gray-300' : 'text-emerald-600'}`}>
                                                                        {qty}
                                                                    </span>
                                                                    <div className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 flex items-center justify-center bg-white/95 gap-1 transition-opacity border-l border-border/30 backdrop-blur-[1px]">
                                                                        <button onClick={(e) => { e.stopPropagation(); openAdjustment(v, w.id); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm" title="Adjust"><ClipboardList className="w-3.5 h-3.5"/></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); openStockCard(v, w.id); }} className="p-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm" title="History"><History className="w-3.5 h-3.5"/></button>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                        {/* Total Variant */}
                                                        <td className="py-2 px-4 text-center border-l border-border/30 bg-emerald-50/10">
                                                            <span className="text-xs text-text-secondary font-mono">
                                                                {displayedWarehouses.reduce((acc, w) => acc + (snapshots[`${v.id}_${w.id}`] || 0), 0)}
                                                            </span>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- FLOATING CART BUTTON (PINNED) --- */}
            <AnimatePresence>
                {poCart.length > 0 && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsCartOpen(true)}
                        className="fixed bottom-6 right-6 z-40 bg-primary text-white p-4 rounded-full shadow-2xl hover:bg-blue-600 hover:scale-105 transition-all flex items-center justify-center group"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full border-2 border-white font-bold animate-bounce">
                            {poCart.length}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* --- CART DRAWER --- */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={()=>setIsCartOpen(false)} />
                        <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-border">
                            <div className="p-5 border-b border-border flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary"/> Draft Purchase Order</h3>
                                <button onClick={()=>setIsCartOpen(false)}><X className="w-6 h-6 text-text-secondary"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {poCart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-text-secondary opacity-50">
                                        <Package className="w-12 h-12 mb-2"/>
                                        <p>Keranjang kosong. Tambahkan item (+ PO).</p>
                                    </div>
                                ) : poCart.map((item, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-border shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-sm text-text-primary">{item.product_name}</div>
                                            <div className="text-xs text-text-secondary flex items-center gap-2">
                                                <span className="font-mono bg-gray-100 px-1 rounded">{item.sku}</span>
                                                <span>{item.variant_name}</span>
                                            </div>
                                            <div className="text-xs font-mono mt-1 text-emerald-600">Est. Cost: {formatRupiah(item.cost)}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border rounded-lg bg-gray-50">
                                                <button onClick={()=>{const n=[...poCart]; if(n[i].qty>1) n[i].qty--; else n.splice(i,1); setPoCart(n)}} className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded-l-lg">-</button>
                                                <span className="px-2 text-sm font-bold bg-white border-x h-full flex items-center">{item.qty}</span>
                                                <button onClick={()=>{const n=[...poCart]; n[i].qty++; setPoCart(n)}} className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded-r-lg">+</button>
                                            </div>
                                            <button onClick={()=>removeFromCart(i)} className="text-rose-500 p-1 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 border-t border-border bg-gray-50">
                                <div className="flex justify-between mb-4 text-sm font-bold">
                                    <span>Total Estimasi</span>
                                    <span>{formatRupiah(poCart.reduce((a,b)=>a+(b.qty*b.cost),0))}</span>
                                </div>
                                <button onClick={()=>{setIsCartOpen(false); setModalFinalizeOpen(true)}} disabled={poCart.length===0} className="w-full btn-gold py-3 shadow-lg disabled:opacity-50">
                                    Finalize PO
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* --- MODAL FINALIZE PO --- */}
            <Portal>
                {modalFinalizeOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-text-primary">Create Purchase Order</h3>
                                <button onClick={()=>setModalFinalizeOpen(false)}><X className="w-6 h-6 text-text-secondary"/></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Supplier</label>
                                    <select className="input-luxury" value={poForm.supplier_id} onChange={e=>setPoForm({...poForm, supplier_id:e.target.value})}>
                                        <option value="">-- Pilih Supplier --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Gudang Tujuan</label>
                                    <select className="input-luxury" value={poForm.warehouse_id} onChange={e=>setPoForm({...poForm, warehouse_id:e.target.value})}>
                                        <option value="">-- Pilih Gudang --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Tanggal Order</label>
                                    <input type="date" className="input-luxury" value={poForm.date} onChange={e=>setPoForm({...poForm, date:e.target.value})} />
                                </div>
                                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5"/>
                                    <div className="text-xs text-amber-800">
                                        <p className="font-bold">Konfirmasi Stok Masuk?</p>
                                        <p>Stok akan langsung ditambahkan ke gudang terpilih dengan status <b>Received</b>. Jurnal Hutang akan tercatat.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                                <button onClick={()=>setModalFinalizeOpen(false)} className="btn-ghost-dark">Batal</button>
                                <button onClick={handleFinalizePO} className="btn-primary text-white hover:bg-blue-600 px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">
                                    <FileText className="w-4 h-4"/> Create PO
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </Portal>

            {/* --- MODAL ADJUSTMENT --- */}
            <Portal>
                {modalAdjOpen && selectedVariant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border">
                            <h3 className="text-lg font-bold text-text-primary mb-1">Stok Opname</h3>
                            <p className="text-xs text-text-secondary mb-4 font-mono">{selectedVariant.sku}</p>
                            <div className="space-y-4">
                                <div className="flex justify-between bg-gray-50 p-3 rounded-xl border border-border">
                                    <span className="text-xs font-bold text-text-secondary uppercase">Sistem</span>
                                    <span className="text-sm font-mono font-bold text-text-primary">{selectedVariant.current_qty}</span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-emerald-600 block mb-1">Real Qty (Fisik)</label>
                                    <input type="number" className="w-full text-center text-3xl font-bold border-2 border-emerald-500/50 rounded-xl py-3 focus:outline-none text-emerald-600" value={adjForm.qty} onChange={e => setAdjForm({ ...adjForm, qty: e.target.value })} autoFocus />
                                </div>
                                <textarea className="w-full border border-border rounded-xl p-3 text-sm focus:outline-none" rows="2" value={adjForm.notes} onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })} placeholder="Catatan..."></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setModalAdjOpen(false)} className="btn-ghost-dark px-4 py-2 text-xs">Batal</button>
                                <button onClick={handleSaveAdjustment} className="btn-primary text-white hover:bg-blue-600 px-6 py-2 rounded-xl text-xs font-bold shadow-lg">Simpan</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </Portal>

            {/* --- MODAL 2: LOG --- */}
            <Portal>
                {modalCardOpen && selectedVariant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[80vh] overflow-hidden">
                            <div className="p-5 border-b border-border flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-lg text-text-primary">Kartu Stok</h3>
                                    <p className="text-xs text-text-secondary font-mono mt-0.5">{selectedVariant.sku}</p>
                                </div>
                                <button onClick={() => setModalCardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-border hover:bg-gray-100 transition-colors text-text-secondary">
                                    <ChevronDown className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-white text-xs font-bold text-text-secondary uppercase sticky top-0 border-b border-border shadow-sm z-10">
                                        <tr><th className="p-4 pl-6">Tanggal</th><th className="p-4">Tipe</th><th className="p-4 text-right">Qty</th><th className="p-4">Note</th></tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {!cardData ? (
                                            <tr><td colSpan="4" className="text-center p-8 text-text-secondary animate-pulse">Loading history...</td></tr>
                                        ) : cardData.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center p-8 text-text-secondary italic">Belum ada riwayat pergerakan.</td></tr>
                                        ) : (
                                            cardData.map((m, idx) => (
                                                <tr key={m.id || idx} className="hover:bg-gray-50 border-b border-border/50 last:border-0 transition-colors">
                                                    <td className="pl-6 p-4 text-xs text-text-secondary font-mono">
                                                        {m.date ? new Date(m.date.toDate()).toLocaleDateString() + ' ' + new Date(m.date.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-gray-100 text-text-primary px-2 py-1 rounded text-[10px] uppercase font-bold border border-border">
                                                            {m.type?.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-right font-mono font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                                                    </td>
                                                    <td className="p-4 text-xs text-text-secondary truncate max-w-[200px]">{m.notes || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </Portal>
        </div>
    );
}