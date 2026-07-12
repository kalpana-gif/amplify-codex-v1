export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export type SplitwiseDomainError = {
  code: string;
  message: string;
};

export type SplitwiseResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: SplitwiseDomainError;
    };

export type SplitInput = {
  email: string;
  amountCents?: number | null;
  percentageBasisPoints?: number | null;
  shares?: number | null;
};

export type ResolvedSplit = {
  email: string;
  amountCents: number;
  percentageBasisPoints?: number | null;
  shares?: number | null;
};

export type BalanceExpense = {
  paidBy: string;
  totalAmount: number;
  isDeleted?: boolean | null;
  splits: ResolvedSplit[];
};

export type BalanceSettlement = {
  fromEmail: string;
  toEmail: string;
  amount: number;
};

export type MemberBalance = {
  email: string;
  balance: number;
};

export type SimplifiedDebt = {
  fromEmail: string;
  toEmail: string;
  amount: number;
};

const ok = <T>(data: T): SplitwiseResult<T> => ({
  success: true,
  data,
});

const err = <T = never>(
  code: string,
  message: string,
): SplitwiseResult<T> => ({
  success: false,
  error: {
    code,
    message,
  },
});

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizeEmailList = (values: readonly string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeEmail(value))
        .filter(Boolean),
    ),
  );

const hasDuplicates = (values: readonly string[]) =>
  new Set(values).size !== values.length;

const isInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value);

const assertPositiveCents = (value: number) =>
  isInteger(value) && value > 0;

type WeightedParticipant = {
  email: string;
  weight: number;
  percentageBasisPoints?: number | null;
  shares?: number | null;
};

const allocateByWeight = (
  totalAmount: number,
  weightedParticipants: WeightedParticipant[],
) => {
  const totalWeight = weightedParticipants.reduce(
    (sum, participant) => sum + participant.weight,
    0,
  );

  const provisional = weightedParticipants.map((participant, index) => {
    const numerator = totalAmount * participant.weight;
    const floorAmount = Math.floor(numerator / totalWeight);

    return {
      email: participant.email,
      amountCents: floorAmount,
      remainder: numerator % totalWeight,
      index,
      percentageBasisPoints: participant.percentageBasisPoints ?? null,
      shares: participant.shares ?? null,
    };
  });

  const allocated = provisional.reduce(
    (sum, participant) => sum + participant.amountCents,
    0,
  );

  let remainingCents = totalAmount - allocated;

  provisional
    .slice()
    .sort((left, right) => {
      if (right.remainder !== left.remainder) {
        return right.remainder - left.remainder;
      }

      return left.index - right.index;
    })
    .forEach((participant) => {
      if (remainingCents <= 0) {
        return;
      }

      provisional[participant.index].amountCents += 1;
      remainingCents -= 1;
    });

  return provisional.map((participant) => ({
    email: participant.email,
    amountCents: participant.amountCents,
    percentageBasisPoints: participant.percentageBasisPoints,
    shares: participant.shares,
  })) satisfies ResolvedSplit[];
};

type ResolveExpenseSplitsArgs = {
  totalAmount: number;
  splitType: SplitType;
  splits: SplitInput[];
  validMemberEmails: ReadonlySet<string>;
};

export const resolveExpenseSplits = ({
  totalAmount,
  splitType,
  splits,
  validMemberEmails,
}: ResolveExpenseSplitsArgs): SplitwiseResult<ResolvedSplit[]> => {
  if (!assertPositiveCents(totalAmount)) {
    return err(
      "INVALID_AMOUNT",
      "Enter a total amount greater than zero.",
    );
  }

  if (!splits.length) {
    return err(
      "EMPTY_SPLITS",
      "Select at least one participant for this expense.",
    );
  }

  const normalized = splits.map((split) => ({
    ...split,
    email: normalizeEmail(split.email),
  }));

  const emails = normalized.map((split) => split.email);

  if (emails.some((email) => !validMemberEmails.has(email))) {
    return err(
      "INVALID_PARTICIPANT",
      "Only current group members can be added to an expense.",
    );
  }

  if (hasDuplicates(emails)) {
    return err(
      "DUPLICATE_PARTICIPANT",
      "Each participant can only appear once in an expense split.",
    );
  }

  if (splitType === "EQUAL") {
    return ok(
      allocateByWeight(
        totalAmount,
        normalized.map((split) => ({
          email: split.email,
          weight: 1,
        })),
      ),
    );
  }

  if (splitType === "EXACT") {
    if (
      normalized.some(
        (split) => !isInteger(split.amountCents) || (split.amountCents ?? 0) < 0,
      )
    ) {
      return err(
        "INVALID_EXACT_SPLIT",
        "Exact split amounts must be zero or positive whole cents.",
      );
    }

    const total = normalized.reduce(
      (sum, split) => sum + (split.amountCents ?? 0),
      0,
    );

    if (total !== totalAmount) {
      return err(
        "SPLIT_TOTAL_MISMATCH",
        "Exact split amounts must add up to the total expense amount.",
      );
    }

    return ok(
      normalized.map((split) => ({
        email: split.email,
        amountCents: split.amountCents ?? 0,
        percentageBasisPoints: null,
        shares: null,
      })),
    );
  }

  if (splitType === "PERCENTAGE") {
    if (
      normalized.some(
        (split) =>
          !isInteger(split.percentageBasisPoints) ||
          (split.percentageBasisPoints ?? 0) < 0,
      )
    ) {
      return err(
        "INVALID_PERCENTAGE_SPLIT",
        "Percentage splits must use whole-number basis points.",
      );
    }

    const totalBasisPoints = normalized.reduce(
      (sum, split) => sum + (split.percentageBasisPoints ?? 0),
      0,
    );

    if (totalBasisPoints !== 10_000) {
      return err(
        "INVALID_PERCENTAGE_TOTAL",
        "Percentage splits must add up to exactly 100%.",
      );
    }

    return ok(
      allocateByWeight(
        totalAmount,
        normalized.map((split) => ({
          email: split.email,
          weight: split.percentageBasisPoints ?? 0,
          percentageBasisPoints: split.percentageBasisPoints ?? 0,
        })),
      ),
    );
  }

  if (
    normalized.some(
      (split) => !isInteger(split.shares) || (split.shares ?? 0) <= 0,
    )
  ) {
    return err(
      "INVALID_SHARES_SPLIT",
      "Share splits must use positive whole-number shares.",
    );
  }

  return ok(
    allocateByWeight(
      totalAmount,
      normalized.map((split) => ({
        email: split.email,
        weight: split.shares ?? 0,
        shares: split.shares ?? 0,
      })),
    ),
  );
};

type ComputeBalancesArgs = {
  memberEmails: readonly string[];
  expenses: readonly BalanceExpense[];
  settlements: readonly BalanceSettlement[];
};

export const computeGroupBalances = ({
  memberEmails,
  expenses,
  settlements,
}: ComputeBalancesArgs): MemberBalance[] => {
  const balances = new Map<string, number>();

  for (const email of normalizeEmailList(memberEmails)) {
    balances.set(email, 0);
  }

  for (const expense of expenses) {
    if (expense.isDeleted) {
      continue;
    }

    const payer = normalizeEmail(expense.paidBy);
    balances.set(payer, (balances.get(payer) ?? 0) + expense.totalAmount);

    for (const split of expense.splits) {
      const participant = normalizeEmail(split.email);
      balances.set(
        participant,
        (balances.get(participant) ?? 0) - split.amountCents,
      );
    }
  }

  for (const settlement of settlements) {
    const fromEmail = normalizeEmail(settlement.fromEmail);
    const toEmail = normalizeEmail(settlement.toEmail);
    balances.set(fromEmail, (balances.get(fromEmail) ?? 0) + settlement.amount);
    balances.set(toEmail, (balances.get(toEmail) ?? 0) - settlement.amount);
  }

  return Array.from(balances.entries())
    .map(([email, balance]) => ({
      email,
      balance,
    }))
    .sort((left, right) => left.email.localeCompare(right.email));
};

export const getMemberBalance = (
  balances: readonly MemberBalance[],
  email: string,
) => {
  const normalizedEmail = normalizeEmail(email);
  return balances.find((balance) => balance.email === normalizedEmail)?.balance ?? 0;
};

export const assertMemberCanBeRemoved = (
  balances: readonly MemberBalance[],
  email: string,
): SplitwiseResult<null> => {
  const balance = getMemberBalance(balances, email);

  if (balance !== 0) {
    return err(
      "MEMBER_HAS_BALANCE",
      "This member cannot be removed because they still have a non-zero balance in the group.",
    );
  }

  return ok(null);
};

export const validateSettlement = ({
  balances,
  fromEmail,
  toEmail,
  amount,
}: {
  balances: readonly MemberBalance[];
  fromEmail: string;
  toEmail: string;
  amount: number;
}): SplitwiseResult<null> => {
  if (!assertPositiveCents(amount)) {
    return err(
      "INVALID_SETTLEMENT_AMOUNT",
      "Settlement amounts must be greater than zero.",
    );
  }

  const normalizedFrom = normalizeEmail(fromEmail);
  const normalizedTo = normalizeEmail(toEmail);

  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    return err(
      "INVALID_SETTLEMENT_PARTIES",
      "Select two different group members for the settlement.",
    );
  }

  const debtorBalance = getMemberBalance(balances, normalizedFrom);
  const creditorBalance = getMemberBalance(balances, normalizedTo);

  if (debtorBalance >= 0 || creditorBalance <= 0) {
    return err(
      "INVALID_SETTLEMENT_DIRECTION",
      "Settlement direction must go from a member who owes money to a member who is owed money.",
    );
  }

  const maxAllowed = Math.min(Math.abs(debtorBalance), creditorBalance);

  if (amount > maxAllowed) {
    return err(
      "SETTLEMENT_EXCEEDS_BALANCE",
      "Settlement amount exceeds the outstanding balance between these members.",
    );
  }

  return ok(null);
};

/*
Greedy debt simplification:
1. Split balances into creditors (positive) and debtors (negative).
2. Repeatedly match the largest remaining creditor with the largest remaining debtor.
3. Transfer the smaller of the two amounts and reduce both positions.
4. Continue until every balance reaches zero.

This does not prove a globally optimal solution for every possible weighted graph,
but for balance settlement it produces the standard minimal-ish "fewest useful
transactions" view used in Splitwise-style apps and removes all circular debt.
*/
export const simplifyDebts = (
  balances: readonly MemberBalance[],
): SimplifiedDebt[] => {
  const creditors = balances
    .filter((balance) => balance.balance > 0)
    .map((balance) => ({
      email: balance.email,
      amount: balance.balance,
    }))
    .sort((left, right) => right.amount - left.amount);

  const debtors = balances
    .filter((balance) => balance.balance < 0)
    .map((balance) => ({
      email: balance.email,
      amount: Math.abs(balance.balance),
    }))
    .sort((left, right) => right.amount - left.amount);

  const transactions: SimplifiedDebt[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.amount, debtor.amount);

    transactions.push({
      fromEmail: debtor.email,
      toEmail: creditor.email,
      amount,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) {
      creditorIndex += 1;
    }

    if (debtor.amount === 0) {
      debtorIndex += 1;
    }
  }

  return transactions;
};

export const buildChangedFieldsDiff = <
  T extends Record<string, unknown>,
>(
  beforeState: T,
  afterState: T,
) => {
  const diff: Record<
    string,
    {
      before: unknown;
      after: unknown;
    }
  > = {};

  for (const key of new Set([
    ...Object.keys(beforeState),
    ...Object.keys(afterState),
  ])) {
    const beforeValue = beforeState[key];
    const afterValue = afterState[key];

    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    diff[key] = {
      before: beforeValue,
      after: afterValue,
    };
  }

  return diff;
};
