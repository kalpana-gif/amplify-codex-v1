import { client, getUserPoolAuthOptions } from "@/lib/amplify-client";
import { getEventTeamSnapshot } from "@/lib/graphql/events";
import type { EventTaskView, TaskStatus } from "@/types";

export const EVENT_TASKS_UNAVAILABLE_MESSAGE =
  "To-do List is not available yet. Deploy the latest backend changes to add task support.";

const taskSelectionSet = [
  "id",
  "eventId",
  "title",
  "memo",
  "notes",
  "assigneeEmail",
  "status",
  "completedAt",
  "createdBy",
  "completedBy",
  "createdAt",
  "updatedAt",
] as const;

const asArray = <T>(data?: readonly T[] | T[] | null) =>
  Array.isArray(data) ? [...data] : [];

const getEventTaskModel = () => {
  const eventTaskModel = client.models.EventTask;

  if (!eventTaskModel) {
    throw new Error(EVENT_TASKS_UNAVAILABLE_MESSAGE);
  }

  return eventTaskModel;
};

export const isEventTasksUnavailableError = (error: unknown) =>
  error instanceof Error && error.message === EVENT_TASKS_UNAVAILABLE_MESSAGE;

const getResultErrorMessage = (
  errors: readonly { message?: string | null }[] | undefined,
  fallback: string,
) => {
  const firstMessage = errors?.find((error) => Boolean(error.message))?.message;
  return firstMessage ?? fallback;
};

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeEmail = (value?: string | null) => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
};

const normalizeRequiredTitle = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Task title is required.");
  }

  return trimmed;
};

const mapTaskRecord = (task: {
  id: string;
  eventId: string;
  title: string;
  memo?: string | null;
  notes?: string | null;
  assigneeEmail?: string | null;
  status: TaskStatus;
  completedAt?: string | null;
  createdBy: string;
  completedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}) =>
  ({
    id: task.id,
    eventId: task.eventId,
    title: task.title,
    memo: task.memo ?? null,
    notes: task.notes ?? null,
    assigneeEmail: task.assigneeEmail?.toLowerCase() ?? null,
    status: task.status,
    completedAt: task.completedAt ?? null,
    createdBy: task.createdBy.toLowerCase(),
    completedBy: task.completedBy?.toLowerCase() ?? null,
    createdAt: task.createdAt ?? null,
    updatedAt: task.updatedAt ?? null,
  }) satisfies EventTaskView;

export const sortEventTasks = (tasks: EventTaskView[]) =>
  [...tasks].sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "OPEN" ? -1 : 1;
    }

    const firstTimestamp = first.updatedAt ?? first.createdAt ?? "";
    const secondTimestamp = second.updatedAt ?? second.createdAt ?? "";

    return secondTimestamp.localeCompare(firstTimestamp);
  });

const buildAssignableEmails = (snapshot: Awaited<ReturnType<typeof getEventTeamSnapshot>>) =>
  new Set([
    snapshot.event.owner.toLowerCase(),
    ...snapshot.members.map((member) => member.email.toLowerCase()),
  ]);

const assertCanManageTasks = (
  canManageTasks: boolean,
  fallback: string,
) => {
  if (!canManageTasks) {
    throw new Error(fallback);
  }
};

const assertValidAssignee = (email: string | null, validEmails: Set<string>) => {
  if (email && !validEmails.has(email)) {
    throw new Error("Select an assignee from this event team.");
  }
};

const loadTask = async (taskId: string) => {
  const eventTaskModel = getEventTaskModel();
  const result = await eventTaskModel.get(
    { id: taskId },
    {
      ...(await getUserPoolAuthOptions()),
      selectionSet: taskSelectionSet,
    },
  );

  if (!result.data) {
    throw new Error("Task not found.");
  }

  return result.data;
};

export const listEventTasks = async (
  eventId: string,
): Promise<EventTaskView[]> => {
  const eventTaskModel = getEventTaskModel();
  const result = await eventTaskModel.list({
    ...(await getUserPoolAuthOptions()),
    filter: {
      eventId: { eq: eventId },
    },
    selectionSet: taskSelectionSet,
  });

  return sortEventTasks(
    asArray(result.data).map((task) => mapTaskRecord(task)),
  );
};

export const createEventTask = async (
  eventId: string,
  input: {
    title: string;
    memo?: string;
    notes?: string;
    assigneeEmail?: string | null;
    status?: TaskStatus;
  },
): Promise<EventTaskView> => {
  const eventTaskModel = getEventTaskModel();
  const snapshot = await getEventTeamSnapshot(eventId);
  const currentUser = snapshot.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to create tasks.");
  }

  assertCanManageTasks(
    snapshot.permissions.canEditExpenses,
    "You do not have permission to manage tasks for this event.",
  );

  const assigneeEmail = normalizeEmail(input.assigneeEmail);
  assertValidAssignee(assigneeEmail, buildAssignableEmails(snapshot));

  const nextStatus = input.status ?? "OPEN";
  const completedAt =
    nextStatus === "COMPLETED" ? new Date().toISOString() : null;

  const result = await eventTaskModel.create(
    {
      eventId,
      title: normalizeRequiredTitle(input.title),
      memo: normalizeOptionalText(input.memo),
      notes: normalizeOptionalText(input.notes),
      assigneeEmail,
      status: nextStatus,
      completedAt,
      createdBy: currentUser.email,
      completedBy:
        nextStatus === "COMPLETED" ? currentUser.email : null,
      owner: snapshot.event.owner,
      admins: snapshot.event.admins,
      editors: snapshot.event.editors,
      viewers: snapshot.event.viewers,
    },
    {
      ...(await getUserPoolAuthOptions()),
      selectionSet: taskSelectionSet,
    },
  );

  if (!result.data) {
    throw new Error(
      getResultErrorMessage(result.errors, "Failed to create the task."),
    );
  }

  return mapTaskRecord(result.data);
};

export const updateEventTask = async (
  taskId: string,
  input: Partial<{
    title: string;
    memo: string;
    notes: string;
    assigneeEmail: string | null;
    status: TaskStatus;
  }>,
): Promise<EventTaskView> => {
  const eventTaskModel = getEventTaskModel();
  const existingTask = await loadTask(taskId);
  const snapshot = await getEventTeamSnapshot(existingTask.eventId);
  const currentUser = snapshot.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to update tasks.");
  }

  assertCanManageTasks(
    snapshot.permissions.canEditExpenses,
    "You do not have permission to manage tasks for this event.",
  );

  const nextAssignee =
    input.assigneeEmail === undefined
      ? existingTask.assigneeEmail ?? null
      : normalizeEmail(input.assigneeEmail);

  assertValidAssignee(nextAssignee, buildAssignableEmails(snapshot));

  const nextStatus = input.status ?? existingTask.status;
  const nextCompletedAt =
    nextStatus === "COMPLETED"
      ? existingTask.completedAt ?? new Date().toISOString()
      : null;
  const nextCompletedBy =
    nextStatus === "COMPLETED"
      ? existingTask.completedBy ?? currentUser.email
      : null;

  const payload: {
    id: string;
    title?: string;
    memo?: string | null;
    notes?: string | null;
    assigneeEmail?: string | null;
    status?: TaskStatus;
    completedAt?: string | null;
    completedBy?: string | null;
  } = {
    id: taskId,
    assigneeEmail: nextAssignee,
    status: nextStatus,
    completedAt: nextCompletedAt,
    completedBy: nextCompletedBy,
  };

  if (input.title !== undefined) {
    payload.title = normalizeRequiredTitle(input.title);
  }

  if (input.memo !== undefined) {
    payload.memo = normalizeOptionalText(input.memo);
  }

  if (input.notes !== undefined) {
    payload.notes = normalizeOptionalText(input.notes);
  }

  const result = await eventTaskModel.update(
    payload,
    {
      ...(await getUserPoolAuthOptions()),
      selectionSet: taskSelectionSet,
    },
  );

  if (!result.data) {
    throw new Error(
      getResultErrorMessage(result.errors, "Failed to update the task."),
    );
  }

  return mapTaskRecord(result.data);
};

export const deleteEventTask = async (taskId: string) => {
  const eventTaskModel = getEventTaskModel();
  const existingTask = await loadTask(taskId);
  const snapshot = await getEventTeamSnapshot(existingTask.eventId);

  assertCanManageTasks(
    snapshot.permissions.canEditExpenses,
    "You do not have permission to remove tasks from this event.",
  );

  const result = await eventTaskModel.delete(
    { id: taskId },
    await getUserPoolAuthOptions(),
  );

  if (!result.data) {
    throw new Error(
      getResultErrorMessage(result.errors, "Failed to delete the task."),
    );
  }
};
