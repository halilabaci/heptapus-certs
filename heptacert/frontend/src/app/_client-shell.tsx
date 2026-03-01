"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { I18nProvider, LanguageToggle, useT, useI18n } from "@/lib/i18n";

function HtmlLangSync() {
  const { lang } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const links = [
    { href: "/#features", label: t("nav_features") },
    { href: "/pricing", label: t("nav_pricing") },
    { href: "/verify", label: t("nav_verify") },
  ];
  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-[3px] z-40 mb-8 mt-4"
    >
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white/90 px-5 py-3 shadow-soft backdrop-blur-md">
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo.png"
            alt="HeptaCert"
            width={180}
            height={48}
            unoptimized
            priority
            className="h-11 w-auto group-hover:opacity-80 transition-opacity"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <LanguageToggle />
          <Link href="/admin/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">{t("nav_login")}</Link>
          <Link href="/register" className="btn-primary text-xs px-4 py-2">{t("nav_start_free")}</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lifted md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">{l.label}</Link>
            ))}
            <hr className="my-2 border-gray-100" />
            <div className="px-3 py-2"><LanguageToggle /></div>
            <Link href="/admin/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">{t("nav_login")}</Link>
            <Link href="/register" onClick={() => setOpen(false)} className="btn-primary w-full mt-1 text-center">{t("nav_start_free")}</Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <I18nProvider>
      <HtmlLangSync />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-screen flex flex-col">
        {!isAdmin && <Navbar />}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-grow w-full"
        >
          {children}
        </motion.main>
      </div>
    </I18nProvider>
  );
}
