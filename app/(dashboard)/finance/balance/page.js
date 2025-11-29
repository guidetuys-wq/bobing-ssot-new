// app/(dashboard)/finance/balance/page.js
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { 
    PieChart, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BalanceSheetPage() {
    const [loading, setLoading] = useState(false);
    
    // Data State
    const [reportData, setReportData] = useState({
        assets: 0, liabilities: 0, equity: 0
    });
    const [details, setDetails] = useState({ assets: {}, liabilities: {}, equity: {} });

    useEffect(() => {
        fetchBalanceSheet();
    }, []);

    const fetchBalanceSheet = async () => {
        setLoading(true);
        try {
            // Neraca = Snapshot Saldo Akhir dari 'chart_of_accounts'
            const q = query(collection(db, "chart_of_accounts"), orderBy("code"));
            const snap = await getDocs(q);
            
            let assets = 0;
            let liabilities = 0;
            let equity = 0;
            
            const breakdown = { assets: {}, liabilities: {}, equity: {} };
            
            // Variabel bantu untuk menghitung Laba Berjalan (Implied)
            let totalRevenueAllTime = 0;
            let totalExpenseAllTime = 0;

            snap.forEach(doc => {
                const acc = doc.data();
                const code = String(acc.code);
                const bal = parseFloat(acc.balance) || 0;

                // Mapping Akun Neraca
                if (code.startsWith('1')) { // ASSET
                    assets += bal;
                    breakdown.assets[acc.name] = bal;
                } else if (code.startsWith('2')) { // LIABILITY
                    liabilities += bal;
                    breakdown.liabilities[acc.name] = bal;
                } else if (code.startsWith('3')) { // EQUITY
                    equity += bal;
                    breakdown.equity[acc.name] = bal;
                } 
                // Akun Laba Rugi (untuk perhitungan Laba Ditahan/Berjalan)
                else if (code.startsWith('4')) { // REVENUE (Kredit +)
                    totalRevenueAllTime += bal;
                } else if (code.startsWith('5') || code.startsWith('6')) { // EXPENSE (Debit +)
                    totalExpenseAllTime += bal;
                }
            });

            // Hitung Laba Tahun Berjalan (Current Earnings)
            // Logic: Total Pendapatan - Total Beban
            const calculatedEarnings = totalRevenueAllTime - totalExpenseAllTime;
            
            // Masukkan ke Ekuitas
            breakdown.equity['Laba Periode Berjalan (Current Earnings)'] = calculatedEarnings;
            equity += calculatedEarnings;

            setReportData({ assets, liabilities, equity });
            setDetails(breakdown);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const ReportRow = ({ name, value, indent=false, bold=false }) => (
        <div className={`flex justify-between items-center py-3 border-b border-border/50 hover:bg-gray-50 transition-colors ${indent ? 'pl-8 text-sm' : 'font-bold text-sm'} ${bold ? 'bg-gray-50/80' : ''}`}>
            <span className={indent ? 'text-text-secondary' : 'text-text-primary'}>{name}</span>
            <span className={`font-mono ${value < 0 ? 'text-rose-600' : ''}`}>{formatRupiah(value)}</span>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 fade-in pb-20">
            <PageHeader 
                title="Neraca Keuangan" 
                subtitle="Posisi Aset, Kewajiban, dan Modal (Balance Sheet)." 
            />

            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="space-y-6">
                
                {/* Balance Check Indicator */}
                {Math.abs(reportData.assets - (reportData.liabilities + reportData.equity)) > 1000 ? (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-800 animate-pulse">
                        <AlertTriangle className="w-6 h-6"/>
                        <div>
                            <h4 className="font-bold text-sm">Neraca Tidak Seimbang! (Unbalanced)</h4>
                            <p className="text-xs">
                                Selisih: {formatRupiah(reportData.assets - (reportData.liabilities + reportData.equity))}. 
                                Cek jurnal manual Anda.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-800">
                        <CheckCircle className="w-6 h-6"/>
                        <div>
                            <h4 className="font-bold text-sm">Neraca Seimbang (Balanced)</h4>
                            <p className="text-xs">Persamaan Akuntansi: Aset = Kewajiban + Ekuitas terpenuhi.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* KOLOM KIRI: ASET */}
                    <div className="bg-white border border-border rounded-2xl shadow-sm p-6">
                        <h3 className="text-lg font-bold font-display mb-4 text-emerald-700 border-b border-border pb-2 flex items-center gap-2">
                            <PieChart className="w-5 h-5"/> ASET (ACTIVA)
                        </h3>
                        <div className="space-y-1">
                            {details.assets && Object.entries(details.assets).map(([k,v]) => (
                                <ReportRow key={k} name={k} value={v} />
                            ))}
                            {Object.keys(details.assets).length === 0 && <p className="text-center text-gray-400 py-4 italic text-xs">Belum ada data aset.</p>}
                            
                            <div className="mt-8 pt-4 border-t-2 border-gray-800">
                                <ReportRow name="TOTAL ASET" value={reportData.assets} bold />
                            </div>
                        </div>
                    </div>

                    {/* KOLOM KANAN: KEWAJIBAN & EKUITAS */}
                    <div className="bg-white border border-border rounded-2xl shadow-sm p-6">
                        <h3 className="text-lg font-bold font-display mb-4 text-blue-700 border-b border-border pb-2 flex items-center gap-2">
                            <PieChart className="w-5 h-5"/> PASIVA
                        </h3>
                        
                        {/* Liabilities */}
                        <div className="space-y-1 mb-8">
                            <p className="text-xs font-bold text-text-secondary uppercase mb-2 bg-gray-50 p-1 rounded">Kewajiban (Liabilities)</p>
                            {details.liabilities && Object.entries(details.liabilities).map(([k,v]) => (
                                <ReportRow key={k} name={k} value={v} />
                            ))}
                            <div className="pt-2">
                                <ReportRow name="Total Kewajiban" value={reportData.liabilities} bold indent/>
                            </div>
                        </div>

                        {/* Equity */}
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-text-secondary uppercase mb-2 bg-gray-50 p-1 rounded">Ekuitas (Equity)</p>
                            {details.equity && Object.entries(details.equity).map(([k,v]) => (
                                <ReportRow key={k} name={k} value={v} />
                            ))}
                            <div className="pt-2">
                                <ReportRow name="Total Ekuitas" value={reportData.equity} bold indent/>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t-2 border-gray-800">
                            <ReportRow name="TOTAL PASIVA" value={reportData.liabilities + reportData.equity} bold />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}