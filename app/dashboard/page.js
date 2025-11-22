// app/dashboard/page.js
"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
    const [stats, setStats] = useState({ gross: 0, net: 0, profit: 0, margin: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [filterRange, setFilterRange] = useState('this_month');
    const [chartTrendData, setChartTrendData] = useState(null);
    const [chartChannelData, setChartChannelData] = useState(null);
    const [topProducts, setTopProducts] = useState([]);

    // ... (LOGIC loadData SAMA PERSIS SEPERTI SEBELUMNYA, TIDAK PERLU DIUBAH) ...
    // Copas logic useEffect loadData dari file sebelumnya di sini
    // Agar tidak kepanjangan, saya hanya tulis UI render barunya di bawah:
    
    // --- MOCK LOGIC UNTUK RENDER (Ganti dengan logic asli Anda) ---
    useEffect(() => {
        // Panggil logic fetch data asli Anda di sini
        // Untuk demo UI, saya set loading false
        setTimeout(() => setLoading(false), 1000);
    }, [filterRange]);
    // -------------------------------------------------------------

    return (
        <div className="max-w-7xl mx-auto space-y-8 fade-in pb-20">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Executive Dashboard</h2>
                    <p className="text-slate-500 mt-1 font-medium">Overview performa bisnis & kesehatan finansial.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 pl-3 uppercase tracking-wider">Periode:</span>
                    <select 
                        value={filterRange}
                        onChange={(e) => setFilterRange(e.target.value)}
                        className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-bold cursor-pointer py-1.5 pl-2 pr-8 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <option value="today">Hari Ini</option>
                        <option value="this_month">Bulan Ini</option>
                        <option value="last_month">Bulan Lalu</option>
                    </select>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Total Omzet" 
                    value={loading ? '...' : formatRupiah(stats.gross)} 
                    sub={`${stats.count} Transaksi`} 
                    icon="💰"
                    trend="up"
                    color="indigo"
                />
                <KpiCard 
                    title="Net Income (Cair)" 
                    value={loading ? '...' : formatRupiah(stats.net)} 
                    sub="Cash In Hand" 
                    icon="bf"
                    trend="neutral"
                    color="emerald"
                />
                <KpiCard 
                    title="Est. Profit" 
                    value={loading ? '...' : formatRupiah(stats.profit)} 
                    sub="Net - HPP" 
                    icon="📈"
                    trend="up"
                    color="violet"
                />
                <KpiCard 
                    title="Profit Margin" 
                    value={loading ? '...' : `${stats.margin}%`} 
                    sub="Efisiensi" 
                    icon="aa"
                    trend={stats.margin > 20 ? "up" : "down"}
                    color={stats.margin > 0 ? "amber" : "rose"}
                />
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                            Tren Penjualan
                        </h3>
                    </div>
                    <div className="h-80 w-full relative">
                        {/* Render Chart Component Here */}
                        {chartTrendData ? <Line data={chartTrendData} options={{ responsive: true, maintainAspectRatio: false }} /> : <div className="h-full flex items-center justify-center text-slate-300">Chart Data Loading...</div>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                        Market Share
                    </h3>
                    <div className="h-64 w-full relative flex justify-center items-center flex-1">
                         {/* Render Doughnut Component Here */}
                         {chartChannelData ? <Doughnut data={chartChannelData} options={{ responsive: true, maintainAspectRatio: false, cutout: '75%' }} /> : <div className="text-slate-300">Loading...</div>}
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-hover">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 text-lg">🔥 Top Produk Terlaris</h3>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Lihat Semua &rarr;</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-modern">
                        <thead>
                            <tr>
                                <th className="pl-8">Nama Produk</th>
                                <th className="text-center">Terjual</th>
                                <th className="text-right pr-8">Est. Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400 italic">Belum ada data penjualan.</td></tr>
                            ) : (
                                topProducts.map(([sku, qty], idx) => (
                                    <tr key={idx}>
                                        <td className="pl-8 font-medium text-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                                    {idx + 1}
                                                </div>
                                                {sku}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{qty} unit</span>
                                        </td>
                                        <td className="text-right pr-8 text-slate-500">-</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Component KPI Card Baru yang Lebih Modern
function KpiCard({ title, value, sub, icon, color, trend }) {
    // Mapping warna untuk border & text
    const colorMap = {
        indigo: 'border-l-4 border-indigo-500 text-indigo-600',
        emerald: 'border-l-4 border-emerald-500 text-emerald-600',
        violet: 'border-l-4 border-violet-500 text-violet-600',
        amber: 'border-l-4 border-amber-500 text-amber-600',
        rose: 'border-l-4 border-rose-500 text-rose-600',
    };

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover relative overflow-hidden ${colorMap[color] || ''}`}>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-slate-50 text-xl shadow-inner`}>
                    {icon === 'bf' ? '💼' : (icon==='aa' ? '📊' : icon)}
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2 relative z-10">
                {trend === 'up' && <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">↗ Naik</span>}
                {trend === 'down' && <span className="text-rose-500 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full">↘ Turun</span>}
                <p className="text-xs text-slate-400 font-medium">{sub}</p>
            </div>
            
            {/* Dekorasi Background Abstrak */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 z-0 pointer-events-none"></div>
        </div>
    );
}