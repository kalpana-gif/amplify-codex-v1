"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Select } from "@/components/ui/select";
import {
  getEventTeamSnapshot,
  updateEventMemberRole,
} from "@/lib/graphql/events";
import type { EventTeamSnapshot, MemberRole } from "@/types";

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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

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

  const title = snapshot?.event.name ? `${snapshot.event.name} Team` : "Event Team";
  const totalUsers = snapshot ? snapshot.members.length + 1 : 0;
  const adminCount = snapshot ? snapshot.event.admins.length + 1 : 0;
  const editorCount = snapshot?.event.editors.length ?? 0;
  const viewerCount = snapshot?.event.viewers.length ?? 0;

  if (isLoading) {
    return <EventWorkspaceLoader variant="team" />;
  }

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
            <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-900">
              <p className="font-semibold text-amber-950">Directory sync temporarily disabled</p>
              <p className="mt-2 leading-6">
                The Cognito user-pool directory lookup has been removed from this deployment
                recovery. Existing event members can still be reviewed and their roles updated
                below.
              </p>
            </div>
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
