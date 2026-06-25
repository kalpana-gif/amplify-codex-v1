"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState, startTransition } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getEventAccessContext } from "@/lib/graphql/events";
import { cn } from "@/lib/utils";

const buildTabs = (eventId: string) => [
  { href: `/events/${eventId}`, label: "Overview" },
  { href: `/events/${eventId}/dashboard`, label: "Dashboard" },
  { href: `/events/${eventId}/budget`, label: "Budget" },
  { href: `/events/${eventId}/expenses`, label: "Expenses" },
  { href: `/events/${eventId}/tasks`, label: "To-do List" },
  { href: `/events/${eventId}/users`, label: "Team" },
];

export function EventNavigation() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [eventName, setEventName] = useState("Event Workspace");

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      void getEventAccessContext(params.id).then((context) => {
        if (!isActive) {
          return;
        }

        setEventName(context.event.name || "Event Workspace");
      }).catch(() => {
        if (isActive) {
          router.replace("/events");
        }
      });
    });

    return () => {
      isActive = false;
    };
  }, [params.id, router]);

  const tabs = buildTabs(params.id);

  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white/78 p-4 shadow-[var(--shadow-panel)] backdrop-blur-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Link>

            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
              <Link
                href="/events"
                className="transition hover:text-slate-950"
              >
                Events
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0" />
              <span className="truncate rounded-full bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-3 py-1.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(30,58,95,0.18)]">
                {eventName}
              </span>
            </div>
          </div>
        </div>

        <LayoutGroup id="event-workspace-nav">
          <motion.nav
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="Event workspace sections"
            className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex min-w-max items-center gap-1 rounded-[1.35rem] border border-slate-200 bg-slate-50/95 p-1">
              {tabs.map((tab, index) => {
                const active =
                  tab.href === `/events/${params.id}`
                    ? pathname === tab.href
                    : pathname.startsWith(tab.href);

                return (
                  <motion.div
                    key={tab.href}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                    initial={{ opacity: 0, y: 8 }}
                    transition={{
                      duration: 0.28,
                      delay: index * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {active ? (
                      <motion.span
                        className="absolute inset-0 rounded-[1rem] bg-[#1e3a5f]"
                        layoutId="event-nav-slider"
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 32,
                          mass: 0.85,
                        }}
                      />
                    ) : null}

                    <Link
                      href={tab.href}
                      className={cn(
                        "group relative z-10 inline-flex min-w-[5.9rem] items-center justify-center rounded-[1rem] px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition duration-250",
                        active
                          ? "!text-white hover:!text-white focus-visible:!text-white"
                          : "text-slate-700 hover:text-[var(--color-primary)]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute inset-0 rounded-[1rem] transition duration-200",
                          active
                            ? "bg-transparent"
                            : "bg-transparent group-hover:bg-white",
                        )}
                      />
                      <span
                        className={cn(
                          "relative whitespace-nowrap transition duration-200",
                          active
                            ? "!text-white"
                            : "group-hover:text-[var(--color-primary)]",
                        )}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.nav>
        </LayoutGroup>
      </div>
    </section>
  );
}
