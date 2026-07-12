"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  ChevronDown,
  PencilLine,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  buildSplitwiseMemberDirectory,
  buildBlankExpenseDraft,
  buildExpenseDraftFromExpense,
  getSplitwiseMemberName,
  getSplitwiseMemberOptionLabel,
  getSplitwiseMemberSecondaryText,
  getSplitSummary,
  validateExpenseDraft,
  type ExpenseDraft,
} from "@/components/splitwise/splitwise-helpers";
import { useSplitwiseWorkspace } from "@/components/splitwise/splitwise-workspace-provider";
import { ResizableSplitView } from "@/components/layout/resizable-split-view";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Select } from "@/components/ui/select";
import {
  createSplitwiseExpense,
  deleteSplitwiseExpense,
  updateSplitwiseExpense,
} from "@/lib/graphql/splitwise";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
} from "@/lib/utils";
import type { SplitwiseMember } from "@/types";

type ExpenseDraftFormProps = {
  busy: boolean;
  canSubmit: boolean;
  currency: string;
  draft: ExpenseDraft;
  layout?: "compact" | "default";
  memberDirectory: ReturnType<typeof buildSplitwiseMemberDirectory>;
  members: SplitwiseMember[];
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetLabel?: string;
  setDraft: Dispatch<SetStateAction<ExpenseDraft | null>>;
  submitLabel: string;
};

function ExpenseDraftForm({
  busy,
  canSubmit,
  currency,
  draft,
  layout = "default",
  memberDirectory,
  members,
  onReset,
  onSubmit,
  resetLabel = "Reset",
  setDraft,
  submitLabel,
}: ExpenseDraftFormProps) {
  const selectedParticipantCount = draft.participants.filter(
    (participant) => participant.enabled,
  ).length;
  const isCompact = layout === "compact";
  const isEditing = Boolean(draft.expenseId);

  return (
    <form className={isCompact ? "space-y-4" : "space-y-5"} onSubmit={onSubmit}>
      {isCompact ? (
        <div className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {isEditing ? "Editing expense" : "New expense"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                  {draft.splitType}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                  {selectedParticipantCount} selected
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-11 w-11 rounded-2xl px-0"
                disabled={busy}
                size="sm"
                title={resetLabel}
                type="button"
                variant="secondary"
                onClick={onReset}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">{resetLabel}</span>
              </Button>
              <Button
                className="h-12 min-w-[188px] justify-between rounded-full pl-5 pr-2 text-sm font-semibold shadow-[0_18px_34px_rgba(30,58,95,0.24)]"
                disabled={busy || !canSubmit}
                size="sm"
                title={busy ? "Saving..." : submitLabel}
                type="submit"
              >
                <span className="whitespace-nowrap">
                  {busy
                    ? "Saving..."
                    : isEditing
                      ? "Update Expense"
                      : "Add Expense"}
                </span>
                {isEditing ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(30,58,95,0.14)] bg-white/95 text-[var(--color-primary)] shadow-sm">
                    <PencilLine className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(30,58,95,0.14)] bg-white/95 text-[var(--color-primary)] shadow-sm">
                    <Plus className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 rounded-[1.4rem] bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Split Type
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">{draft.splitType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Participants
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {selectedParticipantCount} selected
            </p>
          </div>
        </div>
      )}

      <div className={isCompact ? "grid gap-3 md:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <Input
            value={draft.description}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, description: event.target.value } : current,
              )
            }
            placeholder="Dinner at the villa"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Total ({currency})
          </span>
          <Input
            value={draft.totalAmount}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, totalAmount: event.target.value } : current,
              )
            }
            placeholder="120.00"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Paid By</span>
          <Select
            value={draft.paidBy}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, paidBy: event.target.value } : current,
              )
            }
          >
            {members.map((member) => (
              <option key={member.email} value={member.email}>
                {getSplitwiseMemberOptionLabel(member.email, memberDirectory)}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Split Type</span>
          <Select
            value={draft.splitType}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      splitType: event.target.value as ExpenseDraft["splitType"],
                    }
                  : current,
              )
            }
          >
            <option value="EQUAL">Equal</option>
            <option value="EXACT">Exact amounts</option>
            <option value="PERCENTAGE">Percentages</option>
            <option value="SHARES">Shares</option>
          </Select>
        </label>
      </div>

      <div
        className={`rounded-[1.35rem] border border-slate-200 bg-slate-50 ${
          isCompact ? "p-3.5" : "p-4"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Participants
          </p>
          <p className="text-xs text-slate-500">
            Select who should be included in this charge
          </p>
        </div>

        <div
          className={`mt-4 space-y-3 overflow-y-auto pr-1 ${
            isCompact ? "max-h-[20rem]" : "max-h-[24rem]"
          }`}
        >
          {draft.participants.map((participant, index) => (
            <div
              key={participant.email}
              className={`grid gap-3 rounded-[1rem] bg-white ${
                isCompact
                  ? "px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_136px]"
                  : "px-4 py-3 md:grid-cols-[minmax(0,1fr)_160px]"
              }`}
            >
              <label className="flex items-center gap-3">
                <input
                  checked={participant.enabled}
                  className="h-4 w-4 rounded border-slate-300"
                  type="checkbox"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            participants: current.participants.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, enabled: event.target.checked }
                                  : item,
                            ),
                          }
                        : current,
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block text-sm text-slate-700">
                    {getSplitwiseMemberName(participant.email, memberDirectory)}
                  </span>
                  {getSplitwiseMemberSecondaryText(
                    participant.email,
                    memberDirectory,
                  ) ? (
                    <span className="block truncate text-xs text-slate-500">
                      {getSplitwiseMemberSecondaryText(
                        participant.email,
                        memberDirectory,
                      )}
                    </span>
                  ) : null}
                </span>
              </label>

              {draft.splitType === "EXACT" ? (
                <Input
                  inputMode="decimal"
                  value={participant.amount}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            participants: current.participants.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, amount: event.target.value }
                                  : item,
                            ),
                          }
                        : current,
                    )
                  }
                  placeholder="0.00"
                />
              ) : null}

              {draft.splitType === "PERCENTAGE" ? (
                <Input
                  inputMode="decimal"
                  value={participant.percentage}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            participants: current.participants.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, percentage: event.target.value }
                                  : item,
                            ),
                          }
                        : current,
                    )
                  }
                  placeholder="25"
                />
              ) : null}

              {draft.splitType === "SHARES" ? (
                <Input
                  inputMode="numeric"
                  value={participant.shares}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            participants: current.participants.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, shares: event.target.value }
                                  : item,
                            ),
                          }
                        : current,
                    )
                  }
                  placeholder="1"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {isCompact ? null : (
        <div className="flex flex-wrap justify-end gap-3">
          <Button disabled={busy} type="button" variant="secondary" onClick={onReset}>
            {resetLabel}
          </Button>
          <Button disabled={busy || !canSubmit} type="submit">
            {busy ? "Saving..." : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

export default function SplitwiseExpensesPage() {
  const {
    activeExpenses,
    currency,
    isLoading,
    loadError,
    refreshWorkspace,
    view,
  } = useSplitwiseWorkspace();
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [editorDraft, setEditorDraft] = useState<ExpenseDraft | null>(null);
  const [modalDraft, setModalDraft] = useState<ExpenseDraft | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  useEffect(() => {
    if (view && !editorDraft) {
      setEditorDraft(buildBlankExpenseDraft(view.members));
    }
  }, [editorDraft, view]);

  if (isLoading) {
    return <EventWorkspaceLoader variant="expenses" />;
  }

  if (!view || !currency) {
    return (
      <PageWrapper
        title="Split-Wise"
        description={loadError ?? "This group could not be loaded."}
      >
        <Card className="border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">
            {loadError ?? "This group is unavailable."}
          </p>
        </Card>
      </PageWrapper>
    );
  }

  const deletedExpenses = [...view.expenses]
    .filter((expense) => expense.isDeleted)
    .sort((left, right) => {
      const leftDate = new Date(left.deletedAt ?? left.recordedAt).getTime();
      const rightDate = new Date(right.deletedAt ?? right.recordedAt).getTime();
      return rightDate - leftDate;
    });
  const sortedActiveExpenses = [...activeExpenses].sort(
    (left, right) =>
      new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
  );
  const recordedTotal = activeExpenses.reduce(
    (sum, expense) => sum + expense.totalAmount,
    0,
  );
  const averageExpenseTotal = activeExpenses.length
    ? Math.round(recordedTotal / activeExpenses.length)
    : 0;
  const latestExpense = sortedActiveExpenses[0];
  const memberDirectory = buildSplitwiseMemberDirectory(view.members);

  const openCreateModal = () => {
    setModalDraft(buildBlankExpenseDraft(view.members));
    setIsExpenseModalOpen(true);
  };

  const addExpenseAction = (
    <Button
      className="h-12 min-w-[188px] justify-between rounded-full pl-5 pr-2 text-sm font-semibold shadow-[0_18px_34px_rgba(30,58,95,0.24)]"
      disabled={!view.permissions.canRecordExpenses}
      onClick={openCreateModal}
    >
      <span className="whitespace-nowrap">Add Expense</span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(30,58,95,0.14)] bg-white/95 text-[var(--color-primary)] shadow-sm">
        <Plus className="h-4 w-4" />
      </span>
    </Button>
  );

  const closeExpenseModal = () => {
    if (expenseBusy) {
      return;
    }

    setIsExpenseModalOpen(false);
    setModalDraft(null);
  };

  const resetEditorDraft = () => {
    if (!editorDraft) {
      return;
    }

    if (editorDraft.expenseId) {
      const sourceExpense = activeExpenses.find(
        (expense) => expense.id === editorDraft.expenseId,
      );

      if (sourceExpense) {
        setEditorDraft(buildExpenseDraftFromExpense(sourceExpense, view.members));
        return;
      }
    }

    setEditorDraft(buildBlankExpenseDraft(view.members));
  };

  const submitExpenseDraft = async ({
    draft,
    onSuccess,
  }: {
    draft: ExpenseDraft;
    onSuccess: () => void;
  }) => {
    const preparedExpense = validateExpenseDraft({
      draft,
      members: view.members,
    });

    if (!preparedExpense.success) {
      toast.error(preparedExpense.message);
      return;
    }

    setExpenseBusy(true);

    const payload = {
      groupId: view.group.id,
      ...preparedExpense.payload,
    };

    const request = draft.expenseId
      ? updateSplitwiseExpense({
          ...payload,
          expenseId: draft.expenseId,
        })
      : createSplitwiseExpense(payload);

    try {
      const result = await request;

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess();
      await refreshWorkspace();
    } finally {
      setExpenseBusy(false);
    }
  };

  return (
    <PageWrapper
      title="Expenses"
      description="Keep both a quick on-page editor and a focused add-expense modal."
      actions={addExpenseAction}
    >
      <Card className="p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Active Expenses
            </p>
            <p className="mt-2 text-lg font-semibold">{activeExpenses.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Recorded Total
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {formatCurrency(recordedTotal, currency)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Average Charge
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {activeExpenses.length
                ? formatCurrency(averageExpenseTotal, currency)
                : "None"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {latestExpense
                ? `Latest ${formatRelativeDate(latestExpense.recordedAt)}`
                : "No charges recorded yet"}
            </p>
          </div>
        </div>
      </Card>

      <ResizableSplitView
        initialLeftRatio={0.43}
        minLeftWidth={380}
        minRightWidth={420}
        storageKey="splitwise-expenses-layout-v4"
        left={
          <Card className="p-4" id="expense-editor">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Expense Editor
                </p>
                <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
                  Quick editor
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Compact side editor for fast create and edit work.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editorDraft?.expenseId ? (
                  <Button
                    disabled={expenseBusy}
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditorDraft(buildBlankExpenseDraft(view.members))}
                  >
                    Clear Edit
                  </Button>
                ) : null}
              </div>
            </div>

            {editorDraft ? (
              <div className="mt-5">
                <ExpenseDraftForm
                  busy={expenseBusy}
                  canSubmit={view.permissions.canRecordExpenses}
                  currency={currency}
                  draft={editorDraft}
                  layout="compact"
                  memberDirectory={memberDirectory}
                  members={view.members}
                  onReset={resetEditorDraft}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitExpenseDraft({
                      draft: editorDraft,
                      onSuccess: () => {
                        setEditorDraft(buildBlankExpenseDraft(view.members));
                      },
                    });
                  }}
                  setDraft={setEditorDraft}
                  submitLabel={editorDraft.expenseId ? "Update Expense" : "Save Expense"}
                />
              </div>
            ) : null}
          </Card>
        }
        right={
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Current Expenses
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    Active shared charges
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Add from the modal, edit from the side editor, and keep the live
                    charges easy to scan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-950/[0.04] px-3 py-1.5 text-xs font-medium text-slate-700">
                    {activeExpenses.length} active
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {sortedActiveExpenses.length ? (
                  sortedActiveExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`rounded-[1.3rem] border px-4 py-4 ${
                        editorDraft?.expenseId === expense.id
                          ? "border-[var(--color-accent)] bg-sky-50/50"
                          : "border-slate-200/80 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">
                              {expense.description}
                            </p>
                            {editorDraft?.expenseId === expense.id ? (
                              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                                Editing
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            Paid by {getSplitwiseMemberName(expense.paidBy, memberDirectory)} •{" "}
                            {formatDate(expense.recordedAt)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {getSplitSummary(expense, currency, memberDirectory)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <p className="text-lg font-semibold text-slate-950">
                            {formatCurrency(expense.totalAmount, currency)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditorDraft(
                                  buildExpenseDraftFromExpense(expense, view.members),
                                );
                                document
                                  .getElementById("expense-editor")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }}
                            >
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                if (!window.confirm(`Delete "${expense.description}"?`)) {
                                  return;
                                }

                                setExpenseBusy(true);
                                void deleteSplitwiseExpense({
                                  groupId: view.group.id,
                                  expenseId: expense.id,
                                })
                                  .then(async (result) => {
                                    if (!result.success) {
                                      toast.error(result.message);
                                      return;
                                    }

                                    toast.success(result.message);
                                    if (editorDraft?.expenseId === expense.id) {
                                      setEditorDraft(buildBlankExpenseDraft(view.members));
                                    }
                                    await refreshWorkspace();
                                  })
                                  .finally(() => setExpenseBusy(false));
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No active expenses yet"
                    description="Add the first expense to start tracking who paid and how the bill is split."
                    action={addExpenseAction}
                  />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Deleted History
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      Soft-deleted expenses
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Collapsed by default so the active list stays easier to use.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-50 p-2 text-slate-500">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      {deletedExpenses.length} deleted
                    </span>
                    <span className="rounded-full bg-slate-950/[0.04] p-2 text-slate-500 transition group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </div>
                </summary>

                <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-5">
                  {deletedExpenses.length ? (
                    deletedExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">
                              {expense.description}
                            </p>
                            <p className="text-sm text-slate-500">
                              Originally paid by{" "}
                              {getSplitwiseMemberName(expense.paidBy, memberDirectory)}
                            </p>
                          </div>
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(expense.totalAmount, currency)}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Deleted {expense.deletedAt ? formatDate(expense.deletedAt) : "recently"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                      No deleted expenses yet.
                    </div>
                  )}
                </div>
              </details>
            </Card>
          </div>
        }
      />

      <Modal
        open={isExpenseModalOpen && Boolean(modalDraft)}
        title="Add Expense"
        description="Create a new shared charge without leaving the expense list."
        className="max-w-4xl"
        onClose={closeExpenseModal}
      >
        {modalDraft ? (
          <ExpenseDraftForm
            busy={expenseBusy}
            canSubmit={view.permissions.canRecordExpenses}
            currency={currency}
            draft={modalDraft}
            memberDirectory={memberDirectory}
            members={view.members}
            onReset={() => setModalDraft(buildBlankExpenseDraft(view.members))}
            onSubmit={(event) => {
              event.preventDefault();
              void submitExpenseDraft({
                draft: modalDraft,
                onSuccess: () => {
                  closeExpenseModal();
                },
              });
            }}
            resetLabel="Clear"
            setDraft={setModalDraft}
            submitLabel="Add Expense"
          />
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
