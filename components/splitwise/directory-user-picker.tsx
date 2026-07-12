"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserDirectoryProfile } from "@/types";

const getInitials = (name: string) => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const getDirectoryMatchScore = (profile: UserDirectoryProfile, query: string) => {
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

type DirectoryUserPickerProps = {
  actionLabel?: string;
  description?: string;
  defaultSuggestionLimit?: number;
  directoryUsers: UserDirectoryProfile[];
  disabled?: boolean;
  emptyMessage?: string;
  excludeEmails?: string[];
  onSelectEmail: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  selectedEmails?: string[];
  selectedTitle?: string;
  showEmail?: boolean;
};

export function DirectoryUserPicker({
  actionLabel = "Add",
  description,
  defaultSuggestionLimit = 8,
  directoryUsers,
  disabled = false,
  emptyMessage = "No registered users match that search yet.",
  excludeEmails,
  onRemoveEmail,
  onSelectEmail,
  searchLabel = "Find registered users",
  searchPlaceholder = "Search by name or email",
  selectedEmails,
  selectedTitle = "Selected participants",
  showEmail = true,
}: DirectoryUserPickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const selectedSet = useMemo(
    () => new Set((selectedEmails ?? []).map((email) => email.toLowerCase())),
    [selectedEmails],
  );
  const excludedSet = useMemo(
    () => new Set((excludeEmails ?? []).map((email) => email.toLowerCase())),
    [excludeEmails],
  );
  const profileByEmail = useMemo(
    () => new Map(directoryUsers.map((profile) => [profile.email.toLowerCase(), profile])),
    [directoryUsers],
  );

  const selectedProfiles = useMemo(
    () =>
      (selectedEmails ?? []).map((email) => {
        const profile = profileByEmail.get(email.toLowerCase());

        return (
          profile ?? {
            email,
            name: "Registered user",
            lastSeenAt: null,
          }
        );
      }),
    [profileByEmail, selectedEmails],
  );
  const shouldShowProfileEmail = showEmail;

  const suggestions = useMemo(
    () =>
      directoryUsers
        .filter((profile) => {
          const normalizedEmail = profile.email.toLowerCase();
          return !selectedSet.has(normalizedEmail) && !excludedSet.has(normalizedEmail);
        })
        .filter((profile) => {
          if (!normalizedQuery) {
            return true;
          }

          const normalizedName = profile.name.toLowerCase();
          return (
            profile.email.toLowerCase().includes(normalizedQuery) ||
            normalizedName.includes(normalizedQuery)
          );
        })
        .sort((first, second) => {
          const scoreDifference =
            getDirectoryMatchScore(second, normalizedQuery) -
            getDirectoryMatchScore(first, normalizedQuery);

          if (scoreDifference !== 0) {
            return scoreDifference;
          }

          return (second.lastSeenAt ?? "").localeCompare(first.lastSeenAt ?? "");
        })
        .slice(0, normalizedQuery ? 6 : defaultSuggestionLimit),
    [defaultSuggestionLimit, directoryUsers, excludedSet, normalizedQuery, selectedSet],
  );

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {searchLabel}
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-[1rem] border-slate-200 bg-white pl-11"
            disabled={disabled}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </label>

      {description ? (
        <p className="text-xs leading-6 text-slate-500">{description}</p>
      ) : null}

      {selectedProfiles.length ? (
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {selectedTitle}
            </p>
            <p className="text-xs text-slate-500">{selectedProfiles.length} chosen</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedProfiles.map((profile) => (
              <div
                key={profile.email}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/[0.06] text-[10px] font-semibold text-slate-700">
                  {getInitials(profile.name)}
                </span>
                <span className="font-medium text-slate-950">{profile.name}</span>
                {shouldShowProfileEmail ? (
                  <span className="text-slate-500">{profile.email}</span>
                ) : null}
                {onRemoveEmail ? (
                  <button
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    disabled={disabled}
                    type="button"
                    onClick={() => onRemoveEmail(profile.email)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {normalizedQuery ? "Matches" : "Recent registered users"}
          </p>
          <p className="text-xs text-slate-500">{suggestions.length} shown</p>
        </div>

        {suggestions.length ? (
          <div className="divide-y divide-slate-200">
            {suggestions.map((profile) => (
              <div
                key={profile.email}
                className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950/[0.05] text-xs font-semibold text-slate-700">
                    {getInitials(profile.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {profile.name}
                    </p>
                    {shouldShowProfileEmail ? (
                      <p className="truncate text-sm text-slate-500">{profile.email}</p>
                    ) : null}
                  </div>
                </div>

                <Button
                  className="rounded-[0.95rem]"
                  disabled={disabled}
                  size="sm"
                  variant="secondary"
                  onClick={() => onSelectEmail(profile.email)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {actionLabel}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 text-sm text-slate-500">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
