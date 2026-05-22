import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EventStatus } from "@/components/events/event-status";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventSummary } from "@/types";

export function EventCard({ event }: { event: EventSummary }) {
  const remaining = Math.max(event.totalBudget - event.totalActual, 0);

  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="relative h-full overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-panel-strong)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {event.eventType}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {event.name}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              {event.description || "Budget and delivery plan ready for execution."}
            </p>
          </div>
          <EventStatus status={event.status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <CalendarDays className="h-4 w-4" />
            {formatDate(event.date)}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <MapPin className="h-4 w-4" />
            {event.venue || "Venue pending"}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <WalletCards className="h-4 w-4" />
            Approved Budget {formatCurrency(event.totalBudget, event.currency)}
          </div>
        </div>

        <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="text-slate-300">Budget used</span>
            <span className="font-semibold text-white">{event.utilizationPercentage}%</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-white/10">
            <div
              className="h-2.5 rounded-full bg-[linear-gradient(90deg,var(--color-accent),#7bb4ea)]"
              style={{ width: `${Math.min(event.utilizationPercentage, 100)}%` }}
            />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Remaining
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrency(remaining, event.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200/80">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Planned
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {formatCurrency(event.totalPlanned, event.currency)}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200/80">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Actual
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {formatCurrency(event.totalActual, event.currency)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
