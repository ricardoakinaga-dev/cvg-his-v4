# Clinical Criticality Matrix

**Version:** 1.0 · **Owner:** Clinical Safety + Platform · **Status:** baseline normative, not certification

This matrix classifies the minimum clinical and financial flows that must be covered before a Triple-A release. Source behavior and tests are observed in the repository; runtime/UAT evidence remains a separate requirement.

| Flow | Criticality | Failure consequence | Required invariant | Required evidence | Current status |
|---|---:|---|---|---|---|
| Patient/owner identity and tenant link | P0 | Wrong patient/account disclosure or mutation | Account and subject binding fail closed | route tests, RLS runtime, negative cross-tenant tests | PARTIAL |
| Encounter lifecycle, triage and handoff | P0 | Lost continuity or unsafe transition | Valid state transition, actor permission, audit and correlation | module tests, integration, clinical UAT | PARTIAL |
| Medical record create/update/archive/timeline | P0 | Clinical history corruption or omission | Atomic mutation + audit + immutable history | module tests, failure injection, UAT | PARTIAL |
| Diagnostics/laboratory order and result | P0 | Result attached to wrong encounter/patient | Explicit encounter context; no silent fallback | route/integration tests, accessibility/UX review | PARTIAL |
| Prescription signing and execution | P0 | Unauthorized or duplicate treatment | Current authorization, idempotency and execution lifecycle | route tests, replay/permission tests, clinical sign-off | PARTIAL |
| Surgery/inpatient/admission/transfer | P0 | Unsafe bed/status/transfer state | Atomic transition, tenant boundary and audit | module/integration tests, game-day recovery | PARTIAL |
| Discharge and encounter closure | P0 | Premature closure or missing discharge facts | Required fields, reversible policy and audit | route tests, negative tests, UAT | PARTIAL |
| Billing, receipt and PIX linkage | P0 | Financial loss or incorrect settlement | Exact cents, intent linkage, idempotency and audit | API tests, provider sandbox, reconciliation evidence | PARTIAL |
| Attachments and clinical documents | P1 | Malware, leakage or unavailable record | Scan, tenant path, immutable metadata and recoverability | security tests, restore drill, UX evidence | PARTIAL |
| Notifications, webhook and reminders | P1 | Missed operational communication | Bounded retry, DLQ, dedupe and safe replay | worker tests, delivery evidence, game day | PARTIAL |

## Release rule

No P0 flow may be marked PASS solely from source inspection. A candidate needs executable tests, negative/failure-path evidence, tenant/authorization evidence, audit evidence and the applicable clinical/product authority. Any unknown or unexecuted P0 remains open in `TRIPLE_A_RELEASE_EVIDENCE.json`.

## Review triggers

Re-review this matrix when a route, state machine, permission, migration, event contract, worker consumer, integration provider, patient-facing screen or release workflow changes.
