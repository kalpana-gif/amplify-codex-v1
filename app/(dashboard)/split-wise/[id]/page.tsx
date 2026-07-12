"use client";

import Link from "next/link";
import {
  ArrowRightLeft,
  History,
  ReceiptText,
  Users,
} from "lucide-react";
import {
  buildSplitwiseMemberDirectory,
  getSplitwiseActivitySummary,
  getSplitwiseMemberDisplayName,
  getSplitwiseMemberName,
  getSplitwiseMemberSecondaryText,
} from "@/components/splitwise/splitwise-helpers";
import { useSplitwiseWorkspace } from "@/components/splitwise/splitwise-workspace-provider";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";

export default function SplitWiseGroupOverviewPage() {
  const {
    activityItems,
    activeExpenses,
    isLoading,
    loadError,
    totalOutstanding,
    view,
  } = useSplitwiseWorkspace();

  if (isLoading) {
    return <EventWorkspaceLoader variant="overview" />;
  }

  if (!view) {
    return (
      <PageWrapper
        title="Split-Wise"
        description={loadError ?? "This group could not be loaded."}
      >
        <Card className="border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">
            {loadError ?? "This group is unavailable."}
          </p>
        </Card>
      </PageWrapper>
    );
  }

  const currency = view.group.currency;
  const memberDirectory = buildSplitwiseMemberDirectory(view.members);
  const recentExpenses = activeExpenses.slice(0, 4);
  const recentActivity = activityItems.slice(0, 5);
  const topBalances = [...view.balances]
    .sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance))
    .slice(0, 5);
  const createdByLabel = getSplitwiseMemberDisplayName({
    email: view.group.createdBy,
    directory: memberDirectory,
  });
  const summaryMetrics = [
    ["Members", String(view.members.length)],
    ["Open Expenses", String(activeExpenses.length)],
    ["Outstanding", formatCurrency(totalOutstanding, currency)],
    [
      "Settlement Plan",
      `${view.simplifiedDebts.length} step${view.simplifiedDebts.length === 1 ? "" : "s"}`,
    ],
  ];

  return (
    <PageWrapper
      title="Group Overview"
      description="Snapshot the current balances, recent charges, and the shortest path to settle this group."
      actions={
        <>
          <Link href={`/split-wise/${view.group.id}/expenses`}>
            <Button variant="secondary">Open Expenses</Button>
          </Link>
          <Link href={`/split-wise/${view.group.id}/settlements`}>
            <Button>Record Settlement</Button>
          </Link>
        </>
      }
    >
      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Group Snapshot
            </p>
            <h2 className="mt-2 text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
              Live position across members, expenses, and settlement flow
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
              Created by {createdByLabel}
              {view.group.createdAt
                ? ` • ${formatDate(view.group.createdAt)}`
                : ""}
            </p>
          </div>

          <div className="mt-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map(([label, value], index) => {
              const iconClassNames = [
                "bg-slate-950 text-white",
                "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
                "bg-[rgba(30,58,95,0.14)] text-[var(--color-primary)]",
                "bg-[rgba(15,23,42,0.08)] text-slate-700",
              ];
              const accentClassNames = [
                "bg-[rgba(15,23,42,0.03)]",
                "bg-[rgba(46,117,182,0.08)]",
                "bg-[rgba(30,58,95,0.08)]",
                "bg-[rgba(15,23,42,0.04)]",
              ];

              return (
                <div
                  key={label}
                  className={`flex min-h-[78px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3 ${accentClassNames[index]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[10ch] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </p>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClassNames[index]}`}
                    >
                      {index === 0 ? (
                        <Users className="h-4 w-4" />
                      ) : index === 1 ? (
                        <ReceiptText className="h-4 w-4" />
                      ) : index === 2 ? (
                        <ArrowRightLeft className="h-4 w-4" />
                      ) : (
                        <History className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 min-w-0 text-[clamp(1rem,1vw,1.28rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Balance Snapshot
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                Largest open positions
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Positive balances are owed money. Negative balances still owe.
              </p>
            </div>
            <Link href={`/split-wise/${view.group.id}/members`}>
              <Button size="sm" variant="secondary">
                Members
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {topBalances.map((balance) => (
              <div
                key={balance.email}
                className="flex items-center justify-between rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-950">{balance.name}</p>
                  {getSplitwiseMemberSecondaryText(balance.email, memberDirectory) ? (
                    <p className="text-sm text-slate-500">
                      {getSplitwiseMemberSecondaryText(balance.email, memberDirectory)}
                    </p>
                  ) : null}
                </div>
                <p
                  className={`text-sm font-semibold ${
                    balance.balance > 0
                      ? "text-emerald-700"
                      : balance.balance < 0
                        ? "text-red-700"
                        : "text-slate-700"
                  }`}
                >
                  {formatCurrency(balance.balance, currency)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Simplified Debts
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                Minimum transactions to settle up
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                This mirrors the event workspace style by keeping the actionable summary at the top.
              </p>
            </div>
            <Link href={`/split-wise/${view.group.id}/settlements`}>
              <Button size="sm" variant="secondary">
                Settlements
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {view.simplifiedDebts.length ? (
              view.simplifiedDebts.map((debt) => (
                <div
                  key={`${debt.fromEmail}-${debt.toEmail}-${debt.amount}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200/80 px-4 py-3"
                >
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-950">
                      {getSplitwiseMemberName(debt.fromEmail, memberDirectory)}
                    </span>{" "}
                    pays{" "}
                    <span className="font-medium text-slate-950">
                      {getSplitwiseMemberName(debt.toEmail, memberDirectory)}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-slate-950">
                    {formatCurrency(debt.amount, currency)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                Everyone is already settled up.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent Expenses</h2>
              <p className="mt-1 text-sm text-slate-600">
                The latest shared charges still affecting balances.
              </p>
            </div>
            <Link href={`/split-wise/${view.group.id}/expenses`}>
              <Button size="sm" variant="secondary">
                View All
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentExpenses.length ? (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-[1.25rem] bg-slate-950/[0.03] px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">
                      {expense.description}
                    </p>
                    <p className="text-sm text-slate-500">
                      Paid by {getSplitwiseMemberName(expense.paidBy, memberDirectory)} •{" "}
                      {formatDate(expense.recordedAt)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-950">
                    {formatCurrency(expense.totalAmount, currency)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                No expenses have been recorded yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent Activity</h2>
              <p className="mt-1 text-sm text-slate-600">
                Mutations are logged here first so you can trace what changed.
              </p>
            </div>
            <Link href={`/split-wise/${view.group.id}/activity`}>
              <Button size="sm" variant="secondary">
                Open Feed
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentActivity.length ? (
              recentActivity.map((item) => {
                const activitySummary = getSplitwiseActivitySummary(
                  item,
                  memberDirectory,
                );
                const actorLabel = getSplitwiseMemberDisplayName({
                  email: item.actorEmail,
                  directory: memberDirectory,
                  fallbackName: item.actorName,
                });

                return (
                  <div
                    key={item.id}
                    className="rounded-[1.2rem] border border-slate-200/80 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{activitySummary}</p>
                      <p className="text-xs text-slate-500">
                        {formatRelativeDate(item.loggedAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {actorLabel} • {item.actionType}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                Activity will appear once members start adding expenses or settlements.
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
