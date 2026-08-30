# CVG-002B2B — privileged service-principal writer linearization

**Status:** `PASS_BOUNDED`; parent CVG-002B2B remains `IN_PROGRESS`.
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`.
**Owner:** root integrator with TDD, security and independent review.
**Parent:** CVG-002B2B signed synthetic PIX settlement.
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-002B2B-PRIVILEGED-SERVICE-PRINCIPAL-WRITER-LINEARIZATION-IR-001`.

## Objective

Close the authorization race left open by the signed PIX settlement slice:
the settlement worker already serializes its principal read with the account
authorization advisory lock, but a privileged direct writer can currently
revoke or remap that principal without taking the same lock.

## Frozen contract

1. Every INSERT, UPDATE or DELETE on
   `account_service_principals` acquires the transaction-scoped advisory lock
   `hashtextextended(account_id, 0)` for the affected account before the
   mutation is visible.
2. Every UPDATE of `users.account_id`, `users.principal_kind`,
   `users.interactive_login_enabled` or `users.is_active` acquires that same
   account lock before the identity mutation is visible. Existing constraints,
   tenant RLS/FORCE RLS and administrative semantics remain unchanged.
3. The existing worker
   `acquireTenantAuthorizationLock(accountId)` call and lock order remain
   unchanged. If settlement owns the lock first, a concurrent privileged writer
   waits; if the writer commits first, the settlement re-reads the mapping and
   fails closed without invoking B1.
   Every direct writer first tries an account-prefixed writer gate for each
   affected account, in deterministic order, and fails with retryable `40001`
   if a gate is busy; it then acquires the worker's account lock in the same
   order. Gates are account-scoped, so independent accounts remain concurrent,
   while the try-before-wait boundary prevents multi-row writer deadlocks.
4. The lock boundary is database-enforced so direct privileged SQL cannot bypass
   application code. The migration must be idempotent, narrowly scoped and
   compatible with the current `0154` schema.
5. Tests must observe real PostgreSQL blocking, release/commit ordering, tenant
   isolation, rollback behavior and no B1 invocation after revocation. No test
   may use an external provider or production credential.
6. No PIX settlement semantic change, principal provisioning/backfill,
   provider, credential, target, deployment, external mutation or release
   acceptance is authorized.

## TDD acceptance

### RED

- A two-client PostgreSQL regression must fail before the migration because a
  direct mapping/identity writer commits while a settlement-style transaction
  holds the account authorization lock.
- The inverse ordering must demonstrate that the current direct writer can
  commit without participating in the worker lock, establishing the exact
  missing database boundary.

### GREEN

- An additive migration installs account-scoped writer-lock triggers for the
  mapping table and relevant user identity fields.
- Disposable PostgreSQL tests prove writer blocking while the settlement lock
  is held, writer-first commit ordering, tenant/account key separation,
  rollback without residue, dynamic coverage of all watched user fields,
  independent direct writers on distinct accounts, migration replay and a
  deadlock-safe cross-account `40001` path.
- Existing PIX worker and API regressions remain green; the worker resolver and
  settlement UoW stay unchanged.
- Independent review covers deadlock ordering, trigger security, SQL
  parameterization, transaction scope, least privilege and non-promotion.

## Evidence plan

- Focused unit/static migration contract tests for trigger function names,
  watched columns, lock expression, idempotent guards and no unauthorized
  settlement changes.
- Disposable PostgreSQL contention tests with separate clients and explicit
  lock-state observation.
- Existing `pix-provider-settlement-consumer`,
  `pix-service-principals`, worker identity and runtime-ACL regressions.
- Typecheck/build, lint, secret scan, RLS validation, diff hygiene and fresh
  global non-promotion audits.
- Fresh independent read-only review and a bounded verified gate.

## Current evidence

- RED: the pre-0155 two-client PostgreSQL test failed in the two intended
  mapping/identity writer cases, proving the missing database boundary.
- GREEN: after replacing the rejected global mutex with account-prefixed writer
  gates, the final disposable PostgreSQL suite passed `12/12`, covering mapping
  `INSERT`, `UPDATE` and `DELETE`, all four watched user identity fields,
  worker-lock blocking, direct-writer account isolation, writer-first
  rollback/no residue, cross-account `40001` contention and migration
  replay/catalog.
- Security hardening: after an independent P1 finding, the migration now fixes
  `search_path = pg_catalog, pg_temp` and qualifies every advisory helper with
  `pg_catalog`; the hostile temporary-schema regression passed.
- Final focused evidence: the hardened PostgreSQL suite passed `13/13`, the
  migration contract passed `2/2`, and the final PIX consumer suite passed
  `8/8` with direct writer commit, worker re-read, fail-closed principal
  rejection and zero B1 calls.
- Quality: the migration contract test passed `2/2`, the worker baseline passed
  `116/116`, eslint passed, the migration-source and RLS validators passed,
  and secretlint reported no findings.
- Review: two fresh independent read-only reviewers returned
  `APPROVE_BOUNDED` with no P0/P1/P2 after the security correction. The task is
  closed only under
  `.agent/gates/verified-CVG-002B2B-privileged-service-principal-writer-linearization.json`;
  global ERP remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Explicit exclusions and non-claims

This authority excludes refunds, compensation reversal, principal
provisioning/backfill, changes to PIX B1/B2a/B2b semantics, provider calls,
external credentials, target or production access, deployment, backup/restore,
accessibility, LGPD acceptance, complete Vetus parity and release approval.
A local advisory-lock proof is not proof of target-cluster identity governance
or global ERP readiness.

## Revalidation triggers

- Any change to the account authorization lock key or lock order.
- Any new writer for service-principal mappings or user identity fields.
- Any change to PIX settlement, principal provisioning, RLS/runtime grants,
  target/provider/production or release scope.
