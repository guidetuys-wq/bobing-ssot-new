// app/(dashboard)/purchases/[id]/page.js
"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, runTransaction, serverTimestamp, increment, query, orderBy, writeBatch } from 'firebase/firestore';
import { formatRupiah } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
// Import Helper Baru
import { recordTransaction } from '@/lib/transactionService';

export default function PurchaseDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    
    const [po, setPo] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State untuk Modal Payment
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    
    // State untuk Wallet (Sumber Dana)
    const [wallets, setWallets] = useState([]);
    const [selectedWalletId, setSelectedWalletId] = useState('');

    useEffect(() => {
        if(id) fetchDetail();
        fetchWallets();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const docSnap = await getDoc(doc(db, "purchase_orders", id));
            if(!docSnap.exists()) return toast.error("PO tidak ditemukan");
            setPo({ id: docSnap.id, ...docSnap.data() });

            const itemsSnap = await getDocs(collection(db, `purchase_orders/${id}/items`));
            const itemsData = [];
            itemsSnap.forEach(d => itemsData.push({ id: d.id, ...d.data() }));
            setItems(itemsData);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchWallets = async () => {
        // Load Akun Kas/Bank untuk dropdown pembayaran
        const q = query(collection(db, "chart_of_accounts"), orderBy("code"));
        const snap = await getDocs(q);
        const wList = snap.docs.map(d => ({id:d.id, ...d.data()}))
            .filter(a => {
                const cat = (a.category||'').toUpperCase();
                return a.code.startsWith('1') && (cat.includes('ASET') || cat.includes('KAS') || cat.includes('BANK'));
            });
        setWallets(wList);
        if(wList.length > 0) setSelectedWalletId(wList[0].id);
    };

    // --- LOGIC 1: RECEIVE GOODS (Update Stok) ---
    const handleReceiveGoods = async () => {
        if(!confirm("Pastikan fisik barang sudah diterima di gudang.")) return;
        const tId = toast.loading("Processing Stock In...");
        try {
            await runTransaction(db, async (t) => {
                const poRef = doc(db, "purchase_orders", id);
                const poDoc = await t.get(poRef);
                if(poDoc.data().fulfillment_status === 'RECEIVED') throw new Error("Sudah diterima!");

                for(const item of items) {
                    const moveRef = doc(collection(db, "stock_movements"));
                    t.set(moveRef, {
                        variant_id: item.variant_id, warehouse_id: po.warehouse_id,
                        type: 'purchase_in', qty: item.qty_ordered, ref_id: id, ref_type: 'purchase_order',
                        date: serverTimestamp(), notes: `Received PO ${po.po_number || 'Old'}`
                    });
                    const snapId = `${item.variant_id}_${po.warehouse_id}`;
                    const snapRef = doc(db, "stock_snapshots", snapId);
                    t.set(snapRef, { 
                        id: snapId, variant_id: item.variant_id, warehouse_id: po.warehouse_id,
                        qty: increment(item.qty_ordered) 
                    }, { merge: true });
                }
                t.update(poRef, { fulfillment_status: 'RECEIVED', received_date: serverTimestamp() });
            });
            toast.success("Stok Masuk!", { id: tId });
            fetchDetail();
            if(typeof window !== 'undefined') localStorage.removeItem('lumina_inventory_v2');
        } catch(e) { toast.error(e.message, { id: tId }); }
    };

    // --- LOGIC 2: PAYMENT (Update Finance via Helper) ---
    const handlePayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(payAmount);
        if(!amount || amount <= 0) return toast.error("Nominal tidak valid");
        if(!selectedWalletId) return toast.error("Pilih akun pembayaran");

        const tId = toast.loading("Mencatat Pembayaran...");
        try {
            // 1. Ambil Settings untuk Mapping Akun Inventory/Hutang
            let inventoryAccId = '';
            const settingSnap = await getDoc(doc(db, "settings", "general"));
            if(settingSnap.exists()) {
                inventoryAccId = settingSnap.data().financeConfig?.defaultInventoryId;
            }

            // Fallback: Cari manual kode 1301 jika belum disetting
            if (!inventoryAccId) {
                const accQ = query(collection(db, "chart_of_accounts"), orderBy("code"));
                const accS = await getDocs(accQ);
                const found = accS.docs.find(d => d.data().code === '1301');
                if (found) inventoryAccId = found.id;
            }

            const batch = writeBatch(db); // Gunakan Batch agar atomic

            const poRef = doc(db, "purchase_orders", id);
            const newPaid = (po.amount_paid || 0) + amount;
            let newStatus = 'PARTIAL_PAID';
            if(newPaid >= po.total_amount) newStatus = 'PAID';

            // 1. Update PO Header
            batch.update(poRef, { amount_paid: newPaid, payment_status: newStatus, updated_at: serverTimestamp() });

            // 2. Catat Log Pembayaran PO (Untuk History PO saja)
            const payLogRef = doc(collection(db, "purchase_payments"));
            batch.set(payLogRef, { 
                po_id: id, amount: amount, date: serverTimestamp(), recorder: user?.email, wallet_id: selectedWalletId 
            });

            // 3. INTEGRASI FINANCE (Record Out Transaction)
            // Uang Keluar (Kredit Wallet) -> Aset Persediaan Bertambah (Debit Inventory)
            recordTransaction(db, batch, {
                type: 'out',
                amount: amount,
                walletId: selectedWalletId, // Akun yang berkurang (Kredit)
                categoryId: inventoryAccId || 'unassigned_purchase', // Akun Lawan
                categoryName: 'Pembelian Stok',
                description: `Bayar PO #${po.po_number || po.id.substring(0,8)}`,
                refType: 'purchase_order',
                refId: id,
                userEmail: user?.email
            });

            await batch.commit();

            toast.success("Pembayaran Tercatat!", { id: tId });
            setPayModalOpen(false); setPayAmount(''); fetchDetail();
            
            // Invalidate Caches
            if(typeof window !== 'undefined') {
                localStorage.removeItem('lumina_cash_transactions_v2'); 
                localStorage.removeItem('lumina_cash_data_v2'); 
            }

        } catch(e) { console.error(e); toast.error(`Gagal: ${e.message}`, { id: tId }); }
    };

    if (loading || !po) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    const outstanding = po.total_amount - (po.amount_paid || 0);

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6 fade-in">
            <div className="flex items-center gap-4 mb-4">
                <Link href="/purchases/overview" className="btn-ghost-dark">&larr; Back</Link>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">PO #{po.po_number || po.id.substring(0,8)}</h1>
                    <p className="text-text-secondary text-sm">Date: {new Date(po.order_date?.toDate()).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-luxury p-6 border-l-4 border-l-blue-500">
                    <h3 className="text-sm font-bold text-text-secondary uppercase mb-2">Fulfillment</h3>
                    <div className="flex justify-between items-center">
                        <span className={`text-2xl font-bold ${po.fulfillment_status === 'RECEIVED' ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {po.fulfillment_status || 'OPEN'}
                        </span>
                        {po.fulfillment_status !== 'RECEIVED' && (
                            <button onClick={handleReceiveGoods} className="btn-gold text-xs">Mark Received</button>
                        )}
                    </div>
                </div>

                <div className="card-luxury p-6 border-l-4 border-l-amber-500">
                    <h3 className="text-sm font-bold text-text-secondary uppercase mb-2">Payment</h3>
                    <div className="flex justify-between items-center">
                        <div>
                             <span className={`text-2xl font-bold ${po.payment_status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {po.payment_status || 'UNPAID'}
                            </span>
                            <div className="text-xs text-text-secondary mt-1">Paid: {formatRupiah(po.amount_paid || 0)} / {formatRupiah(po.total_amount)}</div>
                        </div>
                        {po.payment_status !== 'PAID' && (
                            <button onClick={()=>setPayModalOpen(true)} className="btn-ghost-dark text-xs border-lumina-border">+ Payment</button>
                        )}
                    </div>
                </div>
            </div>

            <div className="card-luxury overflow-hidden">
                <div className="p-4 border-b border-lumina-border bg-surface/50"><h3 className="font-bold text-text-primary">Items</h3></div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-background text-text-secondary uppercase text-xs">
                        <tr><th className="p-4">Product</th><th className="p-4 text-right">Qty</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-lumina-border">
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="p-4"><div>{item.name}</div><div className="text-xs text-text-secondary">{item.sku}</div></td>
                                <td className="p-4 text-right">{item.qty_ordered}</td>
                                <td className="p-4 text-right">{formatRupiah(item.unit_cost)}</td>
                                <td className="p-4 text-right font-bold">{formatRupiah(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL PAYMENT WITH WALLET SELECTION */}
            {payModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="card-luxury w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-text-primary mb-4">Record Payment</h3>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary block mb-1">Bayar Dari Akun</label>
                                <select className="input-luxury" value={selectedWalletId} onChange={e=>setSelectedWalletId(e.target.value)}>
                                    {wallets.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary block mb-1">Jumlah (Max: {formatRupiah(outstanding)})</label>
                                <input type="number" autoFocus className="input-luxury text-lg" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="0" max={outstanding}/>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={()=>setPayModalOpen(false)} className="btn-ghost-dark">Cancel</button>
                                <button type="submit" className="btn-gold">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}