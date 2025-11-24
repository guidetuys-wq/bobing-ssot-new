(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/utils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/utils.js
__turbopack_context__.s([
    "formatRupiah",
    ()=>formatRupiah,
    "sizeRank",
    ()=>sizeRank,
    "sortBySize",
    ()=>sortBySize
]);
const formatRupiah = (n)=>{
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(n);
};
const sizeRank = [
    'ALL',
    'ALL SIZE',
    'ALLSIZE',
    'XXXS',
    'XXS',
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    '2XL',
    '3XL',
    'XXXL',
    '4XL',
    '5XL'
];
const sortBySize = (variantA, variantB)=>{
    const sizeA = (variantA.size || '').toUpperCase().trim();
    const sizeB = (variantB.size || '').toUpperCase().trim();
    const idxA = sizeRank.indexOf(sizeA);
    const idxB = sizeRank.indexOf(sizeB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    const colorCompare = (variantA.color || '').localeCompare(variantB.color || '');
    if (colorCompare !== 0) return colorCompare;
    return (variantA.sku || '').localeCompare(variantB.sku || '');
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/supplier-sessions/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>VirtualStockPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/firebase.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sortablejs$2f$modular$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sortablejs/modular/sortable.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$usePortal$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/usePortal.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
// Cache Configuration
const CACHE_KEY = 'lumina_virtual_stock_master';
const CACHE_DURATION = 5 * 60 * 1000;
function VirtualStockPage() {
    _s();
    const [suppliers, setSuppliers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [warehouses, setWarehouses] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [variants, setVariants] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [snapshots, setSnapshots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [selectedSupplierId, setSelectedSupplierId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [visibleProducts, setVisibleProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const gridRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Mobile State
    const [expandedProductId, setExpandedProductId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [modalOpen, setModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [currentModalProd, setCurrentModalProd] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [modalUpdates, setModalUpdates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Grouping State for Modal
    const [groupBy, setGroupBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('size'); // 'size' | 'color'
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VirtualStockPage.useEffect": ()=>{
            fetchData();
        }
    }["VirtualStockPage.useEffect"], []);
    // Set default supplier
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VirtualStockPage.useEffect": ()=>{
            if (suppliers.length > 0 && !selectedSupplierId) {
                const masTohir = suppliers.find({
                    "VirtualStockPage.useEffect.masTohir": (s)=>s.name === 'Mas Tohir'
                }["VirtualStockPage.useEffect.masTohir"]);
                if (masTohir) {
                    setSelectedSupplierId(masTohir.id);
                }
            }
        }
    }["VirtualStockPage.useEffect"], [
        suppliers
    ]);
    // Trigger load products when supplier selected
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VirtualStockPage.useEffect": ()=>{
            if (selectedSupplierId) {
                handleSupplierChange(selectedSupplierId);
            }
        }
    }["VirtualStockPage.useEffect"], [
        selectedSupplierId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VirtualStockPage.useEffect": ()=>{
            if (gridRef.current && visibleProducts.length > 0) {
                new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sortablejs$2f$modular$2f$sortable$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](gridRef.current, {
                    animation: 150,
                    ghostClass: 'opacity-50'
                });
            }
        }
    }["VirtualStockPage.useEffect"], [
        visibleProducts
    ]);
    const fetchData = async ()=>{
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
                    const sSnap = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_snapshots"));
                    const snaps = {};
                    sSnap.forEach((d)=>snaps[d.id] = d.data());
                    setSnapshots(snaps);
                    return;
                }
            }
            // 2. Fetch Fresh
            const [sSupp, sWh, sProd, sVar, sSnap] = await Promise.all([
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "suppliers"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("name"))),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "warehouses")),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "products"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["limit"])(100))),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "product_variants"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("sku"))),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_snapshots"))
            ]);
            const supps = [];
            sSupp.forEach((d)=>supps.push({
                    id: d.id,
                    ...d.data()
                }));
            const whs = [];
            sWh.forEach((d)=>whs.push({
                    id: d.id,
                    ...d.data()
                }));
            const prods = [];
            sProd.forEach((d)=>prods.push({
                    id: d.id,
                    ...d.data()
                }));
            const vars = [];
            sVar.forEach((d)=>vars.push({
                    id: d.id,
                    ...d.data()
                }));
            const snaps = {};
            sSnap.forEach((d)=>snaps[d.id] = d.data());
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
        } catch (e) {
            console.error(e);
        }
    };
    const handleSupplierChange = (suppId)=>{
        if (!suppId) {
            setVisibleProducts([]);
            return;
        }
        const wh = warehouses.find((w)=>w.type === 'virtual_supplier' && w.supplier_id === suppId);
        if (!wh) {
            // Don't alert immediately on auto-select to avoid spam
            // alert("Supplier ini belum punya Gudang Virtual."); 
            setVisibleProducts([]);
            return;
        }
        const grouped = {};
        variants.forEach((v)=>{
            if (!grouped[v.product_id]) {
                const p = products.find((x)=>x.id === v.product_id);
                if (p) grouped[v.product_id] = {
                    ...p,
                    variants: [],
                    totalStock: 0
                };
            }
            if (grouped[v.product_id]) {
                grouped[v.product_id].variants.push(v);
                grouped[v.product_id].totalStock += snapshots[`${v.id}_${wh.id}`]?.qty || 0;
            }
        });
        setVisibleProducts(Object.values(grouped).sort((a, b)=>(a.base_sku || '').localeCompare(b.base_sku || '')));
    };
    const openModal = (prod)=>{
        setCurrentModalProd(prod);
        setModalUpdates({});
        setGroupBy('size'); // Default sort by Size
        setModalOpen(true);
    };
    const saveModal = async ()=>{
        const wh = warehouses.find((w)=>w.type === 'virtual_supplier' && w.supplier_id === selectedSupplierId);
        const updates = [];
        Object.keys(modalUpdates).forEach((vid)=>{
            const real = parseInt(modalUpdates[vid]);
            const current = snapshots[`${vid}_${wh.id}`]?.qty || 0;
            if (!isNaN(real) && real !== current) updates.push({
                variantId: vid,
                real,
                diff: real - current
            });
        });
        if (updates.length === 0) {
            setModalOpen(false);
            return;
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runTransaction"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], async (t)=>{
                const sessRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "supplier_stock_sessions"));
                t.set(sessRef, {
                    supplier_id: selectedSupplierId,
                    warehouse_id: wh.id,
                    date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])(),
                    created_by: user?.email,
                    type: 'overwrite'
                });
                for (const up of updates){
                    const k = `${up.variantId}_${wh.id}`;
                    const snapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_snapshots", k);
                    const sDoc = await t.get(snapRef);
                    t.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_movements")), {
                        variant_id: up.variantId,
                        warehouse_id: wh.id,
                        type: 'supplier_sync',
                        qty: up.diff,
                        ref_id: sessRef.id,
                        ref_type: 'supplier_session',
                        date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])()
                    });
                    if (sDoc.exists()) t.update(snapRef, {
                        qty: up.real,
                        updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])()
                    });
                    else t.set(snapRef, {
                        id: k,
                        variant_id: up.variantId,
                        warehouse_id: wh.id,
                        qty: up.real,
                        updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])()
                    });
                }
            });
            alert("Stok terupdate!");
            setModalOpen(false);
            // Invalidate cache stock
            sessionStorage.removeItem('lumina_inventory_data');
            fetchData(); // Refresh snapshots
        } catch (e) {
            alert(e.message);
        }
    };
    const toggleAccordion = (id)=>{
        setExpandedProductId(expandedProductId === id ? null : id);
    };
    // --- HELPER FOR GROUPING IN MODAL ---
    const getGroupedVariants = (variants)=>{
        const groups = {};
        variants.forEach((v)=>{
            // Tentukan key berdasarkan mode grouping
            const key = groupBy === 'size' ? v.size || 'Other' : v.color || 'Other';
            if (!groups[key]) groups[key] = [];
            groups[key].push(v);
        });
        return groups;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-7xl mx-auto space-y-6 fade-in pb-20",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-lumina-base -mx-4 px-4 md:-mx-8 md:px-8 py-4 border-b border-lumina-border/50 shadow-md",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl md:text-3xl font-display font-bold text-lumina-text tracking-tight",
                                children: "Virtual Stock Map"
                            }, void 0, false, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 196,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-lumina-muted mt-1 font-light hidden md:block",
                                children: "Drag & Drop cards to organize supplier products."
                            }, void 0, false, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 197,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/supplier-sessions/page.js",
                        lineNumber: 195,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        className: "input-luxury w-full md:w-64 font-medium",
                        value: selectedSupplierId,
                        onChange: (e)=>setSelectedSupplierId(e.target.value),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "-- Select Supplier --"
                            }, void 0, false, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 200,
                                columnNumber: 21
                            }, this),
                            suppliers.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: s.id,
                                    children: s.name
                                }, s.id, false, {
                                    fileName: "[project]/app/supplier-sessions/page.js",
                                    lineNumber: 201,
                                    columnNumber: 41
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/supplier-sessions/page.js",
                        lineNumber: 199,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/supplier-sessions/page.js",
                lineNumber: 194,
                columnNumber: 14
            }, this),
            selectedSupplierId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: gridRef,
                        className: "hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
                        children: visibleProducts.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "card-luxury p-5 cursor-grab active:cursor-grabbing hover:border-lumina-gold/50 transition-all relative group",
                                onClick: ()=>openModal(p),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] font-bold bg-lumina-base text-lumina-gold px-2 py-1 rounded uppercase tracking-wide border border-lumina-border",
                                        children: p.base_sku
                                    }, void 0, false, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 211,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-bold text-lumina-text mt-3 mb-4 line-clamp-2 leading-relaxed group-hover:text-lumina-gold transition-colors",
                                        children: p.name
                                    }, void 0, false, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 212,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-end border-t border-lumina-border pt-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-lumina-muted",
                                                children: [
                                                    p.variants.length,
                                                    " Items"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 214,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `text-lg font-bold ${p.totalStock > 0 ? 'text-emerald-400' : 'text-lumina-border'}`,
                                                children: p.totalStock
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 215,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 213,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 210,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/supplier-sessions/page.js",
                        lineNumber: 208,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "md:hidden grid grid-cols-1 gap-4",
                        children: visibleProducts.map((p)=>{
                            const isExpanded = expandedProductId === p.id;
                            const wh = warehouses.find((w)=>w.type === 'virtual_supplier' && w.supplier_id === selectedSupplierId);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: ()=>toggleAccordion(p.id),
                                className: "card-luxury p-4 active:scale-[0.98] transition-transform",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-4 items-start",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-16 h-16 rounded-lg bg-lumina-base border border-lumina-border flex-shrink-0 overflow-hidden",
                                                children: p.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: p.image_url,
                                                    alt: "Product",
                                                    className: "w-full h-full object-cover"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                    lineNumber: 233,
                                                    columnNumber: 49
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-full h-full flex items-center justify-center text-lumina-muted",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs",
                                                        children: "IMG"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 235,
                                                        columnNumber: 131
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                    lineNumber: 235,
                                                    columnNumber: 49
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 231,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1 min-w-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between items-start",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs font-mono font-bold text-lumina-gold bg-lumina-base px-1.5 py-0.5 rounded border border-lumina-border",
                                                                children: p.base_sku
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                lineNumber: 240,
                                                                columnNumber: 50
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `text-sm font-bold font-mono ${p.totalStock === 0 ? 'text-rose-500' : 'text-emerald-400'}`,
                                                                children: [
                                                                    p.totalStock,
                                                                    " ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[10px] text-lumina-muted font-normal",
                                                                        children: "qty"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                                        lineNumber: 242,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                lineNumber: 241,
                                                                columnNumber: 50
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 239,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-sm font-bold text-white mt-1 truncate",
                                                        children: p.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 245,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between mt-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-[10px] text-lumina-muted",
                                                                children: [
                                                                    p.variants.length,
                                                                    " Varian"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                lineNumber: 247,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "badge-luxury badge-neutral text-[9px]",
                                                                children: p.category
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                lineNumber: 248,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 246,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 238,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 230,
                                        columnNumber: 37
                                    }, this),
                                    isExpanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 border-t border-lumina-border pt-3 space-y-3 animate-fade-in",
                                        onClick: (e)=>e.stopPropagation(),
                                        children: [
                                            p.variants.sort(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sortBySize"]).map((v)=>{
                                                const qty = snapshots[`${v.id}_${wh?.id}`]?.qty || 0;
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "bg-lumina-base/50 rounded-lg p-3 border border-lumina-border/50 flex justify-between items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs font-mono text-lumina-gold",
                                                                    children: v.sku
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 261,
                                                                    columnNumber: 61
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-[10px] text-white",
                                                                    children: [
                                                                        v.color,
                                                                        " / ",
                                                                        v.size
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 262,
                                                                    columnNumber: 61
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/supplier-sessions/page.js",
                                                            lineNumber: 260,
                                                            columnNumber: 57
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-lumina-muted",
                                                                    children: "Real:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 265,
                                                                    columnNumber: 61
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "number",
                                                                    className: "w-20 text-center bg-lumina-surface border border-lumina-border rounded py-1 font-bold text-white focus:border-lumina-gold outline-none",
                                                                    placeholder: qty,
                                                                    onChange: (e)=>setModalUpdates({
                                                                            ...modalUpdates,
                                                                            [v.id]: e.target.value
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 266,
                                                                    columnNumber: 61
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/supplier-sessions/page.js",
                                                            lineNumber: 264,
                                                            columnNumber: 57
                                                        }, this)
                                                    ]
                                                }, v.id, true, {
                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                    lineNumber: 259,
                                                    columnNumber: 53
                                                }, this);
                                            }),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: saveModal,
                                                className: "btn-gold w-full py-2 text-xs mt-2",
                                                children: "Simpan Perubahan Stok"
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 276,
                                                columnNumber: 45
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 255,
                                        columnNumber: 41
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 228,
                                columnNumber: 34
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/supplier-sessions/page.js",
                        lineNumber: 222,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$usePortal$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
                children: modalOpen && currentModalProd && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-lumina-surface border border-lumina-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col ring-1 ring-lumina-gold/20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-5 border-b border-lumina-border bg-lumina-surface rounded-t-2xl flex justify-between items-start gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xl font-bold text-white font-mono tracking-wide",
                                                children: currentModalProd.base_sku
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 295,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-lumina-muted truncate mt-1",
                                                children: currentModalProd.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 296,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 294,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 shrink-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center bg-lumina-base/50 rounded-lg border border-lumina-border/30 p-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] text-lumina-muted font-bold uppercase px-2 hidden sm:block",
                                                        children: "Group By:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 302,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setGroupBy('size'),
                                                        className: `px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'size' ? 'bg-lumina-gold text-black' : 'text-lumina-muted hover:text-white'}`,
                                                        children: "Size"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 303,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setGroupBy('color'),
                                                        className: `px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'color' ? 'bg-lumina-gold text-black' : 'text-lumina-muted hover:text-white'}`,
                                                        children: "Color"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 309,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 301,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setModalOpen(false),
                                                className: "text-2xl text-lumina-muted hover:text-white transition-colors px-2",
                                                children: "×"
                                            }, void 0, false, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 317,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/supplier-sessions/page.js",
                                        lineNumber: 299,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 293,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 overflow-y-auto p-0 bg-lumina-base custom-scrollbar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "table-dark w-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "sticky top-0 z-10 bg-lumina-surface shadow-md border-b border-lumina-border",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "pl-6 py-3 text-left text-xs font-bold text-lumina-muted uppercase",
                                                        children: "Varian"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 326,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "text-center py-3 text-xs font-bold text-lumina-muted uppercase",
                                                        children: "System"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 327,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "text-center w-32 bg-lumina-highlight/10 py-3 text-xs font-bold text-lumina-gold uppercase",
                                                        children: "Real"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 328,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                lineNumber: 325,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/supplier-sessions/page.js",
                                            lineNumber: 324,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "divide-y divide-lumina-border/30",
                                            children: (()=>{
                                                const groups = getGroupedVariants(currentModalProd.variants);
                                                // Sort Keys: Jika Size, urutkan XS->S->M dst. Jika Color, Alphabetical.
                                                const sortedKeys = Object.keys(groups).sort((a, b)=>{
                                                    if (groupBy === 'size') {
                                                        const sizes = [
                                                            'XXS',
                                                            'XS',
                                                            'S',
                                                            'M',
                                                            'L',
                                                            'XL',
                                                            'XXL',
                                                            '2XL',
                                                            '3XL',
                                                            'ALL',
                                                            'STD'
                                                        ];
                                                        const iA = sizes.indexOf(a.toUpperCase());
                                                        const iB = sizes.indexOf(b.toUpperCase());
                                                        // Jika dua-duanya size standar, urutkan index
                                                        if (iA !== -1 && iB !== -1) return iA - iB;
                                                        // Jika salah satu tidak ada di list, taruh di akhir
                                                        if (iA !== -1) return -1;
                                                        if (iB !== -1) return 1;
                                                    }
                                                    return a.localeCompare(b);
                                                });
                                                return sortedKeys.map((key)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "bg-lumina-surface/50",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: "3",
                                                                    className: "px-6 py-2 text-[10px] font-extrabold text-lumina-gold uppercase tracking-widest border-y border-lumina-border/50",
                                                                    children: groupBy === 'size' ? `Size: ${key}` : `Color: ${key}`
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 354,
                                                                    columnNumber: 53
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                lineNumber: 353,
                                                                columnNumber: 49
                                                            }, this),
                                                            groups[key].sort((a, b)=>groupBy === 'size' ? a.color.localeCompare(b.color) // Kalau group by Size, sort item by Color
                                                                 : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sortBySize"])(a, b) // Kalau group by Color, sort item by Size
                                                            ).map((v)=>{
                                                                const whId = warehouses.find((w)=>w.supplier_id === selectedSupplierId)?.id;
                                                                const qty = snapshots[`${v.id}_${whId}`]?.qty || 0;
                                                                const isUpdated = modalUpdates[v.id] !== undefined && modalUpdates[v.id] !== "";
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: `transition-colors ${isUpdated ? 'bg-lumina-gold/5' : 'hover:bg-lumina-highlight/10'}`,
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "pl-6 py-3 font-medium text-lumina-text",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex flex-col",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-sm font-bold text-white",
                                                                                        children: [
                                                                                            groupBy === 'size' ? v.color : v.size,
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-lumina-muted font-normal ml-1",
                                                                                                children: [
                                                                                                    "/ ",
                                                                                                    groupBy === 'size' ? v.size : v.color
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                                                lineNumber: 376,
                                                                                                columnNumber: 77
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                                                        lineNumber: 374,
                                                                                        columnNumber: 73
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-[10px] font-mono text-lumina-muted mt-0.5",
                                                                                        children: v.sku
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                                                        lineNumber: 378,
                                                                                        columnNumber: 73
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                                lineNumber: 373,
                                                                                columnNumber: 69
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/supplier-sessions/page.js",
                                                                            lineNumber: 372,
                                                                            columnNumber: 65
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "text-center font-mono text-sm text-lumina-muted",
                                                                            children: qty
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/supplier-sessions/page.js",
                                                                            lineNumber: 381,
                                                                            columnNumber: 65
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "bg-lumina-highlight/10 p-2 text-center align-middle",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                type: "number",
                                                                                className: `w-full text-center bg-lumina-base border rounded-lg py-2 font-bold text-lg focus:ring-2 outline-none transition-all ${isUpdated ? 'border-lumina-gold text-lumina-gold ring-lumina-gold/30' : 'border-lumina-border text-white ring-transparent focus:border-lumina-gold'}`,
                                                                                placeholder: qty,
                                                                                value: modalUpdates[v.id] || '',
                                                                                onChange: (e)=>setModalUpdates({
                                                                                        ...modalUpdates,
                                                                                        [v.id]: e.target.value
                                                                                    })
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/supplier-sessions/page.js",
                                                                                lineNumber: 383,
                                                                                columnNumber: 69
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/supplier-sessions/page.js",
                                                                            lineNumber: 382,
                                                                            columnNumber: 65
                                                                        }, this)
                                                                    ]
                                                                }, v.id, true, {
                                                                    fileName: "[project]/app/supplier-sessions/page.js",
                                                                    lineNumber: 371,
                                                                    columnNumber: 61
                                                                }, this);
                                                            })
                                                        ]
                                                    }, key, true, {
                                                        fileName: "[project]/app/supplier-sessions/page.js",
                                                        lineNumber: 351,
                                                        columnNumber: 45
                                                    }, this));
                                            })()
                                        }, void 0, false, {
                                            fileName: "[project]/app/supplier-sessions/page.js",
                                            lineNumber: 331,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/supplier-sessions/page.js",
                                    lineNumber: 323,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 322,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-6 border-t border-lumina-border bg-lumina-surface rounded-b-2xl flex justify-end",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: saveModal,
                                    className: "btn-gold w-full md:w-auto shadow-gold-glow",
                                    children: "Save Updates"
                                }, void 0, false, {
                                    fileName: "[project]/app/supplier-sessions/page.js",
                                    lineNumber: 406,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/supplier-sessions/page.js",
                                lineNumber: 405,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/supplier-sessions/page.js",
                        lineNumber: 290,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/supplier-sessions/page.js",
                    lineNumber: 289,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/supplier-sessions/page.js",
                lineNumber: 287,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/supplier-sessions/page.js",
        lineNumber: 192,
        columnNumber: 9
    }, this);
}
_s(VirtualStockPage, "ZRmqaVxNREOpBW1E+5/aT5hyrXw=");
_c = VirtualStockPage;
var _c;
__turbopack_context__.k.register(_c, "VirtualStockPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_e75cae0a._.js.map