"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Clock3,
  WandSparkles,
} from "lucide-react";
import {
  buildSplitwiseMemberDirectory,
  getSplitwiseMemberDisplayName,
  getSplitwiseMemberName,
} from "@/components/splitwise/splitwise-helpers";
import { useSplitwiseWorkspace } from "@/components/splitwise/splitwise-workspace-provider";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { EventWorkspaceLoader } from "@/components/ui/page-loader";
import { Textarea } from "@/components/ui/textarea";
import { recordSplitwiseSettlement } from "@/lib/graphql/splitwise";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import type { SplitwiseBalance, SplitwiseSimplifiedDebt } from "@/types";

const getSettlementKey = (
  debt: Pick<SplitwiseSimplifiedDebt, "fromEmail" | "toEmail">,
) => `${debt.fromEmail}__${debt.toEmail}`;

const NETWORK_CANVAS_WIDTH = 1080;
const NETWORK_CARD_WIDTH = 248;
const NETWORK_CARD_HEIGHT = 96;
const NETWORK_SIDE_PADDING = 32;
const NETWORK_TOP_PADDING = 72;
const NETWORK_BOTTOM_PADDING = 72;
const NETWORK_NODE_GAP = 20;
const NETWORK_LINE_INSET = 28;
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

const buildParticipantSummaries = ({
  debts,
  kind,
}: {
  debts: SplitwiseSimplifiedDebt[];
  kind: "paying" | "receiving";
}) => {
  const entries = new Map<
    string,
    {
      email: string;
      total: number;
      stepCount: number;
    }
  >();

  for (const debt of debts) {
    const email = kind === "paying" ? debt.fromEmail : debt.toEmail;
    const current = entries.get(email);

    entries.set(email, {
      email,
      total: (current?.total ?? 0) + debt.amount,
      stepCount: (current?.stepCount ?? 0) + 1,
    });
  }

  return Array.from(entries.values()).sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    return left.email.localeCompare(right.email);
  });
};

type SettlementNetworkNode = {
  email: string;
  name: string;
  shortName: string;
  total: number;
  stepCount: number;
  top: number;
  centerY: number;
  column: "debtors" | "creditors";
};

const getShortName = (name: string) => {
  const trimmed = name.trim();

  if (trimmed.length <= 18) {
    return trimmed;
  }

  const firstName = trimmed.split(/\s+/).find(Boolean) ?? trimmed;
  return firstName.length <= 18
    ? firstName
    : `${firstName.slice(0, 17).trimEnd()}...`;
};

const buildSettlementNetwork = ({
  balances,
  debts,
  memberDirectory,
}: {
  balances: SplitwiseBalance[];
  debts: SplitwiseSimplifiedDebt[];
  memberDirectory: ReturnType<typeof buildSplitwiseMemberDirectory>;
}) => {
  const balanceByEmail = new Map(
    balances.map((balance) => [balance.email, balance.balance]),
  );

  const sortByMagnitude = (
    left: { email: string; total: number },
    right: { email: string; total: number },
  ) => {
    const rightMagnitude = Math.abs(
      balanceByEmail.get(right.email) ?? right.total,
    );
    const leftMagnitude = Math.abs(
      balanceByEmail.get(left.email) ?? left.total,
    );

    if (rightMagnitude !== leftMagnitude) {
      return rightMagnitude - leftMagnitude;
    }

    return left.email.localeCompare(right.email);
  };

  const debtors = buildParticipantSummaries({
    debts,
    kind: "paying",
  }).sort(sortByMagnitude);
  const creditors = buildParticipantSummaries({
    debts,
    kind: "receiving",
  }).sort(sortByMagnitude);

  const getColumnHeight = (count: number) =>
    count > 0
      ? count * NETWORK_CARD_HEIGHT + (count - 1) * NETWORK_NODE_GAP
      : 0;

  const usableHeight = Math.max(
    getColumnHeight(debtors.length),
    getColumnHeight(creditors.length),
    NETWORK_CARD_HEIGHT * 2 + NETWORK_NODE_GAP,
  );
  const height = usableHeight + NETWORK_TOP_PADDING + NETWORK_BOTTOM_PADDING;

  const positionEntries = (
    entries: Array<{ email: string; total: number; stepCount: number }>,
    column: SettlementNetworkNode["column"],
  ) =>
    entries.map((entry, index) => {
      const name = getSplitwiseMemberName(entry.email, memberDirectory);
      const columnHeight = getColumnHeight(entries.length);
      const startTop =
        NETWORK_TOP_PADDING + Math.max(0, (usableHeight - columnHeight) / 2);
      const top = startTop + index * (NETWORK_CARD_HEIGHT + NETWORK_NODE_GAP);
      const centerY = top + NETWORK_CARD_HEIGHT / 2;

      return {
        ...entry,
        name,
        shortName: getShortName(name),
        top,
        centerY,
        column,
      };
    });

  const debtorNodes = positionEntries(debtors, "debtors");
  const creditorNodes = positionEntries(creditors, "creditors");

  return {
    height,
    debtors: debtorNodes,
    creditors: creditorNodes,
    debtorByEmail: new Map(debtorNodes.map((node) => [node.email, node])),
    creditorByEmail: new Map(creditorNodes.map((node) => [node.email, node])),
    lineStartX:
      NETWORK_SIDE_PADDING + NETWORK_CARD_WIDTH + NETWORK_LINE_INSET,
    lineEndX:
      NETWORK_CANVAS_WIDTH -
      NETWORK_SIDE_PADDING -
      NETWORK_CARD_WIDTH -
      NETWORK_LINE_INSET,
  };
};

export default function SplitwiseSettlementsPage() {
  const { currency, isLoading, loadError, refreshWorkspace, view } =
    useSplitwiseWorkspace();
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [selectedSettlementKey, setSelectedSettlementKey] = useState<
    string | null
  >(null);
  const [settlementModalKey, setSettlementModalKey] = useState<string | null>(
    null,
  );
  const [settlementNotes, setSettlementNotes] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!view) {
      return;
    }

    const validKeys = new Set(
      view.simplifiedDebts.map((debt) => getSettlementKey(debt)),
    );

    setSelectedSettlementKey((current) => {
      if (current && validKeys.has(current)) {
        return current;
      }

      return view.simplifiedDebts[0]
        ? getSettlementKey(view.simplifiedDebts[0])
        : null;
    });

    setSettlementNotes((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => validKeys.has(key)),
      ),
    );

    setSettlementModalKey((current) =>
      current && validKeys.has(current) ? current : null,
    );
  }, [view]);

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

  const totalSettled = view.settlements.reduce(
    (sum, settlement) => sum + settlement.amount,
    0,
  );
  const outstandingPlannedAmount = view.simplifiedDebts.reduce(
    (sum, debt) => sum + debt.amount,
    0,
  );
  const sortedSettlements = [...view.settlements].sort(
    (left, right) =>
      new Date(right.settledAt).getTime() - new Date(left.settledAt).getTime(),
  );
  const latestSettlement = sortedSettlements[0];
  const memberDirectory = buildSplitwiseMemberDirectory(view.members);
  const settlementNetwork = buildSettlementNetwork({
    balances: view.balances,
    debts: view.simplifiedDebts,
    memberDirectory,
  });
  const selectedSuggestedDebt = view.simplifiedDebts.find(
    (debt) => getSettlementKey(debt) === selectedSettlementKey,
  );
  const modalSuggestedDebt = view.simplifiedDebts.find(
    (debt) => getSettlementKey(debt) === settlementModalKey,
  );

  const toggleSuggestedPair = (debt: SplitwiseSimplifiedDebt) => {
    const nextKey = getSettlementKey(debt);
    setSelectedSettlementKey((current) =>
      current === nextKey ? null : nextKey,
    );
  };

  const focusParticipant = (
    email: string,
    column: SettlementNetworkNode["column"],
  ) => {
    const nextDebt = view.simplifiedDebts.find((debt) =>
      column === "debtors" ? debt.fromEmail === email : debt.toEmail === email,
    );

    setSelectedSettlementKey(nextDebt ? getSettlementKey(nextDebt) : null);
  };

  const openSettlementModal = (debt: SplitwiseSimplifiedDebt) => {
    const debtKey = getSettlementKey(debt);
    setSelectedSettlementKey(debtKey);
    setSettlementModalKey(debtKey);
  };

  const closeSettlementModal = () => {
    setSettlementModalKey(null);
  };

  const recordSuggestedSettlement = async (debt: SplitwiseSimplifiedDebt) => {
    const debtKey = getSettlementKey(debt);
    setRecordingKey(debtKey);

    try {
      const result = await recordSplitwiseSettlement({
        groupId: view.group.id,
        fromEmail: debt.fromEmail,
        toEmail: debt.toEmail,
        amount: debt.amount,
        note: settlementNotes[debtKey]?.trim() ?? "",
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSettlementNotes((current) => ({
        ...current,
        [debtKey]: "",
      }));
      setSettlementModalKey(null);
      await refreshWorkspace();
    } finally {
      setRecordingKey(null);
    }
  };

  return (
    <PageWrapper
      title="Settlements"
      description="Record repayments with a clear always-visible network and a simple confirmation flow."
    >
      <Card className="p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.35rem] bg-slate-950 p-4 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Suggested Steps
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {view.simplifiedDebts.length}
            </p>
            <p className="mt-1 text-sm text-white/72">
              Minimum transactions remaining
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Planned Amount
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCurrency(outstandingPlannedAmount, currency)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Still suggested by the simplified path
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Recorded Settlements
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {view.settlements.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {latestSettlement
                ? `Latest ${formatRelativeDate(latestSettlement.settledAt)}`
                : "Nothing recorded yet"}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Total Settled
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCurrency(totalSettled, currency)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Confirmed repayments so far
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Simplified Debts
              </p>
              <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-950">
                Suggested settlement path
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review the live debtor-to-creditor map, focus a connection, and
                confirm each settlement from the list below.
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/[0.04] text-slate-700">
              <WandSparkles className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 space-y-5">
            {view.simplifiedDebts.length ? (
              <>
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Settlement Network
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        All suggested transfers stay visible here, with one
                        focused path highlighted at a time.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
                        Paying
                      </span>
                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                        Receiving
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 min-[1180px]:hidden">
                    <div className="space-y-3">
                      {view.simplifiedDebts.map((debt, index) => {
                        const debtKey = getSettlementKey(debt);
                        const isSelected = debtKey === selectedSettlementKey;
                        const fromName = getSplitwiseMemberName(
                          debt.fromEmail,
                          memberDirectory,
                        );
                        const toName = getSplitwiseMemberName(
                          debt.toEmail,
                          memberDirectory,
                        );

                        return (
                          <button
                            key={`network-mobile-${debtKey}`}
                            className={`w-full rounded-[1.25rem] border p-3 text-left transition ${
                              isSelected
                                ? "border-slate-950 bg-slate-50 shadow-[0_18px_36px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/8"
                                : "border-slate-200/80 bg-white/96"
                            }`}
                            type="button"
                            onClick={() => toggleSuggestedPair(debt)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                Step {index + 1}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  isSelected
                                    ? "bg-slate-950 text-white"
                                    : "border border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                {formatCurrency(debt.amount, currency)}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                              <div
                                className={`rounded-[1rem] border px-3 py-3 transition ${
                                  isSelected
                                    ? "border-orange-300 bg-orange-50"
                                    : "border-orange-200/80 bg-orange-50/70"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                                      isSelected
                                        ? "border-orange-300 bg-orange-500 text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)]"
                                        : "border-orange-200 bg-white text-orange-700"
                                    }`}
                                  >
                                    {getInitials(fromName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">
                                      {fromName}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-700">
                                      Paying
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center gap-2 py-1 text-slate-400">
                                <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:inline-flex">
                                  Transfer
                                </span>
                                <ArrowRight className="hidden h-5 w-5 sm:block" />
                                <ArrowDown className="h-5 w-5 sm:hidden" />
                              </div>

                              <div
                                className={`rounded-[1rem] border px-3 py-3 transition ${
                                  isSelected
                                    ? "border-sky-300 bg-sky-50"
                                    : "border-sky-200/80 bg-sky-50/70"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                                      isSelected
                                        ? "border-sky-300 bg-sky-500 text-white shadow-[0_10px_20px_rgba(14,165,233,0.25)]"
                                        : "border-sky-200 bg-white text-sky-700"
                                    }`}
                                  >
                                    {getInitials(toName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">
                                      {toName}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-sky-700">
                                      Receiving
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 hidden min-[1180px]:block">
                    <div
                      className="relative mx-auto overflow-hidden rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))]"
                      style={{
                        height: settlementNetwork.height,
                        width: NETWORK_CANVAS_WIDTH,
                      }}
                    >
                      <div className="pointer-events-none absolute inset-y-8 left-1/2 z-0 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(148,163,184,0),rgba(148,163,184,0.5),rgba(148,163,184,0))]" />
                      <div className="pointer-events-none absolute left-1/2 top-5 z-0 -translate-x-1/2 rounded-full border border-slate-200/90 bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                        Live flow
                      </div>

                      <svg
                        aria-hidden="true"
                        className="absolute inset-0 z-0 h-full w-full"
                        viewBox={`0 0 ${NETWORK_CANVAS_WIDTH} ${settlementNetwork.height}`}
                      >
                        <defs>
                          <marker
                            id="settlement-arrow-default"
                            markerHeight="10"
                            markerWidth="10"
                            orient="auto"
                            refX="8"
                            refY="5"
                          >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                          </marker>
                          <marker
                            id="settlement-arrow-active"
                            markerHeight="10"
                            markerWidth="10"
                            orient="auto"
                            refX="8"
                            refY="5"
                          >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                          </marker>
                        </defs>
                        {view.simplifiedDebts.map((debt, index) => {
                          const debtKey = getSettlementKey(debt);
                          const isSelected = debtKey === selectedSettlementKey;
                          const fromNode = settlementNetwork.debtorByEmail.get(
                            debt.fromEmail,
                          );
                          const toNode = settlementNetwork.creditorByEmail.get(
                            debt.toEmail,
                          );

                          if (!fromNode || !toNode) {
                            return null;
                          }

                          const x1 = settlementNetwork.lineStartX;
                          const x2 = settlementNetwork.lineEndX;
                          const y1 = fromNode.centerY;
                          const y2 = toNode.centerY;
                          const targetX = x2 - 16;
                          const controlOffset = Math.max(
                            120,
                            Math.abs(y2 - y1) * 0.42,
                          );
                          const path = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${targetX - controlOffset} ${y2}, ${targetX} ${y2}`;
                          const labelX = NETWORK_CANVAS_WIDTH / 2;
                          const labelY =
                            (y1 + y2) / 2 +
                            (view.simplifiedDebts.length > 1
                              ? index % 2 === 0
                                ? -10
                                : 10
                              : 0);

                          return (
                            <g
                              key={debtKey}
                              className="cursor-pointer"
                              onClick={() => toggleSuggestedPair(debt)}
                            >
                              <path
                                d={path}
                                fill="none"
                                stroke="transparent"
                                strokeWidth="24"
                              />
                              <path
                                d={path}
                                fill="none"
                                stroke={isSelected ? "#0f172a" : "#94a3b8"}
                                markerEnd={
                                  isSelected
                                    ? "url(#settlement-arrow-active)"
                                    : "url(#settlement-arrow-default)"
                                }
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeOpacity={isSelected ? "1" : "0.9"}
                                strokeWidth={isSelected ? "4" : "3"}
                              />
                              <g transform={`translate(${labelX}, ${labelY})`}>
                                <rect
                                  x="-44"
                                  y="-14"
                                  width="88"
                                  height="28"
                                  rx="14"
                                  fill={isSelected ? "#0f172a" : "white"}
                                  stroke={isSelected ? "#0f172a" : "#cbd5e1"}
                                />
                                <text
                                  fill={isSelected ? "white" : "#334155"}
                                  fontSize="11"
                                  fontWeight="700"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  {formatCurrency(debt.amount, currency)}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </svg>

                      {settlementNetwork.debtors.map((node) => {
                        const isFocused =
                          node.email === selectedSuggestedDebt?.fromEmail ||
                          node.email === selectedSuggestedDebt?.toEmail;

                        return (
                          <button
                            key={node.email}
                            className={`absolute z-10 rounded-[1.25rem] border px-4 py-3.5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition ${
                              isFocused
                                ? "border-orange-300 bg-orange-50/95 shadow-[0_18px_38px_rgba(249,115,22,0.14)] ring-1 ring-orange-200/80"
                                : "border-orange-200/70 bg-white/96"
                            }`}
                            style={{
                              width: NETWORK_CARD_WIDTH,
                              height: NETWORK_CARD_HEIGHT,
                              left: NETWORK_SIDE_PADDING,
                              top: node.top,
                            }}
                            type="button"
                            onClick={() =>
                              focusParticipant(node.email, "debtors")
                            }
                          >
                            <div className="flex h-full items-center gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                                  isFocused
                                    ? "border-orange-300 bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]"
                                    : "border-orange-200 bg-white text-orange-700"
                                }`}
                              >
                                {getInitials(node.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {node.shortName}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Pays {formatCurrency(node.total, currency)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {node.stepCount} step
                                  {node.stepCount === 1 ? "" : "s"} remaining
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {settlementNetwork.creditors.map((node) => {
                        const isFocused =
                          node.email === selectedSuggestedDebt?.fromEmail ||
                          node.email === selectedSuggestedDebt?.toEmail;

                        return (
                          <button
                            key={node.email}
                            className={`absolute z-10 rounded-[1.25rem] border px-4 py-3.5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition ${
                              isFocused
                                ? "border-sky-300 bg-sky-50/95 shadow-[0_18px_38px_rgba(14,165,233,0.14)] ring-1 ring-sky-200/80"
                                : "border-sky-200/70 bg-white/96"
                            }`}
                            style={{
                              width: NETWORK_CARD_WIDTH,
                              height: NETWORK_CARD_HEIGHT,
                              left:
                                NETWORK_CANVAS_WIDTH -
                                NETWORK_SIDE_PADDING -
                                NETWORK_CARD_WIDTH,
                              top: node.top,
                            }}
                            type="button"
                            onClick={() =>
                              focusParticipant(node.email, "creditors")
                            }
                          >
                            <div className="flex h-full items-center gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                                  isFocused
                                    ? "border-sky-300 bg-sky-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]"
                                    : "border-sky-200 bg-white text-sky-700"
                                }`}
                              >
                                {getInitials(node.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {node.shortName}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Receives{" "}
                                  {formatCurrency(node.total, currency)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Across {node.stepCount} step
                                  {node.stepCount === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-[1.1rem] border border-slate-200/80 bg-white/95 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Selection
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedSuggestedDebt ? (
                          <>
                            <span className="font-semibold text-slate-950">
                              {getSplitwiseMemberName(
                                selectedSuggestedDebt.fromEmail,
                                memberDirectory,
                              )}
                            </span>{" "}
                            pays{" "}
                            <span className="font-semibold text-slate-950">
                              {getSplitwiseMemberName(
                                selectedSuggestedDebt.toEmail,
                                memberDirectory,
                              )}
                            </span>{" "}
                            <span className="font-semibold text-slate-950">
                              {formatCurrency(
                                selectedSuggestedDebt.amount,
                                currency,
                              )}
                            </span>
                          </>
                        ) : (
                          "Tap a transfer lane, member card, or connection to focus one settlement step."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="h-10 rounded-xl px-3"
                        disabled={
                          !selectedSuggestedDebt ||
                          !view.permissions.canRecordSettlements
                        }
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (selectedSuggestedDebt) {
                            openSettlementModal(selectedSuggestedDebt);
                          }
                        }}
                      >
                        Record settlement
                      </Button>
                      <Button
                        className="h-10 rounded-xl px-3"
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedSettlementKey(null)}
                      >
                        Clear selection
                      </Button>
                    </div>
                  </div>
                </div>

                {view.simplifiedDebts.map((debt, index) => {
                  const debtKey = getSettlementKey(debt);
                  const isSelected = debtKey === selectedSettlementKey;

                  return (
                    <div
                      key={`${debt.fromEmail}-${debt.toEmail}-${debt.amount}`}
                      className={`rounded-[1.3rem] border px-4 py-4 transition ${
                        isSelected
                          ? "border-slate-950 bg-slate-50 shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
                          : "border-slate-200/80 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          className="min-w-0 flex-1 text-left"
                          type="button"
                          onClick={() => toggleSuggestedPair(debt)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                              Step {index + 1}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            <span className="font-semibold text-slate-950">
                              {getSplitwiseMemberName(
                                debt.fromEmail,
                                memberDirectory,
                              )}
                            </span>{" "}
                            pays{" "}
                            <span className="font-semibold text-slate-950">
                              {getSplitwiseMemberName(
                                debt.toEmail,
                                memberDirectory,
                              )}
                            </span>
                          </p>
                        </button>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <p className="text-base font-semibold text-slate-950">
                            {formatCurrency(debt.amount, currency)}
                          </p>
                          <Button
                            className="min-w-[112px]"
                            disabled={!view.permissions.canRecordSettlements}
                            type="button"
                            variant={isSelected ? "primary" : "secondary"}
                            onClick={() => {
                              openSettlementModal(debt);
                            }}
                          >
                            Settlement
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <EmptyState
                title="Everyone is already settled up"
                description="There are no remaining simplified debt steps for this group right now."
              />
            )}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Settlement History
              </p>
              <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-950">
                Recorded repayments
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Confirmed repayments appear here in most-recent-first order.
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/[0.04] text-slate-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {sortedSettlements.length ? (
              sortedSettlements.map((settlement) => {
                const recordedByLabel = getSplitwiseMemberDisplayName({
                  email: settlement.createdBy,
                  directory: memberDirectory,
                });

                return (
                  <div
                    key={settlement.id}
                    className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm leading-6 text-slate-700">
                          <span className="font-semibold text-slate-950">
                            {getSplitwiseMemberName(
                              settlement.fromEmail,
                              memberDirectory,
                            )}
                          </span>{" "}
                          paid{" "}
                          <span className="font-semibold text-slate-950">
                            {getSplitwiseMemberName(
                              settlement.toEmail,
                              memberDirectory,
                            )}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(settlement.settledAt)} • recorded by{" "}
                          {recordedByLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-slate-950">
                          {formatCurrency(settlement.amount, currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatRelativeDate(settlement.settledAt)}
                        </p>
                      </div>
                    </div>
                    {settlement.note ? (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        {settlement.note}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-3 rounded-[1.2rem] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                <Clock3 className="h-4 w-4" />
                No settlements have been recorded yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(modalSuggestedDebt)}
        title="Record settlement"
        description="Add an optional note and confirm this repayment."
        onClose={closeSettlementModal}
      >
        {modalSuggestedDebt ? (
          <div className="space-y-5">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Settlement step
                </span>
                <span className="text-sm font-semibold text-slate-950">
                  {formatCurrency(modalSuggestedDebt.amount, currency)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-950">
                  {getSplitwiseMemberName(
                    modalSuggestedDebt.fromEmail,
                    memberDirectory,
                  )}
                </span>{" "}
                pays{" "}
                <span className="font-semibold text-slate-950">
                  {getSplitwiseMemberName(
                    modalSuggestedDebt.toEmail,
                    memberDirectory,
                  )}
                </span>
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Note (optional)
              </span>
              <Textarea
                autoFocus
                rows={4}
                value={settlementNotes[settlementModalKey ?? ""] ?? ""}
                onChange={(event) =>
                  setSettlementNotes((current) => ({
                    ...current,
                    [getSettlementKey(modalSuggestedDebt)]: event.target.value,
                  }))
                }
                placeholder="Paid after dinner"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="secondary"
                onClick={closeSettlementModal}
              >
                Cancel
              </Button>
              <Button
                className="w-full min-w-[180px] sm:w-auto"
                disabled={
                  recordingKey === getSettlementKey(modalSuggestedDebt) ||
                  !view.permissions.canRecordSettlements
                }
                type="button"
                onClick={() => {
                  void recordSuggestedSettlement(modalSuggestedDebt);
                }}
              >
                {recordingKey === getSettlementKey(modalSuggestedDebt)
                  ? "Recording..."
                  : "Record settlement"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
