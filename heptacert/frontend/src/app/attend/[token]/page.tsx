"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCheckinSessionInfo, selfCheckin } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2, QrCode, MapPin, Calendar, Clock, Users } from "lucide-react";

interface SessionInfo {
  session_id: number;
  session_name: string;
  session_date: string | null;
  session_start: string | null;
  session_location: string | null;
  is_active: boolean;
  event_id: number;
  event_name: string;
  event_date: string | null;
  min_sessions_required: number;
  attendance_count: number;
}

interface CheckinResult {
  success: boolean;
  message: string;
  attendee_name: string;
  sessions_attended: number;
  sessions_required: number;
  total_sessions: number;
}

export default function AttendCheckinPage() {
  const params = useParams();
  const token = params?.token as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  useEffect(() => {
    if (!token) return;
    getCheckinSessionInfo(token)
      .then(setSessionInfo)
      .catch((e) => setError(e.message || "QR kodu geçersiz"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await selfCheckin(token, email.trim());
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Check-in başarısız",
        attendee_name: "",
        sessions_attended: 0,
        sessions_required: 1,
        total_sessions: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">QR Kodu Geçersiz</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessionInfo?.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <QrCode className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">{sessionInfo?.session_name}</h1>
          <p className="text-sm text-gray-500 mb-1">{sessionInfo?.event_name}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-medium px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" />
            Check-in henüz açılmadı
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <QrCode className="w-10 h-10 mx-auto mb-2 opacity-80" />
          <h1 className="text-xl font-bold">{sessionInfo!.session_name}</h1>
          <p className="text-indigo-200 text-sm mt-1">{sessionInfo!.event_name}</p>
        </div>

        {/* Session meta */}
        <div className="px-6 pt-4 pb-2 flex flex-wrap gap-3 justify-center text-xs text-gray-500">
          {sessionInfo!.session_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(sessionInfo!.session_date).toLocaleDateString("tr-TR")}
            </span>
          )}
          {sessionInfo!.session_start && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {sessionInfo!.session_start}
            </span>
          )}
          {sessionInfo!.session_location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {sessionInfo!.session_location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {sessionInfo!.attendance_count} katılımcı
          </span>
        </div>

        <div className="px-6 pb-6">
          {result ? (
            <div className={`mt-4 rounded-2xl p-5 text-center ${result.success ? "bg-green-50" : "bg-red-50"}`}>
              {result.success ? (
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              ) : (
                <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
              )}
              <p className={`font-semibold text-base ${result.success ? "text-green-700" : "text-red-700"}`}>
                {result.message}
              </p>
              {result.sessions_attended > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>
                    Katıldığınız oturum sayısı:{" "}
                    <span className="font-bold text-indigo-600">
                      {result.sessions_attended}/{result.total_sessions}
                    </span>
                  </p>
                  {result.sessions_attended >= result.sessions_required ? (
                    <p className="mt-1 text-green-600 font-medium">
                      🎉 Sertifika almanız için gerekli oturum sayısını tamamladınız!
                    </p>
                  ) : (
                    <p className="mt-1 text-gray-500">
                      Sertifika için {result.sessions_required - result.sessions_attended} oturum daha gerekiyor.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckin} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta adresiniz
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Etkinliğe kayıt sırasında kullandığınız e-posta.
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Check-in Yap
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">
            Kayıtlı değil misiniz?{" "}
            <a
              href={`/events/${sessionInfo!.event_id}/register`}
              className="text-indigo-600 underline"
            >
              Etkinliğe kayıt ol
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
