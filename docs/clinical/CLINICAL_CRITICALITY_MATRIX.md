# Clinical Criticality Matrix

**Version:** 1.1 · **Owner:** Clinical Safety + Platform · **Status:** baseline normative, not certification

This matrix classifies the minimum clinical and financial flows that must be covered before a Triple-A release. Source behavior and tests are observed in the repository; runtime/UAT evidence remains a separate requirement.

| Flow | Criticality | Failure consequence | Required invariant | Required evidence | Current status |
|---|---:|---|---|---|---|
| Patient/owner identity and tenant link | P0 | Wrong patient/account disclosure or mutation | Account and subject binding fail closed | route tests, RLS runtime, negative cross-tenant tests | PARTIAL |
| Encounter lifecycle, triage and handoff | P0 | Lost continuity or unsafe transition | Valid state transition, actor permission, audit and correlation | module tests, integration, clinical UAT | PARTIAL |
| Clinical handover and shift transfer | P0 | Context lost between teams or shifts | Sender, receiver, encounter, pending actions and acknowledgement are explicit and audited | `tests/integration/clinical-handoff-persistence.test.ts`, workflow persistence, negative authorization tests, clinical UAT | PARTIAL |
| Medical record create/update/archive/timeline | P0 | Clinical history corruption or omission | Atomic mutation + audit + immutable history | module tests, failure injection, UAT | PARTIAL |
| Clinical note and longitudinal timeline | P0 | Decision context omitted or attached to the wrong subject | Note is bound to tenant, patient and encounter; edits are versioned and audited | medical-record module tests, tenant-boundary tests, runtime audit evidence, clinical UAT | PARTIAL |
| Diagnostics/laboratory order and result | P0 | Result attached to wrong encounter/patient | Explicit encounter context; no silent fallback | route/integration tests, accessibility/UX review | PARTIAL |
| Prescription signing | P0 | Unauthorized treatment order | Current authorization, patient/encounter binding and immutable signature | `tests/integration/prescriptions-api.test.ts`, route tests, replay/permission tests, clinical sign-off | PARTIAL |
| Medication execution and administration | P0 | Duplicate, omitted or incorrectly attributed treatment | One execution lifecycle per prescription, actor/time/status binding and idempotency | `tests/integration/prescription-executions-api.test.ts`, `tests/integration/database/prescription-execution-integrity.test.ts`, clinical sign-off | PARTIAL |
| Surgery and procedural state | P0 | Unsafe procedure transition or incomplete record | Atomic state transition, authorization, checklist facts and audit | surgery module/integration tests, negative tests, game-day recovery, UAT | PARTIAL |
| Inpatient admission and bed assignment | P0 | Patient placed in an invalid or conflicting bed | Tenant-scoped bed availability, one active stay, atomic assignment and audit | `tests/integration/database/inpatient-sector-bed-tenant-boundary.test.ts`, inpatient HTTP tests, recovery evidence, UAT | PARTIAL |
| Inpatient transfer and status lifecycle | P0 | Unsafe transfer or stale clinical status | Allowed transition graph, source/destination ownership, actor authorization and audit | inpatient lifecycle tests, SIGKILL/restart evidence, negative tests, UAT | PARTIAL |
| Discharge and encounter closure | P0 | Premature closure or missing discharge facts | Required fields, reversible policy and audit | route tests, negative tests, UAT | PARTIAL |
| Durable clinical workflow task | P0 | Follow-up, retry or escalation is silently lost | Idempotent fingerprint, tenant binding, lease/fencing, bounded retry, DLQ and audited replay | `tests/integration/database/clinical-workflow-postgres.test.ts`, `tests/integration/process/workflow-task-sigkill.test.ts`, target/CI evidence | PARTIAL |
| Billing, receipt and PIX linkage | P0 | Financial loss or incorrect settlement | Exact cents, intent linkage, idempotency and audit | API tests, provider sandbox, reconciliation evidence | PARTIAL |
| Attachments and clinical documents | P1 | Malware, leakage or unavailable record | Scan, tenant path, immutable metadata and recoverability | security tests, restore drill, UX evidence | PARTIAL |
| Notifications, webhook and reminders | P1 | Missed operational communication | Bounded retry, DLQ, dedupe and safe replay | worker tests, delivery evidence, game day | PARTIAL |

## Release rule

No P0 flow may be marked PASS solely from source inspection. A candidate needs executable tests, negative/failure-path evidence, tenant/authorization evidence, audit evidence and the applicable clinical/product authority. Any unknown or unexecuted P0 remains open in `TRIPLE_A_RELEASE_EVIDENCE.json`.

## Review triggers

Re-review this matrix when a route, state machine, permission, migration, event contract, worker consumer, integration provider, patient-facing screen or release workflow changes.
