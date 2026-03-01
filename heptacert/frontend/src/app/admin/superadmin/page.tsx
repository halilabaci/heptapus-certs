"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Coins,
  Users,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Crown,
  UserCog,
  ArrowRight,
  Database,
  Tag,
  Trash2,
  Save,
  CheckCircle2,
  BarChart3,
  CreditCard,
  ToggleLeft,
  Key,
  ExternalLink,
  Building2,
  ScrollText,
  Activity,
  HardDrive,
  Server,
  Clock,
  ClipboardList,
  Phone,
  Mail,
} from "lucide-react";
import { useT } from "@/lib/i18n";

type AdminRow = {
  id: number;
  email: string;
  role: "admin" | "superadmin";
  heptacoin_balance: number;
};

type PricingTier = {
  id: string;
  name_tr: string;
  name_en: string;
  price_monthly: number | null;
  price_annual: number | null;
  hc_quota: number | null;
  features_tr: string[];
  features_en: string[];
  is_free: boolean;
  is_enterprise: boolean;
};

type Tab = "admins" | "subscriptions" | "pricing" | "stats" | "payment" | "orgs" | "auditlogs" | "health" | "waitlist";

type PaymentConfig = {
  payment_enabled: boolean;
  active_payment_provider: string;
  iyzico_api_key: string;
  iyzico_secret_key: string;
  iyzico_base_url: string;
  paytr_merchant_id: string;
  paytr_merchant_key: string;
  paytr_merchant_salt: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_publishable_key: string;
};

export default function SuperAdminPage() {
  const router = useRouter();
  const t = useT();

  const [me, setMe] = useState<{ id: number; email: string; role: string; heptacoin_balance: number } | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("admins");

  // Create Admin State
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<number | null>(null);
  const [changingRole, setChangingRole] = useState<number | null>(null);

  // Credit Coins State
  const [creditUserId, setCreditUserId] = useState<number | "">("");
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [crediting, setCrediting] = useState(false);

  // Pricing State
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  // Stats State
  type StatsConfig = { active_orgs: string; certs_issued: string; uptime_pct: string; availability: string; use_real_counts: boolean };
  const [statsConfig, setStatsConfig] = useState<StatsConfig>({ active_orgs: "", certs_issued: "", uptime_pct: "", availability: "", use_real_counts: true });
  const [statsLoading, setStatsLoading] = useState(false);
  const [savingStats, setSavingStats] = useState(false);

  // Payment State
  const emptyPayment: PaymentConfig = {
    payment_enabled: false, active_payment_provider: "iyzico",
    iyzico_api_key: "", iyzico_secret_key: "", iyzico_base_url: "https://sandbox-api.iyzipay.com",
    paytr_merchant_id: "", paytr_merchant_key: "", paytr_merchant_salt: "",
    stripe_secret_key: "", stripe_webhook_secret: "", stripe_publishable_key: "",
  };
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(emptyPayment);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  async function loadMe() {
    const res = await apiFetch("/me", { method: "GET" });
    const data = await res.json();
    setMe(data);
    return data;
  }

  async function loadAdmins() {
    const res = await apiFetch("/superadmin/admins", { method: "GET" });
    const data = await res.json();
    setAdmins(Array.isArray(data) ? data : (data?.items ?? []));
  }

  async function onDeleteAdmin(adminId: number) {
    if (!confirm("Bu admini silmek istediğinizden emin misiniz?")) return;
    setDeletingAdmin(adminId);
    try {
      await apiFetch(`/superadmin/admins/${adminId}`, { method: "DELETE" });
      await loadAdmins();
      showSuccess("Admin başarıyla silindi.");
    } catch (e: any) {
      setErr(e?.message || "Admin silinemedi.");
    } finally {
      setDeletingAdmin(null);
    }
  }

  async function onChangeAdminRole(adminId: number, newRole: "admin" | "superadmin") {
    setChangingRole(adminId);
    try {
      await apiFetch(`/superadmin/admins/${adminId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      await loadAdmins();
      showSuccess("Admin rolü güncellendi.");
    } catch (e: any) {
      setErr(e?.message || "Rol güncellenemedi.");
    } finally {
      setChangingRole(null);
    }
  }

  async function loadPricing() {
    setPricingLoading(true);
    try {
      const res = await apiFetch("/superadmin/pricing", { method: "GET" });
      const data = await res.json();
      setPricingTiers(data.tiers ?? []);
    } catch (e: any) {
      setErr(e?.message || "Fiyatlandirma verisi yuklenemedi.");
    } finally {
      setPricingLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/superadmin/stats", { method: "GET" });
      const data = await res.json();
      setStatsConfig({
        active_orgs: data.active_orgs ?? "",
        certs_issued: data.certs_issued ?? "",
        uptime_pct: data.uptime_pct ?? "",
        availability: data.availability ?? "",
        use_real_counts: data.use_real_counts !== false,
      });
    } catch (e: any) {
      setErr(e?.message || "Istatistikler yuklenemedi.");
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadPaymentConfig() {
    setPaymentLoading(true);
    try {
      const res = await apiFetch("/superadmin/payment-config", { method: "GET" });
      const data = await res.json();
      setPaymentConfig({ ...emptyPayment, ...data });
    } catch (e: any) {
      setErr(e?.message || "Ödeme ayarları yüklenemedi.");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function onSavePaymentConfig() {
    setSavingPayment(true);
    try {
      await apiFetch("/superadmin/payment-config", {
        method: "PATCH",
        body: JSON.stringify(paymentConfig),
      });
      showSuccess("Ödeme ayarları başarıyla kaydedildi.");
    } catch (e: any) {
      setErr(e?.message || "Ödeme ayarları kaydedilemedi.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function onSaveStats() {
    setSavingStats(true);
    try {
      await apiFetch("/superadmin/stats", {
        method: "PATCH",
        body: JSON.stringify({
          active_orgs: statsConfig.active_orgs || null,
          certs_issued: statsConfig.certs_issued || null,
          uptime_pct: statsConfig.uptime_pct || null,
          availability: statsConfig.availability || null,
          use_real_counts: statsConfig.use_real_counts,
        }),
      });
      showSuccess("Istatistikler basariyla guncellendi.");
    } catch (e: any) {
      setErr(e?.message || "Istatistikler kaydedilemedi.");
    } finally {
      setSavingStats(false);
    }
  }

  async function reload() {
    setErr(null);
    setLoading(true);
    try {
      const m = await loadMe();
      if (m?.role !== "superadmin") {
        router.push("/admin/events");
        return;
      }
      await loadAdmins();
    } catch (e: any) {
      const msg = e?.message || "Sistem verileri yuklenemedi.";
      setErr(msg);
      if (String(msg).toLowerCase().includes("missing") || String(msg).toLowerCase().includes("invalid")) {
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "pricing" && pricingTiers.length === 0 && !pricingLoading) {
      loadPricing();
    }
    if (activeTab === "stats" && !statsLoading && !statsConfig.active_orgs && !statsConfig.certs_issued) {
      loadStats();
    }
    if (activeTab === "payment" && !paymentLoading && !paymentConfig.iyzico_api_key && !paymentConfig.stripe_publishable_key) {
      loadPaymentConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function onCreateAdmin() {
    if (!newEmail.trim()) return setErr("E-Posta adresi zorunludur.");
    if (newPass.length < 10) return setErr("Guvenlik ihlali: Sifre en az 10 karakter olmalidir.");
    setErr(null);
    setCreating(true);
    try {
      await apiFetch("/superadmin/admins", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), password: newPass }),
      });
      setNewEmail("");
      setNewPass("");
      await reload();
      showSuccess("Yeni yetkili basariyla olusturuldu.");
    } catch (e: any) {
      setErr(e?.message || "Yetkili olusturma islemi basarisiz.");
    } finally {
      setCreating(false);
    }
  }

  async function onCredit() {
    if (creditUserId === "") return setErr("Lutfen bakiye yuklenecek hesabi secin.");
    if (!creditAmount || creditAmount <= 0) return setErr("Yuklenecek miktar 0'dan buyuk olmalidir.");
    setErr(null);
    setCrediting(true);
    try {
      await apiFetch("/superadmin/coins/credit", {
        method: "POST",
        body: JSON.stringify({ admin_user_id: Number(creditUserId), amount: Number(creditAmount) }),
      });
      await reload();
      setCreditAmount(100);
      setCreditUserId("");
      showSuccess("Bakiye yuklemesi basariyla tamamlandi.");
    } catch (e: any) {
      setErr(e?.message || "Bakiye yukleme islemi basarisiz.");
    } finally {
      setCrediting(false);
    }
  }

  async function onSavePricing() {
    setErr(null);
    setSavingPricing(true);
    try {
      await apiFetch("/superadmin/pricing", {
        method: "PATCH",
        body: JSON.stringify({ tiers: pricingTiers }),
      });
      showSuccess("Fiyatlandirma basariyla guncellendi.");
    } catch (e: any) {
      setErr(e?.message || "Fiyatlandirma kaydedilemedi.");
    } finally {
      setSavingPricing(false);
    }
  }

  function updateTier<K extends keyof PricingTier>(idx: number, field: K, value: PricingTier[K]) {
    setPricingTiers((tiers) =>
      tiers.map((tier, i) => (i === idx ? { ...tier, [field]: value } : tier))
    );
  }

  function updateFeature(tierIdx: number, lang: "tr" | "en", featIdx: number, value: string) {
    setPricingTiers((tiers) =>
      tiers.map((tier, i) => {
        if (i !== tierIdx) return tier;
        const key = lang === "tr" ? "features_tr" : "features_en";
        const updated = [...tier[key]];
        updated[featIdx] = value;
        return { ...tier, [key]: updated };
      })
    );
  }

  function addFeature(tierIdx: number, lang: "tr" | "en") {
    setPricingTiers((tiers) =>
      tiers.map((tier, i) => {
        if (i !== tierIdx) return tier;
        const key = lang === "tr" ? "features_tr" : "features_en";
        return { ...tier, [key]: [...tier[key], ""] };
      })
    );
  }

  function removeFeature(tierIdx: number, lang: "tr" | "en", featIdx: number) {
    setPricingTiers((tiers) =>
      tiers.map((tier, i) => {
        if (i !== tierIdx) return tier;
        const key = lang === "tr" ? "features_tr" : "features_en";
        return { ...tier, [key]: tier[key].filter((_, j) => j !== featIdx) };
      })
    );
  }

  const adminOnly = useMemo(() => admins.filter((a) => a.role === "admin"), [admins]);

  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  const tierBorders = ["border-brand-200", "border-violet-200", "border-rose-200", "border-amber-200"];
  const tierBadgeBg = ["bg-brand-50 text-brand-700", "bg-violet-50 text-violet-700", "bg-rose-50 text-rose-700", "bg-amber-50 text-amber-700"];

  return (
    <div className="grid gap-6 pb-20 pt-6">

      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/events"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> {t("superadmin_back")}
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reload()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> {t("superadmin_refresh")}
          </button>
          <button
            onClick={() => { clearToken(); router.push("/admin/login"); }}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("superadmin_logout")}
          </button>
        </div>
      </div>

      {/* --- HEADER CARD --- */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 text-white shadow-brand">
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t("superadmin_title")}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{t("superadmin_subtitle")}</p>
            </div>
          </div>

          {me && (
            <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-4 min-w-[200px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("superadmin_active_admin")}</div>
              <div className="font-mono text-sm text-gray-800 truncate">{me.email}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="rounded bg-brand-100 px-2 py-0.5 font-bold text-brand-700">{me.role}</span>
                <span className="font-mono text-amber-600 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded">
                  HC: {me.heptacoin_balance}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-rose-100 bg-rose-50 px-6 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-emerald-100 bg-emerald-50 px-6 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* --- TAB BAR --- */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {(["admins", "subscriptions", "pricing", "stats", "payment", "orgs", "auditlogs", "health", "waitlist"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab === "admins" ? <Users className="h-4 w-4" /> :
             tab === "subscriptions" ? <CreditCard className="h-4 w-4" /> :
             tab === "pricing" ? <Tag className="h-4 w-4" /> :
             tab === "stats" ? <BarChart3 className="h-4 w-4" /> :
             tab === "orgs" ? <Building2 className="h-4 w-4" /> :
             tab === "auditlogs" ? <ScrollText className="h-4 w-4" /> :
             tab === "health" ? <Activity className="h-4 w-4" /> :
             tab === "waitlist" ? <ClipboardList className="h-4 w-4" /> :
             <CreditCard className="h-4 w-4" />}
            {tab === "admins" ? t("superadmin_tab_admins") :
             tab === "subscriptions" ? "Abonelikler" :
             tab === "pricing" ? t("superadmin_tab_pricing") :
             tab === "stats" ? "İstatistikler" :
             tab === "orgs" ? "Kurumlar" :
             tab === "auditlogs" ? "Denetim Kaydı" :
             tab === "health" ? "Sistem Sağlığı" :
             tab === "waitlist" ? "Bekleme Listesi" :
             "Ödeme"}
          </button>
        ))}
      </div>

      {/* --- LOADING STATE --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-500" />
          <span className="text-sm font-bold tracking-widest uppercase">
            {t("superadmin_title")}...
          </span>
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ===== ADMINS TAB ===== */}
          {activeTab === "admins" && (
            <motion.div
              key="admins"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
              className="grid gap-8 lg:grid-cols-12"
            >
              {/* LEFT: Action Panels */}
              <div className="lg:col-span-5 flex flex-col gap-6">

                {/* Create Admin */}
                <motion.div variants={itemVars} className="card p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-3xl bg-brand-500" />
                  <div className="flex items-center gap-3 text-gray-800 font-bold mb-5">
                    <div className="p-2 rounded-xl bg-brand-50">
                      <UserCog className="h-5 w-5 text-brand-600" />
                    </div>
                    {t("superadmin_create_admin")}
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="label">{t("superadmin_email")}</label>
                      <input
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="isim@kurum.com"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">{t("superadmin_password")}</label>
                      <input
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        type="password"
                        placeholder="••••••••••"
                        className="input-field"
                      />
                    </div>
                    <button
                      onClick={onCreateAdmin}
                      disabled={creating}
                      className="btn-primary mt-1 flex items-center justify-center gap-2"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {creating ? t("superadmin_authorizing") : t("superadmin_authorize")}
                    </button>
                  </div>
                </motion.div>

                {/* Credit Coins */}
                <motion.div variants={itemVars} className="card p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-3xl bg-amber-400" />
                  <div className="flex items-center gap-3 text-gray-800 font-bold mb-5">
                    <div className="p-2 rounded-xl bg-amber-50">
                      <Coins className="h-5 w-5 text-amber-500" />
                    </div>
                    {t("superadmin_credit_coins")}
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="label">{t("superadmin_recipient")}</label>
                      <select
                        value={creditUserId}
                        onChange={(e) => setCreditUserId(e.target.value ? Number(e.target.value) : "")}
                        className="input-field appearance-none"
                      >
                        <option value="">{t("superadmin_select_admin")}</option>
                        {adminOnly.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.email} (HC: {a.heptacoin_balance})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">{t("superadmin_amount")}</label>
                      <input
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        type="number"
                        min={1}
                        className="input-field"
                      />
                    </div>
                    <button
                      onClick={onCredit}
                      disabled={crediting}
                      className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {crediting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      {crediting ? t("superadmin_crediting") : t("superadmin_credit")}
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* RIGHT: Admin Table */}
              <motion.div variants={itemVars} className="lg:col-span-7">
                <div className="card overflow-hidden h-full flex flex-col">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700 font-bold">
                      <Database className="h-4 w-4 text-gray-400" />
                      {t("superadmin_admins_table")}
                    </div>
                    <span className="rounded-full bg-gray-200 px-3 py-0.5 text-xs font-bold text-gray-600">
                      {t("superadmin_total")} {admins.length}
                    </span>
                  </div>

                  {admins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Users className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">{t("superadmin_no_admins")}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 overflow-y-auto max-h-[560px]">
                      {admins.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-mono font-bold text-gray-500 border border-gray-200">
                              #{a.id}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-800 truncate max-w-[200px] md:max-w-[260px]">
                                {a.email}
                              </div>
                              <span
                                className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  a.role === "superadmin"
                                    ? "bg-brand-50 text-brand-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {a.role}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
                              <Coins className="h-3.5 w-3.5" /> {a.heptacoin_balance}
                            </div>
                            {a.id !== me?.id && (
                              <>
                                <button
                                  title={a.role === "superadmin" ? "Admin yap" : "Superadmin yap"}
                                  onClick={() => onChangeAdminRole(a.id, a.role === "superadmin" ? "admin" : "superadmin")}
                                  disabled={changingRole === a.id}
                                  className="rounded-lg p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
                                >
                                  {changingRole === a.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <UserCog className="h-4 w-4" />}
                                </button>
                                <button
                                  title="Admini sil"
                                  onClick={() => onDeleteAdmin(a.id)}
                                  disabled={deletingAdmin === a.id}
                                  className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  {deletingAdmin === a.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash2 className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ===== PRICING TAB ===== */}
          {activeTab === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t("superadmin_pricing_title")}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t("superadmin_pricing_subtitle")}</p>
                </div>
                <button
                  onClick={onSavePricing}
                  disabled={savingPricing}
                  className="btn-primary flex items-center gap-2"
                >
                  {savingPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingPricing ? t("superadmin_saving") : t("superadmin_save_pricing")}
                </button>
              </div>

              {pricingLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-4 xl:grid-cols-4">
                  {pricingTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className={`card p-6 border-2 ${tierBorders[idx] ?? "border-gray-200"} flex flex-col gap-4`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-bold ${
                          tierBadgeBg[idx] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Tag className="h-3 w-3" /> {tier.id}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">{t("superadmin_tier_name_tr")}</label>
                          <input
                            value={tier.name_tr}
                            onChange={(e) => updateTier(idx, "name_tr", e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">{t("superadmin_tier_name_en")}</label>
                          <input
                            value={tier.name_en}
                            onChange={(e) => updateTier(idx, "name_en", e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">{t("superadmin_price_monthly")}</label>
                          <input
                            value={tier.price_monthly ?? ""}
                            onChange={(e) =>
                              updateTier(idx, "price_monthly", e.target.value === "" ? null : Number(e.target.value))
                            }
                            type="number"
                            min={0}
                            placeholder={t("superadmin_price_custom")}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">{t("superadmin_price_annual")}</label>
                          <input
                            value={tier.price_annual ?? ""}
                            onChange={(e) =>
                              updateTier(idx, "price_annual", e.target.value === "" ? null : Number(e.target.value))
                            }
                            type="number"
                            min={0}
                            placeholder={t("superadmin_price_custom")}
                            className="input-field"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="label">{t("superadmin_hc_quota")}</label>
                          <input
                            value={tier.hc_quota ?? ""}
                            onChange={(e) =>
                              updateTier(idx, "hc_quota", e.target.value === "" ? null : Number(e.target.value))
                            }
                            type="number"
                            min={0}
                            placeholder={t("superadmin_price_custom")}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <hr className="border-gray-100" />

                      {/* Features TR */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="label mb-0">{t("superadmin_features_tr")}</label>
                          <button
                            onClick={() => addFeature(idx, "tr")}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> {t("superadmin_add_feature")}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {tier.features_tr.map((feat, fi) => (
                            <div key={fi} className="flex gap-2">
                              <input
                                value={feat}
                                onChange={(e) => updateFeature(idx, "tr", fi, e.target.value)}
                                className="input-field flex-1 py-2 text-xs"
                                placeholder="Ozellik girin..."
                              />
                              <button
                                onClick={() => removeFeature(idx, "tr", fi)}
                                className="text-gray-400 hover:text-rose-500 transition-colors p-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Features EN */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="label mb-0">{t("superadmin_features_en")}</label>
                          <button
                            onClick={() => addFeature(idx, "en")}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> {t("superadmin_add_feature")}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {tier.features_en.map((feat, fi) => (
                            <div key={fi} className="flex gap-2">
                              <input
                                value={feat}
                                onChange={(e) => updateFeature(idx, "en", fi, e.target.value)}
                                className="input-field flex-1 py-2 text-xs"
                                placeholder="Enter feature..."
                              />
                              <button
                                onClick={() => removeFeature(idx, "en", fi)}
                                className="text-gray-400 hover:text-rose-500 transition-colors p-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ===== PAYMENT TAB ===== */}
      {!loading && activeTab === "payment" && (
        <motion.div
          key="payment"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Ödeme Sistemi Ayarları</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Vergi levhası alındıktan sonra ödemeyi etkinleştirin. API anahtarlarını güvenli saklayın.
              </p>
            </div>
            <button
              onClick={onSavePaymentConfig}
              disabled={savingPayment}
              className="btn-primary flex items-center gap-2"
            >
              {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingPayment ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>

          {paymentLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Enable + provider */}
              <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentConfig.payment_enabled}
                    onChange={(e) => setPaymentConfig((c) => ({ ...c, payment_enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <ToggleLeft className="h-4 w-4 text-brand-500" /> Ödeme sistemini etkinleştir
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600">Aktif sağlayıcı:</label>
                  <select
                    value={paymentConfig.active_payment_provider}
                    onChange={(e) => setPaymentConfig((c) => ({ ...c, active_payment_provider: e.target.value }))}
                    className="input-field w-40"
                  >
                    <option value="iyzico">iyzico</option>
                    <option value="paytr">PayTR</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
              </div>

              {/* iyzico */}
              <div className={`card p-6 flex flex-col gap-4 border-2 transition-colors ${
                paymentConfig.active_payment_provider === "iyzico" ? "border-indigo-300" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Key className="h-4 w-4 text-indigo-500" /> iyzico
                  {paymentConfig.active_payment_provider === "iyzico" && (
                    <span className="ml-auto text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Aktif</span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">API Key</label>
                    <input value={paymentConfig.iyzico_api_key} onChange={(e) => setPaymentConfig((c) => ({ ...c, iyzico_api_key: e.target.value }))} className="input-field font-mono text-xs" placeholder="sandbox-xxx" />
                  </div>
                  <div>
                    <label className="label">Secret Key</label>
                    <input type="password" value={paymentConfig.iyzico_secret_key} onChange={(e) => setPaymentConfig((c) => ({ ...c, iyzico_secret_key: e.target.value }))} className="input-field font-mono text-xs" placeholder="••••••" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Base URL</label>
                    <div className="flex gap-2">
                      <input value={paymentConfig.iyzico_base_url} onChange={(e) => setPaymentConfig((c) => ({ ...c, iyzico_base_url: e.target.value }))} className="input-field font-mono text-xs flex-1" />
                      <button onClick={() => setPaymentConfig((c) => ({ ...c, iyzico_base_url: "https://sandbox-api.iyzipay.com" }))} className="btn-secondary text-xs">Sandbox</button>
                      <button onClick={() => setPaymentConfig((c) => ({ ...c, iyzico_base_url: "https://api.iyzipay.com" }))} className="btn-secondary text-xs">Prod</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PayTR */}
              <div className={`card p-6 flex flex-col gap-4 border-2 transition-colors ${
                paymentConfig.active_payment_provider === "paytr" ? "border-teal-300" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Key className="h-4 w-4 text-teal-500" /> PayTR
                  {paymentConfig.active_payment_provider === "paytr" && (
                    <span className="ml-auto text-[10px] uppercase font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Aktif</span>
                  )}
                  <a href="https://www.paytr.com" target="_blank" rel="noopener noreferrer" className="ml-auto">
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </a>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Merchant ID</label>
                    <input value={paymentConfig.paytr_merchant_id} onChange={(e) => setPaymentConfig((c) => ({ ...c, paytr_merchant_id: e.target.value }))} className="input-field font-mono text-xs" />
                  </div>
                  <div>
                    <label className="label">Merchant Key</label>
                    <input type="password" value={paymentConfig.paytr_merchant_key} onChange={(e) => setPaymentConfig((c) => ({ ...c, paytr_merchant_key: e.target.value }))} className="input-field font-mono text-xs" placeholder="••••••" />
                  </div>
                  <div>
                    <label className="label">Merchant Salt</label>
                    <input type="password" value={paymentConfig.paytr_merchant_salt} onChange={(e) => setPaymentConfig((c) => ({ ...c, paytr_merchant_salt: e.target.value }))} className="input-field font-mono text-xs" placeholder="••••••" />
                  </div>
                </div>
              </div>

              {/* Stripe */}
              <div className={`card p-6 flex flex-col gap-4 border-2 transition-colors ${
                paymentConfig.active_payment_provider === "stripe" ? "border-violet-300" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Key className="h-4 w-4 text-violet-500" /> Stripe
                  {paymentConfig.active_payment_provider === "stripe" && (
                    <span className="ml-auto text-[10px] uppercase font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Aktif</span>
                  )}
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="ml-auto">
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </a>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Secret Key</label>
                    <input type="password" value={paymentConfig.stripe_secret_key} onChange={(e) => setPaymentConfig((c) => ({ ...c, stripe_secret_key: e.target.value }))} className="input-field font-mono text-xs" placeholder="sk_test_••••" />
                  </div>
                  <div>
                    <label className="label">Webhook Secret</label>
                    <input type="password" value={paymentConfig.stripe_webhook_secret} onChange={(e) => setPaymentConfig((c) => ({ ...c, stripe_webhook_secret: e.target.value }))} className="input-field font-mono text-xs" placeholder="whsec_••••" />
                  </div>
                  <div>
                    <label className="label">Publishable Key</label>
                    <input value={paymentConfig.stripe_publishable_key} onChange={(e) => setPaymentConfig((c) => ({ ...c, stripe_publishable_key: e.target.value }))} className="input-field font-mono text-xs" placeholder="pk_test_••••" />
                  </div>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* ===== STATS TAB ===== */}
      {!loading && activeTab === "stats" && (
        <motion.div
          key="stats"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Site İstatistikleri</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Ana sayfada görünen rakamları buradan yönetin. Boş bırakırsanız gerçek veritabanı sayıları otomatik kullanılır.
              </p>
            </div>
            <button
              onClick={onSaveStats}
              disabled={savingStats}
              className="btn-primary flex items-center gap-2"
            >
              {savingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingStats ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="card p-6 grid gap-5 sm:grid-cols-2">

              <div className="col-span-full">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statsConfig.use_real_counts}
                    onChange={(e) => setStatsConfig((s) => ({ ...s, use_real_counts: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Gerçek veritabanı sayılarını kullan
                  </span>
                </label>
                <p className="mt-1 ml-7 text-xs text-gray-400">
                  İşaretliyken boş alanlar otomatik DB sayısını gösterir. İşareti kaldırınca manuel override değerleri kullanılır.
                </p>
              </div>

              <div>
                <label className="label">Aktif Organizasyon</label>
                <input
                  value={statsConfig.active_orgs}
                  onChange={(e) => setStatsConfig((s) => ({ ...s, active_orgs: e.target.value }))}
                  placeholder="Boş = gerçek DB sayısı"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-400">Örn: 500+ veya boş bırakın</p>
              </div>

              <div>
                <label className="label">Düzenlenen Sertifika</label>
                <input
                  value={statsConfig.certs_issued}
                  onChange={(e) => setStatsConfig((s) => ({ ...s, certs_issued: e.target.value }))}
                  placeholder="Boş = gerçek DB sayısı"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-400">Örn: 50.000+ veya boş bırakın</p>
              </div>

              <div>
                <label className="label">Uptime / Çalışma Süresi</label>
                <input
                  value={statsConfig.uptime_pct}
                  onChange={(e) => setStatsConfig((s) => ({ ...s, uptime_pct: e.target.value }))}
                  placeholder="%100"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Erişilebilirlik</label>
                <input
                  value={statsConfig.availability}
                  onChange={(e) => setStatsConfig((s) => ({ ...s, availability: e.target.value }))}
                  placeholder="7/24"
                  className="input-field"
                />
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* ===== ORGANIZATIONS TAB ===== */}
      {!loading && activeTab === "orgs" && <OrgsTab />}

      {/* ===== AUDIT LOG TAB ===== */}
      {!loading && activeTab === "auditlogs" && <AuditLogTab />}

      {/* ===== SYSTEM HEALTH TAB ===== */}
      {!loading && activeTab === "health" && <SystemHealthTab />}

      {/* ===== WAITLIST TAB ===== */}
      {!loading && activeTab === "waitlist" && <WaitlistTab />}

      {/* ===== SUBSCRIPTIONS TAB ===== */}
      {!loading && activeTab === "subscriptions" && <SubscriptionsTab />}

    </div>
  );
}

// ─── Waitlist Tab ────────────────────────────────────────────────────────────────
type WaitlistRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  plan_interest: string | null;
  note: string | null;
  created_at: string;
};

function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/superadmin/waitlist")
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setTotal(d.total || 0); })
      .catch(() => setErr("Veriler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    if (!entries.length) return;
    const header = "ID,Ad Soyad,E-posta,Telefon,İlgilenilen Plan,Not,Tarih";
    const rows = entries.map(e =>
      [e.id, e.name, e.email, e.phone || "", e.plan_interest || "", (e.note || "").replace(/,/g, " "), e.created_at].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bekleme-listesi.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500" /></div>;
  if (err) return <div className="error-banner mx-auto max-w-md mt-8">{err}</div>;

  return (
    <motion.div
      key="waitlist"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-3xl bg-violet-500" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <ClipboardList className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Bekleme Listesi</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {total > 0 ? `${total} kişi kaydoldu` : "Henüz kayıt yok"}
              </p>
            </div>
          </div>
          {total > 0 && (
            <button onClick={exportCsv} className="btn-secondary gap-2 text-sm">
              CSV İndir
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-semibold">Henüz kimse bekleme listesine katılmadı.</p>
          <p className="text-xs text-gray-400 mt-1">Fiyatlandırma sayfasından gelen başvurular burada görünür.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">E-posta</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Telefon</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{e.id}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{e.name}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-800 transition-colors">
                        <Mail className="h-3.5 w-3.5" /> {e.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.phone ? (
                        <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                          <Phone className="h-3.5 w-3.5" /> {e.phone}
                        </a>
                      ) : <span className="text-gray-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      {e.plan_interest ? (
                        <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 capitalize">
                          {e.plan_interest}
                        </span>
                      ) : <span className="text-gray-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Organizations Tab ────────────────────────────────────────────────────────
type OrgRow = { id: number; user_id: number; org_name: string; custom_domain: string | null; brand_logo: string | null; brand_color: string; created_at: string; };

function OrgsTab() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await apiFetch("/superadmin/organizations"); setOrgs(await r.json()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  function startEdit(org: OrgRow) {
    setEditId(org.id);
    setForm({ user_id: String(org.user_id), org_name: org.org_name, custom_domain: org.custom_domain || "", brand_logo: org.brand_logo || "", brand_color: org.brand_color });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    try {
      const body = { user_id: form.user_id ? parseInt(form.user_id) : undefined, org_name: form.org_name, custom_domain: form.custom_domain || null, brand_logo: form.brand_logo || null, brand_color: form.brand_color };
      if (editId) {
        await apiFetch(`/superadmin/organizations/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/superadmin/organizations", { method: "POST", body: JSON.stringify(body) });
      }
      setShowForm(false); setEditId(null); setForm({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" }); load();
    } catch (e: any) { setErr(e?.message || "Kaydedilemedi."); } finally { setSaving(false); }
  }

  async function deleteOrg(id: number) {
    if (!confirm("Bu kurumu silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/superadmin/organizations/${id}`, { method: "DELETE" }); load();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold text-gray-900">Kurumlar (White-Label)</h2><p className="text-sm text-gray-500">Admin kullanıcılara özel marka ve domain atayın.</p></div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" }); }} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Yeni Kurum</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={save} className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Admin User ID</label><input className="input-field" type="number" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} placeholder="Zorunlu" required /></div>
                <div><label className="label">Kurum Adı</label><input className="input-field" value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} placeholder="Acme University" required /></div>
                <div><label className="label">Özel Domain</label><input className="input-field" value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))} placeholder="certs.acme.edu" /></div>
                <div><label className="label">Marka Logo URL</label><input className="input-field" value={form.brand_logo} onChange={e => setForm(f => ({ ...f, brand_logo: e.target.value }))} placeholder="https://..." /></div>
                <div><label className="label">Marka Rengi</label><div className="flex gap-2"><input className="input-field flex-1" value={form.brand_color} onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))} placeholder="#6366f1" /><input type="color" value={form.brand_color} onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer" /></div></div>
              </div>
              {err && <div className="error-banner">{err}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {editId ? "Güncelle" : "Oluştur"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Henüz kurum yok.</p></div>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => (
            <div key={org.id} className="card p-4 flex items-center gap-4">
              <div style={{ backgroundColor: org.brand_color }} className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{org.org_name}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                  <span>User ID: {org.user_id}</span>
                  {org.custom_domain && <span>Domain: {org.custom_domain}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(org)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Database className="h-4 w-4" /></button>
                <button onClick={() => deleteOrg(org.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── System Health Tab ────────────────────────────────────────────────────────
type SystemHealth = {
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_percent: number;
  db_size_mb: number;
  db_active_connections: number;
  uptime_seconds: number;
  recent_24h_actions: number;
};

function SystemHealthTab() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch("/superadmin/system-health");
      setData(await r.json());
    } catch (e: any) {
      setErr(e?.message || "Sistem sağlığı bilgisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  function fmtUptime(secs: number) {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${d}g ${h}s ${m}dk`;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sistem Sağlığı</h2>
          <p className="text-sm text-gray-500">Otomatik 30 saniyede bir yenilenir.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Yenile
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Disk */}
          <div className="card p-5 col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <HardDrive className="h-4 w-4 text-gray-400" /> Disk Kullanımı
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-extrabold text-gray-800">{data.disk_percent}%</span>
              <span className="text-xs text-gray-400">{data.disk_used_gb.toFixed(1)} / {data.disk_total_gb.toFixed(1)} GB</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.disk_percent, 100)}%` }}
                transition={{ duration: 0.6 }}
                className={`h-3 rounded-full ${data.disk_percent > 85 ? "bg-rose-500" : data.disk_percent > 65 ? "bg-amber-400" : "bg-emerald-500"}`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{data.disk_free_gb.toFixed(1)} GB boş</p>
          </div>

          {/* DB */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <Database className="h-4 w-4 text-gray-400" /> Veritabanı
            </div>
            <p className="text-2xl font-extrabold text-gray-800">{data.db_size_mb.toFixed(1)} <span className="text-sm font-semibold text-gray-400">MB</span></p>
            <p className="text-xs text-gray-400 mt-1">{data.db_active_connections} aktif bağlantı</p>
          </div>

          {/* Uptime */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <Clock className="h-4 w-4 text-gray-400" /> Uptime
            </div>
            <p className="text-2xl font-extrabold text-gray-800">{fmtUptime(data.uptime_seconds)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.recent_24h_actions} işlem / son 24 saat</p>
          </div>

          {/* Status */}
          <div className="card p-5 flex items-center gap-4 col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm font-bold text-emerald-600">Sistem Çevrimiçi</span>
            </div>
            <div className="text-xs text-gray-400">Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────
type AuditLogRow = { id: number; user_id: number | null; action: string; resource_type: string | null; resource_id: string | null; ip_address: string | null; created_at: string; };

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterAction) params.set("action", filterAction);
      const r = await apiFetch(`/superadmin/audit-logs?${params}`);
      setLogs(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, filterAction]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h2 className="text-lg font-semibold text-gray-900">Denetim Kaydı</h2><p className="text-sm text-gray-500">Tüm yönetici işlemlerinin kayıtları.</p></div>
        <div className="flex gap-2">
          <input className="input-field text-sm" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} placeholder="İşleme göre filtrele..." />
          <button onClick={() => load()} className="btn-secondary gap-2"><RefreshCcw className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><ScrollText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Kayıt bulunamadı.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Zaman", "User ID", "İşlem", "Kaynak", "IP"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{log.user_id ?? "—"}</td>
                  <td className="px-4 py-3"><span className="badge badge-brand text-xs font-mono">{log.action}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.resource_type ? `${log.resource_type}${log.resource_id ? `#${log.resource_id}` : ""}` : "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{log.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5">← Önceki</button>
        <span className="text-sm text-gray-500">Sayfa {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="btn-secondary text-sm px-3 py-1.5">Sonraki →</button>
      </div>
    </motion.div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────
type SubscriptionRow = {
  id: number;
  user_id: number;
  user_email: string;
  plan_id: string;
  order_id: number | null;
  started_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const PLAN_OPTIONS = ["starter", "pro", "growth", "enterprise"];

function SubscriptionsTab() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Grant form
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState("pro");
  const [grantDays, setGrantDays] = useState(365);
  const [granting, setGranting] = useState(false);

  // Revoke
  const [revoking, setRevoking] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch("/superadmin/subscriptions");
      setSubs(await r.json());
    } catch (e: any) {
      setErr(e?.message || "Abonelikler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onGrant(e: React.FormEvent) {
    e.preventDefault();
    setGranting(true);
    setErr(null);
    setSuccessMsg(null);
    try {
      await apiFetch("/superadmin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: grantEmail, plan_id: grantPlan, days: grantDays }),
      });
      setSuccessMsg(`${grantEmail} kullanıcısına ${grantPlan} planı verildi (${grantDays} gün).`);
      setGrantEmail("");
      load();
    } catch (e: any) {
      setErr(e?.message || "Abonelik verilemedi.");
    } finally {
      setGranting(false);
    }
  }

  async function onRevoke(id: number) {
    if (!confirm("Bu aboneliği iptal etmek istiyor musunuz?")) return;
    setRevoking(id);
    try {
      await apiFetch(`/superadmin/subscriptions/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      setErr(e?.message || "İptal edilemedi.");
    } finally {
      setRevoking(null);
    }
  }

  const planBadge: Record<string, string> = {
    starter: "bg-gray-100 text-gray-600",
    pro: "bg-violet-100 text-violet-700",
    growth: "bg-rose-100 text-rose-700",
    enterprise: "bg-amber-100 text-amber-700",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Abonelik Yönetimi</h2>
          <p className="text-sm text-gray-500">Kullanıcılara ücretsiz abonelik verin veya mevcut abonelikleri iptal edin.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Yenile
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-xl p-3"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
      {successMsg && <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-100 rounded-xl p-3"><CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}</div>}

      {/* Grant Form */}
      <div className="card p-6 border-2 border-brand-100">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-4">
          <div className="p-2 rounded-xl bg-brand-50"><CreditCard className="h-5 w-5 text-brand-600" /></div>
          Ücretsiz Abonelik Ver
        </div>
        <form onSubmit={onGrant} className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="label">Kullanıcı E-posta</label>
            <input
              className="input-field"
              type="email"
              required
              value={grantEmail}
              onChange={e => setGrantEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input-field" value={grantPlan} onChange={e => setGrantPlan(e.target.value)}>
              {PLAN_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Süre (gün)</label>
            <input
              className="input-field"
              type="number"
              min={1}
              max={3650}
              value={grantDays}
              onChange={e => setGrantDays(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={granting} className="btn-primary gap-2">
              {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              {granting ? "Veriliyor..." : "Abonelik Ver"}
            </button>
          </div>
        </form>
      </div>

      {/* Subscriptions Table */}
      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz abonelik yok.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "Kullanıcı", "Plan", "Başlangıç", "Bitiş", "Durum", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map(sub => (
                <tr key={sub.id} className={`hover:bg-gray-50 transition-colors ${!sub.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{sub.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-xs">{sub.user_email}</div>
                    <div className="text-xs text-gray-400 font-mono">ID: {sub.user_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${planBadge[sub.plan_id] ?? "bg-gray-100 text-gray-600"}`}>
                      {sub.plan_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {sub.started_at ? new Date(sub.started_at).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {sub.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.is_active && (
                      <button
                        onClick={() => onRevoke(sub.id)}
                        disabled={revoking === sub.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Aboneliği İptal Et"
                      >
                        {revoking === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
