"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, FileText, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar({
  open,
  collapsed,
  onClose,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 transition md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[18.5rem] flex-col bg-[linear-gradient(180deg,rgba(242,247,252,0.99),rgba(236,242,248,0.99))] px-4 py-4 shadow-[18px_0_40px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out md:sticky md:inset-y-auto md:top-0 md:h-screen md:self-start md:translate-x-0 md:overflow-y-auto md:shadow-none",
          collapsed ? "md:w-24 md:px-2.5" : "md:w-[18.5rem]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[2.15rem] border border-slate-200/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.998),rgba(249,251,253,0.99))] p-4 shadow-[14px_14px_30px_rgba(226,232,240,0.62),-12px_-12px_28px_rgba(255,255,255,0.94),0_18px_34px_rgba(15,23,42,0.05)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:ring-1 before:ring-white/72",
            collapsed && "md:px-2.5",
          )}
        >
          <span className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.96),rgba(255,255,255,0.48)_56%,transparent_76%)]" />
          <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.14),rgba(46,117,182,0.06)_58%,transparent_100%)]" />
          <span className="pointer-events-none absolute left-1/2 top-0 h-16 w-32 -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.76),transparent_72%)]" />
          <span className="pointer-events-none absolute -left-8 bottom-14 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_center,rgba(30,58,95,0.04),transparent_72%)]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(248,250,252,0.35)_62%,rgba(248,250,252,0.62)_100%)]" />
          <span className="pointer-events-none absolute left-1/2 bottom-0 h-24 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.72),transparent_72%)]" />

          <div
            className={cn(
              "relative z-10 flex items-center justify-between gap-3",
              collapsed && "md:justify-center",
            )}
          >
            <Link
              href="/events"
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] px-3.5 py-3.5 font-semibold text-slate-950 shadow-[8px_8px_18px_rgba(226,232,240,0.58),-8px_-8px_18px_rgba(255,255,255,0.96)] transition duration-300 hover:shadow-[10px_10px_22px_rgba(226,232,240,0.66),-10px_-10px_22px_rgba(255,255,255,1)]",
                collapsed && "md:justify-center md:px-0 md:bg-transparent md:shadow-none",
              )}
              onClick={onClose}
              title="EMBS"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)]">
                <Wallet className="h-5 w-5" />
              </span>
              <span className={cn("min-w-0", collapsed && "md:hidden")}>
                <span className="block text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  EMBS
                </span>
                <span className="block text-[1.02rem] leading-tight text-slate-950">
                  Budget Command Center
                </span>
              </span>
            </Link>
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className={cn(
              "relative z-10 mt-5 rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(246,249,253,0.96))] p-3 shadow-[inset_8px_8px_16px_rgba(226,232,240,0.72),inset_-8px_-8px_16px_rgba(255,255,255,0.98),0_8px_20px_rgba(15,23,42,0.03)]",
              collapsed && "md:bg-transparent md:shadow-none md:p-0",
            )}
          >
            <nav className={cn("space-y-1.5", collapsed && "md:mt-0")}>
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-[1.2rem] px-3 py-3 text-sm font-medium transition-all duration-300 ease-out",
                      collapsed && "md:justify-center md:px-0",
                      active
                        ? "text-white shadow-[0_16px_34px_rgba(22,49,79,0.24)]"
                        : "bg-white/94 text-slate-600 shadow-[3px_3px_8px_rgba(226,232,240,0.34),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:text-slate-950 hover:shadow-[4px_4px_10px_rgba(226,232,240,0.42),-3px_-3px_8px_rgba(255,255,255,0.8)]",
                    )}
                    onClick={onClose}
                    title={item.label}
                  >
                    {active ? (
                      <>
                        <span className="absolute inset-0 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,#16314f,#1e3a5f)]" />
                        <span className="absolute -right-5 top-1/2 h-14 w-14 -translate-y-1/2 rounded-full bg-white/10 blur-sm" />
                      </>
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] transition-colors duration-300",
                        active
                          ? "bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "bg-white text-slate-500 shadow-[inset_1px_1px_0_rgba(255,255,255,0.72)] group-hover:text-slate-900",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        "relative z-10 truncate transition-colors duration-300",
                        active && "text-white",
                        collapsed && "md:hidden",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
