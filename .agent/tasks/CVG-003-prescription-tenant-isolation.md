# CVG-003 — prescription list tenant isolation

**Status:** `PASS_BOUNDED` — bounded local correction reconciled  
**Stage/activity:** `VERIFY` / `RECONCILE`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical cross-tenant read  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-PRESCRIPTION-TENANT-ISOLATION-IR-001`

## Problem

`PrescriptionsService` keeps the prescriptions hydrated for every account in a
runtime. Its encounter and patient collection methods previously filtered only
by the supplied clinical identifier. The authenticated route therefore could
return another account's prescription when two tenants used the same external
or legacy identifier, even though the account-wide collection was scoped.

## Frozen bounded contract

1. `listByEncounter` and `listByPatient` require the caller's `AccountId` in
   their TypeScript contract and apply that account predicate before returning
   any prescription. A runtime-missing value still fails closed with
   `ValidationError`.
2. `GET /prescriptions?encounterId=...` and
   `GET /prescriptions?patientId=...` pass the authenticated principal's
   account; the unfiltered collection keeps its existing account scope.
3. The service and HTTP tests use explicit two-account fixtures with shared
   encounter and patient identifiers and assert non-disclosure for both query
   paths.
4. The change preserves the existing Vue/PostgreSQL monolith and does not add
   a migration, provider, credential, target, production, deployment,
   external-mutation or release claim.

## TDD acceptance

### RED

- The new HTTP integration test must fail before the fix because the response
  contains both account A and account B prescriptions for the shared encounter
  and patient identifiers.

### GREEN

- Account A receives only account A prescriptions for both filtered collection
  paths, while account B data remains in the service and is not deleted or
  rewritten.
- Existing prescription unit, route, API typecheck, formatting and lint
  regressions pass.
- The global security, parity, target, provider and release states remain
  `IN_PROGRESS`/`PARTIAL` or `BLOCKED` as previously recorded.

## Bounded result

The explicit RED reproduced two records for a shared encounter identifier
before the correction. GREEN now returns only the authenticated account's
record for both encounter and patient filters after hydrating both accounts in
one service instance. The service unit suite passed `32/32`, the focused
integration file plus service suite passed `37/37`, the API route regression
passed `7/7`, the full API package passed `401/401`, and the API/module
typechecks passed. Prettier, ESLint and `git diff --check` passed; official
coverage remains `1,959 passed / 1 skipped` at `81.98%` statements, `80.08%`
branches, `88.56%` functions and `81.98%` lines.

The final independent read-only review returned `PASS_BOUNDED` with zero
Critical, High, Medium or Low-blocker findings. The result is accepted only
for this application-service/HTTP collection boundary; parent CVG-003 and
global readiness remain `IN_PROGRESS`/`PARTIAL`.

## Explicit non-claims

This slice proves only the application-service/HTTP collection boundary in the
repository-local test environment. It does not certify every clinical route,
direct SQL or privileged writers, target RLS, database rollout, external
providers, accessibility, operations, Vetus parity or production readiness.

## Revalidation triggers

- Any new prescription collection/query path or direct repository consumer.
- Changes to runtime hydration, tenant context, authorization or clinical-entry
  persistence.
- Any expansion to direct SQL, target, provider, credential, production,
  deployment or release acceptance.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-prescription-tenant-isolation.json`
- `.agent/artifacts/CVG-003-prescription-tenant-isolation-2026-08-26.md`
- `.agent/gates/verified-CVG-003-prescription-tenant-isolation.json`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-FINAL-001`

## Final decision

`PASS_BOUNDED` with residual risk `HIGH`. This closes the local bounded
prescription collection isolation contract and does not close CVG-003, all
clinical routes, direct SQL/privileged writers, target RLS, providers,
accessibility, operations, parity or production/release readiness.
