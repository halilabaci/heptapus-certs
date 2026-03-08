"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CreditCard, Coins, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { motion } from "framer-motion";

type Order = {
  id: number;
  plan_id: string | null;
  amount_cents: number;
  currency: string;
  provider: string;
  status: "pending" | "paid" | "failed" | "refunded";
  created_at: string;
  paid_at: string | null;
};

type CoinTx = {
  id: number;
  amount: number;
  type: "credit" | "spend";
  timestamp: string;
  description: string | null;
};

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Bekliyor",    cls: "bg-amber-100 text-amber-800" },
  paid:     { label: "Ödendi",      cls: "bg-emerald-100 text-emerald-800" },
  failed:   { label: "Başarısız",   cls: "bg-rose-100 text-rose-800" },
  refunded: { label: "İade Edildi", cls: "bg-surface-100 text-surface-700" },
};

const COIN_LABEL: Record<string, string> = { credit: "Yükleme", spend: "Harcama" };

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [coins, setCoins] = useState<CoinTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [ordersRes, coinsRes] = await Promise.all([
        apiFetch("/billing/orders").catch(() => null),
        apiFetch("/admin/transactions").catch(() => null),
      ]);
      if (ordersRes?.ok) setOrders(await ordersRes.json());
      if (coinsRes?.ok)  setCoins(await coinsRes.json());
    } catch (e: any) {
      const msg = e?.message || "Veriler yüklenemedi";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ödeme İşlemleri"
        subtitle="Ödeme siparişleri ve HeptaCoin işlem geçmişi"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ödeme İşlemleri" }]}
      />

      {error && (
        <div className="error-banner">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Payment Orders */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-900">Ödeme Siparişleri</h2>
          <span className="ml-auto text-xs text-surface-400">{orders.length} kayıt</span>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-surface-400 text-sm">Henüz ödeme siparişi yok</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {orders.map(o => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">{o.plan_id ?? `Sipariş #${o.id}`}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString("tr-TR")} · {o.provider}
                  </p>
                </div>
                <span className="text-sm font-semibold text-surface-900">
                  {(o.amount_cents / 100).toFixed(2)} {o.currency.toUpperCase()}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS[o.status]?.cls ?? "bg-surface-100 text-surface-700"}`}>
                  {ORDER_STATUS[o.status]?.label ?? o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* HeptaCoin History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <Coins className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-900">HeptaCoin Geçmişi</h2>
          <span className="ml-auto text-xs text-surface-400">{coins.length} işlem</span>
        </div>
        {coins.length === 0 ? (
          <div className="p-12 text-center text-surface-400 text-sm">Henüz coin işlemi yok</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {coins.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">{tx.description || COIN_LABEL[tx.type]}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{new Date(tx.timestamp).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                  {tx.type === "credit" ? "+" : "-"}{tx.amount} HC
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
