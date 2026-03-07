"use client";

import type { ReactNode } from "react";
import EventAdminNav, { EventAdminLayoutProvider } from "@/components/Admin/EventAdminNav";

type EventAdminLayoutShellProps = {
  eventId: string;
  children: ReactNode;
};

export function EventAdminLayoutShell({ eventId, children }: EventAdminLayoutShellProps) {
  return (
    <EventAdminLayoutProvider hideInlineNav>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <EventAdminNav eventId={eventId} variant="sidebar" />
        <div className="min-w-0">{children}</div>
      </div>
    </EventAdminLayoutProvider>
  );
}
