import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSplitwiseMemberDirectory,
  getSplitwiseActivitySummary,
  getSplitwiseMemberDisplayName,
  validateExpenseDraft,
} from "../components/splitwise/splitwise-helpers";
import {
  assertMemberCanBeRemoved,
  computeGroupBalances,
  resolveExpenseSplits,
  simplifyDebts,
} from "../lib/splitwise/core";

const validMembers = new Set([
  "alex@example.com",
  "bea@example.com",
  "chris@example.com",
  "dina@example.com",
  "eli@example.com",
]);

test("equal split resolves cents without floating point drift", () => {
  const result = resolveExpenseSplits({
    totalAmount: 10_001,
    splitType: "EQUAL",
    splits: [
      { email: "alex@example.com" },
      { email: "bea@example.com" },
      { email: "chris@example.com" },
    ],
    validMemberEmails: validMembers,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(
    result.data.map((split) => split.amountCents),
    [3334, 3334, 3333],
  );
  assert.equal(
    result.data.reduce((sum, split) => sum + split.amountCents, 0),
    10_001,
  );
});

test("exact split validates and preserves exact cents", () => {
  const result = resolveExpenseSplits({
    totalAmount: 12_500,
    splitType: "EXACT",
    splits: [
      { email: "alex@example.com", amountCents: 2_500 },
      { email: "bea@example.com", amountCents: 5_000 },
      { email: "chris@example.com", amountCents: 5_000 },
    ],
    validMemberEmails: validMembers,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(
    result.data.map((split) => split.amountCents),
    [2500, 5000, 5000],
  );
});

test("percentage split converts basis points and rounds back to the total", () => {
  const result = resolveExpenseSplits({
    totalAmount: 9_999,
    splitType: "PERCENTAGE",
    splits: [
      { email: "alex@example.com", percentageBasisPoints: 2_500 },
      { email: "bea@example.com", percentageBasisPoints: 2_500 },
      { email: "chris@example.com", percentageBasisPoints: 5_000 },
    ],
    validMemberEmails: validMembers,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(
    result.data.map((split) => split.amountCents),
    [2500, 2500, 4999],
  );
  assert.equal(
    result.data.reduce((sum, split) => sum + split.amountCents, 0),
    9_999,
  );
});

test("editing an expense recomputes balances from the before and after states", () => {
  const beforeBalances = computeGroupBalances({
    memberEmails: [
      "alex@example.com",
      "bea@example.com",
      "chris@example.com",
    ],
    expenses: [
      {
        paidBy: "alex@example.com",
        totalAmount: 9_000,
        splits: [
          { email: "alex@example.com", amountCents: 3_000 },
          { email: "bea@example.com", amountCents: 3_000 },
          { email: "chris@example.com", amountCents: 3_000 },
        ],
      },
    ],
    settlements: [],
  });

  const afterBalances = computeGroupBalances({
    memberEmails: [
      "alex@example.com",
      "bea@example.com",
      "chris@example.com",
    ],
    expenses: [
      {
        paidBy: "bea@example.com",
        totalAmount: 9_000,
        splits: [
          { email: "alex@example.com", amountCents: 2_000 },
          { email: "bea@example.com", amountCents: 2_000 },
          { email: "chris@example.com", amountCents: 5_000 },
        ],
      },
    ],
    settlements: [],
  });

  assert.deepEqual(beforeBalances, [
    { email: "alex@example.com", balance: 6000 },
    { email: "bea@example.com", balance: -3000 },
    { email: "chris@example.com", balance: -3000 },
  ]);

  assert.deepEqual(afterBalances, [
    { email: "alex@example.com", balance: -2000 },
    { email: "bea@example.com", balance: 7000 },
    { email: "chris@example.com", balance: -5000 },
  ]);
});

test("soft-deleting an expense removes it from the balance calculation", () => {
  const balances = computeGroupBalances({
    memberEmails: ["alex@example.com", "bea@example.com"],
    expenses: [
      {
        paidBy: "alex@example.com",
        totalAmount: 4_000,
        splits: [
          { email: "alex@example.com", amountCents: 2_000 },
          { email: "bea@example.com", amountCents: 2_000 },
        ],
      },
      {
        paidBy: "bea@example.com",
        totalAmount: 3_000,
        isDeleted: true,
        splits: [
          { email: "alex@example.com", amountCents: 1_500 },
          { email: "bea@example.com", amountCents: 1_500 },
        ],
      },
    ],
    settlements: [],
  });

  assert.deepEqual(balances, [
    { email: "alex@example.com", balance: 2000 },
    { email: "bea@example.com", balance: -2000 },
  ]);
});

test("debt simplification reduces a 5-member balance sheet to the minimum useful transfers", () => {
  const debts = simplifyDebts([
    { email: "alex@example.com", balance: 500 },
    { email: "bea@example.com", balance: 300 },
    { email: "chris@example.com", balance: -500 },
    { email: "dina@example.com", balance: -200 },
    { email: "eli@example.com", balance: -100 },
  ]);

  assert.deepEqual(debts, [
    {
      fromEmail: "chris@example.com",
      toEmail: "alex@example.com",
      amount: 500,
    },
    {
      fromEmail: "dina@example.com",
      toEmail: "bea@example.com",
      amount: 200,
    },
    {
      fromEmail: "eli@example.com",
      toEmail: "bea@example.com",
      amount: 100,
    },
  ]);
});

test("a member with a non-zero balance cannot be removed", () => {
  const balances = computeGroupBalances({
    memberEmails: ["alex@example.com", "bea@example.com"],
    expenses: [
      {
        paidBy: "alex@example.com",
        totalAmount: 5_000,
        splits: [
          { email: "alex@example.com", amountCents: 2_500 },
          { email: "bea@example.com", amountCents: 2_500 },
        ],
      },
    ],
    settlements: [],
  });

  const result = assertMemberCanBeRemoved(balances, "bea@example.com");

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.code, "MEMBER_HAS_BALANCE");
});

test("expense draft validation blocks invalid percentage totals before submit", () => {
  const result = validateExpenseDraft({
    draft: {
      expenseId: null,
      description: "Boat charter",
      totalAmount: "100.00",
      paidBy: "alex@example.com",
      splitType: "PERCENTAGE",
      participants: [
        {
          email: "alex@example.com",
          enabled: true,
          amount: "",
          percentage: "30",
          shares: "1",
        },
        {
          email: "bea@example.com",
          enabled: true,
          amount: "",
          percentage: "30",
          shares: "1",
        },
      ],
    },
    members: [
      { email: "alex@example.com", name: "Alex", isGuest: false, role: "ADMIN" },
      { email: "bea@example.com", name: "Bea", isGuest: false, role: "MEMBER" },
    ],
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.message, "Percentage splits must add up to exactly 100%.");
});

test("expense draft validation normalizes a valid payload before submit", () => {
  const result = validateExpenseDraft({
    draft: {
      expenseId: null,
      description: "  Dinner  ",
      totalAmount: "120.00",
      paidBy: "Alex@Example.com",
      splitType: "EXACT",
      participants: [
        {
          email: "alex@example.com",
          enabled: true,
          amount: "60.00",
          percentage: "",
          shares: "1",
        },
        {
          email: "bea@example.com",
          enabled: true,
          amount: "60.00",
          percentage: "",
          shares: "1",
        },
      ],
    },
    members: [
      { email: "alex@example.com", name: "Alex", isGuest: false, role: "ADMIN" },
      { email: "bea@example.com", name: "Bea", isGuest: false, role: "MEMBER" },
    ],
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.payload, {
    description: "Dinner",
    totalAmount: 12_000,
    paidBy: "alex@example.com",
    splitType: "EXACT",
    splits: [
      { email: "alex@example.com", amountCents: 6_000, percentageBasisPoints: undefined, shares: undefined },
      { email: "bea@example.com", amountCents: 6_000, percentageBasisPoints: undefined, shares: undefined },
    ],
  });
});

test("member display names prefer saved names and fall back safely", () => {
  const directory = buildSplitwiseMemberDirectory([
    { email: "alex@example.com", name: "Alex", isGuest: false, role: "ADMIN" },
  ]);

  assert.equal(
    getSplitwiseMemberDisplayName({
      email: "alex@example.com",
      directory,
    }),
    "Alex",
  );
  assert.equal(
    getSplitwiseMemberDisplayName({
      email: "missing@example.com",
      fallbackName: "Guest Sam",
      directory,
    }),
    "Guest Sam",
  );
  assert.equal(
    getSplitwiseMemberDisplayName({
      email: null,
      directory,
    }),
    "Unknown member",
  );
});

test("activity summaries use names from structured state instead of raw emails", () => {
  const directory = buildSplitwiseMemberDirectory([
    { email: "alex@example.com", name: "Alex", isGuest: false, role: "ADMIN" },
    { email: "bea@example.com", name: "Bea", isGuest: false, role: "MEMBER" },
  ]);

  assert.equal(
    getSplitwiseActivitySummary(
      {
        id: "1",
        actorEmail: "alex@example.com",
        actorName: "Alex",
        actionType: "SETTLEMENT_RECORDED",
        entityType: "SETTLEMENT",
        entityId: "settlement-1",
        message: "alex@example.com recorded a settlement from alex@example.com to bea@example.com.",
        afterState: {
          fromEmail: "alex@example.com",
          toEmail: "bea@example.com",
        },
        beforeState: null,
        details: null,
        diff: null,
        loggedAt: "2026-07-12T10:00:00.000Z",
      },
      directory,
    ),
    "Alex recorded a settlement from Alex to Bea.",
  );

  assert.equal(
    getSplitwiseActivitySummary(
      {
        id: "2",
        actorEmail: "alex@example.com",
        actorName: "Alex",
        actionType: "MEMBER_UPDATED",
        entityType: "MEMBER",
        entityId: "bea@example.com",
        message: "alex@example.com updated bea@example.com in Weekend trip.",
        beforeState: {
          email: "bea@example.com",
          name: "Beatrice",
        },
        afterState: {
          email: "bea@example.com",
          name: "Bea",
        },
        details: null,
        diff: null,
        loggedAt: "2026-07-12T10:05:00.000Z",
      },
      directory,
    ),
    "Alex renamed Beatrice to Bea.",
  );
});
