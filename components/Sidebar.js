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

  // Sembunyikan sidebar jika di halaman login atau belum login
  if (!user || pathname === '/login') return null;

  const isActive = (path) => {
    return pathname === path 
      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
      : "hover:bg-slate-800 opacity-70 hover:text-white text-slate-300";
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { alert('Gagal logout'); }
  };

  return (
    <aside className="hidden w-64 bg-slate-900 text-slate-300 flex-col h-full fixed left-0 top-0 z-30 md:translate-x-0 md:relative shadow-2xl border-r border-slate-800 md:flex">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-lg">B</span>
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold tracking-tight text-white">Bobing</h1>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Command Center</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide text-sm font-medium">
        <Link href="/dashboard" className={`group flex items-center px-3 py-2.5 rounded-lg transition-all mb-6 ${isActive('/dashboard')}`}>
          <span>Dashboard</span>
        </Link>

        <div className="px-3 mt-6 mb-2 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Data</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <Link href="/products" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/products')}`}>Produk (Parent)</Link>
        <Link href="/variants" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/variants')}`}>Variants (SKU)</Link>
        <Link href="/brands" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/brands')}`}>Brands</Link>
        <Link href="/categories" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/categories')}`}>Categories</Link>
        <Link href="/warehouses" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/warehouses')}`}>Warehouses</Link>
        <Link href="/suppliers" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/suppliers')}`}>Suppliers</Link>
        <Link href="/customers" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/customers')}`}>Customers (CRM)</Link>
        <Link href="/finance-accounts" className={`group flex items-center px-3 py-2 rounded-md transition-all ${isActive('/finance-accounts')}`}>Chart of Accounts</Link>

        <div className="px-3 mt-6 mb-2 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operasional</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>
        {/* Menu Operasional lainnya nanti ditambahkan disini sesuai urutan */}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-red-400 bg-slate-900/50 hover:bg-red-950/50 hover:text-red-300 rounded-lg transition-all border border-slate-800 hover:border-red-900">
          LOGOUT SYSTEM
        </button>
      </div>
    </aside>
  );
}