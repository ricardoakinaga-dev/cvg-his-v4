# Gauntlet State

## Goal

Deliver a behaviorally proven Premium Enterprise veterinary ERP MVP with secure multi-tenancy, the complete clinical-to-financial backbone, Vetus parity, accessible enterprise UX, provider-grade integrations and target-environment operational evidence.

## Quality Bar Control

- Current version: v1
- Frozen before implementation: yes, 2026-08-22, after complete corpus synthesis plus independent planning, TDD and security reviews for `CVG-001`
- Revision log: None. Record the old criterion, new criterion, reason, and evidence before grading a revision.

## Quality Bar

| ID | Dimension | Criterion | Target | Evidence method | Required | Priority | Baseline | Validity notes | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `QB-SEC-01` | Secrets/setup | First access uses an explicit high-entropy bootstrap secret that is never hardcoded, returned, persisted in control state or logged; missing/invalid configuration fails closed. | 100% of setup entry points | startup/unit/API tests plus log and secret scans | yes | P0 | raw generated token is currently logged | disposable local environment; no production secret | FAIL |
| `QB-SEC-02` | Authorization/tenancy | Every setup/auth/admin path enforces actor-action-resource-tenant with default deny, RLS and auditable allow/deny behavior. | zero unauthorized or cross-tenant success | negative HTTP/database tests | yes | P0 | partial unit evidence only | real PostgreSQL required | NOT_RUN |
| `QB-DATA-01` | Atomicity/idempotency | Empty install creates exactly one consistent tenant/account/unit/admin/role graph; races, failure and retry leave no partial or duplicate state. | all defined invariants under concurrency/failure | PostgreSQL integration tests and state queries | yes | P0 | transaction/lock code exists; no behavioral proof | disposable empty DB; retries disabled | NOT_RUN |
| `QB-AUTH-01` | Session lifecycle | Login, MFA where required, refresh, revocation and expiry remain authoritative across restart and two API instances; replay is rejected. | all success/deny/restart/replay cases | HTTP + PostgreSQL/Redis integration | yes | P0 | security hardening unit tests pass; multi-instance proof absent | real Redis/PostgreSQL required | PARTIAL |
| `QB-CORE-01` | Product core | A scheduled or walk-in visit reaches clinical completion and manual/cash receipt with consistent command, stock, ledger, cash, payment, audit and outbox state. | one complete rejecting vertical journey | PostgreSQL-backed SPA/API E2E with state queries | yes | P0 | active docs report missing cross-domain proof | no external provider required | NOT_RUN |
| `QB-PARITY-01` | Vetus parity | All eleven general and three clinical reference areas pass self-contained journeys without API shortcuts, retries or skips. | 11/11 general and 3/3 clinical | strict parity audit plus durable E2E artifacts | yes | P0 | 0/11 and 0/3; structural coverage 95/100 | current revision and artifacts required | FAIL |
| `QB-UX-01` | UX/accessibility | Critical desktop/mobile flows have loading, empty, error and recovery states and meet WCAG 2.2 AA, including keyboard/focus/target/auth criteria. | no blocking critical-flow violations | automated accessibility plus manual keyboard/responsive review | yes | P1 | no current complete audit | representative viewports and real UI | NOT_RUN |
| `QB-REL-01` | Engineering quality | Build, typecheck, lint, unit, integration and critical E2E are green; meaningful global and changed-code coverage is at least 80%; no required skip/retry hides failure. | every required gate passes | project commands, coverage artifacts and harness mutation check | yes | P0 | API suite 276/277; DB unavailable; strict readiness fails | current dirty revision invalidates old claims | FAIL |
| `QB-OPS-01` | Operations | Deploy/rollback, backup/restore, failover, alerts/traces and agreed performance SLOs pass in an authorized target-like environment. | all approved operational procedures pass | runtime observations and durable external artifacts | yes | P0 release | no current target evidence; runbook conflict | human environment/RTO/RPO authority required | BLOCKED |
| `QB-MKT-01` | Competitive outcome | MVP presents one unified multi-location workspace with contextual patient/client records, automation/charge capture, client communication/portal and comparable reporting/integration extensibility. | critical differentiated workflows are usable, not menu placeholders | product journey review against sourced market matrix | yes | P1 | broad surfaces exist; functional depth unverified | market claims guide priorities, not release proof | NOT_RUN |

## Gauntlet Score

| Dimension | Status | Actual evidence | Target | Confidence | Trend |
| --- | --- | --- | --- | --- | --- |
| Security and identity | FAIL | raw setup token is logged; targeted hardening tests pass | all required security criteria PASS | high | baseline |
| Product core | NOT_RUN | current docs report partial cross-domain flows | complete encounter-to-receipt | high | baseline |
| Vetus parity | FAIL | strict audit reports 0/11 and 0/3 | 11/11 and 3/3 | high | baseline |
| UX/accessibility | NOT_RUN | no current full WCAG/runtime audit | WCAG 2.2 AA critical flows | medium | baseline |
| Engineering quality | FAIL | API 276/277 and readiness strict failure | all gates plus >=80% coverage | high | baseline |
| Operations | BLOCKED | target environment and authority absent | deploy/recovery/SLO evidence | high | baseline |

## Workstreams

| Workstream | Bar IDs | Owner/boundary | Order | Status |
| --- | --- | --- | --- | --- |
| `CVG-001` secure installation-to-session | `QB-SEC-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-AUTH-01`, `QB-UX-01`, `QB-REL-01` | root integrator; setup/auth/tenant/SPA tests | 1 | PARTIAL |
| `CVG-002` encounter-to-receipt | `QB-CORE-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-REL-01` | root integrator; clinical/command/stock/ledger/cash | 2 | READY |
| `CVG-004` strict parity | `QB-PARITY-01`, `QB-UX-01`, `QB-REL-01`, `QB-MKT-01` | unassigned; eleven domain journeys | 3 | TODO |
| provider homologation | `QB-SEC-02`, `QB-REL-01`, `QB-OPS-01`, `QB-MKT-01` | requires human provider/sandbox decisions | 4 | TODO |
| operational certification | `QB-UX-01`, `QB-REL-01`, `QB-OPS-01` | requires authorized target environment | 5 | BLOCKED |

## Rounds

Round 0 completed discovery and froze Quality Bar v1. Rounds 1-3 delivered local recoverability and credential-bound, database-authoritative MFA login/enrollment state. `QB-AUTH-01` remains PARTIAL because cluster deployment evidence and other session mechanisms are not yet fully certified. The next bounded implementation slice is `CVG-002A`.

## Open Gaps

- Eliminate raw secret logging and the RLS-dependent setup predicate.
- Prove a durable, one-time, atomic installation sentinel and least-privilege bootstrap against real PostgreSQL.
- Certify session refresh/revocation and MFA rollout across two physical replicas and Redis races in a target-like environment.
- Add HTTP/PostgreSQL/Redis/SPA evidence before moving `CVG-001` to VERIFY.

## Stop Decision

- State: ACTIVE
- Reason: Required P0 criteria fail or have not run; target-environment work is externally blocked but local safe work remains.
- Last integrated verification: Not run under the typed ledger.
- Next largest locally actionable gap: eliminate ghost cash with one atomic encounter-to-receipt transaction and reject legacy manual settlement bypasses.
