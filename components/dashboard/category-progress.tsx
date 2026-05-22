import { Card } from "@/components/ui/card";
import { formatCurrency, varianceTone } from "@/lib/utils";
import type { BudgetCategoryView } from "@/types";

export function CategoryProgress({
  categories,
  currency,
}: {
  categories: BudgetCategoryView[];
  currency: string;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Category Progress</h2>
      <div className="mt-5 space-y-4">
        {categories.map((category) => {
          const usedPercentage =
            category.plannedAmount > 0
              ? Math.min((category.actualAmount / category.plannedAmount) * 100, 100)
              : 0;
          const tone = varianceTone(category.plannedAmount, category.actualAmount);

          return (
            <div key={category.id} className="rounded-[1.5rem] bg-slate-950/[0.03] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{category.name}</span>
                <span className="text-slate-500">
                  {formatCurrency(category.actualAmount, currency)} / {formatCurrency(category.plannedAmount, currency)}
                </span>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-slate-200/80">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${usedPercentage}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                <span className="text-slate-500">{usedPercentage}% utilized</span>
                <span
                  className={
                    tone === "danger"
                      ? "text-red-600"
                      : tone === "warning"
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }
                >
                  {tone === "danger"
                    ? "Over plan"
                    : tone === "warning"
                      ? "Watch closely"
                      : "Healthy"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
