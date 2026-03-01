"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

function CheckoutCancelContent() {
  const params = useSearchParams();
  const orderId = params.get("order_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card max-w-md w-full p-10 text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
          <XCircle className="h-10 w-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Ödeme İptal Edildi</h1>
        <p className="text-gray-500 text-sm mb-8">
          Ödeme işlemi tamamlanmadı{orderId ? ` (Sipariş #${orderId})` : ""}. İstediğiniz zaman tekrar deneyebilirsiniz.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/pricing" className="btn-primary w-full justify-center">
            Planlara Dön
          </Link>
          <Link href="/" className="btn-secondary w-full justify-center">
            Ana Sayfa
          </Link>
        </div>
        <div className="mt-6">
          <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto h-10 w-auto" unoptimized />
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <CheckoutCancelContent />
    </Suspense>
  );
}
