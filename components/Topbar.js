// components/Topbar.js
"use client";
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Topbar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || pathname === '/login') return null;

  const getPageTitle = (path) => {
    const titles = {
      '/dashboard': 'Executive Dashboard',
      '/products': 'Product Models',
      '/variants': 'Master SKU',
      '/inventory': 'Inventory Control',
      '/sales-manual': 'Point of Sale (POS)',
      '/finance-reports': 'Financial Reports',
      // ... tambahkan lainnya jika perlu
    };
    return titles[path] || 'System Overview';
  };

  const title = getPageTitle(pathname);

  return (
    <header className="h-20 glass z-20 sticky top-0 flex items-center justify-between px-8 transition-all">
      <div className="flex items-center gap-4">
        {/* Breadcrumb visual simpel */}
        <div className="hidden md:flex items-center text-xs font-medium text-slate-400 space-x-2">
            <span>Bobing</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{title}</span>
        </div>
        
        {/* Judul Mobile */}
        <h2 className="md:hidden text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center space-x-6">
        {/* Search Bar Dummy (Hiasan Modern) */}
        <div className="hidden md:flex items-center bg-slate-100/50 rounded-full px-4 py-2 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all w-64">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder="Quick search..." className="bg-transparent border-none text-sm ml-2 focus:outline-none text-slate-600 w-full placeholder-slate-400" />
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-50">
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </button>
      </div>
    </header>
  );
}