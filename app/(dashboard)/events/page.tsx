"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  List,
  PencilLine,
  PlayCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/events/event-card";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  EventsPageContentLoader,
  PageHeaderSkeleton,
} from "@/components/ui/page-loader";
import { listEventsForCurrentUser } from "@/lib/graphql/events";
import type { EventStatus, EventSummary } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventStatus>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);

    try {
      const data = await listEventsForCurrentUser();
      setEvents(data);
    } catch (error) {
      setEvents([]);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load events.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void loadEvents();
    };

    void loadEvents();
    const retryTimer = window.setTimeout(() => {
      void loadEvents();
    }, 1200);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadEvents]);

  const filtered = useMemo(
    () =>
      events.filter((event) =>
        statusFilter === "ALL" ? true : event.status === statusFilter,
      ),
    [events, statusFilter],
  );

  const portfolio = useMemo(() => {
    const activeCount = events.filter((event) => event.status === "ACTIVE").length;
    const budgetedCount = events.filter((event) => event.totalBudget > 0).length;
    const attentionCount = events.filter(
      (event) => event.utilizationPercentage >= 80,
    ).length;

    return {
      totalEvents: events.length,
      activeCount,
      draftCount: events.filter((event) => event.status === "DRAFT").length,
      completedCount: events.filter((event) => event.status === "COMPLETED").length,
      budgetedCount,
      attentionCount,
    };
  }, [events]);

  const statusOptions = [
    {
      value: "ALL" as const,
      label: "All",
      icon: List,
      count: portfolio.totalEvents,
    },
    {
      value: "ACTIVE" as const,
      label: "Active",
      icon: PlayCircle,
      count: portfolio.activeCount,
    },
    {
      value: "DRAFT" as const,
      label: "Draft",
      icon: PencilLine,
      count: portfolio.draftCount,
    },
    {
      value: "COMPLETED" as const,
      label: "Completed",
      icon: CheckCircle2,
      count: portfolio.completedCount,
    },
  ];

  return (
    <PageWrapper
      title="Events"
      description="Track budgets, spend, and status across all events."
      headerContent={isLoading ? <PageHeaderSkeleton /> : undefined}
      actions={
        <Link href="/events/new" className="inline-flex overflow-visible md:-translate-y-4">
          <Button className="relative h-[3.35rem] min-w-[15.9rem] justify-center overflow-visible rounded-full border border-[rgba(30,58,95,0.14)] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] px-6 shadow-[0_18px_38px_rgba(30,58,95,0.2)]">
            <span className="flex w-full items-center justify-center pr-10 text-[15px] font-semibold tracking-[0.01em] text-white">
              Create New Event
            </span>
            <span className="pointer-events-none absolute right-1.5 top-1/2 flex h-[2.9rem] w-[2.9rem] -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(226,232,240,0.94))] shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <span className="flex h-[2.3rem] w-[2.3rem] items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(135deg,var(--color-accent),var(--color-primary))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                <Plus className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.2} />
              </span>
            </span>
          </Button>
        </Link>
      }
    >
      {loadError ? (
        <Card className="border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">
                Events could not be loaded
              </p>
              <p className="mt-1 text-sm text-red-600">{loadError}</p>
            </div>
            <Button variant="secondary" onClick={() => void loadEvents()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <EventsPageContentLoader />
      ) : null}

      {!isLoading ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-6">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ["Total Events", String(portfolio.totalEvents)],
                  ["Active Events", String(portfolio.activeCount)],
                  ["Draft Events", String(portfolio.draftCount)],
                  ["Completed Events", String(portfolio.completedCount)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.5rem] bg-slate-950/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Budgeted Events
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {portfolio.budgetedCount}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-950/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Needs Attention
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {portfolio.attentionCount}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid w-full gap-1 rounded-[1.6rem] border border-slate-200/70 bg-slate-100/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:inline-grid sm:w-auto sm:min-w-[38rem] sm:grid-cols-4">
            {statusOptions.map(({ value, label, icon: Icon, count }) => (
              <button
                key={value}
                className={`inline-flex min-h-[3.35rem] items-center justify-center gap-2.5 rounded-[1.2rem] px-3.5 py-2.5 text-sm font-semibold transition ${
                  statusFilter === value
                    ? "border border-slate-200/80 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                    : "border border-transparent bg-transparent text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => setStatusFilter(value)}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{label}</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    statusFilter === value
                      ? "bg-slate-950/[0.06] text-slate-700"
                      : "bg-white/70 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {filtered.length ? (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No events match this view"
              description="Create a new event or switch filters to explore active, draft, or completed operations."
              action={
                <Link href="/events/new" className="inline-flex">
                  <Button className="gap-2.5">
                    <Plus className="h-4 w-4" />
                    <span>Create New Event</span>
                  </Button>
                </Link>
              }
            />
          )}
        </>
      ) : null}
    </PageWrapper>
  );
}
