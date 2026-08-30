# CVG-003 — InpatientService stay tenant authorization boundary

**Status:** `IMPLEMENTATION_READY`; parent CVG-003/global ERP remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `SCOUT` / `IMPLEMENTATION_READY`
**Owner:** root integrator with TDD and security review
**Parent:** CVG-003 behavioral verification spine
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / clinical tenant boundary
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-IR-001`

## Residual problem

`InpatientService` stores multiple accounts in process-local maps but resolves
stay identifiers through `getOrThrow(stayId)` without requiring the caller's
account. The identifier-based progress, occurrence, daily-charge, bed and
status operations inherit that unscoped resolution. Authenticated routes first
perform a manual account check, but the domain service contract itself remains
unsafe for direct and future first-party callers; inventory charge capture also
retrieves by identifier before checking ownership.

## Frozen bounded contract

1. Identifier-based `InpatientService` reads and mutations require the
   principal-derived `AccountId` and return the existing sanitized not-found
   behavior when the stay is absent or owned by another account.
2. The account predicate is applied before reading or changing the stay,
   progress, occurrence or daily-charge cache. Bed assignment/transfer and
   status transitions retain their existing lifecycle and persistence behavior.
3. Authenticated inpatient, discharge and inventory callers pass the principal
   account explicitly through the service boundary. Existing list, handover
   and worklist account filters remain compatible and do not broaden scope.
4. Existing payloads, response shapes, audit/idempotency behavior, repository
   tenant context, cache refresh and clinical-financial semantics remain
   unchanged apart from the authorization guard. No migration is expected.
5. Sector/bed repository hardening, prescription/triage/discharge redesign,
   target RLS, providers, production, deployment, release and global ERP
   promotion remain outside this slice.

## TDD acceptance

### RED

- The module test fails before the fix when account A invokes a stay operation
  using account B's stay identifier.
- Authenticated route tests fail before the fix when a service mock or shared
  cache can be reached without an explicit principal account argument.
- A disposable PostgreSQL/API proof confirms that the account-scoped persisted
  aggregate remains compatible; no retrospective RED is claimed if fixture
  setup fails.

### GREEN

- Inpatient module tests prove same-account reads/mutations and foreign-account
  rejection for stay, progress, occurrence and daily-charge operations.
- Inpatient, discharge and inventory production callers pass AccountId through
  the service boundary while public HTTP behavior remains unchanged.
- PostgreSQL persistence and compiled API tests prove tenant isolation and no
  foreign mutation; no migration is added.

### REGRESSION

- Inpatient module, focused PostgreSQL/API, complete API, workspace typecheck
  and build, official coverage, secrets, RLS, migration-source, OpenAPI and
  targeted static quality checks remain green.
- Parent/global CVG-003, clinical/Vetus parity, target RLS/roles, providers,
  accessibility, operations, remote CI and release acceptance remain open.

## Review boundary

The implementation is limited to explicit account propagation at the
InpatientService stay boundary and its first-party callers. A fresh compatible
independent review must inspect the final diff and cross-account tests before
higher-confidence use; an unavailable reviewer is recorded as a limitation,
never as approval.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-003-inpatient-stay-service-tenant-boundary.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-REVIEW-001`
- `.agent/gates/verified-CVG-003-inpatient-stay-service-tenant-boundary.json`
