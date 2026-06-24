import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { client } from "@/lib/amplify-client";
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

const eventCreateSelectionSet = ["id"] as const;
const eventUpdateSelectionSet = ["id", "status"] as const;

const getResultErrorMessage = (
  errors: readonly { message?: string | null }[] | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

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

export const listEventsForCurrentUser = async (): Promise<EventSummary[]> => {
  try {
    const { data } = await client.models.Event.list({
      authMode: "userPool",
      selectionSet: [
        "id",
        "name",
        "description",
        "date",
        "createdAt",
        "venue",
        "eventType",
        "status",
      ],
    });

    const summaries = await Promise.all(
      data
        .filter((event) => !isEventSoftDeleted(event))
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
      { authMode: "userPool" },
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
          { authMode: "userPool" },
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
      authMode: "userPool",
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
    { authMode: "userPool" },
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
        { authMode: "userPool" },
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

const sortMembersForDisplay = (members: TeamMemberInput[]) =>
  [...members].sort((first, second) => {
    if (first.role !== second.role) {
      return roleSortOrder[first.role] - roleSortOrder[second.role];
    }

    return first.email.localeCompare(second.email);
  });

const loadEventTeamContext = async (eventId: string) => {
  const [eventResult, membersResult, profile] = await Promise.all([
    client.models.Event.get(
      { id: eventId },
      {
        authMode: "userPool",
        selectionSet: [
          "id",
          "name",
          "owner",
          "admins",
          "editors",
          "viewers",
          "status",
        ],
      },
    ),
    client.models.EventMember.list({
      authMode: "userPool",
      filter: {
        eventId: { eq: eventId },
      },
      selectionSet: ["eventId", "email", "role"],
    }),
    getCurrentUserProfile(),
  ]);

  const event = eventResult.data;

  if (!event) {
    throw new Error("Event not found.");
  }

  if (isEventSoftDeleted(event)) {
    throw new Error("Event not found.");
  }

  const members = normalizeMembers(
    event.owner.toLowerCase(),
    membersResult.data.map((member) => ({
      email: member.email.toLowerCase(),
      role: member.role as MemberRole,
    })),
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      owner: event.owner.toLowerCase(),
      admins: normalizeEmailList(event.admins),
      editors: normalizeEmailList(event.editors),
      viewers: normalizeEmailList(event.viewers),
    },
    members,
    currentUser: profile,
    permissions: profile
      ? getEventPermissions(profile.email, event)
      : defaultPermissions,
  };
};

const loadEventLifecycleContext = async (eventId: string) => {
  const [eventResult, profile] = await Promise.all([
    client.models.Event.get(
      { id: eventId },
      {
        authMode: "userPool",
        selectionSet: [
          "id",
          "name",
          "owner",
          "admins",
          "editors",
          "viewers",
          "status",
        ],
      },
    ),
    getCurrentUserProfile(),
  ]);

  const event = eventResult.data;

  if (!profile) {
    throw new Error("You must be signed in to manage this event.");
  }

  if (!event || isEventSoftDeleted(event)) {
    throw new Error("Event not found.");
  }

  const permissions = getEventPermissions(profile.email, event);

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
  const [budgetResult, expenseResult, memberResult, notificationResult] =
    await Promise.all([
      client.models.Budget.list({
        authMode: "userPool",
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id", "categories.id", "categories.lineItems.id"],
      }),
      client.models.Expense.list({
        authMode: "userPool",
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id"],
      }),
      client.models.EventMember.list({
        authMode: "userPool",
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["eventId", "email", "role"],
      }),
      client.models.Notification.list({
        authMode: "userPool",
        filter: {
          eventId: { eq: eventId },
        },
        selectionSet: ["id"],
      }),
    ]);

  const budgetUpdates = budgetResult.data.map((budget) =>
    client.models.Budget.update(
      {
        id: budget.id,
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      { authMode: "userPool" },
    ),
  );

  const categoryUpdates = budgetResult.data.flatMap((budget) =>
    (budget.categories ?? []).map((category) =>
      client.models.BudgetCategory.update(
        {
          id: category.id,
          admins: memberGroups.admins,
          editors: memberGroups.editors,
          viewers: memberGroups.viewers,
        },
        { authMode: "userPool" },
      ),
    ),
  );

  const lineItemUpdates = budgetResult.data.flatMap((budget) =>
    (budget.categories ?? []).flatMap((category) =>
      (category.lineItems ?? []).map((lineItem) =>
        client.models.LineItem.update(
          {
            id: lineItem.id,
            admins: memberGroups.admins,
            editors: memberGroups.editors,
            viewers: memberGroups.viewers,
          },
          { authMode: "userPool" },
        ),
      ),
    ),
  );

  const expenseUpdates = expenseResult.data.map((expense) =>
    client.models.Expense.update(
      {
        id: expense.id,
        admins: memberGroups.admins,
        editors: memberGroups.editors,
        viewers: memberGroups.viewers,
      },
      { authMode: "userPool" },
    ),
  );

  const memberUpdates = memberResult.data.map((member) =>
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
      { authMode: "userPool" },
    ),
  );

  const notificationUpdates = notificationResult.data.map((notification) =>
    client.models.Notification.update(
      {
        id: notification.id,
        admins: memberGroups.admins,
      },
      { authMode: "userPool" },
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
      authMode: "userPool",
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
      authMode: "userPool",
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
      authMode: "userPool",
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
      authMode: "userPool",
      selectionSet: eventUpdateSelectionSet,
    },
  );

  assertMutationSucceeded(result, "Failed to delete the event.");

  return result.data;
};
