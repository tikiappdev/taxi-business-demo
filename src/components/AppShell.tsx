"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  FileUp,
  Fuel,
  LayoutDashboard,
  Settings
} from "lucide-react";
import { DemoBadge } from "@/components/Badge";

const navItems = [
  { href: "/card-import", label: "カード読込", icon: FileUp, badge: "最初に使う" },
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/daily-report", label: "日報", icon: ClipboardList },
  { href: "/payments", label: "決済集計", icon: Banknote },
  { href: "/expenses", label: "経費管理", icon: Fuel },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/csv-import", label: "CSV取込", icon: FileUp },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = navItems.find((item) => item.href === pathname)?.label ?? "ダッシュボード";

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-sm text-slate-300">個人タクシー向け</p>
          <h1 className="mt-1 text-xl font-bold tracking-normal">売上・経費管理デモ</h1>
          <div className="mt-3">
            <DemoBadge />
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950"
                    : item.badge
                      ? "border border-emerald-400/40 bg-emerald-400/10 text-white hover:bg-emerald-400/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.badge ? (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-emerald-300/20 text-emerald-100"}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">個人タクシー事業者向けフロントデモ</p>
              <h2 className="text-xl font-bold text-ink">{current}</h2>
            </div>
            <div className="flex items-center gap-3">
              <DemoBadge />
              <span className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm text-slate-700">
                DB・認証・保存なし
              </span>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm ${
                  item.href === pathname
                    ? "border-slate-900 bg-slate-900 text-white"
                    : item.badge
                      ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800"
                    : "border-line bg-white text-slate-700"
                }`}
              >
                {item.label}
                {item.badge ? <span className="ml-2 text-xs">最初</span> : null}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
