// app/(dashboard)/purchases/import/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, orderBy, increment, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { formatRupiah } from '@/lib/utils';
import { 
    UploadCloud, FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle, 
    Building, Truck, ArrowRight, Save 
} from 'lucide-react';

// --- INTEGRASI FINANCE SSOT ---
import { recordPurchaseTransaction } from '@/lib/transactionService';

// Cache Configuration
const CACHE_KEY_VARIANTS = 'lumina_variants_import_v2';

export default function ImportPurchasesPage() {
    const { user } = useAuth();
    
    // Config Data
    const [warehouses, setWarehouses] = useState([]);
    const [financeConfig, setFinanceConfig] = useState(null);
    const [config, setConfig] = useState({ warehouse_id: '' });
    
    // Process State
    const [rawFile, setRawFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState(1);
    const [previewData, setPreviewData] = useState(null);
    const [validationIssues, setValidationIssues] = useState([]);

    // 1. Initial Load (Warehouses & Finance Config)
    useEffect(() => {
        const init = async () => {
            try {
                const [whSnap, settingSnap] = await Promise.all([
                    getDocs(query(collection(db, "warehouses"), orderBy("created_at"))),
                    getDoc(doc(db, "settings", "general"))
                ]);

                const whList = whSnap.docs.map(d => ({id:d.id, ...d.data()}));
                setWarehouses(whList);
                if (whList.length > 0) setConfig({ warehouse_id: whList[0].id });

                if (settingSnap.exists()) {
                    setFinanceConfig(settingSnap.data().financeConfig);
                } else {
                    toast.error("Finance Config belum disetting!");
                }
            } catch (e) { console.error(e); }
        };
        init();
    }, []);

    // 2. Load Master Variants for Mapping
    const getVariantMap = async () => {
        const snap = await getDocs(collection(db, "product_variants"));
        const map = {};
        snap.forEach(d => {
            const v = d.data();
            if(v.sku) map[v.sku.toUpperCase().trim()] = { id: d.id, ...v };
        });
        return map;
    };

    // 3. Process File Logic
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!config.warehouse_id) return toast.error("Pilih gudang tujuan dulu!");
        
        setRawFile(file);
        setProcessing(true);

        try {
            const varMap = await getVariantMap();
            const reader = new FileReader();
            
            reader.onload = (ev) => {
                const wb = XLSX.read(ev.target.result, {type:'array'});
                const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                
                // Group by Supplier or Invoice Number (Assume 'no_invoice' or 'supplier')
                const pos = {};
                const issues = [];
                let grandTotal = 0;

                rawRows.forEach((row, idx) => {
                    // Normalisasi Keys (Lowercase)
                    const r = {};
                    Object.keys(row).forEach(k => r[k.toLowerCase().trim()] = row[k]);

                    const sku = String(r['sku'] || '').toUpperCase().trim();
                    const qty = parseFloat(r['qty'] || r['jumlah'] || 0);
                    const cost = parseFloat(r['cost'] || r['harga beli'] || r['hpp'] || 0);
                    const supplier = r['supplier'] || 'Unknown Supplier';
                    const invoice = r['invoice'] || r['no po'] || `IMP-${Date.now()}`;

                    if (!sku || qty <= 0) return; // Skip invalid rows

                    const variant = varMap[sku];
                    if (!variant) {
                        issues.push({ row: idx+2, sku, msg: 'SKU tidak ditemukan di database' });
                        return;
                    }

                    if (!pos[invoice]) {
                        pos[invoice] = {
                            supplier_name: supplier,
                            invoice_number: invoice,
                            items: [],
                            total_amount: 0,
                            total_qty: 0
                        };
                    }

                    const subtotal = qty * cost;
                    pos[invoice].items.push({
                        variant_id: variant.id,
                        sku: variant.sku,
                        product_name: `Import: ${variant.sku}`, // Simplifikasi
                        qty,
                        unit_cost: cost,
                        subtotal
                    });
                    
                    pos[invoice].total_amount += subtotal;
                    pos[invoice].total_qty += qty;
                    grandTotal += subtotal;
                });

                setPreviewData({ pos: Object.values(pos), grandTotal });
                setValidationIssues(issues);
                setStep(2);
                setProcessing(false);
            };
            reader.readAsArrayBuffer(file);

        } catch (e) {
            console.error(e);
            toast.error("Gagal membaca file: " + e.message);
            setProcessing(false);
        }
    };

    // 4. Commit & Journaling (The Fix)
    const handleCommit = async () => {
        if (!financeConfig) return toast.error("Finance Config Missing!");
        
        setProcessing(true);
        const tId = toast.loading("Importing & Journaling...");
        
        try {
            let batch = writeBatch(db);
            let opCount = 0;

            for (const po of previewData.pos) {
                const poRef = doc(collection(db, "purchase_orders"));
                
                // A. Create PO Document
                const poData = {
                    supplier_name: po.supplier_name,
                    warehouse_id: config.warehouse_id,
                    order_date: new Date(),
                    status: 'received_full', // Langsung masuk stok
                    total_amount: po.total_amount,
                    total_qty: po.total_qty,
                    payment_status: 'unpaid', // Masuk Hutang dulu
                    source: 'excel_import',
                    external_invoice: po.invoice_number,
                    created_at: serverTimestamp(),
                    imported_by: user?.email
                };
                
                batch.set(poRef, poData);
                opCount++;

                // B. Items & Stock Movement
                for (const item of po.items) {
                    const itemRef = doc(collection(db, `purchase_orders/${poRef.id}/items`));
                    batch.set(itemRef, item);
                    opCount++;

                    // Movement
                    const moveRef = doc(collection(db, "stock_movements"));
                    batch.set(moveRef, {
                        variant_id: item.variant_id,
                        warehouse_id: config.warehouse_id,
                        type: 'purchase_in',
                        qty: item.qty,
                        unit_cost: item.unit_cost,
                        ref_id: poRef.id,
                        ref_type: 'purchase_import',
                        date: serverTimestamp()
                    });
                    opCount++;

                    // Snapshot Update
                    const snapRef = doc(db, "stock_snapshots", `${item.variant_id}_${config.warehouse_id}`);
                    batch.set(snapRef, { 
                        id: `${item.variant_id}_${config.warehouse_id}`,
                        variant_id: item.variant_id, 
                        warehouse_id: config.warehouse_id, 
                        qty: increment(item.qty) 
                    }, { merge: true });
                    opCount++;
                }

                // C. FINANCE JURNAL (SSOT)
                // Debit: Inventory (1301), Kredit: Hutang Usaha (2101)
                recordPurchaseTransaction(db, batch, {
                    poId: poRef.id,
                    totalAmount: po.total_amount,
                    isPaid: false, // Default Unpaid (Hutang)
                    walletId: null,
                    supplierName: po.supplier_name,
                    financeConfig: financeConfig
                });

                // Batch Limiter
                if(opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
            }

            if(opCount > 0) await batch.commit();

            // Clear Cache
            localStorage.removeItem('lumina_inventory_v2');
            localStorage.removeItem('lumina_purchases_history_v2');
            localStorage.removeItem('lumina_balance_v2'); // Refresh Neraca

            toast.success("Import Berhasil!", { id: tId });
            setStep(1); setPreviewData(null); setRawFile(null);

        } catch (e) {
            console.error(e);
            toast.error("Gagal Import: " + e.message, { id: tId });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in pb-20">
            <PageHeader 
                title="Import Pembelian (PO)" 
                subtitle="Upload data pembelian dari Excel. Stok & Hutang tercatat otomatis." 
            />

            {/* CONFIG */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <label className="text-xs font-bold text-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4"/> Gudang Tujuan
                </label>
                <div className="relative max-w-md">
                    <select 
                        className="input-luxury appearance-none" 
                        value={config.warehouse_id} 
                        onChange={e=>setConfig({...config, warehouse_id:e.target.value})}
                        disabled={step===2}
                    >
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <ArrowRight className="w-4 h-4 absolute right-3 top-3 text-gray-400 rotate-90"/>
                </div>
            </div>

            {/* STEP 1: UPLOAD */}
            {step === 1 && (
                <div className="border-2 border-dashed border-border hover:border-primary/50 bg-white rounded-2xl p-12 text-center relative group">
                    <input type="file" accept=".xlsx, .csv" onChange={handleFileChange} disabled={processing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <UploadCloud className="w-8 h-8"/>
                        </div>
                        <h3 className="font-bold text-lg text-text-primary">Upload Excel Pembelian</h3>
                        <p className="text-sm text-text-secondary">Kolom Wajib: SKU, Qty, Cost (HPP)</p>
                        <div className="flex gap-2 text-xs bg-gray-100 px-3 py-1 rounded-lg mt-2">
                            <FileSpreadsheet className="w-3 h-3"/> .xlsx / .csv
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 2 && previewData && (
                <div className="space-y-6 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-xs font-bold text-text-secondary uppercase">Total PO Valid</p>
                            <h3 className="text-2xl font-bold text-primary">{previewData.pos.length} Invoice</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-xs font-bold text-text-secondary uppercase">Total Nilai Hutang</p>
                            <h3 className="text-2xl font-bold text-rose-600">{formatRupiah(previewData.grandTotal)}</h3>
                        </div>
                    </div>

                    {validationIssues.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                            <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4"/> {validationIssues.length} Isu Ditemukan
                            </h4>
                            <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
                                {validationIssues.slice(0, 5).map((iss, i) => (
                                    <li key={i}>Baris {iss.row}: {iss.msg} ({iss.sku})</li>
                                ))}
                                {validationIssues.length > 5 && <li>...dan {validationIssues.length - 5} lainnya</li>}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={() => { setStep(1); setRawFile(null); }} className="btn-ghost-dark flex-1">Batal</button>
                        <button onClick={handleCommit} disabled={processing} className="btn-primary flex-1 shadow-lg flex items-center justify-center gap-2">
                            {processing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            PROSES IMPORT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}