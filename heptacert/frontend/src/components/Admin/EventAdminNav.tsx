import Link from "next/link";
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
  active: EventAdminTab;
  eventName?: string;
  className?: string;
};

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

export default function EventAdminNav({ eventId, active, eventName, className }: EventAdminNavProps) {
  return (
    <div className={className || "mb-6 flex flex-col gap-2"}>
      <Link href="/admin/events" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors w-fit">
        <ChevronLeft className="w-3.5 h-3.5" /> Tüm Etkinlikler
      </Link>
      <div>
        <p className="text-xs text-gray-500 mb-2">{eventName || `Etkinlik ${eventId}`}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <Link href={`/admin/events/${eventId}/certificates`} className={tabClass(active === "certificates", "emerald")}>
            <LockKeyhole className="w-3.5 h-3.5" /> Sertifikalar
          </Link>
          <Link href={`/admin/events/${eventId}/sessions`} className={tabClass(active === "sessions", "indigo")}>
            <QrCode className="w-3.5 h-3.5" /> Oturumlar
          </Link>
          <Link href={`/admin/events/${eventId}/attendees`} className={tabClass(active === "attendees", "violet")}>
            <Users className="w-3.5 h-3.5" /> Katılımcılar
          </Link>
          <Link href={`/admin/events/${eventId}/checkin`} className={tabClass(active === "checkin", "amber")}>
            <UserCheck className="w-3.5 h-3.5" /> Check-in
          </Link>
          <Link href={`/admin/events/${eventId}/gamification`} className={tabClass(active === "gamification", "fuchsia")}>
            <Target className="w-3.5 h-3.5" /> Gamification
          </Link>
          <Link href={`/admin/events/${eventId}/surveys`} className={tabClass(active === "surveys", "cyan")}>
            <UserCheck className="w-3.5 h-3.5" /> Anket
          </Link>
          <Link href={`/admin/events/${eventId}/advanced-analytics`} className={tabClass(active === "analytics", "slate")}>
            <BarChart3 className="w-3.5 h-3.5" /> İleri Analitik
          </Link>
          <Link href={`/admin/events/${eventId}/editor`} className={tabClass(active === "editor", "gray")}>
            <Palette className="w-3.5 h-3.5" /> Editör
          </Link>
          <Link href={`/admin/events/${eventId}/email-templates`} className={tabClass(active === "email", "gray")}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Link>
          <Link href={`/admin/events/${eventId}/settings`} className={tabClass(active === "settings", "gray")}>
            <Settings className="w-3.5 h-3.5" /> Ayarlar
          </Link>
        </div>
      </div>
    </div>
  );
}
