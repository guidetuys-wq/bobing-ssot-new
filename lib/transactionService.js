// lib/transactionService.js
import { doc, collection, serverTimestamp, increment } from 'firebase/firestore';

/**
 * HELPER: Catat Ledger (Buku Besar)
 * Mencatat satu baris transaksi dan update saldo akun terkait.
 */
const recordJournalEntry = (db, batch, { accountId, type, amount, description, refId, refType, categoryName, balanceAdjustment }) => {
    if (!accountId || !amount || amount <= 0) return;

    const timestamp = serverTimestamp();
    const transRef = doc(collection(db, "cash_transactions")); // Bisa dimigrasi ke nama 'general_ledger' nanti

    // 1. Simpan Log Transaksi
    batch.set(transRef, {
        account_id: accountId,
        type: type === 'debit' ? 'in' : 'out', // Mapping legacy: in=debit, out=kredit
        debit: type === 'debit' ? amount : 0,
        credit: type === 'credit' ? amount : 0,
        amount: amount,
        description: description || '-',
        ref_id: refId || '',
        ref_type: refType || 'manual',
        category: categoryName || 'General',
        created_at: timestamp,
        date: timestamp
    });

    // 2. Update Saldo Akun (Chart of Accounts)
    // balanceAdjustment: kirim nilai positif (+) atau negatif (-) sesuai logika akun
    const accRef = doc(db, "chart_of_accounts", accountId);
    batch.update(accRef, { 
        balance: increment(balanceAdjustment),
        updated_at: timestamp
    });
};

/**
 * 1. TRANSAKSI PENJUALAN (SALES)
 * Mencatat: Omzet (Revenue) dan HPP (COGS) sekaligus.
 */
export const recordSalesTransaction = (db, batch, {
    orderId, totalRevenue, totalCost, walletId, financeConfig, userEmail
}) => {
    if (!financeConfig) {
        console.error("Finance Config Missing for Sales!");
        return;
    }

    // A. JURNAL PENDAPATAN (REVENUE)
    // [Debit] Kas/Bank -> Saldo Bertambah (+)
    recordJournalEntry(db, batch, {
        accountId: walletId,
        type: 'debit',
        amount: totalRevenue,
        description: `Penjualan POS #${orderId}`,
        refId: orderId,
        refType: 'sales_order',
        categoryName: 'Pendapatan Usaha',
        balanceAdjustment: totalRevenue 
    });

    // [Kredit] Pendapatan Penjualan (4101) -> Saldo Bertambah (+) *Akun Pasiva Normal Kredit
    recordJournalEntry(db, batch, {
        accountId: financeConfig.defaultRevenueId || '4101', 
        type: 'credit',
        amount: totalRevenue,
        description: `Pendapatan #${orderId}`,
        refId: orderId,
        refType: 'sales_order',
        categoryName: 'Pendapatan Usaha',
        balanceAdjustment: totalRevenue 
    });

    // B. JURNAL HPP (COST OF GOODS SOLD)
    if (totalCost > 0) {
        // [Debit] Beban HPP (5101) -> Saldo Bertambah (+) *Akun Beban Normal Debit
        recordJournalEntry(db, batch, {
            accountId: financeConfig.defaultCOGSId || '5101',
            type: 'debit',
            amount: totalCost,
            description: `HPP #${orderId}`,
            refId: orderId,
            refType: 'sales_order',
            categoryName: 'Harga Pokok Penjualan',
            balanceAdjustment: totalCost 
        });

        // [Kredit] Persediaan Barang (1301) -> Saldo Berkurang (-) *Akun Aset Normal Debit
        recordJournalEntry(db, batch, {
            accountId: financeConfig.defaultInventoryId || '1301',
            type: 'credit',
            amount: totalCost,
            description: `Pengurangan Stok #${orderId}`,
            refId: orderId,
            refType: 'sales_order',
            categoryName: 'Persediaan Barang',
            balanceAdjustment: -totalCost 
        });
    }
};

/**
 * 2. TRANSAKSI PEMBELIAN (PURCHASE)
 * Mencatat: Tambah Stok (Inventory) dan Hutang/Kas Keluar.
 */
export const recordPurchaseTransaction = (db, batch, {
    poId, totalAmount, isPaid, walletId, supplierName, financeConfig
}) => {
    if (!financeConfig) return;

    // [Debit] Persediaan Barang (1301) -> Saldo Bertambah (+)
    recordJournalEntry(db, batch, {
        accountId: financeConfig.defaultInventoryId || '1301',
        type: 'debit',
        amount: totalAmount,
        description: `Stok Masuk PO #${poId} (${supplierName})`,
        refId: poId,
        refType: 'purchase_order',
        categoryName: 'Persediaan Barang',
        balanceAdjustment: totalAmount
    });

    if (isPaid && walletId) {
        // [Kredit] Kas/Bank -> Saldo Berkurang (-)
        recordJournalEntry(db, batch, {
            accountId: walletId,
            type: 'credit',
            amount: totalAmount,
            description: `Bayar Lunas PO #${poId}`,
            refId: poId,
            refType: 'purchase_order',
            categoryName: 'Pembelian Stok',
            balanceAdjustment: -totalAmount
        });
    } else {
        // [Kredit] Hutang Usaha (2101) -> Saldo Bertambah (+) *Akun Kewajiban Normal Kredit
        recordJournalEntry(db, batch, {
            accountId: financeConfig.defaultPayableId || '2101',
            type: 'credit',
            amount: totalAmount,
            description: `Hutang PO #${poId}`,
            refId: poId,
            refType: 'purchase_order',
            categoryName: 'Hutang Usaha',
            balanceAdjustment: totalAmount
        });
    }
};

/**
 * 3. TRANSAKSI ADJUSTMENT (STOK OPNAME/SHRINKAGE)
 * Mencatat: Kerugian selisih stok.
 */
export const recordAdjustmentTransaction = (db, batch, {
    refId, totalValue, type, financeConfig
}) => {
    if (!financeConfig || totalValue === 0) return;

    // type: 'loss' (Barang Hilang)
    if (type === 'loss') {
        const absValue = Math.abs(totalValue);

        // [Debit] Beban Selisih Stok (5103) -> Saldo Bertambah (+)
        recordJournalEntry(db, batch, {
            accountId: financeConfig.defaultShrinkageId || '5103',
            type: 'debit',
            amount: absValue,
            description: `Stok Hilang/Rusak #${refId}`,
            refId: refId,
            refType: 'adjustment',
            categoryName: 'Beban Selisih Stok',
            balanceAdjustment: absValue
        });

        // [Kredit] Persediaan Barang (1301) -> Saldo Berkurang (-)
        recordJournalEntry(db, batch, {
            accountId: financeConfig.defaultInventoryId || '1301',
            type: 'credit',
            amount: absValue,
            description: `Koreksi Stok #${refId}`,
            refId: refId,
            refType: 'adjustment',
            categoryName: 'Persediaan Barang',
            balanceAdjustment: -absValue
        });
    }
    // Note: Logic 'found' (Barang Lebih) bisa ditambahkan jika perlu (Reverse jurnal di atas)
};

/**
 * 4. LEGACY SUPPORT (Agar kode lama tidak error)
 * Mengarahkan logic lama ke format jurnal manual sederhana.
 */
export const recordTransaction = (db, batch, params) => {
    // Fallback untuk kode yang belum dimigrasi (misal: pengeluaran beban operasional manual)
    const isIncome = params.type === 'in';
    
    recordJournalEntry(db, batch, {
        accountId: params.walletId,
        type: isIncome ? 'debit' : 'credit',
        amount: params.amount,
        description: params.description,
        refId: params.refId,
        refType: params.refType,
        categoryName: params.categoryName,
        balanceAdjustment: isIncome ? params.amount : -params.amount
    });

    // Lawan transaksi (Category Account)
    if (params.categoryId && params.categoryId !== 'unassigned') {
        recordJournalEntry(db, batch, {
            accountId: params.categoryId,
            type: isIncome ? 'credit' : 'debit', // Lawan dari wallet
            amount: params.amount,
            description: `Lawan: ${params.description}`,
            refId: params.refId,
            refType: params.refType,
            categoryName: 'Auto-Offset',
            balanceAdjustment: params.amount // Asumsi akun lawan selalu bertambah nilainya (Revenue/Expense)
        });
    }
};