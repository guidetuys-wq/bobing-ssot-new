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

            if (filterRange === 'today') start.setHours(0, 0, 0, 0);
            else if (filterRange === 'this_month') start = new Date(now.getFullYear(), now.getMonth(), 1);
            else if (filterRange === 'last_month') {
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

                    // Trend Data
                    const dateStr = new Date(data.order_date.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    if (!days[dateStr]) days[dateStr] = { gross: 0, profit: 0 };
                    days[dateStr].gross += data.gross_amount || 0;
                    days[dateStr].profit += (data.net_amount || 0) - (data.total_cost || 0);

                    // Channel Data
                    const ch = (data.channel_id || 'manual').toUpperCase();
                    if (!channels[ch]) channels[ch] = 0;
                    channels[ch] += data.gross_amount || 0;

                    // Top Products
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

                // Prepare Chart Data
                setChartTrendData({
                    labels: Object.keys(days),
                    datasets: [
                        { label: 'Omzet', data: Object.values(days).map(x=>x.gross), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', fill: true, tension: 0.4 },
                        { label: 'Profit', data: Object.values(days).map(x=>x.profit), borderColor: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.05)', fill: true, tension: 0.4 }
                    ]
                });

                setChartChannelData({
                    labels: Object.keys(channels),
                    datasets: [{
                        data: Object.values(channels),
                        backgroundColor: ['#f97316', '#10b981', '#3b82f6', '#6366f1'],
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
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
                    <p className="text-sm text-slate-500 mt-1">Ringkasan performa bisnis.</p>
                </div>
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
                    <select value={filterRange} onChange={(e) => setFilterRange(e.target.value)} className="text-sm border-none bg-transparent focus:ring-0 text-slate-600 font-medium cursor-pointer py-1 pl-2 pr-8">
                        <option value="today">Hari Ini</option>
                        <option value="this_month">Bulan Ini</option>
                        <option value="last_month">Bulan Lalu</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Omzet (Gross)" value={loading ? '...' : formatRupiah(stats.gross)} sub={`Total ${stats.count} Transaksi`} color="text-slate-800" />
                <KpiCard title="Net Income (Cair)" value={loading ? '...' : formatRupiah(stats.net)} sub="Total masuk rekening" color="text-emerald-600" />
                <KpiCard title="Est. Real Profit" value={loading ? '...' : formatRupiah(stats.profit)} sub="Net Income - HPP" color="text-purple-600" />
                <KpiCard title="Profit Margin" value={loading ? '...' : stats.margin + '%'} sub="Efisiensi Profitabilitas" color={stats.margin >= 0 ? "text-amber-500" : "text-red-500"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Tren Penjualan & Profit</h3>
                    <div className="h-80 w-full relative">
                        {chartTrendData && <Line data={chartTrendData} options={{ responsive: true, maintainAspectRatio: false }} />}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Marketplace Share</h3>
                    <div className="h-64 w-full relative flex justify-center">
                        {chartChannelData && <Doughnut data={chartChannelData} options={{ responsive: true, maintainAspectRatio: false, cutout: '70%' }} />}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Top 10 Produk Terlaris</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Produk</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Terjual</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {topProducts.map(([sku, qty], idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-sm font-medium text-slate-700">{sku}</td>
                                <td className="px-6 py-3 text-center text-sm font-bold text-blue-600">{qty}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KpiCard({ title, value, sub, color }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
            <h3 className={`text-2xl font-bold mt-2 ${color}`}>{value}</h3>
            <p className="text-xs text-slate-400 mt-2">{sub}</p>
        </div>
    );
}