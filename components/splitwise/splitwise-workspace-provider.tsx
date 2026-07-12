"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  getSplitwiseGroup,
  listSplitwiseGroupActivity,
} from "@/lib/graphql/splitwise";
import type {
  CurrencyCode,
  SplitwiseActivityItem,
  SplitwiseGroupView,
} from "@/types";

type SplitwiseWorkspaceContextValue = {
  groupId: string;
  view: SplitwiseGroupView | null;
  activityItems: SplitwiseActivityItem[];
  activityNextToken: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingActivity: boolean;
  loadError: string | null;
  currency: CurrencyCode | null;
  activeExpenses: SplitwiseGroupView["expenses"];
  totalOutstanding: number;
  refreshWorkspace: () => Promise<void>;
  loadMoreActivity: () => Promise<void>;
};

const SplitwiseWorkspaceContext =
  createContext<SplitwiseWorkspaceContextValue | null>(null);

export function SplitwiseWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const [view, setView] = useState<SplitwiseGroupView | null>(null);
  const [activityItems, setActivityItems] = useState<SplitwiseActivityItem[]>([]);
  const [activityNextToken, setActivityNextToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadWorkspace = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [groupResult, activityResult] = await Promise.all([
        getSplitwiseGroup(groupId),
        listSplitwiseGroupActivity(groupId, { limit: 15 }),
      ]);

      if (!isActive) {
        return;
      }

      if (!groupResult.success || !groupResult.group || !groupResult.permissions) {
        setView(null);
        setLoadError(groupResult.message);
        setActivityItems([]);
        setActivityNextToken(null);
        setIsLoading(false);
        return;
      }

      setView({
        group: groupResult.group,
        permissions: groupResult.permissions,
        members: groupResult.members,
        expenses: groupResult.expenses,
        settlements: groupResult.settlements,
        balances: groupResult.balances,
        simplifiedDebts: groupResult.simplifiedDebts,
      });

      if (!activityResult.success) {
        setActivityItems([]);
        setActivityNextToken(null);
      } else {
        setActivityItems(activityResult.items);
        setActivityNextToken(activityResult.nextToken ?? null);
      }

      setIsLoading(false);
    };

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [groupId]);

  const refreshWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);

    const [groupResult, activityResult] = await Promise.all([
      getSplitwiseGroup(groupId),
      listSplitwiseGroupActivity(groupId, { limit: 15 }),
    ]);

    if (!groupResult.success || !groupResult.group || !groupResult.permissions) {
      setView(null);
      setLoadError(groupResult.message);
      setActivityItems([]);
      setActivityNextToken(null);
      setIsRefreshing(false);
      return;
    }

    setView({
      group: groupResult.group,
      permissions: groupResult.permissions,
      members: groupResult.members,
      expenses: groupResult.expenses,
      settlements: groupResult.settlements,
      balances: groupResult.balances,
      simplifiedDebts: groupResult.simplifiedDebts,
    });

    if (activityResult.success) {
      setActivityItems(activityResult.items);
      setActivityNextToken(activityResult.nextToken ?? null);
    } else {
      setActivityItems([]);
      setActivityNextToken(null);
    }

    setIsRefreshing(false);
  }, [groupId]);

  const loadMoreActivity = useCallback(async () => {
    if (!activityNextToken || isLoadingActivity) {
      return;
    }

    setIsLoadingActivity(true);

    const result = await listSplitwiseGroupActivity(groupId, {
      limit: 15,
      nextToken: activityNextToken,
    });

    if (result.success) {
      setActivityItems((current) => [...current, ...result.items]);
      setActivityNextToken(result.nextToken ?? null);
    }

    setIsLoadingActivity(false);
  }, [activityNextToken, groupId, isLoadingActivity]);

  const activeExpenses = useMemo(
    () => (view?.expenses ?? []).filter((expense) => !expense.isDeleted),
    [view?.expenses],
  );

  const totalOutstanding = useMemo(
    () =>
      (view?.balances ?? [])
        .filter((balance) => balance.balance > 0)
        .reduce((sum, balance) => sum + balance.balance, 0),
    [view?.balances],
  );

  const value = useMemo<SplitwiseWorkspaceContextValue>(
    () => ({
      groupId,
      view,
      activityItems,
      activityNextToken,
      isLoading,
      isRefreshing,
      isLoadingActivity,
      loadError,
      currency: view?.group.currency ?? null,
      activeExpenses,
      totalOutstanding,
      refreshWorkspace,
      loadMoreActivity,
    }),
    [
      activeExpenses,
      activityItems,
      activityNextToken,
      groupId,
      isLoading,
      isLoadingActivity,
      isRefreshing,
      loadError,
      loadMoreActivity,
      refreshWorkspace,
      totalOutstanding,
      view,
    ],
  );

  return (
    <SplitwiseWorkspaceContext.Provider value={value}>
      {children}
    </SplitwiseWorkspaceContext.Provider>
  );
}

export function useSplitwiseWorkspace() {
  const context = useContext(SplitwiseWorkspaceContext);

  if (!context) {
    throw new Error(
      "useSplitwiseWorkspace must be used within SplitwiseWorkspaceProvider.",
    );
  }

  return context;
}
