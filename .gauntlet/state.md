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
| `QB-SEC-01` | Secrets/setup | First access uses an explicit high-entropy bootstrap secret that is never hardcoded, returned, persisted in control state or logged; missing/invalid configuration fails closed. | 100% of setup entry points | startup/unit/API tests plus log and secret scans | yes | P0 | historical audit reported a generated token; current setup helpers fail closed without creating/logging one | disposable local environment; full install/session proof and production secret evidence remain absent | PARTIAL |
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
| Security and identity | PARTIAL | current setup path fails closed and targeted hardening/secret scans pass; complete install/session evidence is absent | all required security criteria PASS | high | improving |
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

Round 0 completed discovery and froze Quality Bar v1. Rounds 1-3 delivered local recoverability and credential-bound, database-authoritative MFA login/enrollment state. Round 4 delivered `CVG-002A`: one tenant-safe PostgreSQL transaction for encounter cash receipt, append-only proof, idempotent recovery, legacy-bypass closure and concurrency guards against cash close/reopen/delete. Round 5 delivered `CVG-002B1`: provider-scoped inbox/idempotency and direct confirmed-PIX settlement with exact cents, tenant/RLS isolation, 13 per-write failpoint rollbacks, concurrency, canonical financial links and no physical cash movement. Round 6 delivered `CVG-002B2a`: durable exact-cents outbound request, fenced synthetic dispatcher, opt-in worker and internal bearer polling API. Round 7 delivered the bounded B2b authenticated parser/fingerprints and expand-only receipt/delivery ingress with RLS/ACL evidence, while an independent review approved only that sub-slice. The recovery continuation then added shared worker UoW, transient retry, audited redrive, bounded takeover, legacy `410`, DLQ exhaustion telemetry and HTTP→PostgreSQL evidence. The current continuation adds the API-key capability boundary, strict JSONB mapping, tenantized usage/rate-limit tables, worker/API ACL, atomic local rate-limit consumption, an operator-facing DLQ surface with audited redrive, replicated-safe `max(...)` observability, a minimum eight-field authentication projection and an explicit fail-closed distributed-rate-limit mode. It still lacks a real SIGKILL matrix, Redis failover/clock-skew drill, SPA, provider and release evidence. `QB-AUTH-01`, `QB-CORE-01` and `QB-REL-01` remain PARTIAL because their broader cluster, product-journey and release criteria are not yet fully certified.

## Open Gaps

- Preserve the current fail-closed setup behavior and prove every setup/install/session entry point against real PostgreSQL/Redis; the prior raw-token/setup-predicate finding is historical and the full criterion remains PARTIAL until that evidence exists.
- Prove a durable, one-time, atomic installation sentinel and least-privilege bootstrap against real PostgreSQL.
- Certify session refresh/revocation and MFA rollout across two physical replicas and Redis races in a target-like environment.
- Add HTTP/PostgreSQL/Redis/SPA evidence before moving `CVG-001` to VERIFY.
- Keep the API-key capability, signed callback, non-interactive principal and bounded consumer connected; then close real process crash/restart and Redis failover/clock-skew evidence, followed by SPA flow, card, stock and the full scheduled/walk-in journey.
- Add a dedicated HTTP-to-UoW-to-PostgreSQL receipt E2E and the remaining critical browser E2E gates.

## Latest bounded checkpoint

`EVT-0072`–`EVT-0090` follow the earlier `EVT-0068`–`EVT-0071` callback, database, principal and consumer checkpoints. The recovery implementation/docs are published through `13dbd01`; the API-key implementation is published in `62db87e`, the DLQ implementation in `35f68fd`, the replicated-observability correction in `1217882` and the prior ledger reconciliation in `d525acc`; this continuation extends that base with the current checkpoint documents, while the design-system tsbuildinfo cache remains excluded. Fresh bounded evidence is worker 54/54, shared transaction context 4/4, API route 4/4, disposable PostgreSQL worker fencing/restart 6/6, service principals/RLS 5/5, HTTP→PostgreSQL legacy/rate-limit 4/4, API-key service 13/13, mapper 4/4, auth helper 3/3, ACL 1/1, fail-closed chaos policy 22/22, DLQ operator 3/3 and OpenAPI 337 paths/390 schemas. Automatic attempts-exhausted promotions now emit safe terminal telemetry and aggregate metrics without unbounded labels; API-key rate-limit consumption is atomic in the local PostgreSQL concurrency proof and the runtime has no silent in-memory fallback when distributed state is required. Real Redis failover/clock-skew remains unproven.

The recovery test uses two independent PostgreSQL pools: A loses its pool after claim and before B1/CAS; B takes over after lease expiry with a new fence and applies B1 once. The HTTP boundary proves owner `410`, foreign-account opaque `404` and direct legacy `200` with exactly one gateway/outbox effect, plus eight concurrent low-limit requests yielding two `201` and six `429` across two API instances. The harness now uses the real PostgreSQL API-key repository and capability; the remaining production gaps are target-like DLQ exercise, Redis failover/clock-skew, real SIGKILL/restart evidence and the broader release gates.

The callback/worker slice remains below the `VERIFIED` bar: a real SIGKILL/process restart matrix, Redis failover/clock-skew exercise, provider, SPA, Vetus parity, WCAG, operations and release gates remain open. The local DLQ endpoint, runbook and alert/dashboard are implemented, but target scrape/failover exercise remains open. No quality-bar dimension is promoted by this checkpoint.

## Stop Decision

- State: ACTIVE
- Reason: Required P0 criteria fail or have not run; target-environment work is externally blocked but local safe work remains.
- Last integrated verification: B2b parser/ingress checkpoint `VFY-CVG-002B2B-PARSER-INGRESS-001` passed focused 77/77, PostgreSQL ingress 11/11, B1 18/18 and B2a 33/33 with independent APPROVE; B2a's VERIFIED gate still records coverage 1.646/1.646 at 83% lines/80,3% branches plus typecheck/lint, OpenAPI, RLS, dependency/secret scans and independent review PASS. Earlier SPA 1.001/1.001 evidence remains bounded and current.
- Next largest locally actionable gap: prove real SIGKILL/restart and Redis failover/clock-skew under the now fail-closed policy; rerun bounded regressions if behavior changes. Coherent SPA remains separate `B2c` work.

## Documentation continuation — 2026-08-23

The short resumption pointer is
`docs/2026-08-23-checkpoint-continuacao.md`. The complete `docs/` inventory was
re-audited at 1,447 files and the active control plane now points to the same
`CVG-002B2B` operational next slice. This is documentation reconciliation only:
the Quality Bar remains frozen, `CVG-002B2B` remains `IN_PROGRESS/PARTIAL`, and
no production, provider, SPA, parity or release criterion is promoted.

## Incremento 2026-08-23 — PIX settlement DLQ

Implemented a bounded operator-facing slice for the terminal PIX settlement
queue. `GET /internal/pix-settlement/deliveries` is sanitized and tenant-scoped;
`POST .../:deliveryId/redrive` is permissioned, validated and opaque on
cross-tenant/non-terminal misses. Migration `0114` adds a non-login capability
and an atomic `SECURITY DEFINER` function that resets only the delivery and
appends the audit event in the same transaction. API/worker ACL surfaces,
OpenAPI, Prometheus alert, Grafana panel and runbook are aligned.

Implementation `35f68fd` and replicated-observability correction `1217882` are
published to `origin/agent/sync-v4-full-program`. Fresh evidence: route 4/4;
disposable PostgreSQL DLQ/ACL 3/3 (durable backlog
1→0 after redrive); runtime role contract 9/9; worker 54/54; alert alignment
4/4; API/DB/worker builds, OpenAPI 337/390, Helm static checks, YAML/JSON
parsers and shell syntax PASS. The alert/panel use the current DB-backed gauge
`worker_pix_provider_settlement_reconciliation_required` with `max(...)` across
replicated full-account observers; direct 404/503
envelopes include the request correlation ID required by OpenAPI. This reduces
the operational black hole but does not promote any Quality Bar dimension.
`CVG-002B2B` remains `IN_PROGRESS/PARTIAL`; the next gaps are real
SIGKILL/restart and Redis failover/clock-skew evidence under the now
fail-closed policy, followed by B2c/SPA, provider, Vetus parity, WCAG and
release evidence.

## Handoff final — 23/08/2026, 02:08 BRT

O estado remoto de base antes deste handoff era `d525acc` e o checkpoint
documental foi publicado em `76f7ec5`; o checker canônico retornou 11 PASS, 1
WARN histórico e 0 FAIL. O único dirty path permitido é o cache
`packages/design-system/tsconfig.vue.tsbuildinfo`. A próxima sessão deve ler
`docs/2026-08-23-checkpoint-continuacao.md` e executar a ação concreta já
registrada no `.agent/state.json`; não repetir o slice DLQ nem promover gates
ERP, provider, SPA, paridade, WCAG ou release.

## Incremento 23/08/2026 — principal mínimo e fail-closed

O caminho pré-contexto de API key agora usa uma projeção mínima de oito campos,
com `GRANT` e `RETURNS TABLE` estreitos na migration `0113`; o mapper dedicado
e a ACL PostgreSQL passaram. O runtime não mascara indisponibilidade do Redis
distribuído: expõe `fail-closed`, marca `productionReady=false` e retorna
`503 RATE_LIMIT_UNAVAILABLE`, sem contador em memória por réplica.

Evidência fresca e limitada: duas instâncias HTTP no mesmo PostgreSQL passaram
4/4, com oito requests produzindo 2×201 e 6×429; política de caos 22/22,
auth-helper 3/3, module PIX 8/8, B1 command 17/17, B2a 33/33, ingress 11/11 e
callback HTTP 13/13. O artefato detalhado é
`.agent/artifacts/CVG-002B2B-api-key-principal-rate-limit-2026-08-23.md`.
O gate não sobe: SIGKILL/restart de processo, Redis failover/clock-skew real,
provider, SPA, paridade, WCAG, operações alvo e release permanecem abertos.
