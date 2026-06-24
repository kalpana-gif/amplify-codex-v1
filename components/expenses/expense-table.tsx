"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ExpenseView } from "@/types";

export function ExpenseTable({
  expenses,
  currency,
  canEdit,
  headerAction,
  onDelete,
}: {
  expenses: ExpenseView[];
  currency: string;
  canEdit: boolean;
  headerAction?: ReactNode;
  onDelete: (expenseId: string) => Promise<void>;
}) {
  const [sortColumn, setSortColumn] = useState<keyof ExpenseView>("expenseDate");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          expenses
            .map((expense) => expense.categoryName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [expenses],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesCategory =
          categoryFilter === "ALL" || expense.categoryName === categoryFilter;
        const matchesStart = !startDate || expense.expenseDate >= startDate;
        const matchesEnd = !endDate || expense.expenseDate <= endDate;

        return matchesCategory && matchesStart && matchesEnd;
      }),
    [categoryFilter, endDate, expenses, startDate],
  );

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((first, second) => {
      if (sortColumn === "amount") {
        return first.amount - second.amount;
      }

      const left = String(first[sortColumn] ?? "");
      const right = String(second[sortColumn] ?? "");
      return left.localeCompare(right);
    });
  }, [filteredExpenses, sortColumn]);

  const runningTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filteredTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const selectedExpense = selectedId
    ? expenses.find((expense) => expense.id === selectedId) ?? null
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Expenses</h2>
          <p className="mt-1 text-sm text-slate-600">
            Running total: {formatCurrency(runningTotal, currency)}
            {filteredExpenses.length !== expenses.length
              ? ` • Filtered: ${formatCurrency(filteredTotal, currency)}`
              : ""}
          </p>
        </div>
        {headerAction ? (
          <div className="flex items-center gap-3 md:shrink-0">{headerAction}</div>
        ) : null}
      </div>
      <div className="grid gap-3 border-b border-slate-200 px-5 py-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Category
          </span>
          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Start Date
          </span>
          <DateInput
            max={endDate || undefined}
            placeholder="Select start date"
            value={startDate}
            onChange={setStartDate}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            End Date
          </span>
          <DateInput
            min={startDate || undefined}
            placeholder="Select end date"
            value={endDate}
            onChange={setEndDate}
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              {[
                ["expenseDate", "Date"],
                ["vendor", "Vendor"],
                ["categoryName", "Category"],
                ["lineItemDescription", "Line Item"],
                ["amount", "Amount"],
                ["paymentMethod", "Payment"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="cursor-pointer px-4 py-3 text-left"
                  onClick={() => setSortColumn(key as keyof ExpenseView)}
                >
                  {label}
                </th>
              ))}
              <th className="px-4 py-3 text-left">Receipt</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.length ? (
              sortedExpenses.map((expense) => (
                <tr key={expense.id} className="border-t border-slate-100 text-sm">
                  <td className="px-4 py-3 text-slate-600">{formatDate(expense.expenseDate)}</td>
                  <td className="px-4 py-3 text-slate-950">{expense.vendor}</td>
                  <td className="px-4 py-3 text-slate-600">{expense.categoryName}</td>
                  <td className="px-4 py-3 text-slate-600">{expense.lineItemDescription}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">
                    {formatCurrency(expense.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{expense.paymentMethod}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {expense.receiptKey ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium">
                        Uploaded
                      </span>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEdit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete expense"
                        className="h-9 w-9 rounded-full p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Delete expense"
                        onClick={() => setSelectedId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-100">
                <td
                  className="px-4 py-8 text-center text-sm text-slate-500"
                  colSpan={8}
                >
                  No expenses match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(selectedId)}
        title="Delete expense"
        description="Please confirm before removing this expense from the tracker."
        onClose={() => {
          if (!isDeleting) {
            setSelectedId(null);
          }
        }}
      >
        <div className="space-y-5">
          {selectedExpense ? (
            <div className="rounded-[1.35rem] border border-red-100 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500">
                    Expense to delete
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {selectedExpense.vendor}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedExpense.categoryName} • {selectedExpense.lineItemDescription}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-red-200 bg-white px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {formatCurrency(selectedExpense.amount, currency)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              disabled={isDeleting}
              variant="secondary"
              onClick={() => setSelectedId(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              variant="danger"
              onClick={() => {
                const id = selectedId;

                if (!id) {
                  return;
                }

                setIsDeleting(true);

                void onDelete(id)
                  .then(() => {
                    toast.success("Expense deleted.");
                    setSelectedId(null);
                  })
                  .catch((error) =>
                    toast.error(
                      error instanceof Error ? error.message : "Delete failed.",
                    ),
                  )
                  .finally(() => setIsDeleting(false));
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
