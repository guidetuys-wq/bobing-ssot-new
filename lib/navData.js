// lib/navData.js

// Import SVG paths dari file DashboardIcons.jsx
import { 
    D_DASH, D_POS, D_CATALOG, D_STOCK, D_PURCHASES, D_MONEY,
    D_MASTER, D_OPS, D_PARTNER, D_SETTINGS 
} from '@/components/DashboardIcons'; 

// Struktur data navigasi
export const navData = [
  {
    title: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", iconD: D_DASH },
    ]
  },
  {
    title: "Business Flow",
    items: [
      { 
        href: "/catalog", 
        label: "Catalog", 
        iconD: D_CATALOG,
        subItems: [
          { href: "/catalog/products", label: "Products" },
          { href: "/catalog/variants", label: "Variants" },
          { href: "/catalog/categories", label: "Categories" },
          { href: "/catalog/collections", label: "Collections" },
          { href: "/catalog/brands", label: "Brands" },
          { href: "/catalog/import", label: "Import Products" },
        ]
      },
      { 
        href: "/stock", 
        label: "Stock", 
        iconD: D_STOCK,
        subItems: [
          { href: "/stock/inventory", label: "Inventory" },
          { href: "/stock/warehouses", label: "Warehouses" },
          { href: "/stock/supplier-sessions", label: "Supplier Sessions" },
        ]
      },
      { 
        href: "/purchases", 
        label: "Purchases", 
        iconD: D_PURCHASES,
        subItems: [
          { href: "/purchases", label: "Overview" },
          { href: "/purchases/suppliers", label: "Suppliers" },
          { href: "/purchases/import", label: "Import Purchases" },
        ]
      },
      { 
        href: "/sales", 
        label: "Sales", 
        iconD: D_POS, 
        subItems: [
          { href: "/sales/manual", label: "Manual Sales" },
          { href: "/sales/import", label: "Import Sales" },
          { href: "/sales/transactions", label: "Transactions History" },
          { href: "/sales/customers", label: "Customers" },
        ]
      },
    ]
  },
  {
    title: "Accounting",
    items: [
      { 
        href: "/finance", 
        label: "Finance", 
        iconD: D_MONEY,
        subItems: [
          { href: "/finance", label: "Overview" }, // Dashboard Finance
          { href: "/finance/accounts", label: "Accounts" },
          { href: "/finance/cash", label: "Cash & Journal" }, // Updated Label agar lebih jelas
          { href: "/finance/reports", label: "Profit & Loss" }, // Laba Rugi
          { href: "/finance/balance", label: "Balance Sheet" }, // Neraca
        ]
      },
    ]
  },
];

// Data untuk footer (Settings)
export const footerNav = {
  href: "/settings", 
  label: "Settings", 
  description: "System Config",
  iconD: D_SETTINGS 
};