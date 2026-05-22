import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { EventForm } from "@/components/events/event-form";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function NewEventPage() {
  return (
    <section className="space-y-6">
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
                <Link href="/events" className="transition hover:text-slate-950">
                  Events
                </Link>
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="rounded-full bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-3 py-1.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(30,58,95,0.18)]">
                  Create Event
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageWrapper
        title="Create Event"
        description="Set the event details, initialize the budget, and invite your team."
      >
        <EventForm />
      </PageWrapper>
    </section>
  );
}
