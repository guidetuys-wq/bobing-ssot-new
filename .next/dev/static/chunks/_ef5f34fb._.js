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
"[project]/app/sales-manual/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/sales-manual/page.js
__turbopack_context__.s([
    "default",
    ()=>PosPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/firebase.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function PosPage() {
    _s();
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [warehouses, setWarehouses] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [customers, setCustomers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [accounts, setAccounts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [snapshots, setSnapshots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [selectedWh, setSelectedWh] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [cashReceived, setCashReceived] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [modalVariantOpen, setModalVariantOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedProdForVariant, setSelectedProdForVariant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [modalInvoiceOpen, setModalInvoiceOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [invoiceData, setInvoiceData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [paymentAccId, setPaymentAccId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [selectedCustId, setSelectedCustId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const searchInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PosPage.useEffect": ()=>{
            const init = {
                "PosPage.useEffect.init": async ()=>{
                    try {
                        const [whS, prodS, varS, custS, snapS, accS] = await Promise.all([
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "warehouses"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("created_at"))),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "products")),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "product_variants"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("sku"))),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "customers"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("name"))),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_snapshots")),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "chart_of_accounts"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orderBy"])("code")))
                        ]);
                        const wh = [];
                        whS.forEach({
                            "PosPage.useEffect.init": (d)=>wh.push({
                                    id: d.id,
                                    ...d.data()
                                })
                        }["PosPage.useEffect.init"]);
                        setWarehouses(wh);
                        if (wh.length > 0) setSelectedWh(wh.find({
                            "PosPage.useEffect.init": (w)=>w.type !== 'virtual_supplier'
                        }["PosPage.useEffect.init"])?.id || wh[0].id);
                        const cust = [];
                        custS.forEach({
                            "PosPage.useEffect.init": (d)=>cust.push({
                                    id: d.id,
                                    ...d.data()
                                })
                        }["PosPage.useEffect.init"]);
                        setCustomers(cust);
                        const acc = [];
                        accS.forEach({
                            "PosPage.useEffect.init": (d)=>{
                                const c = d.data().category.toLowerCase();
                                if (c.includes('kas') || c.includes('bank')) acc.push({
                                    id: d.id,
                                    ...d.data()
                                });
                            }
                        }["PosPage.useEffect.init"]);
                        setAccounts(acc);
                        const defAcc = acc.find({
                            "PosPage.useEffect.init.defAcc": (a)=>a.code === '1101' || a.code === '1201'
                        }["PosPage.useEffect.init.defAcc"]);
                        if (defAcc) setPaymentAccId(defAcc.id);
                        const snaps = {};
                        snapS.forEach({
                            "PosPage.useEffect.init": (d)=>snaps[d.id] = d.data().qty || 0
                        }["PosPage.useEffect.init"]);
                        setSnapshots(snaps);
                        const vars = [];
                        varS.forEach({
                            "PosPage.useEffect.init": (d)=>vars.push({
                                    id: d.id,
                                    ...d.data()
                                })
                        }["PosPage.useEffect.init"]);
                        const prods = [];
                        prodS.forEach({
                            "PosPage.useEffect.init": (d)=>{
                                const p = d.data();
                                const pVars = vars.filter({
                                    "PosPage.useEffect.init.pVars": (v)=>v.product_id === d.id
                                }["PosPage.useEffect.init.pVars"]);
                                prods.push({
                                    id: d.id,
                                    ...p,
                                    variants: pVars
                                });
                            }
                        }["PosPage.useEffect.init"]);
                        setProducts(prods);
                    } catch (e) {
                        console.error(e);
                    } finally{
                        setLoading(false);
                    }
                }
            }["PosPage.useEffect.init"];
            init();
        }
    }["PosPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PosPage.useEffect": ()=>{
            const handleKey = {
                "PosPage.useEffect.handleKey": (e)=>{
                    if (e.key === 'F2') {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                    }
                    if (e.key === 'F9') handleCheckout();
                    if (e.key === 'F8') setCart([]);
                }
            }["PosPage.useEffect.handleKey"];
            window.addEventListener('keydown', handleKey);
            return ({
                "PosPage.useEffect": ()=>window.removeEventListener('keydown', handleKey)
            })["PosPage.useEffect"];
        }
    }["PosPage.useEffect"], [
        cart,
        paymentAccId,
        cashReceived
    ]);
    const addToCart = (variant, prodName)=>{
        const key = `${variant.id}_${selectedWh}`;
        const max = snapshots[key] || 0;
        if (max <= 0) return alert("Stok Habis!");
        const existIdx = cart.findIndex((i)=>i.id === variant.id);
        if (existIdx > -1) {
            const newCart = [
                ...cart
            ];
            if (newCart[existIdx].qty + 1 > max) return alert("Stok Maksimal");
            newCart[existIdx].qty += 1;
            setCart(newCart);
        } else {
            setCart([
                ...cart,
                {
                    id: variant.id,
                    sku: variant.sku,
                    name: prodName,
                    spec: `${variant.color}/${variant.size}`,
                    price: variant.price,
                    cost: variant.cost,
                    qty: 1,
                    max
                }
            ]);
        }
        setModalVariantOpen(false);
        setSearchTerm('');
    };
    const handleSearchEnter = (e)=>{
        if (e.key === 'Enter') {
            e.preventDefault();
            const k = searchTerm.trim().toUpperCase();
            if (!k) return;
            let fV = null, fP = null;
            for (const p of products){
                const v = p.variants.find((x)=>x.sku === k || x.barcode === k);
                if (v) {
                    fV = v;
                    fP = p;
                    break;
                }
            }
            if (fV) addToCart(fV, fP.name);
        }
    };
    const handleCheckout = async ()=>{
        if (cart.length === 0) return alert("Kosong");
        const total = cart.reduce((a, b)=>a + b.price * b.qty, 0);
        const received = parseInt(cashReceived) || 0;
        if (!confirm("Proses?")) return;
        try {
            const orderId = `ORD-${Date.now()}`;
            const custName = selectedCustId ? customers.find((c)=>c.id === selectedCustId).name : 'Guest';
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runTransaction"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], async (t)=>{
                const soRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "sales_orders"));
                t.set(soRef, {
                    order_number: orderId,
                    warehouse_id: selectedWh,
                    source: 'pos',
                    customer_id: selectedCustId || null,
                    customer_name: custName,
                    order_date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])(),
                    status: 'completed',
                    payment_status: 'paid',
                    gross_amount: total,
                    net_amount: total,
                    payment_account_id: paymentAccId,
                    items_summary: cart.map((c)=>`${c.sku}(${c.qty})`).join(', '),
                    created_by: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].currentUser?.email
                });
                for (const i of cart){
                    t.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], `sales_orders/${soRef.id}/items`)), {
                        variant_id: i.id,
                        sku: i.sku,
                        qty: i.qty,
                        unit_price: i.price,
                        unit_cost: i.cost
                    });
                    t.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_movements")), {
                        variant_id: i.id,
                        warehouse_id: selectedWh,
                        type: 'sale_out',
                        qty: -i.qty,
                        ref_id: soRef.id,
                        ref_type: 'sales_order',
                        date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])()
                    });
                    const sRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "stock_snapshots", `${i.id}_${selectedWh}`);
                    const sDoc = await t.get(sRef);
                    if (sDoc.exists()) t.update(sRef, {
                        qty: sDoc.data().qty - i.qty
                    });
                }
                t.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "cash_transactions")), {
                    type: 'in',
                    amount: total,
                    date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serverTimestamp"])(),
                    category: 'penjualan',
                    account_id: paymentAccId,
                    description: `POS ${orderId}`,
                    ref_type: 'sales_order',
                    ref_id: soRef.id
                });
                const accRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], "cash_accounts", paymentAccId);
                const accDoc = await t.get(accRef);
                if (accDoc.exists()) t.update(accRef, {
                    balance: (accDoc.data().balance || 0) + total
                });
            });
            setInvoiceData({
                id: orderId,
                total,
                received,
                change: received - total
            });
            setModalInvoiceOpen(true);
            setCart([]);
            setCashReceived('');
        } catch (e) {
            alert(e.message);
        }
    };
    const filteredProducts = products.filter((p)=>p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 24);
    const cartTotal = cart.reduce((a, b)=>a + b.price * b.qty, 0);
    const change = (parseInt(cashReceived) || 0) - cartTotal;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)] fade-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full lg:w-2/3 flex flex-col gap-4 h-full",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "card-luxury p-4 flex gap-3 items-center shrink-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative flex-1",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    ref: searchInputRef,
                                    type: "text",
                                    className: "input-luxury pl-10",
                                    placeholder: "Scan Barcode (F2)...",
                                    value: searchTerm,
                                    onChange: (e)=>setSearchTerm(e.target.value),
                                    onKeyDown: handleSearchEnter,
                                    autoFocus: true
                                }, void 0, false, {
                                    fileName: "[project]/app/sales-manual/page.js",
                                    lineNumber: 103,
                                    columnNumber: 54
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 103,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                className: "input-luxury w-48",
                                value: selectedWh,
                                onChange: (e)=>setSelectedWh(e.target.value),
                                children: warehouses.map((w)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: w.id,
                                        children: w.name
                                    }, w.id, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 104,
                                        columnNumber: 143
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 104,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/sales-manual/page.js",
                        lineNumber: 102,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto pr-1 scrollbar-hide grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start",
                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "col-span-full text-center py-10 text-lumina-muted",
                            children: "Loading..."
                        }, void 0, false, {
                            fileName: "[project]/app/sales-manual/page.js",
                            lineNumber: 107,
                            columnNumber: 32
                        }, this) : filteredProducts.map((p)=>{
                            const stock = p.variants.reduce((a, b)=>a + (snapshots[`${b.id}_${selectedWh}`] || 0), 0);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: ()=>{
                                    setSelectedProdForVariant(p);
                                    setModalVariantOpen(true);
                                },
                                className: `card-luxury p-4 cursor-pointer hover:border-lumina-gold/50 transition-all flex flex-col justify-between group ${stock <= 0 ? 'opacity-50' : ''}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-mono font-bold text-lumina-muted bg-lumina-base px-1.5 rounded",
                                                        children: p.base_sku
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/sales-manual/page.js",
                                                        lineNumber: 113,
                                                        columnNumber: 80
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `text-[10px] px-2 rounded ${stock > 0 ? 'text-emerald-400 bg-emerald-900/30' : 'text-rose-400 bg-rose-900/30'}`,
                                                        children: stock
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/sales-manual/page.js",
                                                        lineNumber: 113,
                                                        columnNumber: 197
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 113,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                className: "text-sm font-bold text-lumina-text group-hover:text-lumina-gold line-clamp-2",
                                                children: p.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 114,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 112,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 pt-3 border-t border-lumina-border text-[10px] text-lumina-muted text-right",
                                        children: [
                                            p.variants.length,
                                            " Variants"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 116,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 110,
                                columnNumber: 29
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/sales-manual/page.js",
                        lineNumber: 106,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/sales-manual/page.js",
                lineNumber: 101,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full lg:w-1/3 card-luxury flex flex-col h-full overflow-hidden border-lumina-border",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 border-b border-lumina-border bg-lumina-surface flex justify-between items-center shrink-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "font-bold text-lumina-text",
                                children: [
                                    "Cart (",
                                    cart.length,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 125,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCart([]),
                                className: "text-xs text-rose-400 hover:text-white border border-rose-500/30 px-2 py-1 rounded",
                                children: "CLEAR (F8)"
                            }, void 0, false, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 126,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/sales-manual/page.js",
                        lineNumber: 124,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-4 space-y-2 bg-lumina-base",
                        children: cart.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-center border-b border-lumina-border pb-2 last:border-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 mr-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm font-medium text-lumina-text",
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 131,
                                                columnNumber: 58
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-lumina-muted",
                                                children: [
                                                    item.sku,
                                                    " • ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-lumina-gold",
                                                        children: item.spec
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/sales-manual/page.js",
                                                        lineNumber: 131,
                                                        columnNumber: 185
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 131,
                                                columnNumber: 129
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs font-bold text-lumina-text mt-0.5",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRupiah"])(item.price)
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 131,
                                                columnNumber: 244
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 131,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center bg-lumina-surface rounded border border-lumina-border",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    const n = [
                                                        ...cart
                                                    ];
                                                    if (n[idx].qty > 1) n[idx].qty--;
                                                    else n.splice(idx, 1);
                                                    setCart(n);
                                                },
                                                className: "px-2 text-lumina-muted hover:text-white",
                                                children: "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 132,
                                                columnNumber: 118
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-bold w-6 text-center text-lumina-text",
                                                children: item.qty
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 132,
                                                columnNumber: 297
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    if (item.qty < item.max) {
                                                        const n = [
                                                            ...cart
                                                        ];
                                                        n[idx].qty++;
                                                        setCart(n);
                                                    }
                                                },
                                                className: "px-2 text-lumina-muted hover:text-white",
                                                children: "+"
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 132,
                                                columnNumber: 383
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 132,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, idx, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 130,
                                columnNumber: 25
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/sales-manual/page.js",
                        lineNumber: 128,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-5 border-t border-lumina-border bg-lumina-surface space-y-3 shrink-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "input-luxury py-1.5 text-xs",
                                        value: selectedCustId,
                                        onChange: (e)=>setSelectedCustId(e.target.value),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "Customer (Guest)"
                                            }, void 0, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 137,
                                                columnNumber: 180
                                            }, this),
                                            customers.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: c.id,
                                                    children: c.name
                                                }, c.id, false, {
                                                    fileName: "[project]/app/sales-manual/page.js",
                                                    lineNumber: 137,
                                                    columnNumber: 240
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 137,
                                        columnNumber: 61
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "input-luxury py-1.5 text-xs",
                                        value: paymentAccId,
                                        onChange: (e)=>setPaymentAccId(e.target.value),
                                        children: accounts.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: a.id,
                                                children: a.name
                                            }, a.id, false, {
                                                fileName: "[project]/app/sales-manual/page.js",
                                                lineNumber: 137,
                                                columnNumber: 432
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 137,
                                        columnNumber: 300
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 137,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between pt-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-lumina-muted",
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 138,
                                        columnNumber: 64
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl font-bold text-lumina-gold",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRupiah"])(cartTotal)
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 138,
                                        columnNumber: 112
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 138,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-center bg-lumina-base p-2 rounded border border-lumina-border",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-lumina-muted",
                                        children: "Cash"
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 139,
                                        columnNumber: 127
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        className: "text-right font-bold text-lumina-text bg-transparent outline-none w-32",
                                        value: cashReceived,
                                        onChange: (e)=>setCashReceived(e.target.value),
                                        placeholder: "0"
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 139,
                                        columnNumber: 182
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 139,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-lumina-muted",
                                        children: "Change"
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 140,
                                        columnNumber: 59
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `text-sm font-bold ${change < 0 ? 'text-rose-500' : 'text-emerald-500'}`,
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRupiah"])(Math.max(0, change))
                                    }, void 0, false, {
                                        fileName: "[project]/app/sales-manual/page.js",
                                        lineNumber: 140,
                                        columnNumber: 116
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 140,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleCheckout,
                                className: "btn-gold w-full py-3",
                                children: "PAY (F9)"
                            }, void 0, false, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 141,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/sales-manual/page.js",
                        lineNumber: 136,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/sales-manual/page.js",
                lineNumber: 123,
                columnNumber: 13
            }, this),
            modalVariantOpen && selectedProdForVariant && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "card-luxury w-full max-w-lg p-0 overflow-hidden fade-in-up",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-4 border-b border-lumina-border bg-lumina-surface flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "font-bold text-lumina-text",
                                    children: selectedProdForVariant.name
                                }, void 0, false, {
                                    fileName: "[project]/app/sales-manual/page.js",
                                    lineNumber: 148,
                                    columnNumber: 115
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setModalVariantOpen(false),
                                    className: "text-lumina-muted",
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/app/sales-manual/page.js",
                                    lineNumber: 148,
                                    columnNumber: 192
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/sales-manual/page.js",
                            lineNumber: 148,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-h-[50vh] overflow-y-auto",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                className: "table-dark",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: selectedProdForVariant.variants.sort(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sortBySize"]).map((v)=>{
                                        const qty = snapshots[`${v.id}_${selectedWh}`] || 0;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "pl-4 py-3 font-medium",
                                                    children: [
                                                        v.color,
                                                        "/",
                                                        v.size
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/sales-manual/page.js",
                                                    lineNumber: 149,
                                                    columnNumber: 244
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-right",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRupiah"])(v.price)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/sales-manual/page.js",
                                                    lineNumber: 149,
                                                    columnNumber: 305
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-center",
                                                    children: qty
                                                }, void 0, false, {
                                                    fileName: "[project]/app/sales-manual/page.js",
                                                    lineNumber: 149,
                                                    columnNumber: 360
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "pr-4 text-right",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        disabled: qty <= 0,
                                                        onClick: ()=>addToCart(v, selectedProdForVariant.name),
                                                        className: `px-3 py-1 rounded text-xs font-bold ${qty > 0 ? 'bg-lumina-gold text-black' : 'bg-lumina-highlight text-lumina-muted'}`,
                                                        children: "+ Add"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/sales-manual/page.js",
                                                        lineNumber: 149,
                                                        columnNumber: 430
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/sales-manual/page.js",
                                                    lineNumber: 149,
                                                    columnNumber: 398
                                                }, this)
                                            ]
                                        }, v.id, true, {
                                            fileName: "[project]/app/sales-manual/page.js",
                                            lineNumber: 149,
                                            columnNumber: 229
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/app/sales-manual/page.js",
                                    lineNumber: 149,
                                    columnNumber: 101
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/sales-manual/page.js",
                                lineNumber: 149,
                                columnNumber: 71
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/sales-manual/page.js",
                            lineNumber: 149,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/sales-manual/page.js",
                    lineNumber: 147,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/sales-manual/page.js",
                lineNumber: 146,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/sales-manual/page.js",
        lineNumber: 99,
        columnNumber: 9
    }, this);
}
_s(PosPage, "EI3W48p0uwgfJy0YIEiUnx22zXw=");
_c = PosPage;
var _c;
__turbopack_context__.k.register(_c, "PosPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_ef5f34fb._.js.map