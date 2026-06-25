"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleUserRound,
  ClipboardList,
  ListTodo,
  SquarePen,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listUserDirectoryProfiles, getEventTeamSnapshot } from "@/lib/graphql/events";
import {
  EVENT_TASKS_UNAVAILABLE_MESSAGE,
  createEventTask,
  deleteEventTask,
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

type TaskFilter = "all" | "open" | "completed";
type TaskModalMode = "create" | "edit";

const taskFilters: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "All tasks" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

const taskStatusOptions: TaskStatus[] = ["OPEN", "COMPLETED"];

const truncateText = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;

const formatTaskStatus = (status: TaskStatus) =>
  status === "COMPLETED" ? "Completed" : "Open";

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
  const [directoryProfiles, setDirectoryProfiles] = useState<UserDirectoryProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<TaskModalMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState(buildModalState());
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState<string | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<EventTaskView | null>(null);
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
    if (!selectedTaskId) {
      return;
    }

    const taskStillVisible = tasks.some((task) => task.id === selectedTaskId);

    if (!taskStillVisible) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, tasks]);

  if (isLoading) {
    return <EventWorkspaceLoader variant="tasks" />;
  }

  if (loadError) {
    return (
      <PageWrapper
        title="To-do List"
        description="Create event tasks, keep quick memos and notes in one place, and track what is finished."
      >
        <Card className="p-5 md:p-6">
          <EmptyState
            title={
              loadError === EVENT_TASKS_UNAVAILABLE_MESSAGE
                ? "To-do List needs backend deployment"
                : "Task board is unavailable"
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
      name: directoryMap.get(snapshot.event.owner) ?? snapshot.event.owner,
      roleLabel: "Owner",
    },
    ...snapshot.members.map((member) => ({
      email: member.email,
      name: directoryMap.get(member.email) ?? member.email,
      roleLabel:
        member.role === "ADMIN"
          ? "Admin"
          : member.role === "EDITOR"
            ? "Editor"
            : "Viewer",
    })),
  ];
  const openTasks = tasks.filter((task) => task.status === "OPEN");
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");
  const assignedTasks = tasks.filter((task) => Boolean(task.assigneeEmail));
  const completionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "open") {
      return task.status === "OPEN";
    }

    if (activeFilter === "completed") {
      return task.status === "COMPLETED";
    }

    return true;
  });
  const metrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accentClass: string;
    iconClass: string;
  }> = [
    {
      label: "Open",
      value: String(openTasks.length),
      icon: ListTodo,
      accentClass: "bg-[rgba(30,58,95,0.06)]",
      iconClass: "bg-[rgba(30,58,95,0.12)] text-[var(--color-primary)]",
    },
    {
      label: "Completed",
      value: String(completedTasks.length),
      icon: CheckCircle2,
      accentClass: "bg-[rgba(22,163,74,0.08)]",
      iconClass: "bg-[rgba(22,163,74,0.14)] text-emerald-700",
    },
    {
      label: "Assigned",
      value: String(assignedTasks.length),
      icon: CircleUserRound,
      accentClass: "bg-[rgba(46,117,182,0.08)]",
      iconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: ClipboardList,
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

        setTasks((current) =>
          sortEventTasks(
            current.map((task) =>
              task.id === updatedTask.id ? updatedTask : task,
            ),
          ),
        );
        setSelectedTaskId(updatedTask.id);
        toast.success("Task updated.");
      } else {
        const createdTask = await createEventTask(params.id, {
          title: taskForm.title,
          memo: taskForm.memo,
          notes: taskForm.notes,
          assigneeEmail: taskForm.assigneeEmail || null,
          status: taskForm.status,
        });

        setTasks((current) => sortEventTasks([createdTask, ...current]));
        setSelectedTaskId(createdTask.id);
        toast.success("Task created.");
      }

      setIsTaskModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save the task.",
      );
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleTaskStatusToggle = async (task: EventTaskView) => {
    setStatusUpdatingTaskId(task.id);

    try {
      const updatedTask = await updateEventTask(task.id, {
        status: task.status === "COMPLETED" ? "OPEN" : "COMPLETED",
      });

      setTasks((current) =>
        sortEventTasks(
          current.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
        ),
      );
      setSelectedTaskId(updatedTask.id);
      toast.success(
        updatedTask.status === "COMPLETED"
          ? "Task marked as completed."
          : "Task moved back to open.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update the task status.",
      );
    } finally {
      setStatusUpdatingTaskId(null);
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

  return (
    <PageWrapper
      title="To-do List"
      description="Create event tasks, keep quick memos and notes in one place, and track what is finished."
      actions={
        canManageTasks ? (
          <Button className="gap-2" onClick={openCreateModal}>
            <ListTodo className="h-4 w-4" />
            Add task
          </Button>
        ) : null
      }
    >
      <ErrorBoundary title="Task board unavailable">
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Team Task Board
              </p>
              <h2 className="mt-2 max-w-3xl text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
                Clear follow-ups for the whole event
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                Keep action items, handoff notes, and responsibility in one compact list.
              </p>
            </div>

            <div className="mt-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, icon: Icon, accentClass, iconClass }) => (
                <div
                  key={label}
                  className={cn(
                    "flex min-h-[78px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3",
                    accentClass,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[11ch] text-[10px] uppercase tracking-[0.2em] text-slate-500">
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Active task list
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {canManageTasks
                    ? "Select a row to edit details, reassign work, or clear completed items."
                    : "You can review progress here. Admins and editors manage changes."}
                </p>
              </div>

              <div className="inline-flex w-full items-center gap-1 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-1 lg:w-auto">
                {taskFilters.map((filter) => {
                  const active = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      className={cn(
                        "flex-1 rounded-[0.9rem] px-3 py-2 text-sm font-semibold transition lg:flex-none",
                        active
                          ? "bg-[#1e3a5f] text-white shadow-[0_12px_24px_rgba(30,58,95,0.18)]"
                          : "text-slate-600 hover:bg-white hover:text-[var(--color-primary)]",
                      )}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleTasks.length ? (
              <div className="space-y-3">
                {visibleTasks.map((task) => {
                  const isSelected = task.id === selectedTaskId;
                  const isCompleted = task.status === "COMPLETED";
                  const timestamp = task.completedAt ?? task.updatedAt ?? task.createdAt;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-[1.5rem] border px-4 py-4 transition",
                        isSelected
                          ? "border-[rgba(46,117,182,0.3)] bg-[rgba(46,117,182,0.05)] shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                          : "border-slate-200/80 bg-white/90 hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          aria-label={
                            isCompleted ? "Mark task as open" : "Mark task as completed"
                          }
                          className={cn(
                            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
                            canManageTasks
                              ? "border-slate-200 bg-white hover:border-[rgba(46,117,182,0.35)] hover:text-[var(--color-primary)]"
                              : "cursor-default border-slate-200 bg-slate-50 text-slate-400",
                          )}
                          disabled={!canManageTasks || statusUpdatingTaskId === task.id}
                          type="button"
                          onClick={() => void handleTaskStatusToggle(task)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-500" />
                          )}
                        </button>

                        <button
                          className="min-w-0 flex-1 text-left"
                          type="button"
                          onClick={() =>
                            setSelectedTaskId((current) =>
                              current === task.id ? null : task.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={cn(
                                "text-base font-semibold tracking-tight text-slate-950",
                                isCompleted && "text-slate-500 line-through",
                              )}
                            >
                              {task.title}
                            </h3>
                            <Badge variant={isCompleted ? "success" : "warning"}>
                              {formatTaskStatus(task.status)}
                            </Badge>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              <CircleUserRound className="h-3.5 w-3.5" />
                              {getDisplayName(task.assigneeEmail)}
                            </span>
                          </div>

                          {task.memo ? (
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {task.memo}
                            </p>
                          ) : null}

                          {task.notes ? (
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {isSelected ? task.notes : truncateText(task.notes, 140)}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              Created by {getDisplayName(task.createdBy)}
                            </span>
                            {timestamp ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                {isCompleted
                                  ? `Completed ${formatDate(timestamp)}`
                                  : `Updated ${formatRelativeDate(timestamp)}`}
                              </span>
                            ) : null}
                          </div>
                        </button>

                        <button
                          aria-label={isSelected ? "Collapse task details" : "Expand task details"}
                          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-[var(--color-primary)]"
                          type="button"
                          onClick={() =>
                            setSelectedTaskId((current) =>
                              current === task.id ? null : task.id,
                            )
                          }
                        >
                          {isSelected ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {isSelected ? (
                        <div className="mt-4 border-t border-slate-200/80 pt-4">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              Assignee role:{" "}
                              {memberOptions.find(
                                (option) => option.email === task.assigneeEmail,
                              )?.roleLabel ?? "Unassigned"}
                            </span>
                            {task.completedBy ? (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                                Closed by {getDisplayName(task.completedBy)}
                              </span>
                            ) : null}
                          </div>

                          {canManageTasks ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                className="gap-2"
                                size="sm"
                                variant="secondary"
                                onClick={() => openEditModal(task)}
                              >
                                <SquarePen className="h-4 w-4" />
                                Edit task
                              </Button>
                              <Button
                                className="gap-2"
                                size="sm"
                                variant={isCompleted ? "secondary" : "primary"}
                                onClick={() => void handleTaskStatusToggle(task)}
                              >
                                {isCompleted ? (
                                  <>
                                    <Circle className="h-4 w-4" />
                                    Reopen
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Mark complete
                                  </>
                                )}
                              </Button>
                              <Button
                                className="gap-2 text-red-600 hover:text-red-700"
                                size="sm"
                                variant="ghost"
                                onClick={() => setTaskPendingDelete(task)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={
                  activeFilter === "completed"
                    ? "No completed tasks yet"
                    : activeFilter === "open"
                      ? "No open tasks right now"
                      : "No tasks added yet"
                }
                description={
                  activeFilter === "completed"
                    ? "Completed work will collect here so the team can review what is already done."
                    : activeFilter === "open"
                      ? "Everything on the list is closed. Add a new task if another follow-up is needed."
                      : "Start a shared task list for this event with notes, owners, and completion tracking."
                }
                action={
                  canManageTasks ? (
                    <Button className="gap-2" onClick={openCreateModal}>
                      <ListTodo className="h-4 w-4" />
                      Add first task
                    </Button>
                  ) : null
                }
              />
            )}
          </div>
        </Card>

        <Modal
          className="max-w-2xl"
          description={
            taskModalMode === "edit"
              ? "Update the task details, notes, assignee, and completion state from one place."
              : "Create a new event task with quick memo text, detailed notes, and an owner."
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
                  <option key={status} value={status}>
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
