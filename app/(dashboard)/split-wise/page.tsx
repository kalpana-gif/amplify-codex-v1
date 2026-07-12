"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowUpRight, Plus, Users, X } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { DirectoryUserPicker } from "@/components/splitwise/directory-user-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  createSplitwiseGroup,
  listSplitwiseGroups,
} from "@/lib/graphql/splitwise";
import { listUserDirectoryProfiles } from "@/lib/graphql/events";
import { formatRelativeDate } from "@/lib/utils";
import type { SplitwiseGroupListItem, UserDirectoryProfile } from "@/types";

const normalizeGuestName = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

export default function SplitWisePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<SplitwiseGroupListItem[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<UserDirectoryProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<"USD" | "LKR">("USD");
  const [selectedMemberEmails, setSelectedMemberEmails] = useState<string[]>([]);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [guestNames, setGuestNames] = useState<string[]>([]);

  const directoryUserByEmail = useMemo(
    () =>
      new Map(
        directoryUsers.map((profile) => [profile.email.toLowerCase(), profile]),
      ),
    [directoryUsers],
  );

  const addGuestName = () => {
    const normalizedName = normalizeGuestName(guestNameInput);

    if (!normalizedName) {
      toast.error("Enter a participant name.");
      return;
    }

    const normalizedGuestKey = normalizedName.toLowerCase();
    const alreadySelected = guestNames.some(
      (entry) => entry.toLowerCase() === normalizedGuestKey,
    );

    if (alreadySelected) {
      toast.error("That guest participant is already added.");
      return;
    }

    setGuestNames((current) => [...current, normalizedName]);
    setGuestNameInput("");
  };

  const loadGroups = async () => {
    setIsLoading(true);

    const [groupsResult, directoryResult] = await Promise.all([
      listSplitwiseGroups(),
      listUserDirectoryProfiles().catch(() => []),
    ]);

    if (!groupsResult.success) {
      toast.error(groupsResult.message);
    }

    setGroups(groupsResult.groups);
    setDirectoryUsers(directoryResult);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  if (isLoading) {
    return <EventWorkspaceLoader variant="overview" />;
  }

  return (
    <PageWrapper
      title="Split-Wise"
      description="Create shared groups, split expenses in cents, record settlements, and keep a full activity trail."
      actions={
        <Button
          className="h-12 min-w-[188px] justify-between rounded-full pl-5 pr-2 text-sm font-semibold shadow-[0_18px_34px_rgba(30,58,95,0.24)]"
          onClick={() => setIsCreateOpen(true)}
        >
          <span className="whitespace-nowrap">New Group</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(30,58,95,0.14)] bg-white/95 text-[var(--color-primary)] shadow-sm">
            <Plus className="h-4 w-4" />
          </span>
        </Button>
      }
    >
      {groups.length ? (
        <div className="grid justify-items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/split-wise/${group.id}`}
              className="block w-full max-w-[30rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(46,117,182,0.24)] focus-visible:ring-offset-2"
            >
              <Card className="w-full border border-slate-200/80 bg-white p-4 transition hover:border-[rgba(46,117,182,0.32)] hover:ring-2 hover:ring-[rgba(46,117,182,0.14)] hover:ring-offset-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Shared Group
                    </p>
                    <h2 className="mt-1.5 truncate text-[1.55rem] font-semibold tracking-tight text-slate-950">
                      {group.name}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      Created by{" "}
                      <span className="font-medium text-slate-800">
                        {directoryUserByEmail.get(group.createdBy.toLowerCase())?.name ??
                          "Registered user"}
                      </span>
                      {group.createdAt ? ` • ${formatRelativeDate(group.createdAt)}` : ""}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Currency
                    </p>
                    <p className="mt-1 text-base font-semibold tracking-tight text-slate-950">
                      {group.currency}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-[1.05rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Members
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-base font-semibold text-slate-950">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                        <Users className="h-3.5 w-3.5 text-slate-600" />
                      </span>
                      {group.memberCount}
                    </p>
                  </div>
                  <div className="rounded-[1.05rem] border border-slate-200/80 bg-slate-950 px-3 py-3 text-white">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      Workspace
                    </p>
                    <p className="mt-1.5 text-base font-semibold">
                      Balances & history
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-sm text-slate-600">
                  <span>Open workspace</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Create your first Split-Wise group"
          description="Add registered members or guest participants, track who paid, and keep balances simplified in one shared workspace."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>Create Group</Button>
          }
        />
      )}

      <Modal
        className="max-w-4xl"
        open={isCreateOpen}
        title="Create Split-Wise Group"
        description="Create a shared group, search registered users from the system, and add guests when needed."
        onClose={() => {
          if (!isSubmitting) {
            setIsCreateOpen(false);
          }
        }}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSubmitting(true);

            const members = [
              ...selectedMemberEmails
                .map((email) => {
                  const profile = directoryUserByEmail.get(email.toLowerCase());

                  if (!profile) {
                    return null;
                  }

                  return {
                    email: profile.email,
                    name: profile.name,
                  };
                })
                .filter((member): member is { email: string; name: string } => Boolean(member)),
              ...guestNames.map((guestName) => ({
                name: guestName,
              })),
            ];

            void createSplitwiseGroup({
              name,
              currency,
              members,
            })
              .then((result) => {
                if (!result.success || !result.groupId) {
                  toast.error(result.message);
                  return;
                }

                toast.success("Split-Wise group created.");
                setIsCreateOpen(false);
                setName("");
                setCurrency("USD");
                setSelectedMemberEmails([]);
                setGuestNameInput("");
                setGuestNames([]);
                router.push(`/split-wise/${result.groupId}`);
              })
              .finally(() => setIsSubmitting(false));
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Group setup
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Start with the group name and currency, then add people from the system or as guests.
                </p>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Group Name</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Weekend trip"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Currency</span>
                <Select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as "USD" | "LKR")}
                >
                  <option value="USD">USD</option>
                  <option value="LKR">LKR</option>
                </Select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Registered users
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {selectedMemberEmails.length}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Guest users
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {guestNames.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  System users
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Search registered users and quickly add them to the group. A few recent users are shown by default.
                </p>
              </div>

              <DirectoryUserPicker
                actionLabel="Add user"
                defaultSuggestionLimit={3}
                description="Search by participant name or email from the registered user list."
                directoryUsers={directoryUsers}
                disabled={isSubmitting}
                emptyMessage="No registered users are available to add right now."
                onRemoveEmail={(email) =>
                  setSelectedMemberEmails((current) =>
                    current.filter((entry) => entry !== email),
                  )
                }
                onSelectEmail={(email) =>
                  setSelectedMemberEmails((current) =>
                    current.includes(email) ? current : [...current, email],
                  )
                }
                searchLabel="Find registered users"
                searchPlaceholder="Search system users by name or email"
                selectedEmails={selectedMemberEmails}
                selectedTitle="Selected registered users"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Guest participants
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Add people who are not registered in this system by name only.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                disabled={isSubmitting}
                placeholder="Add guest participant by name"
                value={guestNameInput}
                onChange={(event) => setGuestNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addGuestName();
                  }
                }}
              />
              <Button
                className="sm:min-w-[10rem]"
                disabled={isSubmitting}
                type="button"
                variant="secondary"
                onClick={addGuestName}
              >
                Add Guest
              </Button>
            </div>

            {guestNames.length ? (
              <div className="flex flex-wrap gap-2">
                {guestNames.map((guestName) => (
                  <div
                    key={guestName}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <span className="font-medium text-slate-950">{guestName}</span>
                    <span className="text-slate-500">Guest</span>
                    <button
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      disabled={isSubmitting}
                      type="button"
                      onClick={() =>
                        setGuestNames((current) =>
                          current.filter((entry) => entry !== guestName),
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200/80 pt-1">
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
