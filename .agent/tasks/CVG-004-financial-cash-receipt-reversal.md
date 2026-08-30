# CVG-004 — bounded financial cash-receipt reversal

**Status:** `PASS_BOUNDED`  
**Stage/activity:** `VERIFY` / `RECONCILE`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-004 Vetus parity journeys  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-IR-001`

## Problem

The current full cash-receipt command correctly creates an immutable settlement
proof, but there is no authorized way to reverse it. Billing and encounter
reopening therefore stop at `CASH_RECEIPT_REVERSAL_REQUIRED`, and the financial
parity gap remains open even though the cash, receivable and journal artifacts
already exist.

## Frozen bounded contract

1. Add one authenticated `billing.manage` command at
   `POST /encounters/:encounterId/cash-receipts/:receiptId/reverse`.
2. The command accepts only a non-empty bounded reason. Account, actor,
   identifiers, amount, timestamps and compensating artifact identifiers are
   derived server-side. It requires one bounded `Idempotency-Key` and the
   existing tenant unit of work.
3. A reversal is append-only: the original receipt, payment, cash movement and
   journal entry are never updated or deleted. A new reversal row, cash
   withdrawal and balanced inverse journal are created atomically.
4. The transaction locks the receipt and linked financial artifacts, validates
   the original full BRL settlement, requires an open tenant cash register with
   sufficient balance, and changes the current billing/financial/receivable
   projection back to an open/pending state. A reopened encounter remains
   subject to the existing explicit encounter reopen command.
5. Exactly one reversal is allowed per receipt. Active receipt guards become
   reversal-aware, and a later cash receipt is allowed only after the prior
   receipt is reversed. Concurrent reversal attempts yield one committed
   reversal and one stable conflict or idempotent replay.
6. The command appends transaction-scoped audit and outbox records. The API and
   runtime refresh billing/cash caches after commit or rollback recovery.
7. PIX/card provider refunds, chargebacks, bank settlement, fiscal cancellation,
   non-cash reversal, target/production behavior, credentials, deployment and
   release acceptance remain outside this gate.

## TDD acceptance

### RED

- Command tests fail before implementation for transaction absence, malformed
  UUIDs, empty/oversized reason and repository delegation.
- Route tests fail before implementation for strict payload validation,
  permission, idempotency, account derivation and stable response behavior.
- Disposable PostgreSQL tests fail before implementation for atomic inverse
  artifacts, immutable history, re-opened financial projection, tenant RLS,
  concurrent reversal and subsequent receipt behavior.

### GREEN

- The migration creates an append-only tenant-scoped reversal ledger, preserves
  receipt consistency constraints for both active and reversed states, and
  replaces the old unconditional one-receipt guard with a deferred active
  receipt guard.
- The repository/command/API path validates the boundary, locks the source,
  writes the compensating cash/journal artifacts, updates the projection and
  emits audit/outbox evidence in one tenant transaction.
- Existing cash receipt creation, billing guards, cash-register behavior and
  full API regressions remain green; OpenAPI/schema/static security checks pass.

## Explicit non-claims

This is a repository-local bounded cash reversal proof. It does not establish
complete Vetus financial parity, PIX/card provider refund contracts, chargeback
handling, bank reconciliation, fiscal cancellation, target RLS/grants,
backup/restore, operations, accessibility, remote CI, production readiness or
release acceptance.

## Revalidation triggers

- Any PIX/card/bank provider refund or chargeback behavior.
- Any non-cash receipt, cash-register policy, journal account-plan or fiscal
  integration change.
- Any target, credential, production, deployment, external mutation or release
  action.

## Bounded result — 2026-08-27

The authorized local slice is complete as `PASS_BOUNDED`. The additive
0150 migration, database schema, repository, command, authenticated route and
financial recovery path now implement one append-only reversal for a full BRL
cash receipt. The source receipt/payment/movement/original journal remain
immutable; the compensating withdrawal and inverse journal are balanced and
transactional; billing, financial and receivable projections reopen; audit and
outbox records are appended; and a later cash receipt is permitted only after
the original is reversed.

The initial TDD RED is retained in the verification ledger. Post-fix evidence
passed the command/route/database unit set `30/30`, the fresh PostgreSQL
HTTP/RLS/command set `44/44`, and the live disposable runtime-role ACL check
`1/1`. The compiled API passed `408/408`; API and DB lint/build, global
typecheck, OpenAPI, migration source-of-truth, Helm static validation,
Prettier, secrets and `git diff --check` passed. Official coverage passed at
`80.72%` statements, `80.22%` branches and `88.06%` functions.

The independent post-fix review returned `PASS_BOUNDED` with Critical `0`,
High `0`, Medium `0` and Low `0`. The review confirmed runtime EXECUTE grants,
authorization rechecking inside the tenant transaction before idempotency or
replay, journal-line INSERT/UPDATE/DELETE protection, fixed SECURITY DEFINER
search paths, reversal-register revalidation and the strict OpenAPI reason
contract.

This result remains local and bounded. It does not certify target TCP/RLS,
production runtime roles, provider refunds/chargebacks, non-cash settlement,
bank reconciliation, fiscal cancellation, browser acceptance, remote CI,
operations, backup/restore, accessibility, complete Vetus parity or release.
No commit, push, deploy, credential/provider action or external mutation was
performed.

## Control-plane references

- `.agent/authority.jsonl#AUTH-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-IR-001`
- `.agent/gates/implementation-ready-CVG-004-financial-cash-receipt-reversal.json`
- `.agent/gates/verified-CVG-004-financial-cash-receipt-reversal.json`
- `.agent/artifacts/CVG-004-financial-cash-receipt-reversal-2026-08-27.md`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-FINAL-001`
