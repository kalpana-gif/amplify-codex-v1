"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const formatTooltipCurrency = (
  value: number | string | readonly (number | string)[] | undefined,
  currency: string,
) => formatCurrency(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0), currency);

export function UtilizationDonut({
  totalBudget,
  totalSpent,
  currency,
}: {
  totalBudget: number;
  totalSpent: number;
  currency: string;
}) {
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const usedPercentage =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const data = [
    { name: "Spent", value: totalSpent, color: "#2E75B6" },
    { name: "Remaining", value: remaining, color: "#DCE7F4" },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Budget Utilization</h2>
      <p className="mt-1 text-sm text-slate-600">
        Share of the approved budget already consumed.
      </p>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative flex h-[18rem] w-full max-w-[21rem] items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={82}
                outerRadius={112}
                paddingAngle={2}
                cornerRadius={8}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatTooltipCurrency(value, currency)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-[8.9rem] w-[8.9rem] flex-col items-center justify-center rounded-full border border-slate-200/80 bg-white/94 text-center shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Used
              </p>
              <p className="mt-1 text-[2.25rem] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
                {usedPercentage}%
              </p>
              <p className="mt-1 text-xs text-slate-500">of budget</p>
            </div>
          </div>
        </div>

        <div className="grid w-full max-w-[22rem] gap-2 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-950/[0.03] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Spent
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950 tabular-nums">
              {formatCurrency(totalSpent, currency)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200/80 bg-[rgba(46,117,182,0.06)] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Remaining
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950 tabular-nums">
              {formatCurrency(remaining, currency)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
