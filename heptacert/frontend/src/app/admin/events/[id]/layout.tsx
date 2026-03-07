import type { ReactNode } from "react";
import { EventAdminLayoutShell } from "./_event-admin-layout-shell";

type EventLayoutProps = {
  children: ReactNode;
  params: { id: string };
};

export default function EventLayout({ children, params }: EventLayoutProps) {
  return <EventAdminLayoutShell eventId={params.id}>{children}</EventAdminLayoutShell>;
}
