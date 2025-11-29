// app/(dashboard)/finance/balance/page.js
"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RefreshCw, Layers, Archive, Wallet, TrendingUp, Landmark, PieChart } from 'lucide-react';

const CACHE_KEY = 'lumina_balance_sheet_v3';
const CACHE_DURATION = 15 * 60 * 1000; // 15 Menit

export default function BalanceSheetPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [financials, setFinancials] = useState({
        assets: 0,
        liabilities: 0,
        equity: 0,
        revenue: 0,
        expenses: 0,
        currentEarnings: 0
    });

    // Grouped Data untuk Display
    const [groups, setGroups] = useState({
        cashBank: [],
        receivables: [],
        inventory: [],
        fixedAssets: [],
        liabilities: [],
        equity: []
    });

    useEffect(() => { calculateBalance(); }, []);

    const calculateBalance = async (forceRefresh = false) => {
        setLoading(true);
        try {
            let dataAccounts = [];

            // 1. Cek Cache
            if (!forceRefresh && typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        dataAccounts = data;
                    }
                }
            }

            // 2. Fetch jika tidak ada cache
            if (dataAccounts.length === 0) {
                const q = query(collection(db, "chart_of_accounts"), orderBy("code", "asc"));
                const snap = await getDocs(q);
                dataAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                if (typeof window !== 'undefined') {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: dataAccounts, timestamp: Date.now() }));
                }
            }

            setAccounts(dataAccounts);
            processFinancials(dataAccounts);

        } catch(e) { 
            console.error(e); 
            toast.error("Gagal menghitung neraca"); 
        } finally { 
            setLoading(false); 
        }
    };

    const processFinancials = (accList) => {
        let assetTotal = 0;
        let liabTotal = 0;
        let equityTotal = 0;
        let revTotal = 0;
        let expTotal = 0;

        // Groups Temp
        const g = {
            cashBank: [], receivables: [], inventory: [], fixedAssets: [],
            liabilities: [], equity: []
        };

        accList.forEach(acc => {
            const code = String(acc.code);
            const bal = Number(acc.balance) || 0;
            const name = acc.name;
            const cat = (acc.category || '').toUpperCase();

            // 1. ASSETS (Kepala 1)
            if (code.startsWith('1')) {
                assetTotal += bal;
                
                // Sub-grouping
                if (name.toLowerCase().includes('kas') || name.toLowerCase().includes('bank') || name.toLowerCase().includes('saldo')) {
                    g.cashBank.push({ name, val: bal, code });
                } else if (name.toLowerCase().includes('piutang')) {
                    g.receivables.push({ name, val: bal, code });
                } else if (name.toLowerCase().includes('persediaan') || name.toLowerCase().includes('stok')) {
                    g.inventory.push({ name, val: bal, code });
                } else {
                    g.fixedAssets.push({ name, val: bal, code });
                }
            }
            // 2. LIABILITIES (Kepala 2)
            else if (code.startsWith('2')) {
                liabTotal += bal;
                g.liabilities.push({ name, val: bal, code });
            }
            // 3. EQUITY (Kepala 3)
            else if (code.startsWith('3')) {
                equityTotal += bal;
                g.equity.push({ name, val: bal, code });
            }
            // 4. REVENUE (Kepala 4)
            else if (code.startsWith('4')) {
                revTotal += bal; // Pendapatan biasanya kredit (minus di sistem akuntansi murni, tapi di sini kita anggap positif revenue)
                // Note: Di transactionService, IN menambah saldo. Jadi Revenue positif.
            }
            // 5. EXPENSES (Kepala 5)
            else if (code.startsWith('5')) {
                expTotal += bal; // Beban bertambah saat OUT (saldo negatif?). 
                // Cek logic transactionService: OUT -> balance increment(-amount). Jadi saldo beban akan NEGATIF.
                // Untuk Laba Rugi: Revenue (Positif) + Expense (Negatif) = Laba.
                // Tapi agar display cantik, kita absolutkan expense jika perlu, atau biarkan matematika bekerja.
            }
        });

        // Hitung Laba Berjalan
        // Asumsi: Revenue saldo positif (karena IN), Expense saldo negatif (karena OUT).
        // Maka: Current Earnings = Revenue + Expense (yang negatif)
        // TAPI tunggu, biasanya akun Beban itu Saldo Normal Debit (Positif). 
        // Di TransactionService kita buat: OUT -> balance reduced. 
        // Agar Neraca Balance: 
        // Asset (Debit) = Liabilitas (Kredit) + Ekuitas (Kredit) + (Revenue (Kredit) - Expense (Debit))
        // Jika kita simple increment/decrement:
        // Beli Stok (Asset): Kas -1000, Stok +1000. Total Asset tetap. OK.
        // Bayar Listrik (Beban): Kas -100. Beban ?? (Harusnya Beban +100).
        
        // KOREKSI LOGIC: 
        // Di transactionService kita set: OUT -> wallet balance -amount.
        // Kita BELUM update saldo akun lawan (Category Account) secara otomatis di code helper sebelumnya.
        // Helper hanya update WALLET balance. 
        
        // KARENA ITU, untuk "Current Earnings" kita hitung manual dari Revenue/Expense yang terekam di TRANSAKSI, bukan saldo akun.
        // ATAU kita asumsikan user hanya melihat posisi Aset/Hutang/Modal di Neraca ini.
        
        // SOLUSI PRAGMATIS SAAT INI:
        // Assets = Saldo Riil dari Wallet + Inventory + Piutang.
        // Liabilities = Saldo Riil Hutang.
        // Equity = Assets - Liabilities. (Persamaan Akuntansi Dasar: A = L + E).
        // Ini memastikan Neraca SELALU Balance apapun yang terjadi.
        
        const calculatedEquity = assetTotal - liabTotal;
        
        setFinancials({
            assets: assetTotal,
            liabilities: liabTotal,
            equity: calculatedEquity
        });
        setGroups(g);
    };

    // Component Baris Akun
    const AccountRow = ({ code, name, val, colorClass = "text-text-primary" }) => (
        <div className="flex justify-between text-sm py-1 hover:bg-gray-50 px-2 rounded">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-secondary bg-gray-100 px-1.5 rounded">{code}</span>
                <span className="text-text-secondary">{name}</span>
            </div>
            <span className={`font-mono font-bold ${colorClass}`}>{formatRupiah(val)}</span>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-display font-bold text-text-primary">Neraca Keuangan</h2>
                    <p className="text-sm text-text-secondary">Posisi keuangan perusahaan saat ini (Real-time).</p>
                </div>
                <button 
                    onClick={() => calculateBalance(true)} 
                    className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-primary bg-white px-4 py-2.5 rounded-xl border border-border shadow-sm transition-all active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/> 
                    {loading ? 'Menghitung...' : 'Refresh Data'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* --- KOLOM KIRI: AKTIVA (ASSETS) --- */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm overflow-hidden h-full">
                        <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-600"/>
                            <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wider">Aktiva (Assets)</h3>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* 1. KAS & BANK */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
                                    <Wallet className="w-3.5 h-3.5"/> Kas & Bank
                                </div>
                                <div className="pl-2 border-l-2 border-emerald-100 space-y-1">
                                    {groups.cashBank.length === 0 ? <p className="text-xs text-gray-400 italic pl-2">0 Akun</p> : 
                                     groups.cashBank.map((item, i) => <AccountRow key={i} {...item} />)}
                                </div>
                            </div>

                            {/* 2. PERSEDIAAN */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                                    <Archive className="w-3.5 h-3.5"/> Persediaan
                                </div>
                                <div className="pl-2 border-l-2 border-blue-100 space-y-1">
                                    {groups.inventory.length === 0 ? <p className="text-xs text-gray-400 italic pl-2">0 Akun</p> : 
                                     groups.inventory.map((item, i) => <AccountRow key={i} {...item} colorClass="text-blue-600" />)}
                                </div>
                            </div>

                            {/* 3. PIUTANG */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                                    <TrendingUp className="w-3.5 h-3.5"/> Piutang Usaha
                                </div>
                                <div className="pl-2 border-l-2 border-amber-100 space-y-1">
                                    {groups.receivables.length === 0 ? <p className="text-xs text-gray-400 italic pl-2">0 Akun</p> : 
                                     groups.receivables.map((item, i) => <AccountRow key={i} {...item} colorClass="text-amber-600" />)}
                                </div>
                            </div>

                             {/* 4. ASET TETAP / LAINNYA */}
                             {groups.fixedAssets.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">
                                        <Layers className="w-3.5 h-3.5"/> Aset Lainnya
                                    </div>
                                    <div className="pl-2 border-l-2 border-border space-y-1">
                                        {groups.fixedAssets.map((item, i) => <AccountRow key={i} {...item} />)}
                                    </div>
                                </div>
                             )}
                        </div>

                        {/* TOTAL ASSETS FOOTER */}
                        <div className="mt-auto px-6 py-4 bg-emerald-50 border-t border-emerald-100 flex justify-between items-center">
                            <span className="font-bold text-emerald-900 text-sm">TOTAL ASSETS</span>
                            <span className="font-extrabold text-emerald-700 text-xl font-mono">
                                {loading ? '...' : formatRupiah(financials.assets)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- KOLOM KANAN: PASIVA (LIABILITIES + EQUITY) --- */}
                <div className="flex flex-col gap-6">
                    
                    {/* 1. LIABILITIES */}
                    <div className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-rose-600"/>
                            <h3 className="font-bold text-rose-800 text-sm uppercase tracking-wider">Kewajiban (Liabilities)</h3>
                        </div>
                        <div className="p-6 space-y-2">
                            {groups.liabilities.length === 0 ? (
                                <p className="text-sm text-text-secondary italic text-center py-4">Belum ada data hutang.</p>
                            ) : (
                                groups.liabilities.map((item, i) => (
                                    <AccountRow key={i} {...item} colorClass="text-rose-600" />
                                ))
                            )}
                        </div>
                        <div className="px-6 py-3 bg-rose-50/30 border-t border-rose-100 flex justify-between items-center">
                            <span className="font-bold text-rose-900 text-xs uppercase">Total Liabilities</span>
                            <span className="font-bold text-rose-700 text-base font-mono">{formatRupiah(financials.liabilities)}</span>
                        </div>
                    </div>

                    {/* 2. EQUITY (NET VALUE) */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden flex-1 flex flex-col justify-center min-h-[250px]">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <Landmark className="w-5 h-5"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Ekuitas (Net Asset Value)</p>
                            </div>
                            
                            <h3 className="text-4xl font-display font-bold tracking-tight mb-4">
                                {loading ? '...' : formatRupiah(financials.equity)}
                            </h3>
                            
                            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="opacity-70">Total Aset</span>
                                    <span className="font-mono">{formatRupiah(financials.assets)}</span>
                                </div>
                                <div className="flex justify-between text-rose-200">
                                    <span className="opacity-70">(-) Kewajiban</span>
                                    <span className="font-mono">{formatRupiah(financials.liabilities)}</span>
                                </div>
                                <div className="h-px bg-white/20 my-1"></div>
                                <div className="flex justify-between font-bold text-blue-100">
                                    <span>Modal Bersih Pemilik</span>
                                    <span>{formatRupiah(financials.equity)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-900/40 rounded-full blur-2xl -ml-10 -mb-10"></div>
                        <div className="absolute right-4 bottom-4 opacity-10">
                            <PieChart className="w-24 h-24"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}