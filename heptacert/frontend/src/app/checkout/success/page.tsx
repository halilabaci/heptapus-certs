"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order_id");
  const [secs, setSecs] = useState(10);

  useEffect(() => {
    if (secs <= 0) { router.push("/admin/events"); return; }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-brand-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card max-w-md w-full p-10 text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Ödeme Başarılı!</h1>
        <p className="text-gray-500 text-sm mb-1">
          Aboneliğiniz aktive edildi. Sipariş #{orderId}
        </p>
        <p className="text-xs text-gray-400 mb-8">
          {secs} saniye içinde panele yönlendirileceksiniz...
        </p>
        <Link href="/admin/events" className="btn-primary w-full justify-center">
          Panele Git
        </Link>
        <div className="mt-6">
          <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto h-10 w-auto" unoptimized />
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
