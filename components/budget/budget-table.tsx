"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  onAddCategory: () => Promise<void>;
  onAddLineItem: (categoryId: string) => Promise<void>;
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
        <button
          onClick={() => void onAddCategory()}
          className="group relative flex items-center gap-0 rounded-full bg-[#1e3a5f] pl-5 pr-1 py-1 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#264d7a] hover:shadow-lg hover:shadow-blue-900/30 active:scale-95"
          title="Add category"
          aria-label="Add category"
        >
            <span className="mr-3 tracking-wide">Add Budget Item</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 transition-all duration-200 group-hover:border-white/50 group-hover:bg-white/20">
              <Plus className="h-4 w-4" />
            </span>
        </button>
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
    </Card>
  );
}
