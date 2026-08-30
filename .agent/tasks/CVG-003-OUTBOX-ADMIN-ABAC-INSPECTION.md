# CVG-003 — outbox administration ABAC inspection

**Status:** `COMPLETE_BOUNDED` — verified bounded gate passed  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / unauthorized operator visibility of clinical, financial or provider event metadata  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-IR-001`

## Problem

The access-control module defines enabled policy `abac-006` for
`audit_entry`/`audit.read`, denying roles outside `auditor` and `admin`. At
selection time, the read-only internal outbox administration routes called
`requirePrincipal(request, 'audit.read')`, but their handler contract and
server registration did not receive or invoke the existing `enforceAbac`
callback. This slice closes that bounded gap without expanding authorization
to other route families.

## Frozen bounded contract

1. `InternalEventsHandlers` receives the existing `enforceAbac` callback used
   by the API server; no new policy engine or policy semantics are introduced.
2. The five read-only surfaces — `/internal/events/dlq`, `/stats`, `/pending`,
   `/:eventId` and `/by-correlation/:correlationId` — invoke
   `enforceAbac('audit.read', principal, resource, request)` after principal
   authentication and before event-bus reads. The resource uses
   `resourceType: 'audit_entry'`, the principal account and a stable route
   identifier.
3. The existing `abac-006` policy remains semantically unchanged: it must deny
   non-auditor/admin roles and explicitly permit auditor/admin roles. The
   hardening may add only the missing explicit permit rule. A denied ABAC
   decision must prevent the event-bus read, while an allowed decision
   preserves the current account scope, limits, response metadata and payload
   redaction.
4. The server passes its existing `enforceAbac` implementation into the
   internal-events handler. No other route family is wired by this task.
5. Reprocess/audit.write, `/audit/events`, systemic ABAC coverage, policy
   broadening, storage, workers, audit payloads, migrations, providers,
   credentials, target, production, deployment and release acceptance remain
   outside scope.

## TDD acceptance

### RED

- Focused route tests add a spy for `enforceAbac`, require one `audit.read`
  evaluation per read-only surface and assert that a throwing evaluator stops
  the event-bus read.
- The pre-implementation run fails because the current handler has no ABAC
  callback/wiring and does not invoke the spy.
- The RED run is limited to the selected route authorization assertions; no
  unrelated authentication or database failures count as slice evidence.

### GREEN

- All five read-only surfaces invoke the existing ABAC callback before their
  event-bus operation with principal account and route/resource context.
- An ABAC denial fails closed before the event-bus read; an allow path remains
  green, preserves tenant scope and keeps the metadata-only payload contract.
- The existing access-control policy and event-bus/repository/worker contracts
  remain unchanged; full API regression and quality/review gates remain
  required before bounded closure.

## Final reconciliation

- The route RED reported `4/6` passing before implementation; route GREEN
  passed `6/6` after the existing callback was wired.
- The authenticated integration RED exposed the missing explicit permit in
  `abac-006`; the authorized additive hardening RED/GREEN cycle ended with
  access-control `38/38` and authenticated server integration `1/1`.
- Review-driven coverage was expanded to prove fail-closed ordering across all
  five read-only routes; the focused suite then passed `7/7`.
- Final API regression passed `485/485`; formal API/access-control typechecks,
  OpenAPI `354/411`, RLS `163/164`, secrets, Prettier and diff hygiene passed.
  Official workspace coverage remains 80.09% statements, 80.93% branches,
  88.26% functions and 80.09% lines.
- Independent security and integration reviews returned `PASS` with no
  P0/P1/P2 findings. Fresh global audits remain non-promoting: Vetus `4/11`,
  clinical `2/3` and readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`).
- The verified gate is
  `.agent/gates/verified-CVG-003-outbox-admin-abac-inspection.json`; the
  detailed evidence is in
  `.agent/artifacts/CVG-003-outbox-admin-abac-inspection-2026-08-29.md`.

## Explicit non-claims

This slice does not certify `/audit/events`, `/audit/operational-coverage`,
reprocess/write authorization, replay after revocation, systemic ABAC
coverage, API-key semantics, audit/log/trace redaction, direct SQL, target
roles/RLS, distributed workers, external providers, accessibility, LGPD,
Vetus parity, remote CI, production or release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-outbox-admin-abac-inspection.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-INTEGRATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-HARDENING-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-HARDENING-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-INTEGRATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-COVERAGE-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-ABAC-INSPECTION-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-003-outbox-admin-abac-inspection.json`
- `.agent/artifacts/CVG-003-outbox-admin-abac-inspection-2026-08-29.md`

## Decision

`COMPLETE_BOUNDED` with decision `PASS_WITH_CONDITIONS` and residual risk
`HIGH`. The selected five read-only routes and the additive `abac-006`
permit rule are verified locally. Keep CVG-003/global ERP
`IN_PROGRESS/PARTIAL` and promotion `BLOCKED`; reprocess/audit.write,
`/audit/events`, systemic ABAC and all external/production/release surfaces
remain outside this gate.
