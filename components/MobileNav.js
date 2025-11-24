"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Portal } from '../lib/usePortal';

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user || pathname === '/login') return null;

  // Fungsi cek aktif (mendukung nested routes)
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  // Icon Helper
  const NavIcon = ({ d, active }) => (
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'text-lumina-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] -translate-y-1' : 'text-lumina-muted'}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.5"} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  // Drawer Item Helper
  const DrawerItem = ({ href, label, iconD, description, onClick }) => (
    <Link 
      href={href}
      onClick={() => { setIsMenuOpen(false); if(onClick) onClick(); }}
      className="flex items-start gap-4 p-4 rounded-2xl bg-lumina-base/50 border border-lumina-border/50 active:bg-lumina-highlight transition-all active:scale-95"
    >
      <div className="w-10 h-10 rounded-full bg-lumina-highlight flex items-center justify-center text-lumina-gold shrink-0 shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={iconD} /></svg>
      </div>
      <div>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="text-[10px] text-lumina-muted leading-tight">{description}</span>
      </div>
    </Link>
  );

  return (
    <>
      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="md:hidden glass-bottom-nav flex justify-around items-end h-[70px] px-2 fixed bottom-0 w-full z-50 bg-[#12141C]/95 border-t border-lumina-border/50 pb-safe pt-2">
        
        {/* 1. HOME */}
        <Link href="/dashboard" className="flex flex-col items-center justify-center w-16 h-full gap-1 pb-2" onClick={() => setIsMenuOpen(false)}>
          <NavIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" active={isActive('/dashboard')} />
          <span className={`text-[9px] font-bold tracking-wide ${isActive('/dashboard') ? 'text-white' : 'text-lumina-muted'}`}>Home</span>
        </Link>

        {/* 2. OPERATIONS (Hub) */}
        <Link href="/operations" className="flex flex-col items-center justify-center w-16 h-full gap-1 pb-2" onClick={() => setIsMenuOpen(false)}>
          <NavIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" active={isActive('/operations')} />
          <span className={`text-[9px] font-bold tracking-wide ${isActive('/operations') ? 'text-white' : 'text-lumina-muted'}`}>Ops</span>
        </Link>

        {/* 3. POS (Floating Center) */}
        <div className="relative -top-6">
           <Link href="/sales-manual">
             <button 
               className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center text-black shadow-[0_0_25px_rgba(212,175,55,0.5)] border-4 border-[#12141C] active:scale-95 transition-transform"
               onClick={() => setIsMenuOpen(false)}
             >
               <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
             </button>
           </Link>
        </div>

        {/* 4. FINANCE */}
        <Link href="/finance" className="flex flex-col items-center justify-center w-16 h-full gap-1 pb-2" onClick={() => setIsMenuOpen(false)}>
          <NavIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" active={isActive('/finance')} />
          <span className={`text-[9px] font-bold tracking-wide ${isActive('/finance') ? 'text-white' : 'text-lumina-muted'}`}>Keuangan</span>
        </Link>

        {/* 5. MENU (Drawer Trigger) */}
        <button className="flex flex-col items-center justify-center w-16 h-full gap-1 pb-2 focus:outline-none" onClick={() => setIsMenuOpen(true)}>
          <NavIcon d="M4 6h16M4 12h16M4 18h16" active={isMenuOpen} />
          <span className={`text-[9px] font-bold tracking-wide ${isMenuOpen ? 'text-white' : 'text-lumina-muted'}`}>Menu</span>
        </button>

      </div>

      {/* --- DRAWER MENU (FULL NAVIGATION) --- */}
      <Portal>
        <div className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}>
          
          {/* Backdrop with Blur */}
          <div 
            className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className={`absolute bottom-0 left-0 right-0 bg-[#12141C] rounded-t-[32px] border-t border-lumina-border shadow-2xl p-6 pb-32 transition-transform duration-300 transform ${isMenuOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[85vh] overflow-y-auto`}>
            
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-lumina-border rounded-full mx-auto mb-8 opacity-50" />
            
            <div className="space-y-8 animate-fade-in">
              
              {/* Section 1: Core Data */}
              <div>
                <h3 className="text-xs font-bold text-lumina-gold uppercase tracking-widest mb-4 px-1">Core Data Management</h3>
                <div className="grid gap-3">
                  <DrawerItem 
                    href="/master" 
                    label="Master Data Center" 
                    description="Produk, SKU, Kategori & Brand"
                    iconD="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                  <DrawerItem 
                    href="/partners" 
                    label="Partner & Locations" 
                    description="Pelanggan, Supplier & Gudang"
                    iconD="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </div>
              </div>

              {/* Section 2: Tools */}
              <div>
                <h3 className="text-xs font-bold text-lumina-gold uppercase tracking-widest mb-4 px-1">System Tools</h3>
                <div className="grid grid-cols-2 gap-3">
                   <DrawerItem 
                    href="/products-import" 
                    label="Import Produk" 
                    description="Upload Excel"
                    iconD="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                  <DrawerItem 
                    href="/purchases-import" 
                    label="Import PO" 
                    description="Stok Masuk"
                    iconD="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                  />
                   <DrawerItem 
                    href="/sales-import" 
                    label="Import Sales" 
                    description="Rekap Marketplace"
                    iconD="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                   <DrawerItem 
                    href="/settings" 
                    label="Settings" 
                    description="Konfigurasi Toko"
                    iconD="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                </div>
              </div>

              {/* Footer Info */}
              <div className="pt-6 border-t border-lumina-border/30 text-center">
                 <p className="text-xs text-lumina-muted">Lumina Enterprise v2.0</p>
                 <p className="text-[10px] text-lumina-muted/50 mt-1">Logged in as {user?.email}</p>
              </div>

            </div>
          </div>
        </div>
      </Portal>
    </>
  );
}