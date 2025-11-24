"use client";
import TabsLayout from '@/components/TabsLayout';
import CashFlowPage from '../cash/page';
import ReportPLPage from '../finance-reports/page';
import BalanceSheetPage from '../finance-balance/page';
import FinanceAccountsPage from '../finance-accounts/page';

export default function FinanceCenter() {
  const tabs = [
    { id: 'dashboard', label: '📊 Laba Rugi' },
    { id: 'balance', label: '⚖️ Neraca' },
    { id: 'cash', label: '💸 Arus Kas' },
    { id: 'accounts', label: '📒 Chart of Accounts' },
  ];

  return (
    <TabsLayout 
      title="Finance Control" 
      subtitle="Pusat kendali keuangan, akuntansi, dan laporan."
      tabs={tabs}
    >
      {(activeTab) => (
        <>
          {activeTab === 'dashboard' && <ReportPLPage />}
          {activeTab === 'balance' && <BalanceSheetPage />}
          {activeTab === 'cash' && <CashFlowPage />}
          {activeTab === 'accounts' && <FinanceAccountsPage />}
        </>
      )}
    </TabsLayout>
  );
}