// app/finance-balance/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';

export default function BalanceSheetPage() {
    const [assets, setAssets] = useState({ cash: 0, inventory: 0, receivable: 0, listCash: [] });
    const [liabilities, setLiabilities] = useState({ payable: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => { calculate(); }, []);

    const calculate = async () => {
        setLoading(true);
        try {
            // 1. ASSETS: CASH
            const snapCash = await getDocs(collection(db, "cash_accounts"));
            let totalCash = 0;
            const listCash = [];
            snapCash.forEach(doc => {
                const d = doc.data();
                totalCash += (d.balance || 0);
                listCash.push({ name: d.name, val: d.balance || 0 });
            });

            // 2. ASSETS: INVENTORY
            const [snapSnap, snapVar] = await Promise.all([
                getDocs(collection(db, "stock_snapshots")),
                getDocs(collection(db, "product_variants"))
            ]);
            const costMap = {}; 
            snapVar.forEach(d => costMap[d.id] = d.data().cost || 0);
            
            let totalInv = 0;
            snapSnap.forEach(doc => {
                const d = doc.data();
                if(d.qty > 0) totalInv += (d.qty * (costMap[d.variant_id] || 0));
            });

            // 3. ASSETS: RECEIVABLE (Piutang from Unpaid Sales)
            const snapPiutang = await getDocs(query(collection(db, "sales_orders"), where("payment_status", "==", "unpaid")));
            let totalPiutang = 0;
            snapPiutang.forEach(d => totalPiutang += (d.data().net_amount || 0));

            // 4. LIABILITIES: PAYABLE (Hutang from Unpaid PO)
            const snapHutang = await getDocs(query(collection(db, "purchase_orders"), where("payment_status", "==", "unpaid")));
            let totalHutang = 0;
            snapHutang.forEach(d => totalHutang += (d.data().total_amount || 0));

            setAssets({ cash: totalCash, inventory: totalInv, receivable: totalPiutang, listCash });
            setLiabilities({ payable: totalHutang });

        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const totalAssets = assets.cash + assets.inventory + assets.receivable;
    const totalLiab = liabilities.payable;
    const equity = totalAssets - totalLiab;

    if(loading) return <div className="p-10 text-center text-slate-400">Menghitung aset & kewajiban...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Posisi Keuangan (Neraca)</h2>
                    <p className="text-sm text-slate-500">Snapshot kekayaan bisnis per hari ini.</p>
                </div>
                <button onClick={calculate} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100">Refresh Data</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ASSETS */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Aset (Harta)</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Kas & Setara Kas</p>
                                <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                                    {assets.listCash.map((c, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{c.name}</span>
                                            <span className="font-mono font-medium">{formatRupiah(c.val)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold text-slate-700">
                                    <span>Total Kas</span>
                                    <span>{formatRupiah(assets.cash)}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Nilai Persediaan</p>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Stok x HPP</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pl-2 border-l-2 border-blue-100">
                                    <span className="text-sm text-slate-600">Stok Fisik & Virtual</span>
                                    <span className="font-bold text-slate-800">{formatRupiah(assets.inventory)}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Piutang Usaha</p>
                                <div className="flex justify-between items-center pl-2 border-l-2 border-slate-100">
                                    <span className="text-sm text-slate-600">Penjualan Belum Lunas</span>
                                    <span className="font-bold text-slate-800">{formatRupiah(assets.receivable)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
                            <span className="font-bold text-slate-800">TOTAL ASET</span>
                            <span className="font-extrabold text-blue-700 text-xl">{formatRupiah(totalAssets)}</span>
                        </div>
                    </div>
                </div>

                {/* LIABILITIES & EQUITY */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Kewajiban (Hutang)</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Hutang Jangka Pendek</p>
                                <div className="flex justify-between items-center pl-2 border-l-2 border-red-100">
                                    <span className="text-sm text-slate-600">Hutang Dagang (PO Unpaid)</span>
                                    <span className="font-bold text-red-600">{formatRupiah(liabilities.payable)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
                            <span className="font-bold text-slate-800">TOTAL KEWAJIBAN</span>
                            <span className="font-bold text-red-700 text-lg">{formatRupiah(totalLiab)}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Ekuitas (Modal Bersih)</h3>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                            <p className="text-sm text-slate-500">Kekayaan Bersih Bisnis (Aset - Kewajiban)</p>
                            <h3 className={`text-3xl font-extrabold tracking-tight ${equity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatRupiah(equity)}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}