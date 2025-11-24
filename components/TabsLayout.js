"use client";
import { useState } from 'react';

export default function TabsLayout({ title, subtitle, tabs, children }) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Filter children berdasarkan activeTab
  // Asumsi children dikirim sebagai object/map dengan key sesuai id tab, atau kita render conditional di parent
  
  return (
    <div className="fade-in pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{title}</h2>
          <p className="text-sm text-lumina-muted mt-1 font-light">{subtitle}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-6 border-b border-lumina-border/50 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-6 py-2.5 text-sm font-bold rounded-t-lg transition-all duration-300 whitespace-nowrap relative
              ${activeTab === tab.id 
                ? 'text-lumina-gold bg-lumina-highlight/50 border-b-2 border-lumina-gold' 
                : 'text-lumina-muted hover:text-white hover:bg-white/5 border-b-2 border-transparent'
              }
            `}
          >
            {tab.label}
            {/* Active Glow Effect */}
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-lumina-gold/5 rounded-t-lg blur-sm"></div>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="animate-fade-in min-h-[500px]">
        {/* Render content based on function passed or activeTab check */}
        {children(activeTab)}
      </div>
    </div>
  );
}