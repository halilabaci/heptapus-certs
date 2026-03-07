"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, LockKeyhole, QrCode, Users, UserCheck, Target, BarChart3, Mail, Settings, Palette } from "lucide-react";

type EventAdminTab =
  | "certificates"
  | "sessions"
  | "attendees"
  | "checkin"
  | "gamification"
  | "surveys"
  | "analytics"
  | "editor"
  | "email"
  | "settings";

type EventAdminNavProps = {
  eventId: string | number;
  active?: EventAdminTab;
  eventName?: string;
  className?: string;
  variant?: "inline" | "sidebar";
};

const EventAdminLayoutContext = createContext<{ hideInlineNav: boolean }>({ hideInlineNav: false });

export function EventAdminLayoutProvider({ hideInlineNav, children }: { hideInlineNav: boolean; children: ReactNode }) {
  return <EventAdminLayoutContext.Provider value={{ hideInlineNav }}>{children}</EventAdminLayoutContext.Provider>;
}

function getActiveFromPath(pathname: string): EventAdminTab {
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/attendees")) return "attendees";
  if (pathname.includes("/checkin")) return "checkin";
  if (pathname.includes("/gamification")) return "gamification";
  if (pathname.includes("/surveys")) return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (pathname.includes("/email-templates") || pathname.includes("/bulk-emails") || pathname.includes("/schedule-email")) return "email";
  if (pathname.includes("/settings")) return "settings";
  return "certificates";
}

function tabClass(active: boolean, tone: "emerald" | "indigo" | "violet" | "amber" | "fuchsia" | "cyan" | "slate" | "gray") {
  if (active) {
    const activeMap: Record<typeof tone, string> = {
      emerald: "border-emerald-300 bg-emerald-600 text-white",
      indigo: "border-indigo-300 bg-indigo-600 text-white",
      violet: "border-violet-300 bg-violet-600 text-white",
      amber: "border-amber-300 bg-amber-600 text-white",
      fuchsia: "border-fuchsia-300 bg-fuchsia-600 text-white",
      cyan: "border-cyan-300 bg-cyan-600 text-white",
      slate: "border-slate-300 bg-slate-600 text-white",
      gray: "border-brand-300 bg-brand-600 text-white",
    };
    return `flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold shadow-sm ${activeMap[tone]}`;
  }

  const idleMap: Record<typeof tone, string> = {
    emerald: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    indigo: "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50",
    violet: "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
    amber: "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
    fuchsia: "border-fuchsia-200 bg-white text-fuchsia-700 hover:bg-fuchsia-50",
    cyan: "border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50",
    slate: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    gray: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  };
  return `flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors ${idleMap[tone]}`;
}

export default function EventAdminNav({ eventId, active, eventName, className, variant = "inline" }: EventAdminNavProps) {
  const pathname = usePathname() || "";
  const { hideInlineNav } = useContext(EventAdminLayoutContext);
  const resolvedActive = active ?? getActiveFromPath(pathname);

  if (hideInlineNav && variant === "inline") {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <aside className={className || "h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-6"}>
        <Link href="/admin/events" className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 transition-colors w-fit">
          <ChevronLeft className="w-3.5 h-3.5" /> Tüm Etkinlikler
        </Link>
        <p className="mb-3 px-1 text-sm font-semibold text-gray-800">{eventName || `Etkinlik ${eventId}`}</p>
        <div className="space-y-1">
          <Link href={`/admin/events/${eventId}/certificates`} className={`${tabClass(resolvedActive === "certificates", "emerald")} w-full justify-start`}>
            <LockKeyhole className="w-3.5 h-3.5" /> Sertifikalar
          </Link>
          <Link href={`/admin/events/${eventId}/sessions`} className={`${tabClass(resolvedActive === "sessions", "indigo")} w-full justify-start`}>
            <QrCode className="w-3.5 h-3.5" /> Oturumlar
          </Link>
          <Link href={`/admin/events/${eventId}/attendees`} className={`${tabClass(resolvedActive === "attendees", "violet")} w-full justify-start`}>
            <Users className="w-3.5 h-3.5" /> Katılımcılar
          </Link>
          <Link href={`/admin/events/${eventId}/checkin`} className={`${tabClass(resolvedActive === "checkin", "amber")} w-full justify-start`}>
            <UserCheck className="w-3.5 h-3.5" /> Check-in
          </Link>
          <Link href={`/admin/events/${eventId}/gamification`} className={`${tabClass(resolvedActive === "gamification", "fuchsia")} w-full justify-start`}>
            <Target className="w-3.5 h-3.5" /> Gamification
          </Link>
          <Link href={`/admin/events/${eventId}/surveys`} className={`${tabClass(resolvedActive === "surveys", "cyan")} w-full justify-start`}>
            <UserCheck className="w-3.5 h-3.5" /> Anket
          </Link>
          <Link href={`/admin/events/${eventId}/advanced-analytics`} className={`${tabClass(resolvedActive === "analytics", "slate")} w-full justify-start`}>
            <BarChart3 className="w-3.5 h-3.5" /> İleri Analitik
          </Link>
          <Link href={`/admin/events/${eventId}/editor`} className={`${tabClass(resolvedActive === "editor", "gray")} w-full justify-start`}>
            <Palette className="w-3.5 h-3.5" /> Editör
          </Link>
          <Link href={`/admin/events/${eventId}/email-templates`} className={`${tabClass(resolvedActive === "email", "gray")} w-full justify-start`}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Link>
          <Link href={`/admin/events/${eventId}/settings`} className={`${tabClass(resolvedActive === "settings", "gray")} w-full justify-start`}>
            <Settings className="w-3.5 h-3.5" /> Ayarlar
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <div className={className || "mb-6 flex flex-col gap-2"}>
      <Link href="/admin/events" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors w-fit">
        <ChevronLeft className="w-3.5 h-3.5" /> Tüm Etkinlikler
      </Link>
      <div>
        <p className="text-xs text-gray-500 mb-2">{eventName || `Etkinlik ${eventId}`}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <Link href={`/admin/events/${eventId}/certificates`} className={tabClass(resolvedActive === "certificates", "emerald")}>
            <LockKeyhole className="w-3.5 h-3.5" /> Sertifikalar
          </Link>
          <Link href={`/admin/events/${eventId}/sessions`} className={tabClass(resolvedActive === "sessions", "indigo")}>
            <QrCode className="w-3.5 h-3.5" /> Oturumlar
          </Link>
          <Link href={`/admin/events/${eventId}/attendees`} className={tabClass(resolvedActive === "attendees", "violet")}>
            <Users className="w-3.5 h-3.5" /> Katılımcılar
          </Link>
          <Link href={`/admin/events/${eventId}/checkin`} className={tabClass(resolvedActive === "checkin", "amber")}>
            <UserCheck className="w-3.5 h-3.5" /> Check-in
          </Link>
          <Link href={`/admin/events/${eventId}/gamification`} className={tabClass(resolvedActive === "gamification", "fuchsia")}>
            <Target className="w-3.5 h-3.5" /> Gamification
          </Link>
          <Link href={`/admin/events/${eventId}/surveys`} className={tabClass(resolvedActive === "surveys", "cyan")}>
            <UserCheck className="w-3.5 h-3.5" /> Anket
          </Link>
          <Link href={`/admin/events/${eventId}/advanced-analytics`} className={tabClass(resolvedActive === "analytics", "slate")}>
            <BarChart3 className="w-3.5 h-3.5" /> İleri Analitik
          </Link>
          <Link href={`/admin/events/${eventId}/editor`} className={tabClass(resolvedActive === "editor", "gray")}>
            <Palette className="w-3.5 h-3.5" /> Editör
          </Link>
          <Link href={`/admin/events/${eventId}/email-templates`} className={tabClass(resolvedActive === "email", "gray")}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Link>
          <Link href={`/admin/events/${eventId}/settings`} className={tabClass(resolvedActive === "settings", "gray")}>
            <Settings className="w-3.5 h-3.5" /> Ayarlar
          </Link>
        </div>
      </div>
    </div>
  );
}
