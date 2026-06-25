"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  LockKeyhole,
  Search,
  Settings2,
  SquarePen,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Select } from "@/components/ui/select";
import {
  addEventMember,
  getEventTeamSnapshot,
  listUserDirectoryProfiles,
  removeEventMember,
  updateEventMemberRole,
} from "@/lib/graphql/events";
import type { EventTeamSnapshot, MemberRole, UserDirectoryProfile } from "@/types";

const roleOptions: MemberRole[] = ["ADMIN", "EDITOR", "VIEWER"];

const roleCopy: Record<MemberRole, string> = {
  ADMIN: "Full event management, budget control, and team access.",
  EDITOR: "Can work with expenses, but not manage budgets or access.",
  VIEWER: "Read-only access across the event.",
};

const roleVariant: Record<MemberRole, "active" | "completed" | "default"> = {
  ADMIN: "active",
  EDITOR: "completed",
  VIEWER: "default",
};

const roleOrder: Record<MemberRole, number> = {
  ADMIN: 0,
  EDITOR: 1,
  VIEWER: 2,
};

type AddMemberMode = "invite" | "existing";

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

const getDirectoryMatchScore = (
  profile: UserDirectoryProfile,
  query: string,
) => {
  if (!query) {
    return 0;
  }

  const email = profile.email.toLowerCase();
  const name = profile.name.toLowerCase();

  if (email === query) {
    return 400;
  }

  if (name === query) {
    return 350;
  }

  if (email.startsWith(query)) {
    return 300;
  }

  if (name.startsWith(query)) {
    return 250;
  }

  if (email.includes(query)) {
    return 200;
  }

  if (name.includes(query)) {
    return 150;
  }

  return 0;
};

export default function EventUsersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<EventTeamSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("VIEWER");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<string | null>(null);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(null);
  const [addMemberMode, setAddMemberMode] = useState<AddMemberMode>("invite");
  const [isInviting, setIsInviting] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<UserDirectoryProfile[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const deferredDirectoryQuery = useDeferredValue(directoryQuery);

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

    void loadTeam();

    return () => {
      isActive = false;
    };
  }, [params.id, router]);

  useEffect(() => {
    if (!snapshot?.permissions.canManageRoles) {
      setDirectoryUsers([]);
      setDirectoryError(null);
      setIsDirectoryLoading(false);
      return;
    }

    let isActive = true;

    const loadDirectory = async () => {
      setIsDirectoryLoading(true);
      setDirectoryError(null);

      try {
        const knownUsers = await listUserDirectoryProfiles();

        if (isActive) {
          setDirectoryUsers(knownUsers);
        }
      } catch (error) {
        if (isActive) {
          setDirectoryError(
            error instanceof Error
              ? error.message
              : "Failed to load registered users.",
          );
        }
      } finally {
        if (isActive) {
          setIsDirectoryLoading(false);
        }
      }
    };

    void loadDirectory();

    return () => {
      isActive = false;
    };
  }, [snapshot?.permissions.canManageRoles]);

  useEffect(() => {
    if (!selectedMemberEmail || !snapshot) {
      return;
    }

    const memberStillExists = snapshot.members.some(
      (member) => member.email === selectedMemberEmail,
    );

    if (!memberStillExists) {
      setSelectedMemberEmail(null);
    }
  }, [selectedMemberEmail, snapshot]);

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

  const handleInviteMember = async (emailOverride?: string) => {
    const normalizedEmail = (emailOverride ?? inviteEmail).trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Enter the member email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setIsInviting(true);

    try {
      const nextSnapshot = await addEventMember(params.id, normalizedEmail, inviteRole);
      setSnapshot(nextSnapshot);
      setInviteEmail("");
      setInviteRole("VIEWER");
      setDirectoryQuery("");
      setAddMemberMode("invite");
      setIsAddMemberModalOpen(false);
      toast.success(`${normalizedEmail} added as ${inviteRole.toLowerCase()}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add the member.",
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    setRemovingEmail(email);

    try {
      const nextSnapshot = await removeEventMember(params.id, email);
      setSnapshot(nextSnapshot);
      setMemberPendingRemoval(null);
      setSelectedMemberEmail((current) => (current === email ? null : current));
      toast.success(`${email} removed from this event.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove the member.",
      );
    } finally {
      setRemovingEmail(null);
    }
  };

  const title = snapshot?.event.name ? `${snapshot.event.name} Team` : "Event Team";
  const totalUsers = snapshot ? snapshot.members.length + 1 : 0;
  const adminCount = snapshot ? snapshot.event.admins.length + 1 : 0;
  const editorCount = snapshot?.event.editors.length ?? 0;
  const viewerCount = snapshot?.event.viewers.length ?? 0;
  const teamMetrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accentClass: string;
    iconClass: string;
  }> = [
    {
      label: "Total Members",
      value: String(totalUsers),
      icon: Users,
      accentClass: "bg-[rgba(15,23,42,0.03)]",
      iconClass: "bg-slate-950 text-white",
    },
    {
      label: "Admins",
      value: String(adminCount),
      icon: Crown,
      accentClass: "bg-[rgba(46,117,182,0.08)]",
      iconClass: "bg-[rgba(46,117,182,0.14)] text-[var(--color-accent)]",
    },
    {
      label: "Editors",
      value: String(editorCount),
      icon: SquarePen,
      accentClass: "bg-[rgba(14,165,233,0.08)]",
      iconClass: "bg-[rgba(14,165,233,0.14)] text-sky-700",
    },
    {
      label: "Viewers",
      value: String(viewerCount),
      icon: Eye,
      accentClass: "bg-[rgba(30,58,95,0.06)]",
      iconClass: "bg-[rgba(30,58,95,0.12)] text-[var(--color-primary)]",
    },
  ];
  const normalizedDirectoryQuery = deferredDirectoryQuery.trim().toLowerCase();
  const hasDirectoryQuery = normalizedDirectoryQuery.length > 0;
  const assignedEmails = snapshot
    ? new Set([
        snapshot.event.owner,
        ...snapshot.members.map((member) => member.email),
      ])
    : new Set<string>();
  const matchingDirectoryUsers = directoryUsers
    .filter((profile) => !assignedEmails.has(profile.email))
    .filter((profile) => {
      if (!normalizedDirectoryQuery) {
        return true;
      }

      const normalizedName = profile.name.toLowerCase();
      return (
        profile.email.includes(normalizedDirectoryQuery) ||
        normalizedName.includes(normalizedDirectoryQuery)
      );
    })
    .sort((first, second) => {
      const scoreDifference =
        getDirectoryMatchScore(second, normalizedDirectoryQuery) -
        getDirectoryMatchScore(first, normalizedDirectoryQuery);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (second.lastSeenAt ?? "").localeCompare(first.lastSeenAt ?? "");
    });
  const directorySuggestions = matchingDirectoryUsers.slice(0, 2);
  const sortedMembers = [...(snapshot?.members ?? [])].sort((first, second) => {
    const roleDifference = roleOrder[first.role] - roleOrder[second.role];

    if (roleDifference !== 0) {
      return roleDifference;
    }

    return first.email.localeCompare(second.email);
  });

  if (isLoading) {
    return <EventWorkspaceLoader variant="team" />;
  }

  const closeAddMemberModal = () => {
    if (isInviting) {
      return;
    }

    setIsAddMemberModalOpen(false);
    setAddMemberMode("invite");
    setInviteEmail("");
    setDirectoryQuery("");
  };

  const closeRemoveMemberModal = () => {
    if (removingEmail) {
      return;
    }

    setMemberPendingRemoval(null);
  };

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
          <Card className="p-4 md:p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Team Overview
                  </p>
                  <h2 className="mt-2 max-w-3xl text-[clamp(1.55rem,1.9vw,2.15rem)] font-semibold leading-[1.08] tracking-tight text-slate-950">
                    Simple access control for this event
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                    Members, roles, and access levels in one compact view.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:w-fit xl:self-start">
                  <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Access
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        snapshot.permissions.canManageRoles
                          ? "text-[var(--color-primary)]"
                          : "text-slate-700"
                      }`}
                    >
                      {snapshot.permissions.canManageRoles ? "Manage" : "View"}
                    </p>
                  </div>

                  <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Event Owner
                    </p>
                    <p className="mt-1 max-w-[18rem] truncate text-sm font-semibold text-slate-950">
                      {snapshot.event.owner}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {teamMetrics.map(({ label, value, icon: Icon, accentClass, iconClass }) => (
                  <div
                    key={label}
                    className={`flex min-h-[78px] min-w-0 flex-col justify-between rounded-[1rem] border border-slate-200/70 px-4 py-3 ${accentClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="max-w-[11ch] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {label}
                      </p>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
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

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-5 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Team Members
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    Practical list view
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Scan everyone quickly, see their access level, and update roles in
                    one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                    <Users className="h-4 w-4" />
                    {sortedMembers.length} invited members
                  </div>
                  <Button
                    className="group relative h-11 min-w-[12.5rem] justify-start overflow-visible rounded-full pl-5 pr-[3.35rem] active:scale-[0.99]"
                    disabled={!snapshot.permissions.canManageRoles}
                    variant="auth"
                    onClick={() => setIsAddMemberModalOpen(true)}
                  >
                    <span className="text-sm font-semibold tracking-[0.01em]">
                      Add Member
                    </span>
                    <span className="pointer-events-none absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-white/24 opacity-0 transition-all duration-300 group-hover:scale-[1.16] group-hover:opacity-100" />
                      <span className="absolute -inset-[4px] rounded-full border border-white/18 opacity-0 transition-all duration-300 group-hover:scale-[1.3] group-hover:opacity-100" />
                      <span className="absolute -inset-[8px] rounded-full border border-white/12 opacity-0 transition-all duration-300 group-hover:scale-[1.44] group-hover:opacity-100" />
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-[var(--color-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition-all duration-300 group-hover:scale-[1.08] group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
                        <UserPlus className="h-4 w-4" />
                      </span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {sortedMembers.length ? (
              <div className="space-y-3 px-5 py-5 md:px-6">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1fr)_11rem] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(46,117,182,0.14))] text-sm font-semibold text-[var(--color-primary)]">
                          {getEmailMonogram(snapshot.event.owner)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {snapshot.event.owner}
                            </p>
                            {snapshot.currentUser?.email === snapshot.event.owner ? (
                              <Badge>You</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Primary event owner
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Badge variant="active">ADMIN</Badge>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      Full event management, budget control, and permanent ownership.
                    </p>

                    <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <LockKeyhole className="h-4 w-4 text-slate-400" />
                        Locked
                      </div>
                      <Badge>Fixed</Badge>
                    </div>
                  </div>
                </div>

                {sortedMembers.map((member) => {
                  const isCurrentUser = snapshot.currentUser?.email === member.email;
                  const isRemoving = removingEmail === member.email;
                  const isBusy = updatingEmail === member.email || isRemoving;
                  const canEditRole =
                    snapshot.permissions.canManageRoles &&
                    !isCurrentUser &&
                    !isBusy;
                  const canRemoveMember =
                    snapshot.permissions.canManageRoles &&
                    !isCurrentUser &&
                    !isBusy;
                  const isSelected = selectedMemberEmail === member.email;

                  return (
                    <div
                      key={member.email}
                      className={`overflow-hidden rounded-[1.35rem] border transition ${
                        isSelected
                          ? "border-[rgba(46,117,182,0.28)] bg-slate-50/80 shadow-[0_16px_36px_rgba(15,23,42,0.06)]"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        aria-expanded={isSelected}
                        className="w-full text-left"
                        type="button"
                        onClick={() =>
                          setSelectedMemberEmail((current) =>
                            current === member.email ? null : member.email,
                          )
                        }
                      >
                        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1fr)_11rem] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[var(--color-primary)]">
                                {getEmailMonogram(member.email)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {member.email}
                                  </p>
                                  {isCurrentUser ? <Badge>You</Badge> : null}
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                  Invited team member
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Badge variant={roleVariant[member.role]}>{member.role}</Badge>
                          </div>

                          <p className="text-sm leading-6 text-slate-600">
                            {roleCopy[member.role]}
                          </p>

                          <div
                            className={`flex items-center justify-between rounded-[1rem] px-3 py-3 text-sm font-medium transition ${
                              isSelected
                                ? "border border-[rgba(46,117,182,0.18)] bg-white text-[var(--color-primary)]"
                                : "border border-slate-200 bg-slate-50/80 text-slate-600"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-slate-400" />
                              {isSelected ? "Hide" : "Manage"}
                            </span>
                            {isSelected ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isSelected ? (
                        <div className="border-t border-slate-200 bg-white px-4 py-4">
                          <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_auto] lg:items-center">
                            <div className="min-w-0">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Role
                              </p>
                              <Select
                                className="h-10 rounded-[0.95rem] bg-white"
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

                            <p className="text-sm leading-6 text-slate-500">
                              {isCurrentUser
                                ? "You cannot change your own role or remove yourself here."
                                : snapshot.permissions.canManageRoles
                                  ? "Change the role or remove this member from the event."
                                  : "Only admins can update roles or remove members."}
                            </p>

                            {snapshot.permissions.canManageRoles ? (
                              <Button
                                className="h-10 justify-start rounded-[0.95rem] border border-red-200 bg-white px-4 text-red-600 shadow-none hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                disabled={!canRemoveMember}
                                variant="secondary"
                                onClick={() => setMemberPendingRemoval(member.email)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                {isRemoving ? "Removing..." : "Remove"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-12 text-center md:px-6">
                <p className="text-base font-semibold text-slate-950">
                  No invited users yet
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Only the event owner is currently attached to this event. Use the
                  Add Member button to invite people when you are ready.
                </p>
              </div>
            )}
          </Card>

          <Modal
            className="max-w-2xl md:h-[34rem] md:max-h-[calc(100vh-4rem)]"
            description="Invite by email or add someone who already uses the system."
            open={isAddMemberModalOpen}
            title="Add Member"
            onClose={closeAddMemberModal}
          >
            <div className="flex h-full min-h-[34rem] flex-col md:min-h-0">
              <div className="space-y-6">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/95 p-1">
                  <div
                    aria-label="Add member mode"
                    className="grid grid-cols-2 gap-1"
                    role="tablist"
                  >
                    <button
                      aria-selected={addMemberMode === "invite"}
                      className={`group relative rounded-[1rem] px-4 py-3 text-left transition duration-200 ${
                        addMemberMode === "invite"
                          ? "bg-[#1e3a5f] text-white shadow-[0_10px_24px_rgba(30,58,95,0.18)]"
                          : "text-slate-700 hover:bg-white hover:text-[var(--color-primary)]"
                      }`}
                      role="tab"
                      type="button"
                      onClick={() => setAddMemberMode("invite")}
                    >
                      <span
                        className={`absolute inset-0 rounded-[1rem] transition duration-200 ${
                          addMemberMode === "invite"
                            ? "bg-transparent"
                            : "bg-transparent group-hover:bg-white"
                        }`}
                      />
                      <p
                        className={`relative text-sm font-semibold ${
                          addMemberMode === "invite"
                            ? "text-white"
                            : "text-slate-950 group-hover:text-[var(--color-primary)]"
                        }`}
                      >
                        Invite new
                      </p>
                      <p
                        className={`relative mt-1 text-xs leading-5 ${
                          addMemberMode === "invite"
                            ? "text-white/72"
                            : "text-slate-500 group-hover:text-[var(--color-primary)]/80"
                        }`}
                      >
                        Add by email
                      </p>
                    </button>

                    <button
                      aria-selected={addMemberMode === "existing"}
                      className={`group relative rounded-[1rem] px-4 py-3 text-left transition duration-200 ${
                        addMemberMode === "existing"
                          ? "bg-[#1e3a5f] text-white shadow-[0_10px_24px_rgba(30,58,95,0.18)]"
                          : "text-slate-700 hover:bg-white hover:text-[var(--color-primary)]"
                      }`}
                      role="tab"
                      type="button"
                      onClick={() => setAddMemberMode("existing")}
                    >
                      <span
                        className={`absolute inset-0 rounded-[1rem] transition duration-200 ${
                          addMemberMode === "existing"
                            ? "bg-transparent"
                            : "bg-transparent group-hover:bg-white"
                        }`}
                      />
                      <p
                        className={`relative text-sm font-semibold ${
                          addMemberMode === "existing"
                            ? "text-white"
                            : "text-slate-950 group-hover:text-[var(--color-primary)]"
                        }`}
                      >
                        Add existing
                      </p>
                      <p
                        className={`relative mt-1 text-xs leading-5 ${
                          addMemberMode === "existing"
                            ? "text-white/72"
                            : "text-slate-500 group-hover:text-[var(--color-primary)]/80"
                        }`}
                      >
                        Pick from users
                      </p>
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Role
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Choose the access level for this member.
                      </p>
                    </div>
                    <Select
                      className="h-11 rounded-[1rem] bg-white"
                      value={inviteRole}
                      onChange={(event) =>
                        setInviteRole(event.target.value as MemberRole)
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
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                {addMemberMode === "invite" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Invite by email
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Use the email address the member will sign in with.
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Email address
                      </span>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                          autoFocus
                          className="h-11 rounded-[1rem] bg-white"
                          placeholder="name@company.com"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                        />
                        <Button
                          className="h-11 rounded-[1rem] px-5"
                          disabled={!snapshot.permissions.canManageRoles || isInviting}
                          onClick={() => void handleInviteMember()}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          {isInviting ? "Adding..." : "Invite Member"}
                        </Button>
                      </div>
                    </label>

                    <p className="text-sm text-slate-500">
                      The email should belong to a user who already has access to the app.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Add existing member
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Search people who already signed in. We will show the best two matches.
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                        {directoryUsers.length} in system
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Search users
                      </span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          autoFocus
                          className="h-11 rounded-[1rem] bg-white pl-11"
                          placeholder="Type a name or email"
                          value={directoryQuery}
                          onChange={(event) => setDirectoryQuery(event.target.value)}
                        />
                      </div>
                    </label>

                    {directoryError ? (
                      <p className="text-sm text-red-600">{directoryError}</p>
                    ) : null}

                    {isDirectoryLoading ? (
                      <p className="text-sm text-slate-500">
                        Loading registered users...
                      </p>
                    ) : directorySuggestions.length ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {hasDirectoryQuery ? "Top matches" : "Recent users"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Showing {directorySuggestions.length}
                          </p>
                        </div>

                        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
                          {directorySuggestions.map((profile, index) => (
                            <div
                              key={profile.email}
                              className={`flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between ${
                                index !== directorySuggestions.length - 1
                                  ? "border-b border-slate-200"
                                  : ""
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[var(--color-primary)]">
                                  {getEmailMonogram(profile.email)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {profile.name}
                                  </p>
                                  <p className="truncate text-sm text-slate-500">
                                    {profile.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                className="h-10 rounded-[0.95rem] px-4"
                                disabled={!snapshot.permissions.canManageRoles || isInviting}
                                onClick={() => void handleInviteMember(profile.email)}
                                variant="secondary"
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add as {inviteRole.toLowerCase()}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : hasDirectoryQuery ? (
                      <p className="text-sm text-slate-500">
                        No registered users match that search yet.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Start typing to look up people already in the system.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4" />
            </div>
          </Modal>

          <Modal
            className="max-w-md"
            description="This removes the member from this event and revokes their access."
            open={Boolean(memberPendingRemoval)}
            title="Remove Member"
            onClose={closeRemoveMemberModal}
          >
            <div className="space-y-5">
              <div className="rounded-[1.35rem] border border-red-200 bg-red-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                  Member
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-950">
                  {memberPendingRemoval}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  They will lose access to this event, budget, expenses, and team
                  workspace immediately.
                </p>
              </div>

              <Button
                className="h-11 w-full rounded-[1rem]"
                disabled={!memberPendingRemoval || Boolean(removingEmail)}
                variant="danger"
                onClick={() =>
                  memberPendingRemoval
                    ? void handleRemoveMember(memberPendingRemoval)
                    : undefined
                }
              >
                <UserMinus className="mr-2 h-4 w-4" />
                {removingEmail === memberPendingRemoval
                  ? "Removing..."
                  : "Remove Member"}
              </Button>
            </div>
          </Modal>
        </>
      ) : null}
    </PageWrapper>
  );
}
