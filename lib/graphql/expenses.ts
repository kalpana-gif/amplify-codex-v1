import { client, getUserPoolAuthOptions } from "@/lib/amplify-client";
import { getBudgetOverview } from "@/lib/graphql/budget";
import type { ExpenseView } from "@/types";

const asArray = <T>(data?: readonly T[] | T[] | null) =>
  Array.isArray(data) ? [...data] : [];

export const listExpensesForEvent = async (
  eventId: string,
): Promise<ExpenseView[]> => {
  const userPoolAuth = await getUserPoolAuthOptions();
  const [expensesResult, budgetOverview] = await Promise.all([
    client.models.Expense.list({
      ...userPoolAuth,
      filter: { eventId: { eq: eventId } },
    }),
    getBudgetOverview(eventId),
  ]);

  const categoryPairs =
    budgetOverview?.categories.map((category) => [category.id, category.name] as const) ?? [];
  const lineItemPairs =
    budgetOverview?.categories.flatMap((category) =>
      category.lineItems.map((lineItem) => [lineItem.id, lineItem.description] as const),
    ) ?? [];
  const categories = new Map(
    categoryPairs,
  );
  const lineItems = new Map(
    lineItemPairs,
  );

  return asArray(expensesResult.data)
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
) => client.models.Expense.create(input, await getUserPoolAuthOptions());

export const deleteExpense = async (expenseId: string) =>
  client.models.Expense.delete(
    { id: expenseId },
    await getUserPoolAuthOptions(),
  );
