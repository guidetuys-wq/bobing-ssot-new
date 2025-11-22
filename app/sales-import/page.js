// app/sales-import/page.js
"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, orderBy, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';

export default function ImportSalesPage() {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [config, setConfig] = useState({ warehouse_id: '', account_id: '', packing_cost: 1000 });
    const [logs, setLogs] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const init = async () => {
            const whSnap = await getDocs(query(collection(db, "warehouses"), orderBy("created_at")));
            const whData = []; whSnap.forEach(d => { if(d.data().type!=='virtual_supplier') whData.push({id:d.id, ...d.data()}) });
            setWarehouses(whData);

            const accSnap = await getDocs(query(collection(db, "chart_of_accounts"), orderBy("code")));
            const accData = []; accSnap.forEach(d => { 
                const c = d.data().category.toLowerCase();
                if(c.includes('aset') || c.includes('kas') || c.includes('bank')) accData.push({id:d.id, ...d.data()});
            });
            setAccounts(accData);
        };
        init();
    }, []);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !config.warehouse_id || !config.account_id) return alert("Lengkapi konfigurasi gudang & akun!");

        setProcessing(true);
        setLogs(["Mulai...", "Memuat Master SKU..."]);

        try {
            // 1. Master SKU
            const varMap = {};
            const vSnap = await getDocs(collection(db, "product_variants"));
            vSnap.forEach(d => { const v=d.data(); if(v.sku) varMap[v.sku.toUpperCase().trim()] = {id:d.id, ...v}; });

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const wb = XLSX.read(ev.target.result, {type:'array'});
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                
                // 2. Group Orders
                const orders = {};
                rows.forEach(r => {
                    const keys = Object.keys(r);
                    const kId = keys.find(k => k.match(/nomor pesanan|order id|invoice/i));
                    const kSku = keys.find(k => k.match(/sku|product id/i));
                    if(kId && kSku && r[kId]) {
                        const id = String(r[kId]).trim();
                        if(!orders[id]) orders[id] = { items: [], raw: r };
                        orders[id].items.push(r);
                    }
                });

                const batch = writeBatch(db);
                let count = 0;

                for(const [id, data] of Object.entries(orders)) {
                    const head = data.raw;
                    const ks = Object.keys(head);
                    
                    // Detect Status
                    const kStatus = ks.find(k => k.match(/status/i));
                    const statusRaw = head[kStatus]?.toLowerCase() || 'completed';
                    if(statusRaw.includes('cancel')) { addLog(`SKIP ${id}: Cancelled`); continue; }

                    // Detect Amounts
                    const kNet = ks.find(k => k.match(/settlement|penyelesaian|net/i));
                    const kGross = ks.find(k => k.match(/total|gross|subtotal/i));
                    const netAmount = parseFloat(String(head[kNet]||0).replace(/[^\d.-]/g,'')) || 0;
                    const grossAmount = parseFloat(String(head[kGross]||0).replace(/[^\d.-]/g,'')) || 0;

                    // Check Existing
                    const qEx = query(collection(db, "sales_orders"), where("order_number", "==", id));
                    const sEx = await getDocs(qEx);
                    
                    if(!sEx.empty) {
                        // Update Status Only
                        const exDoc = sEx.docs[0];
                        if(exDoc.data().status !== statusRaw) {
                            batch.update(doc(db, "sales_orders", exDoc.id), { status: statusRaw, updated_at: serverTimestamp() });
                            addLog(`UPDATE ${id}: Status -> ${statusRaw}`);
                        }
                    } else {
                        // Create New
                        const poRef = doc(collection(db, "sales_orders"));
                        const kDate = ks.find(k => k.match(/date|tanggal/i));
                        
                        batch.set(poRef, {
                            order_number: id, 
                            marketplace_ref: id,
                            source: 'import',
                            warehouse_id: config.warehouse_id,
                            order_date: head[kDate] ? new Date(head[kDate]) : new Date(),
                            status: statusRaw,
                            payment_status: statusRaw === 'completed' ? 'paid' : 'unpaid',
                            gross_amount: grossAmount,
                            net_amount: netAmount || grossAmount,
                            created_at: serverTimestamp(),
                            created_by: user?.email
                        });

                        // Items
                        data.items.forEach(item => {
                            const kSku = Object.keys(item).find(k => k.match(/sku/i));
                            const kQty = Object.keys(item).find(k => k.match(/qty|jumlah/i));
                            const sku = String(item[kSku]).toUpperCase().trim();
                            const qty = parseInt(item[kQty]||1);
                            
                            const v = varMap[sku];
                            if(v) {
                                batch.set(doc(collection(db, `sales_orders/${poRef.id}/items`)), {
                                    variant_id: v.id, sku: v.sku, qty: qty, unit_price: 0, unit_cost: v.cost
                                });
                                batch.set(doc(collection(db, "stock_movements")), {
                                    variant_id: v.id, warehouse_id: config.warehouse_id, type: 'sale_out',
                                    qty: -qty, ref_id: poRef.id, ref_type: 'sales_order',
                                    date: serverTimestamp(), notes: `Import ${id}`
                                });
                            }
                        });

                        // Auto Journal Cash if Completed
                        if(statusRaw === 'completed') {
                            const cashRef = doc(collection(db, "cash_transactions"));
                            batch.set(cashRef, {
                                type: 'in', amount: netAmount || grossAmount, date: serverTimestamp(),
                                category: 'penjualan', account_id: config.account_id,
                                description: `Settlement ${id}`, ref_type: 'sales_order', ref_id: poRef.id
                            });
                        }
                        count++;
                        addLog(`NEW ${id}: Created`);
                    }
                }

                await batch.commit();
                addLog(`SELESAI! Proses ${count} order baru.`);
                setProcessing(false);
            };
            reader.readAsArrayBuffer(file);

        } catch(e) { console.error(e); addLog(`ERROR: ${e.message}`); setProcessing(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Import Penjualan Desty/Marketplace</h2>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gudang Stok</label>
                        <select className="w-full border p-2 rounded text-sm" value={config.warehouse_id} onChange={e=>setConfig({...config, warehouse_id:e.target.value})}>
                            <option value="">Pilih Gudang</option>
                            {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Dompet Saldo MP</label>
                        <select className="w-full border border-emerald-300 bg-emerald-50 p-2 rounded text-sm font-bold" value={config.account_id} onChange={e=>setConfig({...config, account_id:e.target.value})}>
                            <option value="">Pilih Akun</option>
                            {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Biaya Packing (Opsional)</label>
                        <input type="number" className="w-full border p-2 rounded text-sm" value={config.packing_cost} onChange={e=>setConfig({...config, packing_cost:e.target.value})} />
                    </div>
                </div>

                <div className="border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl p-8 text-center">
                    <input type="file" accept=".xlsx, .csv" onChange={handleFile} disabled={processing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
                    <p className="text-xs text-slate-400 mt-2">Format Desty Laporan Pesanan (Excel)</p>
                </div>
            </div>
            <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto">
                {logs.length === 0 ? "Ready..." : logs.map((l,i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}