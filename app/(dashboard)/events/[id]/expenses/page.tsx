"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  CircleGauge,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpensePDFExport } from "@/components/expenses/expense-pdf-export";
import { ExpenseQuickAdd } from "@/components/expenses/expense-quick-add";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { ResizableSplitView } from "@/components/layout/resizable-split-view";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { getBudgetOverview } from "@/lib/graphql/budget";
import { deleteExpense, listExpensesForEvent } from "@/lib/graphql/expenses";
import { getEventAccessContext } from "@/lib/graphql/events";
import { formatCurrency } from "@/lib/utils";
import type { BudgetOverview, CurrentUser, ExpenseView } from "@/types";

const fetchExpensesPageData = async (eventId: string) => {
  const [budgetOverview, access, expenseItems] = await Promise.all([
    getBudgetOverview(eventId),
    getEventAccessContext(eventId),
    listExpensesForEvent(eventId),
  ]);

  return {
    budgetOverview,
    access,
    expenseItems,
  };
};

const getCollaboratorEmails = (
  emails: readonly (string | null)[] | null | undefined,
) => emails?.filter((email): email is string => Boolean(email)) ?? [];

export default function ExpensesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [budget, setBudget] = useState<BudgetOverview | null>(null);
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [eventName, setEventName] = useState("Event");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [permissions, setPermissions] = useState({
    canEditExpenses: false,
  });
  const [collaborators, setCollaborators] = useState({
    admins: [] as string[],
    editors: [] as string[],
    viewers: [] as string[],
  });

  useEffect(() => {
    let active = true;

    void fetchExpensesPageData(params.id)
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setBudget(snapshot.budgetOverview);
        setExpenses(snapshot.expenseItems);
        setEventName(snapshot.access.event.name ?? "Event");
        setUser(snapshot.access.currentUser);
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

  if (!budget || !user) {
    return <EventWorkspaceLoader variant="expenses" />;
  }

  const runningTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = Math.max(budget.totalAmount - runningTotal, 0);
  const spendMetrics: Array<{
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
      label: "Current Spend",
      value: formatCurrency(runningTotal, budget.currency),
      icon: CircleGauge,
      accentClass: "bg-[rgba(46,117,182,0.08)]",
      iconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
    },
    {
      label: "Remaining",
      value: formatCurrency(remaining, budget.currency),
      icon: PiggyBank,
      accentClass: "bg-[rgba(30,58,95,0.08)]",
      iconClass: "bg-[rgba(30,58,95,0.14)] text-[var(--color-primary)]",
    },
    {
      label: "Expense Rows",
      value: String(expenses.length),
      icon: BadgeDollarSign,
      accentClass: "bg-[rgba(15,23,42,0.04)]",
      iconClass: "bg-[rgba(15,23,42,0.08)] text-slate-700",
    },
  ];

  return (
    <PageWrapper
      actions={
        <ExpensePDFExport
          budget={budget}
          eventName={eventName}
          expenses={expenses}
        />
      }
      actionsPosition="center"
      title="Expense Tracker"
      description="Capture actual spend, attach proof, and keep the event inside its approved ceiling."
    >
      <ErrorBoundary title="Expense section unavailable">
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Spend Position
              </p>
              <h2 className="mt-2 max-w-3xl text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
                Live spend against budget
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                Approved, spent, remaining, and expense rows in one compact view.
              </p>
            </div>

            <div className="mt-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {spendMetrics.map(({ label, value, icon: Icon, accentClass, iconClass }) => (
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
                  <p className="mt-1.5 min-w-0 text-[clamp(1rem,1vw,1.28rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <ResizableSplitView
          initialLeftWidth={420}
          minLeftWidth={360}
          minRightWidth={640}
          storageKey="expenses-page-layout"
          left={
            <ExpenseForm
              budget={budget}
              currency={budget.currency}
              eventId={params.id}
              remainingAmount={remaining}
              user={user}
              collaborators={collaborators}
              onCreated={(expense) =>
                setExpenses((current) => [expense, ...current])
              }
            />
          }
          right={
            <ExpenseTable
              expenses={expenses}
              currency={budget.currency}
              canEdit={permissions.canEditExpenses}
              headerAction={
                <ExpenseQuickAdd
                  budget={budget}
                  collaborators={collaborators}
                  currency={budget.currency}
                  eventId={params.id}
                  remainingAmount={remaining}
                  user={user}
                  onCreated={(expense) =>
                    setExpenses((current) => [expense, ...current])
                  }
                />
              }
              onDelete={async (expenseId) => {
                const previous = expenses;
                setExpenses((current) =>
                  current.filter((expense) => expense.id !== expenseId),
                );

                try {
                  await deleteExpense(expenseId);
                } catch (error) {
                  setExpenses(previous);
                  throw error;
                }
              }}
            />
          }
        />
      </ErrorBoundary>
    </PageWrapper>
  );
}
