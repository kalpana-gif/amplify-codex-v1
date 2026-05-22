"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, varianceTone } from "@/lib/utils";
import type { LineItemView } from "@/types";

export function LineItemRow({
  item,
  currency,
  canEdit,
  onSave,
  onDelete,
}: {
  item: LineItemView;
  currency: string;
  canEdit: boolean;
  onSave: (id: string, description: string, plannedAmount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const actionButtonClass = "h-9 w-9 rounded-xl px-0";
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [description, setDescription] = useState(item.description);
  const [plannedAmount, setPlannedAmount] = useState(item.plannedAmount / 100);
  const tone = varianceTone(item.plannedAmount, item.actualAmount);

  return (
    <>
      <tr className="border-t border-slate-100 bg-white">
        <td className="px-4 py-3 text-sm text-slate-600">
          {editing ? (
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          ) : (
            <div className="pl-8">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="font-medium text-slate-700">{description}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Line item
                </span>
              </div>
              {item.notes ? (
                <p className="mt-1 pl-4 text-xs leading-5 text-slate-500">
                  {item.notes}
                </p>
              ) : null}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-950">
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
            formatCurrency(item.plannedAmount, currency)
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-950">
          {formatCurrency(item.actualAmount, currency)}
        </td>
        <td
          className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
            tone === "danger"
              ? "text-red-600"
              : tone === "warning"
                ? "text-amber-600"
                : "text-emerald-600"
          }`}
        >
          {formatCurrency(item.variance, currency)}
        </td>
        <td className="px-4 py-3 text-right">
          {canEdit ? (
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={actionButtonClass}
                    title="Cancel"
                    aria-label={`Cancel editing ${item.description}`}
                    onClick={() => {
                      setDescription(item.description);
                      setPlannedAmount(item.plannedAmount / 100);
                      setEditing(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className={actionButtonClass}
                    title="Save line item"
                    aria-label={`Save ${item.description}`}
                    onClick={() => {
                      void onSave(item.id, description, Math.round(plannedAmount * 100))
                        .then(() => {
                          toast.success("Line item updated.");
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
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={actionButtonClass}
                    title="Edit line item"
                    aria-label={`Edit ${item.description}`}
                    onClick={() => {
                      setDescription(item.description);
                      setPlannedAmount(item.plannedAmount / 100);
                      setEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${actionButtonClass} text-red-600 hover:text-red-700`}
                    title="Delete line item"
                    aria-label={`Delete ${item.description}`}
                    onClick={() => {
                      if (item.actualAmount > 0) {
                        toast.error("Cannot delete a line item with recorded spend.");
                        return;
                      }

                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </td>
      </tr>

      <Modal
        className="max-w-md"
        description={`This will permanently remove "${item.description}" from the category.`}
        open={deleteOpen}
        title={`Delete line item "${item.description}"?`}
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
              void onDelete(item.id)
                .then(() => {
                  toast.success("Line item deleted.");
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
            {isDeleting ? "Deleting..." : "Delete Line Item"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
