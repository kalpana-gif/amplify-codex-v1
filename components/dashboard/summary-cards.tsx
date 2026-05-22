import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, CircleGauge, PiggyBank, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

export function SummaryCards({
  summary,
  currency,
}: {
  summary: DashboardSummary;
  currency: string;
}) {
  const cards: {
    icon: LucideIcon;
    label: string;
    value: string;
    note: string;
  }[] = [
    {
      icon: Wallet,
      label: "Total Budget",
      value: formatCurrency(summary.totalBudget, currency),
      note: "Approved event ceiling",
    },
    {
      icon: BadgeDollarSign,
      label: "Total Spent",
      value: formatCurrency(summary.totalSpent, currency),
      note: "Confirmed spend to date",
    },
    {
      icon: PiggyBank,
      label: "Remaining",
      value: formatCurrency(summary.remaining, currency),
      note: "Headroom before the ceiling",
    },
    {
      icon: CircleGauge,
      label: "% Used",
      value: `${summary.usedPercentage}%`,
      note: "Current utilization",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, note }) => (
        <Card key={label} className="h-full p-5">
          <div className="flex min-h-[128px] items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <p className="mt-3 min-w-0 text-[clamp(1.3rem,1.6vw,2rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                {value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{note}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-slate-950 text-white">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
