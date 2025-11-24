"use client";
import { useState } from 'react';

export default function TabsLayout({ title, subtitle, tabs, children }) {
  // Default ke tab pertama
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="fade-in pb-24">
      {/* Header Section (Konsisten dengan PageHeader) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-lumina-border/50 pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs md:text-sm text-lumina-muted mt-1 font-light">{subtitle}</p>
        </div>
      </div>

      {/* Tabs Navigation - Scrollable on Mobile */}
      <div className="sticky top-0 z-10 bg-lumina-base/95 backdrop-blur-sm -mx-4 px-4 md:mx-0 md:px-0 pt-2">
        <div className="flex overflow-x-auto scrollbar-hide gap-2 border-b border-lumina-border/50 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 md:px-6 py-2.5 text-xs md:text-sm font-bold rounded-t-lg transition-all duration-300 whitespace-nowrap relative
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
      </div>

      {/* Content Area */}
      <div className="mt-6 animate-fade-in min-h-[500px]">
        {children(activeTab)}
      </div>
    </div>
  );
}