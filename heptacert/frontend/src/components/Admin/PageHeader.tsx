"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Breadcrumb = { label: string; href?: string };

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  iconBg?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
  iconBg = "bg-brand-50 text-brand-600",
}: PageHeaderProps) {
  return (
    <div className="mb-7">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-surface-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded-full border border-surface-200 bg-white px-2.5 py-1 font-medium transition-colors hover:border-surface-300 hover:text-surface-600"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-surface-700">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="relative overflow-hidden rounded-lg border border-surface-200 bg-white/95 p-5 shadow-soft backdrop-blur sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-emerald-500 to-sky-500 opacity-80" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {icon && (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-soft ${iconBg}`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="page-title truncate">{title}</h1>
              {subtitle && <p className="page-subtitle max-w-2xl">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
