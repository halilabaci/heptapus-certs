"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, Lock, Mail, RefreshCw, AlertCircle } from "lucide-react";
import { getSuperAdminStats, SuperAdminStatsOut } from "@/lib/api";
import { StatCard, StatCardSkeleton } from "@/components/Admin/StatCard";
import PageHeader from "@/components/Admin/PageHeader";

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-surface-100 rounded-full h-2.5 overflow-hidden">
      <div className={`${color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function MetricCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-bold text-surface-800 mb-5 flex items-center gap-2.5">
        {icon} {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function SuperAdminStatsPage() {
  const [stats, setStats] = useState<SuperAdminStatsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await getSuperAdminStats();
      setStats(data);
    } catch (e: any) {
      setError(e?.message || "İstatistikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const userRate = stats && stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;
  const eventRate = stats && stats.total_events > 0 ? Math.round((stats.completed_events / stats.total_events) * 100) : 0;
  const certRate = stats && stats.total_certificates > 0 ? Math.round((stats.issued_certificates / stats.total_certificates) * 100) : 0;
  const emailRate = stats && stats.total_emails > 0 ? Math.round((stats.delivered_emails / stats.total_emails) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Sistem İstatistikleri"
        subtitle="Platform genelindeki performans metriklerini izleyin"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard label="Toplam Kullanıcı" value={stats.total_users} icon={<Users className="h-5 w-5" />} iconBg="bg-blue-50 text-blue-600"
              footer={<span className="text-blue-600 text-xs font-medium">{stats.active_users} aktif ({userRate}%)</span>} />
            <StatCard label="Toplam Etkinlik" value={stats.total_events} icon={<BarChart3 className="h-5 w-5" />} iconBg="bg-emerald-50 text-emerald-600"
              footer={<span className="text-emerald-600 text-xs font-medium">{stats.completed_events} tamamlandı ({eventRate}%)</span>} />
            <StatCard label="Sertifikalar" value={stats.total_certificates} icon={<Lock className="h-5 w-5" />} iconBg="bg-purple-50 text-purple-600"
              footer={<span className="text-purple-600 text-xs font-medium">{stats.issued_certificates} verildi ({certRate}%)</span>} />
            <StatCard label="Emailler" value={stats.total_emails} icon={<Mail className="h-5 w-5" />} iconBg="bg-orange-50 text-orange-600"
              footer={<span className="text-orange-600 text-xs font-medium">{stats.delivered_emails} iletildi ({emailRate}%)</span>} />
          </>
        ) : null}
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricCard title="Kullanıcı Metrikleri" icon={<Users className="h-4 w-4 text-blue-600" />}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-700">Aktif Kullanıcılar</span>
                <span className="text-sm font-bold text-surface-900">{userRate}%</span>
              </div>
              <ProgressBar value={userRate} color="bg-blue-500" />
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Toplam Admin</span>
              <span className="font-bold text-surface-900">{stats.total_admins}</span>
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Toplam Organizasyon</span>
              <span className="font-bold text-surface-900">{stats.total_organizations}</span>
            </div>
          </MetricCard>

          <MetricCard title="Etkinlik Metrikleri" icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-700">Tamamlanma Oranı</span>
                <span className="text-sm font-bold text-surface-900">{eventRate}%</span>
              </div>
              <ProgressBar value={eventRate} color="bg-emerald-500" />
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Devam Eden</span>
              <span className="font-bold text-surface-900">{Math.max(0, stats.total_events - stats.completed_events)}</span>
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Toplam Katılımcı</span>
              <span className="font-bold text-surface-900">{stats.total_attendees}</span>
            </div>
          </MetricCard>

          <MetricCard title="Sertifika Metrikleri" icon={<Lock className="h-4 w-4 text-purple-600" />}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-700">Başarı Oranı</span>
                <span className="text-sm font-bold text-surface-900">{certRate}%</span>
              </div>
              <ProgressBar value={certRate} color="bg-purple-500" />
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Beklemede</span>
              <span className="font-bold text-surface-900">{Math.max(0, stats.total_certificates - stats.issued_certificates)}</span>
            </div>
          </MetricCard>

          <MetricCard title="Email Metrikleri" icon={<Mail className="h-4 w-4 text-orange-600" />}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-700">İletim Oranı</span>
                <span className="text-sm font-bold text-surface-900">{emailRate}%</span>
              </div>
              <ProgressBar value={emailRate} color="bg-orange-500" />
            </div>
            <div className="flex justify-between text-sm text-surface-700">
              <span>Başarısız</span>
              <span className="font-bold text-surface-900">{Math.max(0, stats.total_emails - stats.delivered_emails)}</span>
            </div>
          </MetricCard>
        </div>
      )}

      <p className="text-center text-xs text-surface-400">Son güncelleme: {new Date().toLocaleString("tr-TR")}</p>
    </div>
  );
}
