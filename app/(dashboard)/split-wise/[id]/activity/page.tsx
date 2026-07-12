"use client";

import { Clock3 } from "lucide-react";
import {
  buildSplitwiseMemberDirectory,
  getSplitwiseActivitySummary,
  getSplitwiseMemberDisplayName,
} from "@/components/splitwise/splitwise-helpers";
import { useSplitwiseWorkspace } from "@/components/splitwise/splitwise-workspace-provider";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { formatDate, formatRelativeDate } from "@/lib/utils";

const activityVariant = {
  GROUP_CREATED: "default",
  MEMBER_ADDED: "completed",
  MEMBER_UPDATED: "default",
  MEMBER_REMOVED: "warning",
  EXPENSE_ADDED: "completed",
  EXPENSE_EDITED: "default",
  EXPENSE_DELETED: "danger",
  SETTLEMENT_RECORDED: "active",
} as const;

const actionLabels = {
  GROUP_CREATED: "Group created",
  MEMBER_ADDED: "Member added",
  MEMBER_UPDATED: "Member updated",
  MEMBER_REMOVED: "Member removed",
  EXPENSE_ADDED: "Expense added",
  EXPENSE_EDITED: "Expense edited",
  EXPENSE_DELETED: "Expense deleted",
  SETTLEMENT_RECORDED: "Settlement recorded",
} as const;

const isIsoDateString = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

const emailFieldNames = new Set([
  "actorEmail",
  "createdBy",
  "deletedBy",
  "email",
  "fromEmail",
  "paidBy",
  "toEmail",
  "updatedBy",
]);

const formatActivityFieldLabel = (value: string) =>
  value
    .replace(/Email$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

const formatActivityValue = ({
  directory,
  field,
  value,
}: {
  directory: ReturnType<typeof buildSplitwiseMemberDirectory>;
  field?: string;
  value: unknown;
}): string => {
  if (value === null || value === undefined) {
    return "empty";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    if (field && emailFieldNames.has(field)) {
      return getSplitwiseMemberDisplayName({
        email: value,
        directory,
      });
    }

    if (isIsoDateString(value)) {
      return formatDate(value, "MMM d, h:mm a");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    return keys.length ? `${keys.length} field${keys.length === 1 ? "" : "s"}` : "object";
  }

  return String(value);
};

const getDiffSummary = ({
  diff,
  directory,
}: {
  diff: unknown;
  directory: ReturnType<typeof buildSplitwiseMemberDirectory>;
}) => {
  if (!diff || typeof diff !== "object" || Array.isArray(diff)) {
    return [];
  }

  return Object.entries(diff as Record<string, { before?: unknown; after?: unknown }>)
    .slice(0, 3)
    .map(([field, change]) => ({
      field,
      label: formatActivityFieldLabel(field),
      before: formatActivityValue({ field, value: change?.before, directory }),
      after: formatActivityValue({ field, value: change?.after, directory }),
    }));
};

export default function SplitwiseActivityPage() {
  const {
    activityItems,
    activityNextToken,
    isLoading,
    isLoadingActivity,
    loadError,
    loadMoreActivity,
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

  const latestItem = activityItems[0];
  const memberDirectory = buildSplitwiseMemberDirectory(view.members);

  return (
    <PageWrapper
      title="Activity"
      description="A simple history of what changed in this group."
    >
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review changes, who made them, and when they happened.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600">
              {activityItems.length} loaded
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600">
              {latestItem ? formatRelativeDate(latestItem.loggedAt) : "No activity yet"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {activityItems.length ? (
            activityItems.map((item) => {
              const diffSummary = getDiffSummary({
                diff: item.diff,
                directory: memberDirectory,
              });
              const activitySummary = getSplitwiseActivitySummary(item, memberDirectory);
              const actorLabel = getSplitwiseMemberDisplayName({
                email: item.actorEmail,
                directory: memberDirectory,
                fallbackName: item.actorName,
              });

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">{activitySummary}</p>
                        <Badge variant={activityVariant[item.actionType]}>
                          {actionLabels[item.actionType]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {actorLabel} • {item.entityType.toLowerCase()} •{" "}
                        {formatDate(item.loggedAt, "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs text-slate-500">
                      {formatRelativeDate(item.loggedAt)}
                    </p>
                  </div>

                  {diffSummary.length ? (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Changes
                      </p>
                      <div className="mt-2 space-y-2">
                        {diffSummary.map((change) => (
                          <div
                            key={`${item.id}-${change.field}`}
                            className="text-sm text-slate-600"
                          >
                            <span className="font-medium text-slate-900">
                              {change.label}
                            </span>
                            : {change.before}
                            {" -> "}
                            {change.after}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {item.diff ? (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-700">
                        Show raw diff
                      </summary>
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/[0.04] p-3 text-xs text-slate-700">
                        {JSON.stringify(item.diff, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              <Clock3 className="h-4 w-4" />
              Activity will appear here once the group starts changing.
            </div>
          )}
        </div>

        {activityNextToken ? (
          <div className="mt-5 flex justify-center border-t border-slate-200/80 pt-5">
            <Button
              disabled={isLoadingActivity}
              variant="secondary"
              onClick={() => {
                void loadMoreActivity();
              }}
            >
              {isLoadingActivity ? "Loading..." : "Load more activity"}
            </Button>
          </div>
        ) : null}
      </Card>
    </PageWrapper>
  );
}
