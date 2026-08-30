# CVG-003 — inpatient sector/bed tenant authorization boundary

**Status:** `COMPLETE_BOUNDED`; parent CVG-003/global ERP remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `CLOSE` / `RECONCILED`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical tenant boundary
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-IR-001`

## Residual problem

The inpatient sector/bed service accepts an account for some operations but
does not carry it through every lookup. In-memory `findBySectorId` and
`findByStatus` filter only by identifier, database repositories use the same
unscoped predicates, `createBed` resolves a sector without checking ownership,
and `listBeds(accountId, sectorId)` drops the account. A caller who knows a
foreign sector identifier can therefore receive another account's bed list or
attach a bed to the wrong sector in the in-memory path; the service contract
also leaves generic bed/sector reads unsafe for future callers.

## Frozen bounded contract

1. Sector and bed repository lookups that resolve an identifier or a
   sector/status combination require the caller's `AccountId` and apply that
   predicate before returning data. In-memory and database implementations
   have equivalent behavior.
2. `SectorBedService` requires account scope for `getSectorOrThrow`,
   `getBedOrThrow`, `listBeds` sector filters, `getAvailableBeds`, and bed
   state transitions. `createBed`, update/assignment/transfer and all first-
   party callers verify that the sector and bed belong to the stay/principal
   account before mutation.
3. Authenticated inpatient routes pass the principal account through the
   service boundary. A foreign or missing resource returns the existing
   sanitized not-found/error behavior and does not disclose the resource.
4. Existing response shapes, bed lifecycle semantics, status filters, audit
   behavior, database tenant context and in-memory compatibility remain
   unchanged apart from the authorization guard.
5. No migration is expected: existing `account_id` columns, indexes, tenant
   integrity trigger/FKs and RLS remain the persistence boundary. No provider,
   credential, target, production, deployment, release or global ERP
   promotion is authorized.

## TDD acceptance

### RED

- The in-memory module test fails before the fix when account A lists beds by
  account B's sector and when account A creates a bed against account B's
  sector.
- Route tests fail before the fix when a sector-filtered `/beds` request can
  return a foreign-account row or a service mock does not receive the
  principal account.
- The PostgreSQL test fails before the fix when a restricted tenant path can
  resolve a foreign sector/bed identifier or sector/status combination.

### GREEN

- Module tests prove same-account lifecycle plus foreign sector/bed rejection
  in both the in-memory service and repository-shaped mocks.
- Authenticated route tests prove account propagation for sector-filtered bed
  lists and existing admission/assignment behavior remains compatible.
- Disposable PostgreSQL tests prove account predicates, cross-account
  non-disclosure and no foreign-sector attachment; no migration is added.

### REGRESSION

- Inpatient module, API route, compiled API, workspace typecheck/build,
  OpenAPI, RLS, secrets, migration-source, targeted lint/format and coverage
  remain green at the repository quality bar.
- Parent/global CVG-003, clinical/Vetus parity, target RLS/roles, providers,
  accessibility, operations, remote CI and release acceptance remain open.

## Review boundary

The implementation is limited to the account propagation and predicate
boundary for inpatient sectors/beds. A fresh independent review must inspect
the final diff and cross-tenant tests before this child can close as
`PASS_BOUNDED`; unavailable reviewer attempts are recorded as a limitation,
never as approval.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-003-inpatient-sector-bed-tenant-boundary.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-SECTOR-BED-TENANT-BOUNDARY-REVIEW-001`
- `.agent/gates/verified-CVG-003-inpatient-sector-bed-tenant-boundary.json`

## Final bounded verification — 2026-08-30

- TDD RED was captured in the in-memory module and compiled route tests before
  implementation. The disposable PostgreSQL test was added before the fix but
  its first execution failed in fixture setup because the fixture used textual
  bed identifiers against the existing UUID column; no PostgreSQL pre-fix RED
  is claimed.
- TDD GREEN passed the inpatient module (`18/18`), disposable PostgreSQL
  boundary (`3/3`) and compiled route suite (`25/25`); the complete API suite
  passed `518/518`.
- The workspace typecheck and build passed, official coverage passed with
  `2,173` tests executed (`80.17%` statements/lines, `80.73%` branches and
  `86.66%` functions), and targeted ESLint/Prettier, secrets, RLS,
  migration-source, OpenAPI and diff checks passed.
- Independent reviewer agents were unavailable: the configured reviewer role
  is unsupported for the active account and the compatible attempt timed out.
  Local source audit is retained as local evidence only, not independent
  approval.

The child is closed as `PASS_BOUNDED` / `COMPLETE_BOUNDED` with medium
confidence and high residual risk. Parent CVG-003, global ERP/Vetus parity,
target authorization, providers, production, deployment and release remain
open and promotion remains blocked.
