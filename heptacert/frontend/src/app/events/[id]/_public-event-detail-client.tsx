"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Flag,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  createPublicEventComment,
  getPublicEventDetail,
  getPublicMemberMe,
  getPublicMemberToken,
  listPublicEventComments,
  reportPublicEventComment,
  type PublicEventComment,
  type PublicEventDetail,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PublicEventDetailClient() {
  const params = useParams();
  const rawEventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = rawEventId ? String(rawEventId) : "";
  const { lang } = useI18n();

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [member, setMember] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportingId, setReportingId] = useState<number | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Etkinlik listesine dön",
            loading: "Etkinlik detayları yükleniyor...",
            error: "Etkinlik detayları yüklenemedi.",
            register: "Etkinliğe Kayıt Ol",
            registrationClosed: "Kayıt Kapalı",
            sessions: "Oturumlar",
            customFields: "Kayıtta istenecek ek bilgiler",
            minSessions: "Sertifika için minimum oturum",
            unlisted: "Liste dışı paylaşım",
            noSessions: "Henüz oturum eklenmedi.",
            defaultFields: "Bu etkinlikte şimdilik standart ad ve e-posta alanları kullanılıyor.",
            defaultHelper: "Kayıt sırasında doldurulacak ek alan.",
            required: "Zorunlu",
            commentsTitle: "Yorumlar",
            commentsSubtitle: "Topluluğun etkinlik hakkındaki görüşlerini inceleyin veya siz de yorum bırakın.",
            noComments: "Henüz yorum yok. İlk yorumu sen bırak.",
            commentPlaceholder: "Bu etkinlik hakkında ne düşünüyorsun?",
            commentSubmit: "Yorum Gönder",
            loginPrompt: "Yorum yazmak için üye hesabınla giriş yap.",
            loginCta: "Üye Girişi",
            report: "Bildir",
            reportBusy: "Gönderiliyor",
            writeError: "Yorum gönderilemedi.",
            sessionLabel: "Oturum",
            fieldType: "Alan tipi",
            postingAs: "olarak yorum yapıyorsunuz.",
          }
        : {
            back: "Back to events",
            loading: "Loading event details...",
            error: "Failed to load event details.",
            register: "Register for Event",
            registrationClosed: "Registration Closed",
            sessions: "Sessions",
            customFields: "Additional registration fields",
            minSessions: "Minimum sessions for certificate",
            unlisted: "Unlisted share",
            noSessions: "No session has been added yet.",
            defaultFields: "This event currently uses the standard name and email fields only.",
            defaultHelper: "Additional field collected during registration.",
            required: "Required",
            commentsTitle: "Comments",
            commentsSubtitle: "Read what the community thinks about this event or leave your own note.",
            noComments: "There are no comments yet. Be the first to post.",
            commentPlaceholder: "What do you think about this event?",
            commentSubmit: "Post Comment",
            loginPrompt: "Sign in with your member account to write a comment.",
            loginCta: "Member Login",
            report: "Report",
            reportBusy: "Sending",
            writeError: "Failed to submit comment.",
            sessionLabel: "Session",
            fieldType: "Field type",
            postingAs: "posting as.",
          },
    [lang],
  );

  useEffect(() => {
    let active = true;

    if (!eventId) {
      setEvent(null);
      setComments([]);
      setMember(null);
      setError(copy.error);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getPublicEventDetail(eventId),
      listPublicEventComments(eventId).catch(() => []),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([eventData, commentData, memberData]) => {
        if (!active) return;
        setEvent(eventData);
        setComments(commentData);
        setMember(memberData);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.error, eventId]);

  async function handleCommentSubmit(eventArg: React.FormEvent) {
    eventArg.preventDefault();
    if (!commentBody.trim()) return;

    setCommentBusy(true);
    setError(null);
    try {
      const created = await createPublicEventComment(eventId, commentBody.trim());
      setComments((current) => [created, ...current]);
      setCommentBody("");
    } catch (err: any) {
      setError(err?.message || copy.writeError);
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleReport(commentId: number) {
    setReportingId(commentId);
    setError(null);
    try {
      await reportPublicEventComment(eventId, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (err: any) {
      setError(err?.message || copy.writeError);
    } finally {
      setReportingId(null);
    }
  }

  if (loading) {
    return <div className="card p-10 text-center text-sm text-slate-500">{copy.loading}</div>;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="error-banner">{error || copy.error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Card */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl mb-12">
          {/* Banner Section */}
          <div className="relative h-56 sm:h-64 lg:h-72 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden group">
            {event.event_banner_url ? (
              <>
                <img
                  src={event.event_banner_url}
                  alt={event.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-white/20">📅</span>
                </div>
              </>
            )}
          </div>

          {/* Content Section */}
          <div className="relative px-6 py-8 sm:px-8">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              {event.visibility === "unlisted" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">
                  🔒 {copy.unlisted}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                ✓ {copy.minSessions}: {event.min_sessions_required}
              </span>
            </div>

            {/* Title and Description */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight">
                {event.name}
              </h1>

              {event.organization_public_id && event.organization_name ? (
                <Link
                  href={`/organizations/${event.organization_public_id}`}
                  className="inline-flex items-center gap-3 mb-6 rounded-full border-2 border-slate-200 bg-white px-4 py-2 hover:border-blue-300 hover:bg-blue-50 transition duration-300"
                >
                  {event.organization_logo ? (
                    <img
                      src={event.organization_logo}
                      alt={event.organization_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="h-5 w-5 text-slate-600" />
                  )}
                  <span className="font-semibold text-slate-700">
                    {event.organization_name}
                  </span>
                </Link>
              ) : null}

              {event.event_description ? (
                <div
                  className="rich-text-content mt-6 max-w-3xl text-base text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: event.event_description }}
                />
              ) : null}
            </div>

            {/* Key Info Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 px-5 py-4 hover:shadow-lg transition duration-300">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tarih</p>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {formatDate(event.event_date, lang)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 px-5 py-4 hover:shadow-lg transition duration-300">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Konum</p>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {event.event_location || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 px-5 py-4 hover:shadow-lg transition duration-300">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-pink-600 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Oturumlar</p>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {event.sessions.length} {copy.sessions.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex gap-3">
              {event.registration_closed ? (
                <div className="inline-flex items-center px-6 py-3 rounded-2xl border-2 border-slate-300 bg-slate-100 text-slate-500 font-bold">
                  {copy.registrationClosed}
                </div>
              ) : (
                <Link
                  href={`/events/${event.public_id}/register`}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105"
                >
                  📋 {copy.register}
                </Link>
              )}
              <Link
                href={`/events/${event.public_id}/status`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition duration-300"
              >
                ✓ {copy.status}
              </Link>
            </div>
          </div>
        </section>

        {/* Sessions and Fields Grid */}
        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          {/* Sessions Section */}
          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📍</span>
              {copy.sessions}
            </h2>
            <div className="space-y-4">
              {event.sessions.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                  {copy.noSessions}
                </div>
              ) : (
                event.sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-md hover:shadow-lg hover:border-blue-300 transition duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                        {copy.sessionLabel} {index + 1}
                      </p>
                      <span className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-4">
                      {session.name}
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        {formatDate(session.session_date, lang)}
                      </div>
                      {session.session_start && (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-purple-500" />
                          {session.session_start}
                        </div>
                      )}
                      {session.session_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-pink-500" />
                          {session.session_location}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Registration Fields Section */}
          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📝</span>
              {copy.customFields}
            </h2>
            <div className="space-y-4">
              {event.registration_fields.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                  {copy.defaultFields}
                </div>
              ) : (
                event.registration_fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md hover:shadow-lg transition duration-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-slate-900">{field.label}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {field.type}
                        </span>
                        {field.required ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                            ✱ {copy.required}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {field.helper_text && (
                      <p className="text-xs text-slate-500">{field.helper_text}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Comments Section */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-8 border-b border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="text-3xl">💬</span>
              {copy.commentsTitle}
            </h2>
            <p className="text-sm text-slate-500">{copy.commentsSubtitle}</p>
          </div>

          <div className="px-6 py-8 sm:px-8 space-y-6">
            {error ? (
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-5 py-4 flex items-start gap-3 text-sm text-rose-700">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            ) : null}

            {/* Comment Form */}
            {member ? (
              <form
                className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-md focus-within:border-blue-400 focus-within:shadow-lg transition duration-300"
                onSubmit={handleCommentSubmit}
              >
                <textarea
                  value={commentBody}
                  onChange={(eventArg) => setCommentBody(eventArg.target.value)}
                  rows={4}
                  placeholder={copy.commentPlaceholder}
                  className="w-full resize-none border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    💬 {member.display_name || member.email}
                  </p>
                  <button
                    type="submit"
                    disabled={commentBusy || !commentBody.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-lg disabled:opacity-60"
                  >
                    {commentBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {copy.commentSubmit}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-6 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <p className="text-sm text-blue-900 mb-4">{copy.loginPrompt}</p>
                <Link
                  href="/login?mode=member"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
                >
                  🔑 {copy.loginCta}
                </Link>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500">{copy.noComments}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100/50 transition duration-300 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/member/${comment.member_public_id}`}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500 ring-2 ring-white shadow-md hover:shadow-lg transition duration-300"
                        >
                          {comment.member_avatar_url ? (
                            <img
                              src={comment.member_avatar_url}
                              alt={comment.member_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-white">
                              {comment.member_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </Link>
                        <div>
                          <Link
                            href={`/member/${comment.member_public_id}`}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                          >
                            {comment.member_name}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(comment.created_at).toLocaleString(
                              lang === "tr" ? "tr-TR" : "en-US"
                            )}
                          </p>
                        </div>
                      </div>
                      {member && member.public_id !== comment.member_public_id ? (
                        <button
                          type="button"
                          onClick={() => void handleReport(comment.id)}
                          disabled={reportingId === comment.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                        >
                          {reportingId === comment.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {copy.reportBusy}
                            </>
                          ) : (
                            <>
                              <Flag className="h-3.5 w-3.5" />
                              {copy.report}
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

