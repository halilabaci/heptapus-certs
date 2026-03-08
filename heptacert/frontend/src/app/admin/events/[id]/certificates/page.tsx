"use client";

import { apiFetch, API_BASE, getToken } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  ShieldOff,
  Clock,
  CheckCircle2,
  Plus,
  ExternalLink,
  Download,
  FileText,
  Filter,
  RefreshCcw,
  Zap,
  Hash,
  LockKeyhole,
  FileDown,
  CheckSquare,
  Square,
  X,
  QrCode,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";

type CertStatus = "active" | "revoked" | "expired";

type CertificateOut = {
  id: number;
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_id: number;
  status: CertStatus;
  hosting_term?: string | null;
  hosting_ends_at?: string | null;
  pdf_url?: string | null;
};

type CertificateListOut = {
  items: CertificateOut[];
  total: number;
  page: number;
  limit: number;
};

function getStatusStyle(s: CertStatus) {
  if (s === "active") return {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
  if (s === "expired") return {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  };
  return {
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: <ShieldOff className="h-3.5 w-3.5" />,
  };
}

export default function CertificatesPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id);
  const t = useT();

  const [items, setItems] = useState<CertificateOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | CertStatus>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [issueName, setIssueName] = useState("");
  const [issueTerm, setIssueTerm] = useState<"monthly" | "yearly">("yearly");
  const [issuing, setIssuing] = useState(false);
  const [eventName, setEventName] = useState<string>("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"revoke" | "expire" | "delete" | null>(null);

  // Single delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));
  const toast = useToast();

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search.trim()) qs.set("search", search.trim());
    if (status) qs.set("status", status);
    return qs.toString();
  }, [page, limit, search, status]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [certRes, eventRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/certificates?${query}`, { method: "GET" }),
        !eventName ? apiFetch(`/admin/events/${eventId}`, { method: "GET" }) : Promise.resolve(null),
      ]);
      const data = (await certRes.json()) as CertificateListOut;
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
      if (eventRes) {
        const ev = await eventRes.json();
        if (ev?.name) setEventName(ev.name);
      }
    } catch (e: any) {
      setErr(e?.message || "Sertifika listesi cekilemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function patchStatus(certId: number, next: CertStatus) {
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${certId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast.success("Durum güncellendi.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Durum güncellenemedi.");
      setErr(e?.message || "Durum guncellenemedi.");
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${deleteTargetId}`, { method: "DELETE" });
      toast.success("Sertifika silindi.");
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Silme işlemi başarısız.");
      setErr(e?.message || "Silme islemi basarisiz.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function issueOne() {
    if (!issueName.trim()) return setErr("Lütfen geçerli bir isim girin.");
    setErr(null);
    setIssuing(true);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ student_name: issueName.trim(), hosting_term: issueTerm }),
      });
      toast.success(`"${issueName.trim()}" için sertifika oluşturuldu.`);
      setIssueName("");
      setPage(1);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Sertifika basım işlemi başarısız.");
      setErr(e?.message || "Sertifika basim islemi basarisiz.");
    } finally {
      setIssuing(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((c) => c.id)));
    }
  }

  async function executeBulkAction() {
    if (!bulkTarget || selectedIds.size === 0) return;
    setBulkLoading(true);
    setErr(null);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates/bulk-action`, {
        method: "POST",
        body: JSON.stringify({ cert_ids: [...selectedIds], action: bulkTarget }),
      });
      toast.success(`${selectedIds.size} sertifika başarıyla işlendi.`);
      setBulkTarget(null);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Toplu işlem başarısız.");
      setErr(e?.message || "Toplu işlem başarısız.");
    } finally {
      setBulkLoading(false);
    }
  }

  function exportCerts(format: "csv" | "xlsx") {
    const token = getToken();
    const url = `${API_BASE}/admin/events/${eventId}/certificates/export?format=${format}`;
    // Use a temporary link with authorization header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `certificates-event-${eventId}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setErr("Export başarısız."));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const containerVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const rowVars = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col gap-6 pb-20 pt-6">

      <EventAdminNav eventId={eventId} active="certificates" eventName={eventName || `Etkinlik #${eventId}`} className="flex flex-col gap-3" />
      <div className="flex items-center gap-2 flex-wrap">
          <div className="w-px h-5 bg-gray-200" />
          <button onClick={() => exportCerts("csv")} className="btn-secondary gap-1.5 text-xs">
            <FileDown className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => exportCerts("xlsx")} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors">
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
          <div className="flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-mono text-surface-400 shadow-sm">
            <Hash className="h-3 w-3" /> Event: {eventId}
          </div>
        </div>

      {/* Bulk action floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-6 py-3 shadow-2xl text-white"
          >
            <span className="text-sm font-bold">{selectedIds.size} seçildi</span>
            <div className="w-px h-5 bg-gray-700" />
            <button onClick={() => setBulkTarget("revoke")} disabled={bulkLoading} className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50">
              <ShieldOff className="h-3.5 w-3.5" /> Revoke
            </button>
            <button onClick={() => setBulkTarget("expire")} disabled={bulkLoading} className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50">
              <Clock className="h-3.5 w-3.5" /> Expire
            </button>
            <button onClick={() => setBulkTarget("delete")} disabled={bulkLoading} className="flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
            {bulkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-12">

        {/* LEFT */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Issue card */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-3xl bg-amber-400" />
            <div className="flex items-center gap-3 text-gray-800 font-bold mb-5">
              <div className="p-2 rounded-xl bg-amber-50"><Plus className="h-4 w-4 text-amber-500" /></div>
              {t("certs_manual_issue")}
            </div>
            <div className="grid gap-3">
              <div>
                <label className="label">{t("certs_recipient")}</label>
                <input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder="Ornek Isim" className="input-field" />
              </div>
              <div>
                <label className="label">{t("certs_hosting_term")}</label>
                <select value={issueTerm} onChange={(e) => setIssueTerm(e.target.value as any)} className="input-field appearance-none">
                  <option value="monthly">{t("certs_term_monthly")}</option>
                  <option value="yearly">{t("certs_term_yearly")} (2 Ay Hediye)</option>
                </select>
              </div>
              <button onClick={issueOne} disabled={issuing} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 active:scale-95 disabled:opacity-50 transition-all">
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {t("certs_issue")}
              </button>
            </div>
          </motion.div>

          {/* Filter card */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <div className="flex items-center gap-3 text-gray-800 font-bold mb-4">
              <div className="p-2 rounded-xl bg-brand-50"><Filter className="h-4 w-4 text-brand-600" /></div>
              {t("certs_filter")}
            </div>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={t("certs_search_placeholder")} className="input-field pl-9" />
              </div>
              <div className="flex gap-2">
                <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="input-field flex-1 appearance-none">
                  <option value="">{t("certs_status_all")}</option>
                  <option value="active">{t("certs_status_active")}</option>
                  <option value="revoked">{t("certs_status_revoked")}</option>
                  <option value="expired">{t("certs_status_expired")}</option>
                </select>
                <button onClick={() => load()} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 shadow-sm transition-colors">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="error-banner flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {err}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT - Table */}
        <div className="lg:col-span-8 flex flex-col">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden flex flex-col flex-grow">

            <div className="bg-surface-50 border-b border-surface-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-surface-700 font-bold">
                <button onClick={toggleSelectAll} className="text-surface-400 hover:text-brand-600 transition-colors" title="Tümünü seç">
                  {allSelected ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}
                </button>
                <FileText className="h-4 w-4 text-gray-400" />
                {t("certs_title")}
              </div>
              <div className="flex gap-2 text-xs font-bold text-gray-500">
                {selectedIds.size > 0 && (
                  <span className="rounded-full bg-brand-100 border border-brand-200 px-3 py-0.5 text-brand-700">{selectedIds.size} seçili</span>
                )}
                <span className="rounded-full bg-surface-100 border border-surface-200 px-3 py-0.5">{t("certs_total")} {total}</span>
                <span className="rounded-full bg-surface-100 border border-surface-200 px-3 py-0.5">{page}/{totalPages}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-24 flex-grow">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-3" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-24 text-center flex-grow">
                <Search className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">{t("certs_empty")}</p>
              </div>
            ) : (
              <motion.div variants={containerVars} initial="hidden" animate="show" className="divide-y divide-surface-100 overflow-y-auto max-h-[800px]">
                {items.map((c) => {
                  const s = getStatusStyle(c.status);
                  const canDownload = c.status === "active" && !!c.pdf_url;
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <motion.div key={c.id} variants={rowVars} className={`p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-surface-50 transition-colors ${isSelected ? "bg-brand-50 hover:bg-brand-50" : ""}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button onClick={() => toggleSelect(c.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-brand-600 transition-colors">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.color} ${s.border}`}>
                              {s.icon} {c.status}
                            </span>
                            <span className="text-base font-semibold text-gray-800 truncate">{c.student_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-gray-400">
                            <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{c.uuid.split("-")[0]}...</span>
                            {c.public_id && <span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" />{c.public_id}</span>}
                            {c.hosting_term && <span className="rounded border border-gray-100 bg-gray-50 px-2 py-0.5">{c.hosting_term}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex gap-2">
                          <a href={`/verify/${c.uuid}`} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" /> {t("certs_verify")}
                          </a>
                          {canDownload ? (
                            <a href={c.pdf_url!} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all">
                              <Download className="h-3.5 w-3.5" /> {t("certs_download")}
                            </a>
                          ) : (
                            <div className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-300 cursor-not-allowed">
                              <ShieldOff className="h-3.5 w-3.5" /> Kilitli
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1 bg-surface-50 border border-surface-200 rounded-lg p-1">
                          <button onClick={() => patchStatus(c.id, "active")} disabled={c.status === "active"} className="flex-1 rounded px-2 py-1 text-[10px] font-bold text-surface-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-25 transition-colors">Active</button>
                          <button onClick={() => patchStatus(c.id, "revoked")} disabled={c.status === "revoked"} className="flex-1 rounded px-2 py-1 text-[10px] font-bold text-surface-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-25 transition-colors">Revoke</button>
                          <button onClick={() => patchStatus(c.id, "expired")} disabled={c.status === "expired"} className="flex-1 rounded px-2 py-1 text-[10px] font-bold text-surface-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-25 transition-colors">Expire</button>
                          <div className="w-px bg-surface-200" />
                          <button onClick={() => setDeleteTargetId(c.id)} className="rounded px-2 py-1 text-surface-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            <div className="bg-surface-50 border-t border-surface-100 px-4 py-3 flex items-center justify-between mt-auto">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary gap-2 text-xs disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> {t("certs_prev")}
              </button>
              <span className="text-xs font-bold text-surface-400"><span className="text-surface-700">{page}</span>/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary gap-2 text-xs disabled:opacity-30">
                {t("certs_next")} <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
      <ConfirmModal
        open={deleteTargetId !== null}
        title="Sertifikayı sil"
        description="Bu sertifikayı sistemden kalıcı olarak silmek istediğinize emin misiniz?"
        danger
        loading={deleteLoading}
        onConfirm={confirmSoftDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
      <ConfirmModal
        open={bulkTarget !== null}
        title={bulkTarget === "delete" ? "Toplu sil" : bulkTarget === "revoke" ? "Toplu revoke" : "Toplu expire"}
        description={`Seçili ${selectedIds.size} sertifikayı ${bulkTarget === "delete" ? "kalıcı olarak silmek" : bulkTarget === "revoke" ? "revoke etmek" : "expire etmek"} istediğinize emin misiniz?`}
        danger={bulkTarget === "delete"}
        loading={bulkLoading}
        onConfirm={executeBulkAction}
        onCancel={() => setBulkTarget(null)}
      />
    </div>
  );
}
