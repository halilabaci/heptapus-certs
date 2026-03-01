"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || "İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">E-posta Gönderildi</h2>
          <p className="text-sm text-gray-500 mb-6">
            Şifre sıfırlama talimatları <strong className="text-gray-700">{email}</strong> adresine gönderildi. Spam klasörünüzü de kontrol edin.
          </p>
          <Link href="/admin/login" className="btn-secondary w-full justify-center">Giriş Sayfasına Dön</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card w-full max-w-md p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Şifremi Unuttum</h1>
          <p className="mt-1.5 text-sm text-gray-500">E-posta adresinizi girin, sıfırlama bağlantısı göndereceğiz.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@sirket.com" required autoComplete="email" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="error-banner">{err}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? "Gönderiliyor..." : <><ArrowRight className="h-4 w-4" /> Sıfırlama Bağlantısı Gönder</>}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">Giriş Sayfasına Dön</Link>
        </div>
      </motion.div>
    </div>
  );
}
