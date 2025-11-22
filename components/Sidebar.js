// components/Sidebar.js
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') return null;

  const isActive = (path) => {
    // Cek apakah path saat ini diawali dengan href menu (untuk active state)
    const active = pathname === path;
    return active
      ? "bg-indigo-600/10 text-indigo-400 border-r-4 border-indigo-500 font-semibold" 
      : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border-r-4 border-transparent";
  };

  const handleLogout = async () => {
    if(confirm('Keluar dari sistem?')) {
        try { await signOut(auth); } catch (error) { alert('Gagal logout'); }
    }
  };

  return (
    <aside className="hidden w-72 bg-[#0f172a] text-slate-300 flex-col h-full fixed left-0 top-0 z-30 md:flex shadow-2xl font-sans">
      {/* --- BRAND --- */}
      <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-900/50 ring-1 ring-white/10">
            <span className="font-bold text-xl tracking-tighter">B</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Bobing</h1>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Command Center</p>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 py-6 overflow-y-auto scrollbar-hide text-sm space-y-1">
        <div className="px-4 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Overview</p>
            <Link href="/dashboard" className={`flex items-center px-4 py-3 transition-all duration-200 ${isActive('/dashboard')}`}>
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                Dashboard
            </Link>
        </div>

        <div className="px-4 mt-8 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Master Data</p>
            <Link href="/products" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/products')}`}>Produk (Parent)</Link>
            <Link href="/variants" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/variants')}`}>Variants (SKU)</Link>
            <Link href="/brands" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/brands')}`}>Brands</Link>
            <Link href="/categories" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/categories')}`}>Categories</Link>
            <Link href="/warehouses" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/warehouses')}`}>Warehouses</Link>
            <Link href="/suppliers" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/suppliers')}`}>Suppliers</Link>
            <Link href="/customers" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/customers')}`}>Customers (CRM)</Link>
            <Link href="/finance-accounts" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/finance-accounts')}`}>Chart of Accounts</Link>
        </div>

        <div className="px-4 mt-8 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Operasional</p>
            <Link href="/inventory" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/inventory')}`}>Inventory & Stok</Link>
            <Link href="/supplier-sessions" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/supplier-sessions')}`}>Virtual Stock (JIT)</Link>
            <Link href="/purchases" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/purchases')}`}>Pembelian (PO)</Link>
        </div>

        <div className="px-4 mt-8 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Penjualan</p>
            <Link href="/sales-manual" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/sales-manual')}`}>Kasir / POS</Link>
            <Link href="/sales-import" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/sales-import')}`}>Import Sales</Link>
        </div>

        <div className="px-4 mt-8 mb-10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Keuangan</p>
            <Link href="/cash" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/cash')}`}>Cash Flow</Link>
            <Link href="/finance-reports" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/finance-reports')}`}>Laba Rugi (P&L)</Link>
            <Link href="/finance-balance" className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${isActive('/finance-balance')}`}>Neraca (Balance)</Link>
        </div>
      </nav>

      {/* --- FOOTER USER --- */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-950/30">
        <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold border border-indigo-500/30">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-500">Online</p>
            </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/20">
          Sign Out
        </button>
      </div>
    </aside>
  );
}