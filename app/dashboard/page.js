// app/dashboard/page.js
"use client";
import Link from 'next/link';

export default function Dashboard() {
  // Dummy Data untuk Visualisasi
  const stats = [
    { title: "Total Penjualan", value: "Rp 124.5jt", change: "+12.5%", isUp: true, color: "bg-blue-50 text-blue-600" },
    { title: "Order Baru", value: "1,240", change: "+8.2%", isUp: true, color: "bg-emerald-50 text-emerald-600" },
    { title: "Stok Menipis", value: "28", change: "-5 Item", isUp: false, color: "bg-amber-50 text-amber-600" },
    { title: "Pending Payment", value: "Rp 12jt", change: "Perlu Followup", isUp: false, color: "bg-rose-50 text-rose-600" },
  ];

  const recentOrders = [
    { id: "#ORD-7782", customer: "Budi Santoso", date: "Hari ini, 10:23", total: "Rp 2.500.000", status: "Lunas", statusColor: "badge-success" },
    { id: "#ORD-7781", customer: "CV. Maju Jaya", date: "Hari ini, 09:15", total: "Rp 14.200.000", status: "Pending", statusColor: "badge-warning" },
    { id: "#ORD-7780", customer: "Toko Berkah", date: "Kemarin, 16:45", total: "Rp 850.000", status: "Dikirim", statusColor: "badge-info" },
    { id: "#ORD-7779", customer: "Siti Aminah", date: "Kemarin, 14:20", total: "Rp 3.100.000", status: "Batal", statusColor: "badge-danger" },
    { id: "#ORD-7778", customer: "PT. Sinar Tech", date: "21 Nov, 11:00", total: "Rp 45.000.000", status: "Lunas", statusColor: "badge-success" },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Selamat datang kembali, Admin! 👋</p>
        </div>
        <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Download Report
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                + Buat Order Baru
            </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <div key={index} className="card-dashboard p-5 group cursor-default">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stat.color} transition-transform group-hover:scale-110`}>
                    {/* Placeholder Icon (Gunakan Lucide/Heroicons nanti) */}
                    <span>★</span> 
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.isUp ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {stat.change}
                </span>
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.title}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Main Table (Kiri - Lebar) */}
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-800">Transaksi Terakhir</h2>
                <Link href="/orders" className="text-sm text-indigo-600 font-medium hover:underline">Lihat Semua</Link>
            </div>
            
            <div className="card-dashboard overflow-hidden border-0 ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="table-header">Order ID</th>
                                <th className="table-header">Pelanggan</th>
                                <th className="table-header">Total</th>
                                <th className="table-header">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="table-cell font-medium text-slate-900">{order.id}</td>
                                    <td className="table-cell">
                                        <div className="flex flex-col">
                                            <span className="text-slate-800 font-medium">{order.customer}</span>
                                            <span className="text-xs text-slate-400">{order.date}</span>
                                        </div>
                                    </td>
                                    <td className="table-cell font-bold text-slate-700">{order.total}</td>
                                    <td className="table-cell">
                                        <span className={`badge ${order.statusColor} border-0 px-3 py-1`}>{order.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* 4. Side Widgets (Kanan - Sempit) */}
        <div className="space-y-6">
            
            {/* Widget: Quick Actions */}
            <div className="card-dashboard p-5">
                <h3 className="font-bold text-slate-800 mb-4">Aksi Cepat</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/products/new" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 transition-all text-slate-600 text-xs font-medium gap-2 text-center">
                        <span className="text-lg">📦</span> Tambah Produk
                    </Link>
                    <Link href="/suppliers" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 transition-all text-slate-600 text-xs font-medium gap-2 text-center">
                        <span className="text-lg">🚛</span> Supplier Baru
                    </Link>
                    <Link href="/customers" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 transition-all text-slate-600 text-xs font-medium gap-2 text-center">
                        <span className="text-lg">👥</span> Cek Customer
                    </Link>
                    <Link href="/finance" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 transition-all text-slate-600 text-xs font-medium gap-2 text-center">
                        <span className="text-lg">💰</span> Catat Beban
                    </Link>
                </div>
            </div>

            {/* Widget: System Status */}
            <div className="card-dashboard p-5 bg-slate-900 text-white border-slate-800">
                <h3 className="font-bold mb-2 text-sm">System Health</h3>
                <div className="space-y-4 mt-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1 text-slate-400">
                            <span>Server Load</span>
                            <span>24%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '24%'}}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 text-slate-400">
                            <span>Storage Usage</span>
                            <span>85%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}