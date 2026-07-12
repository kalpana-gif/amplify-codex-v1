"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, FileText, Scale, Wallet, X } from "lucide-react";
import { BRANDING } from "@/config/branding.mjs";
import { cn } from "@/lib/utils";

const items = [
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/split-wise", label: "Split-Wise", icon: Scale },
];

const mobileSidebarTransition = {
  type: "tween",
  duration: 0.14,
  ease: [0.32, 0.72, 0, 1],
} as const;

const sidebarSelectionContentTransition = {
  type: "spring",
  stiffness: 640,
  damping: 36,
  mass: 0.42,
} as const;

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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateDesktop = () => setIsDesktop(media.matches);

    updateDesktop();

    media.addEventListener("change", updateDesktop);

    return () => {
      media.removeEventListener("change", updateDesktop);
    };
  }, []);

  const isCompact = isDesktop && collapsed;
  const showLabels = !isCompact;

  return (
    <>
      <AnimatePresence initial={false}>
        {!isDesktop && open ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        animate={{
          x: isDesktop ? 0 : open ? 0 : -364,
        }}
        className={cn(
          "fixed bottom-3 left-4 top-3 z-50 flex w-[296px] flex-col bg-transparent md:sticky md:bottom-auto md:left-auto md:top-4 md:ml-4 md:h-[calc(100svh-2rem)] md:self-start md:overflow-visible",
          isCompact ? "md:w-24 md:px-2.5" : "md:w-[308px]",
        )}
        initial={false}
        transition={mobileSidebarTransition}
      >
        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-slate-700/45 bg-[linear-gradient(180deg,rgba(12,15,22,0.995),rgba(18,23,34,0.995)_24%,rgba(10,14,23,0.99)_56%,rgba(7,10,18,1))] p-4 shadow-[0_34px_64px_rgba(2,6,23,0.46),0_14px_28px_rgba(15,23,42,0.24),inset_1px_1px_0_rgba(255,255,255,0.03),inset_-1px_-1px_0_rgba(15,23,42,0.38)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:ring-1 before:ring-white/3",
            isCompact && "md:px-2.5",
          )}
        >
          <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
            <filter id="sidebar-advanced-texture">
              <feTurbulence
                baseFrequency="0.95"
                numOctaves="2"
                result="noise"
                type="fractalNoise"
              />
              <feSpecularLighting
                in="noise"
                lightingColor="#d9dee7"
                result="specular"
                specularConstant="0.45"
                specularExponent="12"
                surfaceScale="1.6"
              >
                <fePointLight x="34" y="26" z="82" />
              </feSpecularLighting>
              <feComposite
                in="specular"
                in2="SourceGraphic"
                operator="in"
                result="litNoise"
              />
              <feBlend in="SourceGraphic" in2="litNoise" mode="overlay" />
            </filter>
            <filter id="sidebar-unopaq" height="3000%" width="3000%" x="-1000%" y="-1000%">
              <feColorMatrix
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 3 0"
              />
            </filter>
          </svg>

          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012), rgba(0,0,0,0.18))",
              filter: "url(#sidebar-advanced-texture)",
            }}
          />
          <span className="pointer-events-none absolute inset-[1px] rounded-[2.3rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_24%,transparent_74%,rgba(255,255,255,0.012)_100%)]" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.022)_0%,transparent_16%,transparent_84%,rgba(255,255,255,0.01)_100%)]" />
          <span className="pointer-events-none absolute inset-y-6 left-0 w-8 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent)]" />
          <span className="pointer-events-none absolute inset-y-8 right-0 w-10 bg-[linear-gradient(270deg,rgba(2,6,23,0.22),transparent)]" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.024)_0%,transparent_70%)]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_72%,rgba(0,0,0,0.16)_100%)]" />

          <div
            className={cn(
              "relative z-10 flex items-center gap-3 rounded-[2rem] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(9,12,18,0.96),rgba(12,16,24,0.98))] p-3 shadow-[inset_2px_5px_14px_rgba(0,0,0,0.72),inset_-1px_-1px_0_rgba(255,255,255,0.025),0_18px_32px_rgba(2,6,23,0.2)]",
              isCompact &&
                "md:justify-center md:rounded-none md:border-transparent md:bg-transparent md:p-0 md:shadow-none",
            )}
          >
            <Link
              href="/events"
              className={cn(
                "relative grid min-w-0 flex-1 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3.5 overflow-hidden rounded-[1.9rem] border border-slate-200/70 bg-[rgb(228,232,237)] px-[1.15rem] py-[1.05rem] font-semibold text-slate-950 shadow-[rgba(50,50,93,0.22)_0px_30px_50px_-12px_inset,rgba(0,0,0,0.24)_0px_18px_26px_-18px_inset,0_10px_20px_rgba(15,23,42,0.08)] transition duration-300 hover:bg-[rgb(233,237,242)]",
                isCompact &&
                  "md:flex md:w-auto md:flex-none md:justify-center md:gap-0 md:px-0 md:py-0 md:bg-transparent md:shadow-none md:border-transparent",
              )}
              onClick={onClose}
              title={BRANDING.shortName}
            >
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_42%)]" />
              <span className="relative flex h-12 w-12 shrink-0 flex-none items-center justify-center rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(19,24,32,0.98),rgba(6,9,14,1))] text-white shadow-[0_10px_18px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Wallet className="h-5 w-5" />
              </span>
              {showLabels ? (
                <span className="relative flex min-w-0 flex-col justify-center overflow-hidden text-left">
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    {BRANDING.organizationName}
                  </span>
                  <span className="mt-0.5 block truncate text-[1.08rem] leading-none text-slate-950">
                    {BRANDING.navigationTitle}
                  </span>
                </span>
              ) : null}
            </Link>

            {!isDesktop ? (
              <button
                className="rounded-xl border border-white/10 bg-white/[0.08] p-2 text-slate-200 transition hover:border-white/18 hover:bg-white/[0.12] hover:text-white md:hidden"
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div
            className={cn(
              "relative z-10 mt-6 rounded-[2rem] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(9,12,18,0.96),rgba(12,16,24,0.98))] p-3 shadow-[inset_2px_5px_14px_rgba(0,0,0,0.72),inset_-1px_-1px_0_rgba(255,255,255,0.025),0_18px_32px_rgba(2,6,23,0.2)]",
              isCompact && "md:rounded-[1.7rem] md:bg-transparent md:border-transparent md:shadow-none md:p-0",
            )}
          >
            <nav className={cn("space-y-2.5", isCompact && "md:mt-0 md:space-y-3")}>
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-[1.35rem] px-3.5 py-3.5 text-sm font-medium backdrop-blur-sm transition-[border-color,color,box-shadow,background] duration-150",
                      isCompact && "md:justify-center md:gap-0 md:px-0",
                      active
                        ? "border border-slate-200/80 bg-[linear-gradient(180deg,rgba(239,239,240,0.98),rgba(229,229,231,0.96))] text-[#090909] shadow-[0_12px_22px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(203,213,225,0.52)] active:shadow-[0_8px_16px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.36),inset_0_-1px_0_rgba(203,213,225,0.44)]"
                        : "border border-white/[0.025] bg-[linear-gradient(180deg,rgba(13,17,25,0.92),rgba(9,12,19,0.96))] text-slate-300 shadow-[inset_2px_5px_12px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-white/[0.05] hover:text-white",
                    )}
                    onClick={onClose}
                    title={item.label}
                  >
                    <motion.span
                      animate={{
                        scale: active ? 0.965 : 1,
                        x: 0,
                      }}
                      className={cn(
                        "relative z-10 flex h-9 w-9 shrink-0 flex-none items-center justify-center rounded-[0.82rem] transition-colors duration-200",
                        active
                          ? "border border-slate-300/70 bg-[linear-gradient(180deg,rgba(221,223,227,0.98),rgba(211,214,219,0.97))] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(71,85,105,0.24),inset_4px_5px_9px_rgba(100,116,139,0.34),inset_-4px_-4px_8px_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(148,163,184,0.16)]"
                          : "border border-white/[0.04] bg-[linear-gradient(180deg,rgba(10,13,20,0.98),rgba(6,9,14,0.96))] text-slate-400 shadow-[inset_2px_5px_10px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.03)] group-hover:text-slate-100",
                      )}
                      transition={sidebarSelectionContentTransition}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-all duration-200",
                          active &&
                            "scale-[0.97] opacity-100 [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.14))_drop-shadow(0_-1px_0_rgba(30,41,59,0.52))]",
                        )}
                      />
                    </motion.span>

                    {showLabels ? (
                      <motion.span
                        animate={{
                          opacity: active ? 1 : 0.92,
                          x: 0,
                        }}
                        className={cn(
                          "relative z-10 truncate whitespace-nowrap transition-colors duration-150",
                          active ? "text-slate-950" : "text-slate-300",
                        )}
                        transition={sidebarSelectionContentTransition}
                      >
                        {item.label}
                      </motion.span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
