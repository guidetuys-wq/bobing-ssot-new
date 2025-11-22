// components/Topbar.js
"use client";
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') return null;

  const titleMap = {
    '/dashboard': 'Dashboard',
    '/products': 'Products',
    '/variants': 'Variants',
    '/inventory': 'Inventory',
    '/sales-manual': 'Point of Sale',
    '/finance-reports': 'Reports'
  };
  const title = titleMap[pathname] || 'Overview';

  return (
    <header className="glass-nav h-16 px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-2 w-64 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Notification Bell */}
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
}