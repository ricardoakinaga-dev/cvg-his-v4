# CVG-003 — outbox administration tenant isolation

**Status:** `COMPLETE_BOUNDED` — local slice closed with bounded conditions  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / cross-tenant event disclosure and redrive  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-IR-001`

## Problem

The internal event administration routes authorize `audit.read` or
`audit.write`, but the `EventBusService` administration methods currently
accept only event/correlation identifiers and limits. The database repository
uses ambient tenant context, while the supported in-memory runtime repository
indexes events by identifier/status without an account predicate. An
authenticated account can therefore read another account's event payload or
requeue its failed event whenever the API is running on that repository.

The existing worker claim path is a separate delivery boundary and is not part
of this slice. Production bootstrap refusing an in-memory fallback does not
make the repository-local service/HTTP contract safe in development, tests or
other supported runtime wiring.

## Frozen bounded contract

1. Administrative reads and redrive require principal-derived `AccountId` as
   the first service/repository argument: `getDeadLetterEvents`, `getEvent`,
   `getEventsByCorrelationId`, `getPendingEvents`, `reprocessEvent` and
   `countEvents`, together with the corresponding repository operations.
2. The in-memory repository filters every administrative operation by the
   explicit account before returning, counting or mutating an event. A foreign
   event is opaque (`null` or an empty result/count), and a missing/empty
   account fails closed before the operation.
3. `DatabaseOutboxRepository` accepts the explicit account, requires the
   ambient tenant context to match it before querying, and preserves the
   existing SQL `account_id` predicates. No query may fall back to an
   identifier-only lookup.
4. `/internal/events/dlq`, `/stats`, `/pending`, event detail, explicit
   `by-correlation/:correlationId` and reprocess routes pass only
   `principal.user.accountId` to the service boundary after the existing
   permission check. All list routes use the bounded `limit` contract of 1 to
   200 (default 50). Same-account response shapes and permission behavior
   remain unchanged.
5. Event counts are delegated through the injected repository so in-memory
   stats are account-scoped and the database implementation remains
   tenant-scoped. The count categories and total semantics remain unchanged.
6. Same-account event delivery, leases, consumer processing, payload
   redaction policy, audit-policy redesign, replay authorization policy,
   `claimPending`, migrations, providers, target, production and release
   behavior are outside this task and must not be changed. The historical
   correlation/detail path ambiguity is resolved locally by the explicit
   `by-correlation/:correlationId` route and is covered by the route/OpenAPI
   contract.

## TDD acceptance

### RED

- A two-account in-memory runtime regression calls the actual event-bus
  administration service with account A against account B's detail, pending,
  DLQ, correlation, stats and reprocess data; at least one assertion fails
  against the current unscoped implementation.
- A route regression proves every internal-event administration endpoint
  forwards the authenticated principal account; the current route fails this
  forwarding contract.
- Existing database/mocked repository contracts fail to typecheck until all
  first-party implementations and fixtures are migrated to the explicit
  account-first signatures.

The intentional RED run was isolated to the two new regressions: `0 passed / 2
failed`. The route contract observed identifier/limit-only calls and no account
for stats; the in-memory runtime contract could not retrieve the owning event
through the intended account-first detail call. Unrelated runtime tests that
need seeded authentication were not included in this RED result.

### GREEN

- Account A cannot read, list, count or reprocess account B's events through
  the real in-memory repository; B's event and status remain unchanged.
- Same-account detail, correlation, pending, DLQ, stats and reprocess paths
  remain functional, and invalid account input is rejected before access or
  mutation.
- Database administrative operations reject an explicit account that differs
  from the ambient tenant and retain account predicates in every query.
- Route forwarding tests, event-bus tests, database outbox regressions and
  focused typecheck/lint/format checks pass without changing worker claim
  semantics.

GREEN evidence is now present: focused route/runtime regressions passed `2/2`,
the event-bus module/catalog suite passed `25/25`, disposable PostgreSQL
outbox delivery passed `10/10` including account-scoped administrative
operations, ambient-account mismatch rejection and bounded correlation
search, and the event-bus module/API typechecks passed. The full API package
passed `479/479`, the catalog HTTP assertion confirmed API-key operators are
rejected from Bearer-only event administration, OpenAPI validation passed with
354 paths and 411 schemas, and worker claim behavior was not changed.

### Quality and review hardening

- The initial independent review found a contract mismatch: the API-key
  integration catalog advertised an internal correlation endpoint that requires
  Bearer plus `audit.read`. The catalog now exposes no event administration in
  `endpoints`, lists the routes under `operatorEndpoints`, declares the Bearer
  permissions, and the API server test confirms an API key alone receives 401.
- The OpenAPI now declares all six event-administration paths, Bearer security,
  1..200 list limits and the outbox response schemas.
- A second security review found an unbounded correlation query. The bounded
  correction was run RED first, then implemented in the service, PostgreSQL
  (`LIMIT $3`), in-memory repository, route and OpenAPI. Two fresh follow-up
  reviewers independently confirmed the P2 is closed and found no new P0/P1/P2.

## Explicit non-claims

This slice proves only the repository-local event administration service and
HTTP boundary. It does not certify worker claim isolation, direct SQL outside
the repository, target RLS/runtime roles, distributed operation, external
providers, credential handling, production, deployment, accessibility, LGPD,
Vetus parity or release readiness.

## Revalidation triggers

- Any new internal event administration route, worker administrative action or
  event repository implementation.
- Changes to outbox schema, tenant context, runtime repository selection,
  permission policy, payload exposure or redrive semantics.
- Any attempt to include `claimPending`, target, provider, production,
  deployment or release scope.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-outbox-admin-tenant-isolation.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-RED-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-GREEN-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-QUALITY-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-REVIEW-003`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-REVIEW-004`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-TENANT-ISOLATION-FINAL-001`
- `.agent/gates/verified-CVG-003-outbox-admin-tenant-isolation.json`
- `.agent/artifacts/CVG-003-outbox-admin-tenant-isolation-2026-08-29.md`

## Decision

`PASS_BOUNDED` with residual risk `HIGH` for the wider audit policy surface.
Close only this repository-local account-scoped event-administration boundary
under the verified bounded gate. The remaining payload redaction, replay
authorization after revocation and ABAC policy findings are explicit follow-up
scopes, not silently accepted as solved. Keep global ERP readiness
`IN_PROGRESS/PARTIAL` and promotion `BLOCKED`.
