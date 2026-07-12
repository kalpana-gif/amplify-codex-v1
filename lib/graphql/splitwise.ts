import { client, getUserPoolAuthOptions } from "@/lib/amplify-client";
import type {
  SplitwiseActivityPage,
  SplitwiseActivityItem,
  SplitwiseBalance,
  SplitwiseExpense,
  SplitwiseExpenseInputSplit,
  SplitwiseExpenseMutationResult,
  SplitwiseGroupListItem,
  SplitwiseMemberInput,
  SplitwiseGroupMutationResult,
  SplitwiseGroupView,
  SplitwiseMember,
  SplitwiseOperationResult,
  SplitwiseSimplifiedDebt,
  SplitwiseSettlement,
  SplitwiseSettlementMutationResult,
  SplitwiseSplitType,
} from "@/types";

const fallbackFailure = <T extends Record<string, unknown>>(
  message: string,
  extra: T,
): SplitwiseOperationResult & T =>
  ({
    success: false,
    code: "UNEXPECTED_ERROR",
    message,
    ...extra,
  });

const getResultErrorMessage = (
  errors: readonly { message?: string | null }[] | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

const compactArray = <T>(value?: readonly (T | null | undefined)[] | null) =>
  (value ?? []).filter((item): item is T => item !== null && item !== undefined);

const mapExpense = (expense: {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitwiseSplitType;
  splits?: readonly ({
    email: string;
    amountCents: number;
    percentageBasisPoints?: number | null;
    shares?: number | null;
  } | null | undefined)[] | null;
  participantEmails?: readonly (string | null | undefined)[] | null;
  createdBy: string;
  updatedBy?: string | null;
  isDeleted: boolean;
  recordedAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}): SplitwiseExpense => ({
  id: expense.id,
  description: expense.description,
  totalAmount: expense.totalAmount,
  paidBy: expense.paidBy,
  splitType: expense.splitType,
  splits: compactArray(expense.splits).map((split) => ({
    email: split.email,
    amountCents: split.amountCents,
    percentageBasisPoints: split.percentageBasisPoints ?? null,
    shares: split.shares ?? null,
  })),
  participantEmails: compactArray<string>(expense.participantEmails),
  createdBy: expense.createdBy,
  updatedBy: expense.updatedBy ?? null,
  isDeleted: expense.isDeleted,
  recordedAt: expense.recordedAt,
  updatedAt: expense.updatedAt ?? null,
  deletedAt: expense.deletedAt ?? null,
});

const mapSettlement = (settlement: {
  id: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  note?: string | null;
  settledAt: string;
  createdBy: string;
}): SplitwiseSettlement => ({
  id: settlement.id,
  fromEmail: settlement.fromEmail,
  toEmail: settlement.toEmail,
  amount: settlement.amount,
  note: settlement.note ?? null,
  settledAt: settlement.settledAt,
  createdBy: settlement.createdBy,
});

const mapBalance = (balance: {
  email: string;
  name: string;
  balance: number;
}): SplitwiseBalance => ({
  email: balance.email,
  name: balance.name,
  balance: balance.balance,
});

const mapActivityItem = (item: {
  id: string;
  actorEmail: string;
  actorName: string;
  actionType: SplitwiseActivityItem["actionType"];
  entityType: SplitwiseActivityItem["entityType"];
  entityId?: string | null;
  message: string;
  details?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  diff?: unknown;
  loggedAt: string;
}): SplitwiseActivityItem => ({
  id: item.id,
  actorEmail: item.actorEmail,
  actorName: item.actorName,
  actionType: item.actionType,
  entityType: item.entityType,
  entityId: item.entityId ?? null,
  message: item.message,
  details: item.details,
  beforeState: item.beforeState,
  afterState: item.afterState,
  diff: item.diff,
  loggedAt: item.loggedAt,
});

export const listSplitwiseGroups = async (): Promise<{
  success: boolean;
  code: string;
  message: string;
  groups: SplitwiseGroupListItem[];
}> => {
  try {
    const result = await client.queries.listSplitwiseGroups(
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return {
        success: result.data.success,
        code: result.data.code,
        message: result.data.message,
        groups: compactArray<SplitwiseGroupListItem>(result.data.groups),
      };
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to load Split-Wise groups."),
      {
        groups: [],
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to load Split-Wise groups.",
      {
        groups: [],
      },
    );
  }
};

export const getSplitwiseGroup = async (
  groupId: string,
): Promise<
  | ({
      success: true;
      code: string;
      message: string;
    } & SplitwiseGroupView)
  | ({
      success: false;
      code: string;
      message: string;
    } & Pick<
      SplitwiseGroupView,
      "members" | "expenses" | "settlements" | "balances" | "simplifiedDebts"
    > & {
      group: null;
      permissions: null;
    })
> => {
  try {
    const result = await client.queries.getSplitwiseGroup(
      {
        groupId,
      },
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      if (result.data.success && result.data.group && result.data.permissions) {
        return {
          success: true,
          code: result.data.code,
          message: result.data.message,
          group: result.data.group,
          permissions: result.data.permissions,
          members: compactArray<SplitwiseMember>(result.data.members),
          expenses: compactArray(result.data.expenses).map(mapExpense),
          settlements: compactArray(result.data.settlements).map(mapSettlement),
          balances: compactArray(result.data.balances).map(mapBalance),
          simplifiedDebts: compactArray<SplitwiseSimplifiedDebt>(result.data.simplifiedDebts),
        };
      }

      return {
        success: false,
        code: result.data.code,
        message: result.data.message,
        group: null,
        permissions: null,
        members: [],
        expenses: [],
        settlements: [],
        balances: [],
        simplifiedDebts: [],
      };
    }

    return {
      success: false,
      code: "UNEXPECTED_ERROR",
      message: getResultErrorMessage(
        result.errors,
        "Failed to load the Split-Wise group.",
      ),
      group: null,
      permissions: null,
      members: [],
      expenses: [],
      settlements: [],
      balances: [],
      simplifiedDebts: [],
    };
  } catch (error) {
    return {
      success: false,
      code: "UNEXPECTED_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to load the Split-Wise group.",
      group: null,
      permissions: null,
      members: [],
      expenses: [],
      settlements: [],
      balances: [],
      simplifiedDebts: [],
    };
  }
};

export const listSplitwiseGroupActivity = async (
  groupId: string,
  options?: {
    limit?: number;
    nextToken?: string | null;
  },
): Promise<SplitwiseActivityPage> => {
  try {
    const result = await client.queries.listSplitwiseGroupActivity(
      {
        groupId,
        limit: options?.limit,
        nextToken: options?.nextToken ?? undefined,
      },
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return {
        success: result.data.success,
        code: result.data.code,
        message: result.data.message,
        items: compactArray(result.data.items).map(mapActivityItem),
        nextToken: result.data.nextToken ?? null,
      };
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to load group activity."),
      {
        items: [],
        nextToken: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to load group activity.",
      {
        items: [],
        nextToken: null,
      },
    );
  }
};

export const createSplitwiseGroup = async (input: {
  name: string;
  currency: "USD" | "LKR";
  members?: SplitwiseMemberInput[];
}): Promise<SplitwiseGroupMutationResult> => {
  try {
    const result = await client.mutations.createSplitwiseGroup(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to create the group."),
      {
        groupId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to create the group.",
      {
        groupId: null,
      },
    );
  }
};

export const addSplitwiseGroupMember = async (
  groupId: string,
  member: SplitwiseMemberInput,
): Promise<SplitwiseGroupMutationResult> => {
  try {
    const result = await client.mutations.addSplitwiseGroupMember(
      {
        groupId,
        ...member,
      },
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to add the member."),
      {
        groupId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to add the member.",
      {
        groupId: null,
      },
    );
  }
};

export const updateSplitwiseGroupMember = async (input: {
  groupId: string;
  email: string;
  name: string;
}): Promise<SplitwiseGroupMutationResult> => {
  try {
    const result = await client.mutations.updateSplitwiseGroupMember(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to update the member."),
      {
        groupId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to update the member.",
      {
        groupId: null,
      },
    );
  }
};

export const removeSplitwiseGroupMember = async (
  groupId: string,
  email: string,
): Promise<SplitwiseGroupMutationResult> => {
  try {
    const result = await client.mutations.removeSplitwiseGroupMember(
      {
        groupId,
        email,
      },
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to remove the member."),
      {
        groupId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to remove the member.",
      {
        groupId: null,
      },
    );
  }
};

export const createSplitwiseExpense = async (input: {
  groupId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitwiseSplitType;
  splits: SplitwiseExpenseInputSplit[];
}): Promise<SplitwiseExpenseMutationResult> => {
  try {
    const result = await client.mutations.createSplitwiseExpense(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to create the expense."),
      {
        groupId: null,
        expenseId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to create the expense.",
      {
        groupId: null,
        expenseId: null,
      },
    );
  }
};

export const updateSplitwiseExpense = async (input: {
  groupId: string;
  expenseId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitwiseSplitType;
  splits: SplitwiseExpenseInputSplit[];
}): Promise<SplitwiseExpenseMutationResult> => {
  try {
    const result = await client.mutations.updateSplitwiseExpense(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to update the expense."),
      {
        groupId: null,
        expenseId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to update the expense.",
      {
        groupId: null,
        expenseId: null,
      },
    );
  }
};

export const deleteSplitwiseExpense = async (input: {
  groupId: string;
  expenseId: string;
}): Promise<SplitwiseExpenseMutationResult> => {
  try {
    const result = await client.mutations.deleteSplitwiseExpense(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to delete the expense."),
      {
        groupId: null,
        expenseId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to delete the expense.",
      {
        groupId: null,
        expenseId: null,
      },
    );
  }
};

export const recordSplitwiseSettlement = async (input: {
  groupId: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  note?: string;
}): Promise<SplitwiseSettlementMutationResult> => {
  try {
    const result = await client.mutations.recordSplitwiseSettlement(
      input,
      await getUserPoolAuthOptions(),
    );

    if (result.data) {
      return result.data;
    }

    return fallbackFailure(
      getResultErrorMessage(result.errors, "Failed to record the settlement."),
      {
        groupId: null,
        settlementId: null,
      },
    );
  } catch (error) {
    return fallbackFailure(
      error instanceof Error ? error.message : "Failed to record the settlement.",
      {
        groupId: null,
        settlementId: null,
      },
    );
  }
};
