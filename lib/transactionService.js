// lib/transactionService.js
import { doc, collection, serverTimestamp, increment } from 'firebase/firestore';

export const recordTransaction = (db, batch, params) => {
    /* LOGIKA DOUBLE ENTRY SEDERHANA (Untuk Non-Akuntan):
       1. Wallet (Kas/Bank): 
          - Jika Tipe IN (Masuk) -> Saldo Bertambah (+)
          - Jika Tipe OUT (Keluar) -> Saldo Berkurang (-)
       
       2. Category (Lawan):
          - Kita asumsikan saldo akun lawan selalu bertambah nilainya (Akumulasi).
            Contoh: Pendapatan bertambah, Beban bertambah, Stok bertambah.
            Kecuali untuk pelunasan hutang (Liability), logic ini mungkin perlu penyesuaian nanti,
            tapi untuk fase ini: Saldo Akun Lawan kita Tambah (+) agar tercatat mutasinya.
    */

    if (!params.amount || params.amount <= 0) return;
    if (!params.walletId) {
        console.error("Transaction Error: Wallet ID missing");
        return;
    }

    const timestamp = serverTimestamp();

    // 1. CATAT JURNAL TRANSAKSI
    const transRef = doc(collection(db, "cash_transactions"));
    batch.set(transRef, {
        type: params.type,
        amount: params.amount,
        account_id: params.walletId,          
        category_account_id: params.categoryId || 'unassigned',
        category: params.categoryName || 'General', 
        description: params.description || '-',
        ref_type: params.refType || 'manual',
        ref_id: params.refId || '',
        created_by: params.userEmail || 'system',
        date: timestamp,
        created_at: timestamp
    });

    // 2. UPDATE SALDO AKUN UTAMA (WALLET)
    const walletRef = doc(db, "chart_of_accounts", params.walletId);
    const walletAdjustment = params.type === 'in' ? params.amount : -params.amount;
    batch.update(walletRef, { 
        balance: increment(walletAdjustment),
        updated_at: timestamp
    });

    // 3. UPDATE SALDO AKUN LAWAN (CATEGORY) - NEW!
    // Agar Neraca Balance: Akun lawan juga harus terisi nilainya
    if (params.categoryId && params.categoryId !== 'unassigned') {
        const catRef = doc(db, "chart_of_accounts", params.categoryId);
        
        // Logic Umum: Nilai akun lawan bertambah (Akumulasi Revenue / Expense / Asset)
        // (Untuk hutang piutang yang kompleks, logic ini bisa diperdalam nanti)
        batch.update(catRef, {
            balance: increment(params.amount), 
            updated_at: timestamp
        });
    }
};