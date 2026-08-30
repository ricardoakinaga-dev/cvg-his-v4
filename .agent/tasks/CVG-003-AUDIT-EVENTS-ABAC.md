# CVG-003 — audit events ABAC enforcement

**Status:** `COMPLETE_BOUNDED`  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / unauthorized visibility of sensitive audit events  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-AUDIT-EVENTS-ABAC-IR-001`

## Problem

`GET /audit/events` authenticates the principal and requires the RBAC
`audit.read` permission, but the delegated access-control route does not call
the existing server `enforceAbac` callback before reading the audit service.
The enabled `abac-006` policy already governs `audit_entry`/`audit.read`, so
the route currently bypasses the configured attribute-based decision while
the adjacent internal outbox inspection routes now enforce it.

## Frozen bounded contract

1. `AccessControlRoutesHandlers` receives the existing `enforceAbac` callback
   from the API server; no new policy engine or policy semantics are added.
2. Only `GET /audit/events` invokes
   `enforceAbac('audit.read', principal, resource, request)` after principal
   authentication and before `audit.listPage` or the fallback `audit.list`.
3. The resource is `resourceType: 'audit_entry'`, `resourceId: 'events'`, and
   `accountId: principal.user.accountId`. Existing cursor/filter/limit,
   tenant binding, audit append and response behavior remain unchanged.
4. OpenAPI documents the existing Bearer authentication and `401`/`403`
   responses for this GET only.
5. `/audit/operational-coverage`, its cache/source-of-truth semantics,
   reprocess/audit.write, replay-after-revocation, other audit/log/trace/export
   surfaces, systemic ABAC, policy broadening, storage, workers, migrations,
   providers, credentials, target, production, deployment and release
   acceptance remain outside scope.

## TDD acceptance

### RED

- Focused audit-route tests add an ABAC spy and require `audit.read` with the
  expected resource/account before the audit service query.
- A denial test must fail closed before `audit.listPage` or `audit.list` is
  called.
- The pre-implementation run must fail because the current handler has no
  ABAC callback and does not invoke it.

### GREEN

- `GET /audit/events` invokes the existing callback exactly once before the
  selected audit read, with principal-derived account context.
- A denied decision prevents the audit query; an allowed decision preserves
  the current filters, cursor, limit, audit record and response contract.
- The server supplies the callback and the authenticated admin allow path is
  covered. The existing `abac-006` policy and all other route families remain
  unchanged.

## Explicit non-claims

This slice does not certify `/audit/operational-coverage`, reprocess/write or
replay authorization, ABAC on other audit/log/trace/export surfaces, systemic
ABAC completeness, audit cache hydration/source-of-truth correctness, direct
SQL, target roles/RLS, distributed workers, external providers, accessibility,
LGPD, Vetus parity, remote CI, production or release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-audit-events-abac.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-AUDIT-EVENTS-ABAC-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-INTEGRATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-REGRESSION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-COVERAGE-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-AUDIT-EVENTS-ABAC-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-003-audit-events-abac.json`
- `.agent/artifacts/CVG-003-audit-events-abac-2026-08-29.md`

## Decision

`COMPLETE_BOUNDED` with residual risk `HIGH`. The intentional RED tests failed
as expected; the existing callback seam and `audit.read` check were implemented
and verified for `GET /audit/events`, together with its matching OpenAPI
security/error contract. Keep CVG-003/global ERP `IN_PROGRESS/PARTIAL` and
promotion `BLOCKED`.

## Final reconciliation

- Gate: `.agent/gates/verified-CVG-003-audit-events-abac.json` —
  `PASS_WITH_CONDITIONS` / `COMPLETE_BOUNDED`.
- Route suite: `13/13`; server admin integration: `1/1`; full API regression:
  `489/489`; access-control module: `38/38`.
- Official coverage: `80.08%` statements/lines, `80.91%` branches and
  `88.25%` functions across `2,132` passing tests and one explicit skip.
- OpenAPI, RLS, secret scan, typechecks, Prettier and diff hygiene passed.
- Independent security and compatibility reviews returned
  `APPROVE_BOUNDED` with no P0/P1/P2. The generic ABAC 403 metadata detail and
  full unauthorized-user HTTP test remain separate non-blocking follow-ups.
- Fresh global retest remains non-promoting: Vetus `4/11`, clinical `2/3`,
  readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`).
- A separate integration RED was not run because the route-level RED already
  demonstrated the missing behavior before implementation; the server test
  was added as an integration GREEN seam regression.

This closure is bounded to `/audit/events`; operational coverage
source-of-truth, reprocess/replay, systemic ABAC, external providers,
production, deployment and release acceptance remain open.
