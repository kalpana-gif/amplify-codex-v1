"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Scale,
  CircleGauge,
  ClipboardList,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BudgetPDFExport } from "@/components/budget/budget-pdf-export";
import { BudgetTable } from "@/components/budget/budget-table";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import {
  createBudgetCategory,
  createLineItem,
  deleteBudgetCategory,
  deleteLineItem,
  getBudgetOverview,
  updateBudgetCategory,
  updateLineItem,
} from "@/lib/graphql/budget";
import { getEventAccessContext } from "@/lib/graphql/events";
import { calcVariance, formatCurrency } from "@/lib/utils";
import type { BudgetOverview } from "@/types";

const fetchBudgetPageData = async (eventId: string) => {
  const [overview, access] = await Promise.all([
    getBudgetOverview(eventId),
    getEventAccessContext(eventId),
  ]);

  return { overview, access };
};

const getResultErrorMessage = (
  errors: readonly { message?: string | null }[] | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

const getCollaboratorEmails = (
  emails: readonly (string | null)[] | null | undefined,
) => emails?.filter((email): email is string => Boolean(email)) ?? [];

const recalculateBudget = (budget: BudgetOverview): BudgetOverview => {
  const categories = budget.categories.map((category) => ({
    ...category,
    variance: calcVariance(category.plannedAmount, category.actualAmount),
    lineItems: category.lineItems.map((lineItem) => ({
      ...lineItem,
      variance: calcVariance(lineItem.plannedAmount, lineItem.actualAmount),
    })),
  }));
  const totalPlanned = categories.reduce(
    (sum, category) => sum + category.plannedAmount,
    0,
  );
  const totalActual = categories.reduce(
    (sum, category) => sum + category.actualAmount,
    0,
  );

  return {
    ...budget,
    categories,
    totalPlanned,
    totalActual,
    variance: calcVariance(totalPlanned, totalActual),
  };
};

export default function BudgetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [budget, setBudget] = useState<BudgetOverview | null>(null);
  const [permissions, setPermissions] = useState({
    canEditBudget: false,
  });
  const [eventName, setEventName] = useState("Budget Planner");
  const [profileEmail, setProfileEmail] = useState("");
  const [collaborators, setCollaborators] = useState({
    admins: [] as string[],
    editors: [] as string[],
    viewers: [] as string[],
  });

  const reload = useCallback(async () => {
    const snapshot = await fetchBudgetPageData(params.id);
    setBudget(snapshot.overview);
    setEventName(snapshot.access.event.name);
    setProfileEmail(snapshot.access.currentUser.email);
    setPermissions(snapshot.access.permissions);
    setCollaborators({
      admins: getCollaboratorEmails(snapshot.access.event.admins),
      editors: getCollaboratorEmails(snapshot.access.event.editors),
      viewers: getCollaboratorEmails(snapshot.access.event.viewers),
    });
  }, [params.id]);

  const patchBudget = useCallback(
    (updater: (current: BudgetOverview) => BudgetOverview) => {
      setBudget((current) => (current ? recalculateBudget(updater(current)) : current));
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void fetchBudgetPageData(params.id)
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setBudget(snapshot.overview);
        setEventName(snapshot.access.event.name);
        setProfileEmail(snapshot.access.currentUser.email);
        setPermissions(snapshot.access.permissions);
        setCollaborators({
          admins: getCollaboratorEmails(snapshot.access.event.admins),
          editors: getCollaboratorEmails(snapshot.access.event.editors),
          viewers: getCollaboratorEmails(snapshot.access.event.viewers),
        });
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

  if (!budget) {
    return <EventWorkspaceLoader variant="budget" />;
  }

  const lineItemCount = budget.categories.reduce(
    (sum, category) => sum + category.lineItems.length,
    0,
  );
  const approvedGap = budget.totalAmount - budget.totalPlanned;
  const approvedGapToneClass =
    approvedGap < 0
      ? "text-red-600"
      : approvedGap === 0
        ? "text-slate-700"
        : "text-[var(--color-primary)]";
  const budgetMetrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accentClass: string;
    iconClass: string;
    valueClass?: string;
  }> = [
    {
      label: "Approved",
      value: formatCurrency(budget.totalAmount, budget.currency),
      icon: Wallet,
      accentClass: "bg-[rgba(15,23,42,0.03)]",
      iconClass: "bg-slate-950 text-white",
    },
    {
      label: "Planned",
      value: formatCurrency(budget.totalPlanned, budget.currency),
      icon: ClipboardList,
      accentClass: "bg-[rgba(46,117,182,0.08)]",
      iconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
    },
    {
      label: "Actual",
      value: formatCurrency(budget.totalActual, budget.currency),
      icon: CircleGauge,
      accentClass: "bg-[rgba(15,23,42,0.04)]",
      iconClass: "bg-[rgba(15,23,42,0.08)] text-slate-700",
    },
    {
      label: "Plan Remaining",
      value: formatCurrency(budget.variance, budget.currency),
      icon: PiggyBank,
      accentClass: "bg-[rgba(30,58,95,0.08)]",
      iconClass: "bg-[rgba(30,58,95,0.14)] text-[var(--color-primary)]",
    },
    {
      label: "Gap",
      value: formatCurrency(Math.abs(approvedGap), budget.currency),
      icon: Scale,
      accentClass: "bg-[rgba(46,117,182,0.06)]",
      iconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-primary)]",
      valueClass: approvedGapToneClass,
    },
  ];

  return (
    <PageWrapper
      actions={<BudgetPDFExport budget={budget} eventName={eventName} />}
      actionsPosition="center"
      title="Budget Planner"
      description="Track category budgets, line-item allocations, and remaining spend."
    >
      <ErrorBoundary title="Budget planner unavailable">
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Budget Position
                </p>
                <h2 className="mt-2 max-w-3xl text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
                  Planned budget against live actuals
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  Approved, planned, actual, plan remaining, and gap in one compact view.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:w-fit xl:self-start">
                <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Access
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      permissions.canEditBudget
                        ? "text-[var(--color-primary)]"
                        : "text-slate-700"
                    }`}
                  >
                    {permissions.canEditBudget ? "Edit" : "View"}
                  </p>
                </div>

                <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Categories
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {budget.categories.length}
                  </p>
                </div>

                <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Line Items
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {lineItemCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {budgetMetrics.map(
                ({ label, value, icon: Icon, accentClass, iconClass, valueClass }) => (
                  <div
                    key={label}
                    className={`flex min-h-[78px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3 ${accentClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="max-w-[10ch] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {label}
                      </p>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 min-w-0 text-[clamp(1rem,1vw,1.28rem)] font-semibold leading-tight tracking-tight tabular-nums ${
                        valueClass ?? "text-slate-950"
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </Card>

        <BudgetTable
          budget={budget}
          currency={budget.currency}
          canEdit={permissions.canEditBudget}
          onSaveCategory={async (id, name, plannedAmount) => {
            const previousBudget = budget;

            patchBudget((current) => ({
              ...current,
              categories: current.categories.map((category) =>
                category.id === id ? { ...category, name, plannedAmount } : category,
              ),
            }));

            try {
              const result = await updateBudgetCategory(id, { name, plannedAmount });

              if (!result.data) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to update category."),
                );
              }

              void reload();
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onSaveLineItem={async (id, description, plannedAmount) => {
            const previousBudget = budget;

            patchBudget((current) => ({
              ...current,
              categories: current.categories.map((category) => ({
                ...category,
                lineItems: category.lineItems.map((lineItem) =>
                  lineItem.id === id
                    ? {
                        ...lineItem,
                        description,
                        plannedAmount,
                      }
                    : lineItem,
                ),
              })),
            }));

            try {
              const result = await updateLineItem(id, { description, plannedAmount });

              if (!result.data) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to update line item."),
                );
              }

              void reload();
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onAddCategory={async ({ name, plannedAmount }) => {
            const previousBudget = budget;
            const tempId = `temp-category-${crypto.randomUUID()}`;
            const order = budget.categories.length;

            patchBudget((current) => ({
              ...current,
              categories: [
                ...current.categories,
                {
                  id: tempId,
                  budgetId: current.id,
                  name,
                  plannedAmount,
                  actualAmount: 0,
                  variance: 0,
                  order,
                  color: "#2E75B6",
                  lineItems: [],
                },
              ],
            }));

            try {
              const result = await createBudgetCategory(budget.id, {
                name,
                plannedAmount,
                order,
                color: "#2E75B6",
                owner: profileEmail,
                admins: collaborators.admins,
                editors: collaborators.editors,
                viewers: collaborators.viewers,
              });

              if (!result.data) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to create category."),
                );
              }

              const createdCategory = result.data;

              patchBudget((current) => ({
                ...current,
                categories: current.categories.map((category) =>
                  category.id === tempId
                    ? {
                        ...category,
                        id: createdCategory.id,
                        budgetId: createdCategory.budgetId,
                      }
                    : category,
                ),
              }));

              void reload();
              return createdCategory.id;
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onAddLineItem={async ({
            categoryId,
            description,
            plannedAmount,
          }) => {
            const previousBudget = budget;
            const tempId = `temp-line-${crypto.randomUUID()}`;

            patchBudget((current) => ({
              ...current,
              categories: current.categories.map((category) =>
                category.id === categoryId
                  ? {
                      ...category,
                      lineItems: [
                        ...category.lineItems,
                        {
                          id: tempId,
                          categoryId,
                          description,
                          plannedAmount,
                          actualAmount: 0,
                          variance: 0,
                          notes: null,
                          attachmentKey: null,
                        },
                      ],
                    }
                  : category,
              ),
            }));

            try {
              const result = await createLineItem(categoryId, {
                description,
                plannedAmount,
                owner: profileEmail,
                admins: collaborators.admins,
                editors: collaborators.editors,
                viewers: collaborators.viewers,
              });

              if (!result.data) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to create line item."),
                );
              }

              const createdLineItem = result.data;

              patchBudget((current) => ({
                ...current,
                categories: current.categories.map((category) => ({
                  ...category,
                  lineItems: category.lineItems.map((lineItem) =>
                    lineItem.id === tempId
                      ? {
                          ...lineItem,
                          id: createdLineItem.id,
                        }
                      : lineItem,
                  ),
                })),
              }));

              void reload();
              return createdLineItem.id;
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onDeleteCategory={async (id) => {
            const previousBudget = budget;

            patchBudget((current) => ({
              ...current,
              categories: current.categories.filter((category) => category.id !== id),
            }));

            try {
              const result = await deleteBudgetCategory(id);

              if (result.errors?.length) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to delete category."),
                );
              }

              void reload();
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onDeleteLineItem={async (id) => {
            const previousBudget = budget;

            patchBudget((current) => ({
              ...current,
              categories: current.categories.map((category) => ({
                ...category,
                lineItems: category.lineItems.filter((lineItem) => lineItem.id !== id),
              })),
            }));

            try {
              const result = await deleteLineItem(id);

              if (result.errors?.length) {
                throw new Error(
                  getResultErrorMessage(result.errors, "Failed to delete line item."),
                );
              }

              void reload();
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
        />
      </ErrorBoundary>
    </PageWrapper>
  );
}
