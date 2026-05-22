"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  UserCog,
  WalletCards,
  ArchiveX,
  RotateCcw,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EventStatus } from "@/components/events/event-status";
import { Modal } from "@/components/ui/modal";
import { client } from "@/lib/amplify-client";
import { getBudgetOverview } from "@/lib/graphql/budget";
import {
  getCurrentUserProfile,
  getEventPermissions,
  softDeleteEvent,
  updateEventWorkflowStatus,
} from "@/lib/graphql/events";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventPermissions, EventStatus as EventStatusValue } from "@/types";

type EventDetails = {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  venue?: string | null;
  eventType: "WEDDING" | "CORPORATE" | "BIRTHDAY" | "CONFERENCE" | "OTHER";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  owner: string;
  admins?: string[] | null;
  editors?: string[] | null;
  viewers?: string[] | null;
};

export default function EventOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [budget, setBudget] = useState<{
    totalAmount: number;
    totalPlanned: number;
    totalActual: number;
    variance: number;
      currency: string;
  } | null>(null);
  const [permissions, setPermissions] = useState<EventPermissions>({
    isOwner: false,
    isAdmin: false,
    isEditor: false,
    isViewer: false,
    canEditBudget: false,
    canEditExpenses: false,
    canManageRoles: false,
    canManageEventLifecycle: false,
    canDeleteEvent: false,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<
    EventStatusValue | "DELETE" | null
  >(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      client.models.Event.get(
        { id: params.id },
        {
          authMode: "userPool",
          selectionSet: [
            "id",
            "name",
            "description",
            "date",
            "venue",
            "eventType",
            "status",
            "owner",
            "admins",
            "editors",
            "viewers",
          ],
        },
      ),
      getCurrentUserProfile(),
      getBudgetOverview(params.id),
    ])
      .then(([result, profile, overview]) => {
        if (!active) {
          return;
        }

        if (!result.data || result.data.status === "ARCHIVED") {
          router.replace("/events");
          return;
        }

        setEvent(result.data);

        if (profile) {
          setPermissions(getEventPermissions(profile.email, result.data));
        }

        setBudget(
          overview
            ? {
                totalAmount: overview.totalAmount,
                totalPlanned: overview.totalPlanned,
                totalActual: overview.totalActual,
                variance: overview.variance,
                currency: overview.currency,
              }
            : null,
        );
      })
      .catch(() => {
        if (active) {
          router.replace("/events");
        }
      });

    return () => {
      active = false;
    };
  }, [params.id, router]);

  if (!event) {
    return null;
  }

  const handleStatusChange = async (
    nextStatus: Exclude<EventStatusValue, "ARCHIVED">,
  ) => {
    setActionBusy(nextStatus);

    try {
      await updateEventWorkflowStatus(params.id, nextStatus);
      setEvent((current) =>
        current
          ? {
              ...current,
              status: nextStatus,
            }
          : current,
      );
      toast.success(`Event moved to ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update event status.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const teamCount =
    1 +
    (event.admins?.length ?? 0) +
    (event.editors?.length ?? 0) +
    (event.viewers?.length ?? 0);
  const summaryMetrics = [
    ["Approved Budget", formatCurrency(budget?.totalAmount ?? 0, budget?.currency)],
    ["Planned", formatCurrency(budget?.totalPlanned ?? 0, budget?.currency)],
    ["Actual", formatCurrency(budget?.totalActual ?? 0, budget?.currency)],
    ["Variance", formatCurrency(budget?.variance ?? 0, budget?.currency)],
  ];
  const leftOverviewFacts = [
    ["Budget Access", permissions.canEditBudget ? "Edit" : "View"],
    ["Type", event.eventType],
    ["Team Size", `${teamCount} user${teamCount === 1 ? "" : "s"}`],
  ];

  return (
    <PageWrapper
      compact
      title={event.name}
      description={
        event.description ??
        "Overview of budget, spend, and event activity."
      }
      actions={<EventStatus status={event.status} />}
    >
      <Card className="overflow-hidden p-3.5 md:p-4">
        <div className="grid items-stretch gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(540px,0.98fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-2.5">
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(event.date)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue || "Venue pending"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <WalletCards className="h-3.5 w-3.5" />
                  Ceiling {formatCurrency(budget?.totalAmount ?? 0, budget?.currency)}
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
              {summaryMetrics.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1rem] border border-slate-200/70 bg-slate-950/[0.03] px-3 py-2.5"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-[clamp(1rem,1vw,1.28rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {leftOverviewFacts.map(([label, text]) => (
                <div
                  key={label}
                  className="inline-flex items-baseline gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </p>
                  <p className="text-sm font-medium leading-none text-slate-700">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex 2xl:border-l 2xl:border-slate-200/70 2xl:pl-3.5">
            <div className="flex h-full w-full flex-col justify-between rounded-[1.15rem] border border-slate-200/80 bg-slate-950/[0.03] p-3">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Event Controls
                    </p>
                    <h2 className="mt-1.5 text-base font-semibold text-slate-950">
                      Lifecycle and deletion
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Move the event between workflow stages or soft delete it from one place.
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      permissions.canManageEventLifecycle
                        ? "border border-[rgba(46,117,182,0.18)] bg-[rgba(46,117,182,0.08)] text-[var(--color-primary)]"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {permissions.canManageEventLifecycle ? "Admin only" : "Locked"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 2xl:flex-nowrap">
                <Button
                  className="h-8 shrink-0 px-2 text-[12px]"
                  disabled={!permissions.canManageEventLifecycle || actionBusy !== null || event.status === "DRAFT"}
                  size="sm"
                  variant={event.status === "DRAFT" ? "primary" : "secondary"}
                  onClick={() => void handleStatusChange("DRAFT")}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Move to Draft
                </Button>
                <Button
                  className="h-8 shrink-0 px-2 text-[12px]"
                  disabled={!permissions.canManageEventLifecycle || actionBusy !== null || event.status === "ACTIVE"}
                  size="sm"
                  variant={event.status === "ACTIVE" ? "primary" : "secondary"}
                  onClick={() => void handleStatusChange("ACTIVE")}
                >
                  <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                  Mark Active
                </Button>
                <Button
                  className="h-8 shrink-0 px-2 text-[12px]"
                  disabled={!permissions.canManageEventLifecycle || actionBusy !== null || event.status === "COMPLETED"}
                  size="sm"
                  variant={event.status === "COMPLETED" ? "primary" : "secondary"}
                  onClick={() => void handleStatusChange("COMPLETED")}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Mark Completed
                </Button>
                <Button
                  className="h-8 shrink-0 px-2 text-[12px]"
                  disabled={!permissions.canDeleteEvent || actionBusy !== null}
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteOpen(true)}
                >
                  <ArchiveX className="mr-1.5 h-3.5 w-3.5" />
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={`/events/${event.id}/budget`} className="group block h-full">
          <Card className="relative flex h-full flex-col overflow-hidden p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,58,95,0.16)]">
            <span className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.18),rgba(46,117,182,0.1)_55%,rgba(46,117,182,0.04)_100%)] transition-transform duration-500 ease-out group-hover:scale-[6.5] group-hover:!bg-[#16314f]" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-950/[0.05] text-slate-600 transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                <WalletCards className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/12 group-hover:text-white">
                Planning
              </span>
            </div>
            <h2 className="relative z-10 mt-4 text-lg font-semibold text-slate-950 transition-colors duration-300 group-hover:text-white">
              Budget Planner
            </h2>
            <p className="relative z-10 mt-1.5 text-sm leading-6 text-slate-600 transition-colors duration-300 group-hover:text-white/88">
              Categories, lines, planned, actual.
            </p>
            <span className="relative z-10 mt-auto inline-flex self-end pt-5">
              <span className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)] transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                Open Budget
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </span>
          </Card>
        </Link>

        <Link href={`/events/${event.id}/expenses`} className="group block h-full">
          <Card className="relative flex h-full flex-col overflow-hidden p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,58,95,0.16)]">
            <span className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.18),rgba(46,117,182,0.1)_55%,rgba(46,117,182,0.04)_100%)] transition-transform duration-500 ease-out group-hover:scale-[6.5] group-hover:!bg-[#16314f]" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-950/[0.05] text-slate-600 transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                <BadgeDollarSign className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/12 group-hover:text-white">
                Execution
              </span>
            </div>
            <h2 className="relative z-10 mt-4 text-lg font-semibold text-slate-950 transition-colors duration-300 group-hover:text-white">
              Expense Tracker
            </h2>
            <p className="relative z-10 mt-1.5 text-sm leading-6 text-slate-600 transition-colors duration-300 group-hover:text-white/88">
              Vendors, receipts, payments, running total.
            </p>
            <span className="relative z-10 mt-auto inline-flex self-end pt-5">
              <span className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)] transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                Track Expenses
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </span>
          </Card>
        </Link>

        <Link href={`/events/${event.id}/dashboard`} className="group block h-full">
          <Card className="relative flex h-full flex-col overflow-hidden p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,58,95,0.16)]">
            <span className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.18),rgba(46,117,182,0.1)_55%,rgba(46,117,182,0.04)_100%)] transition-transform duration-500 ease-out group-hover:scale-[6.5] group-hover:!bg-[#16314f]" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-950/[0.05] text-slate-600 transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/12 group-hover:text-white">
                Insights
              </span>
            </div>
            <h2 className="relative z-10 mt-4 text-lg font-semibold text-slate-950 transition-colors duration-300 group-hover:text-white">
              Dashboard
            </h2>
            <p className="relative z-10 mt-1.5 text-sm leading-6 text-slate-600 transition-colors duration-300 group-hover:text-white/88">
              Utilization, charts, and recent spend.
            </p>
            <span className="relative z-10 mt-auto inline-flex self-end pt-5">
              <span className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)] transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                View Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </span>
          </Card>
        </Link>

        <Link href={`/events/${event.id}/users`} className="group block h-full">
          <Card className="relative flex h-full flex-col overflow-hidden p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,58,95,0.16)]">
            <span className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,117,182,0.18),rgba(46,117,182,0.1)_55%,rgba(46,117,182,0.04)_100%)] transition-transform duration-500 ease-out group-hover:scale-[6.5] group-hover:!bg-[#16314f]" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-950/[0.05] text-slate-600 transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                <UserCog className="h-5 w-5" />
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/12 group-hover:text-white ${
                  permissions.canManageRoles
                    ? "border border-[rgba(46,117,182,0.18)] bg-[rgba(46,117,182,0.08)] text-[var(--color-primary)]"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {permissions.canManageRoles ? "Manage Access" : "View Access"}
              </span>
            </div>
            <h2 className="relative z-10 mt-4 text-lg font-semibold text-slate-950 transition-colors duration-300 group-hover:text-white">
              Team Access
            </h2>
            <p className="relative z-10 mt-1.5 text-sm leading-6 text-slate-600 transition-colors duration-300 group-hover:text-white/88">
              {teamCount} user{teamCount === 1 ? "" : "s"} on this event. Manage
              roles and access here.
            </p>
            <span className="relative z-10 mt-auto inline-flex self-end pt-5">
              <span className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),#16314f)] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)] transition-colors duration-300 group-hover:bg-white/14 group-hover:text-white">
                Open Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </span>
          </Card>
        </Link>
      </div>

      <Modal
        className="max-w-md"
        description={`This is a soft delete. "${event.name}" will be hidden from normal event lists, but the underlying data will remain in the system.`}
        open={deleteOpen}
        title={`Delete event "${event.name}"?`}
        onClose={() => {
          if (actionBusy !== "DELETE") {
            setDeleteOpen(false);
          }
        }}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={actionBusy === "DELETE"}
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={actionBusy === "DELETE"}
            variant="danger"
            onClick={() => {
              setActionBusy("DELETE");
              void softDeleteEvent(params.id)
                .then(() => {
                  toast.success("Event deleted.");
                  router.replace("/events");
                })
                .catch((error) =>
                  toast.error(
                    error instanceof Error ? error.message : "Failed to delete event.",
                  ),
                )
                .finally(() => {
                  setActionBusy(null);
                });
            }}
          >
            <ArchiveX className="mr-2 h-4 w-4" />
            {actionBusy === "DELETE" ? "Deleting..." : "Delete Event"}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
