"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { BudgetActionButton } from "@/components/budget/budget-action-button";
import { formatCurrency } from "@/lib/utils";
import type { BudgetOverview, LineItemView } from "@/types";
import { BRANDING } from "@/config/branding.mjs";

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
  danger: [220, 38, 38] as const,
  dangerSoft: [254, 242, 242] as const,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "budget";

const formatExportDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);

const buildMetrics = (budget: BudgetOverview) => {
  const approvedGap = budget.totalAmount - budget.totalPlanned;

  return [
    {
      label: "Approved",
      value: formatCurrency(budget.totalAmount, budget.currency),
      fill: PDF_COLORS.brandSoft,
      accent: PDF_COLORS.brand,
    },
    {
      label: "Planned",
      value: formatCurrency(budget.totalPlanned, budget.currency),
      fill: PDF_COLORS.accentSoft,
      accent: PDF_COLORS.accent,
    },
    {
      label: "Actual",
      value: formatCurrency(budget.totalActual, budget.currency),
      fill: [241, 245, 249] as const,
      accent: [71, 85, 105] as const,
    },
    {
      label: "Plan Remaining",
      value: formatCurrency(budget.variance, budget.currency),
      fill: PDF_COLORS.positiveSoft,
      accent: PDF_COLORS.positive,
    },
    {
      label: "Gap",
      value: formatCurrency(Math.abs(approvedGap), budget.currency),
      fill: approvedGap < 0 ? PDF_COLORS.dangerSoft : PDF_COLORS.brandSoft,
      accent: approvedGap < 0 ? PDF_COLORS.danger : PDF_COLORS.brand,
    },
  ];
};

const getLineItemRowHeight = (pdf: jsPDF, item: LineItemView, width: number) => {
  const descriptionLines = pdf.splitTextToSize(item.description, width);
  const notesLines = item.notes
    ? pdf.splitTextToSize(item.notes, width - 2)
    : [];

  return Math.max(8, descriptionLines.length * 4 + notesLines.length * 3.2 + 3);
};

export function BudgetPDFExport({
  budget,
  eventName,
}: {
  budget: BudgetOverview;
  eventName: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const exportDate = new Date();
      const metrics = buildMetrics(budget);
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

      const drawCategoryTableHeader = () => {
        applyFillColor(PDF_COLORS.brand);
        pdf.roundedRect(margin, y, contentWidth, 8, 2.5, 2.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text("LINE ITEM", margin + 3, y + 5.2);
        pdf.text("PLANNED", margin + 108, y + 5.2);
        pdf.text("ACTUAL", margin + 140, y + 5.2);
        pdf.text("REMAINING", margin + 166, y + 5.2);
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
      pdf.text("BUDGET PLANNER", margin + 4, y + 5.5);
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
      const cardsPerRow = 3;
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
      pdf.text("Category Breakdown", margin, y + 4.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      applyTextColor(PDF_COLORS.muted);
      pdf.text(
        "Each category includes its totals plus every line item planned, actual, and remaining.",
        margin,
        y + 9.2,
      );
      y += 14;

      budget.categories.forEach((category, categoryIndex) => {
        const categoryHeaderHeight = 19;
        const tableHeaderHeight = 8;
        const minimumBodyHeight = category.lineItems.length
          ? category.lineItems.reduce(
              (sum, item) => sum + getLineItemRowHeight(pdf, item, 78),
              0,
            )
          : 10;

        ensureSpace(categoryHeaderHeight + tableHeaderHeight + minimumBodyHeight + 8);

        pdf.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
        applyFillColor(PDF_COLORS.panel);
        pdf.roundedRect(margin, y, contentWidth, categoryHeaderHeight, 4, 4, "FD");
        const colorHex = category.color.replace("#", "");
        if (/^[0-9a-fA-F]{6}$/.test(colorHex)) {
          const red = Number.parseInt(colorHex.slice(0, 2), 16);
          const green = Number.parseInt(colorHex.slice(2, 4), 16);
          const blue = Number.parseInt(colorHex.slice(4, 6), 16);
          pdf.setFillColor(red, green, blue);
          pdf.roundedRect(margin, y, 4.5, categoryHeaderHeight, 4, 4, "F");
        } else {
          applyFillColor(PDF_COLORS.accent);
          pdf.roundedRect(margin, y, 4.5, categoryHeaderHeight, 4, 4, "F");
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        applyTextColor(PDF_COLORS.ink);
        pdf.text(`${categoryIndex + 1}. ${category.name}`, margin + 8, y + 6.8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        applyTextColor(PDF_COLORS.muted);
        pdf.text(
          `Planned ${formatCurrency(category.plannedAmount, budget.currency)}`,
          margin + 8,
          y + 12,
        );
        pdf.text(
          `Actual ${formatCurrency(category.actualAmount, budget.currency)}`,
          margin + 66,
          y + 12,
        );
        pdf.text(
          `Remaining ${formatCurrency(category.variance, budget.currency)}`,
          margin + 121,
          y + 12,
        );
        pdf.text(`${category.lineItems.length} items`, pageWidth - margin - 4, y + 12, {
          align: "right",
        });
        y += categoryHeaderHeight + 3;

        drawCategoryTableHeader();

        if (!category.lineItems.length) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8.5);
          applyTextColor(PDF_COLORS.muted);
          pdf.text("No line items have been added yet.", margin + 3, y + 6);
          y += 10;
          return;
        }

        category.lineItems.forEach((item, itemIndex) => {
          const rowHeight = getLineItemRowHeight(pdf, item, 78);
          ensureSpace(rowHeight + 2);

          if (y === margin) {
            drawCategoryTableHeader();
          }

          if (itemIndex % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
          } else {
            pdf.setFillColor(248, 250, 252);
          }
          pdf.rect(margin, y, contentWidth, rowHeight, "F");

          const descriptionLines = pdf.splitTextToSize(item.description, 78);
          const notesLines = item.notes
            ? pdf.splitTextToSize(item.notes, 76)
            : [];

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.6);
          applyTextColor(PDF_COLORS.ink);
          pdf.text(descriptionLines, margin + 3, y + 4.8);

          if (notesLines.length) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.4);
            applyTextColor(PDF_COLORS.muted);
            pdf.text(notesLines, margin + 3, y + 4.8 + descriptionLines.length * 4.1);
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.3);
          applyTextColor(PDF_COLORS.ink);
          pdf.text(
            formatCurrency(item.plannedAmount, budget.currency),
            margin + 108,
            y + 5.2,
          );
          pdf.text(
            formatCurrency(item.actualAmount, budget.currency),
            margin + 140,
            y + 5.2,
          );
          pdf.text(
            formatCurrency(item.variance, budget.currency),
            margin + 166,
            y + 5.2,
          );

          pdf.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
          pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
          y += rowHeight;
        });

        y += 5;
      });

      drawFooter();
      pdf.save(`${slugify(eventName)}-budget-report.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <BudgetActionButton
      disabled={isDownloading}
      icon={<Download className="h-4 w-4" />}
      label={isDownloading ? "Preparing PDF..." : "Download Budget PDF"}
      onClick={handleDownload}
      title="Download budget PDF"
    />
  );
}
