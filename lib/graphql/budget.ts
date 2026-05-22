import { client } from "@/lib/amplify-client";
import { calcVariance } from "@/lib/utils";
import type { BudgetCategoryView, BudgetOverview, CurrencyCode } from "@/types";

const buildBudgetMetrics = (
  categories: Array<{
    id: string;
    plannedAmount: number;
  }>,
  expenses: Array<{
    categoryId: string;
    lineItemId: string;
    amount: number;
  }>,
) => {
  const actualByCategory = new Map<string, number>();
  const actualByLineItem = new Map<string, number>();

  for (const expense of expenses) {
    actualByCategory.set(
      expense.categoryId,
      (actualByCategory.get(expense.categoryId) ?? 0) + expense.amount,
    );
    actualByLineItem.set(
      expense.lineItemId,
      (actualByLineItem.get(expense.lineItemId) ?? 0) + expense.amount,
    );
  }

  const totalPlanned = categories.reduce(
    (sum, category) => sum + category.plannedAmount,
    0,
  );
  const totalActual = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    actualByCategory,
    actualByLineItem,
    totalPlanned,
    totalActual,
    variance: calcVariance(totalPlanned, totalActual),
  };
};

export const getBudgetOverview = async (
  eventId: string,
): Promise<BudgetOverview | null> => {
  const [budgetResult, expensesResult] = await Promise.all([
    client.models.Budget.list({
      authMode: "userPool",
      filter: {
        eventId: { eq: eventId },
      },
      selectionSet: [
        "id",
        "eventId",
        "totalAmount",
        "currency",
        "categories.id",
        "categories.budgetId",
        "categories.name",
        "categories.plannedAmount",
        "categories.order",
        "categories.color",
        "categories.lineItems.id",
        "categories.lineItems.categoryId",
        "categories.lineItems.description",
        "categories.lineItems.plannedAmount",
        "categories.lineItems.notes",
        "categories.lineItems.attachmentKey",
      ],
    }),
    client.models.Expense.list({
      authMode: "userPool",
      filter: {
        eventId: { eq: eventId },
      },
      selectionSet: ["id", "categoryId", "lineItemId", "amount"],
    }),
  ]);

  const budget = budgetResult.data[0];

  if (!budget) {
    return null;
  }

  const metrics = buildBudgetMetrics(
    (budget.categories ?? []).map((category) => ({
      id: category.id,
      plannedAmount: category.plannedAmount,
    })),
    expensesResult.data,
  );

  const categories = (budget.categories ?? [])
    .map((category) => ({
      id: category.id,
      budgetId: category.budgetId,
      name: category.name,
      plannedAmount: category.plannedAmount,
      actualAmount: metrics.actualByCategory.get(category.id) ?? 0,
      variance: calcVariance(
        category.plannedAmount,
        metrics.actualByCategory.get(category.id) ?? 0,
      ),
      order: category.order,
      color: category.color,
      lineItems: (category.lineItems ?? []).map((lineItem) => ({
        id: lineItem.id,
        categoryId: lineItem.categoryId,
        description: lineItem.description,
        plannedAmount: lineItem.plannedAmount,
        actualAmount: metrics.actualByLineItem.get(lineItem.id) ?? 0,
        variance: calcVariance(
          lineItem.plannedAmount,
          metrics.actualByLineItem.get(lineItem.id) ?? 0,
        ),
        notes: lineItem.notes,
        attachmentKey: lineItem.attachmentKey,
      })),
    }))
    .sort((first, second) => first.order - second.order) satisfies BudgetCategoryView[];

  return {
    id: budget.id,
    eventId: budget.eventId,
    totalAmount: budget.totalAmount,
    totalPlanned: metrics.totalPlanned,
    totalActual: metrics.totalActual,
    variance: metrics.variance,
    currency: budget.currency as CurrencyCode,
    categories,
  };
};

export const updateBudgetCategory = async (
  categoryId: string,
  input: Partial<{
    name: string;
    plannedAmount: number;
    color: string;
  }>,
) =>
  client.models.BudgetCategory.update(
    { id: categoryId, ...input },
    { authMode: "userPool" },
  );

export const updateLineItem = async (
  lineItemId: string,
  input: Partial<{
    description: string;
    plannedAmount: number;
    notes: string;
    attachmentKey: string;
  }>,
) =>
  client.models.LineItem.update(
    { id: lineItemId, ...input },
    { authMode: "userPool" },
  );

export const createBudgetCategory = async (
  budgetId: string,
  input: {
    name: string;
    plannedAmount: number;
    order: number;
    color: string;
    owner: string;
    admins: string[];
    editors: string[];
    viewers: string[];
  },
) =>
  client.models.BudgetCategory.create(
    {
      budgetId,
      actualAmount: 0,
      ...input,
    },
    { authMode: "userPool" },
  );

export const createLineItem = async (
  categoryId: string,
  input: {
    description: string;
    plannedAmount: number;
    notes?: string;
    attachmentKey?: string;
    owner: string;
    admins: string[];
    editors: string[];
    viewers: string[];
  },
) =>
  client.models.LineItem.create(
    {
      categoryId,
      description: input.description,
      plannedAmount: input.plannedAmount,
      notes: input.notes,
      attachmentKey: input.attachmentKey,
      owner: input.owner,
      admins: input.admins,
      editors: input.editors,
      viewers: input.viewers,
    },
    { authMode: "userPool" },
  );

export const deleteBudgetCategory = async (categoryId: string) =>
  client.models.BudgetCategory.delete(
    { id: categoryId },
    { authMode: "userPool" },
  );

export const deleteLineItem = async (lineItemId: string) =>
  client.models.LineItem.delete(
    { id: lineItemId },
    { authMode: "userPool" },
  );
