"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Doğrulama bağlantısı geçersiz veya eksik.");
      return;
    }
    apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then(async (r) => {
        const d = await r.json();
        setMessage(d.detail || "E-posta başarıyla doğrulandı.");
        setStatus("success");
      })
      .catch((e) => {
        setMessage(e?.message || "Doğrulama başarısız. Bağlantı süresi dolmuş olabilir.");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full p-10 text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Doğrulanıyor...</h2>
            <p className="mt-2 text-sm text-gray-400">Lütfen bekleyin.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-posta Doğrulandı!</h2>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link href="/admin/login" className="btn-primary w-full justify-center">
              Giriş Yap
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Doğrulama Başarısız</h2>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link href="/register" className="btn-secondary w-full justify-center">
              Yeniden Kayıt Ol
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
