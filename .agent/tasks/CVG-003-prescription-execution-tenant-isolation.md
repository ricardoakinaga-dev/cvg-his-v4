# CVG-003 — prescription-execution collection tenant isolation

**Status:** `PASS_BOUNDED` — bounded local correction reconciled  
**Stage/activity:** `VERIFY` / `RECONCILE`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical cross-tenant read  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-IR-001`

## Problem

`PrescriptionExecutionsService` hydrates records for each account into one
runtime map. Its encounter and patient collection methods still accept an
optional account and use a truthiness fallback, so a direct caller without
tenant context can see records from other accounts. The HTTP route already
passes the principal account for non-empty filters, but an empty query value
falls through to the unfiltered account list.

## Frozen bounded contract

1. `listByEncounter` and `listByPatient` require `AccountId` in their
   TypeScript contract, apply the account predicate before returning records,
   and throw `ValidationError` when runtime context is missing.
2. `GET /prescription-executions?encounterId=...` and
   `?patientId=...` pass the authenticated principal account; an explicit
   empty filter is rejected rather than broadened to `list(account)`.
3. Unit and HTTP-shaped integration tests use two accounts with shared
   encounter/patient identifiers and assert non-disclosure for both paths.
4. The change preserves the Vue/PostgreSQL monolith and does not add a
   migration, provider, credential, target, production, deployment,
   external-mutation or release claim.

## TDD acceptance

### RED

- The service regression fails before the fix because missing account context
  does not throw `ValidationError`.
- The route regression fails before the fix because `encounterId=` falls back
  to the account-wide list instead of rejecting the empty filter.

### GREEN

- Account A receives only account A executions for both filtered collection
  paths after both accounts are hydrated in the same service instance.
- Existing module/API route regressions, typechecks, formatting and lint pass.
- Global security, parity, target, provider and release states remain
  `IN_PROGRESS`/`PARTIAL` or `BLOCKED`.

## Bounded result

The service and route REDs failed before the correction exactly at the two
unsafe fallbacks. GREEN now requires `AccountId`, filters the hydrated map by
account and rejects empty query values before `list(account)`. The unit test
hydrates account A and account B into one service instance with shared clinical
identifiers; the HTTP-shaped test verifies that account A receives only its
own execution on both encounter and patient filters.

Fresh evidence passed the module suite `15/15`, route source tests `2/2`,
HTTP-shaped integration `1/1`, full API package `402/402`, module/API
typechecks, Prettier, ESLint and `git diff --check`. Official coverage passed
`1,960 tests / 1 skip` at `81.98%` statements, `80.08%` branches, `88.56%`
functions and `81.98%` lines. The final independent read-only review returned
`PASS_BOUNDED` with no Critical, High, Medium or Low-blocker findings.

The result is accepted only for this application-service/HTTP collection
boundary. Parent CVG-003 and global readiness remain `IN_PROGRESS`/`PARTIAL`.

## Explicit non-claims

This slice proves only the application-service/HTTP collection boundary in the
repository-local test environment. It does not certify administration-event
ownership for every detail path, direct SQL or privileged writers, target RLS,
database rollout, external providers, accessibility, operations, Vetus parity
or production readiness.

## Revalidation triggers

- Any new prescription-execution collection/query or administration-event path.
- Changes to runtime hydration, tenant context, authorization or clinical-entry
  persistence.
- Any expansion to direct SQL, target, provider, credential, production,
  deployment or release acceptance.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-prescription-execution-tenant-isolation.json`
- `.agent/artifacts/CVG-003-prescription-execution-tenant-isolation-2026-08-26.md`
- `.agent/gates/verified-CVG-003-prescription-execution-tenant-isolation.json`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-FINAL-001`

## Final decision

`PASS_BOUNDED` with residual risk `HIGH`. This closes the local bounded
prescription-execution collection isolation contract and does not close
administration-event ownership for every detail path, CVG-003, all clinical
routes, direct SQL/privileged writers, target RLS, providers, accessibility,
operations, parity or production/release readiness.
