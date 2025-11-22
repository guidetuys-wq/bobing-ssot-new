// app/sales-manual/page.js
"use client";
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, addDoc, serverTimestamp, query, orderBy, where, limit } from 'firebase/firestore';
import { formatRupiah, sortBySize } from '@/lib/utils';

export default function PosPage() {
    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    const [selectedWh, setSelectedWh] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [cashReceived, setCashReceived] = useState('');
    
    // Modals
    const [modalVariantOpen, setModalVariantOpen] = useState(false);
    const [selectedProdForVariant, setSelectedProdForVariant] = useState(null);
    const [modalInvoiceOpen, setModalInvoiceOpen] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [paymentAccId, setPaymentAccId] = useState('');
    const [selectedCustId, setSelectedCustId] = useState('');

    // Refs
    const searchInputRef = useRef(null);

    // --- INIT DATA ---
    useEffect(() => {
        const init = async () => {
            try {
                const [whS, prodS, varS, custS, snapS, accS] = await Promise.all([
                    getDocs(query(collection(db, "warehouses"), orderBy("created_at"))),
                    getDocs(collection(db, "products")),
                    getDocs(query(collection(db, "product_variants"), orderBy("sku"))),
                    getDocs(query(collection(db, "customers"), orderBy("name"))),
                    getDocs(collection(db, "stock_snapshots")),
                    getDocs(query(collection(db, "chart_of_accounts"), orderBy("code")))
                ]);

                const wh = []; whS.forEach(d => wh.push({id:d.id, ...d.data()}));
                setWarehouses(wh);
                if(wh.length > 0) setSelectedWh(wh.find(w=>w.type!=='virtual_supplier')?.id || wh[0].id);

                const cust = []; custS.forEach(d => cust.push({id:d.id, ...d.data()}));
                setCustomers(cust);

                const acc = []; accS.forEach(d => {
                    const c = d.data().category.toLowerCase();
                    if(c.includes('kas') || c.includes('bank')) acc.push({id:d.id, ...d.data()});
                });
                setAccounts(acc);
                const defAcc = acc.find(a => a.code === '1101' || a.code === '1201'); // Default Kas/Bank
                if(defAcc) setPaymentAccId(defAcc.id);

                const snaps = {}; snapS.forEach(d => snaps[d.id] = d.data().qty || 0);
                setSnapshots(snaps);

                // Group Products & Variants
                const vars = []; varS.forEach(d => vars.push({id:d.id, ...d.data()}));
                const prods = []; 
                prodS.forEach(d => {
                    const p = d.data();
                    const pVars = vars.filter(v => v.product_id === d.id);
                    prods.push({ id: d.id, ...p, variants: pVars });
                });
                setProducts(prods);

            } catch(e) { console.error(e); } finally { setLoading(false); }
        };
        init();
    }, []);

    // --- SHORTCUTS ---
    useEffect(() => {
        const handleKey = (e) => {
            if(e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
            if(e.key === 'F9') handleCheckout();
            if(e.key === 'F8') setCart([]);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [cart, paymentAccId, cashReceived]); // Dependencies penting untuk fungsi handleCheckout

    // --- LOGIC ---
    const addToCart = (variant, prodName) => {
        const key = `${variant.id}_${selectedWh}`;
        const max = snapshots[key] || 0;
        
        if(max <= 0) return alert("Stok Habis!");

        const existIdx = cart.findIndex(i => i.id === variant.id);
        if(existIdx > -1) {
            const newCart = [...cart];
            if(newCart[existIdx].qty + 1 > max) return alert("Stok Maksimal Tercapai");
            newCart[existIdx].qty += 1;
            setCart(newCart);
        } else {
            setCart([...cart, {
                id: variant.id, sku: variant.sku, name: prodName, 
                spec: `${variant.color}/${variant.size}`, 
                price: variant.price, cost: variant.cost, qty: 1, max
            }]);
        }
        setModalVariantOpen(false);
        setSearchTerm(''); // Reset search after add
    };

    const handleSearchEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = searchTerm.trim().toUpperCase();
            if(!keyword) return;

            // 1. Cek Exact SKU Match (Barcode Scanner)
            let foundVar = null;
            let foundProd = null;

            for(const p of products) {
                const v = p.variants.find(v => v.sku === keyword || v.barcode === keyword);
                if(v) { foundVar = v; foundProd = p; break; }
            }

            if(foundVar) {
                addToCart(foundVar, foundProd.name);
            } else {
                // Jika tidak exact match, biarkan list terfilter
            }
        }
    };

    const handleCheckout = async () => {
        if(cart.length === 0) return alert("Keranjang kosong");
        if(!paymentAccId) return alert("Pilih metode pembayaran");
        
        const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
        const received = parseInt(cashReceived) || 0;
        // if(received < total) return alert("Uang kurang!"); // Opsional

        if(!confirm("Proses Transaksi?")) return;

        try {
            const orderId = `ORD-${Date.now()}`;
            const custName = selectedCustId ? customers.find(c => c.id === selectedCustId).name : 'Guest';
            const accName = accounts.find(a => a.id === paymentAccId)?.name;

            await runTransaction(db, async (t) => {
                // 1. Sales Order
                const soRef = doc(collection(db, "sales_orders"));
                t.set(soRef, {
                    order_number: orderId, warehouse_id: selectedWh, source: 'pos_manual',
                    customer_id: selectedCustId || null, customer_name: custName,
                    order_date: serverTimestamp(), status: 'completed', payment_status: 'paid',
                    gross_amount: total, net_amount: total, 
                    payment_method: accName, payment_account_id: paymentAccId,
                    items_summary: cart.map(c => `${c.sku}(${c.qty})`).join(', '),
                    created_by: auth.currentUser?.email
                });

                // 2. Items & Stock & Cash
                for(const item of cart) {
                    const itemRef = doc(collection(db, `sales_orders/${soRef.id}/items`));
                    t.set(itemRef, { variant_id: item.id, sku: item.sku, qty: item.qty, unit_price: item.price, unit_cost: item.cost });

                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, {
                        variant_id: item.id, warehouse_id: selectedWh, type: 'sale_out',
                        qty: -item.qty, ref_id: soRef.id, ref_type: 'sales_order',
                        date: serverTimestamp(), notes: `POS ${orderId}`
                    });

                    const snapRef = doc(db, "stock_snapshots", `${item.id}_${selectedWh}`);
                    const snapDoc = await t.get(snapRef);
                    if(snapDoc.exists()) t.update(snapRef, { qty: snapDoc.data().qty - item.qty });
                }

                const cashRef = doc(collection(db, "cash_transactions"));
                t.set(cashRef, {
                    type: 'in', amount: total, date: serverTimestamp(), category: 'penjualan',
                    account_id: paymentAccId, description: `Sales POS ${orderId}`, ref_type: 'sales_order', ref_id: soRef.id
                });

                // Update Saldo Akun
                const accRef = doc(db, "cash_accounts", paymentAccId);
                const accDoc = await t.get(accRef);
                if(accDoc.exists()) t.update(accRef, { balance: (accDoc.data().balance || 0) + total });
            });

            // Success
            setInvoiceData({ 
                id: orderId, date: new Date().toLocaleString(), 
                customer: custName, items: cart, total, 
                received, change: received - total 
            });
            setModalInvoiceOpen(true);
            setCart([]); setCashReceived(''); setSearchTerm('');
            
        } catch(e) { alert(e.message); }
    };

    // --- FILTERED LIST ---
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variants.some(v => v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 20); // Limit display performance

    const cartTotal = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    const change = (parseInt(cashReceived) || 0) - cartTotal;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
            
            {/* LEFT: PRODUCT LIST */}
            <div className="w-full lg:w-2/3 flex flex-col gap-4 h-full">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            className="block w-full pl-10 pr-3 py-2.5 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-bold" 
                            placeholder="Scan Barcode / Cari Produk (F2)..." 
                            autoFocus
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearchEnter}
                        />
                    </div>
                    <select className="w-full sm:w-48 border-slate-200 rounded-lg py-2.5 px-3 text-sm font-bold" value={selectedWh} onChange={e=>setSelectedWh(e.target.value)}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto px-1 pb-20 scrollbar-hide space-y-2">
                    {loading ? <div className="text-center py-10">Loading...</div> : filteredProducts.map(p => {
                        const totalStock = p.variants.reduce((a,b) => a + (snapshots[`${b.id}_${selectedWh}`] || 0), 0);
                        return (
                            <div key={p.id} onClick={() => { setSelectedProdForVariant(p); setModalVariantOpen(true); }} 
                                className={`grid grid-cols-12 gap-4 p-3 items-center rounded-lg border border-slate-100 cursor-pointer transition-colors ${totalStock > 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 opacity-70'}`}>
                                <div className="col-span-8">
                                    <div className="text-xs font-bold text-slate-400 uppercase">{p.base_sku}</div>
                                    <h4 className="text-sm font-bold text-slate-800 truncate">{p.name}</h4>
                                </div>
                                <div className="col-span-4 text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${totalStock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {totalStock > 0 ? `${totalStock} Ready` : 'Habis'}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT: CART */}
            <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Keranjang ({cart.length})</h3>
                    <button onClick={()=>setCart([])} className="text-xs text-red-500 font-bold hover:text-red-700">RESET (F8)</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length===0 ? <div className="text-center text-slate-400 py-10 italic">Scan barang...</div> : cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-2">
                            <div>
                                <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                <div className="text-xs text-slate-500">{item.sku} • {item.spec}</div>
                                <div className="text-xs font-bold text-indigo-600">{formatRupiah(item.price)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    const newCart = [...cart];
                                    if(newCart[idx].qty > 1) newCart[idx].qty--; else newCart.splice(idx, 1);
                                    setCart(newCart);
                                }} className="px-2 bg-slate-100 rounded font-bold">-</button>
                                <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                                <button onClick={() => {
                                    if(item.qty < item.max) {
                                        const newCart = [...cart]; newCart[idx].qty++; setCart(newCart);
                                    } else alert("Max stok");
                                }} className="px-2 bg-slate-100 rounded font-bold">+</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3 shadow-inner">
                    <div className="grid grid-cols-2 gap-3">
                        <select className="border p-2 rounded text-sm" value={selectedCustId} onChange={e=>setSelectedCustId(e.target.value)}>
                            <option value="">-- Tamu (Guest) --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select className="border p-2 rounded text-sm" value={paymentAccId} onChange={e=>setPaymentAccId(e.target.value)}>
                            <option value="">-- Akun Pembayaran --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-slate-500">Total</span>
                        <span className="text-2xl font-extrabold text-indigo-700">{formatRupiah(cartTotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Diterima</span>
                        <input type="number" className="w-32 border-b-2 border-slate-300 bg-transparent text-right font-bold focus:outline-none focus:border-indigo-500" 
                            value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder="0" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-400">Kembali</span>
                        <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatRupiah(Math.max(0, change))}</span>
                    </div>

                    <button onClick={handleCheckout} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98]">
                        BAYAR SEKARANG (F9)
                    </button>
                </div>
            </div>

            {/* MODAL VARIANT SELECT */}
            {modalVariantOpen && selectedProdForVariant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold text-lg">{selectedProdForVariant.name}</h3>
                            <button onClick={()=>setModalVariantOpen(false)} className="text-xl">&times;</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead><tr><th className="text-left p-2">Varian</th><th className="text-right p-2">Harga</th><th className="text-center p-2">Stok</th><th className="text-center p-2">Aksi</th></tr></thead>
                                <tbody>
                                    {selectedProdForVariant.variants.sort(sortBySize).map(v => {
                                        const qty = snapshots[`${v.id}_${selectedWh}`] || 0;
                                        return (
                                            <tr key={v.id} className="border-b">
                                                <td className="p-2 font-bold">{v.color} / {v.size}</td>
                                                <td className="p-2 text-right">{formatRupiah(v.price)}</td>
                                                <td className="p-2 text-center">{qty}</td>
                                                <td className="p-2 text-center">
                                                    <button disabled={qty<=0} onClick={()=>addToCart(v, selectedProdForVariant.name)} 
                                                        className={`px-3 py-1 rounded text-xs font-bold ${qty>0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                        + Add
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL INVOICE SUCCESS */}
            {modalInvoiceOpen && invoiceData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Transaksi Sukses!</h2>
                        <p className="text-sm text-slate-500 mt-1">{invoiceData.id}</p>
                        
                        <div className="mt-6 bg-slate-50 p-4 rounded-xl text-sm space-y-2 border border-slate-100">
                            <div className="flex justify-between"><span>Total</span><span className="font-bold">{formatRupiah(invoiceData.total)}</span></div>
                            <div className="flex justify-between"><span>Bayar</span><span className="font-bold">{formatRupiah(invoiceData.received)}</span></div>
                            <div className="flex justify-between text-emerald-600 border-t border-slate-200 pt-2"><span>Kembali</span><span className="font-bold">{formatRupiah(invoiceData.change > 0 ? invoiceData.change : 0)}</span></div>
                        </div>

                        <button onClick={()=>setModalInvoiceOpen(false)} className="mt-6 w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900">Tutup / Transaksi Baru</button>
                    </div>
                </div>
            )}
        </div>
    );
}