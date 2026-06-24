"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw, Search, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addEventMember,
  getEventTeamSnapshot,
  listUserPoolUsers,
  updateEventMemberRole,
} from "@/lib/graphql/events";
import type { EventTeamSnapshot, MemberRole, UserPoolUser } from "@/types";

const roleOptions: MemberRole[] = ["ADMIN", "EDITOR", "VIEWER"];

const roleCopy: Record<MemberRole, string> = {
  ADMIN: "Full event management, budget control, and team access.",
  EDITOR: "Can work with expenses, but not manage budgets or access.",
  VIEWER: "Read-only access across the event.",
};

const roleVariant: Record<MemberRole, "active" | "warning" | "default"> = {
  ADMIN: "active",
  EDITOR: "warning",
  VIEWER: "default",
};

const buildLoadDescription = (snapshot: EventTeamSnapshot | null) => {
  if (!snapshot) {
    return "Review everyone on this event and control who can manage budgets, expenses, and access.";
  }

  return snapshot.permissions.canManageRoles
    ? "Review everyone on this event and change roles where access needs to be tightened or expanded."
    : "Review everyone on this event. Only event admins can change roles.";
};

const getEmailMonogram = (email: string) =>
  email
    .split("@")[0]
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "TM";

export default function EventUsersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<EventTeamSnapshot | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<UserPoolUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directorySearch, setDirectorySearch] = useState("");
  const [pendingRoles, setPendingRoles] = useState<
    Partial<Record<string, MemberRole>>
  >({});
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);
  const [assigningEmail, setAssigningEmail] = useState<string | null>(null);
  const deferredDirectorySearch = useDeferredValue(directorySearch);

  useEffect(() => {
    let isActive = true;

    const loadTeam = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextSnapshot = await getEventTeamSnapshot(params.id);

        if (isActive) {
          setSnapshot(nextSnapshot);
        }
      } catch (error) {
        if (isActive) {
          if (error instanceof Error && error.message === "Event not found.") {
            router.replace("/events");
            return;
          }

          setLoadError(
            error instanceof Error ? error.message : "Failed to load event users.",
          );
          setSnapshot(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    const loadDirectory = async () => {
      setIsDirectoryLoading(true);
      setDirectoryError(null);

      try {
        const nextUsers = await listUserPoolUsers();

        if (isActive) {
          setDirectoryUsers(nextUsers);
        }
      } catch (error) {
        if (isActive) {
          setDirectoryError(
            error instanceof Error
              ? error.message
              : "Failed to load Cognito users.",
          );
        }
      } finally {
        if (isActive) {
          setIsDirectoryLoading(false);
        }
      }
    };

    void loadTeam();
    void loadDirectory();

    return () => {
      isActive = false;
    };
  }, [params.id, router]);

  const handleRoleChange = async (email: string, role: MemberRole) => {
    setUpdatingEmail(email);

    try {
      const nextSnapshot = await updateEventMemberRole(params.id, email, role);
      setSnapshot(nextSnapshot);
      toast.success(`${email} is now ${role.toLowerCase()}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update the user role.",
      );
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleAssignMember = async (email: string) => {
    const role = pendingRoles[email] ?? "VIEWER";
    setAssigningEmail(email);

    try {
      const nextSnapshot = await addEventMember(params.id, email, role);
      setSnapshot(nextSnapshot);
      toast.success(`${email} added as ${role.toLowerCase()}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign the user.",
      );
    } finally {
      setAssigningEmail(null);
    }
  };

  const title = snapshot?.event.name ? `${snapshot.event.name} Team` : "Event Team";
  const totalUsers = snapshot ? snapshot.members.length + 1 : 0;
  const adminCount = snapshot ? snapshot.event.admins.length + 1 : 0;
  const editorCount = snapshot?.event.editors.length ?? 0;
  const viewerCount = snapshot?.event.viewers.length ?? 0;

  if (isLoading) {
    return <EventWorkspaceLoader variant="team" />;
  }

  const assignedRoleByEmail = new Map(
    snapshot?.members.map((member) => [member.email, member.role]) ?? [],
  );
  const normalizedSearch = deferredDirectorySearch.trim().toLowerCase();
  const filteredDirectoryUsers = directoryUsers
    .filter((user) => {
      if (!normalizedSearch) {
        return true;
      }

      return [user.name, user.email, user.status].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    })
    .sort((first, second) => {
      const firstAssigned =
        first.email === snapshot?.event.owner || assignedRoleByEmail.has(first.email);
      const secondAssigned =
        second.email === snapshot?.event.owner ||
        assignedRoleByEmail.has(second.email);

      if (firstAssigned !== secondAssigned) {
        return Number(firstAssigned) - Number(secondAssigned);
      }

      return (
        first.name.localeCompare(second.name) ||
        first.email.localeCompare(second.email)
      );
    });

  return (
    <PageWrapper
      title={title}
      description={buildLoadDescription(snapshot)}
    >
      {loadError ? (
        <Card className="border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">
                Team access could not be loaded
              </p>
              <p className="mt-1 text-sm text-red-600">{loadError}</p>
            </div>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Users", String(totalUsers)],
              ["Admins", String(adminCount)],
              ["Editors", String(editorCount)],
              ["Viewers", String(viewerCount)],
            ].map(([label, value]) => (
              <Card key={label} className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="active">Owner</Badge>
                  <Badge variant="active">Admin</Badge>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  {snapshot.event.owner}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  The event creator is treated as the primary admin, keeps full
                  access, and cannot be changed from this screen.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-950/[0.04] p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">Access sync</p>
                <p className="mt-2 leading-7">
                  Role changes update the event, budget, categories, line items, and
                  expense permissions together.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Cognito Directory
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Add users from the user pool
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Search all signed-up users, choose a role, and attach them to
                  this event without leaving the Team page.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative min-w-0 sm:w-[22rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={directorySearch}
                    className="h-11 rounded-full pl-9"
                    placeholder="Search by name, email, or status"
                    onChange={(event) => setDirectorySearch(event.target.value)}
                  />
                </label>
                <Button
                  variant="secondary"
                  className="h-11 rounded-full px-4"
                  disabled={isDirectoryLoading}
                  onClick={async () => {
                    setIsDirectoryLoading(true);
                    setDirectoryError(null);

                    try {
                      const nextUsers = await listUserPoolUsers();
                      setDirectoryUsers(nextUsers);
                    } catch (error) {
                      setDirectoryError(
                        error instanceof Error
                          ? error.message
                          : "Failed to load Cognito users.",
                      );
                    } finally {
                      setIsDirectoryLoading(false);
                    }
                  }}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isDirectoryLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh Pool
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                <Users className="h-4 w-4" />
                {directoryUsers.length} pool users
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                <UserPlus className="h-4 w-4" />
                {filteredDirectoryUsers.length} visible
              </div>
            </div>

            {directoryError ? (
              <div className="mt-4 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {directoryError}
              </div>
            ) : null}

            {isDirectoryLoading ? (
              <div className="mt-5 space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[4.6rem] rounded-[1.35rem]"
                  />
                ))}
              </div>
            ) : filteredDirectoryUsers.length ? (
              <div className="mt-5 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
                {filteredDirectoryUsers.map((user) => {
                  const currentRole = assignedRoleByEmail.get(user.email);
                  const isOwner = snapshot?.event.owner === user.email;
                  const isCurrentUser = snapshot?.currentUser?.email === user.email;
                  const nextRole = pendingRoles[user.email] ?? "VIEWER";
                  const isBusy = assigningEmail === user.email;
                  const canAssign =
                    snapshot?.permissions.canManageRoles &&
                    user.enabled &&
                    !isOwner &&
                    !currentRole;

                  return (
                    <div
                      key={user.email}
                      className="grid gap-3 rounded-[1.25rem] border border-slate-200/80 bg-white/88 px-3.5 py-3 md:grid-cols-[minmax(0,1.2fr)_150px_150px_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(30,58,95,0.12),rgba(46,117,182,0.12))] text-sm font-semibold text-[var(--color-primary)]">
                          {getEmailMonogram(user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {user.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm text-slate-600">
                              {user.email}
                            </p>
                            {isCurrentUser ? <Badge>You</Badge> : null}
                            {isOwner ? <Badge variant="active">Owner</Badge> : null}
                            {isOwner ? <Badge variant="active">Admin</Badge> : null}
                            {currentRole ? (
                              <Badge variant={roleVariant[currentRole]}>
                                {currentRole}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            user.enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {user.enabled ? user.status : `Disabled • ${user.status}`}
                        </span>
                      </div>

                      <Select
                        className="h-10 rounded-[0.95rem] bg-white"
                        value={nextRole}
                        disabled={!canAssign || isBusy}
                        onChange={(event) =>
                          setPendingRoles((current) => ({
                            ...current,
                            [user.email]: event.target.value as MemberRole,
                          }))
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>

                      <div className="flex items-center justify-end">
                        {isOwner ? (
                          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                            Event owner
                          </div>
                        ) : currentRole ? (
                          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                            Already assigned
                          </div>
                        ) : (
                          <Button
                            className="h-10 rounded-full px-4"
                            disabled={!canAssign || isBusy}
                            onClick={() => void handleAssignMember(user.email)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            {isBusy ? "Assigning..." : "Assign"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
                No Cognito users match this search.
              </div>
            )}
          </Card>

          {snapshot.members.length ? (
            <Card className="p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Team Directory
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    Member access by role
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    A denser layout keeps larger teams easier to scan and update.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  {snapshot.members.length} invited members
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {snapshot.members.map((member) => {
                  const isCurrentUser = snapshot.currentUser?.email === member.email;
                  const isBusy = updatingEmail === member.email;
                  const canEditRole =
                    snapshot.permissions.canManageRoles &&
                    !isCurrentUser &&
                    !isBusy;

                  return (
                    <div
                      key={member.email}
                      className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(30,58,95,0.12),rgba(46,117,182,0.12))] text-sm font-semibold text-[var(--color-primary)]">
                          {getEmailMonogram(member.email)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="min-w-0 truncate text-[1rem] font-semibold text-slate-950">
                              {member.email}
                            </h3>
                            <Badge variant={roleVariant[member.role]}>
                              {member.role}
                            </Badge>
                            {isCurrentUser ? <Badge>You</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {roleCopy[member.role]}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.15rem] border border-slate-200/80 bg-slate-950/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Role
                          </label>
                          <p className="text-[11px] font-medium text-slate-500">
                            {isCurrentUser
                              ? "Self managed"
                              : snapshot.permissions.canManageRoles
                                ? "Updates instantly"
                                : "Admin only"}
                          </p>
                        </div>
                        <Select
                          className="mt-2 h-10 rounded-[0.95rem] bg-white"
                          value={member.role}
                          disabled={!canEditRole}
                          onChange={(event) =>
                            void handleRoleChange(
                              member.email,
                              event.target.value as MemberRole,
                            )
                          }
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No invited users yet"
              description="Only the event owner is currently attached to this event. Add members when creating the next event, then manage their roles here."
              action={
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  Owner only
                </div>
              }
            />
          )}

          <Card className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Permission Model
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Role access at a glance
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4" />
                Synced with Amplify access lists
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {roleOptions.map((role) => (
                <div
                  key={role}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5"
                >
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-slate-500" />
                    <Badge variant={roleVariant[role]}>{role}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {roleCopy[role]}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </PageWrapper>
  );
}
