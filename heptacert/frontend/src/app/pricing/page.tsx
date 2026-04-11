import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description:
    "HeptaCert fiyatlandırmasını kullanıcı tipi bazında inceleyin: normal kullanıcı ve kurumsal.",
  openGraph: {
    title: "Fiyatlandırma | HeptaCert",
    description:
      "HeptaCert fiyatlandırmasını kullanıcı tipi bazında inceleyin: normal kullanıcı ve kurumsal.",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Fiyatlandırma Akışı</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Lütfen kullanıcı tipinize uygun fiyatlandırma sayfasını seçin.
          </p>
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            href="/pricing/member"
            className="group rounded-3xl border border-sky-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-slate-900">Normal Kullanıcı</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Topluluk üyeliği, profil planları ve normal kullanıcıya özel premium seçenekler.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              Üyelik Planlarını Aç
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/pricing/business"
            className="group rounded-3xl border border-amber-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-slate-900">Kurumsal Kullanıcı</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              İşletme ve organizasyon planları, ödeme/checkout akışı ve kurumsal teklif seçenekleri.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              Kurumsal Planları Aç
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
