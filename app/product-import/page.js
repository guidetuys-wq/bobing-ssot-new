// app/products-import/page.js
"use client";
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, writeBatch, serverTimestamp, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function ImportProductsPage() {
    const [logs, setLogs] = useState([]);
    const [processing, setProcessing] = useState(false);

    const addLog = (msg, type='info') => setLogs(prev => [...prev, {msg, type}]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        setProcessing(true);
        setLogs([]);

        try {
            // 1. Load Cache
            addLog("Memuat data master...", "info");
            const brandsSnap = await getDocs(collection(db, "brands"));
            const brandsMap = {}; brandsSnap.forEach(d => brandsMap[d.data().name.toLowerCase()] = d.id);

            const prodsSnap = await getDocs(collection(db, "products"));
            const prodMap = {}; prodsSnap.forEach(d => prodMap[d.data().base_sku.toUpperCase()] = d.id);

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const wb = XLSX.read(ev.target.result, {type:'array'});
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                
                addLog(`Mendeteksi ${rows.length} baris data.`, "info");
                
                let success = 0;
                for (const row of rows) {
                    try {
                        const baseSku = String(row['base_sku']||'').toUpperCase().trim();
                        const prodName = row['product_name'];
                        if(!baseSku || !prodName) continue;

                        // Brand
                        let brandId = null;
                        if(row['brand']) {
                            const bName = row['brand'].trim();
                            const bKey = bName.toLowerCase();
                            if(brandsMap[bKey]) brandId = brandsMap[bKey];
                            else {
                                const bRef = await addDoc(collection(db, "brands"), { name: bName, type: 'supplier_brand', created_at: serverTimestamp() });
                                brandId = bRef.id; brandsMap[bKey] = brandId;
                                addLog(`Brand Baru: ${bName}`, "success");
                            }
                        }

                        // Product
                        let prodId = prodMap[baseSku];
                        if(!prodId) {
                            const pRef = await addDoc(collection(db, "products"), {
                                base_sku: baseSku, name: prodName, brand_id: brandId, 
                                category: row['category']||'Uncategorized', status: 'active', created_at: serverTimestamp()
                            });
                            prodId = pRef.id; prodMap[baseSku] = prodId;
                            addLog(`Produk Baru: ${prodName}`, "success");
                        }

                        // Variant
                        const color = String(row['color']||'STD').toUpperCase().replace(/\s+/g, '-');
                        const size = String(row['size']||'ALL').toUpperCase().replace(/\s+/g, '-');
                        const sku = `${baseSku}-${color}-${size}`;
                        
                        // Check duplicate variant
                        const qVar = query(collection(db, "product_variants"), where("sku", "==", sku));
                        const sVar = await getDocs(qVar);
                        
                        if(sVar.empty) {
                            await addDoc(collection(db, "product_variants"), {
                                product_id: prodId, sku, color, size, 
                                cost: parseInt(row['cost']||0), price: parseInt(row['price']||0),
                                weight: parseInt(row['weight']||0), status: 'active', created_at: serverTimestamp()
                            });
                            addLog(`+ Varian: ${sku}`, "success");
                            success++;
                        }
                    } catch(err) { console.error(err); addLog(`Error baris: ${err.message}`, "error"); }
                }
                addLog(`Selesai. ${success} varian ditambahkan.`, "info");
                setProcessing(false);
            };
            reader.readAsArrayBuffer(file);

        } catch(e) { addLog(e.message, "error"); setProcessing(false); }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Import Produk & Varian (CSV/Excel)</h2>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-white transition cursor-pointer relative">
                    <input type="file" accept=".csv, .xlsx" onChange={handleFile} disabled={processing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="pointer-events-none">
                        <p className="text-sm font-bold text-slate-600">Klik untuk upload file</p>
                        <p className="text-xs text-slate-400 mt-1">Kolom: base_sku, product_name, brand, category, color, size, cost, price</p>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl h-64 overflow-y-auto font-mono text-xs">
                {logs.map((l, i) => (
                    <div key={i} className={`mb-1 ${l.type==='error'?'text-red-400':(l.type==='success'?'text-emerald-400':'text-slate-400')}`}>
                        {l.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}