"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Ticket,
  ArrowLeft,
  Clock3,
} from "lucide-react";
import { getPublicParticipantStatus, type PublicParticipantStatus } from "@/lib/api";

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
};

function readStoredSurveyToken(eventId: number) {
  if (typeof window === "undefined") return "";
  const query = new URLSearchParams(window.location.search);
  return (query.get("token") || localStorage.getItem(`heptacert_survey_token_${eventId}`) || "").trim();
}

export default function EventParticipantStatusPage() {
  const params = useParams();
  const eventId = Number(params?.id);

  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [status, setStatus] = useState<PublicParticipantStatus | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const nextToken = readStoredSurveyToken(eventId);
    setToken(nextToken);

    if (!nextToken) {
      setLoading(false);
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);
    getPublicParticipantStatus(eventId, nextToken)
      .then((data) => {
        setStatus(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(`heptacert_survey_token_${eventId}`, nextToken);
        }
      })
      .catch((err: any) => {
        setStatus(null);
        setError(err?.message || "Katılımcı durumu yüklenemedi.");
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const brandColor = branding?.brand_color || "#4f46e5";
  const brandName = branding?.org_name || "HeptaCert";
  const surveyHref = token ? `/events/${eventId}/survey?token=${encodeURIComponent(token)}` : `/events/${eventId}/survey`;

  const pageBg = useMemo(
    () => ({
      background: `
        radial-gradient(circle at top left, ${brandColor}16 0%, transparent 28%),
        radial-gradient(circle at top right, rgba(249,115,22,0.12) 0%, transparent 24%),
        linear-gradient(180deg, #f8fbff 0%, #eef2ff 52%, #f8fafc 100%)
      `,
    }),
    [brandColor],
  );

  const badgeDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }),
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}>
        <div className="rounded-[32px] border border-white/80 bg-white/90 px-8 py-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: brandColor }} />
          <p className="mt-4 text-sm font-medium text-slate-500">Katılımcı durumu hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!token || !status) {
    return (
      <div className="min-h-screen px-4 py-10" style={pageBg}>
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href={`/events/${eventId}/register`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Etkinlik sayfasına dön
          </Link>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Kişiye özel durum alanı
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Katılımcı durumu bulunamadı</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Bu sayfa sadece size özel bağlantı ile açılır. Kayıt olduktan sonra veya size gönderilen kişisel anket bağlantısı ile tekrar deneyin.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6 md:px-8 md:py-8">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}

              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                Önce kayıt akışından ilerleyin veya organizasyonun size gönderdiği özel anket bağlantısını açın. Ardından bu sayfada check-in, anket, rozet ve sertifika durumunuzu birlikte görebilirsiniz.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-10" style={pageBg}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/events/${eventId}/register`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Etkinlik sayfasına dön
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4" style={{ color: brandColor }} />
            {brandName} katılımcı paneli
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Tek bakışta tüm durumunuz
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Katılımcı durumunuz</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Check-in, anket, rozetler ve sertifika uygunluğu aynı ekranda. Buradaki bilgiler size özel bağlantı üzerinden yüklenir.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oturum</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {status.sessions_attended}/{Math.max(status.total_sessions, status.sessions_required)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Minimum {status.sessions_required} oturum</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anket</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {status.survey_completed ? "Tamam" : "Bekliyor"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {status.survey_required ? "Sertifika için gerekli" : "Opsiyonel"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rozetlerim</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{status.badge_count}</p>
                <p className="mt-1 text-xs text-slate-500">Toplam kazanılan rozet</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sertifika</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {status.certificate_ready ? "Hazır" : status.certificate_count > 0 ? "Üretildi" : "Bekliyor"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {status.certificate_ready ? "Görüntülemeye uygun" : "Koşullar tamamlanınca açılır"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Sonraki önerilen adım</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {status.certificate_ready
                    ? "Sertifikanız hazır. Doğrulama bağlantısından görüntüleyebilir veya indirebilirsiniz."
                    : status.survey_required && !status.survey_completed
                      ? "Önce anketi tamamlayın. Sistem sertifika uygunluğunu otomatik güncelleyecek."
                      : status.sessions_attended < status.sessions_required
                        ? `Sertifika için ${status.sessions_required - status.sessions_attended} oturum daha tamamlamanız gerekiyor.`
                        : "Katılım koşullarını tamamladınız. Sertifika veya yeni rozet güncellemeleri bu alana yansıyacak."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={surveyHref}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                    style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}DD 100%)` }}
                  >
                    Anket sayfasına git
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  {status.latest_certificate_verify_url ? (
                    <a
                      href={status.latest_certificate_verify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Sertifikayı görüntüle
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock3 className="h-4 w-4" style={{ color: brandColor }} />
                  Uygunluk özeti
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Check-in tamamlanan oturum: <span className="font-semibold">{status.sessions_attended}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Anket durumu: <span className="font-semibold">{status.survey_completed ? "tamamlandı" : "bekliyor"}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Görünür rozet: <span className="font-semibold">{status.badges.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {status.eligible_raffles.length > 0 ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Ticket className="h-4 w-4" />
                  Uygun olduğunuz çekilişler
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {status.eligible_raffles.map((raffle) => (
                    <span
                      key={raffle.id}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
                    >
                      {raffle.title} • {raffle.prize_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Rozetlerim</h2>
                  <p className="mt-1 text-sm text-slate-500">Etkinlik yönetimi tarafından verilen rozetler burada görünür.</p>
                </div>
              </div>

              {status.badges.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Henüz görünür bir rozetiniz yok. Rozet atandığında bu alanda otomatik olarak görünecek.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {status.badges.map((badge) => {
                    const color = badge.badge_color_hex || brandColor;
                    return (
                      <div key={badge.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900">{badge.badge_name || badge.badge_type}</p>
                            {badge.badge_description ? (
                              <p className="mt-1 text-sm leading-6 text-slate-600">{badge.badge_description}</p>
                            ) : null}
                          </div>
                          <div
                            className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                            style={{ color, borderColor: `${color}50`, backgroundColor: `${color}12` }}
                          >
                            <Award className="h-3.5 w-3.5" />
                            {badge.is_automatic ? "Otomatik" : "Manuel"}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            Tür: {badge.badge_type}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            {badgeDateFormatter.format(new Date(badge.awarded_at))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {status.certificate_ready ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  Sertifikanız hazır görünüyor
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Son koşullar tamamlanmış. Eğer görüntüleme bağlantısı mevcutsa yukarıdaki butondan doğrudan açabilirsiniz.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
