"use client";
import TabsLayout from '@/components/TabsLayout';
import ProductsPage from '../products/page'; // Import file page lama sebagai komponen
import VariantsPage from '../variants/page';
import CategoriesPage from '../categories/page';
import BrandsPage from '../brands/page';

export default function MasterDataCenter() {
  const tabs = [
    { id: 'products', label: '📦 Produk' },
    { id: 'variants', label: '🏷️ Varian SKU' },
    { id: 'categories', label: '📂 Kategori' },
    { id: 'brands', label: '✨ Brands' },
  ];

  return (
    <TabsLayout 
      title="Master Data Center" 
      subtitle="Pusat pengelolaan katalog produk dan atribut."
      tabs={tabs}
    >
      {(activeTab) => (
        <>
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'variants' && <VariantsPage />}
          {activeTab === 'categories' && <CategoriesPage />}
          {activeTab === 'brands' && <BrandsPage />}
        </>
      )}
    </TabsLayout>
  );
}