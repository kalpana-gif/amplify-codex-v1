# Amplify App Starter

This repository has been reset from the previous Todo proof of concept to a
clean baseline.

## Current state

- `src/app/page.tsx` is a neutral starter page.
- The demo Todo model and hello REST function have been removed.
- Local build and generated artifacts are ignored so the repo stays cleaner.

## Run locally

```bash
npm run dev
```

## Rebuild the backend when ready

1. Define the Amplify resources you actually need under `amplify/`.
2. Run:
   ```bash
   npm run amplify:sandbox
   ```
3. Wire the generated outputs back into the frontend only after those resources
   exist.

## Split-Wise Data Model

The Split-Wise feature is implemented inside the existing Amplify Gen 2 data
schema rather than a separate SQL stack.

- `Group`: shared workspace metadata, currency, and current membership access.
- `GroupMember`: one record per current member, including the creator-admin.
- `GroupExpense`: shared expenses with cents-based totals, normalized split
  payloads, and soft-delete flags.
- `Settlement`: manual settle-up payments recorded between members.
- `ActivityLog`: immutable audit entries for every mutation, including before /
  after state and edit diffs.

All money is stored as integer cents. UI formatting converts cents back into
decimal currency strings only for display.

## Debt Simplification

Balances are computed from all non-deleted expenses minus recorded settlements.
The simplified debt view then:

1. Separates members who are owed money from members who owe money.
2. Repeatedly matches the largest creditor with the largest debtor.
3. Creates a transfer for the smaller of those two positions.
4. Reduces both balances and repeats until every balance reaches zero.

This greedy pass removes circular debt and produces the standard Splitwise-style
"who should pay whom" summary with a small number of transactions.
