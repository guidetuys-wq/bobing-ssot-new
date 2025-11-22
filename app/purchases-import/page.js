// app/purchases-import/page.js
"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';

export default function ImportPurchasesPage() {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWh, setSelectedWh] = useState('');
    const [logs, setLogs] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchWh = async () => {
            const q = query(collection(db, "warehouses"), orderBy("created_at"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => { if(d.data().type === 'physical' || !d.data().type) data.push({id:d.id, ...d.data()}) });
            setWarehouses(data);
        };
        fetchWh();
    }, []);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedWh) return alert("Pilih gudang dan file!");
        
        setProcessing(true);
        setLogs(["Membaca file...", "Memuat Master SKU..."]);

        try {
            // 1. Load Master Variants
            const varSnap = await getDocs(collection(db, "product_variants"));
            const varMap = {};
            varSnap.forEach(d => {
                const v = d.data();
                if(v.sku) varMap[v.sku.toUpperCase().trim()] = { id: d.id, ...v };
            });

            // 2. Read File
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const workbook = XLSX.read(ev.target.result, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);

                if (rows.length === 0) { setProcessing(false); return alert("File kosong"); }

                // 3. Group by Invoice/PO Ref
                const groups = {};
                rows.forEach(row => {
                    // Auto detect keys (case insensitive)
                    const keys = Object.keys(row);
                    const kInv = keys.find(k => k.match(/invoice|stock in id/i));
                    const kSku = keys.find(k => k.match(/sku|varian id/i));
                    const kQty = keys.find(k => k.match(/qty|jumlah/i));
                    const kCost = keys.find(k => k.match(/cost|harga/i));

                    if (kInv && kSku && row[kInv]) {
                        const inv = row[kInv];
                        if (!groups[inv]) groups[inv] = [];
                        groups[inv].push({
                            sku: String(row[kSku]).toUpperCase().trim(),
                            qty: parseInt(row[kQty] || 0),
                            cost: parseInt(row[kCost] || 0)
                        });
                    }
                });

                // 4. Process Groups
                const batch = writeBatch(db);
                let poCount = 0;

                for (const [inv, items] of Object.entries(groups)) {
                    const validItems = [];
                    let totalAmount = 0;
                    let totalQty = 0;

                    items.forEach(item => {
                        const v = varMap[item.sku];
                        if (v) {
                            validItems.push({ ...item, variant_id: v.id });
                            totalAmount += (item.qty * item.cost);
                            totalQty += item.qty;
                        } else {
                            addLog(`[SKIP] SKU tidak ditemukan: ${item.sku}`);
                        }
                    });

                    if (validItems.length > 0) {
                        const poRef = doc(collection(db, "purchase_orders"));
                        batch.set(poRef, {
                            supplier_name: 'Imported',
                            warehouse_id: selectedWh,
                            order_date: serverTimestamp(),
                            status: 'received_full',
                            total_amount: totalAmount,
                            total_qty: totalQty,
                            payment_status: 'unpaid',
                            notes: `Import Ref: ${inv}`,
                            created_at: serverTimestamp(),
                            created_by: user?.email
                        });

                        validItems.forEach(item => {
                            const itemRef = doc(collection(db, `purchase_orders/${poRef.id}/items`));
                            batch.set(itemRef, { variant_id: item.variant_id, qty: item.qty, unit_cost: item.cost, subtotal: item.qty*item.cost });

                            const moveRef = doc(collection(db, "stock_movements"));
                            batch.set(moveRef, {
                                variant_id: item.variant_id, warehouse_id: selectedWh, type: 'purchase_in',
                                qty: item.qty, unit_cost: item.cost, ref_id: poRef.id, ref_type: 'purchase_order',
                                date: serverTimestamp(), notes: `Import ${inv}`
                            });
                        });
                        poCount++;
                        addLog(`[OK] PO ${inv}: ${validItems.length} items`);
                    }
                }

                await batch.commit();
                addLog(`SELESAI! Berhasil import ${poCount} PO.`);
                setProcessing(false);
            };
            reader.readAsArrayBuffer(file);

        } catch (e) { 
            console.error(e); 
            addLog(`ERROR: ${e.message}`); 
            setProcessing(false); 
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Import Stok Masuk (PO)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-1">1. Pilih Gudang Tujuan</label>
                        <select className="w-full border p-2 rounded" value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
                            <option value="">-- Pilih Gudang --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">2. Upload File (Excel/CSV)</label>
                        <input type="file" accept=".csv, .xlsx" onChange={handleFile} disabled={processing} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    </div>
                </div>
            </div>
            <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto">
                {logs.length === 0 ? "Menunggu proses..." : logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}