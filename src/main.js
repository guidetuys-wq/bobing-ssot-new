// src/main.js

// --- 1. IMPORT MODUL DARI FILE LOKAL (FIXED) ---
import './css/styles.css'; // Import CSS via JS bundler
// Mengambil variabel auth, db, functions, sortBySize, dan showToast dari file firebase.js
import { auth, db, functions, sortBySize, showToast } from '../lib/firebase.js'; 

// Import fungsi yang dibutuhkan oleh router (harus diimport dari library aslinya)
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'; 

// Import semua view modules (Pastikan semua file ada di src/views/)
import * as DashboardView from './views/dashboard.js';
import * as LoginView from './views/auth-login.js';
import * as MasterProductsView from './views/master-products.js';
import * as MasterVariantsView from './views/master-variants.js';
import * as MasterBrandsView from './views/master-brands.js';
import * as MasterCategoriesView from './views/master-categories.js';
import * as MasterWarehousesView from './views/master-warehouses.js';
import * as MasterSuppliersView from './views/master-suppliers.js';
import * as MasterCustomersView from './views/master-customers.js';
import * as MasterCoaView from './views/master-coa.js';
import * as OpsInventoryView from './views/ops-inventory.js';
import * as OpsVirtualStockView from './views/ops-virtual-stock.js';
import * as OpsPurchasesView from './views/ops-purchases.js';
import * as OpsPosView from './views/ops-pos.js';
import * as OpsImportSalesView from './views/ops-import-sales.js';
import * as OpsImportProductsView from './views/ops-import-products.js';
import * as OpsImportPurchasesView from './views/ops-import-purchases.js';
import * as FinCashflowView from './views/fin-cashflow.js';
import * as FinReportPlView from './views/fin-report-pl.js';
import * as FinReportBalanceView from './views/fin-report-balance.js';


// --- 4. UI REFERENCES ---
const sidebar = document.getElementById('sidebar');
const topbar = document.getElementById('topbar');
const appContainer = document.getElementById('app');
const pageTitle = document.getElementById('page-title');
const userEmailDisplay = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const mobileOverlay = document.getElementById('mobile-overlay');

// --- 5. AUTH HANDLING ---
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        if (userEmailDisplay) userEmailDisplay.textContent = user.email;
        if (location.hash === '#/login' || location.hash === '') {
            window.location.hash = '#/dashboard';
        } else {
            loadPage();
        }
    } else {
        window.location.hash = '#/login';
    }
});

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try { await signOut(auth); } catch (error) { alert('Gagal logout'); }
    });
}

// --- 6. MOBILE MENU ---
if(btnMobileMenu && sidebar && mobileOverlay) {
    const closeMenu = () => {
        sidebar.classList.add('-translate-x-full');
        mobileOverlay.classList.add('hidden');
    };
    const openMenu = () => {
        sidebar.classList.remove('-translate-x-full');
        mobileOverlay.classList.remove('hidden');
    };

    btnMobileMenu.addEventListener('click', openMenu);
    mobileOverlay.addEventListener('click', closeMenu);
    
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) closeMenu();
        });
    });
}

// --- 7. ROUTER LOGIC (FIXED MODAL ISSUE) ---
async function loadPage() {
    const fullHash = location.hash || '#/dashboard';
    const hash = fullHash.split('?')[0]; 
    
    if (!currentUser && hash !== '#/login') return;

    if (hash === '#/login') {
        sidebar.classList.add('hidden'); sidebar.classList.remove('flex');
        topbar.classList.add('hidden');
    } else {
        sidebar.classList.remove('hidden'); sidebar.classList.add('flex');
        topbar.classList.remove('hidden');
        updateSidebarActive(hash);
    }

    // Loading State
    appContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div><p class="text-sm font-medium animate-pulse text-slate-500">Memuat Aplikasi...</p></div>';

    try {
        let viewModule;
        let title = 'Dashboard';

        // ROUTE MAPPING
        switch (hash) {
            case '#/login': title = 'Login'; viewModule = LoginView; break;
            case '#/dashboard': title = 'Executive Dashboard'; viewModule = DashboardView; break;
            
            case '#/products': title = 'Product Models'; viewModule = MasterProductsView; break;
            case '#/variants': title = 'Master SKU'; viewModule = MasterVariantsView; break;
            case '#/brands': title = 'Master Brands'; viewModule = MasterBrandsView; break;
            case '#/categories': title = 'Master Categories'; viewModule = MasterCategoriesView; break;
            case '#/warehouses': title = 'Master Gudang'; viewModule = MasterWarehousesView; break;
            case '#/suppliers': title = 'Master Supplier'; viewModule = MasterSuppliersView; break;
            case '#/customers': title = 'Customer CRM'; viewModule = MasterCustomersView; break;
            case '#/finance-accounts': title = 'Chart of Accounts'; viewModule = MasterCoaView; break;

            case '#/inventory': title = 'Inventory Control'; viewModule = OpsInventoryView; break;
            case '#/supplier-sessions': title = 'Virtual Stock Map'; viewModule = OpsVirtualStockView; break;
            case '#/purchases': title = 'Purchase Orders'; viewModule = OpsPurchasesView; break;
            case '#/sales-manual': title = 'Point of Sale'; viewModule = OpsPosView; break;
            
            case '#/sales-import': title = 'Import Sales Desty'; viewModule = OpsImportSalesView; break;
            case '#/products-import': title = 'Import Products'; viewModule = OpsImportProductsView; break;
            case '#/purchases-import': title = 'Import PO'; viewModule = OpsImportPurchasesView; break;

            case '#/cash': title = 'Cash Flow'; viewModule = FinCashflowView; break;
            case '#/finance-reports': title = 'Profit & Loss'; viewModule = FinReportPlView; break;
            case '#/finance-balance': title = 'Balance Sheet'; viewModule = FinReportBalanceView; break;

            default:
                title = '404 Not Found';
                appContainer.innerHTML = `<div class="p-10 text-center"><h1 class="text-2xl font-bold text-slate-400">Halaman tidak ditemukan</h1><p class="text-slate-500 mt-2">${hash}</p></div>`;
                return;
        }

        pageTitle.textContent = title;
        document.title = `${title} - Bobing SSOT`;

        if (viewModule && typeof viewModule.render === 'function') {
            appContainer.innerHTML = ''; 
            
            // Create Wrapper for Animation
            const wrapper = document.createElement('div');
            wrapper.className = 'fade-in w-full h-full'; 
            appContainer.appendChild(wrapper);
            
            // Hapus class animasi setelah selesai (400ms) agar properti 'transform' hilang.
            setTimeout(() => {
                wrapper.classList.remove('fade-in');
            }, 400);

            await viewModule.render(wrapper); 
        }

    } catch (error) {
        console.error('Routing Error:', error);
        appContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><div class="text-red-100 bg-red-500 p-4 rounded-full mb-4"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><h3 class="text-lg font-bold text-slate-800">Gagal Memuat Halaman</h3><p class="text-slate-500 mt-2 text-sm max-w-md">${error.message}</p></div>`;
    }
}

function updateSidebarActive(currentHash) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentHash) {
            link.classList.add('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-500/30');
            link.classList.remove('hover:bg-slate-800', 'opacity-70');
            const icon = link.querySelector('svg');
            if(icon) icon.classList.replace('text-slate-400', 'text-white');
        } else {
            link.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-500/30');
            link.classList.add('hover:bg-slate-800', 'opacity-70');
            const icon = link.querySelector('svg');
            if(icon) icon.classList.replace('text-white', 'text-slate-400');
        }
    });
}

window.addEventListener('hashchange', loadPage);