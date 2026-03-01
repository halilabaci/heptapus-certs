"use client";

import { useState } from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, KeyRound, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type MeOut = {
  id: number;
  email: string;
  role: "admin" | "superadmin";
  heptacoin_balance: number;
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [partialToken, setPartialToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Magic link state
  const [magicMode, setMagicMode] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data?.requires_2fa) {
        setPartialToken(data.partial_token);
        setStep("otp");
        setLoading(false);
        return;
      }

      const token = data?.access_token as string | undefined;
      if (!token) throw new Error("Token alınamadı.");
      await finishLogin(token);
    } catch (e: any) {
      clearToken();
      setErr(e?.message || "Giriş başarısız oldu. Bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/2fa/validate", {
        method: "POST",
        body: JSON.stringify({ partial_token: partialToken, code: otpCode }),
      });
      const data = await res.json();
      const token = data?.access_token as string | undefined;
      if (!token) throw new Error("Doğrulama başarısız.");
      await finishLogin(token);
    } catch (e: any) {
      setErr(e?.message || "Geçersiz kod. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function finishLogin(token: string) {
    setToken(token);
    const meRes = await apiFetch("/me", { method: "GET" });
    const me = (await meRes.json()) as MeOut;
    if (me.role === "superadmin") router.push("/admin/superadmin");
    else router.push("/admin/events");
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMagicLoading(true);
    try {
      await apiFetch("/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email: magicEmail }),
      });
      setMagicSent(true);
    } catch (ex: any) {
      setErr(ex?.message || "Magic link gönderilemedi.");
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="card w-full max-w-md p-10"
      >
        <AnimatePresence mode="wait">
          {step === "credentials" ? (
            <motion.div key="credentials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Giriş Yap</h1>
                <p className="mt-1.5 text-sm text-gray-500">HeptaCert Yönetim Paneli</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="label">E-posta Adresi</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="siz@sirket.com"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Şifre</label>
                    <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      Şifremi Unuttum
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {err && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="error-banner">{err}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button disabled={loading} className="btn-primary w-full justify-center py-3 group">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Giriş yapılıyor...</>
                  ) : (
                    <>Giriş Yap <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                Hesabınız yok mu?{" "}
                <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              {/* Magic link toggle */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMagicMode(true); setErr(null); setMagicSent(false); }}
                  className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Sparkles className="h-4 w-4" /> Magic link ile giriş yap
                </button>
              </div>            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {/* 2FA Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">İki Faktörlü Doğrulama</h1>
                <p className="mt-1.5 text-sm text-gray-500">Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin</p>
              </div>

              <form onSubmit={onOtpSubmit} className="space-y-5">
                <div>
                  <label className="label">Doğrulama Kodu</label>
                  <input
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {err && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="error-banner">{err}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button disabled={loading || otpCode.length !== 6} className="btn-primary w-full justify-center py-3 group">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Doğrulanıyor...</>
                  ) : (
                    <>Doğrula <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setErr(null); setOtpCode(""); }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Geri Dön
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Magic Link Modal */}
      <AnimatePresence>
        {magicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setMagicMode(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-md p-8"
            >
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Magic Link ile Giriş</h2>
                <p className="text-sm text-gray-500 mt-1">E-postanıza şifresiz giriş bağlantısı göndeririz.</p>
              </div>

              {magicSent ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="font-semibold text-gray-800">Bağlantı gönderildi!</p>
                  <p className="text-sm text-gray-500">E-postanızı kontrol edin. Bağlantı 15 dakika geçerli.</p>
                  <button onClick={() => { setMagicMode(false); setMagicSent(false); }} className="mt-2 btn-ghost text-sm">Kapat</button>
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="space-y-4">
                  <div>
                    <label className="label">E-posta Adresi</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        className="input-field pl-10"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="siz@sirket.com"
                        type="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {err && <div className="error-banner text-sm">{err}</div>}

                  <button disabled={magicLoading} className="btn-primary w-full justify-center py-3">
                    {magicLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor...</> : <><Sparkles className="h-4 w-4" /> Link Gönder</>}
                  </button>
                  <button type="button" onClick={() => setMagicMode(false)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
                    ← İptal
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
