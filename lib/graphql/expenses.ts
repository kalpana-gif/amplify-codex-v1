import { client } from "@/lib/amplify-client";
import type { ExpenseView } from "@/types";

export const listExpensesForEvent = async (
  eventId: string,
): Promise<ExpenseView[]> => {
  const [expensesResult, categoriesResult, lineItemsResult] = await Promise.all([
    client.models.Expense.list({
      authMode: "userPool",
      filter: { eventId: { eq: eventId } },
    }),
    client.models.BudgetCategory.list({
      authMode: "userPool",
    }),
    client.models.LineItem.list({
      authMode: "userPool",
    }),
  ]);

  const categories = new Map(
    categoriesResult.data.map((category) => [category.id, category.name]),
  );
  const lineItems = new Map(
    lineItemsResult.data.map((lineItem) => [lineItem.id, lineItem.description]),
  );

  return expensesResult.data
    .map((expense) => ({
      id: expense.id,
      lineItemId: expense.lineItemId,
      categoryId: expense.categoryId,
      eventId: expense.eventId,
      amount: expense.amount,
      vendor: expense.vendor,
      expenseDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      receiptKey: expense.receiptKey,
      notes: expense.notes,
      loggedBy: expense.loggedBy,
      categoryName: categories.get(expense.categoryId) ?? "Unassigned",
      lineItemDescription:
        lineItems.get(expense.lineItemId) ?? "Unassigned",
    }))
    .sort((first, second) => second.expenseDate.localeCompare(first.expenseDate));
};

export const createExpense = async (
  input: {
    id?: string;
    lineItemId: string;
    categoryId: string;
    eventId: string;
    amount: number;
    vendor: string;
    expenseDate: string;
    paymentMethod: ExpenseView["paymentMethod"];
    receiptKey?: string;
    notes?: string;
    loggedBy: string;
    owner: string;
    admins: string[];
    editors: string[];
    viewers: string[];
  },
) => client.models.Expense.create(input);

export const deleteExpense = async (expenseId: string) =>
  client.models.Expense.delete({ id: expenseId });
