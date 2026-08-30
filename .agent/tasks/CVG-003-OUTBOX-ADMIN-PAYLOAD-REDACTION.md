# CVG-003 — outbox administration payload redaction

**Status:** `COMPLETE_BOUNDED` — local HTTP/OpenAPI payload redaction is verified; global promotion remains blocked  
**Stage/activity:** `VERIFY` / `FINAL_RECONCILIATION`  
**Owner:** root integrator with TDD and security review  
**Parent:** CVG-003 behavioral verification spine  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / disclosure of clinical, financial or provider data through operator event inspection  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-IR-001`

## Problem

The account-scoped outbox administration boundary is now tenant-isolated and
resource-bounded, but the authenticated detail and correlation HTTP handlers
still serialize the complete internal `OutboxEvent`, including its raw
`payload`. The DLQ and pending list handlers already return metadata-only
summaries. A permission-checked operator endpoint is not a license to expose
arbitrary domain payloads, which can contain clinical, financial, provider or
credential-adjacent data.

## Frozen bounded contract

1. The internal `OutboxEvent` shape remains unchanged for event processing,
   worker claims, service/repository behavior and existing internal callers.
2. `GET /internal/events/:eventId` and
   `GET /internal/events/by-correlation/:correlationId` return a dedicated
   metadata-only administrative view derived at the HTTP boundary. The view
   preserves the existing event metadata fields and omits the `payload` key
   entirely; it never serializes or forwards the raw payload.
3. DLQ and pending response shapes, account authorization, correlation limits,
   reprocess behavior, error handling and permissions remain unchanged.
4. OpenAPI documents the metadata-only detail/correlation response schema and
   no longer advertises raw `payload` on those administrative responses.
5. No domain-specific allowlist, payload storage/retention change, audit-event
   redaction, worker change, replay authorization redesign or systemic ABAC
   change is included.

## TDD acceptance

### RED

- Route tests use an event containing a sentinel secret in `payload` and fail
  because detail and correlation currently return that raw payload.
- The OpenAPI contract test fails while detail/correlation reference the raw
  `OutboxEvent` schema.
- The RED run is limited to the new response-boundary assertions; unrelated
  authentication/database setup failures are not counted as slice evidence.

### GREEN

- Detail and correlation responses preserve metadata but contain no `payload`
  property and no sentinel value.
- The internal service/repository and worker claim path still receive the
  original `OutboxEvent` shape, proving redaction is HTTP-boundary-only.
- OpenAPI validation passes with a metadata-only schema for detail and
  correlation; all account, limit and permission regressions remain green.

Focused GREEN is recorded: the internal-events route suite passed `4/4` with a
sentinel payload omitted from detail/correlation while the source event
remained unchanged, and OpenAPI validation passed with 354 paths and 411
schemas. A documentation-only hardening RED/GREEN pair closed the missing
correlation invalid-limit `400` response in OpenAPI. Full API regression passed
`481/481`; API/event-bus typechecks, RLS, secret scan, scoped lint, Prettier and
diff hygiene passed. Two final independent reviews returned
`APPROVE_BOUNDED` with no P0/P1/P2 finding. Fresh global audits remain
non-promoting at Vetus `4/11`, clinical `2/3` and readiness `95/100`.

## Explicit non-claims

This slice does not certify redaction of audit records, logs, traces, other
admin endpoints or provider callbacks. It does not change or certify replay
authorization after permission revocation, systemic ABAC, direct SQL, target
RLS/runtime roles, distributed operations, external providers, credentials,
production, deployment, accessibility, LGPD, Vetus parity or release
readiness.

## Revalidation triggers

- Any new event administration response, payload allowlist, export or operator
  diagnostic surface.
- Changes to OutboxEvent storage, serialization, worker claims, audit policy,
  replay authorization or ABAC policy.
- Any attempt to expand into migrations, providers, credentials, target,
  production, deployment or release activity.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-003-outbox-admin-payload-redaction.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-RED-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-GREEN-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-REVIEW-003`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-REVIEW-004`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-003-OUTBOX-ADMIN-PAYLOAD-REDACTION-FINAL-001`
- `.agent/gates/verified-CVG-003-outbox-admin-payload-redaction.json`
- `.agent/artifacts/CVG-003-outbox-admin-payload-redaction-2026-08-29.md`

## Decision

`PASS_BOUNDED` under
`.agent/gates/verified-CVG-003-outbox-admin-payload-redaction.json` with
residual risk `HIGH`. The HTTP/OpenAPI response-boundary correction is
complete. Keep the global ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`;
payload redaction in audit/log/trace surfaces, replay authorization and
systemic ABAC remain separate follow-ups.
