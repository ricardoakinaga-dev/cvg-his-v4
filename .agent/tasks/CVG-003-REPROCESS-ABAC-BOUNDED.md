# CVG-003 — bounded outbox reprocess ABAC

**Status:** `COMPLETE_BOUNDED` — verified bounded gate passed  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / unauthorized replay of tenant events
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-REPROCESS-ABAC-BOUNDED-IR-001`

## Problem

`POST /internal/events/:eventId/reprocess` requires the RBAC
`audit.write` permission, but the route currently reads and requeues an event
without invoking the server's existing `enforceAbac` callback. The ABAC engine
has no policy for `audit.write`, so an action/resource pair with no matching
policy can fall through to its default-permit branch. A user with a direct or
future `audit.write` grant could therefore bypass the intended administrative
role boundary. The operation also needs a redacted actor/correlation audit
record when a replay is actually queued.

## Frozen bounded contract

1. Only `POST /internal/events/:eventId/reprocess` is changed. It keeps the
   existing RBAC `audit.write` check and then invokes the existing `enforceAbac`
   callback before `eventBus.getEvent` or `eventBus.reprocessEvent`.
2. The ABAC request uses action `audit.write` and the existing
   `resourceType: 'audit_entry'`, with `resourceId` equal to the path event ID
   and `accountId` derived from the authenticated principal. No client-supplied
   account or actor attributes are accepted.
3. Add one explicit `abac-009` policy for administrative outbox replay:
   `admin` is permitted and every other role is denied. Do not change the ABAC
   engine's global default, `abac-006`, the RBAC catalog, or any other policy.
4. After a successful reprocess, append one existing AuditService event with
   the principal actor, account, request correlation ID, event ID and a
   metadata-only status/result summary. Raw event payload is never copied.
5. Preserve account-scoped EventBus calls, failed/retrying eligibility,
   `404` behavior, `202` response shape, existing worker/repository contracts
   and OpenAPI Bearer/401/403/404 documentation.
6. Operational-coverage source-of-truth, replay-after-revocation semantics,
   worker delivery, idempotency, PIX redrive, other event routes, systemic
   ABAC redesign, storage, migrations, providers, credentials, target,
   production, deployment and release acceptance remain outside scope.

## TDD acceptance

### RED

- Focused route tests require `audit.write` ABAC with principal-derived event
  resource before `getEvent`, and require a denied decision to prevent both
  EventBus calls and the audit write.
- A focused policy test requires `abac-009` to permit only admin and deny a
  non-admin actor even when the action is matched.
- The pre-implementation route/policy run must fail because the route has no
  reprocess ABAC call and the policy is absent.

### GREEN

- The route invokes the existing callback before any event lookup, fails closed
  on denial, and records only a successful metadata audit event.
- The policy test proves explicit admin permit and non-admin denial without
  changing global no-policy behavior.
- An authenticated server integration proves the admin route reaches the
  existing event lookup boundary; OpenAPI remains valid.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-reprocess-abac-bounded.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-REPROCESS-ABAC-BOUNDED-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-BOUNDED-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-POLICY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-BOUNDED-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-POLICY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-INTEGRATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-HTTP-DENY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-REGRESSION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-REVIEW-SECURITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-REVIEW-COMPAT-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-COVERAGE-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-REPROCESS-ABAC-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-003-reprocess-abac-bounded.json`
- `.agent/artifacts/CVG-003-reprocess-abac-bounded-2026-08-29.md`

## Explicit non-claims

This task does not certify replay after permission revocation in a distributed
runtime, delivery idempotency, worker claims, direct SQL, target RLS/roles,
operational coverage, other audit/log/trace/export routes, external providers,
Vetus parity, remote CI, production or release readiness.

## Final reconciliation

- Intentional RED: route `7/9` and policy `38 pass / 1 fail`, both failing only
  the newly added authorization behavior as expected.
- GREEN: route `9/9`, access-control `39/39`, and authenticated admin server
  seam `1/1` with the existing missing-event `404` contract preserved.
- Additional GREEN assurance: actual server negative integration `1/1` with a
  non-admin principal that has `audit.write` but is denied by `abac-009` with
  HTTP `403` before the missing-event lookup. This closes the independent
  security review's bounded HTTP-assurance gap.
- Final API regression passed `493/493`; access-control passed `39/39` and
  event-bus passed `25/25` with disposable PostgreSQL teardown. API and
  access-control typechecks, OpenAPI `354/40/411`, RLS `163/164`, secret
  scan, Prettier and diff hygiene passed.
- Official workspace coverage passed `2,133` tests with one explicit skip at
  `80.08%` statements/lines, `80.91%` branches and `88.25%` functions.
- Independent security review found no P0/P1 implementation bypass; its
  requested HTTP denial evidence is now closed. Compatibility review approved
  the bounded slice. Generic ABAC error-detail disclosure is a P3 follow-up;
  replay/idempotency and durable audit atomicity remain explicit out-of-scope
  residuals.
- Fresh global retest remains non-promoting: Vetus `4/11`, clinical `2/3` and
  readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`).
- The verified gate is
  `.agent/gates/verified-CVG-003-reprocess-abac-bounded.json`; detailed
  evidence is in
  `.agent/artifacts/CVG-003-reprocess-abac-bounded-2026-08-29.md`.

## Decision

`COMPLETE_BOUNDED` with decision `PASS_WITH_CONDITIONS` and residual risk
`HIGH`. The selected route, explicit admin-only policy, successful metadata
audit and both authenticated HTTP authorization directions are verified
locally. Keep CVG-003/global ERP `IN_PROGRESS/PARTIAL` and promotion
`BLOCKED`; generic ABAC error-detail redaction, replay-after-revocation,
idempotency, durable audit atomicity, operational coverage and all external,
target, production, deployment and release surfaces remain open.
