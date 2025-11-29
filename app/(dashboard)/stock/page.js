// app/(dashboard)/stock/page.js
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import Link from 'next/link';

// --- CHARTS ---
import { 
    Chart as ChartJS, 
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// --- ICONS ---
import { 
    Package, Warehouse, AlertTriangle, ArrowRightLeft, 
    TrendingUp, Box, ClipboardList, History, ArrowRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const CACHE_KEY = 'lumina_stock_dash_v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 Menit

export default function StockDashboard() {
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [kpi, setKpi] = useState({ 
        totalSku: 0, 
        totalQty: 0, 
        totalValue: 0, 
        lowStockCount: 0 
    });
    
    const [chartWarehouse, setChartWarehouse] = useState(null);
    const [chartMovement, setChartMovement] = useState(null);
    const [recentMovements, setRecentMovements] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            // 1. Cek Cache
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_DURATION) {
                        // [FIX]: Rehydrate Dates (Convert String back to Date)
                        if (data.recentList) {
                            data.recentList = data.recentList.map(item => ({
                                ...item,
                                time: new Date(item.time) // Convert string ISO to Date Obj
                            }));
                        }
                        
                        applyData(data);
                        setLoading(false);
                        return;
                    }
                }
            }

            // 2. Fetch Live Data
            const [snapWh, snapVar, snapSnap, snapMove] = await Promise.all([
                getDocs(collection(db, "warehouses")),
                getDocs(collection(db, "product_variants")),
                getDocs(collection(db, "stock_snapshots")),
                getDocs(query(collection(db, "stock_movements"), orderBy("date", "desc"), limit(20)))
            ]);

            // --- PROSES DATA ---
            const data = processData(snapWh, snapVar, snapSnap, snapMove);
            
            // Simpan Cache
            if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
            
            applyData(data);

        } catch (e) {
            console.error("Stock Dash Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const processData = (snapWh, snapVar, snapSnap, snapMove) => {
        // A. Master Data Map
        const warehouses = snapWh.docs.map(d => ({ id: d.id, name: d.data().name }));
        const variants = {};
        snapVar.forEach(d => {
            const v = d.data();
            variants[d.id] = { 
                sku: v.sku, 
                cost: v.cost || 0, 
                min: v.min_stock || 5 // Default min stock 5
            };
        });

        // B. Calculate Stock Metrics
        let totalQty = 0;
        let totalValue = 0;
        let lowStockList = [];
        const whStats = {}; // { whId: { qty: 0, value: 0 } }

        // Init WH Stats
        warehouses.forEach(w => whStats[w.name] = 0);

        snapSnap.forEach(d => {
            const s = d.data();
            const qty = s.qty || 0;
            const v = variants[s.variant_id];
            
            if (v) {
                totalQty += qty;
                totalValue += (qty * v.cost);
                
                // Warehouse Distribution
                const whName = warehouses.find(w => w.id === s.warehouse_id)?.name || 'Unknown';
                if (whStats[whName] !== undefined) whStats[whName] += qty;

                // Low Stock Check
                if (qty <= v.min && qty > 0) {
                    lowStockList.push({ sku: v.sku, qty, wh: whName });
                }
            }
        });

        // C. Process Movements (Last 7 Days Chart & Recent List)
        const dailyMove = {}; // { 'YYYY-MM-DD': { in: 0, out: 0 } }
        const recentList = [];

        snapMove.forEach(d => {
            const m = d.data();
            const dateObj = m.date?.toDate ? m.date.toDate() : new Date();
            const dateKey = dateObj.toISOString().split('T')[0];
            const qty = Math.abs(m.qty || 0);

            // Chart Data
            if (!dailyMove[dateKey]) dailyMove[dateKey] = { in: 0, out: 0 };
            if ((m.qty || 0) > 0) dailyMove[dateKey].in += qty;
            else dailyMove[dateKey].out += qty;

            // Recent List
            const v = variants[m.variant_id];
            if (v) {
                recentList.push({
                    id: d.id,
                    sku: v.sku,
                    type: m.type,
                    qty: m.qty,
                    wh: warehouses.find(w => w.id === m.warehouse_id)?.name || '-',
                    time: dateObj, // Disimpan sebagai Date object
                    notes: m.notes || '-'
                });
            }
        });

        return {
            kpi: {
                totalSku: Object.keys(variants).length,
                totalQty,
                totalValue,
                lowStockCount: lowStockList.length
            },
            whStats,
            dailyMove,
            recentList: recentList.slice(0, 5),
            lowStockList: lowStockList.slice(0, 5)
        };
    };

    const applyData = (data) => {
        setKpi(data.kpi);
        setRecentMovements(data.recentList);
        setLowStockItems(data.lowStockList);

        // Chart 1: Warehouse Distribution
        setChartWarehouse({
            labels: Object.keys(data.whStats),
            datasets: [{
                label: 'Total Items (Pcs)',
                data: Object.values(data.whStats),
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
                borderRadius: 4,
            }]
        });

        // Chart 2: Daily Movement (Last few entries found)
        // Sort dates
        const dates = Object.keys(data.dailyMove).sort().slice(-7); // Last 7 active days
        setChartMovement({
            labels: dates.map(d => {
                const date = new Date(d);
                return `${date.getDate()}/${date.getMonth()+1}`;
            }),
            datasets: [
                {
                    label: 'Masuk (In)',
                    data: dates.map(d => data.dailyMove[d].in),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Keluar (Out)',
                    data: dates.map(d => data.dailyMove[d].out),
                    borderColor: '#F43F5E',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        });
    };

    // --- UI COMPONENTS ---
    const KpiCard = ({ title, value, icon: Icon, colorClass, subValue }) => (
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">{title}</p>
                <h3 className={`text-2xl font-display font-bold ${colorClass}`}>
                    {loading ? <Skeleton className="h-8 w-24"/> : value}
                </h3>
                {subValue && <p className="text-xs text-text-secondary mt-1">{subValue}</p>}
            </div>
            <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-').replace('600','50').replace('700','50').replace('500','50')} opacity-80`}>
                <Icon className={`w-6 h-6 ${colorClass}`}/>
            </div>
        </div>
    );

    return (
        <div className="max-w-full mx-auto space-y-6 fade-in pb-20 px-4 md:px-8 pt-6 bg-background min-h-screen text-text-primary">
            
            <PageHeader 
                title="Inventory Dashboard" 
                subtitle="Monitoring stok fisik, sebaran gudang, dan aktivitas logistik." 
            />

            {/* 1. KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                    title="Total SKU Aktif" 
                    value={kpi.totalSku} 
                    icon={Box} 
                    colorClass="text-blue-600" 
                    subValue="Varian Produk"
                />
                <KpiCard 
                    title="Fisik Barang (Pcs)" 
                    value={kpi.totalQty.toLocaleString()} 
                    icon={Package} 
                    colorClass="text-emerald-600" 
                    subValue="Total semua gudang"
                />
                <KpiCard 
                    title="Valuasi Stok (HPP)" 
                    value={formatRupiah(kpi.totalValue)} 
                    icon={TrendingUp} 
                    colorClass="text-amber-600" 
                    subValue="Estimasi Modal Tertanam"
                />
                <KpiCard 
                    title="Low Stock Alert" 
                    value={kpi.lowStockCount} 
                    icon={AlertTriangle} 
                    colorClass="text-rose-600" 
                    subValue="Perlu Restock Segera"
                />
            </div>

            {/* 2. CHARTS AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Warehouse Distribution */}
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-6">
                        <Warehouse className="w-5 h-5 text-primary"/> Sebaran Stok Gudang
                    </h3>
                    <div className="h-64 relative w-full">
                        {chartWarehouse ? <Bar data={chartWarehouse} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /> : <Skeleton className="h-full w-full"/>}
                    </div>
                </motion.div>

                {/* Movement Trends */}
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-6">
                        <ArrowRightLeft className="w-5 h-5 text-primary"/> Tren Pergerakan Stok (7 Hari Terakhir)
                    </h3>
                    <div className="h-64 relative w-full">
                        {chartMovement ? <Line data={chartMovement} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true } } }} /> : <Skeleton className="h-full w-full"/>}
                    </div>
                </motion.div>
            </div>

            {/* 3. LISTS & SHORTCUTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-border bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-text-primary flex items-center gap-2">
                            <History className="w-4 h-4"/> Aktivitas Terbaru
                        </h3>
                        <Link href="/stock/inventory" className="text-xs font-bold text-primary hover:underline">Lihat Semua</Link>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px]">
                        {recentMovements.length === 0 ? (
                            <div className="p-8 text-center text-text-secondary text-sm">Belum ada aktivitas.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-[10px] text-text-secondary uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="px-5 py-3">Waktu</th>
                                        <th className="px-5 py-3">Item</th>
                                        <th className="px-5 py-3 text-center">Tipe</th>
                                        <th className="px-5 py-3 text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {recentMovements.map((m, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-xs text-text-secondary">
                                                {/* SAFE RENDER FOR DATE */}
                                                {m.time instanceof Date ? (
                                                    <>
                                                        {m.time.toLocaleDateString()} {m.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td className="px-5 py-3 font-medium text-text-primary">
                                                {m.sku} <span className="text-[10px] text-text-secondary block font-normal">{m.wh}</span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${m.qty > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {m.type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-5 py-3 text-right font-mono font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {m.qty > 0 ? '+' : ''}{m.qty}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Low Stock & Shortcuts */}
                <div className="space-y-6">
                    {/* Low Stock Widget */}
                    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                            <h3 className="font-bold text-rose-800 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> Low Stock Warning
                            </h3>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-rose-600 font-bold border border-rose-200">{kpi.lowStockCount}</span>
                        </div>
                        <div className="p-2 max-h-[200px] overflow-y-auto">
                            {lowStockItems.length === 0 ? (
                                <p className="text-center text-xs text-text-secondary py-4">Stok aman.</p>
                            ) : lowStockItems.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-2 hover:bg-rose-50/50 rounded-lg">
                                    <div className="text-xs">
                                        <div className="font-bold text-text-primary">{item.sku}</div>
                                        <div className="text-[10px] text-text-secondary">{item.wh}</div>
                                    </div>
                                    <div className="text-xs font-bold text-rose-600 bg-white px-2 py-1 rounded border border-rose-100 shadow-sm">
                                        Sisa: {item.qty}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                        <h3 className="font-bold text-text-primary text-sm mb-3">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/stock/inventory" className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 group">
                                <ClipboardList className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-bold text-blue-700">Opname</span>
                            </Link>
                            <Link href="/purchases/overview" className="flex flex-col items-center justify-center p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100 group">
                                <Package className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-bold text-emerald-700">Restock (PO)</span>
                            </Link>
                            <Link href="/stock/warehouses" className="flex flex-col items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100 group">
                                <Warehouse className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-bold text-purple-700">Gudang</span>
                            </Link>
                            <Link href="/catalog/products" className="flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-100 group">
                                <Box className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-bold text-amber-700">Produk</span>
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}