"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CircleGauge,
  ClipboardList,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BudgetTable } from "@/components/budget/budget-table";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { client } from "@/lib/amplify-client";
import {
  createBudgetCategory,
  createLineItem,
  deleteBudgetCategory,
  deleteLineItem,
  getBudgetOverview,
  updateBudgetCategory,
  updateLineItem,
} from "@/lib/graphql/budget";
import { getCurrentUserProfile, getEventPermissions } from "@/lib/graphql/events";
import { calcVariance, formatCurrency } from "@/lib/utils";
import type { BudgetOverview } from "@/types";

const fetchBudgetPageData = async (eventId: string) => {
  const [overview, eventResult, profile] = await Promise.all([
    getBudgetOverview(eventId),
    client.models.Event.get(
      { id: eventId },
      {
        authMode: "userPool",
        selectionSet: [
          "id",
          "owner",
          "admins",
          "editors",
          "viewers",
          "status",
        ],
      },
    ),
    getCurrentUserProfile(),
  ]);

  if (!eventResult.data || eventResult.data.status === "ARCHIVED") {
    throw new Error("Event not found.");
  }

  return { overview, event: eventResult.data, profile };
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
  const [profileEmail, setProfileEmail] = useState("");
  const [collaborators, setCollaborators] = useState({
    admins: [] as string[],
    editors: [] as string[],
    viewers: [] as string[],
  });

  const reload = useCallback(async () => {
    const snapshot = await fetchBudgetPageData(params.id);
    setBudget(snapshot.overview);

    if (snapshot.profile && snapshot.event) {
      setProfileEmail(snapshot.profile.email);
      setPermissions(getEventPermissions(snapshot.profile.email, snapshot.event));
      setCollaborators({
        admins: getCollaboratorEmails(snapshot.event.admins),
        editors: getCollaboratorEmails(snapshot.event.editors),
        viewers: getCollaboratorEmails(snapshot.event.viewers),
      });
    }
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

        if (snapshot.profile && snapshot.event) {
          setProfileEmail(snapshot.profile.email);
          setPermissions(getEventPermissions(snapshot.profile.email, snapshot.event));
          setCollaborators({
            admins: getCollaboratorEmails(snapshot.event.admins),
            editors: getCollaboratorEmails(snapshot.event.editors),
            viewers: getCollaboratorEmails(snapshot.event.viewers),
          });
        }
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
    return null;
  }

  const lineItemCount = budget.categories.reduce(
    (sum, category) => sum + category.lineItems.length,
    0,
  );
  const budgetMetrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accentClass: string;
    iconClass: string;
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
      label: "Remaining",
      value: formatCurrency(budget.variance, budget.currency),
      icon: PiggyBank,
      accentClass: "bg-[rgba(30,58,95,0.08)]",
      iconClass: "bg-[rgba(30,58,95,0.14)] text-[var(--color-primary)]",
    },
  ];

  return (
    <PageWrapper
      title="Budget Planner"
      description="Track category budgets, line-item allocations, and remaining spend."
    >
      <ErrorBoundary title="Budget planner unavailable">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <Card className="p-4 md:p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Budget Position
            </p>
            <h2 className="mt-2 max-w-3xl text-[clamp(1.8rem,2.2vw,2.7rem)] font-semibold leading-[1.05] tracking-tight text-slate-950">
              Planned budget against live actuals
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Approved, planned, actual, and remaining in one view.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {budgetMetrics.map(
                ({ label, value, icon: Icon, accentClass, iconClass }) => (
                  <div
                    key={label}
                    className={`flex min-h-[96px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3 ${accentClass}`}
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
                    <p className="mt-2 min-w-0 text-[clamp(1rem,1vw,1.35rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                      {value}
                    </p>
                  </div>
                ),
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Planning Notes
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  Remaining is calculated as{" "}
                  <span className="font-semibold text-slate-950">
                    budget minus actual spend
                  </span>
                  . Line items show how each category budget is allocated.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    permissions.canEditBudget
                      ? "border border-[rgba(46,117,182,0.18)] bg-[rgba(46,117,182,0.08)] text-[var(--color-primary)]"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {permissions.canEditBudget ? "Edit Access" : "View Access"}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {budget.categories.length} Categories
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {lineItemCount} Line Items
                </span>
              </div>
            </div>
          </Card>
        </div>

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
          onAddCategory={async () => {
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
                  name: "New Category",
                  plannedAmount: 0,
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
                name: "New Category",
                plannedAmount: 0,
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
            } catch (error) {
              setBudget(previousBudget);
              throw error;
            }
          }}
          onAddLineItem={async (categoryId) => {
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
                          description: "New line item",
                          plannedAmount: 0,
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
                description: "New line item",
                plannedAmount: 0,
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
