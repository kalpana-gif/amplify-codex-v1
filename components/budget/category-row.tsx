"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
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
  highlight = false,
  onSaveCategory,
  onSaveLineItem,
  onAddLineItem,
  onDeleteCategory,
  onDeleteLineItem,
}: {
  category: BudgetCategoryView;
  currency: string;
  canEdit: boolean;
  highlight?: boolean;
  onSaveCategory: (id: string, name: string, plannedAmount: number) => Promise<void>;
  onSaveLineItem: (id: string, description: string, plannedAmount: number) => Promise<void>;
  onAddLineItem: (input: {
    categoryId: string;
    description: string;
    plannedAmount: number;
  }) => Promise<string>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteLineItem: (id: string) => Promise<void>;
}) {
  const actionButtonClass = "h-9 w-9 rounded-xl px-0";
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLineItemDescription, setNewLineItemDescription] = useState("");
  const [newLineItemAmount, setNewLineItemAmount] = useState("");
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
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
  const toggleOpen = () => {
    if (editing) {
      return;
    }

    setOpen((value) => !value);
  };
  const stopRowToggle = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const openAddModal = () => {
    setNewLineItemDescription("");
    setNewLineItemAmount("");
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    if (isAdding) {
      return;
    }

    setAddModalOpen(false);
  };
  const plannedAmountValue = Number(newLineItemAmount);
  const hasValidAmount =
    newLineItemAmount.trim().length > 0 &&
    Number.isFinite(plannedAmountValue) &&
    plannedAmountValue >= 0;
  const canSubmitNewLineItem =
    newLineItemDescription.trim().length > 0 && hasValidAmount;

  useEffect(() => {
    if (!recentlyAddedId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRecentlyAddedId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [recentlyAddedId]);

  return (
    <>
      <tr
        aria-expanded={open}
        className={`group border-t border-slate-200 transition-colors duration-200 ${
          editing
            ? "bg-white"
            : highlight
              ? "bg-[linear-gradient(90deg,rgba(239,246,255,0.98),rgba(255,255,255,0.96))]"
              : open
              ? "bg-[linear-gradient(90deg,rgba(248,250,252,0.92),rgba(255,255,255,0.96))]"
              : "bg-white hover:bg-slate-50/90"
        } ${editing ? "" : "cursor-pointer"}`}
        onClick={toggleOpen}
      >
        <td className="px-4 py-4 align-middle">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-left text-sm font-medium text-slate-950">
            <span
              className={`self-center flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                open
                  ? "border-[rgba(46,117,182,0.18)] bg-[rgba(46,117,182,0.08)] text-[var(--color-primary)]"
                  : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700"
              }`}
            >
              <motion.span
                animate={{ rotate: open ? 90 : 0, scale: open ? 1 : 0.96 }}
                className="flex h-4 w-4 items-center justify-center origin-center"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
              </motion.span>
            </span>

            <div className="mt-0.5 flex min-w-0 items-start">
              {editing ? (
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="max-w-56"
                  onClick={stopRowToggle}
                />
              ) : (
                <div>
                  <span className="inline-flex rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[0.98rem] shadow-[0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-200 group-hover:border-slate-300">
                    {name}
                  </span>
                  <p className={`mt-2 text-xs font-medium ${allocationTone}`}>
                    {allocationSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
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
              onClick={stopRowToggle}
            />
          ) : (
            <div>
              <div className="font-semibold tabular-nums">
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
        <td className="px-4 py-4 text-right" onClick={stopRowToggle}>
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
                onClick={openAddModal}
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
      <AnimatePresence initial={false}>
        {open
          ? category.lineItems.map((lineItem, index) => (
              <LineItemRow
                key={lineItem.id}
                highlight={lineItem.id === recentlyAddedId}
                index={index}
                item={lineItem}
                currency={currency}
                canEdit={canEdit}
                onSave={onSaveLineItem}
                onDelete={onDeleteLineItem}
              />
            ))
          : null}
      </AnimatePresence>

      <Modal
        className="max-w-lg"
        description="Add a name and planned amount for the new line item."
        open={addModalOpen}
        title={`Add line item to ${category.name}`}
        onClose={closeAddModal}
      >
        <div className="space-y-5">
          <div className="rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Category
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950">
                  {category.name}
                </p>
              </div>
              <div className="rounded-[1rem] border border-[rgba(46,117,182,0.14)] bg-[rgba(46,117,182,0.06)] px-4 py-3 sm:min-w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Main Planned Budget
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                  {formatCurrency(category.plannedAmount, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Line item name
              </span>
              <Input
                autoFocus
                className="h-12 rounded-[1rem] border-slate-200/90 bg-slate-50/70 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                placeholder="Photographer advance"
                value={newLineItemDescription}
                onChange={(event) => setNewLineItemDescription(event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Planned amount ({currency})
              </span>
              <Input
                className="h-12 rounded-[1rem] border-slate-200/90 bg-slate-50/70 px-4 text-right text-[15px] tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={newLineItemAmount}
                onChange={(event) => setNewLineItemAmount(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button
              className="h-11 w-full rounded-[1rem] px-5 sm:w-auto"
              disabled={isAdding}
              variant="secondary"
              onClick={closeAddModal}
            >
              Cancel
            </Button>
            <Button
              className="h-11 w-full min-w-[180px] rounded-[1rem] px-5 sm:w-auto"
              disabled={!canSubmitNewLineItem || isAdding}
              onClick={() => {
                if (!canSubmitNewLineItem) {
                  toast.error("Add a line item name and planned amount first.");
                  return;
                }

                setIsAdding(true);
                setOpen(true);

                void onAddLineItem({
                  categoryId: category.id,
                  description: newLineItemDescription.trim(),
                  plannedAmount: Math.round(plannedAmountValue * 100),
                })
                  .then((createdId) => {
                    setRecentlyAddedId(createdId);
                    setAddModalOpen(false);
                    toast.success("Line item added.");
                  })
                  .catch((error) =>
                    toast.error(
                      error instanceof Error ? error.message : "Add line item failed.",
                    ),
                  )
                  .finally(() => {
                    setIsAdding(false);
                  });
              }}
            >
              {isAdding ? "Adding Line Item..." : "Add Line Item"}
            </Button>
          </div>
        </div>
      </Modal>

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
