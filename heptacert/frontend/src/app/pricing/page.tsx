"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Zap, ShieldCheck, Star, HelpCircle, Coins, Loader2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, useT } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

type PricingTier = {
  id: string;
  name_tr: string;
  name_en: string;
  price_monthly: number | null;
  price_annual: number | null;
  hc_quota: number | null;
  features_tr: string[];
  features_en: string[];
  is_free: boolean;
  is_enterprise: boolean;
};

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { lang } = useI18n();
  const t = useT();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/pricing/config`)
        .then(r => r.json())
        .then((d: { tiers: PricingTier[] }) => { if (d.tiers?.length) setTiers(d.tiers); })
        .catch(() => setFetchErr(true)),
      fetch(`${API_BASE}/billing/status`)
        .then(r => r.json())
        .then((d: { enabled: boolean }) => setPaymentEnabled(!!d.enabled))
        .catch(() => {/* ignore, default false */}),
    ]).finally(() => setLoading(false));
  }, []);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  const name = (tier: PricingTier) => lang === "tr" ? tier.name_tr : tier.name_en;
  const features = (tier: PricingTier) => lang === "tr" ? tier.features_tr : tier.features_en;

  return (
    <div className="flex flex-col gap-20 pb-20 pt-10">

      {/* HEADER */}
      <motion.section variants={containerVars} initial="hidden" animate="visible" className="text-center px-4">
        <motion.div variants={itemVars} className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
          <Coins className="h-3.5 w-3.5 text-amber-500" /> HeptaCoin (HC) {t("pricing_model")}
        </motion.div>

        <motion.h1 variants={itemVars} className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          {t("pricing_hero_title")} <span className="text-brand-600">{t("pricing_hero_highlight")}</span>
        </motion.h1>

        <motion.p variants={itemVars} className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
          {t("pricing_hero_sub")}
        </motion.p>

        {/* Toggle */}
        <motion.div variants={itemVars} className="mt-8 flex items-center justify-center gap-4">
          <span className={`text-sm font-semibold ${!isAnnual ? "text-gray-800" : "text-gray-400"}`}>{t("pricing_monthly")}</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-7 w-14 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <span className={`${isAnnual ? "translate-x-8 bg-brand-600" : "translate-x-1 bg-gray-400"} inline-block h-5 w-5 transform rounded-full transition-transform`} />
          </button>
          <span className={`text-sm font-semibold ${isAnnual ? "text-gray-800" : "text-gray-400"}`}>
            {t("pricing_annual")}{" "}
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{t("pricing_annual_badge")}</span>
          </span>
        </motion.div>
      </motion.section>

      {/* PRICING CARDS */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
        </div>
      ) : fetchErr ? (
        <div className="error-banner mx-auto max-w-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {t("pricing_load_error")}
        </div>
      ) : (
        <motion.section
          variants={containerVars} initial="hidden" animate="visible"
          className="grid gap-8 md:grid-cols-3 items-center max-w-6xl mx-auto w-full px-4"
        >
          {tiers.map((tier, idx) => {
            const isPro = !tier.is_free && !tier.is_enterprise;
            const price = tier.is_free ? 0 : tier.is_enterprise ? null : isAnnual ? tier.price_annual : tier.price_monthly;
            const featureList = features(tier);
            const Icon = tier.is_enterprise ? ShieldCheck : CheckCircle2;

            return (
              <motion.div key={tier.id} variants={itemVars}
                className={`relative card p-8 ${isPro ? "border-brand-200 bg-brand-50 shadow-brand md:scale-105 z-10" : ""}`}>

                {isPro && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-brand-600 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md">
                    {t("pricing_popular")}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className={`font-black ${isPro ? "text-2xl text-gray-900" : "text-xl text-gray-800"}`}>{name(tier)}</h3>
                  {isPro && <Star className="h-6 w-6 text-amber-500 fill-amber-400/30" />}
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  {tier.is_enterprise ? (
                    <span className="text-4xl font-black text-gray-900">{t("pricing_custom")}</span>
                  ) : tier.is_free ? (
                    <>
                      <span className={`font-black text-gray-900 ${isPro ? "text-5xl" : "text-4xl"}`}>₺0</span>
                      <span className="text-sm font-medium text-gray-400">/ {t("pricing_month")}</span>
                    </>
                  ) : (
                    <>
                      <span className={`font-black text-gray-900 ${isPro ? "text-5xl" : "text-4xl"}`}>
                        ₺{(price ?? 0).toLocaleString("tr-TR")}
                      </span>
                      <span className="text-sm font-medium text-gray-400">/ {t("pricing_month")}</span>
                    </>
                  )}
                </div>

                {tier.hc_quota && (
                  <p className={`mt-2 text-xs font-semibold ${isPro ? "text-brand-600" : "text-amber-600"}`}>
                    {tier.is_free ? t("pricing_pay_as_you_go") : `${t("pricing_monthly_hc")} ${tier.hc_quota.toLocaleString("tr-TR")} HC`}
                  </p>
                )}

                {tier.is_enterprise ? (
                  <a href="mailto:info@heptapusgroup.com" className="btn-secondary mt-8 flex w-full justify-center">
                    {t("pricing_contact")}
                  </a>
                ) : tier.is_free ? (
                  <Link href="/register" className="btn-secondary mt-8 flex w-full justify-center">
                    {t("pricing_start_free")}
                  </Link>
                ) : paymentEnabled ? (
                  <Link
                    href={`/checkout?plan=${tier.id}&period=${isAnnual ? "annual" : "monthly"}`}
                    className="btn-primary mt-8 flex w-full justify-center items-center gap-2"
                  >
                    <Zap className="h-4 w-4" /> {t("pricing_subscribe")}
                  </Link>
                ) : (
                  <div className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    <Clock className="h-4 w-4" /> Yakında
                  </div>
                )}

                <ul className={`mt-8 space-y-4 text-sm ${isPro ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                  {featureList.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${isPro ? "text-brand-500" : tier.is_enterprise ? "text-gray-400" : "text-emerald-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.section>
      )}

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mx-auto max-w-3xl w-full px-4"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <HelpCircle className="h-5 w-5 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900">{t("pricing_faq_title")}</h2>
        </div>

        <div className="grid gap-4">
          {([
            { q: t("pricing_faq_q1"), a: t("pricing_faq_a1") },
            { q: t("pricing_faq_q2"), a: t("pricing_faq_a2") },
            { q: t("pricing_faq_q3"), a: t("pricing_faq_a3") },
          ] as { q: string; a: string }[]).map((faq, i) => (
            <div key={i} className="card p-6">
              <h4 className="text-base font-bold text-gray-800">{faq.q}</h4>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

