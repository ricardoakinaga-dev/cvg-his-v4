# CVG-003 — discharge collection, detail, update and repository tenant isolation

**Status:** `PASS_BOUNDED` — bounded verification checkpoint; parent/global gates remain open
**Stage/activity:** `VERIFY` / `CONTROL_PLANE_RECONCILIATION`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical cross-tenant read and update
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-DISCHARGE-TENANT-ISOLATION-IR-001`

## Problem reproduced

`DischargesService` stores hydrated records in a process-wide map. Its public
`getById` and `update` methods do not require an account, while
`getByEncounterId` treats account context as optional. The authenticated route
currently performs a later `getByIdForAccount` check, so the application
service boundary is weaker than the controller boundary. The database and
in-memory repositories also expose `findById`, `findByEncounterId` and
`delete` without an account predicate.

## Frozen bounded contract

1. Hydration, refresh, collection, detail, encounter lookup, update and cache
   removal require a non-empty `AccountId` and fail closed on missing context.
2. `DischargesService` detail/update/encounter operations cannot read or mutate
   a discharge from another account; returned summaries are defensive copies.
3. `DischargeRepository` detail, encounter and delete methods require account
   context. PostgreSQL queries use parameterized `account_id` and the active
   tenant scope; in-memory fixtures apply the same predicate.
4. Authenticated GET/PATCH routes forward only the principal account into the
   service boundary. Existing POST/list transaction and cache behavior remains
   intact, with no broadening of empty identifiers.
5. Two-account unit, route and persistence regressions cover shared encounter
   identifiers, cross-account detail/update denial, repository delete scope,
   missing context, defensive copies and persistence rollback.
6. Preserve the existing Vue/PostgreSQL monolith. No migration, provider,
   credential, target, production, deployment, external-mutation or release
   claim is included.

## TDD acceptance

### RED

- New service tests fail before the fix because the account-first detail and
  update contract is not implemented and the legacy repository accepts
  unscoped lookup/delete calls.
- A two-account hydrated fixture fails to return account A's detail through the
  account-scoped service contract before the correction.
- A route regression fails before the fix because PATCH does not forward the
  principal account to `update`.

### GREEN

- Account A receives only account A discharge records and cannot detail,
  update or delete account B's record, including when encounter IDs are shared.
- Missing/empty account context is rejected before a cache or repository read.
- Returned models cannot mutate the service cache; failed persistence restores
  the prior cache state.
- Focused module/repository/route and disposable PostgreSQL regressions,
  typechecks, formatting and scoped lint pass.
- Global security, parity, target, provider and release states remain
  `IN_PROGRESS`/`PARTIAL` or `BLOCKED`.

## Explicit non-claims

This slice proves only the local discharge service/repository/authenticated
HTTP application boundary. It does not certify target TCP/RLS behavior, every
clinical route, direct privileged SQL, inpatient transaction atomicity,
providers, accessibility, operations, Vetus parity or production/release
readiness.

## Executed evidence

- RED-001: the account-first module contract failed 7/13 assertions and the
  authenticated route regression failed 1/2 assertions before implementation.
- RED-002: the queued-write regression reproduced a rejected persistence chain
  that skipped the second write after the first failed.
- GREEN: post-fix discharge module 17/17, authenticated route 2/2, disposable
  PostgreSQL HTTP/persistence 6/6, direct repository owner/foreign-context
  checks, full API 406/406, builds and typechecks passed. The repository
  update race produced one success and one conflict, and the secondary HTTP
  replica served a committed PATCH after rehydration.
- QUALITY: official coverage passed 1,970 tests with one skip at 82.03%
  statements, 80.22% branches, 88.59% functions and 82.03% lines; scoped
  lint, builds, Prettier, `git diff --check` and the secrets scan passed.
- REVIEW: the independent read-only review first returned `CONDITIONAL` with
  three Medium findings and two Low observations. The Medium findings were
  corrected in the service/repository/route boundary and revalidated; the
  follow-up review is recorded in
  `VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-REVIEW-002`.
- GLOBAL-RETEST: parity remained 98/100 (4/11 verified), clinical parity
  100/100 (2/3 verified), and enterprise readiness 95/100 (42 PASS, 3 WARN,
  1 FAIL); no global gate was promoted.

The final bounded decision is `PASS_BOUNDED` only for the local discharge
service/repository/authenticated HTTP boundary. The task does not certify
target TCP/RLS, privileged SQL, browser E2E, all clinical routes, providers,
operations, remote CI, backup/restore, remaining Vetus parity or release.

## Revalidation triggers

- Any new discharge collection, detail, update or delete path.
- Changes to runtime hydration, tenant context, encounter authorization,
  inpatient transition ordering or discharge persistence.
- Any expansion to migrations, target, provider, credential, production,
  deployment or release acceptance.

## Evidence references

- `.agent/gates/implementation-ready-CVG-003-discharge-tenant-isolation.json`
- `.agent/gates/verified-CVG-003-discharge-tenant-isolation.json`
- `.agent/artifacts/CVG-003-discharge-tenant-isolation-2026-08-26.md`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-RED-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-GREEN-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-QUALITY-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-QUALITY-003`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-GLOBAL-RETEST-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-GLOBAL-RETEST-002`
- `.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-FINAL-001`

## Decision boundary

Further implementation may proceed only within the existing service,
repository, authenticated route and local tests after revalidation. This
`PASS_BOUNDED` result must not promote CVG-003, clinical parity, enterprise
readiness or release.
