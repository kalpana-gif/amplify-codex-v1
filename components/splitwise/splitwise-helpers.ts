import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/utils";
import {
  normalizeEmail,
  resolveExpenseSplits,
} from "@/lib/splitwise/core";
import type {
  SplitwiseActivityItem,
  SplitwiseExpense,
  SplitwiseExpenseInputSplit,
  SplitwiseMember,
  SplitwiseSimplifiedDebt,
  SplitwiseSplitType,
} from "@/types";

export type ExpenseParticipantDraft = {
  email: string;
  enabled: boolean;
  amount: string;
  percentage: string;
  shares: string;
};

export type ExpenseDraft = {
  expenseId: string | null;
  description: string;
  totalAmount: string;
  paidBy: string;
  splitType: SplitwiseSplitType;
  participants: ExpenseParticipantDraft[];
};

type PreparedExpensePayload = {
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitwiseSplitType;
  splits: SplitwiseExpenseInputSplit[];
};

export type ExpenseDraftValidationResult =
  | {
      success: true;
      payload: PreparedExpensePayload;
    }
  | {
      success: false;
      message: string;
    };

export type SplitwiseMemberDirectory = {
  memberByEmail: Map<string, SplitwiseMember>;
  duplicateNameCounts: Map<string, number>;
};

const getNormalizedMemberName = (name: string) => name.trim().toLowerCase();
const looksLikeEmail = (value: string) => value.includes("@");

export const buildSplitwiseMemberDirectory = (
  members: SplitwiseMember[],
): SplitwiseMemberDirectory => {
  const memberByEmail = new Map<string, SplitwiseMember>();
  const duplicateNameCounts = new Map<string, number>();

  for (const member of members) {
    memberByEmail.set(normalizeEmail(member.email), member);

    const normalizedName = getNormalizedMemberName(member.name);
    duplicateNameCounts.set(
      normalizedName,
      (duplicateNameCounts.get(normalizedName) ?? 0) + 1,
    );
  }

  return {
    memberByEmail,
    duplicateNameCounts,
  };
};

export const getSplitwiseMember = (
  email: string,
  directory: SplitwiseMemberDirectory,
) => directory.memberByEmail.get(normalizeEmail(email)) ?? null;

export const shouldShowSplitwiseMemberEmail = (
  member: SplitwiseMember,
  directory: SplitwiseMemberDirectory,
) => {
  void member;
  void directory;
  return false;
};

export const getSplitwiseMemberName = (
  email: string,
  directory: SplitwiseMemberDirectory,
) => getSplitwiseMember(email, directory)?.name ?? email;

export const getSplitwiseMemberDisplayName = ({
  email,
  directory,
  fallbackName,
}: {
  email?: string | null;
  directory: SplitwiseMemberDirectory;
  fallbackName?: string | null;
}) => {
  const trimmedFallback = fallbackName?.trim();

  if (!email) {
    return trimmedFallback || "Unknown member";
  }

  const resolvedName = getSplitwiseMemberName(email, directory);

  if (resolvedName !== email) {
    return resolvedName;
  }

  if (trimmedFallback && !looksLikeEmail(trimmedFallback)) {
    return trimmedFallback;
  }

  return trimmedFallback || resolvedName;
};

export const getSplitwiseMemberSecondaryText = (
  email: string,
  directory: SplitwiseMemberDirectory,
) => {
  const member = getSplitwiseMember(email, directory);

  if (!member) {
    return null;
  }

  if (member.isGuest) {
    return "Guest participant";
  }

  return shouldShowSplitwiseMemberEmail(member, directory) ? member.email : null;
};

export const getSplitwiseMemberOptionLabel = (
  email: string,
  directory: SplitwiseMemberDirectory,
) => {
  const member = getSplitwiseMember(email, directory);

  if (!member) {
    return email;
  }

  return member.name;
};

const getActivityStateRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getActivityStateString = (
  state: Record<string, unknown> | null,
  key: string,
) => {
  const value = state?.[key];
  return typeof value === "string" ? value : null;
};

const getActivityMemberName = ({
  state,
  directory,
}: {
  state: Record<string, unknown> | null;
  directory: SplitwiseMemberDirectory;
}) => {
  const fallbackName = getActivityStateString(state, "name");

  if (fallbackName && !looksLikeEmail(fallbackName)) {
    return fallbackName;
  }

  return getSplitwiseMemberDisplayName({
    email: getActivityStateString(state, "email"),
    directory,
    fallbackName,
  });
};

export const getSplitwiseActivitySummary = (
  item: SplitwiseActivityItem,
  directory: SplitwiseMemberDirectory,
) => {
  const actorName = getSplitwiseMemberDisplayName({
    email: item.actorEmail,
    directory,
    fallbackName: item.actorName,
  });
  const beforeState = getActivityStateRecord(item.beforeState);
  const afterState = getActivityStateRecord(item.afterState);

  if (item.actionType === "GROUP_CREATED") {
    const groupName = getActivityStateString(afterState, "name");
    return groupName ? `${actorName} created ${groupName}.` : item.message;
  }

  if (item.actionType === "MEMBER_ADDED") {
    const memberName = getActivityMemberName({
      state: afterState,
      directory,
    });
    return `${actorName} added ${memberName}.`;
  }

  if (item.actionType === "MEMBER_UPDATED") {
    const previousName = getActivityMemberName({
      state: beforeState,
      directory,
    });
    const nextName = getActivityMemberName({
      state: afterState,
      directory,
    });

    return previousName === nextName
      ? `${actorName} updated ${nextName}.`
      : `${actorName} renamed ${previousName} to ${nextName}.`;
  }

  if (item.actionType === "MEMBER_REMOVED") {
    const memberName = getActivityMemberName({
      state: beforeState,
      directory,
    });
    return `${actorName} removed ${memberName}.`;
  }

  if (item.actionType === "EXPENSE_ADDED") {
    const description = getActivityStateString(afterState, "description");
    return description ? `${actorName} added "${description}".` : item.message;
  }

  if (item.actionType === "EXPENSE_EDITED") {
    const description = getActivityStateString(afterState, "description");
    return description ? `${actorName} updated "${description}".` : item.message;
  }

  if (item.actionType === "EXPENSE_DELETED") {
    const description =
      getActivityStateString(afterState, "description") ??
      getActivityStateString(beforeState, "description");
    return description ? `${actorName} deleted "${description}".` : item.message;
  }

  if (item.actionType === "SETTLEMENT_RECORDED") {
    const fromName = getSplitwiseMemberDisplayName({
      email: getActivityStateString(afterState, "fromEmail"),
      directory,
    });
    const toName = getSplitwiseMemberDisplayName({
      email: getActivityStateString(afterState, "toEmail"),
      directory,
    });

    return `${actorName} recorded a settlement from ${fromName} to ${toName}.`;
  }

  return item.message;
};

export const buildBlankExpenseDraft = (
  members: SplitwiseMember[],
): ExpenseDraft => ({
  expenseId: null,
  description: "",
  totalAmount: "",
  paidBy: members[0]?.email ?? "",
  splitType: "EQUAL",
  participants: members.map((member) => ({
    email: member.email,
    enabled: true,
    amount: "",
    percentage: "",
    shares: "1",
  })),
});

export const buildExpenseDraftFromExpense = (
  expense: SplitwiseExpense,
  members: SplitwiseMember[],
): ExpenseDraft => ({
  expenseId: expense.id,
  description: expense.description,
  totalAmount: formatCurrencyInput(expense.totalAmount),
  paidBy: expense.paidBy,
  splitType: expense.splitType,
  participants: members.map((member) => {
    const split = expense.splits.find((item) => item.email === member.email);

    return {
      email: member.email,
      enabled: Boolean(split),
      amount: split ? formatCurrencyInput(split.amountCents) : "",
      percentage: split?.percentageBasisPoints
        ? String(split.percentageBasisPoints / 100)
        : "",
      shares: split?.shares ? String(split.shares) : "1",
    };
  }),
});

export const buildExpenseInputSplits = (
  participants: ExpenseParticipantDraft[],
  splitType: SplitwiseSplitType,
): SplitwiseExpenseInputSplit[] =>
  participants
    .filter((participant) => participant.enabled)
    .map((participant) => ({
      email: participant.email,
      amountCents:
        splitType === "EXACT"
          ? parseCurrencyInputToCents(participant.amount)
          : undefined,
      percentageBasisPoints:
        splitType === "PERCENTAGE"
          ? Math.round(Number(participant.percentage || "0") * 100)
          : undefined,
      shares:
        splitType === "SHARES"
          ? Number.parseInt(participant.shares || "0", 10)
          : undefined,
    }));

export const validateExpenseDraft = ({
  draft,
  members,
}: {
  draft: ExpenseDraft;
  members: SplitwiseMember[];
}): ExpenseDraftValidationResult => {
  const description = draft.description.trim();
  if (!description) {
    return {
      success: false,
      message: "Expense description is required.",
    };
  }

  const paidBy = normalizeEmail(draft.paidBy);
  const validMemberEmails = new Set(members.map((member) => normalizeEmail(member.email)));

  if (!validMemberEmails.has(paidBy)) {
    return {
      success: false,
      message: "Select a valid payer from the group members.",
    };
  }

  const totalAmount = parseCurrencyInputToCents(draft.totalAmount);
  const splits = buildExpenseInputSplits(draft.participants, draft.splitType);
  const splitResolution = resolveExpenseSplits({
    totalAmount,
    splitType: draft.splitType,
    splits,
    validMemberEmails,
  });

  if (!splitResolution.success) {
    return {
      success: false,
      message: splitResolution.error.message,
    };
  }

  return {
    success: true,
    payload: {
      description,
      totalAmount,
      paidBy,
      splitType: draft.splitType,
      splits,
    },
  };
};

export const buildSettlementDraft = (
  members: SplitwiseMember[],
  simplifiedDebts: SplitwiseSimplifiedDebt[],
) => {
  const preferredDebt = simplifiedDebts[0];

  return {
    fromEmail: preferredDebt?.fromEmail ?? members[0]?.email ?? "",
    toEmail:
      preferredDebt?.toEmail ?? members[1]?.email ?? members[0]?.email ?? "",
    amount: preferredDebt ? formatCurrencyInput(preferredDebt.amount) : "",
    note: "",
  };
};

export const getSplitSummary = (
  expense: SplitwiseExpense,
  currency: string,
  memberDirectory: SplitwiseMemberDirectory,
) => {
  if (expense.splitType === "EQUAL") {
    return `Equal split across ${expense.participantEmails.length} members`;
  }

  if (expense.splitType === "EXACT") {
    return expense.splits
      .map(
        (split) =>
          `${getSplitwiseMemberName(split.email, memberDirectory)}: ${formatCurrency(split.amountCents, currency)}`,
      )
      .join(" • ");
  }

  if (expense.splitType === "PERCENTAGE") {
    return expense.splits
      .map(
        (split) =>
          `${getSplitwiseMemberName(split.email, memberDirectory)}: ${((split.percentageBasisPoints ?? 0) / 100).toFixed(2)}%`,
      )
      .join(" • ");
  }

  return expense.splits
    .map(
      (split) =>
        `${getSplitwiseMemberName(split.email, memberDirectory)}: ${split.shares ?? 0} share(s)`,
    )
    .join(" • ");
};
