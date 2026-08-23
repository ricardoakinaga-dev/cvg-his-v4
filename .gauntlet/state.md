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
| `QB-CORE-01` | Product core | A scheduled or walk-in visit reaches clinical completion and manual/cash receipt with consistent command, stock, ledger, cash, payment, audit and outbox state. | one complete rejecting vertical journey | PostgreSQL-backed SPA/API E2E with state queries | yes | P0 | atomic cash receipt and direct confirmed-PIX DB-core sub-slices passed PostgreSQL/RLS, rollback, replay and concurrency tests; inventory, provider boundary, card and full SPA/API journey remain | no external provider required | PARTIAL |
| `QB-PARITY-01` | Vetus parity | All eleven general and three clinical reference areas pass self-contained journeys without API shortcuts, retries or skips. | 11/11 general and 3/3 clinical | strict parity audit plus durable E2E artifacts | yes | P0 | 0/11 and 0/3; structural coverage 95/100 | current revision and artifacts required | FAIL |
| `QB-UX-01` | UX/accessibility | Critical desktop/mobile flows have loading, empty, error and recovery states and meet WCAG 2.2 AA, including keyboard/focus/target/auth criteria. | no blocking critical-flow violations | automated accessibility plus manual keyboard/responsive review | yes | P1 | no current complete audit | representative viewports and real UI | NOT_RUN |
| `QB-REL-01` | Engineering quality | Build, typecheck, lint, unit, integration and critical E2E are green; meaningful global and changed-code coverage is at least 80%; no required skip/retry hides failure. | every required gate passes | project commands, coverage artifacts and harness mutation check | yes | P0 | B1 18/18, B2a 33/33, B2b ingress 11/11 and focused 77/77 are fresh; earlier SPA 1.001/1.001 remains current, while critical E2E, dedicated worker coverage and all release gates remain | current checkpoint evidence; not a release verdict | PARTIAL |
| `QB-OPS-01` | Operations | Deploy/rollback, backup/restore, failover, alerts/traces and agreed performance SLOs pass in an authorized target-like environment. | all approved operational procedures pass | runtime observations and durable external artifacts | yes | P0 release | no current target evidence; runbook conflict | human environment/RTO/RPO authority required | BLOCKED |
| `QB-MKT-01` | Competitive outcome | MVP presents one unified multi-location workspace with contextual patient/client records, automation/charge capture, client communication/portal and comparable reporting/integration extensibility. | critical differentiated workflows are usable, not menu placeholders | product journey review against sourced market matrix | yes | P1 | broad surfaces exist; functional depth unverified | market claims guide priorities, not release proof | NOT_RUN |

## Gauntlet Score

| Dimension | Status | Actual evidence | Target | Confidence | Trend |
| --- | --- | --- | --- | --- | --- |
| Security and identity | FAIL | raw setup token is logged; targeted hardening tests pass | all required security criteria PASS | high | baseline |
| Product core | PARTIAL | atomic cash and direct confirmed-PIX cores create their scoped payment/journal/proof/audit/outbox effects consistently; inventory, provider boundary, card and broader journey remain | complete encounter-to-receipt | high | improving |
| Vetus parity | FAIL | strict audit reports 0/11 and 0/3 | 11/11 and 3/3 | high | baseline |
| UX/accessibility | NOT_RUN | no current full WCAG/runtime audit | WCAG 2.2 AA critical flows | medium | baseline |
| Engineering quality | PARTIAL | API/SPA/typecheck/coverage and CVG-002A integration pass; critical E2E/release suite not complete | all gates plus >=80% coverage | high | improving |
| Operations | BLOCKED | target environment and authority absent | deploy/recovery/SLO evidence | high | baseline |

## Workstreams

| Workstream | Bar IDs | Owner/boundary | Order | Status |
| --- | --- | --- | --- | --- |
| `CVG-001` secure installation-to-session | `QB-SEC-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-AUTH-01`, `QB-UX-01`, `QB-REL-01` | root integrator; setup/auth/tenant/SPA tests | 1 | PARTIAL |
| `CVG-002` encounter-to-receipt | `QB-CORE-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-REL-01` | root integrator; clinical/command/stock/ledger/cash | 2 | PARTIAL |
| `CVG-004` strict parity | `QB-PARITY-01`, `QB-UX-01`, `QB-REL-01`, `QB-MKT-01` | unassigned; eleven domain journeys | 3 | TODO |
| provider homologation | `QB-SEC-02`, `QB-REL-01`, `QB-OPS-01`, `QB-MKT-01` | requires human provider/sandbox decisions | 4 | TODO |
| operational certification | `QB-UX-01`, `QB-REL-01`, `QB-OPS-01` | requires authorized target environment | 5 | BLOCKED |

## Rounds

Round 0 completed discovery and froze Quality Bar v1. Rounds 1-3 delivered local recoverability and credential-bound, database-authoritative MFA login/enrollment state. Round 4 delivered `CVG-002A`: one tenant-safe PostgreSQL transaction for encounter cash receipt, append-only proof, idempotent recovery, legacy-bypass closure and concurrency guards against cash close/reopen/delete. Round 5 delivered `CVG-002B1`: provider-scoped inbox/idempotency and direct confirmed-PIX settlement with exact cents, tenant/RLS isolation, 13 per-write failpoint rollbacks, concurrency, canonical financial links and no physical cash movement. Round 6 delivered `CVG-002B2a`: durable exact-cents outbound request, fenced synthetic dispatcher, opt-in worker and internal bearer polling API. Round 7 delivered the bounded B2b authenticated parser/fingerprints and expand-only receipt/delivery ingress with RLS/ACL evidence, while an independent review approved only that sub-slice. The current continuation slice adds HTTP→PostgreSQL evidence, service-principal identity metadata/login exclusions, runtime ACL/RLS and a fenced B1 consumer, but still lacks the shared worker UoW, real worker-role query proof, transient retry policy, restart/takeover/redrive, legacy `410`, SPA, provider and release evidence. `QB-AUTH-01`, `QB-CORE-01` and `QB-REL-01` remain PARTIAL because their broader cluster, product-journey and release criteria are not yet fully certified.

## Open Gaps

- Eliminate raw secret logging and the RLS-dependent setup predicate.
- Prove a durable, one-time, atomic installation sentinel and least-privilege bootstrap against real PostgreSQL.
- Certify session refresh/revocation and MFA rollout across two physical replicas and Redis races in a target-like environment.
- Add HTTP/PostgreSQL/Redis/SPA evidence before moving `CVG-001` to VERIFY.
- Connect the verified direct PIX core to the signed socket callback, the now-implemented non-interactive service principal and bounded consumer; then close the shared worker UoW, restart/takeover/redrive, legacy `410`, SPA flow, card, stock and the full scheduled/walk-in journey.
- Add a dedicated HTTP-to-UoW-to-PostgreSQL receipt E2E and the remaining critical browser E2E gates.

## Latest bounded checkpoint

`EVT-0055/EVT-0056/EVT-0057/EVT-0058/EVT-0059` hardened the explicit non-production synthetic PIX HTTP callback and recorded fresh bounded evidence: shared-config 32/32, verifier/keyring 35/35, startup 6/6, raw `node:http`/`node:net` integration 13/13, and OpenAPI 334 paths/385 schemas. `EVT-0060`–`EVT-0065` then added HTTP→PostgreSQL 2/2, service-principal migration/schema 5/5 + 3/3, auth guards 7/7 plus users/auth regressions, runtime ACL 8/8, and worker consumer 6/6 + PostgreSQL 3/3 + worker 47/47. The callback/worker slice is still below the `VERIFIED` bar because shared UoW, real worker-role query, transient retry, restart/takeover/redrive, legacy `410`, provider, SPA and release gates remain open. No quality-bar dimension is promoted by this checkpoint.

## Stop Decision

- State: ACTIVE
- Reason: Required P0 criteria fail or have not run; target-environment work is externally blocked but local safe work remains.
- Last integrated verification: B2b parser/ingress checkpoint `VFY-CVG-002B2B-PARSER-INGRESS-001` passed focused 77/77, PostgreSQL ingress 11/11, B1 18/18 and B2a 33/33 with independent APPROVE; B2a's VERIFIED gate still records coverage 1.646/1.646 at 83% lines/80,3% branches plus typecheck/lint, OpenAPI, RLS, dependency/secret scans and independent review PASS. Earlier SPA 1.001/1.001 evidence remains bounded and current.
- Next largest locally actionable gap: extract/verify the shared fenced settlement UoW under the read-only worker role, then add transient retry, restart/takeover/redrive and legacy `410`; coherent SPA remains separate `B2c` work.
