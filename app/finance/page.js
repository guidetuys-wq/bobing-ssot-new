// app/finance/page.js
"use client";
import { useState } from 'react';
import CashFlowView from '@/components/finance/CashFlowView';
import ProfitLossView from '@/components/finance/ProfitLossView';
import BalanceSheetView from '@/components/finance/BalanceSheetView';
import CoaView from '@/components/finance/CoaView';

export default function FinanceHubPage() {
  const [activeTab, setActiveTab] = useState('cashflow');

  const tabs = [
    { id: 'cashflow', label: 'Arus Kas', icon: '💸' },
    { id: 'pl', label: 'Laba Rugi', icon: '📈' },
    { id: 'balance', label: 'Neraca', icon: '⚖️' },
    { id: 'coa', label: 'Akun (COA)', icon: '🗂️' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pusat Keuangan</h2>
            <p className="text-sm text-gray-500 mt-1">Laporan & Manajemen Keuangan Terpadu.</p>
        </div>
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex overflow-x-auto max-w-full no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'cashflow' && <CashFlowView />}
        {activeTab === 'pl' && <ProfitLossView />}
        {activeTab === 'balance' && <BalanceSheetView />}
        {activeTab === 'coa' && <CoaView />}
      </div>
    </div>
  );
}