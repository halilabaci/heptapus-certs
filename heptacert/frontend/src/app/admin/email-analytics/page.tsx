"use client";

import { useEffect, useState } from "react";
import { Mail, TrendingUp, Loader2, AlertCircle, Send, BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";

type Event = { id: number; name: string; event_date: string | null };

export default function EmailAnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setError(null);
      const res = await apiFetch("/admin/events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Etkinlikler yüklenemedi");
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
        title="Email Analitik"
        subtitle="Etkinlik bazlı email teslimat ve performans takibi"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Email Merkezi", href: "/admin/email-dashboard" }, { label: "Email Analitik" }]}
      />

      {error && (
        <div className="error-banner">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="card p-4 bg-blue-50 border-blue-200 text-sm text-blue-800 flex items-start gap-3">
        <Mail className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
        <p>Email analitikleri etkinlik bazında takip edilir. Aşağıdan bir etkinlik seçerek toplu email iş geçmişini ve teslimat istatistiklerini inceleyebilirsiniz.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-7 w-7" />}
          title="Henüz etkinlik yok"
          description="Email analitiği görüntülemek için önce bir etkinlik oluşturun"
          action={<Link href="/admin/events" className="btn-primary">Etkinliklere Git</Link>}
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-900">Etkinlikler</h2>
            <p className="text-xs text-surface-400 mt-0.5">{events.length} etkinlik · Analitik için etkinlik seçin</p>
          </div>
          <div className="divide-y divide-surface-100">
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors">
                <div>
                  <p className="font-medium text-surface-900">{event.name}</p>
                  {event.event_date && (
                    <p className="text-xs text-surface-400 mt-0.5">
                      {new Date(event.event_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/events/${event.id}/bulk-emails`}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" /> Toplu Email
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/analytics`}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Analitik
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
