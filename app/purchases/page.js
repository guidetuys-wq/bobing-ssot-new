// app/purchases/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, runTransaction, query, orderBy, limit, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';

export default function PurchasesPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Modal Baru
    const [modalOpen, setModalOpen] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [cart, setCart] = useState([]);
    const [formData, setFormData] = useState({ supplier_id: '', warehouse_id: '', date: '', isPaid: false });
    const [inputItem, setInputItem] = useState({ variant_id: '', qty: '', cost: '' });

    // State Modal Detail
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poItems, setPoItems] = useState([]);
    const [poPayments, setPoPayments] = useState([]);

    useEffect(() => {
        fetchHistory();
        fetchMasterData();
    }, []);

    const fetchHistory = async () => {
        try {
            const q = query(collection(db, "purchase_orders"), orderBy("order_date", "desc"), limit(50));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({id: d.id, ...d.data()}));
            setHistory(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchMasterData = async () => {
        const [sWh, sSupp, sProd, sVar] = await Promise.all([
            getDocs(query(collection(db, "warehouses"), orderBy("created_at"))),
            getDocs(query(collection(db, "suppliers"), orderBy("name"))),
            getDocs(collection(db, "products")),
            getDocs(query(collection(db, "product_variants"), orderBy("sku")))
        ]);
        const wh = []; sWh.forEach(d => { if(d.data().type==='physical' || !d.data().type) wh.push({id:d.id, ...d.data()}) });
        setWarehouses(wh);
        
        const sup = []; sSupp.forEach(d => sup.push({id:d.id, ...d.data()}));
        setSuppliers(sup);

        const prod = []; sProd.forEach(d => prod.push({id:d.id, ...d.data()}));
        setProducts(prod);

        const vr = []; sVar.forEach(d => vr.push({id:d.id, ...d.data()}));
        setVariants(vr);
    };

    const addItem = () => {
        const { variant_id, qty, cost } = inputItem;
        if(!variant_id || !qty || !cost) return alert("Lengkapi data item");
        const v = variants.find(x => x.id === variant_id);
        const p = products.find(x => x.id === v.product_id);
        
        const newItem = {
            variant_id, 
            sku: v.sku,
            name: p?.name || 'Unknown',
            spec: `${v.color}/${v.size}`,
            qty: parseInt(qty),
            unit_cost: parseInt(cost)
        };
        setCart([...cart, newItem]);
        setInputItem({ variant_id: '', qty: '', cost: '' });
    };

    const submitPO = async (e) => {
        e.preventDefault();
        if(cart.length === 0) return alert("Keranjang kosong");
        
        try {
            const totalAmount = cart.reduce((a,b) => a + (b.qty * b.unit_cost), 0);
            const totalQty = cart.reduce((a,b) => a + b.qty, 0);
            const supplierName = suppliers.find(s => s.id === formData.supplier_id)?.name;

            await runTransaction(db, async (t) => {
                // 1. Create PO
                const poRef = doc(collection(db, "purchase_orders"));
                t.set(poRef, {
                    supplier_name: supplierName,
                    warehouse_id: formData.warehouse_id,
                    order_date: new Date(formData.date),
                    status: 'received_full',
                    total_amount: totalAmount,
                    total_qty: totalQty,
                    payment_status: formData.isPaid ? 'paid' : 'unpaid',
                    created_at: serverTimestamp(),
                    created_by: user?.email
                });

                // 2. Items & Stock & Cash
                for(const item of cart) {
                    const itemRef = doc(collection(db, `purchase_orders/${poRef.id}/items`));
                    t.set(itemRef, { variant_id: item.variant_id, qty: item.qty, unit_cost: item.unit_cost, subtotal: item.qty*item.unit_cost });

                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, {
                        variant_id: item.variant_id, warehouse_id: formData.warehouse_id, type: 'purchase_in',
                        qty: item.qty, unit_cost: item.unit_cost, ref_id: poRef.id, ref_type: 'purchase_order',
                        date: serverTimestamp(), notes: `PO from ${supplierName}`
                    });

                    const snapRef = doc(db, "stock_snapshots", `${item.variant_id}_${formData.warehouse_id}`);
                    const snapDoc = await t.get(snapRef);
                    if(snapDoc.exists()) t.update(snapRef, { qty: (snapDoc.data().qty||0) + item.qty });
                    else t.set(snapRef, { id: snapRef.id, variant_id: item.variant_id, warehouse_id: formData.warehouse_id, qty: item.qty });
                }

                if(formData.isPaid) {
                    const cashRef = doc(collection(db, "cash_transactions"));
                    t.set(cashRef, {
                        type: 'out', amount: totalAmount, date: serverTimestamp(),
                        ref_type: 'purchase_order', ref_id: poRef.id,
                        category: 'pembelian', description: `Bayar PO ${supplierName}`
                    });
                }
            });
            alert("PO Berhasil Disimpan!");
            setModalOpen(false);
            fetchHistory();
        } catch(e) { alert(e.message); }
    };

    const openDetail = async (po) => {
        setSelectedPO(po);
        setDetailOpen(true);
        // Fetch items
        const itemsSnap = await getDocs(collection(db, `purchase_orders/${po.id}/items`));
        const items = []; itemsSnap.forEach(d => items.push(d.data()));
        
        // Map names
        const mappedItems = items.map(i => {
            const v = variants.find(x => x.id === i.variant_id);
            const p = v ? products.find(x => x.id === v.product_id) : null;
            return { ...i, name: p?.name, sku: v?.sku, spec: v ? `${v.color}/${v.size}` : '' };
        });
        setPoItems(mappedItems);

        // Fetch payments
        const paySnap = await getDocs(collection(db, `purchase_orders/${po.id}/payments`));
        const pays = []; paySnap.forEach(d => pays.push(d.data()));
        setPoPayments(pays);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Purchase Orders</h2>
                    <p className="text-sm text-slate-500">Restock barang & update inventory.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/purchases-import" className="px-4 py-2.5 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100">
                        Import Excel
                    </Link>
                    <button onClick={() => { setFormData({supplier_id:'', warehouse_id:'', date: new Date().toISOString().split('T')[0], isPaid: false}); setCart([]); setModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg">
                        Buat PO Baru
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500">Tanggal</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500">Supplier</th>
                            <th className="px-6 py-4 text-right font-bold text-slate-500">Total</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500">Status Bayar</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {loading ? <tr><td colSpan="5" className="text-center py-10">Loading...</td></tr> : history.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-slate-600">{new Date(h.order_date.toDate()).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{h.supplier_name}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{formatRupiah(h.total_amount)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${h.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {h.payment_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => openDetail(h)} className="text-indigo-600 hover:underline font-bold">Detail</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL NEW PO */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Input Stok Masuk (PO)</h3>
                        <form onSubmit={submitPO} className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <select required className="border p-2 rounded" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                                    <option value="">-- Supplier --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select required className="border p-2 rounded" value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}>
                                    <option value="">-- Gudang Tujuan --</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <input type="date" required className="border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>

                            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-6">
                                        <label className="text-xs font-bold">Produk SKU</label>
                                        <select className="w-full border p-2 rounded text-sm" value={inputItem.variant_id} onChange={e => {
                                            const v = variants.find(x=>x.id===e.target.value);
                                            setInputItem({...inputItem, variant_id: e.target.value, cost: v?.cost || ''})
                                        }}>
                                            <option value="">-- Pilih Produk --</option>
                                            {variants.map(v => {
                                                const p = products.find(x=>x.id===v.product_id);
                                                return <option key={v.id} value={v.id}>{v.sku} - {p?.name} ({v.color}/{v.size})</option>
                                            })}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold">Qty</label>
                                        <input type="number" className="w-full border p-2 rounded" value={inputItem.qty} onChange={e=>setInputItem({...inputItem, qty:e.target.value})} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-xs font-bold">Cost</label>
                                        <input type="number" className="w-full border p-2 rounded" value={inputItem.cost} onChange={e=>setInputItem({...inputItem, cost:e.target.value})} />
                                    </div>
                                    <div className="col-span-1">
                                        <button type="button" onClick={addItem} className="w-full bg-slate-800 text-white p-2 rounded font-bold">+</button>
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-sm border">
                                <thead className="bg-slate-100"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Total</th></tr></thead>
                                <tbody>
                                    {cart.map((c, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2">{c.name} <span className="text-xs text-slate-500">{c.sku}</span></td>
                                            <td className="p-2 text-right">{c.qty}</td>
                                            <td className="p-2 text-right">{formatRupiah(c.qty*c.unit_cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex items-center gap-2 bg-amber-50 p-3 rounded border border-amber-100">
                                <input type="checkbox" id="isPaid" checked={formData.isPaid} onChange={e => setFormData({...formData, isPaid: e.target.checked})} />
                                <label htmlFor="isPaid" className="text-sm font-bold text-amber-800">Sudah Lunas (Catat Pengeluaran Kas)</label>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded text-slate-600 font-bold">Batal</button>
                                <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white font-bold">Simpan PO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL */}
            {detailOpen && selectedPO && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Detail PO</h3>
                            <button onClick={() => setDetailOpen(false)} className="text-2xl">&times;</button>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Supplier: <strong>{selectedPO.supplier_name}</strong></span>
                                <span>Status: <strong>{selectedPO.payment_status}</strong></span>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50"><tr><th className="p-2 text-left">Produk</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Subtotal</th></tr></thead>
                                <tbody>
                                    {poItems.map((i, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2">{i.name} <br/><span className="text-xs text-slate-500">{i.sku}</span></td>
                                            <td className="p-2 text-right">{i.qty}</td>
                                            <td className="p-2 text-right">{formatRupiah(i.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold">
                                    <tr><td colSpan="2" className="p-2 text-right">Total</td><td className="p-2 text-right">{formatRupiah(selectedPO.total_amount)}</td></tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}