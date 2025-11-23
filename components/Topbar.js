// components/Topbar.js
"use client";
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') return null;

  const getTitle = (path) => {
    if (path === '/dashboard') return 'Executive Dashboard';
    if (path.includes('products')) return 'Master Product';
    return 'System Overview';
  };

  return (
    <header className="glass-nav-dark h-16 px-8 flex items-center justify-between">
      {/* Judul */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-display font-semibold text-white tracking-wide">
          {getTitle(pathname)}
        </h2>
      </div>

      {/* Search & Tools */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-lumina-base border border-lumina-border rounded-lg px-3 py-1.5 w-64 focus-within:border-lumina-gold focus-within:ring-1 focus-within:ring-lumina-gold transition-all">
          <svg className="w-4 h-4 text-lumina-muted mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" placeholder="Search..." className="bg-transparent text-sm outline-none w-full text-lumina-text placeholder-lumina-muted/50 font-mono" />
        </div>
        
        <button className="p-2 text-lumina-muted hover:text-lumina-gold transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </button>
      </div>
    </header>
  );
}