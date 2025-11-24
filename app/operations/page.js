"use client";
import TabsLayout from '@/components/TabsLayout';
import TransactionsHistoryPage from '../transactions-history/page';
import PurchasesPage from '../purchases/page';
import InventoryPage from '../inventory/page';
import SupplierSessionsPage from '../supplier-sessions/page';

export default function OperationsHub() {
  const tabs = [
    { id: 'sales', label: '🛒 Riwayat Penjualan' },
    { id: 'purchases', label: '🚚 Pembelian (PO)' },
    { id: 'inventory', label: '📦 Stok Inventory' },
    { id: 'virtual', label: '☁️ Virtual Stock' },
  ];

  return (
    <TabsLayout 
      title="Operations Hub" 
      subtitle="Pusat aktivitas transaksi dan pergerakan stok."
      tabs={tabs}
    >
      {(activeTab) => (
        <>
          {activeTab === 'sales' && <TransactionsHistoryPage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'virtual' && <SupplierSessionsPage />}
        </>
      )}
    </TabsLayout>
  );
}