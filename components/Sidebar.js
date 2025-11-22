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

  // Fungsi styling menu item
  const MenuItem = ({ href, label, activePath }) => {
    const active = pathname === href;
    return (
      <Link 
        href={href} 
        className={`group relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 
        ${active 
          ? "bg-brand-600 text-white shadow-glow font-medium" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"}`}
      >
        {/* Ikon dot kecil sebagai hiasan jika aktif */}
        {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/30 rounded-r-full"></span>
        )}
        
        {/* Placeholder Icon Area (Nanti ganti dengan Icon Library) */}
        <span className={`w-5 h-5 flex items-center justify-center mr-3 text-xs border rounded ${active ? 'border-white/30 bg-white/10' : 'border-slate-700 bg-transparent'}`}>
            {label.charAt(0)}
        </span>

        <span className="text-sm tracking-wide">{label}</span>
      </Link>
    );
  };

  // Separator label
  const MenuLabel = ({ title }) => (
    <div className="px-4 mt-6 mb-3 flex items-center">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
  );

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { alert('Gagal logout'); }
  };

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 z-30 bg-sidebar-bg border-r border-sidebar-border">
      
      {/* 1. Header Brand */}
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border bg-sidebar-bg/50 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          {/* Logo Icon */}
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20 border border-brand-500">
            <span className="font-bold text-xl text-white">B</span>
          </div>
          {/* Brand Text */}
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white leading-none tracking-tight">Bobing</h1>
            <span className="text-[10px] font-medium text-brand-500 mt-1">Command Center</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Area */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto scrollbar-hide">
        
        <MenuLabel title="Overview" />
        <MenuItem href="/dashboard" label="Dashboard" />

        <MenuLabel title="Master Data" />
        <MenuItem href="/products" label="Produk (Parent)" />
        <MenuItem href="/variants" label="Variants (SKU)" />
        <MenuItem href="/brands" label="Brands" />
        <MenuItem href="/categories" label="Categories" />
        <MenuItem href="/warehouses" label="Warehouses" />
        <MenuItem href="/suppliers" label="Suppliers" />
        
        <MenuLabel title="Finance & CRM" />
        <MenuItem href="/customers" label="Customers" />
        <MenuItem href="/finance-accounts" label="Chart of Accounts" />

      </nav>

      {/* 3. User Profile & Logout (Bottom) */}
      <div className="p-4 border-t border-sidebar-border bg-[#0b1120]">
        <div className="flex flex-col gap-3">
            {/* User Info Mini */}
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                    {user?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs text-white font-medium truncate">{user?.email}</p>
                    <p className="text-[10px] text-slate-500">Administrator</p>
                </div>
            </div>

            <button 
                onClick={handleLogout} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/90 rounded-lg transition-all duration-200 border border-rose-900/30 hover:border-rose-500"
            >
                Sign Out
            </button>
        </div>
      </div>
    </aside>
  );
}