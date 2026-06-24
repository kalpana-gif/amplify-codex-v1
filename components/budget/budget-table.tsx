"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { BudgetActionButton } from "@/components/budget/budget-action-button";
import { CategoryRow } from "@/components/budget/category-row";
import { formatCurrency } from "@/lib/utils";
import type { BudgetOverview } from "@/types";

export function BudgetTable({
  budget,
  currency,
  canEdit,
  onSaveCategory,
  onSaveLineItem,
  onAddCategory,
  onAddLineItem,
  onDeleteCategory,
  onDeleteLineItem,
}: {
  budget: BudgetOverview;
  currency: BudgetOverview["currency"];
  canEdit: boolean;
  onSaveCategory: (id: string, name: string, plannedAmount: number) => Promise<void>;
  onSaveLineItem: (id: string, description: string, plannedAmount: number) => Promise<void>;
  onAddCategory: (input: {
    name: string;
    plannedAmount: number;
  }) => Promise<string>;
  onAddLineItem: (input: {
    categoryId: string;
    description: string;
    plannedAmount: number;
  }) => Promise<string>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteLineItem: (id: string) => Promise<void>;
}) {
  const grandTotal = useMemo(
    () =>
      budget.categories.reduce(
        (total, category) => {
          total.planned += category.plannedAmount;
          total.actual += category.actualAmount;
          total.variance += category.variance;
          return total;
        },
        { planned: 0, actual: 0, variance: 0 },
      ),
    [budget.categories],
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [recentlyAddedCategoryId, setRecentlyAddedCategoryId] = useState<string | null>(
    null,
  );
  const plannedAmountValue = Number(newCategoryAmount);
  const hasValidAmount =
    newCategoryAmount.trim().length > 0 &&
    Number.isFinite(plannedAmountValue) &&
    plannedAmountValue >= 0;
  const canSubmitNewCategory =
    newCategoryName.trim().length > 0 && hasValidAmount;

  useEffect(() => {
    if (!recentlyAddedCategoryId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRecentlyAddedCategoryId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [recentlyAddedCategoryId]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Budget Planner</h2>
          <p className="mt-1 text-sm text-slate-600">
            Remaining means planned minus actual. Category budgets stay at the top level, and line items show how each category is allocated.
          </p>
        </div>
        {canEdit ? (
        <BudgetActionButton
          aria-label="Add category"
          icon={<Plus className="h-4 w-4" />}
          label="Add Budget Item"
          title="Add category"
          onClick={() => {
            setNewCategoryName("");
            setNewCategoryAmount("");
            setAddModalOpen(true);
          }}
        />
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-3">Category / Line Item</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3 text-right">Spent</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {budget.categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                currency={currency}
                canEdit={canEdit}
                highlight={category.id === recentlyAddedCategoryId}
                onSaveCategory={onSaveCategory}
                onSaveLineItem={onSaveLineItem}
                onAddLineItem={onAddLineItem}
                onDeleteCategory={onDeleteCategory}
                onDeleteLineItem={onDeleteLineItem}
              />
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr className="text-sm font-semibold text-slate-950">
              <td className="px-4 py-4">Grand Total</td>
              <td className="px-4 py-4 text-right">{formatCurrency(grandTotal.planned, currency)}</td>
              <td className="px-4 py-4 text-right">{formatCurrency(grandTotal.actual, currency)}</td>
              <td className="px-4 py-4 text-right">{formatCurrency(grandTotal.variance, currency)}</td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>

      <Modal
        className="max-w-lg"
        description="Add a name and planned amount for the new budget item."
        open={addModalOpen}
        title="Add Budget Item"
        onClose={() => {
          if (!isAdding) {
            setAddModalOpen(false);
          }
        }}
      >
        <div className="space-y-5">
          <div className="rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Approved Budget
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950">
                  Event allocation
                </p>
              </div>
              <div className="rounded-[1rem] border border-[rgba(46,117,182,0.14)] bg-[rgba(46,117,182,0.06)] px-4 py-3 sm:min-w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Main Planned Budget
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                  {formatCurrency(budget.totalAmount, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Budget item name
              </span>
              <Input
                autoFocus
                className="h-12 rounded-[1rem] border-slate-200/90 bg-slate-50/70 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                placeholder="Venue"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Planned amount ({currency})
              </span>
              <Input
                className="h-12 rounded-[1rem] border-slate-200/90 bg-slate-50/70 px-4 text-right text-[15px] tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={newCategoryAmount}
                onChange={(event) => setNewCategoryAmount(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button
              className="h-11 w-full rounded-[1rem] px-5 sm:w-auto"
              disabled={isAdding}
              variant="secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 w-full min-w-[180px] rounded-[1rem] px-5 sm:w-auto"
              disabled={!canSubmitNewCategory || isAdding}
              onClick={() => {
                if (!canSubmitNewCategory) {
                  toast.error("Add a budget item name and planned amount first.");
                  return;
                }

                setIsAdding(true);

                void onAddCategory({
                  name: newCategoryName.trim(),
                  plannedAmount: Math.round(plannedAmountValue * 100),
                })
                  .then((createdId) => {
                    setRecentlyAddedCategoryId(createdId);
                    setAddModalOpen(false);
                    toast.success("Budget item added.");
                  })
                  .catch((error) =>
                    toast.error(
                      error instanceof Error ? error.message : "Add budget item failed.",
                    ),
                  )
                  .finally(() => {
                    setIsAdding(false);
                  });
              }}
            >
              {isAdding ? "Adding Budget Item..." : "Add Budget Item"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
