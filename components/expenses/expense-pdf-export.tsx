"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { BudgetActionButton } from "@/components/budget/budget-action-button";
import { BRANDING } from "@/config/branding.mjs";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetOverview, ExpenseView } from "@/types";

const PDF_COLORS = {
  ink: [15, 23, 42] as const,
  muted: [100, 116, 139] as const,
  panel: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
  brand: [30, 58, 95] as const,
  brandSoft: [232, 240, 251] as const,
  accent: [46, 117, 182] as const,
  accentSoft: [233, 242, 252] as const,
  positive: [5, 150, 105] as const,
  positiveSoft: [220, 252, 231] as const,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "expenses";

const formatExportDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);

const getExpenseRowHeight = (pdf: jsPDF, expense: ExpenseView) => {
  const vendorLines = pdf.splitTextToSize(expense.vendor || "Unassigned", 34);
  const notesLines = expense.notes ? pdf.splitTextToSize(expense.notes, 34) : [];
  const categoryLines = pdf.splitTextToSize(expense.categoryName || "Unassigned", 34);
  const lineItemLines = pdf.splitTextToSize(
    expense.lineItemDescription || "Unassigned",
    34,
  );

  const leftColumnHeight = vendorLines.length * 3.6 + notesLines.length * 3.2;
  const middleColumnHeight = categoryLines.length * 3.6 + lineItemLines.length * 3.2;

  return Math.max(10, Math.max(leftColumnHeight, middleColumnHeight) + 5.2);
};

export function ExpensePDFExport({
  budget,
  eventName,
  expenses,
}: {
  budget: BudgetOverview;
  eventName: string;
  expenses: ExpenseView[];
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((left, right) =>
        right.expenseDate.localeCompare(left.expenseDate),
      ),
    [expenses],
  );

  const handleDownload = () => {
    setIsDownloading(true);

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const exportDate = new Date();
      const currentSpend = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const remaining = Math.max(budget.totalAmount - currentSpend, 0);
      const metrics = [
        {
          label: "Approved",
          value: formatCurrency(budget.totalAmount, budget.currency),
          fill: PDF_COLORS.brandSoft,
          accent: PDF_COLORS.brand,
        },
        {
          label: "Current Spend",
          value: formatCurrency(currentSpend, budget.currency),
          fill: PDF_COLORS.accentSoft,
          accent: PDF_COLORS.accent,
        },
        {
          label: "Remaining",
          value: formatCurrency(remaining, budget.currency),
          fill: PDF_COLORS.positiveSoft,
          accent: PDF_COLORS.positive,
        },
        {
          label: "Expense Rows",
          value: String(sortedExpenses.length),
          fill: [241, 245, 249] as const,
          accent: [71, 85, 105] as const,
        },
      ];
      let y = margin;

      const addPage = () => {
        pdf.addPage();
        y = margin;
      };

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight <= pageHeight - margin) {
          return;
        }

        addPage();
      };

      const applyTextColor = (color: readonly [number, number, number]) => {
        pdf.setTextColor(color[0], color[1], color[2]);
      };

      const applyFillColor = (color: readonly [number, number, number]) => {
        pdf.setFillColor(color[0], color[1], color[2]);
      };

      const drawMetricCard = (
        x: number,
        top: number,
        width: number,
        label: string,
        value: string,
        fill: readonly [number, number, number],
        accent: readonly [number, number, number],
      ) => {
        pdf.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
        applyFillColor(fill);
        pdf.roundedRect(x, top, width, 18, 4, 4, "FD");
        applyFillColor(accent);
        pdf.roundedRect(x, top, width, 2.4, 4, 4, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        applyTextColor(PDF_COLORS.muted);
        pdf.text(label.toUpperCase(), x + 4, top + 7.2);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11.5);
        applyTextColor(PDF_COLORS.ink);
        pdf.text(value, x + 4, top + 13.6);
      };

      const drawTableHeader = () => {
        applyFillColor(PDF_COLORS.brand);
        pdf.roundedRect(margin, y, contentWidth, 8, 2.5, 2.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text("DATE", margin + 3, y + 5.2);
        pdf.text("VENDOR", margin + 26, y + 5.2);
        pdf.text("CATEGORY", margin + 74, y + 5.2);
        pdf.text("PAYMENT", margin + 121, y + 5.2);
        pdf.text("AMOUNT", margin + 146, y + 5.2);
        pdf.text("RECEIPT", margin + 171, y + 5.2);
        y += 8;
      };

      const drawFooter = () => {
        const totalPages = pdf.getNumberOfPages();

        for (let page = 1; page <= totalPages; page += 1) {
          pdf.setPage(page);
          pdf.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
          pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          applyTextColor(PDF_COLORS.muted);
          pdf.text(BRANDING.fullName, margin, pageHeight - 5.8);
          pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 5.8, {
            align: "right",
          });
        }
      };

      applyFillColor(PDF_COLORS.brand);
      pdf.roundedRect(margin, y, contentWidth, 24, 6, 6, "F");
      applyFillColor(PDF_COLORS.accent);
      pdf.roundedRect(pageWidth - margin - 52, y + 3.5, 40, 6.5, 3, 3, "F");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text("EXPENSE REPORT", margin + 4, y + 5.5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18.5);
      pdf.text(eventName, margin + 4, y + 12.8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.6);
      pdf.setTextColor(230, 238, 248);
      pdf.text(BRANDING.fullName, margin + 4, y + 18.2);
      pdf.setTextColor(255, 255, 255);
      pdf.text(
        `Exported ${formatExportDate(exportDate)}`,
        pageWidth - margin - 32,
        y + 8.1,
        { align: "right" },
      );
      y += 30;

      const cardGap = 3;
      const cardsPerRow = 2;
      const cardWidth = (contentWidth - cardGap * (cardsPerRow - 1)) / cardsPerRow;

      metrics.forEach((metric, index) => {
        const row = Math.floor(index / cardsPerRow);
        const column = index % cardsPerRow;
        const x = margin + column * (cardWidth + cardGap);
        const top = y + row * 21;
        drawMetricCard(
          x,
          top,
          cardWidth,
          metric.label,
          metric.value,
          metric.fill,
          metric.accent,
        );
      });

      y += Math.ceil(metrics.length / cardsPerRow) * 21 + 6;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      applyTextColor(PDF_COLORS.ink);
      pdf.text("Expense Details", margin, y + 4.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      applyTextColor(PDF_COLORS.muted);
      pdf.text(
        "Each logged expense includes vendor, category, line item, payment method, and receipt status.",
        margin,
        y + 9.2,
      );
      y += 14;

      drawTableHeader();

      if (!sortedExpenses.length) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        applyTextColor(PDF_COLORS.muted);
        pdf.text("No expenses have been added yet.", margin + 3, y + 6);
        y += 10;
      } else {
        sortedExpenses.forEach((expense, index) => {
          const rowHeight = getExpenseRowHeight(pdf, expense);
          ensureSpace(rowHeight + 2);

          if (y === margin) {
            drawTableHeader();
          }

          pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
          pdf.rect(margin, y, contentWidth, rowHeight, "F");

          const vendorLines = pdf.splitTextToSize(expense.vendor || "Unassigned", 34);
          const notesLines = expense.notes ? pdf.splitTextToSize(expense.notes, 34) : [];
          const categoryLines = pdf.splitTextToSize(expense.categoryName || "Unassigned", 34);
          const lineItemLines = pdf.splitTextToSize(
            expense.lineItemDescription || "Unassigned",
            34,
          );

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.1);
          applyTextColor(PDF_COLORS.ink);
          pdf.text(formatDate(expense.expenseDate), margin + 3, y + 5.2);

          pdf.setFont("helvetica", "bold");
          pdf.text(vendorLines, margin + 26, y + 4.8);

          if (notesLines.length) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.4);
            applyTextColor(PDF_COLORS.muted);
            pdf.text(notesLines, margin + 26, y + 4.8 + vendorLines.length * 3.8);
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.1);
          applyTextColor(PDF_COLORS.ink);
          pdf.text(categoryLines, margin + 74, y + 4.8);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.4);
          applyTextColor(PDF_COLORS.muted);
          pdf.text(lineItemLines, margin + 74, y + 4.8 + categoryLines.length * 3.8);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.1);
          applyTextColor(PDF_COLORS.ink);
          pdf.text(expense.paymentMethod, margin + 121, y + 5.2);
          pdf.text(formatCurrency(expense.amount, budget.currency), margin + 146, y + 5.2);
          pdf.text(expense.receiptKey ? "Uploaded" : "None", margin + 171, y + 5.2);

          pdf.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
          pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
          y += rowHeight;
        });
      }

      drawFooter();
      pdf.save(`${slugify(eventName)}-expense-report.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <BudgetActionButton
      disabled={isDownloading}
      icon={<Download className="h-4 w-4" />}
      label={isDownloading ? "Preparing PDF..." : "Download Expense PDF"}
      title="Download expense PDF"
      onClick={handleDownload}
    />
  );
}
