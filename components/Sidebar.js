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
    const active = pathname === path;
    return active
      ? "bg-gray-800 text-white font-medium" 
      : "text-gray-400 hover:text-white hover:bg-gray-800/50";
  };

  const NavItem = ({ href, label, icon }) => (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 mb-0.5 ${isActive(href)}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );

  const NavHeader = ({ title }) => (
    <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {title}
    </div>
  );

  const Icon = ({ d }) => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>;

  return (
    // PERUBAHAN PENTING DI SINI: 'fixed md:static'
    // Artinya: Fixed di Mobile (melayang), Static di Desktop (makan tempat)
    <aside className="hidden md:flex w-72 bg-gray-900 flex-col h-full fixed md:static top-0 left-0 z-30 border-r border-gray-800 shrink-0">
      
      {/* --- LOGO --- */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg ring-1 ring-white/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Bobing</span>
        </div>
      </div>

      {/* --- MENU --- */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto scrollbar-hide">
        <NavItem href="/dashboard" label="Dashboard" icon={<Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />} />

        <NavHeader title="Inventory" />
        <NavItem href="/products" label="Products" icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />} />
        <NavItem href="/variants" label="Variants" icon={<Icon d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />} />
        <NavItem href="/inventory" label="Stock Control" icon={<Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />} />

        <NavHeader title="Sales" />
        <NavItem href="/sales-manual" label="Point of Sale" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        <NavItem href="/sales-import" label="Import Sales" icon={<Icon d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />} />

        <NavHeader title="Finance" />
        <NavItem href="/cash" label="Cash Flow" icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />} />
        <NavItem href="/finance-reports" label="Reports" icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />} />
      </nav>

      {/* --- USER PROFILE --- */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-gray-800">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-gray-400 truncate">Administrator</p>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </button>
        </div>
      </div>
    </aside>
  );
}