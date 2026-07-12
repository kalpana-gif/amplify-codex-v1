"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CircleAlert,
  Crown,
  PencilLine,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { DirectoryUserPicker } from "@/components/splitwise/directory-user-picker";
import {
  buildSplitwiseMemberDirectory,
  getSplitwiseMemberSecondaryText,
} from "@/components/splitwise/splitwise-helpers";
import { useSplitwiseWorkspace } from "@/components/splitwise/splitwise-workspace-provider";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { listUserDirectoryProfiles } from "@/lib/graphql/events";
import {
  addSplitwiseGroupMember,
  removeSplitwiseGroupMember,
  updateSplitwiseGroupMember,
} from "@/lib/graphql/splitwise";
import { formatCurrency } from "@/lib/utils";
import type { UserDirectoryProfile } from "@/types";

const getInitials = (name: string, email: string) => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length) {
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  return email.slice(0, 2).toUpperCase();
};

const normalizeGuestName = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

export default function SplitwiseMembersPage() {
  const {
    currency,
    isLoading,
    loadError,
    refreshWorkspace,
    view,
  } = useSplitwiseWorkspace();
  const [directoryUsers, setDirectoryUsers] = useState<UserDirectoryProfile[]>([]);
  const [directoryLoadError, setDirectoryLoadError] = useState<string | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    let cancelled = false;

    void listUserDirectoryProfiles()
      .then((profiles) => {
        if (cancelled) {
          return;
        }

        setDirectoryUsers(profiles);
        setDirectoryLoadError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setDirectoryLoadError(
          error instanceof Error ? error.message : "Failed to load registered users.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <EventWorkspaceLoader variant="overview" />;
  }

  if (!view || !currency) {
    return (
      <PageWrapper
        title="Split-Wise"
        description={loadError ?? "This group could not be loaded."}
      >
        <Card className="border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">
            {loadError ?? "This group is unavailable."}
          </p>
        </Card>
      </PageWrapper>
    );
  }

  const adminCount = view.members.filter((member) => member.role === "ADMIN").length;
  const positiveBalances = view.balances.filter((balance) => balance.balance > 0);
  const negativeBalances = view.balances.filter((balance) => balance.balance < 0);
  const zeroBalanceCount = view.balances.filter(
    (balance) => balance.balance === 0,
  ).length;
  const totalCredits = positiveBalances.reduce(
    (sum, balance) => sum + balance.balance,
    0,
  );
  const totalDebts = negativeBalances.reduce(
    (sum, balance) => sum + Math.abs(balance.balance),
    0,
  );
  const memberDirectory = buildSplitwiseMemberDirectory(view.members);
  const balanceByEmail = new Map(
    view.balances.map((balance) => [balance.email, balance.balance]),
  );
  const directoryUserByEmail = new Map(
    directoryUsers.map((profile) => [profile.email.toLowerCase(), profile]),
  );
  const removableCount = view.members.filter((member) => {
    const balance = balanceByEmail.get(member.email) ?? 0;
    return member.role !== "ADMIN" && balance === 0;
  }).length;
  const sortedBalances = [...view.balances].sort(
    (left, right) => Math.abs(right.balance) - Math.abs(left.balance),
  );
  const submitGuestMember = async () => {
    const normalizedName = normalizeGuestName(guestName);

    if (!normalizedName) {
      toast.error("Enter a participant name.");
      return;
    }

    setMemberBusy(true);

    try {
      const result = await addSplitwiseGroupMember(view.group.id, {
        name: normalizedName,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setGuestName("");
      await refreshWorkspace();
    } finally {
      setMemberBusy(false);
    }
  };

  const submitMemberRename = async () => {
    if (!editingEmail) {
      return;
    }

    const normalizedName = normalizeGuestName(editingName);

    if (!normalizedName) {
      toast.error("Enter a participant name.");
      return;
    }

    setMemberBusy(true);

    try {
      const result = await updateSplitwiseGroupMember({
        groupId: view.group.id,
        email: editingEmail,
        name: normalizedName,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setEditingEmail(null);
      setEditingName("");
      await refreshWorkspace();
    } finally {
      setMemberBusy(false);
    }
  };

  return (
    <PageWrapper
      title="Members"
      description="Manage access, roles, and removals in one simple view."
    >
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Group members</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add registered users or guest participants, review balances, and
              remove only members who are fully settled.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={view.permissions.isAdmin ? "active" : "default"}>
              {view.permissions.isAdmin ? "Admin access" : "Member access"}
            </Badge>
            <Badge variant="default">{view.members.length} total</Badge>
            <Badge variant="default">{removableCount} removable</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Members
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {view.members.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Admins
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {adminCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Settled
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {zeroBalanceCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Removable
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {removableCount}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Access and participation
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Keep the roster clean and make balance-related restrictions easy
                  to understand.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                {view.permissions.canManageMembers
                  ? "You can manage members"
                  : "Admins manage members"}
              </div>
            </div>

            {view.permissions.canManageMembers ? (
              <div className="space-y-3">
                <DirectoryUserPicker
                  actionLabel="Add member"
                  description="Search registered users by participant name and add them to this group. Existing members are automatically hidden from the results."
                  directoryUsers={directoryUsers}
                  disabled={memberBusy}
                  emptyMessage={
                    directoryLoadError ?? "No more registered users are available to add."
                  }
                  excludeEmails={view.members.map((member) => member.email)}
                  onSelectEmail={(email) => {
                    const profile = directoryUserByEmail.get(email.toLowerCase());

                    if (!profile) {
                      toast.error("That registered user could not be loaded.");
                      return;
                    }

                    setMemberBusy(true);

                    void addSplitwiseGroupMember(view.group.id, {
                      email: profile.email,
                      name: profile.name,
                    })
                      .then(async (result) => {
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }

                        toast.success(result.message);
                        await refreshWorkspace();
                      })
                      .finally(() => setMemberBusy(false));
                  }}
                  searchLabel="Add by participant name"
                  searchPlaceholder="Search members by participant name"
                  showEmail={false}
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        Add guest participant
                      </span>
                      <Input
                        disabled={memberBusy}
                        placeholder="Enter participant name"
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void submitGuestMember();
                          }
                        }}
                      />
                    </label>
                    <Button
                      className="sm:min-w-[10rem]"
                      disabled={memberBusy}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        void submitGuestMember();
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Guest
                    </Button>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    Guests are stored inside the group by name and can join
                    expenses, balances, and settlements without needing a system
                    account.
                  </p>
                </div>
                {directoryLoadError ? (
                  <p className="text-sm text-red-600">{directoryLoadError}</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Only admins can change membership.
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {view.members.map((member) => {
              const balance = balanceByEmail.get(member.email) ?? 0;
              const hasOpenBalance = balance !== 0;
              const canRemove =
                view.permissions.canManageMembers &&
                member.role !== "ADMIN" &&
                !hasOpenBalance;
              const secondaryLabel = getSplitwiseMemberSecondaryText(
                member.email,
                memberDirectory,
              );

              return (
                <div
                  key={member.email}
                  className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {getInitials(member.name, member.email)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{member.name}</p>
                          <Badge
                            variant={member.role === "ADMIN" ? "active" : "default"}
                          >
                            {member.role}
                          </Badge>
                          {member.isGuest ? (
                            <Badge variant="draft">Guest</Badge>
                          ) : null}
                          {member.role === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                              Admin
                            </span>
                          ) : null}
                        </div>
                        {secondaryLabel ? (
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {secondaryLabel}
                          </p>
                        ) : null}
                        {editingEmail === member.email ? (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Input
                              className="sm:max-w-xs"
                              disabled={memberBusy}
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void submitMemberRename();
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                disabled={memberBusy}
                                size="sm"
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  void submitMemberRename();
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                disabled={memberBusy}
                                size="sm"
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEmail(null);
                                  setEditingName("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <p
                        className={`text-sm font-semibold ${
                          balance > 0
                            ? "text-emerald-700"
                            : balance < 0
                              ? "text-red-700"
                              : "text-slate-700"
                        }`}
                      >
                        {formatCurrency(balance, currency)}
                      </p>

                      <Badge variant={hasOpenBalance ? "warning" : "success"}>
                        {hasOpenBalance ? "Needs settlement" : "Clear"}
                      </Badge>

                      {view.permissions.canManageMembers ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={memberBusy}
                            onClick={() => {
                              setEditingEmail(member.email);
                              setEditingName(member.name);
                            }}
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={!canRemove || memberBusy}
                            title={
                              hasOpenBalance
                                ? "Members with non-zero balances cannot be removed."
                                : member.role === "ADMIN"
                                  ? "Admins cannot be removed from this view."
                                  : undefined
                            }
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remove ${member.name} from this group?`,
                                )
                              ) {
                                return;
                              }

                              setMemberBusy(true);
                              void removeSplitwiseGroupMember(view.group.id, member.email)
                                .then(async (result) => {
                                  if (!result.success) {
                                    toast.error(result.message);
                                    return;
                                  }

                                  toast.success(result.message);
                                  if (editingEmail === member.email) {
                                    setEditingEmail(null);
                                    setEditingName("");
                                  }
                                  await refreshWorkspace();
                                })
                                .finally(() => setMemberBusy(false));
                            }}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {hasOpenBalance ? (
                    <p className="mt-3 text-sm text-amber-700">
                      This member cannot be removed until their balance returns to
                      zero.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">Balance summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Owed money</span>
                <span className="font-semibold text-emerald-700">
                  {positiveBalances.length} · {formatCurrency(totalCredits, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Owe money</span>
                <span className="font-semibold text-red-700">
                  {negativeBalances.length} · {formatCurrency(totalDebts, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Settled</span>
                <span className="font-semibold text-slate-950">
                  {zeroBalanceCount}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200/80 pt-4">
              <p className="text-sm font-medium text-slate-950">By member</p>
              <div className="mt-3 space-y-2">
                {sortedBalances.map((balance) => (
                  <div
                    key={balance.email}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {balance.name}
                      </p>
                      {getSplitwiseMemberSecondaryText(balance.email, memberDirectory) ? (
                        <p className="truncate text-xs text-slate-500">
                          {getSplitwiseMemberSecondaryText(balance.email, memberDirectory)}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className={`ml-3 text-sm font-semibold ${
                        balance.balance > 0
                          ? "text-emerald-700"
                          : balance.balance < 0
                            ? "text-red-700"
                            : "text-slate-700"
                      }`}
                    >
                      {formatCurrency(balance.balance, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-base font-semibold text-amber-900">
                  Removal rule
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Members with a positive or negative balance must stay in the
                  group until they are back at zero.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
