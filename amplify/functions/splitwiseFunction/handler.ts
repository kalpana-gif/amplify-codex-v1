import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { randomUUID } from "node:crypto";
import type { Schema } from "../../data/schema";
import {
  assertMemberCanBeRemoved,
  buildChangedFieldsDiff,
  computeGroupBalances,
  normalizeEmail,
  normalizeEmailList,
  resolveExpenseSplits,
  simplifyDebts,
  validateSettlement,
  type BalanceExpense,
  type BalanceSettlement,
  type ResolvedSplit,
  type SplitInput,
  type SplitType,
} from "../../../lib/splitwise/core";

const dataClient = generateClient<Schema>();
let amplifyConfigured = false;
let amplifyConfigPromise: Promise<void> | null = null;

const groupSelectionSet = [
  "id",
  "name",
  "currency",
  "createdBy",
  "owner",
  "admins",
  "memberEmails",
  "createdAt",
] as const;

const memberSelectionSet = [
  "groupId",
  "email",
  "name",
  "isGuest",
  "role",
  "joinedBy",
  "userId",
] as const;

const expenseSelectionSet = [
  "id",
  "groupId",
  "description",
  "totalAmount",
  "paidBy",
  "splitType",
  "splits",
  "participantEmails",
  "createdBy",
  "updatedBy",
  "isDeleted",
  "recordedAt",
  "updatedAt",
  "deletedAt",
  "deletedBy",
] as const;

const settlementSelectionSet = [
  "id",
  "groupId",
  "fromEmail",
  "toEmail",
  "amount",
  "note",
  "settledAt",
  "createdBy",
] as const;

const activitySelectionSet = [
  "id",
  "groupId",
  "actorEmail",
  "actionType",
  "entityType",
  "entityId",
  "message",
  "details",
  "beforeState",
  "afterState",
  "diff",
  "loggedAt",
] as const;

class SplitwiseOperationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SplitwiseOperationError";
  }
}

const dataOptions = {
  authMode: "iam" as const,
};

const ensureAmplifyConfigured = async () => {
  if (amplifyConfigured) {
    return;
  }

  if (!amplifyConfigPromise) {
    amplifyConfigPromise = getAmplifyDataClientConfig(process.env).then(
      ({ resourceConfig, libraryOptions }) => {
        Amplify.configure(resourceConfig, libraryOptions);
        amplifyConfigured = true;
      },
    );
  }

  await amplifyConfigPromise;
};

const getRequesterEmail = (identity: unknown) => {
  if (!identity || typeof identity !== "object") {
    return null;
  }

  const claims =
    "claims" in identity && identity.claims && typeof identity.claims === "object"
      ? (identity.claims as Record<string, unknown>)
      : null;
  const email = claims?.email;

  return typeof email === "string" ? normalizeEmail(email) : null;
};

const asArray = <T>(data?: readonly T[] | T[] | null) =>
  Array.isArray(data) ? [...data] : [];

const serializeJson = (value: unknown) => JSON.stringify(value ?? null);

const parseJson = <T>(value: unknown): T | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value as T;
};

const normalizeMemberName = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

const createGuestMemberKey = () => `guest+${randomUUID()}@splitwise.local`;

const getFieldName = (event: unknown) => {
  if (event && typeof event === "object") {
    const directField =
      "fieldName" in event && typeof event.fieldName === "string"
        ? event.fieldName
        : null;

    if (directField) {
      return directField;
    }

    const info =
      "info" in event && event.info && typeof event.info === "object"
        ? (event.info as Record<string, unknown>)
        : null;

    if (typeof info?.fieldName === "string") {
      return info.fieldName;
    }
  }

  throw new SplitwiseOperationError(
    "INVALID_OPERATION",
    "Unable to determine which Split-Wise operation was called.",
  );
};

const getArguments = <T>(event: unknown) => {
  if (event && typeof event === "object" && "arguments" in event) {
    return (event.arguments ?? {}) as T;
  }

  return {} as T;
};

const getResultMessage = (verb: string) => `${verb} completed successfully.`;

const assert = (
  condition: boolean,
  code: string,
  message: string,
): asserts condition => {
  if (!condition) {
    throw new SplitwiseOperationError(code, message);
  }
};

const getResultErrorMessage = (
  errors:
    | readonly {
        message?: string | null;
      }[]
    | null
    | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

const requireResultData = <T>(
  result: {
    data?: T | null;
    errors?: readonly {
      message?: string | null;
    }[] | null;
  },
  code: string,
  fallbackMessage: string,
) => {
  assert(
    Boolean(result.data),
    code,
    getResultErrorMessage(result.errors, fallbackMessage),
  );

  return result.data as T;
};

const listAll = async <T>(
  fetchPage: (
    nextToken?: string | null,
  ) => Promise<{
    data?: readonly T[] | T[] | null;
    nextToken?: string | null;
  }>,
) => {
  const items: T[] = [];
  let nextToken: string | null | undefined;

  do {
    const result = await fetchPage(nextToken);
    items.push(...asArray(result.data));
    nextToken = result.nextToken;
  } while (nextToken);

  return items;
};

type GroupRecord = {
  id: string;
  name: string;
  currency: "USD" | "LKR";
  createdBy: string;
  owner: string;
  admins?: (string | null)[] | null;
  memberEmails?: (string | null)[] | null;
  createdAt?: string | null;
};

type GroupMemberRecord = {
  groupId: string;
  email: string;
  name?: string | null;
  isGuest?: boolean | null;
  role: "ADMIN" | "MEMBER";
  joinedBy: string;
  userId?: string | null;
};

type GroupExpenseRecord = {
  id: string;
  groupId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitType;
  splits: unknown;
  participantEmails?: (string | null)[] | null;
  createdBy: string;
  updatedBy?: string | null;
  isDeleted: boolean;
  recordedAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

type SettlementRecord = {
  id: string;
  groupId: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  note?: string | null;
  settledAt: string;
  createdBy: string;
};

type ActivityLogRecord = {
  id: string;
  groupId: string;
  actorEmail: string;
  actionType:
    | "GROUP_CREATED"
    | "MEMBER_ADDED"
    | "MEMBER_UPDATED"
    | "MEMBER_REMOVED"
    | "EXPENSE_ADDED"
    | "EXPENSE_EDITED"
    | "EXPENSE_DELETED"
    | "SETTLEMENT_RECORDED";
  entityType: "GROUP" | "MEMBER" | "EXPENSE" | "SETTLEMENT";
  entityId?: string | null;
  message: string;
  details?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  diff?: unknown;
  loggedAt: string;
};

type RequestedGroupMemberInput = {
  name: string;
  email?: string | null;
};

const normalizeGroup = (group: GroupRecord) => ({
  ...group,
  currency: group.currency,
  createdBy: normalizeEmail(group.createdBy),
  owner: normalizeEmail(group.owner),
  admins: normalizeEmailList(asArray(group.admins).filter(Boolean) as string[]),
  memberEmails: normalizeEmailList(
    asArray(group.memberEmails).filter(Boolean) as string[],
  ),
  createdAt: group.createdAt ?? null,
});

const normalizeMember = (member: GroupMemberRecord) => ({
  ...member,
  email: normalizeEmail(member.email),
  name: normalizeMemberName(member.name ?? member.email),
  isGuest: Boolean(member.isGuest),
  joinedBy: normalizeEmail(member.joinedBy),
});

const parseResolvedSplits = (value: unknown): ResolvedSplit[] => {
  const parsedValue = parseJson<unknown>(value);

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      email: normalizeEmail(String(item.email ?? "")),
      amountCents: Number(item.amountCents ?? 0),
      percentageBasisPoints:
        item.percentageBasisPoints === null || item.percentageBasisPoints === undefined
          ? null
          : Number(item.percentageBasisPoints),
      shares:
        item.shares === null || item.shares === undefined
          ? null
          : Number(item.shares),
    }))
    .filter((split) => split.email);
};

const normalizeExpense = (expense: GroupExpenseRecord) => ({
  ...expense,
  paidBy: normalizeEmail(expense.paidBy),
  participantEmails: normalizeEmailList(
    asArray(expense.participantEmails).filter(Boolean) as string[],
  ),
  createdBy: normalizeEmail(expense.createdBy),
  updatedBy: expense.updatedBy ? normalizeEmail(expense.updatedBy) : null,
  deletedBy: expense.deletedBy ? normalizeEmail(expense.deletedBy) : null,
  splits: parseResolvedSplits(expense.splits),
});

const normalizeSettlement = (settlement: SettlementRecord) => ({
  ...settlement,
  fromEmail: normalizeEmail(settlement.fromEmail),
  toEmail: normalizeEmail(settlement.toEmail),
  createdBy: normalizeEmail(settlement.createdBy),
});

const normalizeActivity = (activity: ActivityLogRecord) => ({
  ...activity,
  actorEmail: normalizeEmail(activity.actorEmail),
  entityId: activity.entityId ?? null,
  details: parseJson(activity.details),
  beforeState: parseJson(activity.beforeState),
  afterState: parseJson(activity.afterState),
  diff: parseJson(activity.diff),
});

const getProfileNameMap = async (emails: readonly string[]) => {
  const uniqueEmails = normalizeEmailList(emails);
  const profiles = await Promise.all(
    uniqueEmails.map(async (email) => {
      const result = await dataClient.models.UserDirectoryProfile.get(
        { email },
        {
          ...dataOptions,
          selectionSet: ["email", "name"],
        },
      );

      return {
        email,
        name: result.data?.name?.trim() || email,
      };
    }),
  );

  return new Map(profiles.map((profile) => [profile.email, profile.name]));
};

const getUserDirectoryProfile = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const result = await dataClient.models.UserDirectoryProfile.get(
    { email: normalizedEmail },
    {
      ...dataOptions,
      selectionSet: ["email", "name"],
    },
  );

  if (!result.data) {
    return null;
  }

  return {
    email: normalizedEmail,
    name: normalizeMemberName(result.data.name?.trim() || normalizedEmail),
  };
};

const getRequesterDisplayName = async (email: string) => {
  const profile = await getUserDirectoryProfile(email);
  return profile?.name ?? email;
};

const resolveRequestedGroupMember = async (
  member: RequestedGroupMemberInput,
) => {
  const normalizedName = normalizeMemberName(member.name);

  assert(Boolean(normalizedName), "INVALID_MEMBER_NAME", "Member name is required.");

  const normalizedEmail = member.email ? normalizeEmail(member.email) : null;

  if (normalizedEmail) {
    const profile = await getUserDirectoryProfile(normalizedEmail);

    if (profile) {
      return {
        email: normalizedEmail,
        name: profile.name || normalizedName,
        isGuest: false,
        userId: normalizedEmail,
      };
    }
  }

  return {
    email: createGuestMemberKey(),
    name: normalizedName,
    isGuest: true,
    userId: null,
  };
};

const loadGroup = async (groupId: string) => {
  const result = await dataClient.models.Group.get(
    { id: groupId },
    {
      ...dataOptions,
      selectionSet: groupSelectionSet,
    },
  );

  return result.data ? normalizeGroup(result.data as GroupRecord) : null;
};

const loadGroupMembers = async (groupId: string) => {
  const members = await listAll<GroupMemberRecord>((nextToken) =>
    dataClient.models.GroupMember.list({
      ...dataOptions,
      selectionSet: memberSelectionSet,
      nextToken,
      limit: 200,
      filter: {
        groupId: { eq: groupId },
      },
    }),
  );

  return members.map((member) => normalizeMember(member));
};

const loadGroupExpenses = async (groupId: string) => {
  const expenses = await listAll<GroupExpenseRecord>((nextToken) =>
    dataClient.models.GroupExpense.list({
      ...dataOptions,
      selectionSet: expenseSelectionSet,
      nextToken,
      limit: 200,
      filter: {
        groupId: { eq: groupId },
      },
    }),
  );

  return expenses
    .map((expense) => normalizeExpense(expense))
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
};

const loadGroupSettlements = async (groupId: string) => {
  const settlements = await listAll<SettlementRecord>((nextToken) =>
    dataClient.models.Settlement.list({
      ...dataOptions,
      selectionSet: settlementSelectionSet,
      nextToken,
      limit: 200,
      filter: {
        groupId: { eq: groupId },
      },
    }),
  );

  return settlements
    .map((settlement) => normalizeSettlement(settlement))
    .sort((left, right) => right.settledAt.localeCompare(left.settledAt));
};

const getGroupContext = async (groupId: string, requesterEmail: string) => {
  const group = await loadGroup(groupId);

  assert(Boolean(group), "GROUP_NOT_FOUND", "Group not found.");
  const isAdmin =
    group.owner === requesterEmail || group.admins.includes(requesterEmail);
  const isMember = isAdmin || group.memberEmails.includes(requesterEmail);

  assert(
    isMember,
    "FORBIDDEN",
    "You do not have permission to access this group.",
  );

  return {
    group,
    isAdmin,
    isMember,
  };
};

const serializeExpenseState = (
  expense: ReturnType<typeof normalizeExpense>,
) => ({
  id: expense.id,
  description: expense.description,
  totalAmount: expense.totalAmount,
  paidBy: expense.paidBy,
  splitType: expense.splitType,
  splits: expense.splits,
  participantEmails: expense.participantEmails,
  createdBy: expense.createdBy,
  updatedBy: expense.updatedBy,
  isDeleted: expense.isDeleted,
  recordedAt: expense.recordedAt,
  deletedAt: expense.deletedAt,
  deletedBy: expense.deletedBy,
});

const serializeSettlementState = (
  settlement: ReturnType<typeof normalizeSettlement>,
) => ({
  id: settlement.id,
  fromEmail: settlement.fromEmail,
  toEmail: settlement.toEmail,
  amount: settlement.amount,
  note: settlement.note ?? null,
  settledAt: settlement.settledAt,
  createdBy: settlement.createdBy,
});

const createActivityLog = async ({
  group,
  actorEmail,
  actionType,
  entityType,
  entityId,
  message,
  details,
  beforeState,
  afterState,
  diff,
}: {
  group: ReturnType<typeof normalizeGroup>;
  actorEmail: string;
  actionType:
    | "GROUP_CREATED"
    | "MEMBER_ADDED"
    | "MEMBER_UPDATED"
    | "MEMBER_REMOVED"
    | "EXPENSE_ADDED"
    | "EXPENSE_EDITED"
    | "EXPENSE_DELETED"
    | "SETTLEMENT_RECORDED";
  entityType: "GROUP" | "MEMBER" | "EXPENSE" | "SETTLEMENT";
  entityId?: string | null;
  message: string;
  details?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  diff?: unknown;
}) => {
  const result = await dataClient.models.ActivityLog.create(
    {
      groupId: group.id,
      actorEmail,
      actionType,
      entityType,
      entityId: entityId ?? null,
      message,
      details: serializeJson(details),
      beforeState: serializeJson(beforeState),
      afterState: serializeJson(afterState),
      diff: serializeJson(diff),
      loggedAt: new Date().toISOString(),
      owner: actorEmail,
      admins: group.admins,
      memberEmails: group.memberEmails,
    },
    dataOptions,
  );

  requireResultData(result, "ACTIVITY_LOG_FAILED", "Failed to write the activity log.");
};

const syncGroupAccessState = async ({
  group,
  memberEmails,
}: {
  group: ReturnType<typeof normalizeGroup>;
  memberEmails: string[];
}) => {
  await dataClient.models.Group.update(
    {
      id: group.id,
      memberEmails,
      admins: group.admins,
    },
    dataOptions,
  );

  const [members, expenses, settlements, activities] = await Promise.all([
    loadGroupMembers(group.id),
    loadGroupExpenses(group.id),
    loadGroupSettlements(group.id),
    listAll<ActivityLogRecord>((nextToken) =>
      dataClient.models.ActivityLog.list({
        ...dataOptions,
        selectionSet: ["id", "groupId"],
        nextToken,
        limit: 200,
        filter: {
          groupId: { eq: group.id },
        },
      }),
    ),
  ]);

  await Promise.all([
    ...members.map((member) =>
      dataClient.models.GroupMember.update(
        {
          groupId: group.id,
          email: member.email,
          admins: group.admins,
          memberEmails,
        },
        dataOptions,
      ),
    ),
    ...expenses.map((expense) =>
      dataClient.models.GroupExpense.update(
        {
          id: expense.id,
          admins: group.admins,
          memberEmails,
        },
        dataOptions,
      ),
    ),
    ...settlements.map((settlement) =>
      dataClient.models.Settlement.update(
        {
          id: settlement.id,
          admins: group.admins,
          memberEmails,
        },
        dataOptions,
      ),
    ),
    ...activities.map((activity) =>
      dataClient.models.ActivityLog.update(
        {
          id: activity.id,
          admins: group.admins,
          memberEmails,
        },
        dataOptions,
      ),
    ),
  ]);
};

const buildBalanceRows = async ({
  memberEmails,
  expenses,
  settlements,
}: {
  memberEmails: string[];
  expenses: ReturnType<typeof normalizeExpense>[];
  settlements: ReturnType<typeof normalizeSettlement>[];
}) => {
  const balances = computeGroupBalances({
    memberEmails,
    expenses: expenses.map(
      (expense) =>
        ({
          paidBy: expense.paidBy,
          totalAmount: expense.totalAmount,
          isDeleted: expense.isDeleted,
          splits: expense.splits,
        }) satisfies BalanceExpense,
    ),
    settlements: settlements.map(
      (settlement) =>
        ({
          fromEmail: settlement.fromEmail,
          toEmail: settlement.toEmail,
          amount: settlement.amount,
        }) satisfies BalanceSettlement,
    ),
  });

  return balances;
};

const buildGroupView = async ({
  group,
  requesterEmail,
}: {
  group: ReturnType<typeof normalizeGroup>;
  requesterEmail: string;
}) => {
  const [members, expenses, settlements] = await Promise.all([
    loadGroupMembers(group.id),
    loadGroupExpenses(group.id),
    loadGroupSettlements(group.id),
  ]);

  const balances = await buildBalanceRows({
    memberEmails: group.memberEmails,
    expenses,
    settlements,
  });
  const visibleBalances = balances.filter((balance) =>
    group.memberEmails.includes(balance.email),
  );
  const fallbackProfileNames = await getProfileNameMap(group.memberEmails);
  const memberNames = new Map(
    members.map((member) => [
      member.email,
      member.name || fallbackProfileNames.get(member.email) || member.email,
    ]),
  );
  const isAdmin =
    group.owner === requesterEmail || group.admins.includes(requesterEmail);

  return {
    success: true,
    code: "OK",
    message: getResultMessage("Group view"),
    group: {
      id: group.id,
      name: group.name,
      currency: group.currency,
      createdBy: group.createdBy,
      memberCount: group.memberEmails.length,
      createdAt: group.createdAt,
    },
    permissions: {
      isMember: true,
      isAdmin,
      canManageMembers: isAdmin,
      canEditAnyExpense: isAdmin,
      canRecordExpenses: true,
      canRecordSettlements: true,
    },
    members: members
      .map((member) => ({
        email: member.email,
        name: member.name || fallbackProfileNames.get(member.email) || member.email,
        isGuest: member.isGuest,
        role: member.role,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      totalAmount: expense.totalAmount,
      paidBy: expense.paidBy,
      splitType: expense.splitType,
      splits: expense.splits,
      participantEmails: expense.participantEmails,
      createdBy: expense.createdBy,
      updatedBy: expense.updatedBy,
      isDeleted: expense.isDeleted,
      recordedAt: expense.recordedAt,
      updatedAt: expense.updatedAt,
      deletedAt: expense.deletedAt,
    })),
    settlements: settlements.map((settlement) => ({
      id: settlement.id,
      fromEmail: settlement.fromEmail,
      toEmail: settlement.toEmail,
      amount: settlement.amount,
      note: settlement.note ?? null,
      settledAt: settlement.settledAt,
      createdBy: settlement.createdBy,
    })),
    balances: visibleBalances.map((balance) => ({
      email: balance.email,
      name: memberNames.get(balance.email) ?? fallbackProfileNames.get(balance.email) ?? balance.email,
      balance: balance.balance,
    })),
    simplifiedDebts: simplifyDebts(visibleBalances),
  };
};

const buildFailureResponse = (
  fieldName: string,
  code: string,
  message: string,
) => {
  if (fieldName === "listSplitwiseGroups") {
    return {
      success: false,
      code,
      message,
      groups: [],
    };
  }

  if (fieldName === "getSplitwiseGroup") {
    return {
      success: false,
      code,
      message,
      group: null,
      permissions: null,
      members: [],
      expenses: [],
      settlements: [],
      balances: [],
      simplifiedDebts: [],
    };
  }

  if (fieldName === "listSplitwiseGroupActivity") {
    return {
      success: false,
      code,
      message,
      items: [],
      nextToken: null,
    };
  }

  if (
    fieldName === "createSplitwiseGroup" ||
    fieldName === "addSplitwiseGroupMember" ||
    fieldName === "updateSplitwiseGroupMember" ||
    fieldName === "removeSplitwiseGroupMember"
  ) {
    return {
      success: false,
      code,
      message,
      groupId: null,
    };
  }

  if (
    fieldName === "createSplitwiseExpense" ||
    fieldName === "updateSplitwiseExpense" ||
    fieldName === "deleteSplitwiseExpense"
  ) {
    return {
      success: false,
      code,
      message,
      groupId: null,
      expenseId: null,
    };
  }

  return {
    success: false,
    code,
    message,
    groupId: null,
    settlementId: null,
  };
};

const listSplitwiseGroups = async (requesterEmail: string) => {
  const ownedGroups = await listAll<GroupRecord>((nextToken) =>
    dataClient.models.Group.listGroupByCreatedBy(
      { createdBy: requesterEmail },
      {
        ...dataOptions,
        selectionSet: groupSelectionSet,
        nextToken,
        limit: 100,
      },
    ),
  );

  const memberLinks = await listAll<GroupMemberRecord>((nextToken) =>
    dataClient.models.GroupMember.listGroupMemberByEmail(
      { email: requesterEmail },
      {
        ...dataOptions,
        selectionSet: ["groupId", "email"],
        nextToken,
        limit: 200,
      },
    ),
  );

  const groupsById = new Map<string, ReturnType<typeof normalizeGroup>>();

  for (const group of ownedGroups) {
    const normalized = normalizeGroup(group);
    groupsById.set(normalized.id, normalized);
  }

  await Promise.all(
    memberLinks.map(async (link) => {
      if (groupsById.has(link.groupId)) {
        return;
      }

      const group = await loadGroup(link.groupId);

      if (group) {
        groupsById.set(group.id, group);
      }
    }),
  );

  return {
    success: true,
    code: "OK",
    message: getResultMessage("Group listing"),
    groups: Array.from(groupsById.values())
      .filter((group) => group.memberEmails.includes(requesterEmail))
      .map((group) => ({
        id: group.id,
        name: group.name,
        currency: group.currency,
        createdBy: group.createdBy,
        memberCount: group.memberEmails.length,
        createdAt: group.createdAt,
      }))
      .sort((left, right) =>
        (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
      ),
  };
};

const createSplitwiseGroup = async (
  requesterEmail: string,
  args: {
    name: string;
    currency: "USD" | "LKR";
    members?: RequestedGroupMemberInput[] | null;
  },
) => {
  const name = args.name.trim();
  assert(Boolean(name), "INVALID_GROUP_NAME", "Enter a group name.");
  const requesterName = await getRequesterDisplayName(requesterEmail);
  const requestedMembers = await Promise.all(
    asArray(args.members).map((member) => resolveRequestedGroupMember(member)),
  );
  const dedupedMembers = requestedMembers.filter(
    (member, index, members) =>
      member.email !== requesterEmail &&
      members.findIndex((item) => item.email === member.email) === index,
  );
  const memberEmails = normalizeEmailList([
    requesterEmail,
    ...dedupedMembers.map((member) => member.email),
  ]);

  const groupCreate = await dataClient.models.Group.create(
    {
      name,
      currency: args.currency,
      createdBy: requesterEmail,
      owner: requesterEmail,
      admins: [],
      memberEmails,
    },
    dataOptions,
  );

  const group = normalizeGroup(
    requireResultData(
      groupCreate,
      "CREATE_FAILED",
      "Failed to create the group.",
    ) as GroupRecord,
  );

  await Promise.all(
    [
      {
        email: requesterEmail,
        name: requesterName,
        isGuest: false,
        role: "ADMIN" as const,
        userId: requesterEmail,
      },
      ...dedupedMembers.map((member) => ({
        ...member,
        role: "MEMBER" as const,
      })),
    ].map((member) =>
      dataClient.models.GroupMember.create(
        {
          groupId: group.id,
          email: member.email,
          name: member.name,
          isGuest: member.isGuest,
          role: member.role,
          joinedBy: requesterEmail,
          owner: requesterEmail,
          admins: [],
          memberEmails,
          userId: member.userId,
        },
        dataOptions,
      ),
    ),
  );

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "GROUP_CREATED",
    entityType: "GROUP",
    entityId: group.id,
    message: `${requesterName} created ${name}.`,
    afterState: {
      id: group.id,
      name: group.name,
      currency: group.currency,
      members: [
        { email: requesterEmail, name: requesterName, role: "ADMIN", isGuest: false },
        ...dedupedMembers.map((member) => ({
          email: member.email,
          name: member.name,
          role: "MEMBER",
          isGuest: member.isGuest,
        })),
      ],
    },
  });

  await Promise.all(
    dedupedMembers.map((member) =>
        createActivityLog({
          group,
          actorEmail: requesterEmail,
          actionType: "MEMBER_ADDED",
          entityType: "MEMBER",
          entityId: member.email,
          message: `${requesterName} added ${member.name} to ${name}.`,
          afterState: {
            email: member.email,
            name: member.name,
            isGuest: member.isGuest,
            role: "MEMBER",
          },
        }),
      ),
  );

  return {
    success: true,
    code: "OK",
    message: "Group created successfully.",
    groupId: group.id,
  };
};

const addSplitwiseGroupMember = async (
  requesterEmail: string,
  args: {
    groupId: string;
    name: string;
    email?: string | null;
  },
) => {
  const { group, isAdmin } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  assert(
    isAdmin,
    "FORBIDDEN",
    "Only group admins can manage group membership.",
  );
  const member = await resolveRequestedGroupMember({
    name: args.name,
    email: args.email,
  });
  assert(
    member.email !== group.owner,
    "OWNER_EXISTS",
    "The group creator is already a member.",
  );

  if (group.memberEmails.includes(member.email)) {
    return {
      success: true,
      code: "ALREADY_MEMBER",
      message: `${member.name} is already in this group.`,
      groupId: group.id,
    };
  }

  const nextMemberEmails = normalizeEmailList([...group.memberEmails, member.email]);

  await dataClient.models.GroupMember.create(
    {
      groupId: group.id,
      email: member.email,
      name: member.name,
      isGuest: member.isGuest,
      role: "MEMBER",
      joinedBy: requesterEmail,
      owner: group.owner,
      admins: group.admins,
      memberEmails: nextMemberEmails,
      userId: member.userId,
    },
    dataOptions,
  );

  await syncGroupAccessState({
    group,
    memberEmails: nextMemberEmails,
  });

  const refreshedGroup = {
    ...group,
    memberEmails: nextMemberEmails,
  };

  await createActivityLog({
    group: refreshedGroup,
    actorEmail: requesterEmail,
    actionType: "MEMBER_ADDED",
    entityType: "MEMBER",
    entityId: member.email,
    message: `${requesterName} added ${member.name} to ${group.name}.`,
    afterState: {
      email: member.email,
      name: member.name,
      isGuest: member.isGuest,
      role: "MEMBER",
    },
  });

  return {
    success: true,
    code: "OK",
    message: `${member.name} added to the group.`,
    groupId: group.id,
  };
};

const updateSplitwiseGroupMember = async (
  requesterEmail: string,
  args: {
    groupId: string;
    email: string;
    name: string;
  },
) => {
  const { group, isAdmin } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  assert(
    isAdmin,
    "FORBIDDEN",
    "Only group admins can manage group membership.",
  );

  const email = normalizeEmail(args.email);
  const nextName = normalizeMemberName(args.name);

  assert(Boolean(nextName), "INVALID_MEMBER_NAME", "Member name is required.");

  const members = await loadGroupMembers(group.id);
  const targetMember = members.find((member) => member.email === email);

  assert(Boolean(targetMember), "MEMBER_NOT_FOUND", "User not found in this group.");

  if (targetMember.name === nextName) {
    return {
      success: true,
      code: "NO_CHANGES",
      message: `${targetMember.name} is already using that name.`,
      groupId: group.id,
    };
  }

  const beforeState = {
    email: targetMember.email,
    name: targetMember.name,
    isGuest: targetMember.isGuest,
    role: targetMember.role,
  };
  const afterState = {
    ...beforeState,
    name: nextName,
  };

  await dataClient.models.GroupMember.update(
    {
      groupId: group.id,
      email,
      name: nextName,
    },
    dataOptions,
  );

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "MEMBER_UPDATED",
    entityType: "MEMBER",
    entityId: email,
    message: `${requesterName} updated ${targetMember.name} in ${group.name}.`,
    beforeState,
    afterState,
    diff: buildChangedFieldsDiff(beforeState, afterState),
  });

  return {
    success: true,
    code: "OK",
    message: `${targetMember.name} updated successfully.`,
    groupId: group.id,
  };
};

const removeSplitwiseGroupMember = async (
  requesterEmail: string,
  args: {
    groupId: string;
    email: string;
  },
) => {
  const { group, isAdmin } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  assert(
    isAdmin,
    "FORBIDDEN",
    "Only group admins can manage group membership.",
  );

  const email = normalizeEmail(args.email);
  assert(email !== group.owner, "OWNER_REMOVE", "The group creator cannot be removed.");

  const members = await loadGroupMembers(group.id);
  const targetMember = members.find((member) => member.email === email);

  assert(Boolean(targetMember), "MEMBER_NOT_FOUND", "User not found in this group.");

  const [expenses, settlements] = await Promise.all([
    loadGroupExpenses(group.id),
    loadGroupSettlements(group.id),
  ]);
  const balances = await buildBalanceRows({
    memberEmails: group.memberEmails,
    expenses,
    settlements,
  });
  const removable = assertMemberCanBeRemoved(balances, email);

  if (!removable.success) {
    throw new SplitwiseOperationError(
      removable.error.code,
      removable.error.message,
    );
  }

  const nextMemberEmails = group.memberEmails.filter(
    (memberEmail) => memberEmail !== email,
  );

  await syncGroupAccessState({
    group,
    memberEmails: nextMemberEmails,
  });

  await dataClient.models.GroupMember.delete(
    {
      groupId: group.id,
      email,
    },
    dataOptions,
  );

  const refreshedGroup = {
    ...group,
    memberEmails: nextMemberEmails,
  };

  await createActivityLog({
    group: refreshedGroup,
    actorEmail: requesterEmail,
    actionType: "MEMBER_REMOVED",
    entityType: "MEMBER",
    entityId: email,
    message: `${requesterName} removed ${targetMember.name} from ${group.name}.`,
    beforeState: {
      email,
      name: targetMember.name,
      isGuest: targetMember.isGuest,
      role: targetMember?.role ?? "MEMBER",
    },
  });

  return {
    success: true,
    code: "OK",
    message: `${targetMember.name} removed from the group.`,
    groupId: group.id,
  };
};

const validateExpenseWrite = async ({
  group,
  description,
  totalAmount,
  paidBy,
  splitType,
  splits,
}: {
  group: ReturnType<typeof normalizeGroup>;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitType;
  splits: SplitInput[];
}) => {
  const trimmedDescription = description.trim();

  assert(
    Boolean(trimmedDescription),
    "INVALID_DESCRIPTION",
    "Expense description is required.",
  );

  const normalizedPaidBy = normalizeEmail(paidBy);
  assert(
    group.memberEmails.includes(normalizedPaidBy),
    "INVALID_PAYER",
    "The payer must be a current group member.",
  );

  const splitResolution = resolveExpenseSplits({
    totalAmount,
    splitType,
    splits,
    validMemberEmails: new Set(group.memberEmails),
  });

  if (!splitResolution.success) {
    throw new SplitwiseOperationError(
      splitResolution.error.code,
      splitResolution.error.message,
    );
  }

  return {
    description: trimmedDescription,
    totalAmount,
    paidBy: normalizedPaidBy,
    splitType,
    splits: splitResolution.data,
    participantEmails: splitResolution.data.map((split) => split.email),
  };
};

const createSplitwiseExpense = async (
  requesterEmail: string,
  args: {
    groupId: string;
    description: string;
    totalAmount: number;
    paidBy: string;
    splitType: SplitType;
    splits: SplitInput[];
  },
) => {
  const { group } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  const normalized = await validateExpenseWrite({
    group,
    description: args.description,
    totalAmount: args.totalAmount,
    paidBy: args.paidBy,
    splitType: args.splitType,
    splits: args.splits,
  });
  const recordedAt = new Date().toISOString();

  const result = await dataClient.models.GroupExpense.create(
    {
      groupId: group.id,
      description: normalized.description,
      totalAmount: normalized.totalAmount,
      paidBy: normalized.paidBy,
      splitType: normalized.splitType,
      splits: serializeJson(normalized.splits),
      participantEmails: normalized.participantEmails,
      createdBy: requesterEmail,
      updatedBy: requesterEmail,
      isDeleted: false,
      recordedAt,
      owner: requesterEmail,
      admins: group.admins,
      memberEmails: group.memberEmails,
    },
    dataOptions,
  );

  const expense = normalizeExpense(
    requireResultData(
      result,
      "CREATE_FAILED",
      "Failed to create the expense.",
    ) as GroupExpenseRecord,
  );

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "EXPENSE_ADDED",
    entityType: "EXPENSE",
    entityId: expense.id,
    message: `${requesterName} added "${expense.description}" to ${group.name}.`,
    afterState: serializeExpenseState(expense),
  });

  return {
    success: true,
    code: "OK",
    message: "Expense created successfully.",
    groupId: group.id,
    expenseId: expense.id,
  };
};

const updateSplitwiseExpense = async (
  requesterEmail: string,
  args: {
    groupId: string;
    expenseId: string;
    description: string;
    totalAmount: number;
    paidBy: string;
    splitType: SplitType;
    splits: SplitInput[];
  },
) => {
  const { group, isAdmin } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  const currentExpenseResult = await dataClient.models.GroupExpense.get(
    { id: args.expenseId },
    {
      ...dataOptions,
      selectionSet: expenseSelectionSet,
    },
  );

  assert(Boolean(currentExpenseResult.data), "EXPENSE_NOT_FOUND", "Expense not found.");
  const currentExpense = normalizeExpense(
    currentExpenseResult.data as GroupExpenseRecord,
  );

  assert(
    currentExpense.groupId === group.id,
    "EXPENSE_NOT_FOUND",
    "Expense not found in this group.",
  );
  assert(
    requesterEmail === currentExpense.createdBy || isAdmin,
    "FORBIDDEN",
    "Only the expense creator or a group admin can edit this expense.",
  );

  const normalized = await validateExpenseWrite({
    group,
    description: args.description,
    totalAmount: args.totalAmount,
    paidBy: args.paidBy,
    splitType: args.splitType,
    splits: args.splits,
  });
  const beforeState = serializeExpenseState(currentExpense);

  const result = await dataClient.models.GroupExpense.update(
    {
      id: currentExpense.id,
      description: normalized.description,
      totalAmount: normalized.totalAmount,
      paidBy: normalized.paidBy,
      splitType: normalized.splitType,
      splits: serializeJson(normalized.splits),
      participantEmails: normalized.participantEmails,
      updatedBy: requesterEmail,
    },
    {
      ...dataOptions,
      selectionSet: expenseSelectionSet,
    },
  );

  const updatedExpense = normalizeExpense(
    requireResultData(
      result,
      "UPDATE_FAILED",
      "Failed to update the expense.",
    ) as GroupExpenseRecord,
  );
  const afterState = serializeExpenseState(updatedExpense);

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "EXPENSE_EDITED",
    entityType: "EXPENSE",
    entityId: updatedExpense.id,
    message: `${requesterName} updated "${updatedExpense.description}".`,
    beforeState,
    afterState,
    diff: buildChangedFieldsDiff(beforeState, afterState),
  });

  return {
    success: true,
    code: "OK",
    message: "Expense updated successfully.",
    groupId: group.id,
    expenseId: updatedExpense.id,
  };
};

const deleteSplitwiseExpense = async (
  requesterEmail: string,
  args: {
    groupId: string;
    expenseId: string;
  },
) => {
  const { group, isAdmin } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  const currentExpenseResult = await dataClient.models.GroupExpense.get(
    { id: args.expenseId },
    {
      ...dataOptions,
      selectionSet: expenseSelectionSet,
    },
  );

  assert(Boolean(currentExpenseResult.data), "EXPENSE_NOT_FOUND", "Expense not found.");
  const currentExpense = normalizeExpense(
    currentExpenseResult.data as GroupExpenseRecord,
  );

  assert(
    currentExpense.groupId === group.id,
    "EXPENSE_NOT_FOUND",
    "Expense not found in this group.",
  );
  assert(
    requesterEmail === currentExpense.createdBy || isAdmin,
    "FORBIDDEN",
    "Only the expense creator or a group admin can delete this expense.",
  );

  if (currentExpense.isDeleted) {
    return {
      success: true,
      code: "ALREADY_DELETED",
      message: "Expense already deleted.",
      groupId: group.id,
      expenseId: currentExpense.id,
    };
  }

  const beforeState = serializeExpenseState(currentExpense);
  const result = await dataClient.models.GroupExpense.update(
    {
      id: currentExpense.id,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: requesterEmail,
      updatedBy: requesterEmail,
    },
    {
      ...dataOptions,
      selectionSet: expenseSelectionSet,
    },
  );

  const deletedExpense = normalizeExpense(
    requireResultData(
      result,
      "UPDATE_FAILED",
      "Failed to delete the expense.",
    ) as GroupExpenseRecord,
  );
  const afterState = serializeExpenseState(deletedExpense);

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "EXPENSE_DELETED",
    entityType: "EXPENSE",
    entityId: deletedExpense.id,
    message: `${requesterName} deleted "${deletedExpense.description}".`,
    beforeState,
    afterState,
    diff: buildChangedFieldsDiff(beforeState, afterState),
  });

  return {
    success: true,
    code: "OK",
    message: "Expense deleted successfully.",
    groupId: group.id,
    expenseId: deletedExpense.id,
  };
};

const recordSplitwiseSettlement = async (
  requesterEmail: string,
  args: {
    groupId: string;
    fromEmail: string;
    toEmail: string;
    amount: number;
    note?: string | null;
  },
) => {
  const { group } = await getGroupContext(args.groupId, requesterEmail);
  const requesterName = await getRequesterDisplayName(requesterEmail);
  const fromEmail = normalizeEmail(args.fromEmail);
  const toEmail = normalizeEmail(args.toEmail);

  assert(
    group.memberEmails.includes(fromEmail) && group.memberEmails.includes(toEmail),
    "INVALID_SETTLEMENT_PARTIES",
    "Settlements must be recorded between current group members.",
  );

  const [expenses, settlements, members] = await Promise.all([
    loadGroupExpenses(group.id),
    loadGroupSettlements(group.id),
    loadGroupMembers(group.id),
  ]);
  const memberNames = new Map(members.map((member) => [member.email, member.name]));
  const balances = await buildBalanceRows({
    memberEmails: group.memberEmails,
    expenses,
    settlements,
  });
  const validation = validateSettlement({
    balances,
    fromEmail,
    toEmail,
    amount: args.amount,
  });

  if (!validation.success) {
    throw new SplitwiseOperationError(
      validation.error.code,
      validation.error.message,
    );
  }

  const result = await dataClient.models.Settlement.create(
    {
      groupId: group.id,
      fromEmail,
      toEmail,
      amount: args.amount,
      note: args.note?.trim() || null,
      settledAt: new Date().toISOString(),
      createdBy: requesterEmail,
      owner: requesterEmail,
      admins: group.admins,
      memberEmails: group.memberEmails,
    },
    dataOptions,
  );

  const settlement = normalizeSettlement(
    requireResultData(
      result,
      "CREATE_FAILED",
      "Failed to record the settlement.",
    ) as SettlementRecord,
  );

  await createActivityLog({
    group,
    actorEmail: requesterEmail,
    actionType: "SETTLEMENT_RECORDED",
    entityType: "SETTLEMENT",
    entityId: settlement.id,
    message: `${requesterName} recorded a settlement from ${
      memberNames.get(fromEmail) ?? fromEmail
    } to ${memberNames.get(toEmail) ?? toEmail}.`,
    afterState: serializeSettlementState(settlement),
  });

  return {
    success: true,
    code: "OK",
    message: "Settlement recorded successfully.",
    groupId: group.id,
    settlementId: settlement.id,
  };
};

const listSplitwiseGroupActivity = async (
  requesterEmail: string,
  args: {
    groupId: string;
    limit?: number | null;
    nextToken?: string | null;
  },
) => {
  const { group } = await getGroupContext(args.groupId, requesterEmail);
  const pageSize = Math.max(1, Math.min(args.limit ?? 20, 50));

  const result = await dataClient.models.ActivityLog.listActivityLogByGroupIdAndLoggedAt(
    { groupId: group.id },
    {
      ...dataOptions,
      selectionSet: activitySelectionSet,
      limit: pageSize,
      nextToken: args.nextToken ?? null,
      sortDirection: "DESC",
    },
  );

  const items = asArray(result.data).map((item) =>
    normalizeActivity(item as ActivityLogRecord),
  );
  const names = await getProfileNameMap(items.map((item) => item.actorEmail));

  return {
    success: true,
    code: "OK",
    message: getResultMessage("Activity listing"),
    items: items.map((item) => ({
      ...item,
      actorName: names.get(item.actorEmail) ?? item.actorEmail,
    })),
    nextToken: result.nextToken ?? null,
  };
};

export const handler = async (event: unknown) => {
  await ensureAmplifyConfigured();

  const fieldName = getFieldName(event);
  const requesterEmail = getRequesterEmail(
    event && typeof event === "object" && "identity" in event
      ? (event as { identity?: unknown }).identity
      : null,
  );

  if (!requesterEmail) {
    return buildFailureResponse(
      fieldName,
      "UNAUTHORIZED",
      "You must be signed in to use Split-Wise.",
    );
  }

  try {
    if (fieldName === "listSplitwiseGroups") {
      return await listSplitwiseGroups(requesterEmail);
    }

    if (fieldName === "getSplitwiseGroup") {
      const args = getArguments<{ groupId: string }>(event);
      const { group } = await getGroupContext(args.groupId, requesterEmail);
      return buildGroupView({ group, requesterEmail });
    }

    if (fieldName === "listSplitwiseGroupActivity") {
      return await listSplitwiseGroupActivity(
        requesterEmail,
        getArguments<{
          groupId: string;
          limit?: number | null;
          nextToken?: string | null;
        }>(event),
      );
    }

    if (fieldName === "createSplitwiseGroup") {
      return await createSplitwiseGroup(
        requesterEmail,
        getArguments<{
          name: string;
          currency: "USD" | "LKR";
          members?: RequestedGroupMemberInput[] | null;
        }>(event),
      );
    }

    if (fieldName === "addSplitwiseGroupMember") {
      return await addSplitwiseGroupMember(
        requesterEmail,
        getArguments<{
          groupId: string;
          name: string;
          email?: string | null;
        }>(event),
      );
    }

    if (fieldName === "removeSplitwiseGroupMember") {
      return await removeSplitwiseGroupMember(
        requesterEmail,
        getArguments<{
          groupId: string;
          email: string;
        }>(event),
      );
    }

    if (fieldName === "updateSplitwiseGroupMember") {
      return await updateSplitwiseGroupMember(
        requesterEmail,
        getArguments<{
          groupId: string;
          email: string;
          name: string;
        }>(event),
      );
    }

    if (fieldName === "createSplitwiseExpense") {
      return await createSplitwiseExpense(
        requesterEmail,
        getArguments<{
          groupId: string;
          description: string;
          totalAmount: number;
          paidBy: string;
          splitType: SplitType;
          splits: SplitInput[];
        }>(event),
      );
    }

    if (fieldName === "updateSplitwiseExpense") {
      return await updateSplitwiseExpense(
        requesterEmail,
        getArguments<{
          groupId: string;
          expenseId: string;
          description: string;
          totalAmount: number;
          paidBy: string;
          splitType: SplitType;
          splits: SplitInput[];
        }>(event),
      );
    }

    if (fieldName === "deleteSplitwiseExpense") {
      return await deleteSplitwiseExpense(
        requesterEmail,
        getArguments<{
          groupId: string;
          expenseId: string;
        }>(event),
      );
    }

    if (fieldName === "recordSplitwiseSettlement") {
      return await recordSplitwiseSettlement(
        requesterEmail,
        getArguments<{
          groupId: string;
          fromEmail: string;
          toEmail: string;
          amount: number;
          note?: string | null;
        }>(event),
      );
    }

    return buildFailureResponse(
      fieldName,
      "INVALID_OPERATION",
      "Unknown Split-Wise operation.",
    );
  } catch (error) {
    if (error instanceof SplitwiseOperationError) {
      return buildFailureResponse(fieldName, error.code, error.message);
    }

    console.error("Split-Wise operation failed.", error);

    return buildFailureResponse(
      fieldName,
      "UNEXPECTED_ERROR",
      "Something went wrong while processing the Split-Wise request.",
    );
  }
};
