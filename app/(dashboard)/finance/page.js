// app/(dashboard)/finance/page.js
"use client";
import React from 'react';
import TabsLayout from '@/components/TabsLayout';
// Ikon yang dibutuhkan (Ikon ini sudah benar dari DashboardIcons.jsx)
import { ProfitLossIcon, BalanceSheetIcon, CashFlowIcon, ChartOfAccountsIcon } from '@/components/DashboardIcons'; 

// PERBAIKAN IMPORT JALUR: Menggunakan path relatif ke sub-folder BARU (yang sudah kita pindahkan)
import CashFlowPage from './cash/page';              
import ReportPLPage from './reports/page';          
import BalanceSheetPage from './balance/page';      
import FinanceAccountsPage from './accounts/page';    

// PERBAIKAN KONFLIK NAMA: Hanya ada satu default export
export default function FinanceCenter() {
  const tabs = [
    {
      label: 'Accounts',
      path: '/finance/accounts',
      component: FinanceAccountsPage,
      icon: <ChartOfAccountsIcon /> 
    },
    {
      label: 'Balance Sheet',
      path: '/finance/balance',
      component: BalanceSheetPage,
      icon: <BalanceSheetIcon />
    },
    {
      label: 'Cash Flow',
      path: '/finance/cash',
      component: CashFlowPage,
      icon: <CashFlowIcon />
    },
    {
      label: 'Reports',
      path: '/finance/reports',
      component: ReportPLPage,
      icon: <ProfitLossIcon />
    },
  ];

  return (
    <TabsLayout 
      tabs={tabs} 
      defaultPath='/finance/accounts' 
      pageTitle="Finance Center"
      pageSubtitle="Pusat Ringkasan dan Laporan Keuangan"
    />
  );
}