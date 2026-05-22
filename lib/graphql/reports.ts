import { getBudgetOverview } from "@/lib/graphql/budget";
import { listExpensesForEvent } from "@/lib/graphql/expenses";
import { isDateInRange } from "@/lib/utils";
import type { ReportFilters } from "@/types";

export const getReportData = async (filters: ReportFilters) => {
  const [budget, expenses] = await Promise.all([
    getBudgetOverview(filters.eventId),
    listExpensesForEvent(filters.eventId),
  ]);

  return {
    budget,
    expenses: expenses.filter((expense) =>
      isDateInRange(expense.expenseDate, filters.startDate, filters.endDate),
    ),
  };
};
