"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, AlertCircle, Save } from "lucide-react";
import { getSuperAdminStats, updateSuperAdminStats, type SuperAdminLandingStatsConfig } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";

export default function SuperAdminStatsPage() {
  const [stats, setStats] = useState<SuperAdminLandingStatsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [useRealCounts, setUseRealCounts] = useState(true);
  const [activeMembers, setActiveMembers] = useState("");
  const [hostedEvents, setHostedEvents] = useState("");
  const [issuedCertificates, setIssuedCertificates] = useState("");
  const [uptimePct, setUptimePct] = useState("");
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await getSuperAdminStats();
      setStats(data);
      setUseRealCounts(data.use_real_counts ?? true);
      setActiveMembers(data.active_members ?? "");
      setHostedEvents(data.hosted_events ?? "");
      setIssuedCertificates(data.issued_certificates ?? "");
      setUptimePct(data.uptime_pct ?? "");
      setAvailability(data.availability ?? "");
    } catch (e: any) {
      setError(e?.message || "İstatistikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SuperAdminLandingStatsConfig = {
        use_real_counts: useRealCounts,
        active_members: activeMembers.trim() || null || undefined,
        hosted_events: hostedEvents.trim() || null || undefined,
        issued_certificates: issuedCertificates.trim() || null || undefined,
        uptime_pct: uptimePct.trim() || null || undefined,
        availability: availability.trim() || null || undefined,
      };
      const updated = await updateSuperAdminStats(payload);
      setStats(updated);
      setSuccess("Landing istatistik ayarları kaydedildi.");
    } catch (e: any) {
      setError(e?.message || "Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Landing İstatistikleri"
        subtitle="Ana sayfadaki sayıları otomatik veya manuel olarak yönetin"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <button onClick={fetchStats} className="btn-secondary gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Yenile
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={fetchStats} className="ml-auto text-xs font-bold underline">Yeniden Dene</button>
        </div>
      )}

      {success && (
        <div className="success-banner text-sm font-medium">{success}</div>
      )}

      <form className="card space-y-6 p-6" onSubmit={handleSave}>
        <label className="flex items-center justify-between rounded-xl border border-surface-200 bg-white p-4">
          <div>
            <p className="text-sm font-bold text-surface-900">Otomatik Sayım (DB)</p>
            <p className="text-xs text-surface-500 mt-1">Açıkken sistem sayıları çeker, girdiğiniz değerler varsa onları override eder.</p>
          </div>
          <input
            type="checkbox"
            checked={useRealCounts}
            onChange={(e) => setUseRealCounts(e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Aktif Üye</label>
            <input className="input-field" value={activeMembers} onChange={(e) => setActiveMembers(e.target.value)} placeholder="örn: 12.4K+" />
          </div>
          <div className="space-y-1.5">
            <label className="label">Düzenlenen Etkinlik</label>
            <input className="input-field" value={hostedEvents} onChange={(e) => setHostedEvents(e.target.value)} placeholder="örn: 850+" />
          </div>
          <div className="space-y-1.5">
            <label className="label">Verilen Sertifika</label>
            <input className="input-field" value={issuedCertificates} onChange={(e) => setIssuedCertificates(e.target.value)} placeholder="örn: 50.000+" />
          </div>
          <div className="space-y-1.5">
            <label className="label">Uptime (%)</label>
            <input className="input-field" value={uptimePct} onChange={(e) => setUptimePct(e.target.value)} placeholder="örn: %100" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="label">Erişilebilirlik</label>
            <input className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="örn: 7/24" />
          </div>
        </div>

        {stats && (
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-xs text-surface-600">
            <p className="font-semibold text-surface-800 mb-2">Mevcut Kayıt</p>
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(stats, null, 2)}</pre>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={loading || saving} className="btn-primary gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
