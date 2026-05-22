"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { BudgetCategoryView } from "@/types";

const formatTooltipCurrency = (
  value: number | string | readonly (number | string)[] | undefined,
  currency: string,
) => formatCurrency(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0), currency);

export function BudgetBarChart({
  categories,
  currency,
}: {
  categories: BudgetCategoryView[];
  currency: string;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Planned vs Actual</h2>
      <p className="mt-1 text-sm text-slate-600">
        Compare budget intent against confirmed spend by category.
      </p>
      <div className="mt-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} barGap={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 12 }}
              tickFormatter={(value) =>
                formatCurrency(Number(value), currency).replace(".00", "")
              }
            />
            <Tooltip
              formatter={(value) => formatTooltipCurrency(value, currency)}
              contentStyle={{
                borderRadius: 20,
                borderColor: "#E2E8F0",
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              }}
            />
            <Bar dataKey="plannedAmount" fill="#1E3A5F" radius={[10, 10, 0, 0]} />
            <Bar dataKey="actualAmount" fill="#2E75B6" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
