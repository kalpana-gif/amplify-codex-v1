"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState, startTransition } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { client } from "@/lib/amplify-client";
import { cn } from "@/lib/utils";

const buildTabs = (eventId: string) => [
  { href: `/events/${eventId}`, label: "Overview" },
  { href: `/events/${eventId}/dashboard`, label: "Dashboard" },
  { href: `/events/${eventId}/budget`, label: "Budget" },
  { href: `/events/${eventId}/expenses`, label: "Expenses" },
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
      void client.models.Event.get(
        { id: params.id },
        {
          authMode: "userPool",
          selectionSet: ["name", "status"],
        },
      ).then((result) => {
        if (!isActive) {
          return;
        }

        if (!result.data || result.data.status === "ARCHIVED") {
          router.replace("/events");
          return;
        }

        setEventName(result.data?.name ?? "Event Workspace");
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

        <nav className="flex flex-wrap gap-2" aria-label="Event workspace sections">
          {tabs.map((tab) => {
            const active =
              tab.href === `/events/${params.id}`
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-full px-4 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[linear-gradient(135deg,var(--color-primary),#16314f)] !text-white shadow-[0_14px_28px_rgba(30,58,95,0.18)] hover:!text-white focus-visible:!text-white [&_*]:!text-white"
                    : "border border-slate-200 bg-white/88 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
