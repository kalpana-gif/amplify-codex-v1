"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { LoaderCircle, Paperclip, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptUpload } from "@/components/expenses/receipt-upload";
import { createExpense } from "@/lib/graphql/expenses";
import { cn, formatCurrency } from "@/lib/utils";
import type { BudgetOverview, CurrentUser, ExpenseView, PaymentMethod } from "@/types";

const schema = z.object({
  amount: z.number().min(0.01),
  vendor: z.string().min(2),
  expenseDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CHECK", "OTHER"]),
  categoryId: z.string().min(1),
  lineItemId: z.string().min(1),
  notes: z.string().optional(),
});

export type ExpenseFormCollaborators = {
  admins: string[];
  editors: string[];
  viewers: string[];
};

type FormValues = z.infer<typeof schema>;

const buildDefaultValues = (budget: BudgetOverview): FormValues => ({
  amount: 0,
  vendor: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "CARD",
  categoryId: budget.categories[0]?.id ?? "",
  lineItemId: budget.categories[0]?.lineItems[0]?.id ?? "",
  notes: "",
});

const buildExpenseView = (
  budget: BudgetOverview,
  result: {
    id: string;
    lineItemId: string;
    categoryId: string;
    eventId: string;
    amount: number;
    vendor: string;
    expenseDate: string;
    paymentMethod: PaymentMethod;
    receiptKey?: string | null;
    notes?: string | null;
    loggedBy: string;
  },
): ExpenseView => ({
  id: result.id,
  lineItemId: result.lineItemId,
  categoryId: result.categoryId,
  eventId: result.eventId,
  amount: result.amount,
  vendor: result.vendor,
  expenseDate: result.expenseDate,
  paymentMethod: result.paymentMethod,
  receiptKey: result.receiptKey,
  notes: result.notes,
  loggedBy: result.loggedBy,
  categoryName:
    budget.categories.find((category) => category.id === result.categoryId)?.name ??
    "Unassigned",
  lineItemDescription:
    budget.categories
      .flatMap((category) => category.lineItems)
      .find((lineItem) => lineItem.id === result.lineItemId)
      ?.description ?? "Unassigned",
});

type ExpenseEntryFormProps = {
  budget: BudgetOverview;
  currency: string;
  eventId: string;
  user: CurrentUser;
  collaborators: ExpenseFormCollaborators;
  onCreated: (expense: ExpenseView) => void;
  onSubmitted?: () => void;
  mode?: "panel" | "modal";
  remainingAmount?: number;
};

export function ExpenseEntryForm({
  budget,
  currency,
  eventId,
  user,
  collaborators,
  onCreated,
  onSubmitted,
  mode = "panel",
  remainingAmount,
}: ExpenseEntryFormProps) {
  const [receiptKey, setReceiptKey] = useState<string>();
  const [pendingExpenseId, setPendingExpenseId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const isModal = mode === "modal";
  const remaining =
    remainingAmount ?? Math.max(budget.totalAmount - budget.totalActual, 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(budget),
  });

  const selectedCategoryId = useWatch({
    control: form.control,
    name: "categoryId",
  });
  const selectedCategory = budget.categories.find(
    (category) => category.id === selectedCategoryId,
  );

  useEffect(() => {
    const nextLineItemId = selectedCategory?.lineItems[0]?.id ?? "";

    form.setValue("lineItemId", nextLineItemId);
  }, [form, selectedCategory?.lineItems, selectedCategoryId]);

  return (
    <>
      {isModal ? (
        <div className="rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Expense Entry
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Use the same details as the main expense form.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-3.5 py-2.5 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Remaining
              </p>
              <p className="mt-1 text-sm font-semibold leading-none">
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Add Expense</h2>
              <p className="mt-1 text-sm text-slate-600">Log a new expense.</p>
            </div>
            <div className="rounded-full bg-slate-950 px-3.5 py-2.5 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Remaining
              </p>
              <p className="mt-1 text-sm font-semibold leading-none">
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-3 rounded-[1rem] border border-slate-200/80 bg-slate-950/[0.03] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                <Wallet className="h-4 w-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-600">
                  Match each expense to the correct category and line item.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <form
        className={cn("grid gap-3 md:grid-cols-2", isModal ? "mt-5" : "mt-4")}
        onSubmit={form.handleSubmit((values) => {
          setSubmitting(true);

          startTransition(() => {
            void createExpense({
              id: pendingExpenseId,
              lineItemId: values.lineItemId,
              categoryId: values.categoryId,
              eventId,
              amount: Math.round(values.amount * 100),
              vendor: values.vendor,
              expenseDate: values.expenseDate,
              paymentMethod: values.paymentMethod as PaymentMethod,
              receiptKey,
              notes: values.notes,
              loggedBy: user.email,
              owner: user.email,
              admins: collaborators.admins,
              editors: collaborators.editors,
              viewers: collaborators.viewers,
            })
              .then((result) => {
                if (!result.data) {
                  throw new Error("Failed to create expense.");
                }

                onCreated(buildExpenseView(budget, result.data));
                toast.success("Expense added.");
                form.reset(buildDefaultValues(budget));
                setPendingExpenseId(crypto.randomUUID());
                setReceiptKey(undefined);
                onSubmitted?.();
              })
              .catch((error) =>
                toast.error(
                  error instanceof Error ? error.message : "Failed to add expense.",
                ),
              )
              .finally(() => setSubmitting(false));
          });
        })}
      >
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Amount ({currency})</span>
          <Input
            min="0"
            step="0.01"
            type="number"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Vendor</span>
          <Input {...form.register("vendor")} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <Controller
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
              <DateInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Payment Method</span>
          <Select {...form.register("paymentMethod")}>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CHECK">Check</option>
            <option value="OTHER">Other</option>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <Select {...form.register("categoryId")}>
            {budget.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Line Item</span>
          <Select
            disabled={!selectedCategory?.lineItems.length}
            {...form.register("lineItemId")}
          >
            {(selectedCategory?.lineItems ?? []).map((lineItem) => (
              <option key={lineItem.id} value={lineItem.id}>
                {lineItem.description}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <Textarea {...form.register("notes")} />
        </label>
        <div className="md:col-span-2">
          <ReceiptUpload
            expenseId={pendingExpenseId}
            onUploaded={(key) => setReceiptKey(key)}
          />
        </div>
        <div className="md:col-span-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Paperclip className="h-4 w-4" />
            Attach receipts when available for auditability.
          </div>
          <Button
            className="w-full md:w-auto md:min-w-[176px]"
            disabled={submitting}
            size="lg"
            type="submit"
          >
            {submitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                Add Expense
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

export function ExpenseForm(props: ExpenseEntryFormProps) {
  return (
    <Card className="p-4">
      <ExpenseEntryForm {...props} mode="panel" />
    </Card>
  );
}
