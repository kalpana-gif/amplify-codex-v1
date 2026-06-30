"use client";

import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  GripVertical,
  ListTodo,
  Loader2,
  SquarePen,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getEventTeamSnapshot,
  listUserDirectoryProfiles,
} from "@/lib/graphql/events";
import {
  EVENT_TASKS_IN_PROGRESS_UNAVAILABLE_MESSAGE,
  EVENT_TASKS_UNAVAILABLE_MESSAGE,
  createEventTask,
  deleteEventTask,
  isEventTaskInProgressUnavailableError,
  isEventTasksUnavailableError,
  listEventTasks,
  sortEventTasks,
  updateEventTask,
} from "@/lib/graphql/tasks";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";
import type {
  EventTaskView,
  EventTeamSnapshot,
  TaskStatus,
  UserDirectoryProfile,
} from "@/types";

type TaskModalMode = "create" | "edit";

const taskStatusOptions: TaskStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED"];

const taskStatusMeta: Record<
  TaskStatus,
  {
    label: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    badgeClass: string;
    metricAccentClass: string;
    metricIconClass: string;
    columnClass: string;
    icon: LucideIcon;
  }
> = {
  OPEN: {
    label: "Open",
    description: "Ready to start",
    emptyTitle: "Nothing waiting",
    emptyDescription: "Fresh tasks land here before someone picks them up.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    metricAccentClass: "bg-[rgba(245,158,11,0.08)]",
    metricIconClass: "bg-[rgba(245,158,11,0.14)] text-amber-700",
    columnClass:
      "border-[rgba(245,158,11,0.16)] bg-[linear-gradient(180deg,rgba(255,251,235,0.9),rgba(255,255,255,0.92))]",
    icon: ListTodo,
  },
  IN_PROGRESS: {
    label: "In Progress",
    description: "Actively moving",
    emptyTitle: "No active work",
    emptyDescription: "Drag a task here when someone starts working on it.",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    metricAccentClass: "bg-[rgba(46,117,182,0.08)]",
    metricIconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
    columnClass:
      "border-[rgba(46,117,182,0.16)] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(255,255,255,0.94))]",
    icon: ClipboardList,
  },
  COMPLETED: {
    label: "Done",
    description: "Closed and cleared",
    emptyTitle: "No finished tasks",
    emptyDescription: "Completed work collects here for quick review.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    metricAccentClass: "bg-[rgba(22,163,74,0.08)]",
    metricIconClass: "bg-[rgba(22,163,74,0.14)] text-emerald-700",
    columnClass:
      "border-[rgba(22,163,74,0.16)] bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.94))]",
    icon: CheckCircle2,
  },
};

const truncateText = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;

const formatTaskStatus = (status: TaskStatus) => taskStatusMeta[status].label;

const buildModalState = (
  task?: EventTaskView | null,
): {
  title: string;
  memo: string;
  notes: string;
  assigneeEmail: string;
  status: TaskStatus;
} => ({
  title: task?.title ?? "",
  memo: task?.memo ?? "",
  notes: task?.notes ?? "",
  assigneeEmail: task?.assigneeEmail ?? "",
  status: task?.status ?? "OPEN",
});

export default function EventTasksPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<EventTeamSnapshot | null>(null);
  const [tasks, setTasks] = useState<EventTaskView[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<
    UserDirectoryProfile[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<TaskModalMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState(buildModalState());
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [isInProgressAvailable, setIsInProgressAvailable] = useState(true);
  const [taskPendingDelete, setTaskPendingDelete] = useState<EventTaskView | null>(
    null,
  );
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadPage = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextSnapshot = await getEventTeamSnapshot(params.id);

        const [nextTasks, knownUsers] = await Promise.all([
          listEventTasks(params.id),
          listUserDirectoryProfiles().catch(() => []),
        ]);

        if (!isActive) {
          return;
        }

        setIsInProgressAvailable(true);
        setSnapshot(nextSnapshot);
        setTasks(nextTasks);
        setDirectoryProfiles(knownUsers);
      } catch (error) {
        if (isActive) {
          if (error instanceof Error && error.message === "Event not found.") {
            router.replace("/events");
            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Failed to load the task board.";

          setLoadError(message);

          if (!isEventTasksUnavailableError(error)) {
            toast.error(message);
          }
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      isActive = false;
    };
  }, [params.id, router]);

  useEffect(() => {
    if (!isInProgressAvailable && taskForm.status === "IN_PROGRESS") {
      setTaskForm((current) => ({
        ...current,
        status: "OPEN",
      }));
    }
  }, [isInProgressAvailable, taskForm.status]);

  if (isLoading) {
    return <EventWorkspaceLoader variant="tasks" />;
  }

  if (loadError) {
    return (
      <PageWrapper
        title="Task List"
        description="Create event tasks, keep quick memos and notes in one place, and track what is finished."
      >
        <Card className="p-5 md:p-6">
          <EmptyState
            title={
              loadError === EVENT_TASKS_UNAVAILABLE_MESSAGE
                ? "Task List needs backend deployment"
                : "Task list is unavailable"
            }
            description={
              loadError === EVENT_TASKS_UNAVAILABLE_MESSAGE
                ? "The new task model is not in the current Amplify deployment yet. Deploy the latest backend changes, refresh the app, and this tab will start working."
                : loadError
            }
          />
        </Card>
      </PageWrapper>
    );
  }

  if (!snapshot) {
    return <EventWorkspaceLoader variant="tasks" />;
  }

  const canManageTasks = snapshot.permissions.canEditExpenses;
  const directoryMap = new Map(
    directoryProfiles.map((profile) => [profile.email.toLowerCase(), profile.name]),
  );
  const memberOptions = [
    {
      email: snapshot.event.owner,
      name: directoryMap.get(snapshot.event.owner.toLowerCase()) ?? snapshot.event.owner,
      roleLabel: "Owner",
    },
    ...snapshot.members.map((member) => ({
      email: member.email,
      name: directoryMap.get(member.email.toLowerCase()) ?? member.email,
      roleLabel:
        member.role === "ADMIN"
          ? "Admin"
          : member.role === "EDITOR"
            ? "Editor"
            : "Viewer",
    })),
  ];
  const openTasks = tasks.filter((task) => task.status === "OPEN");
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");
  const assignedTasks = tasks.filter((task) => Boolean(task.assigneeEmail));
  const completionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;
  const metrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accentClass: string;
    iconClass: string;
  }> = [
    {
      label: taskStatusMeta.OPEN.label,
      value: String(openTasks.length),
      icon: taskStatusMeta.OPEN.icon,
      accentClass: taskStatusMeta.OPEN.metricAccentClass,
      iconClass: taskStatusMeta.OPEN.metricIconClass,
    },
    {
      label: taskStatusMeta.IN_PROGRESS.label,
      value: String(inProgressTasks.length),
      icon: taskStatusMeta.IN_PROGRESS.icon,
      accentClass: taskStatusMeta.IN_PROGRESS.metricAccentClass,
      iconClass: taskStatusMeta.IN_PROGRESS.metricIconClass,
    },
    {
      label: taskStatusMeta.COMPLETED.label,
      value: String(completedTasks.length),
      icon: taskStatusMeta.COMPLETED.icon,
      accentClass: taskStatusMeta.COMPLETED.metricAccentClass,
      iconClass: taskStatusMeta.COMPLETED.metricIconClass,
    },
    {
      label: "Done Rate",
      value: `${completionRate}%`,
      icon: CircleUserRound,
      accentClass: "bg-[rgba(15,23,42,0.04)]",
      iconClass: "bg-[rgba(15,23,42,0.08)] text-slate-700",
    },
  ];

  const getDisplayName = (email?: string | null) => {
    if (!email) {
      return "Unassigned";
    }

    return directoryMap.get(email.toLowerCase()) ?? email;
  };

  const upsertTask = (nextTask: EventTaskView) => {
    setTasks((current) => {
      const exists = current.some((task) => task.id === nextTask.id);

      return sortEventTasks(
        exists
          ? current.map((task) => (task.id === nextTask.id ? nextTask : task))
          : [nextTask, ...current],
      );
    });
  };

  const previewMovedTask = (
    task: EventTaskView,
    nextStatus: TaskStatus,
  ): EventTaskView => {
    const now = new Date().toISOString();

    return {
      ...task,
      status: nextStatus,
      completedAt: nextStatus === "COMPLETED" ? task.completedAt ?? now : null,
      completedBy:
        nextStatus === "COMPLETED"
          ? task.completedBy ?? snapshot.currentUser?.email?.toLowerCase() ?? null
          : null,
      updatedAt: now,
    };
  };

  const openCreateModal = () => {
    setTaskModalMode("create");
    setEditingTaskId(null);
    setTaskForm(buildModalState());
    setIsTaskModalOpen(true);
  };

  const openEditModal = (task: EventTaskView) => {
    setTaskModalMode("edit");
    setEditingTaskId(task.id);
    setTaskForm(buildModalState(task));
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    if (isSavingTask) {
      return;
    }

    setIsTaskModalOpen(false);
  };

  const handleTaskSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      toast.error("Enter a task title.");
      return;
    }

    setIsSavingTask(true);

    try {
      if (taskModalMode === "edit" && editingTaskId) {
        const updatedTask = await updateEventTask(editingTaskId, {
          title: taskForm.title,
          memo: taskForm.memo,
          notes: taskForm.notes,
          assigneeEmail: taskForm.assigneeEmail || null,
          status: taskForm.status,
        });

        upsertTask(updatedTask);
        toast.success("Task updated.");
      } else {
        const createdTask = await createEventTask(params.id, {
          title: taskForm.title,
          memo: taskForm.memo,
          notes: taskForm.notes,
          assigneeEmail: taskForm.assigneeEmail || null,
          status: taskForm.status,
        });

        upsertTask(createdTask);
        toast.success("Task created.");
      }

      setIsTaskModalOpen(false);
    } catch (error) {
      if (isEventTaskInProgressUnavailableError(error)) {
        setIsInProgressAvailable(false);
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to save the task.",
      );
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleTaskMove = async (
    task: EventTaskView,
    nextStatus: TaskStatus,
  ) => {
    if (nextStatus === "IN_PROGRESS" && !isInProgressAvailable) {
      toast.error(EVENT_TASKS_IN_PROGRESS_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!canManageTasks || task.status === nextStatus || movingTaskId === task.id) {
      return;
    }

    const previousTask = task;
    const optimisticTask = previewMovedTask(task, nextStatus);

    setMovingTaskId(task.id);
    upsertTask(optimisticTask);

    try {
      const updatedTask = await updateEventTask(task.id, { status: nextStatus });

      upsertTask(updatedTask);
      toast.success(`Task moved to ${formatTaskStatus(nextStatus).toLowerCase()}.`);
    } catch (error) {
      if (isEventTaskInProgressUnavailableError(error)) {
        setIsInProgressAvailable(false);
      }

      upsertTask(previousTask);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update the task status.",
      );
    } finally {
      setMovingTaskId(null);
      setDraggingTaskId(null);
      setDragOverStatus(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskPendingDelete) {
      return;
    }

    setIsDeletingTask(true);

    try {
      await deleteEventTask(taskPendingDelete.id);
      setTasks((current) =>
        current.filter((task) => task.id !== taskPendingDelete.id),
      );
      setTaskPendingDelete(null);
      toast.success("Task removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete the task.",
      );
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleTaskDragStart = (
    event: DragEvent<HTMLDivElement>,
    task: EventTaskView,
  ) => {
    if (!canManageTasks || movingTaskId === task.id) {
      event.preventDefault();
      return;
    }

    setDraggingTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  };

  const handleColumnDragOver = (
    event: DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    if (!canManageTasks || !draggingTaskId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleColumnDrop = (
    event: DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    if (!canManageTasks) {
      return;
    }

    event.preventDefault();

    const droppedTaskId =
      event.dataTransfer.getData("text/plain") || draggingTaskId;

    setDragOverStatus(null);
    setDraggingTaskId(null);

    if (!droppedTaskId) {
      return;
    }

    const task = tasks.find((item) => item.id === droppedTaskId);

    if (!task || task.status === status) {
      return;
    }

    void handleTaskMove(task, status);
  };

  return (
    <PageWrapper
      title="Task List"
      description="Track work across open, in-progress, and done stages in one shared task list."
      actions={
        canManageTasks ? (
          <Button className="gap-2" onClick={openCreateModal}>
            <ListTodo className="h-4 w-4" />
            Add task
          </Button>
        ) : null
      }
    >
      <ErrorBoundary title="Task list unavailable">
        <Card className="overflow-hidden p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Team Task List
                </p>
                <h2 className="mt-2 max-w-3xl text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
                  A clearer path from pending work to done
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  Keep the whole event team aligned with one drag-and-drop task
                  list for new requests, active work, and completed follow-ups.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <GripVertical className="h-4 w-4" />
                {canManageTasks ? "Drag cards to move" : "View live task flow"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, icon: Icon, accentClass, iconClass }) => (
                <div
                  key={label}
                  className={cn(
                    "flex min-h-[82px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3",
                    accentClass,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[12ch] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </p>
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        iconClass,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-1.5 min-w-0 text-[clamp(1rem,1vw,1.28rem)] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Task List
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {canManageTasks
                    ? "Drag tasks between columns to update status."
                    : "Review the team&apos;s current open, active, and completed tasks."}
                </p>
              </div>

              <div className="text-sm text-slate-500">
                {assignedTasks.length} of {tasks.length} tasks have an owner.
              </div>
            </div>

            {!isInProgressAvailable ? (
              <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {EVENT_TASKS_IN_PROGRESS_UNAVAILABLE_MESSAGE}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              {taskStatusOptions.map((status) => {
                const meta = taskStatusMeta[status];
                const ColumnIcon = meta.icon;
                const columnTasks = tasks.filter((task) => task.status === status);
                const isStatusInteractive =
                  status !== "IN_PROGRESS" || isInProgressAvailable;
                const isDropTarget =
                  canManageTasks &&
                  isStatusInteractive &&
                  dragOverStatus === status;

                return (
                  <div
                    key={status}
                    className={cn(
                      "flex min-h-[22rem] flex-col rounded-[1.5rem] border transition",
                      meta.columnClass,
                      isDropTarget &&
                        "border-[rgba(30,58,95,0.28)] shadow-[0_20px_40px_rgba(30,58,95,0.12)]",
                      !isStatusInteractive && "opacity-70",
                    )}
                    onDragOver={
                      isStatusInteractive
                        ? (event) => handleColumnDragOver(event, status)
                        : undefined
                    }
                    onDrop={
                      isStatusInteractive
                        ? (event) => handleColumnDrop(event, status)
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                            meta.badgeClass,
                          )}
                        >
                          <ColumnIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold tracking-tight text-slate-950">
                            {meta.label}
                          </h3>
                          <p className="text-[13px] text-slate-600">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[13px] font-semibold text-slate-700 tabular-nums">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                      {isDropTarget ? (
                        <div className="rounded-[1.2rem] border border-dashed border-[rgba(30,58,95,0.28)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--color-primary)]">
                          Drop here to move this task to {meta.label.toLowerCase()}.
                        </div>
                      ) : null}

                      {!isStatusInteractive ? (
                        <div className="rounded-[1.2rem] border border-dashed border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-800">
                          Deploy the latest backend changes to enable this column.
                        </div>
                      ) : null}

                      {columnTasks.length ? (
                        columnTasks.map((task) => {
                          const timestamp = task.completedAt ?? task.updatedAt ?? task.createdAt;
                          const isMovingTask = movingTaskId === task.id;
                          const timestampLabel = timestamp
                            ? task.status === "COMPLETED"
                              ? `Done ${formatDate(timestamp)}`
                              : `Updated ${formatRelativeDate(timestamp)}`
                            : null;

                          return (
                            <div
                              key={task.id}
                              aria-busy={isMovingTask}
                              aria-grabbed={draggingTaskId === task.id}
                              className={cn(
                                "rounded-[1.25rem] border border-slate-200/80 bg-white/92 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition",
                                canManageTasks &&
                                  !isMovingTask &&
                                  "cursor-grab active:cursor-grabbing",
                                draggingTaskId === task.id && "scale-[0.98] opacity-60",
                                isMovingTask && "ring-2 ring-[rgba(30,58,95,0.18)]",
                              )}
                              draggable={canManageTasks && !isMovingTask}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDragOverStatus(null);
                              }}
                              onDragStart={(event) => handleTaskDragStart(event, task)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {canManageTasks ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        <GripVertical className="h-3 w-3" />
                                        Drag
                                      </span>
                                    ) : null}
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                        meta.badgeClass,
                                      )}
                                    >
                                      {formatTaskStatus(task.status)}
                                    </span>
                                  </div>

                                  <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-slate-950">
                                    {task.title}
                                  </h3>

                                  {task.memo ? (
                                    <p className="mt-1 text-[13px] font-medium text-slate-700">
                                      {task.memo}
                                    </p>
                                  ) : null}
                                </div>

                                {timestampLabel || isMovingTask ? (
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    {timestampLabel ? (
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                                        {timestampLabel}
                                      </span>
                                    ) : null}
                                    {isMovingTask ? (
                                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>

                              {task.notes ? (
                                <p className="mt-2 text-[13px] leading-5 text-slate-600">
                                  {truncateText(task.notes, 110)}
                                </p>
                              ) : null}

                              {canManageTasks ? (
                                <div className="mt-3 border-t border-slate-200/70 pt-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[11px] text-slate-500 [scrollbar-width:none]">
                                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                        <CircleUserRound className="h-3 w-3" />
                                        <span className="max-w-[8.5rem] truncate">
                                          {getDisplayName(task.assigneeEmail)}
                                        </span>
                                      </span>
                                      <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                        <span className="max-w-[12rem] truncate">
                                          Created by {getDisplayName(task.createdBy)}
                                        </span>
                                      </span>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                      <Button
                                        aria-label="Edit task"
                                        className="w-9 px-0"
                                        disabled={isMovingTask}
                                        size="sm"
                                        title="Edit task"
                                        variant="secondary"
                                        onClick={() => openEditModal(task)}
                                      >
                                        <SquarePen className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        aria-label="Delete task"
                                        className="w-9 px-0 text-red-600 hover:text-red-700"
                                        disabled={isMovingTask}
                                        size="sm"
                                        title="Delete task"
                                        variant="ghost"
                                        onClick={() => setTaskPendingDelete(task)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 border-t border-slate-200/70 pt-3">
                                  <div className="min-w-0 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[11px] text-slate-500 [scrollbar-width:none]">
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                      <CircleUserRound className="h-3 w-3" />
                                      <span className="max-w-[8.5rem] truncate">
                                        {getDisplayName(task.assigneeEmail)}
                                      </span>
                                    </span>
                                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                      <span className="max-w-[12rem] truncate">
                                        Created by {getDisplayName(task.createdBy)}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-white/55 px-5 py-8 text-center">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {meta.emptyTitle}
                          </h4>
                          <p className="mt-1.5 max-w-[22ch] text-sm leading-6 text-slate-600">
                            {meta.emptyDescription}
                          </p>
                          {status === "OPEN" && canManageTasks && !tasks.length ? (
                            <Button className="mt-4 gap-2" size="sm" onClick={openCreateModal}>
                              <ListTodo className="h-4 w-4" />
                              Add first task
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Modal
          className="max-w-2xl"
          description={
            taskModalMode === "edit"
              ? "Update the task details, notes, assignee, and board status from one place."
              : "Create a new task and place it directly into the right board column."
          }
          open={isTaskModalOpen}
          title={taskModalMode === "edit" ? "Edit task" : "Add task"}
          onClose={closeTaskModal}
        >
          <form className="space-y-4" onSubmit={handleTaskSave}>
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Task title</span>
                <Input
                  placeholder="Confirm venue supplier"
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Assignee</span>
                <Select
                  value={taskForm.assigneeEmail}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      assigneeEmail: event.target.value,
                    }))
                  }
                >
                  <option value="">Unassigned</option>
                  {memberOptions.map((member) => (
                    <option key={member.email} value={member.email}>
                      {member.name} ({member.roleLabel})
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Memo</span>
              <Input
                placeholder="Short context for the team"
                value={taskForm.memo}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    memo: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Notes</span>
              <Textarea
                placeholder="Add details, handoff notes, or reminders."
                value={taskForm.notes}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Status</span>
              <Select
                value={taskForm.status}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    status: event.target.value as TaskStatus,
                  }))
                }
              >
                {taskStatusOptions.map((status) => (
                  <option
                    key={status}
                    disabled={
                      status === "IN_PROGRESS" && !isInProgressAvailable
                    }
                    value={status}
                  >
                    {formatTaskStatus(status)}
                  </option>
                ))}
              </Select>
            </label>

            <div className="flex justify-end">
              <Button disabled={isSavingTask} type="submit">
                {isSavingTask
                  ? taskModalMode === "edit"
                    ? "Saving..."
                    : "Creating..."
                  : taskModalMode === "edit"
                    ? "Save changes"
                    : "Create task"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          description="This removes the task and its notes from the current event."
          open={Boolean(taskPendingDelete)}
          title="Delete task"
          onClose={() => {
            if (!isDeletingTask) {
              setTaskPendingDelete(null);
            }
          }}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {taskPendingDelete
                ? `Delete "${taskPendingDelete.title}" from this event task list?`
                : ""}
            </p>
            <div className="flex justify-end">
              <Button
                disabled={isDeletingTask}
                variant="danger"
                onClick={() => void handleDeleteTask()}
              >
                {isDeletingTask ? "Deleting..." : "Delete task"}
              </Button>
            </div>
          </div>
        </Modal>
      </ErrorBoundary>
    </PageWrapper>
  );
}
