"use client";
import TabsLayout from '@/components/TabsLayout';
import CustomersPage from '../customers/page';
import SuppliersPage from '../suppliers/page';
import WarehousesPage from '../warehouses/page';

export default function PartnerCenter() {
  const tabs = [
    { id: 'customers', label: '👥 Pelanggan' },
    { id: 'suppliers', label: '🏭 Supplier' },
    { id: 'warehouses', label: '🏢 Gudang' },
  ];

  return (
    <TabsLayout 
      title="Partner & Locations" 
      subtitle="Kelola relasi bisnis dan lokasi penyimpanan."
      tabs={tabs}
    >
      {(activeTab) => (
        <>
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'suppliers' && <SuppliersPage />}
          {activeTab === 'warehouses' && <WarehousesPage />}
        </>
      )}
    </TabsLayout>
  );
}