# CVG-004 — bounded advance-payment issuance and compensation

**Status:** `PASS_BOUNDED`
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-ADVANCE-PAYMENT-WRITE-IR-001`

## Problem

The canonical 0148 ledger and audited report exposed persisted advance-payment
facts, but the operational finance page had a disabled creation action and no
application command for issuance or compensation. Reusing owner credit
metadata would bypass the durable ledger and make financial state
non-auditable.

## Frozen bounded contract

1. Add only two authenticated `billing.manage` commands: manual advance
   issuance at `POST /finance/advance-payments` and append-only compensation at
   `POST /finance/advance-payments/:id/allocations`.
2. Accept integer positive `amountCents` in BRL. The server derives account,
   actor, identifiers and timestamps; the client cannot spoof ownership or
   audit identity. Manual issuance requires a bounded non-empty `sourceId`.
3. Both commands require one bounded `Idempotency-Key`, execute through the
   existing tenant unit of work, and persist transaction-scoped audit and
   outbox records before commit. Concurrent compensation is serialized by the
   existing database over-allocation trigger/parent row lock.
4. Use only the existing immutable `advance_payments` and append-only
   `advance_payment_allocations` relations. No update/delete, mutable balance,
   cash movement, journal entry or receivable settlement is introduced.
5. Expose the persisted rows in the Finance > Pagamento Antecipado page. The
   UI must remove the synthetic `OwnerSummary.financialProfile.creditBalance`
   source and keep loading, empty, error and retry states explicit.
6. Cancellation, refund, reversal, bank/cash/PIX linking, accounting journal,
   provider, import/backfill, target, production, deployment and release
   acceptance remain outside this gate.

## TDD acceptance

### RED

- Repository/route tests reject missing transaction context, invalid money,
  malformed UUIDs, unknown fields and missing idempotency before any write.
- Integration tests fail before the command path exists for durable issuance,
  compensation, concurrent over-allocation, audit/outbox atomicity and
  account isolation.
- SPA tests fail before the page consumes the canonical endpoint and exposes
  the bounded issuance form.

### GREEN

- Database repository inserts and returns exact persisted facts, appends
  transaction audit/outbox events and never mutates ledger rows.
- API commands are account-scoped, idempotent, fail closed without the
  database-backed source and return stable validation/conflict errors.
- The Finance page loads canonical rows, creates a manual advance and
  compensates a selected row with explicit pending/success/error feedback.
- Focused API, repository/PostgreSQL, SPA, typecheck, lint, security, OpenAPI,
  RLS and migration/deploy-source checks pass.

## Bounded checkpoint — 2026-08-26

The authorized manual issuance and append-only compensation slice is
`PASS_BOUNDED` in `VERIFY / CHECKPOINT`. The API route suite passed 5/5 and the
full API suite passed 394/394. The focused API/service/page contracts passed
7/7, the full SPA suite passed 1,036/1,036, and a fresh disposable PostgreSQL
run passed 7/7, including exact persisted balances, unsafe bigint fail-closed
reading, transaction-scoped audit/outbox, idempotent replay, over-allocation
rejection, append-only protection and cross-account isolation.

Workspace typecheck, lint and build passed. Official coverage passed 1,954
tests with one skip at 82.09% statements, 80.07% branches, 88.53% functions
and 82.09% lines. OpenAPI, RLS, migration-source, deploy-surface, static Helm,
secrets, dependency security and the parity contract passed. The malformed
encoded UUID path and unsafe persisted bigint findings were reproduced through
TDD RED checks, corrected, and rechecked. No independent subagent was
available for this slice because the explorer hit its model usage limit; no
reviewer approval is inferred.

This checkpoint closes only manual issuance and append-only compensation
through the existing 0148 ledger. The parent CVG-004/global program remains
`IN_PROGRESS/PARTIAL`; the readiness command remains intentionally non-zero at
95/100 because strict Vetus parity is 4/11 verified and external/target/
operational/release evidence is still missing.

## Explicit non-claims

This is a repository-local bounded write slice. It does not prove the full
Vetus Paymento Antecipado lifecycle, cash/journal integration, receivables,
refund/cancellation semantics, target grants, external providers, complete
parity, WCAG, remote CI, operations, production readiness or release. It also
does not authorize or implement cancellation, refund, reversal, bank/cash/PIX
linking, accounting journal, receivable settlement, provider, import/backfill,
target, production, deployment or release actions.

## Revalidation triggers

- Any addition of refund/cancellation/reversal or a cash, bank, PIX,
  receivable or journal link.
- Changes to migration 0148, transaction/UoW/idempotency behavior, audit/outbox
  contracts or the finance role permission boundary.
- Any target, provider, credential, production, deployment or release action.
