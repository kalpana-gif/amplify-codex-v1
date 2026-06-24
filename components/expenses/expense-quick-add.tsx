"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BudgetActionButton } from "@/components/budget/budget-action-button";
import {
  ExpenseEntryForm,
  type ExpenseFormCollaborators,
} from "@/components/expenses/expense-form";
import { Modal } from "@/components/ui/modal";
import type { BudgetOverview, CurrentUser, ExpenseView } from "@/types";

export function ExpenseQuickAdd({
  budget,
  currency,
  eventId,
  user,
  collaborators,
  onCreated,
  remainingAmount,
}: {
  budget: BudgetOverview;
  currency: string;
  eventId: string;
  user: CurrentUser;
  collaborators: ExpenseFormCollaborators;
  onCreated: (expense: ExpenseView) => void;
  remainingAmount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <BudgetActionButton
        aria-label="Add expense"
        icon={<Plus className="h-4 w-4" />}
        label="Add Expense"
        title="Add expense"
        onClick={() => setIsOpen(true)}
      />

      <Modal
        className="max-w-4xl"
        description="Add an expense from the table using the same fields as the main form."
        open={isOpen}
        title="Add Expense"
        onClose={() => setIsOpen(false)}
      >
        <ExpenseEntryForm
          budget={budget}
          collaborators={collaborators}
          currency={currency}
          eventId={eventId}
          mode="modal"
          remainingAmount={remainingAmount}
          user={user}
          onCreated={onCreated}
          onSubmitted={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}
