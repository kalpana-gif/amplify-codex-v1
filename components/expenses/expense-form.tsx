"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { LoaderCircle, Paperclip, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptUpload } from "@/components/expenses/receipt-upload";
import { createExpense } from "@/lib/graphql/expenses";
import { formatCurrency } from "@/lib/utils";
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

type FormValues = z.infer<typeof schema>;

export function ExpenseForm({
  budget,
  currency,
  eventId,
  user,
  collaborators,
  onCreated,
}: {
  budget: BudgetOverview;
  currency: string;
  eventId: string;
  user: CurrentUser;
  collaborators: {
    admins: string[];
    editors: string[];
    viewers: string[];
  };
  onCreated: (expense: ExpenseView) => void;
}) {
  const [receiptKey, setReceiptKey] = useState<string>();
  const [pendingExpenseId, setPendingExpenseId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      vendor: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "CARD",
      categoryId: budget.categories[0]?.id ?? "",
      lineItemId: budget.categories[0]?.lineItems[0]?.id ?? "",
      notes: "",
    },
  });

  const selectedCategoryId = useWatch({
    control: form.control,
    name: "categoryId",
  });
  const selectedCategory = budget.categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const spent = budget.totalActual;
  const remaining = Math.max(budget.totalAmount - spent, 0);

  useEffect(() => {
    const nextLineItemId = selectedCategory?.lineItems[0]?.id ?? "";

    form.setValue("lineItemId", nextLineItemId);
  }, [form, selectedCategory?.lineItems, selectedCategoryId]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Add Expense</h2>
          <p className="mt-1 text-sm text-slate-600">
            New expenses appear immediately in the table below.
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-slate-950 px-4 py-3 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Remaining
          </p>
          <p className="mt-1 text-sm font-semibold">{formatCurrency(remaining, currency)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200/80 bg-slate-950/[0.03] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
            <Wallet className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Budget note</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Confirm each expense against the correct category and line item so
              actual spend stays useful for future planning and reporting.
            </p>
          </div>
        </div>
      </div>

      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
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

                onCreated({
                  id: result.data.id,
                  lineItemId: result.data.lineItemId,
                  categoryId: result.data.categoryId,
                  eventId: result.data.eventId,
                  amount: result.data.amount,
                  vendor: result.data.vendor,
                  expenseDate: result.data.expenseDate,
                  paymentMethod: result.data.paymentMethod,
                  receiptKey: result.data.receiptKey,
                  notes: result.data.notes,
                  loggedBy: result.data.loggedBy,
                  categoryName:
                    budget.categories.find((category) => category.id === result.data?.categoryId)?.name ??
                    "Unassigned",
                  lineItemDescription:
                    budget.categories
                      .flatMap((category) => category.lineItems)
                      .find((lineItem) => lineItem.id === result.data?.lineItemId)
                      ?.description ?? "Unassigned",
                });
                toast.success("Expense added.");
                form.reset({
                  amount: 0,
                  vendor: "",
                  expenseDate: new Date().toISOString().slice(0, 10),
                  paymentMethod: "CARD",
                  categoryId: budget.categories[0]?.id ?? "",
                  lineItemId: budget.categories[0]?.lineItems[0]?.id ?? "",
                  notes: "",
                });
                setPendingExpenseId(crypto.randomUUID());
                setReceiptKey(undefined);
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
            type="number"
            min="0"
            step="0.01"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Vendor</span>
          <Input {...form.register("vendor")} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <Input type="date" {...form.register("expenseDate")} />
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
            {...form.register("lineItemId")}
            disabled={!selectedCategory?.lineItems.length}
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
            size="lg"
            type="submit"
            disabled={submitting}
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
    </Card>
  );
}
