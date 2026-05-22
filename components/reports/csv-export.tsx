"use client";

import { Button } from "@/components/ui/button";
import type { ExpenseView } from "@/types";

export function CSVExport({
  expenses,
  filename,
}: {
  expenses: ExpenseView[];
  filename: string;
}) {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        const header = [
          "Date",
          "Vendor",
          "Category",
          "Line Item",
          "Amount",
          "Payment Method",
          "Logged By",
        ];
        const rows = expenses.map((expense) => [
          expense.expenseDate,
          expense.vendor,
          expense.categoryName ?? "",
          expense.lineItemDescription ?? "",
          (expense.amount / 100).toFixed(2),
          expense.paymentMethod,
          expense.loggedBy,
        ]);
        const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }}
    >
      Download CSV
    </Button>
  );
}
