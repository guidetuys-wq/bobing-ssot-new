// app/(dashboard)/settings/page.js
"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Skeleton from '@/components/Skeleton';
import PageHeader from '@/components/PageHeader';

// --- MODERN UI IMPORTS ---
import { 
    Store, Receipt, Shield, Settings, Save, RefreshCw, 
    HardDrive, AlertTriangle, Check, Smartphone, MapPin, 
    Printer, Percent, Lock, User, Wallet, ShoppingCart, 
    Briefcase, CreditCard, PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CACHE_KEY = 'lumina_settings_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('store');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // --- EXISTING STATES (JANGAN DIHAPUS) ---
    const [storeProfile, setStoreProfile] = useState({
        name: '', address: '', phone: '', footerMsg: ''
    });

    const [posConfig, setPosConfig] = useState({
        paperSize: '58mm', enableTax: false, taxRate: 11, autoPrint: true
    });

    // --- NEW: FINANCE CONFIGURATION ---
    const [financeConfig, setFinanceConfig] = useState({
        defaultRevenueId: '',    // 4101 - Pendapatan Penjualan (POS)
        defaultReceivableId: '', // 1201 - Piutang Usaha (Import Sales)
        defaultInventoryId: '',  // 1301 - Persediaan Barang (Purchase)
        defaultPayableId: '',    // 2101 - Utang Usaha (Purchase Credit)
        defaultCOGSId: ''        // 5101 - HPP (Costing)
    });
    const [coaList, setCoaList] = useState([]); // List Master Akun

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            
            // 0. Fetch Master COA (Untuk Dropdown Mapping)
            try {
                const accSnap = await getDocs(collection(db, "chart_of_accounts"));
                // Sort by Code agar rapi (1101, 1102...)
                const accounts = accSnap.docs.map(d => ({id: d.id, ...d.data()}));
                setCoaList(accounts.sort((a,b) => (a.code || '').localeCompare(b.code || '')));
            } catch(e) { console.error("Failed loading COA", e); }

            // 1. Cek Cache Settings
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const { storeProfile: cStore, posConfig: cPos, financeConfig: cFin, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_DURATION) {
                            if(cStore) setStoreProfile(cStore);
                            if(cPos) setPosConfig(cPos);
                            if(cFin) setFinanceConfig(prev => ({...prev, ...cFin})); // Merge to keep defaults
                            setLoading(false);
                            return;
                        }
                    } catch(e) {}
                }
            }

            // 2. Fetch Firestore
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if(data.storeProfile) setStoreProfile(data.storeProfile);
                    if(data.posConfig) setPosConfig(data.posConfig);
                    
                    // Load Config, atau Auto-Detect jika belum ada (Smart Default)
                    if(data.financeConfig) {
                        setFinanceConfig(data.financeConfig);
                    } else if (coaList.length > 0) {
                        // Auto-detect logic berdasarkan kode COA Anda
                        const rev = coaList.find(a => a.code === '4101')?.id || '';
                        const inv = coaList.find(a => a.code === '1301')?.id || '';
                        const rec = coaList.find(a => a.code === '1201')?.id || '';
                        const pay = coaList.find(a => a.code === '2101')?.id || '';
                        const cogs = coaList.find(a => a.code === '5101')?.id || '';
                        setFinanceConfig({ 
                            defaultRevenueId: rev, 
                            defaultInventoryId: inv, 
                            defaultReceivableId: rec,
                            defaultPayableId: pay,
                            defaultCOGSId: cogs
                        });
                    }
                    
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            storeProfile: data.storeProfile,
                            posConfig: data.posConfig,
                            financeConfig: data.financeConfig,
                            timestamp: Date.now()
                        }));
                    }
                }
            } catch (e) { console.error(e); toast.error("Gagal memuat pengaturan"); } 
            finally { setLoading(false); }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading("Menyimpan pengaturan...");
        try {
            await setDoc(doc(db, "settings", "general"), { 
                storeProfile, 
                posConfig, 
                financeConfig, // Simpan konfigurasi finance
                updated_at: serverTimestamp(), 
                updated_by: user?.email
            }, { merge: true });

            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ 
                    storeProfile, posConfig, financeConfig, timestamp: Date.now() 
                }));
            }
            toast.success("Berhasil disimpan!", { id: toastId });
        } catch (e) { toast.error(`Gagal: ${e.message}`, { id: toastId }); } 
        finally { setSaving(false); }
    };

    const handleRecalculateInventory = async () => {
        if(!confirm("Hitung ulang total aset? Ini akan membaca semua data stok (Heavy Operation).")) return;
        const tId = toast.loading("Menghitung ulang...");
        try {
            const varSnap = await getDocs(collection(db, "product_variants"));
            const costMap = {}; varSnap.forEach(d => { costMap[d.id] = d.data().cost || 0; });

            const stockSnap = await getDocs(collection(db, "stock_snapshots"));
            let totalQty = 0; let totalValue = 0;
            stockSnap.forEach(d => {
                const s = d.data(); const qty = s.qty || 0;
                totalQty += qty; totalValue += (qty * (costMap[s.variant_id] || 0));
            });

            await setDoc(doc(db, "stats_inventory", "general"), {
                total_qty: totalQty, total_value: totalValue, last_calculated: serverTimestamp(), updated_by: user?.email
            });
            localStorage.removeItem('lumina_dash_master_v3');
            toast.success(`Selesai! Qty: ${totalQty}, Value: ${totalValue}`, { id: tId });
        } catch (e) { toast.error(e.message, { id: tId }); }
    };

    // --- SUB-COMPONENTS ---
    const MenuButton = ({ id, label, icon: Icon, desc }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left border ${
                activeTab === id 
                ? 'bg-white border-primary/20 shadow-md ring-1 ring-primary/5' 
                : 'bg-transparent border-transparent hover:bg-white/60 hover:shadow-sm'
            }`}
        >
            <div className={`p-2.5 rounded-lg shrink-0 ${activeTab === id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-text-secondary'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <span className={`block text-sm font-bold ${activeTab === id ? 'text-primary' : 'text-text-primary'}`}>{label}</span>
                <span className="text-[10px] text-text-secondary line-clamp-1 opacity-80">{desc}</span>
            </div>
            {activeTab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
        </button>
    );

    const SectionTitle = ({ title, desc }) => (
        <div className="mb-6">
            <h3 className="text-xl font-display font-bold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{desc}</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 fade-in pb-24 text-text-primary bg-background min-h-screen">
            
            <PageHeader 
                title="System Settings" 
                subtitle="Manage store identity, POS configuration, and system maintenance."
                actions={
                    <button 
                        onClick={handleSave} 
                        disabled={saving || loading}
                        className="btn-gold flex items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed px-6 py-2.5"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* --- LEFT SIDEBAR MENU --- */}
                <div className="lg:col-span-3 space-y-2">
                    <MenuButton id="store" label="Store Identity" icon={Store} desc="Name, Address, Footer" />
                    <MenuButton id="pos" label="POS Config" icon={Receipt} desc="Printer & Tax Settings" />
                    <MenuButton id="finance" label="Finance Mapping" icon={Wallet} desc="COA Automation" />
                    <MenuButton id="account" label="Account Security" icon={Shield} desc="Password & Access" />
                    <MenuButton id="system" label="System Data" icon={Settings} desc="Backup & Maintenance" />
                </div>

                {/* --- RIGHT CONTENT AREA --- */}
                <div className="lg:col-span-9">
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white border border-border rounded-2xl shadow-sm p-8 min-h-[500px]"
                    >
                        
                        {/* TAB 1: STORE PROFILE */}
                        {activeTab === 'store' && (
                            <>
                                <SectionTitle title="Store Identity" desc="Informasi ini akan muncul pada struk belanja pelanggan." />
                                <div className="space-y-6 max-w-2xl">
                                    <div>
                                        <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-2"><Store className="w-3.5 h-3.5"/> Store Name</label>
                                        {loading ? <Skeleton className="h-10 w-full"/> : 
                                            <input className="input-luxury" value={storeProfile.name} onChange={e=>setStoreProfile({...storeProfile, name:e.target.value})} placeholder="Nama Toko Anda" />
                                        }
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/> Address</label>
                                        {loading ? <Skeleton className="h-24 w-full"/> : 
                                            <textarea rows="3" className="input-luxury resize-none" value={storeProfile.address} onChange={e=>setStoreProfile({...storeProfile, address:e.target.value})} placeholder="Alamat lengkap..." />
                                        }
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5"/> Phone / WA</label>
                                            {loading ? <Skeleton className="h-10 w-full"/> : 
                                                <input className="input-luxury" value={storeProfile.phone} onChange={e=>setStoreProfile({...storeProfile, phone:e.target.value})} placeholder="08..." />
                                            }
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-2"><Receipt className="w-3.5 h-3.5"/> Receipt Footer</label>
                                            {loading ? <Skeleton className="h-10 w-full"/> : 
                                                <input className="input-luxury" value={storeProfile.footerMsg} onChange={e=>setStoreProfile({...storeProfile, footerMsg:e.target.value})} placeholder="e.g. Terimakasih!" />
                                            }
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 2: POS CONFIG */}
                        {activeTab === 'pos' && (
                            <>
                                <SectionTitle title="POS Configuration" desc="Atur preferensi kasir dan printer struk." />
                                <div className="space-y-4 max-w-2xl">
                                    <div className="p-4 rounded-xl border border-border bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-border"><Printer className="w-5 h-5 text-text-secondary"/></div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary">Receipt Paper Size</p>
                                                <p className="text-xs text-text-secondary">Ukuran kertas printer thermal.</p>
                                            </div>
                                        </div>
                                        <select className="input-luxury w-32 py-1.5 text-xs bg-white" value={posConfig.paperSize} onChange={e=>setPosConfig({...posConfig, paperSize:e.target.value})}>
                                            <option value="58mm">58mm (Small)</option>
                                            <option value="80mm">80mm (Large)</option>
                                        </select>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-border"><Percent className="w-5 h-5 text-text-secondary"/></div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary">Enable Tax (PPN)</p>
                                                <p className="text-xs text-text-secondary">Hitung pajak otomatis saat checkout.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {posConfig.enableTax && (
                                                <div className="flex items-center bg-white rounded-lg border border-border overflow-hidden w-20">
                                                    <input type="number" className="w-full py-1.5 px-2 text-center text-xs font-bold outline-none" value={posConfig.taxRate} onChange={e=>setPosConfig({...posConfig, taxRate:e.target.value})} />
                                                    <span className="text-xs text-text-secondary pr-2 bg-gray-50 h-full flex items-center border-l border-border">%</span>
                                                </div>
                                            )}
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={posConfig.enableTax} onChange={e=>setPosConfig({...posConfig, enableTax:e.target.checked})} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-border"><Receipt className="w-5 h-5 text-text-secondary"/></div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary">Auto-Print Receipt</p>
                                                <p className="text-xs text-text-secondary">Buka dialog print otomatis setelah bayar.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={posConfig.autoPrint} onChange={e=>setPosConfig({...posConfig, autoPrint:e.target.checked})} />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 3: FINANCE CONFIG (EXPANDED & SAFE) */}
                        {activeTab === 'finance' && (
                            <>
                                <SectionTitle title="Finance Automation" desc="Mapping akun COA agar transaksi sistem (POS/Import) tercatat otomatis." />
                                <div className="space-y-6 max-w-3xl">
                                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-3">
                                        <div className="p-1 bg-white rounded-full shrink-0"><AlertTriangle className="w-4 h-4 text-blue-500"/></div>
                                        <div>
                                            <b>Instruksi:</b> Pilih akun dari Chart of Accounts untuk setiap kategori di bawah. Jika akun belum ada, buat dulu di menu <b>Finance : Accounts</b>.
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* GROUP 1: PENJUALAN (SALES) */}
                                        <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-4">
                                            <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-2 pb-2 border-b border-emerald-100">
                                                <Receipt className="w-4 h-4"/> Penjualan & Piutang
                                            </h4>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 block">Akun Pendapatan (Revenue)</label>
                                                <select 
                                                    className="input-luxury text-xs"
                                                    value={financeConfig.defaultRevenueId}
                                                    onChange={e => setFinanceConfig({ ...financeConfig, defaultRevenueId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih (4101) --</option>
                                                    {coaList.filter(a => a.code.startsWith('4')).map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-text-secondary mt-1">POS Sales akan masuk sebagai Kredit ke akun ini.</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 block">Akun Piutang (Receivable)</label>
                                                <select 
                                                    className="input-luxury text-xs"
                                                    value={financeConfig.defaultReceivableId}
                                                    onChange={e => setFinanceConfig({ ...financeConfig, defaultReceivableId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih (1201) --</option>
                                                    {coaList.filter(a => a.code.startsWith('1') && a.name.toLowerCase().includes('piutang')).map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-text-secondary mt-1">Import Sales (Marketplace) akan masuk ke sini.</p>
                                            </div>
                                        </div>

                                        {/* GROUP 2: PEMBELIAN (PURCHASE) */}
                                        <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-4">
                                            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2 pb-2 border-b border-blue-100">
                                                <ShoppingCart className="w-4 h-4"/> Pembelian & Stok
                                            </h4>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 block">Akun Persediaan (Inventory)</label>
                                                <select 
                                                    className="input-luxury text-xs"
                                                    value={financeConfig.defaultInventoryId}
                                                    onChange={e => setFinanceConfig({ ...financeConfig, defaultInventoryId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih (1301) --</option>
                                                    {coaList.filter(a => a.code.startsWith('1') || a.name.toLowerCase().includes('sediaan')).map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-text-secondary mt-1">Pembelian PO (Tunai) akan mendebit akun ini.</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 block">Akun Utang Usaha (Payable)</label>
                                                <select 
                                                    className="input-luxury text-xs"
                                                    value={financeConfig.defaultPayableId}
                                                    onChange={e => setFinanceConfig({ ...financeConfig, defaultPayableId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih (2101) --</option>
                                                    {coaList.filter(a => a.code.startsWith('2')).map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-text-secondary mt-1">Pembelian PO (Kredit) akan dicatat ke sini.</p>
                                            </div>
                                        </div>

                                        {/* GROUP 3: COSTING (HPP) */}
                                        <div className="p-5 rounded-xl border border-amber-100 bg-amber-50/50 space-y-4 md:col-span-2">
                                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2 pb-2 border-b border-amber-100">
                                                <PieChart className="w-4 h-4"/> Costing & Beban
                                            </h4>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 block">Akun HPP (Cost of Goods Sold)</label>
                                                <select 
                                                    className="input-luxury text-xs"
                                                    value={financeConfig.defaultCOGSId}
                                                    onChange={e => setFinanceConfig({ ...financeConfig, defaultCOGSId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih (5101) --</option>
                                                    {coaList.filter(a => a.code.startsWith('5')).map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-text-secondary mt-1">Digunakan untuk jurnal otomatis HPP saat barang keluar (Future Update).</p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 4: ACCOUNT SECURITY */}
                        {activeTab === 'account' && (
                            <>
                                <SectionTitle title="Account Security" desc="Kelola akses keamanan akun admin." />
                                
                                <div className="flex items-center gap-5 p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/10 mb-8">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-primary font-bold text-2xl shadow-lg shadow-primary/10">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-text-primary">{user?.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                <Check className="w-3 h-3"/> Active
                                            </span>
                                            <span className="text-xs text-text-secondary">Super Admin</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="max-w-md space-y-4">
                                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
                                        <Lock className="w-4 h-4"/> Change Password
                                    </h4>
                                    <div>
                                        <input type="password" className="input-luxury" placeholder="New Password" />
                                    </div>
                                    <div>
                                        <input type="password" className="input-luxury" placeholder="Confirm New Password" />
                                    </div>
                                    <button className="btn-ghost-dark w-full border-border hover:bg-gray-50 text-text-secondary hover:text-text-primary">
                                        Update Credentials
                                    </button>
                                </div>
                            </>
                        )}

                        {/* TAB 5: SYSTEM MAINTENANCE */}
                        {activeTab === 'system' && (
                            <>
                                <SectionTitle title="System Maintenance" desc="Tools untuk integritas data dan backup." />
                                
                                <div className="space-y-4 max-w-2xl">
                                    {/* Recalculate */}
                                    <div className="p-5 rounded-xl bg-blue-50 border border-blue-100 flex justify-between items-center hover:shadow-sm transition-shadow">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><RefreshCw className="w-5 h-5"/></div>
                                            <div>
                                                <h4 className="text-blue-900 font-bold text-sm mb-1">Recalculate Inventory Assets</h4>
                                                <p className="text-xs text-blue-700/70 max-w-xs">
                                                    Hitung ulang total nilai aset dari snapshot stok. Gunakan jika dashboard tidak sinkron.
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={handleRecalculateInventory} className="px-4 py-2 rounded-lg bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 text-xs font-bold transition-all shadow-sm">
                                            Run Tool
                                        </button>
                                    </div>

                                    {/* Backup */}
                                    <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-center hover:shadow-sm transition-shadow">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><HardDrive className="w-5 h-5"/></div>
                                            <div>
                                                <h4 className="text-emerald-900 font-bold text-sm mb-1">Data Backup</h4>
                                                <p className="text-xs text-emerald-700/70 max-w-xs">
                                                    Download semua data transaksi dan produk dalam format JSON.
                                                </p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 rounded-lg bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm">
                                            Download
                                        </button>
                                    </div>

                                    {/* Reset */}
                                    <div className="p-5 rounded-xl bg-rose-50 border border-rose-100 flex justify-between items-center hover:shadow-sm transition-shadow mt-8">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-white rounded-lg text-rose-600 shadow-sm"><AlertTriangle className="w-5 h-5"/></div>
                                            <div>
                                                <h4 className="text-rose-900 font-bold text-sm mb-1">Factory Reset</h4>
                                                <p className="text-xs text-rose-700/70 max-w-xs">
                                                    <span className="font-bold">DANGER ZONE:</span> Menghapus permanen semua data transaksi & stok.
                                                </p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 text-xs font-bold transition-all">
                                            Reset All Data
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                    </motion.div>
                </div>
            </div>
        </div>
    );
}