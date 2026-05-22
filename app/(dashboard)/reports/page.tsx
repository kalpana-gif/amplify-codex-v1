"use client";

import { useEffect, useState } from "react";
import { CSVExport } from "@/components/reports/csv-export";
import { PDFExport } from "@/components/reports/pdf-export";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listEventsForCurrentUser } from "@/lib/graphql/events";
import { getReportData } from "@/lib/graphql/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventSummary, ExpenseView } from "@/types";

export default function ReportsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<{
    totalAmount: number;
    totalPlanned: number;
    totalActual: number;
    variance: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    void listEventsForCurrentUser().then((eventItems) => {
      setEvents(eventItems);
      setEventId(eventItems[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    void getReportData({ eventId, startDate, endDate }).then((report) => {
      setExpenses(report.expenses);
      setBudgetSummary(
        report.budget
          ? {
              totalAmount: report.budget.totalAmount,
              totalPlanned: report.budget.totalPlanned,
              totalActual: report.budget.totalActual,
              variance: report.budget.variance,
              currency: report.budget.currency,
            }
          : null,
      );
    });
  }, [eventId, startDate, endDate]);

  return (
    <PageWrapper
      title="Reports"
      description="Filter and export budget and expense data."
      actions={
        eventId ? (
          <>
            <PDFExport targetId="report-preview" filename="event-report.pdf" />
            <CSVExport expenses={expenses} filename="event-report.csv" />
          </>
        ) : null
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Event</span>
              <Select value={eventId} onChange={(event) => setEventId(event.target.value)}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Start Date</span>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">End Date</span>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rows</p>
              <p className="mt-2 text-2xl font-semibold">{expenses.length}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-950/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Range</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {startDate || "Start"} - {endDate || "End"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div id="report-preview" className="space-y-6">
        {budgetSummary ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Budget", budgetSummary.totalAmount],
              ["Planned", budgetSummary.totalPlanned],
              ["Actual", budgetSummary.totalActual],
              ["Variance", budgetSummary.variance],
            ].map(([label, value]) => (
              <Card key={label} className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">
                  {formatCurrency(value as number, budgetSummary.currency)}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Select an event to preview reporting data"
            description="Once an event is selected, EMBS will summarize the budget and show export-ready expense history."
          />
        )}

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-950">Expense Preview</h2>
            <p className="mt-1 text-sm text-slate-600">
              Filtered spend rows ready for PDF or CSV export.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Line Item</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length ? (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-slate-100 text-sm">
                      <td className="px-4 py-3 text-slate-600">{formatDate(expense.expenseDate)}</td>
                      <td className="px-4 py-3 text-slate-950">{expense.vendor}</td>
                      <td className="px-4 py-3 text-slate-600">{expense.categoryName}</td>
                      <td className="px-4 py-3 text-slate-600">{expense.lineItemDescription}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {formatCurrency(expense.amount, budgetSummary?.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-slate-100">
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No expense rows match the current selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
