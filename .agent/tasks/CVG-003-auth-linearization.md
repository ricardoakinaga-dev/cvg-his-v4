# CVG-003 — transaction-level authorization linearization

**Status:** `PASS_BOUNDED`; parent CVG-003 remains `IN_PROGRESS/PARTIAL`
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator, with TDD, security review and independent critique
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` residual / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-AUTH-LINEARIZATION-IR-001`

## Problem

The current asynchronous `requirePrincipal` guard refreshes the access snapshot
and performs a final permission check, but the access-control database read can
still be followed by a protected handler write before a concurrent revocation
commits. The existing CVG-003 access/final-guard artifact explicitly leaves
that transaction-level linearization open.

This task closes only that observed application boundary. It does not claim
that arbitrary direct SQL, privileged maintenance, external providers or a
target deployment obey the application authorization protocol.

## Frozen contract

1. Every mutating API request that reaches a protected route already runs under
   the existing tenant unit-of-work transaction.
2. Before the final fresh access-control read, the API acquires an
   account-scoped PostgreSQL transaction advisory lock using
   `pg_advisory_xact_lock(hashtextextended($1, 0))`.
3. The lock is held until the surrounding tenant transaction commits or rolls
   back. Access-control mutations therefore serialize with protected writes.
4. The shared helper fails closed when no active database transaction exists or
   when the transaction account does not match the requested account.
5. Read-only requests are not retrofitted with a transaction or lock by this
   task. The bounded claim is about protected application writes.
6. No migration, provider, credential, deployment, production, release or
   external-system change is authorized.

The lock key is derived from the account identifier by PostgreSQL. A hash
collision can serialize unrelated accounts but cannot weaken authorization.

## TDD acceptance

### RED

- A shared-database unit test rejects lock acquisition outside an active
  transaction and for an account mismatch, and records the expected advisory
  query for an active matching transaction.
- A disposable PostgreSQL/HTTP race test pauses a real protected inventory
  write after it reaches the database. A concurrent access revocation must not
  commit while that write owns the account transaction lock; the write and the
  revocation then complete in a deterministic order.
- The race test uses a disposable trigger/listener only as a synchronization
  aid and removes it in teardown.

### GREEN

- The helper is exported by `@cvg-his-v2/shared-database` and is bound to the
  active tenant transaction client.
- `requirePrincipal` acquires the lock before `ensureFreshForRequest` for
  mutating requests, while preserving the existing final token refresh and
  permission checks.
- The PostgreSQL/HTTP race test passes with two API instances and leaves no
  unauthorized inventory row or dangling test trigger.
- Existing access-control, HTTP, database, typecheck, security and migration
  controls remain green.

## Explicit non-claims

- No product/Vetus parity area becomes verified by this task.
- No read-only snapshot is claimed to be linearized.
- Direct SQL or administrative writes that bypass the tenant unit-of-work and
  application authorization protocol remain outside the evidence.
- Target cluster behavior, remote CI, RTO/RPO, coverage, WCAG, providers and
  release readiness remain open.

## Revalidation triggers

- Any change to tenant transaction scope, access-control mutation routes,
  authorization cache hydration or protected-write dispatch.
- A regression, security review finding or database compatibility change
  involving advisory locks or PostgreSQL transaction behavior.
- Expansion to read authorization, worker commands, direct SQL, target
  deployment or production operations.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-auth-linearization.json`
- `.agent/artifacts/CVG-003-auth-linearization-2026-08-26.md`
- `.agent/verification.jsonl#VFY-CVG-003-AUTH-LINEARIZATION-UNIT-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUTH-LINEARIZATION-HTTP-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUTH-LINEARIZATION-HTTP-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUTH-LINEARIZATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUTH-LINEARIZATION-FINAL-001`

## Bounded checkpoint

The implementation and disposable PostgreSQL/two-instance HTTP race are
complete and recorded in
`.agent/artifacts/CVG-003-auth-linearization-2026-08-26.md` and
`.agent/gates/verified-CVG-003-auth-linearization.json`. This task is not a
new implementation target; the header is reconciled with the existing final
evidence. The parent CVG-003 remains open for target, provider, operations,
coverage, WCAG and release evidence.
