"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Gauge,
  KeyRound,
  Mail,
  Settings,
  Shield,
  Webhook,
} from "lucide-react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  exact?: boolean;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/events", label: "Etkinlikler", icon: CalendarCheck2 },
  { href: "/admin/settings", label: "Genel Ayarlar", icon: Settings },
  { href: "/admin/email-dashboard", label: "Email Dashboard", icon: Mail },
  { href: "/admin/email-analytics", label: "Email Analitik", icon: ChartNoAxesCombined },
  { href: "/admin/payments/transactions", label: "Ödemeler", icon: CreditCard },
  { href: "/admin/webhooks/logs", label: "Webhook Logları", icon: Webhook },
  { href: "/admin/api-keys", label: "API Key", icon: KeyRound },
  { href: "/admin/superadmin", label: "Super Admin", icon: Shield },
];

const AUTH_PATH_PREFIXES = ["/admin/login", "/admin/magic-verify", "/admin/auth"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";

  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Menü</p>
          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
