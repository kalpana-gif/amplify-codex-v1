"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LineItemRow } from "@/components/budget/line-item-row";
import { formatCurrency, varianceTone } from "@/lib/utils";
import type { BudgetCategoryView } from "@/types";

export function CategoryRow({
  category,
  currency,
  canEdit,
  onSaveCategory,
  onSaveLineItem,
  onAddLineItem,
  onDeleteCategory,
  onDeleteLineItem,
}: {
  category: BudgetCategoryView;
  currency: string;
  canEdit: boolean;
  onSaveCategory: (id: string, name: string, plannedAmount: number) => Promise<void>;
  onSaveLineItem: (id: string, description: string, plannedAmount: number) => Promise<void>;
  onAddLineItem: (categoryId: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteLineItem: (id: string) => Promise<void>;
}) {
  const actionButtonClass = "h-9 w-9 rounded-xl px-0";
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(category.name);
  const [plannedAmount, setPlannedAmount] = useState(category.plannedAmount / 100);
  const tone = varianceTone(category.plannedAmount, category.actualAmount);
  const lineItemCount = category.lineItems.length;
  const allocatedAmount = category.lineItems.reduce(
    (sum, lineItem) => sum + lineItem.plannedAmount,
    0,
  );
  const allocationGap = category.plannedAmount - allocatedAmount;
  const allocationTone =
    allocationGap < 0 ? "text-red-600" : allocationGap === 0 ? "text-emerald-600" : "text-slate-500";

  const allocationSummary =
    lineItemCount === 0
      ? "No line items yet"
      : allocationGap < 0
        ? `${lineItemCount} line items • ${formatCurrency(Math.abs(allocationGap), currency)} over allocated`
        : allocationGap === 0
          ? `${lineItemCount} line items • fully allocated`
          : `${lineItemCount} line items • ${formatCurrency(allocationGap, currency)} unallocated`;

  return (
    <>
      <tr className="border-t border-slate-200">
        <td className="px-4 py-4 align-top">
          <button
            className="flex items-start gap-2 text-left text-sm font-medium text-slate-950"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {editing ? (
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="max-w-56"
              />
            ) : (
              <div>
                <span className="inline-flex rounded-full bg-slate-950/[0.03] px-3 py-1.5 text-base">
                  {name}
                </span>
                <p className={`mt-2 text-xs font-medium ${allocationTone}`}>
                  {allocationSummary}
                </p>
              </div>
            )}
          </button>
        </td>
        <td className="px-4 py-4 text-right text-sm text-slate-950 align-top">
          {editing ? (
            <Input
              className="ml-auto max-w-36 text-right tabular-nums"
              type="number"
              min="0"
              step="0.01"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(Number(event.target.value))}
            />
          ) : (
            <div>
              <div className="font-medium tabular-nums">
                {formatCurrency(category.plannedAmount, currency)}
              </div>
              {lineItemCount > 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Allocated {formatCurrency(allocatedAmount, currency)}
                </p>
              ) : null}
            </div>
          )}
        </td>
        <td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-slate-950 align-top">
          {formatCurrency(category.actualAmount, currency)}
        </td>
        <td
          className={`px-4 py-4 text-right text-sm font-semibold tabular-nums align-top ${
            tone === "danger"
              ? "text-red-600"
              : tone === "warning"
                ? "text-amber-600"
                : "text-emerald-600"
          }`}
        >
          {formatCurrency(category.variance, currency)}
        </td>
        <td className="px-4 py-4 text-right">
          {canEdit ? (
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={actionButtonClass}
                    title="Cancel"
                    aria-label={`Cancel editing ${category.name}`}
                    onClick={() => {
                      setName(category.name);
                      setPlannedAmount(category.plannedAmount / 100);
                      setEditing(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className={actionButtonClass}
                    title="Save category"
                    aria-label={`Save ${category.name}`}
                    onClick={() => {
                      void onSaveCategory(
                        category.id,
                        name,
                        Math.round(plannedAmount * 100),
                      )
                        .then(() => {
                          toast.success("Category updated.");
                          setEditing(false);
                        })
                        .catch((error) =>
                          toast.error(
                            error instanceof Error ? error.message : "Update failed.",
                          ),
                        );
                    }}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className={actionButtonClass}
                  title="Edit category"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => {
                    setName(category.name);
                    setPlannedAmount(category.plannedAmount / 100);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className={actionButtonClass}
                title="Add line item"
                aria-label={`Add line item to ${category.name}`}
                onClick={() => void onAddLineItem(category.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`${actionButtonClass} text-red-600 hover:text-red-700`}
                title="Delete category"
                aria-label={`Delete ${category.name}`}
                onClick={() => {
                  if (category.actualAmount > 0) {
                    toast.error("Cannot delete a category with recorded spend.");
                    return;
                  }

                  if (category.lineItems.length > 0) {
                    toast.error("Delete the line items in this category first.");
                    return;
                  }

                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </td>
      </tr>
      {open
        ? category.lineItems.map((lineItem) => (
            <LineItemRow
              key={lineItem.id}
              item={lineItem}
              currency={currency}
              canEdit={canEdit}
              onSave={onSaveLineItem}
              onDelete={onDeleteLineItem}
            />
          ))
        : null}

      <Modal
        className="max-w-md"
        description={`This will permanently remove "${category.name}" from the budget.`}
        open={deleteOpen}
        title={`Delete category "${category.name}"?`}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
          }
        }}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isDeleting}
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={isDeleting}
            variant="danger"
            onClick={() => {
              setIsDeleting(true);
              void onDeleteCategory(category.id)
                .then(() => {
                  toast.success("Category deleted.");
                  setDeleteOpen(false);
                })
                .catch((error) =>
                  toast.error(
                    error instanceof Error ? error.message : "Delete failed.",
                  ),
                )
                .finally(() => {
                  setIsDeleting(false);
                });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Category"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
