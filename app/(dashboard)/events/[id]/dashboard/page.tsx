"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Clock3 } from "lucide-react";
import { BudgetBarChart } from "@/components/dashboard/budget-bar-chart";
import { CategoryProgress } from "@/components/dashboard/category-progress";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { UtilizationDonut } from "@/components/dashboard/utilization-donut";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { client } from "@/lib/amplify-client";
import { getBudgetOverview } from "@/lib/graphql/budget";
import { listExpensesForEvent } from "@/lib/graphql/expenses";
import { calcPercentage, formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetOverview, DashboardSummary, ExpenseView } from "@/types";

export default function EventDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [budget, setBudget] = useState<BudgetOverview | null>(null);
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getBudgetOverview(params.id),
      listExpensesForEvent(params.id),
      client.models.Event.get(
        { id: params.id },
        {
          authMode: "userPool",
          selectionSet: ["id", "status"],
        },
      ),
    ])
      .then(([budgetOverview, expenseItems, eventResult]) => {
        if (!active) {
          return;
        }

        if (!eventResult.data || eventResult.data.status === "ARCHIVED") {
          router.replace("/events");
          return;
        }

        setBudget(budgetOverview);
        setExpenses(expenseItems);
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

  const summary = useMemo<DashboardSummary>(() => {
    const totalBudget = budget?.totalAmount ?? 0;
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = totalBudget - totalSpent;
    const usedPercentage = calcPercentage(totalSpent, totalBudget);

    return {
      totalBudget,
      totalSpent,
      remaining,
      usedPercentage,
      overThreshold: usedPercentage >= 80,
    };
  }, [budget, expenses]);

  if (!budget) {
    return null;
  }

  return (
    <PageWrapper
      title="Event Dashboard"
      description="Budget charts and recent expense activity."
    >
      <ErrorBoundary title="Dashboard metrics unavailable">
        <Card className="p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Used</p>
              <p className="mt-2 text-lg font-semibold">{summary.usedPercentage}%</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Remaining</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatCurrency(summary.remaining, budget.currency)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Expenses</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{expenses.length}</p>
            </div>
          </div>
        </Card>

        {summary.overThreshold ? (
          <Card className="border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-900">Budget alert</h2>
                <p className="mt-2 text-sm text-amber-800">
              This event has used {summary.usedPercentage}% of its budget.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <SummaryCards summary={summary} currency={budget.currency} />

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <BudgetBarChart categories={budget.categories} currency={budget.currency} />
          <UtilizationDonut
            totalBudget={summary.totalBudget}
            totalSpent={summary.totalSpent}
            currency={budget.currency}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <CategoryProgress categories={budget.categories} currency={budget.currency} />
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">Recent Expenses</h2>
            <p className="mt-1 text-sm text-slate-600">
              The latest confirmed spend items flowing into the dashboard.
            </p>
            <div className="mt-5 space-y-3">
              {expenses.slice(0, 5).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-[1.5rem] bg-slate-950/[0.03] px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-950">{expense.vendor}</p>
                    <p className="text-sm text-slate-500">
                      {expense.categoryName} • {formatDate(expense.expenseDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-950">
                    {formatCurrency(expense.amount, budget.currency)}
                  </p>
                </div>
              ))}
              {!expenses.length ? (
                <div className="flex items-center gap-3 rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  No expenses have been logged for this event yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </ErrorBoundary>
    </PageWrapper>
  );
}
