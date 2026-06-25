import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { client, getUserPoolAuthOptions } from "@/lib/amplify-client";
import { getBudgetOverview } from "@/lib/graphql/budget";
import { calcPercentage, calcVariance } from "@/lib/utils";
import type {
  BudgetSetupInput,
  CurrentUser,
  EventCreationInput,
  EventPermissions,
  EventStatus,
  EventSummary,
  EventTeamSnapshot,
  MemberRole,
  TeamMemberInput,
  UserDirectoryProfile,
} from "@/types";

const defaultCategoryPalette = [
  "#1E3A5F",
  "#2E75B6",
  "#16A34A",
  "#F0A500",
  "#DC2626",
  "#0F766E",
];

const defaultPermissions: EventPermissions = {
  isOwner: false,
  isAdmin: false,
  isEditor: false,
  isViewer: false,
  canEditBudget: false,
  canEditExpenses: false,
  canManageRoles: false,
  canManageEventLifecycle: false,
  canDeleteEvent: false,
};

const roleSortOrder: Record<MemberRole, number> = {
  ADMIN: 0,
  EDITOR: 1,
  VIEWER: 2,
};

const directorySelectionSet = ["email", "name", "searchName", "lastSeenAt"] as const;

const eventCreateSelectionSet = ["id"] as const;
const eventUpdateSelectionSet = ["id", "status"] as const;
const eventAccessSelectionSet = [
  "id",
  "name",
  "description",
  "date",
  "venue",
  "eventType",
  "status",
  "owner",
  "admins",
  "editors",
  "viewers",
] as const;
const eventListSelectionSet = [
  "id",
  "name",
  "description",
  "date",
  "createdAt",
  "venue",
  "eventType",
  "status",
  "owner",
  "admins",
  "editors",
  "viewers",
] as const;
const eventMembershipSelectionSet = ["eventId"] as const;
const eventListPageSize = 200;

type EventAccessRecord = {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  venue?: string | null;
  eventType: EventSummary["eventType"];
  status: EventStatus;
  owner: string;
  admins?: (string | null)[] | null;
  editors?: (string | null)[] | null;
  viewers?: (string | null)[] | null;
  createdAt?: string | null;
};

const getResultErrorMessage = (
  errors: readonly { message?: string | null }[] | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

const asArray = <T>(data?: readonly T[] | T[] | null) =>
  Array.isArray(data) ? [...data] : [];

const normalizeMembers = (ownerEmail: string, members: TeamMemberInput[]) => {
  const deduped = new Map<string, TeamMemberInput>();

  for (const member of members) {
    deduped.set(member.email.toLowerCase(), {
      email: member.email.toLowerCase(),
      role: member.role,
    });
  }

  deduped.delete(ownerEmail.toLowerCase());

  return Array.from(deduped.values());
};

const splitMembersByRole = (ownerEmail: string, members: TeamMemberInput[]) => {
  const normalized = normalizeMembers(ownerEmail, members);

  return normalized.reduce(
    (accumulator, member) => {
      if (member.role === "ADMIN") {
        accumulator.admins.push(member.email);
      } else if (member.role === "EDITOR") {
        accumulator.editors.push(member.email);
      } else {
        accumulator.viewers.push(member.email);
      }

      return accumulator;
    },
    {
      admins: [] as string[],
      editors: [] as string[],
      viewers: [] as string[],
    },
  );
};

const buildBudgetSummary = (
  budget:
    | {
        totalAmount?: number | null;
        totalPlanned?: number | null;
        totalActual?: number | null;
        variance?: number | null;
        currency?: string | null;
      }
    | null
    | undefined,
) => {
  const totalBudget = budget?.totalAmount ?? 0;
  const totalPlanned = budget?.totalPlanned ?? 0;
  const totalActual = budget?.totalActual ?? 0;
  const variance = budget?.variance ?? calcVariance(totalPlanned, totalActual);

  return {
    totalBudget,
    totalPlanned,
    totalActual,
    variance,
    utilizationPercentage: calcPercentage(totalActual, totalBudget),
    currency: (budget?.currency as EventSummary["currency"] | undefined) ?? "USD",
  };
};

const sanitizeUserDisplayName = (name: string | null | undefined, email: string) => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return email;
  }

  return trimmedName;
};

const buildDirectoryProfileInput = (profile: CurrentUser) => {
  const normalizedEmail = profile.email.toLowerCase();
  const name = sanitizeUserDisplayName(profile.name, normalizedEmail);

  return {
    email: normalizedEmail,
    name,
    userId: profile.id,
    searchName: name.toLowerCase(),
    lastSeenAt: new Date().toISOString(),
  };
};

export const getCurrentUserProfile = async (): Promise<CurrentUser | null> => {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();

    return {
      id: user.userId,
      email: (attributes.email ?? "").toLowerCase(),
      name:
        attributes.name ??
        attributes.preferred_username ??
        user.username,
    };
  } catch {
    return null;
  }
};

export const syncCurrentUserDirectoryProfile = async (
  profileOverride?: CurrentUser | null,
) => {
  const profile = profileOverride ?? (await getCurrentUserProfile());

  if (!profile) {
    return null;
  }

  const nextProfile = buildDirectoryProfileInput(profile);

  try {
    const userPoolAuth = await getUserPoolAuthOptions();
    const existingResult = await client.models.UserDirectoryProfile.get(
      { email: nextProfile.email },
      {
        ...userPoolAuth,
        selectionSet: directorySelectionSet,
      },
    );

    const existingProfile = existingResult.data;

    if (!existingProfile) {
      await client.models.UserDirectoryProfile.create(nextProfile, userPoolAuth);
      return {
        email: nextProfile.email,
        name: nextProfile.name,
        lastSeenAt: nextProfile.lastSeenAt,
      } satisfies UserDirectoryProfile;
    }

    await client.models.UserDirectoryProfile.update(nextProfile, userPoolAuth);

    return {
      email: nextProfile.email,
      name: nextProfile.name,
      lastSeenAt: nextProfile.lastSeenAt,
    } satisfies UserDirectoryProfile;
  } catch (error) {
    console.error("Failed to sync directory profile.", error);
    return null;
  }
};

export const listUserDirectoryProfiles = async (): Promise<UserDirectoryProfile[]> => {
  try {
    const userPoolAuth = await getUserPoolAuthOptions();
    const result = await client.models.UserDirectoryProfile.list({
      ...userPoolAuth,
      selectionSet: directorySelectionSet,
      limit: 200,
    });

    return asArray(result.data)
      .map((profile) => ({
        email: profile.email.toLowerCase(),
        name: sanitizeUserDisplayName(profile.name, profile.email.toLowerCase()),
        lastSeenAt: profile.lastSeenAt,
      }))
      .sort((first, second) =>
        (second.lastSeenAt ?? "").localeCompare(first.lastSeenAt ?? ""),
      );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to load registered users.",
    );
  }
};

export const getEventPermissions = (
  currentEmail: string,
  event: {
    owner?: string | null;
    admins?: (string | null)[] | null;
    editors?: (string | null)[] | null;
    viewers?: (string | null)[] | null;
  },
): EventPermissions => {
  const normalizedEmail = currentEmail.toLowerCase();
  if (!normalizedEmail) {
    return defaultPermissions;
  }

  const ownerEmail = event.owner?.toLowerCase() ?? "";
  const admins = normalizeEmailList(event.admins);
  const editors = normalizeEmailList(event.editors);
  const viewers = normalizeEmailList(event.viewers);
  const isOwner = ownerEmail === normalizedEmail;
  const isAdmin = isOwner || admins.includes(normalizedEmail);
  const isEditor = isAdmin || editors.includes(normalizedEmail);
  const isViewer = isEditor || viewers.includes(normalizedEmail);

  return {
    isOwner,
    isAdmin,
    isEditor,
    isViewer,
    canEditBudget: isAdmin,
    canEditExpenses: isEditor,
    canManageRoles: isAdmin,
    canManageEventLifecycle: isAdmin,
    canDeleteEvent: isAdmin,
  };
};

const isEventSoftDeleted = (event: { status?: string | null }) =>
  event.status === "ARCHIVED";

const listOwnedEvents = async (ownerEmail: string) => {
  const events: EventAccessRecord[] = [];
  const userPoolAuth = await getUserPoolAuthOptions();
  let nextToken: string | null | undefined;

  do {
    const result = await client.models.Event.listEventByOwnerAndDate(
      { owner: ownerEmail },
      {
        ...userPoolAuth,
        limit: eventListPageSize,
        nextToken,
        selectionSet: eventListSelectionSet,
      },
    );

    events.push(
      ...asArray(result.data).map((event) => normalizeEventAccessRecord(event)),
    );
    nextToken = result.nextToken;
  } while (nextToken);

  return events;
};

const listMemberEventIds = async (email: string) => {
  const eventIds = new Set<string>();
  const userPoolAuth = await getUserPoolAuthOptions();
  let nextToken: string | null | undefined;

  do {
    const result = await client.models.EventMember.listEventMemberByEmail(
      { email },
      {
        ...userPoolAuth,
        limit: eventListPageSize,
        nextToken,
        selectionSet: eventMembershipSelectionSet,
      },
    );

    for (const member of asArray(result.data)) {
      eventIds.add(member.eventId);
    }

    nextToken = result.nextToken;
  } while (nextToken);

  return Array.from(eventIds);
};

const getEventSummaryRecord = async (eventId: string) => {
  try {
    const userPoolAuth = await getUserPoolAuthOptions();
    const result = await client.models.Event.get(
      { id: eventId },
      {
        ...userPoolAuth,
        selectionSet: eventListSelectionSet,
      },
    );

    return result.data ? normalizeEventAccessRecord(result.data) : null;
  } catch {
    return null;
  }
};

export const listEventsForCurrentUser = async (): Promise<EventSummary[]> => {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      return [];
    }

    const [ownedEvents, memberEventIds] = await Promise.all([
      listOwnedEvents(profile.email),
      listMemberEventIds(profile.email),
    ]);

    const eventsById = new Map<string, EventAccessRecord>(
      ownedEvents.map((event) => [event.id, event]),
    );
    const linkedEvents = await Promise.all(
      memberEventIds
        .filter((eventId) => !eventsById.has(eventId))
        .map((eventId) => getEventSummaryRecord(eventId)),
    );

    for (const event of linkedEvents) {
      if (event) {
        eventsById.set(event.id, event);
      }
    }

    const summaries = await Promise.all(
      Array.from(eventsById.values())
        .filter((event) => !isEventSoftDeleted(event))
        .filter((event) => getEventPermissions(profile.email, event).isViewer)
        .map(async (event) => {
        let budgetSummary = buildBudgetSummary(null);

        try {
          const overview = await getBudgetOverview(event.id);

          if (overview) {
            budgetSummary = {
              totalBudget: overview.totalAmount,
              totalPlanned: overview.totalPlanned,
              totalActual: overview.totalActual,
              variance: overview.variance,
              utilizationPercentage: calcPercentage(
                overview.totalActual,
                overview.totalAmount,
              ),
              currency: overview.currency,
            };
          }
        } catch {
          budgetSummary = buildBudgetSummary(null);
        }

        return {
          id: event.id,
          name: event.name,
          description: event.description,
          date: event.date,
          createdAt: event.createdAt,
          venue: event.venue,
          eventType: event.eventType,
          status: event.status,
          ...budgetSummary,
        } satisfies EventSummary;
        }),
    );

    return summaries.sort((first, second) => {
      const firstCreated = first.createdAt ?? "";
      const secondCreated = second.createdAt ?? "";

      if (firstCreated && secondCreated && firstCreated !== secondCreated) {
        return secondCreated.localeCompare(firstCreated);
      }

      return second.date.localeCompare(first.date);
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to load events.",
    );
  }
};

const createBudgetCategories = async (
  budgetId: string,
  ownerEmail: string,
  members: TeamMemberInput[],
  setup: BudgetSetupInput,
) => {
  const memberGroups = splitMembersByRole(ownerEmail, members);
  const userPoolAuth = await getUserPoolAuthOptions();
  const results = [];

  for (const [index, category] of setup.categories.entries()) {
    const categoryResult = await client.models.BudgetCategory.create(
      {
        budgetId,
        name: category.name,
        plannedAmount: category.plannedAmount,
        actualAmount: 0,
        order: index,
        color:
          category.color || defaultCategoryPalette[index % defaultCategoryPalette.length],
        owner: ownerEmail,
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      userPoolAuth,
    );

    if (!categoryResult.data) {
      throw new Error(
        getResultErrorMessage(
          categoryResult.errors,
          "Failed to create one or more budget categories.",
        ),
      );
    }

    const createdCategory = categoryResult.data;

    const lineItems =
      category.lineItems?.length
        ? category.lineItems
        : [
            {
              description: `${category.name} allocation`,
              plannedAmount: category.plannedAmount,
              notes: "Auto-created so expenses can be tracked immediately.",
            },
          ];

    const lineItemResults = await Promise.all(
      lineItems.map((lineItem) =>
        client.models.LineItem.create(
          {
            categoryId: createdCategory.id,
            description: lineItem.description,
            plannedAmount: lineItem.plannedAmount,
            notes: lineItem.notes,
            owner: ownerEmail,
            admins: memberGroups.admins,
            editors: memberGroups.editors,
            viewers: memberGroups.viewers,
          },
          userPoolAuth,
        ),
      ),
    );

    const failedLineItemResult = lineItemResults.find((result) => !result.data);

    if (failedLineItemResult) {
      throw new Error(
        getResultErrorMessage(
          failedLineItemResult.errors,
          `Failed to create line items for ${category.name}.`,
        ),
      );
    }

    results.push(categoryResult);
  }

  return results;
};

export const createEventGraph = async (input: EventCreationInput) => {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    throw new Error("You must be signed in to create an event.");
  }

  const memberGroups = splitMembersByRole(profile.email, input.members);
  const status = input.status ?? "DRAFT";
  const userPoolAuth = await getUserPoolAuthOptions();

  const eventResult = await client.models.Event.create(
    {
      name: input.name.trim(),
      description: input.description?.trim(),
      date: input.date,
      venue: input.venue?.trim(),
      eventType: input.eventType,
      status,
      owner: profile.email,
      admins: memberGroups.admins,
      editors: memberGroups.editors,
      viewers: memberGroups.viewers,
    },
    {
      ...userPoolAuth,
      selectionSet: eventCreateSelectionSet,
    },
  );

  const event = eventResult.data;

  if (!event) {
    throw new Error(
      getResultErrorMessage(eventResult.errors, "Failed to create the event."),
    );
  }

  const totalPlanned = input.budget.categories.reduce(
    (sum, category) => sum + category.plannedAmount,
    0,
  );

  const budgetResult = await client.models.Budget.create(
    {
      eventId: event.id,
      totalAmount: input.budget.totalAmount,
      currency: input.budget.currency,
      totalPlanned,
      totalActual: 0,
      variance: totalPlanned,
      owner: profile.email,
      admins: memberGroups.admins,
      editors: memberGroups.editors,
      viewers: memberGroups.viewers,
    },
    userPoolAuth,
  );

  if (!budgetResult.data) {
    throw new Error(
      getResultErrorMessage(
        budgetResult.errors,
        "Failed to create the event budget.",
      ),
    );
  }

  const memberResults = await Promise.all(
    normalizeMembers(profile.email, input.members).map((member) =>
      client.models.EventMember.create(
        {
          eventId: event.id,
          userId: member.email,
          email: member.email,
          role: member.role,
          owner: profile.email,
          admins: memberGroups.admins,
          editors: memberGroups.editors,
          viewers: memberGroups.viewers,
        },
        userPoolAuth,
      ),
    ),
  );

  const failedMemberResult = memberResults.find((result) => !result.data);

  if (failedMemberResult) {
    throw new Error(
      getResultErrorMessage(
        failedMemberResult.errors,
        "Failed to add one or more event members.",
      ),
    );
  }

  await createBudgetCategories(
    budgetResult.data.id,
    profile.email,
    input.members,
    input.budget,
  );

  return event.id;
};

const normalizeEmailList = (emails?: (string | null)[] | null) =>
  (emails ?? [])
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

const normalizeEventAccessRecord = (event: EventAccessRecord) => ({
  ...event,
  owner: event.owner.toLowerCase(),
  admins: normalizeEmailList(event.admins),
  editors: normalizeEmailList(event.editors),
  viewers: normalizeEmailList(event.viewers),
});

const assertCanReadEvent = (
  profile: CurrentUser,
  event: EventAccessRecord,
) => {
  const permissions = getEventPermissions(profile.email, event);

  if (!permissions.isViewer) {
    throw new Error("You do not have permission to view this event.");
  }

  return permissions;
};

export const getEventAccessContext = async (eventId: string) => {
  const userPoolAuth = await getUserPoolAuthOptions();
  const [eventResult, profile] = await Promise.all([
    client.models.Event.get(
      { id: eventId },
      {
        ...userPoolAuth,
        selectionSet: eventAccessSelectionSet,
      },
    ),
    getCurrentUserProfile(),
  ]);

  const event = eventResult.data;

  if (!event || isEventSoftDeleted(event)) {
    throw new Error("Event not found.");
  }

  if (!profile) {
    throw new Error("You must be signed in to view this event.");
  }

  const normalizedEvent = normalizeEventAccessRecord(event);
  const permissions = assertCanReadEvent(profile, normalizedEvent);

  return {
    event: normalizedEvent,
    currentUser: profile,
    permissions,
  };
};

const sortMembersForDisplay = (members: TeamMemberInput[]) =>
  [...members].sort((first, second) => {
    if (first.role !== second.role) {
      return roleSortOrder[first.role] - roleSortOrder[second.role];
    }

    return first.email.localeCompare(second.email);
  });

const loadEventTeamContext = async (eventId: string) => {
  const userPoolAuth = await getUserPoolAuthOptions();
  const [baseContext, membersResult] = await Promise.all([
    getEventAccessContext(eventId),
    client.models.EventMember.list({
      ...userPoolAuth,
      filter: {
        eventId: { eq: eventId },
      },
      selectionSet: ["eventId", "email", "role"],
    }),
  ]);

  const members = normalizeMembers(
    baseContext.event.owner,
    asArray(membersResult.data).map((member) => ({
      email: member.email.toLowerCase(),
      role: member.role as MemberRole,
    })),
  );

  return {
    ...baseContext,
    members,
  };
};

const loadEventLifecycleContext = async (eventId: string) => {
  const { event, currentUser: profile, permissions } = await getEventAccessContext(eventId);

  if (!permissions.canManageEventLifecycle) {
    throw new Error("Only event admins can manage this event.");
  }

  return {
    event,
    profile,
    permissions,
  };
};

const assertMutationSucceeded = (
  result: {
    data?: unknown | null;
    errors?: readonly { message?: string | null }[];
  },
  fallback: string,
) => {
  if (result.data) {
    return;
  }

  throw new Error(getResultErrorMessage(result.errors, fallback));
};

const assertMutationBatchSucceeded = (
  results: Array<{
    data?: unknown | null;
    errors?: readonly { message?: string | null }[];
  }>,
  fallback: string,
) => {
  const failedResult = results.find((result) => !result.data);

  if (!failedResult) {
    return;
  }

  throw new Error(getResultErrorMessage(failedResult.errors, fallback));
};

const syncEventAccessState = async (
  eventId: string,
  ownerEmail: string,
  members: TeamMemberInput[],
  targetRoleChange: { email: string; role: MemberRole },
) => {
  const memberGroups = splitMembersByRole(ownerEmail, members);
  const userPoolAuth = await getUserPoolAuthOptions();
  const [budgetResult, expenseResult, memberResult, notificationResult] =
    await Promise.all([
      client.models.Budget.list({
        ...userPoolAuth,
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id", "categories.id", "categories.lineItems.id"],
      }),
      client.models.Expense.list({
        ...userPoolAuth,
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id"],
      }),
      client.models.EventMember.list({
        ...userPoolAuth,
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["eventId", "email", "role"],
      }),
      client.models.Notification.list({
        ...userPoolAuth,
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id"],
      }),
    ]);

  const budgets = asArray(budgetResult.data);
  const expenses = asArray(expenseResult.data);
  const memberRecords = asArray(memberResult.data);
  const notifications = asArray(notificationResult.data);

  const budgetUpdates = budgets.map((budget) =>
    client.models.Budget.update(
      {
        id: budget.id,
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      userPoolAuth,
    ),
  );

  const categoryUpdates = budgets.flatMap((budget) =>
    (budget.categories ?? []).map((category) =>
      client.models.BudgetCategory.update(
        {
          id: category.id,
          admins: memberGroups.admins,
          editors: memberGroups.editors,
          viewers: memberGroups.viewers,
        },
        userPoolAuth,
      ),
    ),
  );

  const lineItemUpdates = budgets.flatMap((budget) =>
    (budget.categories ?? []).flatMap((category) =>
      (category.lineItems ?? []).map((lineItem) =>
        client.models.LineItem.update(
          {
            id: lineItem.id,
            admins: memberGroups.admins,
            editors: memberGroups.editors,
            viewers: memberGroups.viewers,
          },
          userPoolAuth,
        ),
      ),
    ),
  );

  const expenseUpdates = expenses.map((expense) =>
    client.models.Expense.update(
      {
        id: expense.id,
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      userPoolAuth,
    ),
  );

  const memberUpdates = memberRecords.map((member) =>
    client.models.EventMember.update(
      {
        eventId: member.eventId,
        email: member.email,
        role:
          member.email.toLowerCase() === targetRoleChange.email
            ? targetRoleChange.role
            : (member.role as MemberRole),
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      userPoolAuth,
    ),
  );

  const notificationUpdates = notifications.map((notification) =>
    client.models.Notification.update(
      {
        id: notification.id,
        admins: memberGroups.admins,
      },
      userPoolAuth,
    ),
  );

  const [
    budgetMutations,
    categoryMutations,
    lineItemMutations,
    expenseMutations,
    memberMutations,
    notificationMutations,
  ] = await Promise.all([
    Promise.all(budgetUpdates),
    Promise.all(categoryUpdates),
    Promise.all(lineItemUpdates),
    Promise.all(expenseUpdates),
    Promise.all(memberUpdates),
    Promise.all(notificationUpdates),
  ]);

  assertMutationBatchSucceeded(
    budgetMutations,
    "Failed to update budget permissions.",
  );
  assertMutationBatchSucceeded(
    categoryMutations,
    "Failed to update category permissions.",
  );
  assertMutationBatchSucceeded(
    lineItemMutations,
    "Failed to update line item permissions.",
  );
  assertMutationBatchSucceeded(
    expenseMutations,
    "Failed to update expense permissions.",
  );
  assertMutationBatchSucceeded(
    memberMutations,
    "Failed to update team member permissions.",
  );
  assertMutationBatchSucceeded(
    notificationMutations,
    "Failed to update notification permissions.",
  );

  const eventUpdate = await client.models.Event.update(
    {
      id: eventId,
      admins: memberGroups.admins,
      editors: memberGroups.editors,
      viewers: memberGroups.viewers,
    },
    {
      ...userPoolAuth,
      selectionSet: eventCreateSelectionSet,
    },
  );

  assertMutationSucceeded(eventUpdate, "Failed to update event permissions.");
};

export const getEventTeamSnapshot = async (
  eventId: string,
): Promise<EventTeamSnapshot> => {
  try {
    const context = await loadEventTeamContext(eventId);

    return {
      ...context,
      members: sortMembersForDisplay(context.members),
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to load event users.",
    );
  }
};

export const addEventMember = async (
  eventId: string,
  email: string,
  role: MemberRole,
): Promise<EventTeamSnapshot> => {
  const context = await loadEventTeamContext(eventId);
  const profile = context.currentUser;
  const normalizedEmail = email.toLowerCase();

  if (!profile) {
    throw new Error("You must be signed in to add users to this event.");
  }

  if (!context.permissions.canManageRoles) {
    throw new Error("You do not have permission to manage this event team.");
  }

  if (normalizedEmail === context.event.owner) {
    throw new Error("The event owner is already assigned to this event.");
  }

  const existingMember = context.members.find(
    (member) => member.email === normalizedEmail,
  );

  if (existingMember) {
    if (existingMember.role === role) {
      return {
        ...context,
        members: sortMembersForDisplay(context.members),
      };
    }

    return updateEventMemberRole(eventId, normalizedEmail, role);
  }

  const nextMembers = [
    ...context.members,
    {
      email: normalizedEmail,
      role,
    },
  ];
  const memberGroups = splitMembersByRole(context.event.owner, nextMembers);
  const userPoolAuth = await getUserPoolAuthOptions();
  const createResult = await client.models.EventMember.create(
    {
      eventId,
      email: normalizedEmail,
      role,
      owner: context.event.owner,
      admins: memberGroups.admins,
      editors: memberGroups.editors,
      viewers: memberGroups.viewers,
    },
    {
      ...userPoolAuth,
    },
  );

  assertMutationSucceeded(createResult, "Failed to assign the user to this event.");

  await syncEventAccessState(eventId, context.event.owner, nextMembers, {
    email: normalizedEmail,
    role,
  });

  return getEventTeamSnapshot(eventId);
};

export const updateEventMemberRole = async (
  eventId: string,
  email: string,
  role: MemberRole,
): Promise<EventTeamSnapshot> => {
  const context = await loadEventTeamContext(eventId);
  const profile = context.currentUser;
  const normalizedEmail = email.toLowerCase();

  if (!profile) {
    throw new Error("You must be signed in to change roles.");
  }

  if (!context.permissions.canManageRoles) {
    throw new Error("You do not have permission to change roles for this event.");
  }

  if (normalizedEmail === profile.email) {
    throw new Error("You cannot change your own role.");
  }

  if (normalizedEmail === context.event.owner) {
    throw new Error("The event owner role cannot be changed.");
  }

  const member = context.members.find((teamMember) => teamMember.email === normalizedEmail);

  if (!member) {
    throw new Error("User not found on this event.");
  }

  if (member.role === role) {
    return {
      ...context,
      members: sortMembersForDisplay(context.members),
    };
  }

  const nextMembers = context.members.map((teamMember) =>
    teamMember.email === normalizedEmail
      ? { ...teamMember, role }
      : teamMember,
  );

  await syncEventAccessState(eventId, context.event.owner, nextMembers, {
    email: normalizedEmail,
    role,
  });

  return getEventTeamSnapshot(eventId);
};

export const updateEventWorkflowStatus = async (
  eventId: string,
  status: Exclude<EventStatus, "ARCHIVED">,
) => {
  const context = await loadEventLifecycleContext(eventId);

  if (context.event.status === status) {
    return context.event;
  }

  const result = await client.models.Event.update(
    {
      id: eventId,
      status,
    },
    {
      ...(await getUserPoolAuthOptions()),
      selectionSet: eventUpdateSelectionSet,
    },
  );

  assertMutationSucceeded(result, "Failed to update the event status.");

  return result.data;
};

export const softDeleteEvent = async (eventId: string) => {
  await loadEventLifecycleContext(eventId);

  const result = await client.models.Event.update(
    {
      id: eventId,
      status: "ARCHIVED",
    },
    {
      ...(await getUserPoolAuthOptions()),
      selectionSet: eventUpdateSelectionSet,
    },
  );

  assertMutationSucceeded(result, "Failed to delete the event.");

  return result.data;
};
