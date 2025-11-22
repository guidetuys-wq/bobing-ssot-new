// app/dashboard/page.js
"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
    const [stats, setStats] = useState({ gross: 0, net: 0, profit: 0, margin: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [filterRange, setFilterRange] = useState('this_month');
    const [chartTrendData, setChartTrendData] = useState(null);
    const [chartChannelData, setChartChannelData] = useState(null);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const now = new Date();
            let start = new Date();
            let end = new Date();
            end.setHours(23, 59, 59, 999);

            // Logic Filter Tanggal
            if (filterRange === 'today') {
                start.setHours(0, 0, 0, 0);
            } else if (filterRange === 'this_month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (filterRange === 'last_month') {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                end.setHours(23, 59, 59, 999);
            }

            try {
                const q = query(
                    collection(db, "sales_orders"), 
                    where("order_date", ">=", start),
                    where("order_date", "<=", end),
                    orderBy("order_date", "asc")
                );

                const snap = await getDocs(q);
                let totalGross = 0, totalNet = 0, totalCost = 0;
                const days = {};
                const channels = {};
                const productStats = {};
                
                snap.forEach(d => {
                    const data = d.data();
                    totalGross += (data.gross_amount || 0);
                    totalNet += (data.net_amount || 0);
                    totalCost += (data.total_cost || 0);

                    // 1. Trend Data (Harian)
                    const dateStr = new Date(data.order_date.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    if (!days[dateStr]) days[dateStr] = { gross: 0, profit: 0 };
                    days[dateStr].gross += data.gross_amount || 0;
                    days[dateStr].profit += (data.net_amount || 0) - (data.total_cost || 0);

                    // 2. Channel Data
                    const ch = (data.channel_id || 'manual').toUpperCase();
                    if (!channels[ch]) channels[ch] = 0;
                    channels[ch] += data.gross_amount || 0;

                    // 3. Top Products
                    if (data.items_summary) {
                        const parts = data.items_summary.split(', ');
                        parts.forEach(p => {
                            const match = p.match(/(.*)\((\d+)\)/);
                            if (match) {
                                const sku = match[1];
                                const qty = parseInt(match[2]);
                                if (!productStats[sku]) productStats[sku] = 0;
                                productStats[sku] += qty;
                            }
                        });
                    }
                });

                const profit = totalNet - totalCost;
                const margin = totalGross > 0 ? (profit / totalGross) * 100 : 0;

                setStats({
                    gross: totalGross,
                    net: totalNet,
                    profit: profit,
                    margin: margin.toFixed(1),
                    count: snap.size
                });

                // Setup Chart Data
                setChartTrendData({
                    labels: Object.keys(days),
                    datasets: [
                        { 
                            label: 'Omzet', 
                            data: Object.values(days).map(x=>x.gross), 
                            borderColor: '#4F46E5', // primary-600
                            backgroundColor: 'rgba(79, 70, 229, 0.1)', 
                            fill: true, 
                            tension: 0.4 
                        },
                        { 
                            label: 'Profit', 
                            data: Object.values(days).map(x=>x.profit), 
                            borderColor: '#10B981', // emerald-500
                            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                            fill: true, 
                            tension: 0.4 
                        }
                    ]
                });

                setChartChannelData({
                    labels: Object.keys(channels),
                    datasets: [{
                        data: Object.values(channels),
                        backgroundColor: ['#F97316', '#10B981', '#3B82F6', '#6366F1'],
                        borderWidth: 0
                    }]
                });

                setTopProducts(Object.entries(productStats).sort((a, b) => b[1] - a[1]).slice(0, 10));

            } catch (e) {
                console.error("Error fetching dashboard:", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [filterRange]);

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
                        className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-bold cursor-pointer py-1.5 pl-2 pr-8 rounded-lg hover:bg-slate-50 transition-colors outline-none"
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
                        {chartTrendData ? <Line data={chartTrendData} options={{ responsive: true, maintainAspectRatio: false }} /> : <div className="h-full flex items-center justify-center text-slate-300">Memuat Grafik...</div>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                        Market Share
                    </h3>
                    <div className="h-64 w-full relative flex justify-center items-center flex-1">
                         {chartChannelData ? <Doughnut data={chartChannelData} options={{ responsive: true, maintainAspectRatio: false, cutout: '75%' }} /> : <div className="text-slate-300">Memuat Data...</div>}
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-hover">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 text-lg">🔥 Top Produk Terlaris</h3>
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
                            {loading ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400">Memuat data...</td></tr>
                            ) : topProducts.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400 italic">Belum ada data penjualan pada periode ini.</td></tr>
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

// KPI Card Component
function KpiCard({ title, value, sub, icon, color, trend }) {
    const colorMap = {
        indigo: 'border-l-4 border-indigo-500',
        emerald: 'border-l-4 border-emerald-500',
        violet: 'border-l-4 border-violet-500',
        amber: 'border-l-4 border-amber-500',
        rose: 'border-l-4 border-rose-500',
    };

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover relative overflow-hidden ${colorMap[color] || ''}`}>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-xl shadow-inner">
                    {icon === 'bf' ? '💼' : (icon==='aa' ? '📊' : icon)}
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2 relative z-10">
                {trend === 'up' && <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">↗ Naik</span>}
                {trend === 'down' && <span className="text-rose-500 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full">↘ Turun</span>}
                <p className="text-xs text-slate-400 font-medium">{sub}</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 z-0 pointer-events-none"></div>
        </div>
    );
}