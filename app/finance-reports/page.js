// app/finance-reports/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';

export default function ReportPLPage() {
    const [data, setData] = useState({ revenue: 0, cogs: 0, expenses: 0, details: {} });
    const [loading, setLoading] = useState(false);
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [range, setRange] = useState({ start: firstDay, end: lastDay });

    const generateReport = async () => {
        setLoading(true);
        const start = new Date(range.start); start.setHours(0,0,0,0);
        const end = new Date(range.end); end.setHours(23,59,59,999);

        try {
            // 1. Revenue & COGS (From Sales)
            const qSales = query(collection(db, "sales_orders"), where("order_date", ">=", start), where("order_date", "<=", end));
            const snapSales = await getDocs(qSales);
            let rev = 0, cogs = 0;
            snapSales.forEach(d => {
                const s = d.data();
                rev += (s.net_amount || 0);
                cogs += (s.total_cost || 0);
            });

            // 2. Expenses (From Cash Out - Category Filter)
            const qExp = query(collection(db, "cash_transactions"), where("date", ">=", start), where("date", "<=", end), where("type", "==", "out"));
            const snapExp = await getDocs(qExp);
            let expTotal = 0;
            const expDet = {};
            
            // Exclude: pembelian (inventory asset), transfer, prive (equity draw)
            const exclude = ['pembelian', 'transfer', 'prive']; 
            
            snapExp.forEach(d => {
                const t = d.data();
                const cat = (t.category || 'Lainnya').toLowerCase();
                if(!exclude.includes(cat)) {
                    expTotal += t.amount;
                    expDet[cat] = (expDet[cat] || 0) + t.amount;
                }
            });

            setData({ revenue: rev, cogs: cogs, expenses: expTotal, details: expDet });

        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { generateReport(); }, []);

    const gross = data.revenue - data.cogs;
    const net = gross - data.expenses;
    const margin = data.revenue > 0 ? (net / data.revenue) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Laporan Laba Rugi</h2>
                    <p className="text-sm text-slate-500">Profit & Loss Statement.</p>
                </div>
                <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                    <input type="date" className="bg-white border rounded px-2 py-1 text-sm" value={range.start} onChange={e=>setRange({...range, start:e.target.value})} />
                    <span className="text-slate-400">-</span>
                    <input type="date" className="bg-white border rounded px-2 py-1 text-sm" value={range.end} onChange={e=>setRange({...range, end:e.target.value})} />
                    <button onClick={generateReport} className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-blue-700">{loading ? '...' : 'Filter'}</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-8 space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Pendapatan</h3>
                    <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-slate-700">Penjualan Bersih</span>
                        <span className="font-bold text-lg text-slate-900">{formatRupiah(data.revenue)}</span>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Harga Pokok Penjualan</h3>
                    <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-slate-700">COGS / HPP</span>
                        <span className="font-bold text-lg text-red-600">({formatRupiah(data.cogs)})</span>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                    <span className="font-bold text-blue-900 uppercase">Laba Kotor (Gross Profit)</span>
                    <span className="font-extrabold text-xl text-blue-700">{formatRupiah(gross)}</span>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Beban Operasional</h3>
                    <div className="space-y-1 pl-2">
                        {Object.entries(data.details).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-sm">
                                <span className="capitalize text-slate-600">{k}</span>
                                <span className="font-mono">{formatRupiah(v)}</span>
                            </div>
                        ))}
                        {data.expenses === 0 && <p className="text-sm text-slate-400 italic">Tidak ada beban.</p>}
                    </div>
                    <div className="flex justify-between items-center border-t mt-2 pt-2">
                        <span className="font-bold text-slate-700 text-sm">Total Beban</span>
                        <span className="font-bold text-red-600">({formatRupiah(data.expenses)})</span>
                    </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                    <div>
                        <span className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</span>
                        <span className={`text-3xl font-extrabold ${net < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatRupiah(net)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-slate-400 text-xs">Margin</span>
                        <span className="text-xl font-bold">{margin.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}