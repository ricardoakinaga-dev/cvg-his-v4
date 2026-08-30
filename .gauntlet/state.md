# Gauntlet State

## Goal

Deliver a behaviorally proven Premium Enterprise veterinary ERP MVP with secure multi-tenancy, the complete clinical-to-financial backbone, Vetus parity, accessible enterprise UX, provider-grade integrations and target-environment operational evidence.

## Quality Bar Control

- Current version: v1
- Frozen before implementation: yes, 2026-08-22, after complete corpus synthesis plus independent planning, TDD and security reviews for `CVG-001`
- Revision log: None. Record the old criterion, new criterion, reason, and evidence before grading a revision.

## Quality Bar

| ID             | Dimension             | Criterion                                                                                                                                                                                            | Target                                                              | Evidence method                                                 | Required | Priority   | Baseline                                                                                                                                                                                          | Validity notes                                                                                        | Status  |
| -------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| `QB-SEC-01`    | Secrets/setup         | First access uses an explicit high-entropy bootstrap secret that is never hardcoded, returned, persisted in control state or logged; missing/invalid configuration fails closed.                     | 100% of setup entry points                                          | startup/unit/API tests plus log and secret scans                | yes      | P0         | historical audit reported a generated token; current setup helpers fail closed without creating/logging one                                                                                       | disposable local environment; full install/session proof and production secret evidence remain absent | PARTIAL |
| `QB-SEC-02`    | Authorization/tenancy | Every setup/auth/admin path enforces actor-action-resource-tenant with default deny, RLS and auditable allow/deny behavior.                                                                          | zero unauthorized or cross-tenant success                           | negative HTTP/database tests                                    | yes      | P0         | partial unit evidence only                                                                                                                                                                        | real PostgreSQL required                                                                              | NOT_RUN |
| `QB-DATA-01`   | Atomicity/idempotency | Empty install creates exactly one consistent tenant/account/unit/admin/role graph; races, failure and retry leave no partial or duplicate state.                                                     | all defined invariants under concurrency/failure                    | PostgreSQL integration tests and state queries                  | yes      | P0         | transaction/lock code exists; no behavioral proof                                                                                                                                                 | disposable empty DB; retries disabled                                                                 | NOT_RUN |
| `QB-AUTH-01`   | Session lifecycle     | Login, MFA where required, refresh, revocation and expiry remain authoritative across restart and two API instances; replay is rejected.                                                             | all success/deny/restart/replay cases                               | HTTP + PostgreSQL/Redis integration                             | yes      | P0         | security hardening unit tests pass; multi-instance proof absent                                                                                                                                   | real Redis/PostgreSQL required                                                                        | PARTIAL |
| `QB-CORE-01`   | Product core          | A scheduled or walk-in visit reaches clinical completion and manual/cash receipt with consistent command, stock, ledger, cash, payment, audit and outbox state.                                      | one complete rejecting vertical journey                             | PostgreSQL-backed SPA/API E2E with state queries                | yes      | P0         | atomic cash receipt and direct confirmed-PIX DB-core sub-slices passed PostgreSQL/RLS, rollback, replay and concurrency tests; inventory, provider boundary, card and full SPA/API journey remain | no external provider required                                                                         | PARTIAL |
| `QB-PARITY-01` | Vetus parity          | All eleven general and three clinical reference areas pass self-contained journeys without API shortcuts, retries or skips.                                                                          | 11/11 general and 3/3 clinical                                      | strict parity audit plus durable E2E artifacts                  | yes      | P0         | 0/11 and 0/3; structural coverage 95/100                                                                                                                                                          | current revision and artifacts required                                                               | FAIL    |
| `QB-UX-01`     | UX/accessibility      | Critical desktop/mobile flows have loading, empty, error and recovery states and meet WCAG 2.2 AA, including keyboard/focus/target/auth criteria.                                                    | no blocking critical-flow violations                                | automated accessibility plus manual keyboard/responsive review  | yes      | P1         | no current complete audit                                                                                                                                                                         | representative viewports and real UI                                                                  | NOT_RUN |
| `QB-REL-01`    | Engineering quality   | Build, typecheck, lint, unit, integration and critical E2E are green; meaningful global and changed-code coverage is at least 80%; no required skip/retry hides failure.                             | every required gate passes                                          | project commands, coverage artifacts and harness mutation check | yes      | P0         | B1 18/18, B2a 33/33, B2b ingress 11/11 and focused 77/77 are fresh; earlier SPA 1.001/1.001 remains current, while critical E2E, dedicated worker coverage and all release gates remain           | current checkpoint evidence; not a release verdict                                                    | PARTIAL |
| `QB-OPS-01`    | Operations            | Deploy/rollback, backup/restore, failover, alerts/traces and agreed performance SLOs pass in an authorized target-like environment.                                                                  | all approved operational procedures pass                            | runtime observations and durable external artifacts             | yes      | P0 release | no current target evidence; runbook conflict                                                                                                                                                      | human environment/RTO/RPO authority required                                                          | BLOCKED |
| `QB-MKT-01`    | Competitive outcome   | MVP presents one unified multi-location workspace with contextual patient/client records, automation/charge capture, client communication/portal and comparable reporting/integration extensibility. | critical differentiated workflows are usable, not menu placeholders | product journey review against sourced market matrix            | yes      | P1         | broad surfaces exist; functional depth unverified                                                                                                                                                 | market claims guide priorities, not release proof                                                     | NOT_RUN |

## Current quality-bar reconciliation — CVG-001 setup browser evidence — 2026-08-25

The original table rows above are retained as the frozen baseline. The current
statuses below supersede the stale `NOT_RUN` notes for the rows exercised by the
latest bounded slice:

| Bar          | Current status | Evidence and remaining boundary                                                                                                                                                   |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QB-SEC-02`  | `PARTIAL`      | Fresh PostgreSQL/two-API setup negative HTTP matrix, installer capability ACL and database isolation fixtures pass; all admin paths and target RLS/FORCE RLS catalog remain open. |
| `QB-DATA-01` | `PARTIAL`      | Fresh install creates one durable graph, propagates the sentinel across two APIs and rejects a second setup; concurrent install/failure/failpoint invariants remain open.         |
| `QB-UX-01`   | `PARTIAL`      | Built-SPA wizard passes keyboard/focus/form naming and axe WCAG 2A/2AA in 2/2 tests; broader critical desktop/mobile flows remain open.                                           |

## Gauntlet Score

| Dimension             | Status  | Actual evidence                                                                                                                                                                       | Target                              | Confidence | Trend     |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------- | --------- |
| Security and identity | PARTIAL | current setup path fails closed and targeted hardening/secret scans pass; complete install/session evidence is absent                                                                 | all required security criteria PASS | high       | improving |
| Product core          | PARTIAL | atomic cash and direct confirmed-PIX cores create their scoped payment/journal/proof/audit/outbox effects consistently; inventory, provider boundary, card and broader journey remain | complete encounter-to-receipt       | high       | improving |
| Vetus parity          | FAIL    | strict audit reports 0/11 and 0/3                                                                                                                                                     | 11/11 and 3/3                       | high       | baseline  |
| UX/accessibility      | NOT_RUN | no current full WCAG/runtime audit                                                                                                                                                    | WCAG 2.2 AA critical flows          | medium     | baseline  |
| Engineering quality   | PARTIAL | API/SPA/typecheck/coverage and CVG-002A integration pass; critical E2E/release suite not complete                                                                                     | all gates plus >=80% coverage       | high       | improving |
| Operations            | BLOCKED | target environment and authority absent                                                                                                                                               | deploy/recovery/SLO evidence        | high       | baseline  |

## Workstreams

| Workstream                               | Bar IDs                                                                       | Owner/boundary                                      | Order | Status  |
| ---------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ----- | ------- |
| `CVG-001` secure installation-to-session | `QB-SEC-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-AUTH-01`, `QB-UX-01`, `QB-REL-01` | root integrator; setup/auth/tenant/SPA tests        | 1     | PARTIAL |
| `CVG-002` encounter-to-receipt           | `QB-CORE-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-REL-01`                          | root integrator; clinical/command/stock/ledger/cash | 2     | PARTIAL |
| `CVG-004` strict parity                  | `QB-PARITY-01`, `QB-UX-01`, `QB-REL-01`, `QB-MKT-01`                          | unassigned; eleven domain journeys                  | 3     | TODO    |
| provider homologation                    | `QB-SEC-02`, `QB-REL-01`, `QB-OPS-01`, `QB-MKT-01`                            | requires human provider/sandbox decisions           | 4     | TODO    |
| operational certification                | `QB-UX-01`, `QB-REL-01`, `QB-OPS-01`                                          | requires authorized target environment              | 5     | BLOCKED |

## Rounds

Round 0 completed discovery and froze Quality Bar v1. Rounds 1-3 delivered local recoverability and credential-bound, database-authoritative MFA login/enrollment state. Round 4 delivered `CVG-002A`: one tenant-safe PostgreSQL transaction for encounter cash receipt, append-only proof, idempotent recovery, legacy-bypass closure and concurrency guards against cash close/reopen/delete. Round 5 delivered `CVG-002B1`: provider-scoped inbox/idempotency and direct confirmed-PIX settlement with exact cents, tenant/RLS isolation, 13 per-write failpoint rollbacks, concurrency, canonical financial links and no physical cash movement. Round 6 delivered `CVG-002B2a`: durable exact-cents outbound request, fenced synthetic dispatcher, opt-in worker and internal bearer polling API. Round 7 delivered the bounded B2b authenticated parser/fingerprints and expand-only receipt/delivery ingress with RLS/ACL evidence, while an independent review approved only that sub-slice. The recovery continuation then added shared worker UoW, transient retry, audited redrive, bounded takeover, legacy `410`, DLQ exhaustion telemetry and HTTP→PostgreSQL evidence. The current continuation adds the API-key capability boundary, strict JSONB mapping, tenantized usage/rate-limit tables, worker/API ACL, atomic local rate-limit consumption, an operator-facing DLQ surface with audited redrive, replicated-safe `max(...)` observability, a minimum eight-field authentication projection and an explicit fail-closed distributed-rate-limit mode. It still lacks a real SIGKILL matrix, Redis failover/clock-skew drill, SPA, provider and release evidence. `QB-AUTH-01`, `QB-CORE-01` and `QB-REL-01` remain PARTIAL because their broader cluster, product-journey and release criteria are not yet fully certified.

## Open Gaps

The older bullets in this section remain useful history, but the current
decision is that setup already has bounded PostgreSQL/HTTP and built-SPA
evidence. The remaining CVG-001 work is to extend that proof to all auth/admin
paths, shared Redis/failover and broader critical browser journeys.

- Preserve the current fail-closed setup behavior and prove every setup/install/session entry point against real PostgreSQL/Redis; the prior raw-token/setup-predicate finding is historical and the full criterion remains PARTIAL until that evidence exists.
- Prove a durable, one-time, atomic installation sentinel and least-privilege bootstrap against real PostgreSQL.
- Certify session refresh/revocation and MFA rollout across two physical replicas and Redis races in a target-like environment.
- Add HTTP/PostgreSQL/Redis/SPA evidence before moving `CVG-001` to VERIFY.
- Keep the API-key capability, signed callback, non-interactive principal and bounded consumer connected; then close real process crash/restart and Redis failover/clock-skew evidence, followed by SPA flow, card, stock and the full scheduled/walk-in journey.
- Add a dedicated HTTP-to-UoW-to-PostgreSQL receipt E2E and the remaining critical browser E2E gates.

## Latest bounded checkpoint — DB-002 stale migration artifacts — 2026-08-25

`EVT-0316`–`EVT-0318` extend DB-001 after a scout identified stale source
companions. The RED contract first reproduced `migrate.js`, then the expanded
contract reproduced `migrate.d.ts`; the GREEN removes the five source-level
stale artifacts (`migrate.js`, three `.d.ts`/`.map` companions and
`drizzle.config.ts`) while keeping `packages/db/src/migrate.ts` as the sole
source runner and `packages/db/dist/migrate.js` as generated Compose/Helm
output. `pnpm validate:migration-source`, the focused migration/CI suite
15/15, both database builds, generated runner syntax and the active-consumer
scan passed; SQL migration trees were unchanged. `EVT-0319` then confirmed full
workspace typecheck and lint 70/70 plus control-plane JSON/JSONL parsing and
diff checks. Hegel independently approved the extension with E conditional only
for dirty/untracked persistence. This remains dirty local evidence; the support closure,
tests and docs are untracked/unstaged until explicit publication authority.
Target RLS/FORCE RLS, positive staging migration, restore/RTO-RPO, remote CI,
providers, Redis, parity, WCAG, coverage, operations and release remain open.

## Previous bounded checkpoint — DB-001 migration source — 2026-08-25

`EVT-0312`–`EVT-0314` extend the previous API persistence/RLS checkpoint with DB-001. The canonical migration/seed rail is `packages/db/src/migrate.ts` + `src/seed.ts`; `packages/shared/database` remains a runtime client and historical SQL holder, while its executable `db:*` commands fail closed. `pnpm validate:migration-source` passed, the focused guardrail/CI contracts passed 5/5, both database packages built, the canonical consumers in CI/Compose/Helm/cutover/test bootstrap were verified, and Aristotle independently approved the bar without P0/P1 findings. The migration source is bounded local evidence; a positive new migration in staging, target RLS/FORCE RLS, representative restore/RTO-RPO, remote CI, provider, Redis, parity, WCAG, coverage, operations and release remain unproven. The tracked `packages/db/src/migrate.js` and historical config remain a separate residual task.

## Previous bounded checkpoint — API-key/worker and clinical continuations

The recovery test uses two independent PostgreSQL pools: A loses its pool after claim and before B1/CAS; B takes over after lease expiry with a new fence and applies B1 once. The HTTP boundary proves owner `410`, foreign-account opaque `404` and direct legacy `200` with exactly one gateway/outbox effect, plus eight concurrent low-limit requests yielding two `201` and six `429` across two API instances. The harness now uses the real PostgreSQL API-key repository and capability; the remaining production gaps are target-like DLQ exercise, Redis failover/clock-skew, real SIGKILL/restart evidence and the broader release gates.

The callback/worker slice remains below the `VERIFIED` bar: a real SIGKILL/process restart matrix, Redis failover/clock-skew exercise, provider, SPA, Vetus parity, WCAG, operations and release gates remain open. The local DLQ endpoint, runbook and alert/dashboard are implemented, but target scrape/failover exercise remains open. No quality-bar dimension is promoted by this checkpoint.

## Stop Decision

- State: ACTIVE
- Reason: Required P0 criteria fail or have not run; target-environment work is externally blocked but local safe work remains.
- Last integrated verification: `VFY-CVG-002C6-DB-SOURCE-ARTIFACT-FINAL-001` passed the final local guard/test/build/typecheck/lint/control-plane checks; `VFY-CVG-002C6-DB-SOURCE-ARTIFACT-REVIEW-001` independently approved DB-002-A–D and left E conditional only for dirty/untracked persistence. The preceding API persistence/RLS fixture remained green at 371/371 including database-persistence 17/17.
- Next largest locally actionable gap: repeat the consolidated Owner→Patient→Encounter→care→inpatient→billing→stock→receipt proof and RLS/roles catalog in the authorized target environment, then execute representative restore/RTO-RPO. Keep real Redis failover/clock-skew, provider, parity, WCAG, coverage, operations and release gates open; retain the diagnostics injected-client compatibility observation, migration-positive-staging gap, stale-artifact publication boundary and user-owned tsbuildinfo cache as bounded follow-up risks.

## Local security gate — CVG-001 startup fail-closed (23/08/2026)

The confirmed staging/stage bootstrap fail-open was corrected before the next
clinical RED. API and worker use the shared production-like classifier for
`production`, `prod`, `staging` and `stage`; process `NODE_ENV`, explicit
bootstrap environment and `DATABASE_REQUIRE_RLS_ROLE`/
`DATABASE_REQUIRE_SCHEMA` are monotonic. Missing/unavailable DB, unsafe role,
incomplete delivery schema, mixed repositories or missing UoW now abort before
API listen or worker loop. Evidence: API bootstrap 18/18, shared-config 40/40,
worker 62, API package 331/331, typecheck/build/diff check PASS, independent
security review PASS for this scope. The ERP and all global bars remain
`IN_PROGRESS/PARTIAL`; schema/role doubles, process harness, the single
admission-to-receipt journey, RLS NOBYPASSRLS, failpoints/restart, SPA and
release gates remain open.

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

## Checkpoint 2026-08-23 — SIGKILL/restart independente

O contrato de checkpoints do settlement consumer foi implementado com contexto
imutável e o harness passou a iniciar A/B como PIDs Node distintos. A matriz
parametrizada passou `4/4` em `after_claim_commit`, `before_b1`,
`after_b1_before_cas` e `after_applied_cas`, usando `SIGKILL` real, lease/fence
no mesmo PostgreSQL descartável e provider `local-pix` sintético. Em cada caso
foram observados `/ready` e `/metrics` em A e B e consultado o estado final:
uma receipt, billing/attempt settled, PIX completed/applied e delivery applied;
quando o CAS já havia sido aplicado, B retornou `idle`.

Regressões: worker unit/build `58` testes + build, settlement PostgreSQL `6/6`,
B1 `18/18` e callback HTTP/ingress `2/2`. A evidência detalhada está no
Quality Bar `.agent/artifacts/CVG-002B2B-sigkill-restart-quality-bar-2026-08-23.md`.
O resultado não promove o ERP: Redis failover/clock-skew, provider, SPA/B2c,
paridade, WCAG, target operations e release continuam abertos. A próxima
fatia de produto é `internação -> handoff/permanência -> diária -> item
cobrável`, ainda somente como planejamento.

Crítica independente anterior delimitou o bar: naquele momento o race stale
pós-takeover com A vivo ainda não estava provado no boundary de processos. O
caso foi adicionado e passou no checkpoint mais recente; a matriz ainda não
conta cada linha de journal/outbox/inbox e o fixture não replica a semântica
completa de readiness do worker principal. O controle de checkpoint foi movido
para fd 3 dedicado e o provider sintético recebeu guard `NODE_ENV=test` +
marcador explícito, fora do build de produção.

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

Publicação confirmada em `099ac2a1ff5f1ed9f74812d2466dccb42681737d` no branch
`origin/agent/sync-v4-full-program`. A revisão independente
`VFY-CVG-002B2B-REVIEW-001` aprovou o slice sem bloqueadores médios ou maiores;
os dois listeners HTTP no mesmo processo continuam explicitamente limitados e
não substituem SIGKILL/restart ou failover Redis.

## Auditoria de continuidade — 23/08/2026, 03:13 BRT

O estado canônico foi rechecado antes desta onda documental: `HEAD` e `origin`
estavam alinhados em `4a5ead11e7809dfecd50b607df2e7dee99c2b3d3`, o checker
retornou 11 PASS, 1 WARN histórico e 0 FAIL, e apenas o cache user-owned do
design-system estava dirty.

O maior gap local foi refinado para um contrato de processo, não apenas de
conexão: o takeover por pool (`6/6`) prova lease/fence, mas não `SIGKILL`. O
settlement consumer deve receber checkpoints nos quatro boundaries críticos e
um harness com dois processos independentes deve matar/reiniciar o worker,
provar exatamente uma aplicação B1 e observar readiness/metrics. O artefato
executável é `.agent/artifacts/CVG-002B2B-process-restart-and-erp-slices-2026-08-23.md`.

O benchmark também deixou documentada a primeira jornada clínica-financeira
posterior: internação, handoff/permanência, diária idempotente e item cobrável,
sem invadir o slice PIX. Isso é decomposição de backlog, não evidência de
prontidão. `CVG-002B2B`, `CVG-002` e todos os gates de provider, SPA, paridade,
WCAG, operações e release permanecem `IN_PROGRESS/PARTIAL` ou abertos.

## Current continuation — 23/08/2026

The process stale-fence gap is now proven at the bounded process boundary. A
remains alive after its lease expires, B claims with `lease_version=2`, A is
released first and returns `lease_lost` before `before_b1`, and B then applies
the settlement once. The independent-process suite is `5/5` across the four
SIGKILL checkpoints plus the live stale takeover. This remains disposable
PostgreSQL/`local-pix` evidence; the main worker readiness contract, detailed
journal/outbox/inbox accounting, Redis failover/clock-skew and real provider
remain outside the bar.

The first non-PIX clinical-financial boundary is implemented as an idempotent
inpatient daily-charge source item. Migration `0115`, Drizzle schema, OpenAPI,
route, repository and service agree on tenant-scoped provenance. Replays return
the existing item, divergent links conflict, duplicate source inserts converge,
and two runtimes also converge when the billing record itself is created for the
first time. Fresh evidence is route `10/10`, inpatient `17/17`, billing `16/16`,
PostgreSQL integration `2/2`, API `324/324`, worker `58` plus build and DB/API/
module builds. The detailed local bar is
`.agent/artifacts/CVG-002C-inpatient-daily-billing-idempotency-2026-08-23.md`.

The Quality Bar remains frozen and the ERP remains `IN_PROGRESS/PARTIAL`.
Next largest local action is Redis failover/clock-skew under the explicit
fail-closed policy, followed by the full admission → handoff/stay → daily
charge → discharge → item/receipt journey. B2c/SPA, provider, Vetus parity,
WCAG, target operations, coverage and release remain separate gates.

## Iteração seguinte — cutoff de alta e fail-closed (23/08/2026)

O round seguinte executou Redis local `21/21`, incluindo atomicidade, `TIME` do
Redis sob clock skew, deadline bounded e recuperação de cliente falho. O RED
PostgreSQL mostrou que SQL direto ainda inseria filhos depois de uma stay
discharged; migration `0116` agora rejeita progress, occurrences, daily charges
e inventory consumption de `inpatient_stay`. A prova PostgreSQL descartável
passou `2/2`; o login HTTP fail-closed passou `1/1`; builds de API/DB/chaos e
secrets scan passaram.

O PostgreSQL compartilhado entrou em recovery por acúmulo de bases efêmeras e
foi deixado intacto. O ERP continua `IN_PROGRESS/PARTIAL`. Próximo round:
RED de rollback entre billing item e daily charge, seguido da jornada
admission → handoff → inventory → discharge → receipt/ledger/audit/outbox.

Implementation checkpoint `2b33aea` and pointer reconciliation `432887f` are
published on the branch and origin with the cutoff migration, independent
PostgreSQL proof and control-plane handoff. The next largest local action
remains the billing-item/daily-charge rollback RED, followed by the
clinical-financial UoW/saga.

## Auditoria documental integral — 23/08/2026, 05:58 BRT

O corpus atual de `docs/` foi enumerado e lido integralmente: 1.449 arquivos,
1.193 textuais, 256 binários, 53.766.604 bytes e manifesto
`d23f84a7000e42943093090e706db12e01a6e4189f61f5bd833f67b5e92ea2db`. O
benchmark web atualizado preserva fontes oficiais e converteu autosave/SOAP,
flowboard, charge capture, estoque auditável, portal, sandbox de API e IA
assistiva governada em requisitos, sem tratá-los como implementação existente.

O Quality Bar continua congelado e o estado continua `ACTIVE`/
`IN_PROGRESS/PARTIAL`. A próxima maior ação local é o RED de rollback entre
`billing.addItem` e `markDailyChargeBilled`, seguido da UoW/saga de admissão até
recebimento com PostgreSQL/RLS, replay, concorrência e failpoint. Paridade Vetus,
SPA/B2c, providers, Redis failover/clock-skew real, WCAG, cobertura, operações,
deploy/restore e release permanecem gates separados.

## Atualização — recibo de caixa HTTP/UoW (23/08/2026, 07:09 BRT)

O commit `3e278c8` fecha a fronteira pública do recibo de caixa de forma
limitada: a rota recebe o `runTenantCommand` real, a idempotência HTTP passa um
payload JSON-safe e `response-buffer.snapshot()` omite opcionais indefinidos.
Rota + buffer passaram `10/10`, helpers HTTP `6/6`, comando PostgreSQL `8/8`,
HTTP/PostgreSQL `1/1`, typecheck da API e diff check.

A crítica independente aprovou sem P0/P1. O P2 restante é a matriz HTTP
cross-tenant A/B com um segundo token; a prova RLS/repository é separada. O
Quality Bar permanece `ACTIVE`/`IN_PROGRESS/PARTIAL` e a próxima ação é essa
matriz seguida da jornada admissão → handoff/permanência → estoque → alta →
billing → recebimento/ledger/auditoria/outbox. Nenhum gate externo foi
promovido.

## Atualização — isolamento HTTP cross-tenant do recibo (23/08/2026, 07:20 BRT)

O P2 residual do boundary de cash receipt foi fechado no commit `0e0163c`.
Uma integração PostgreSQL com segundo tenant/token passou `2/2`: GET do
encounter estrangeiro retorna `404 CASH_RECEIPT_NOT_FOUND`, POST retorna `404
BILLING_RECORD_NOT_FOUND` e não há recibo/idempotência persistidos na conta B.
Somada à prova anterior de commit/replay/conflito, a fronteira HTTP tem agora
isolamento A/B explícito.

O Quality Bar continua `ACTIVE`/`IN_PROGRESS/PARTIAL`. O próximo maior gap é a
jornada clínica-financeira admissão → handoff/permanência → estoque → alta →
billing → recebimento/ledger/auditoria/outbox; Redis failover real, provider,
SPA/B2c, paridade, WCAG, operações, cobertura e release continuam separados.

## Continuidade publicada — diária HTTP/UoW (23/08/2026)

O slice `CVG-002C3` está GREEN no limite publicado de
`POST /inpatient/:stayId/daily-charges/:chargeId/bill`. A rota mantém o replay
de uma diária faturada dentro do tenant command runner e, ao capturar uma
falha, adia a reidratação dos caches até o rollback da UoW HTTP terminar. A
integração PostgreSQL efêmera passou 3/3: commit/replay/conflito, rollback
forçado entre billing item e diária e concorrência same-key convergente. Rota
13/13, module-inpatient 17/17, module-billing 16/16 e API build também
passaram.

O Quality Bar continua `ACTIVE` e o ERP continua `IN_PROGRESS/PARTIAL`. A
próxima execução deve cobrir HTTP A/B da internação e auditoria em falha tardia,
depois admissão → handoff/permanência → estoque → alta → billing →
recebimento/ledger/auditoria/outbox com PostgreSQL/RLS. Redis failover real,
provider, SPA/B2c, paridade Vetus, WCAG, target operations, cobertura e release
continuam gates separados.

O handoff foi publicado em `d355513e82fc0a51b7e4e39e2a93ed3d9daf154d` e o
ponteiro remoto foi confirmado após o push; esta publicação não promove
nenhum gate global.

O stop decision continua `ACTIVE`: a revisão de segurança adicionou um
`HIGH/P0` fail-open de bootstrap em `staging`/`stage` e worker, portanto o
próximo maior gap local é provar startup fail-closed antes do RED clínico.

## Fechamento do próximo gap — internação HTTP A/B e auditoria pós-rollback

O commit `c647db1` fecha a lacuna local seguinte sem promover o Quality Bar.
Uma matriz PostgreSQL efêmera com dois usuários/tenants passou `4/4`: o bearer
de B continua tenant-scoped mesmo com headers de A falsificados, a worklist não
revela a diária de A, e GET/POST cross-tenant retornam `404` sem efeitos
financeiros ou idempotência. A rota de internação passou `14/14` e o
AuditService `19/19`.

O evento de auditoria escrito antes de uma falha tardia não fica mais preso no
cache: a rota agenda a reidratação depois do rollback e executa a consulta fora
do `AsyncLocalStorage` inativo. A implementação permanece limitada ao
`AuditRepository.list` com default de 100 eventos. O ERP continua
`IN_PROGRESS/PARTIAL`; o próximo maior trabalho é a jornada admissão →
handoff/permanência → inventário → alta → billing → recebimento/ledger/
auditoria/outbox, preservando Redis failover real, provider, SPA/B2c, paridade,
WCAG, operações, cobertura e release como gates separados.

## Fechamento local — CVG-002C5 alta HTTP e auditoria (23/08/2026)

O RED de alta que deixava a stay aberta, aceitava rollback e permitia
cross-tenant foi convertido em GREEN com PostgreSQL efêmero. A matriz de duas
instâncias passou `5/5`, incluindo replay, rollback sem discharge/stay/audit/
idempotência/cache, autoridade bearer contra headers falsos, alta
non-inpatient cross-tenant e corrida de chaves distintas em `201` + `409`.

O runtime SQL agora possui `tenantTransaction` explícito mesmo sem
`unitOfWork`; o cache de auditoria reidrata por conta sem o corte legado de 100
eventos, e o contrato OpenAPI de POST/PATCH está alinhado. Audit/discharges
passou `31/31`, as regressões HTTP de diária e cash `6/6`, tenant-command `5/5`
e build/typechecks também passaram.

O Quality Bar permanece `ACTIVE`, e o ERP permanece `IN_PROGRESS/PARTIAL`.
Cursor pagination para grandes históricos, jornada clínica-financeira completa,
Redis failover real, provider, SPA/B2c, paridade Vetus, WCAG, operações,
cobertura e release continuam gates separados.

## Fechamento bounded — CVG-002C6 charge capture (23/08/2026)

O RED inicial confirmou que o consumo inpatient gravava estoque sem gerar
`billing_item`. O commit `ef4ee2d` adiciona preço assistencial separado do
custo, origem `inventory_consumption` idempotente, captura financeira no mesmo
UoW, retry de CAS e trigger SQL tenant/encounter-aware. A suíte HTTP/PostgreSQL
passou `3/3`; o cutoff SQL passou `4/4`; inventory `21/21`; billing `16/16`;
OpenAPI `337/390`; typechecks e audit de dependências passaram.

A revisão final aprovou o slice sem Critical/High/Medium. Isso não promove o
Quality Bar: discharge, cash receipt, journal e outbox ainda não estão no mesmo
fluxo público, e seguem abertos failpoints, conflito same-key, CRUD do preço,
cursor de auditoria, Redis failover, provider, SPA/B2c, paridade Vetus, WCAG,
target operations, cobertura, deploy/restore e release.

## Handoff de auditoria clínica-financeira — 23/08/2026

O handoff dedicado está em
`docs/2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md`, com o artefato
`.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md`. A leitura
mais recente do corpus, antes desses dois arquivos, contou 1.450 arquivos,
1.194 textuais, 256 binários e 53.810.236 bytes. Isso é inventário de
continuidade, não evidência de comportamento.

A crítica independente rejeitou a jornada clínica-financeira completa: a rota
de consumo de estoque ainda não produz charge capture/billing item e não há
um teste público HTTP/PostgreSQL único que ligue admission, handoff,
inventário, diária, alta, recebimento, ledger, auditoria e outbox com
idempotência, concorrência, dois tenants e failpoints. O próximo RED é
`tests/integration/database/inpatient-inventory-charge-capture-http-postgres.test.ts`.
O Quality Bar permanece congelado; nenhum gate global, provider, SPA, parity,
WCAG, target operations ou release foi promovido.

## Continuação bounded — C6-NEXT close → receipt (23/08/2026)

O RED HTTP/PostgreSQL mostrou que o close público ainda não publicava outbox
`encounter.closed` e permitia dois commits em corrida de chaves distintas. O
GREEN adicionou lock `FOR UPDATE`, auditoria/outbox no UoW, recuperação de
cache após rollback e contrato estrito `closeReason`. A integração passou
`4/4`: replay/conflict `200/200/409`, corrida `200/409`, uma timeline/audit/
outbox, receipt settled com cash/journal balanceado e tenant B `404`.

Este é um gate bounded. A jornada completa continua `IN_PROGRESS/PARTIAL`;
outbox por consumo de inventário, failpoints/restart cross-domain, admissão/
handoff e reconciliação global permanecem próximos gaps. Não promover
produção, release ou qualquer gate externo.

## Estado de continuação — C6-NEXT hardening (23/08/2026)

Última iteração local: close → receipt **5/5** com `close_reason` persistido,
rollback de constraint sem cache/timeline/audit/outbox/idempotência fantasma;
inventory charge capture **3/3** com três outbox events e CAS concorrente
verde após reutilização do tenant UoW. Typechecks focados, contracts `43/43` e
OpenAPI `337/390` passaram.

O estado continua `BUILD / VERIFY`, `IN_PROGRESS/PARTIAL`, sem promoção do
ERP/Quality Bar. Antes da publicação: review independente final, checker
canônico, audit, diff check, commit/push e fetch. Depois: failpoints/restart
cross-domain, admission/handoff e reconciliação observável. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` é user-owned e fica fora do
stage.

## Estado atual — composição de consumidores e cartão (23/08/2026, 16:25 BRT)

O worker agora compõe e registra exatamente `payments → billing → webhooks` por
meio do pacote compartilhado `packages/modules/event-consumers`. O bootstrap
exige as tabelas clínicas, financeiras, PIX/cartão, webhooks e inbox/outbox; com
schema completo, o processo real passa `1/1` sob role
`LOGIN NOSUPERUSER NOBYPASSRLS`, incluindo `/live`, ticks, ACL, `SIGKILL`,
restart na mesma porta e `SIGTERM`.

O cartão tem migration `0121`, RLS `ENABLE/FORCE`, FK composta por tenant,
repositório PostgreSQL e testes de SQL parametrizado. `card.completed` foi
fechado contra intent desconhecido, conta/billing divergente e valor/moeda
incompatível; a revisão independente não encontrou Critical/High após a
correção. Billing agora faz leitura autoritativa; webhooks enfileiram delivery
pendente sem HTTP dentro da UoW.

Este é GREEN bounded. Ainda não há fixture de evento real no child process nem
prova PostgreSQL cross-tenant do cartão, retry/DLQ de webhook ou failpoint
cross-domain. O próximo maior gap é executar eventos sob a role restrita e
reconciliar inbox/outbox, settlement, delivery pendente, replay, concorrência e
isolamento A/B. O ERP/Quality Bar global continua `ACTIVE/IN_PROGRESS/PARTIAL`.

Implementação publicada: `b4f93fd5a0d6e62f80739ecac1d9aa4d08a5bef6`; checkpoint
documental publicado: `46490fa87cc5aea724a59a4cb071008bd0990c40`. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece user-owned e fora
do stage. O `HEAD` remoto após esta reconciliação é o ponteiro final da sessão.

O ponteiro final do handoff documental é `720876ec1f5ce30275b1160df7ef5f35c6fb1b0e`;
a implementação bounded está em `adde66b7a1b33333126f4832b3c728abb2db8500`.

Publicação atual: commit `adde66b7a1b33333126f4832b3c728abb2db8500` está em
`origin/agent/sync-v4-full-program` e foi reconciliado com `HEAD`. A próxima
sessão deve começar pelo artefato do worker e pelo residual de consumidores,
sem confundir execução/ACL bounded com readiness de produção.

Follow-up review: sem Critical/High no bounded slice após snapshot de
encounter/timeline/scheduling e guard de contexto transacional; a jornada
vertical completa e a hidratação cross-instance continuam gates abertos.

## Publicação atual — C6-NEXT

O bounded slice foi publicado em `90873f1dfa0ad0e649a8813927d78c66249373b8`;
`git fetch` confirmou igualdade entre `HEAD` e
`origin/agent/sync-v4-full-program`. Retomar pela jornada vertical
inventory → close → receipt com failpoints/restart. Nenhuma alegação de ERP
completo, produção ou release foi promovida; o tsbuildinfo user-owned segue
fora do stage.

## Registro de handoff — 23/08/2026, 12:21 BRT

O handoff curto em `docs/2026-08-23-handoff-sessao-atual.md` é a referência
mais recente para retomar o trabalho. A auditoria independente classificou a
jornada ERP como `REJECT`: não há ainda uma prova única de
admissão→handoff/permanência→inventário→alta→billing→recebimento→ledger/audit/
outbox. A prova de RLS comportamental do slice também precisa de role sem
`BYPASSRLS`; readiness/paridade/OpenAPI continuam indicadores estruturais.

O stop decision permanece `ACTIVE` e `IN_PROGRESS/PARTIAL`. A próxima ação
local é escrever o RED vertical com PostgreSQL descartável, dois tenants,
failpoints/restart, replay/conflito e reconciliação. SPA, providers, Redis
failover, Vetus, WCAG, target operations, cobertura, deploy/restore e release
continuam gates separados.

## Estado atual — 23/08/2026, 16:35 BRT

O gate CVG-001 de bootstrap production-like está GREEN bounded em `6/6` com
PostgreSQL descartável real, role restrita `NOBYPASSRLS`, role insegura,
schema incompleto e subprocessos dos entrypoints reais. Publicação: `25d7aa2`.
Isso cobre somente a fronteira antes de `listen`/loop; não cobre fatal
pós-start, contrato global de RLS/ACL, instalação/sessão ou deploy alvo.

O novo RED vertical público alcança admission → handoff/stay → inventory →
daily → discharge → close → receipt; após correção somente do fixture (billing-
open HTTP, casts `::text`, bearer A→recurso B), a execução passou `4/4`, com
ledger/reconciliation, rollback e isolamento A/B. O resultado é GREEN bounded,
não promoção global. Próxima ação: repetir o mesmo fluxo com role runtime
NOBYPASSRLS, failpoints/restart cross-domain e reconciliação completa. A barra
global continua `ACTIVE/IN_PROGRESS/PARTIAL`.

O checkpoint 4/4 foi publicado em `d25151d96b1f7f0a17e3e08122d263507ec0353d`;
`git fetch` confirmou `HEAD == origin/agent/sync-v4-full-program`, e somente o
tsbuildinfo user-owned permaneceu fora do stage.

## Estado atual — 23/08/2026, 17:28 BRT

CVG-002C6 agora tem GREEN bounded sob role API runtime
`NOSUPERUSER/NOBYPASSRLS`: a vertical passa **5/5** e o restart/replay
controlado passa **1/1**. A função de settlement tem `EXECUTE` apenas em
API/worker e a migration `0120` protege contra shadowing de `pg_temp`; o RED e
o GREEN desse hardening estão documentados no artefato
`.agent/artifacts/CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md`.

Não é promoção global. Próximos gates locais: SIGKILL de processo filho,
failpoints em todas as escritas, worker independente e equivalência Helm. A
barra global permanece `ACTIVE/IN_PROGRESS/PARTIAL`; SPA, providers, Redis,
paridade, WCAG, cobertura, operações, deploy/restore e release continuam
separados. O tsbuildinfo user-owned segue fora do stage.

## Estado atual — worker process boundary (23/08/2026, 17:53 BRT)

O worker agora tem evidência child-process **GREEN bounded** sob PostgreSQL
descartável e role `NOSUPERUSER/NOBYPASSRLS`: `/live`, ticks reais, ACL proibida
vazia antes/depois de `SIGKILL`, restart na mesma porta, `/ready` `503` com
readiness false e `SIGTERM` limpo. A revogação de DML do worker está alinhada
entre reconciler, init script e Helm; runtime grants passou **11/11**. A revisão
independente aprovou sem Critical/High.

O gate de readiness permanece aberto porque o entrypoint ainda não registra
`payments`, `billing` e `webhooks`; não há prova de processamento de eventos
reais. A próxima ação é compor/revisar os handlers/manifesto do worker, depois
rodar failpoints cross-domain e equivalência Helm aplicada. O ERP e a Quality
Bar seguem `ACTIVE/IN_PROGRESS/PARTIAL`, e o cache user-owned permanece fora do
stage.

## Estado atual — eventos reais do worker em PostgreSQL/RLS (23/08/2026, 17:26 BRT)

O RED bounded executado com a role `LOGIN NOSUPERUSER NOBYPASSRLS` encontrou
identificadores financeiros prefixados (`efa_*`, `er_*`, `erp_*`) em colunas
UUID e um erro secundário de transação abortada. A correção usa `randomUUID()`
nos IDs persistidos e faz o Vitest resolver os módulos worker para `src`.

`worker-event-consumers-postgres.test.ts` passou **3/3** contra PostgreSQL
descartável, cobrindo payment → billing → webhook, inbox/outbox, settlement,
delivery pendente, replay concorrente, rollback pós-mutação, desconhecido
fail-closed e isolamento A/B. Financial **15/15**, event-bus **23/23**, builds,
audit, Prettier e diff check passaram. O marcador de falha não mascara mais a
causa original quando a UoW já foi abortada.

Decisão: **GREEN bounded** somente para esta fatia. O stop decision continua
`ACTIVE`, `CVG-002C6` permanece `IN_PROGRESS/PARTIAL` e não há promoção de
readiness, ERP, produção ou Quality Bar. Próximos gates: child process/SIGKILL
com eventos de domínio, failpoints completos, identidade/collision de cartão,
retry/DLQ HTTP de webhook, hidratação cross-instance, RLS/FORCE RLS global e
demais gates de produto/operação/release. Artefato:
`.agent/artifacts/CVG-002C6-worker-event-postgres-2026-08-23.md`.

## Correção pós-review — identidade composta do cartão (23/08/2026, 17:39 BRT)

A crítica independente encontrou HIGH: a PK global de
`card_transactions.transaction_id` e `ON CONFLICT DO NOTHING` poderiam
descartar silenciosamente um mesmo intent em outro account. A migration 0122,
schema Drizzle e os repositórios agora usam `(account_id, transaction_id)`.
O teste real usa o mesmo ID em A/B, persiste duas linhas e confirma leitura
RLS por account; settlement também valida financial account, receivable e
referência externa. O teste PostgreSQL ficou **3/3** e handlers/gateway
**17/17**.

O HIGH foi fechado bounded, não global. Continuam abertos child-process/SIGKILL
com fixture de domínio e takeover, PIX PostgreSQL/RLS, retry/DLQ HTTP e lease
fencing, isolamento restrito de billing/financial/webhook, failpoints completos,
hidratação cross-instance, RLS/FORCE RLS global, produto, operação e release.
Não promover ERP, readiness ou produção; esperar a revisão pós-fix antes de
publicar os SHAs.

## Revisão pós-fix — resultado final bounded (23/08/2026, 17:45 BRT)

A revisão independente pós-fix classificou **Critical: nenhum; High: nenhum**
no escopo de identidade do cartão. Os dois bloqueios de teste apontados foram
corrigidos: a asserção A/B não depende da ordem lexical de UUIDs e o contrato
unitário espera `ON CONFLICT (account_id, transaction_id)`. A integração
PostgreSQL passou **3/3**, o contrato unitário **3/3** e TAP handlers/gateway
**17/17**.

O resultado é aprovação **GREEN bounded**, não aprovação global. Permanecem
abertos child process/SIGKILL/takeover com domínio, PIX PostgreSQL/RLS,
retry/DLQ HTTP e lease fencing, isolamento billing/financial/webhook,
failpoints completos, hidratação cross-instance, RLS/FORCE RLS global e os
gates de produto/operação/deploy/release. Implementação final: `67d47e2`;
o checkpoint documental/control-plane é `16797efada1747fc2a6046d4dd7842dc6e7eea42`
e a reconciliação final publicada é `8c21e246136cd32991b6927171fe67c76d41a27a`.

## Checkpoint integral de retomada — 23/08/2026, 18:19 BRT

A auditoria documental foi consolidada em docs/2026-08-23-checkpoint-retomada-integral.md e no artefato .agent/artifacts/erp-audit-2026-08-23.md. O snapshot pré-inclusão tinha 1.454 arquivos em docs/, 1.198 textuais, 256 binários, 53.895.398 bytes e manifesto SHA-256 1e66d6af2cff706ccf2ac6291680b9fd1795c18ca0e71d84c7cbbcd3a8f290cd. A precedência runtime/testes/estado > código/contratos > camada ativa de agosto > ADRs > julho > Vetus > docs2 permanece vigente.

Baseline executado: readiness 95/100 estrutural e 0/11 paridade; clinical parity 0/3; RLS 154/155; OpenAPI 337 paths/390 schemas; migration consistency bloqueada pela ausência de docs/phase-9-migration-manifest.json. pnpm test:critical terminou exit 1 com 385/387 testes em 28 arquivos. Os bloqueios concretos são um fixture de diária que usa stayday\_<token> em coluna uuid e uma asserção de installation-state que procura REVOKE literal enquanto o Helm usa SELECT format. O rate limiter in-memory observado no teste não prova Redis compartilhado.

Decisão: stop decision ACTIVE; CVG-002C6 e a Quality Bar global continuam IN_PROGRESS/PARTIAL. O próximo RED/GREEN deve corrigir somente os dois bloqueios do teste crítico, reexecutar a suíte completa e então continuar eventos de domínio em processo filho/SIGKILL, failpoints e webhook HTTP retry/DLQ/fence. Nenhum gate de ERP, produção, provedor, SPA, paridade, WCAG, operações ou release foi promovido.

## Reteste crítico pós-fix — 23/08/2026, 19:03 BRT

O RED/GREEN delimitado do grant Helm foi publicado em `6afd1d9`: a ConfigMap
agora contém a revogação explícita do papel instalador para o worker. A crítica
independente não encontrou Critical/High; a limitação Medium é a ausência de
render/apply Kubernetes nesta rodada. Focados: daily 4/4, installation 8/8,
runtime grants 11/11 e FK/integrity/PIX 68/68.

A repetição integral terminou exit 1, 382/387 em 23/28. O full run ainda
carregou `stayday_<token>` no daily-charge, apresentou fixtures preemptados por
validação/NOT NULL e FK de conta no PIX, e excedeu o teardown de
production-like-runtime. Como os mesmos testes passam isoladamente, o próximo
gate é reproduzir a divergência com cache/paralelismo controlados. Stop decision
continua ACTIVE; CVG-002C6, ERP e Quality Bar seguem IN_PROGRESS/PARTIAL.

## Reteste controlado — 23/08/2026, 19:26 BRT

O diagnóstico serial sem cache e sem paralelismo entre arquivos foi executado
com `--teardownTimeout=120000` contra PostgreSQL descartável. Resultado:
**383/387 testes**, **23/28 arquivos**, `exit 1`, em 528,85 s. A divergência
`stayday_<token>` não apareceu e o teste diário passou; a falha anterior fica
classificada como reprodutibilidade do harness, não como motivo para alterar o
contrato UUID.

Restam quatro fixtures que não alcançam a constraint alvo (guard de owner,
`appointments.reason`, `users.username` e tenant ausente no backfill PIX) e
dois `afterAll` limitados por `hookTimeout` efetivo de 30 s. `--teardownTimeout`
não substitui `hookTimeout`. O próximo passo é corrigir fixtures e teardown de
forma explícita, repetir os focados e só aceitar o gate com 387/387
reproduzível. Stop decision permanece ACTIVE; nenhum gate global foi promovido.

## Publicação do reteste controlado — 23/08/2026, 19:32 BRT

O checkpoint de continuidade, artefato, backlog, ExecPlan, estado e ledgers foi
publicado em `cef5d6392c82b60e9a13881fa1e8826c39accb7a` e enviado para
`origin/agent/sync-v4-full-program`. O ponteiro final de reconciliação é
`b7768ce822804fecfed7a9ff2fc0f744b438f26f`; a reconciliação confirmou `HEAD == origin`;
somente `packages/design-system/tsconfig.vue.tsbuildinfo` continua dirty e
fora do stage. O stop decision e todos os gates permanecem inalterados.

## Rodada de fixtures determinísticos e teardown — 23/08/2026, 20:08 BRT

O RED/GREEN delimitado corrigiu a ordem do guard de encounter via migration
0123, removeu `return` silencioso dos casos críticos de FK/unique, tornou os
fixtures tenant/account autossuficientes e serializou o harness com hooks de
120 s. O focused Lead FK/integrity passou **63/63** em banco descartável com a
migration 0123 aplicada; lint, Prettier e diff check passaram. PIX focal passou
5/5 e provider → PIX 11/11; os workers registraram worker-event 3/3 e
installation-state 8/8.

Isto não é aprovação do gate: o último full critical pós-correção ainda está
pendente, a evidência integral vigente é 383/387, e a nova crítica independente
ainda deve verificar ausência de vacuidade e teardown real. Stop decision segue
`ACTIVE`; CVG-002C6, Quality Bar, ERP, produção, providers, SPA, paridade,
WCAG, operações e release seguem `IN_PROGRESS/PARTIAL`.

## Publicação da rodada — 23/08/2026, 20:09 BRT

O commit `75a5ccd` publicou a implementação delimitada e o checkpoint de
continuidade no branch remoto com upstream. O stop decision permanece `ACTIVE`;
o full critical pós-fix e a crítica independente continuam obrigatórios antes
de qualquer promoção. O cache `packages/design-system/tsconfig.vue.tsbuildinfo`
permanece fora do stage.

## Reconciliação final — 23/08/2026, 20:18 BRT

O conteúdo `75a5ccd` e o ponteiro documental `dce9c36` estão publicados no
branch remoto. A sessão seguinte deve confirmar `HEAD == origin` e retomar o
full critical pós-fix; stop decision segue `ACTIVE` e todos os gates amplos
seguem `IN_PROGRESS/PARTIAL`.

## Reteste crítico pós-fix — 23/08/2026

O full critical foi executado contra PostgreSQL descartável novo com cache e
paralelismo de arquivos desativados e `hookTimeout`/`teardownTimeout` de 120 s.
Migrations `0000`–`0123` foram aplicadas; o teardown terminou. Resultado:
**386/387 testes**, **27/28 arquivos**, `exit 1`, em 646,58 s.

A única falha está em `pix-service-principals.test.ts`, no backfill da migration
de principals, com `users_account_id_accounts_id_fk`. O arquivo passa 5/5
isoladamente e provider → PIX passa 11/11. Até haver uma reprodução mínima, a
causa é tratada como contaminação/isolamento do harness; não remover FK, apagar
órfãos ou relaxar a migration. `QB-REL-CRITICAL-HARNESS`, CVG-002C6 e todos os
gates globais permanecem `ACTIVE/IN_PROGRESS/PARTIAL`. Próximo passo: localizar
o primeiro suite que deixa usuário sem account, corrigir apenas sua limpeza e
repetir o full critical antes da crítica independente pós-fix.

## State update — harness resolved, product gate remains open (23/08/2026)

The smallest orphan-producing sequence was fixed in `76d94a3`. Focused cash→PIX
passed 30/30, and the full controlled critical command passed 387/387 tests in
28/28 files on a fresh database with complete teardown. A fresh independent
review accepted the transaction/savepoint isolation and noted only the
commit-boundary coverage residual. The Gauntlet remains ACTIVE for the product
bar: continue with child-process domain SIGKILL/takeover, full failpoints, PIX
PostgreSQL/RLS and webhook HTTP retry/DLQ/lease fencing. Global ERP, production,
parity, WCAG, operations and release gates remain IN_PROGRESS/PARTIAL.

## Gauntlet iteration — role-hardened domain process proof (23/08/2026, 22:10 BRT)

The child-process fixture/test is now a real bounded green: **2/2** in 81.65 s
against disposable PostgreSQL. API and worker use distinct `LOGIN NOSUPERUSER
NOBYPASSRLS` roles, SIGKILL occurs at `after_claim` and
`after_domain_command_before_cas`, and the second PID takes over after lease
expiry. SQL confirms inventory, billing, audit, derived outbox, idempotency and
original outbox completion. Independent critique: **ACCEPT bounded**.

Stop decision remains `ACTIVE`; this does not promote the ERP or Quality Bar.
Residuals are stale-owner A-alive fencing, two-tenant/A-B proof, API
rebootstrap/hydration, explicit billing source/hash assertions, CI critical
inclusion, complete failpoints, PIX/RLS, webhook retry/DLQ/fence and all product,
operations and release gates.

## Handoff documental global — 23/08/2026, 22:34 BRT

Foi consolidado o inventário atual de `docs/`: 1.456 arquivos, 1.200
textuais, 256 binários, 53.957.807 bytes e manifesto
`5f16bfc916277a232726ea670e140c9b87c4da3e0c091e529d560b097679e546`. O novo
documento `docs/2026-08-23-auditoria-documental-global-e-handoff.md` é o
ponteiro operacional principal e distingue evidência atual de histórico,
benchmark e claims de produto. O stop decision segue `ACTIVE`; nenhum gate
global é promovido. A próxima iteração continua stale-owner/A-B/hidratação,
failpoints cross-domain e, depois, PIX/RLS e webhook.

## Critical gates e guardrails — 24/08/2026

O slice de endurecimento posterior ao handoff foi executado com evidência
fresca. `test:critical` passou em bancos fisicamente distintos por PID: base
**28/28 arquivos e 387/387 testes**, processo inpatient/SIGKILL **1/1 arquivo e
2/2 testes**, ambos exit 0. Inventory focado passou 3/3 e bootstrap
production-like 6/6. `deploy:check`/cutover passaram 12/12, migration
consistency, OpenAPI, RLS e `security:secrets` passaram. O artefato completo é
`.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`.

O revisor independente não encontrou P0. P1 futuro: evidenciar duas execuções
críticas simultâneas (ou adicionar lock externo) e avaliar backoff/jitter no
retry de inventário. Stop decision continua `ACTIVE`; CVG-002C6, ERP,
paridade, produção, operações e release permanecem `IN_PROGRESS/PARTIAL`.

## Gauntlet iteration — stale-owner A-alive fencing — 24/08/2026

O novo RED de `CVG-002C6` adicionou dois cenários em que o processo A real fica
vivo e pausado após claim ou após o comando HTTP, a lease expira, e um processo
B assume com `leaseVersion = 2`. Antes da implementação, ambos os cenários
falharam porque o fixture não expunha o resultado stale (`leaseLost`),
confirmando uma lacuna real de evidência.

O fixture agora tem uma barreira de teste controlada por `SIGUSR2` e publica o
resultado do `completeClaim` efetivo. A execução GREEN em banco PostgreSQL
efêmero novo passou **4/4 testes em 1 arquivo**, exit 0, incluindo os dois
SIGKILL existentes e os dois stale-owner-A-alive. As asserções verificam PIDs
distintos, lease `1 → 2`, A ainda vivo após B concluir, `outboxCompletion=false`
para A, e reconciliação SQL de um único consumo/billing/audit/outbox, stock 8,
idempotência 1, attempts 2 e `lease_version=2`. Prettier e ESLint dos arquivos
alterados passaram.

Artefato: `.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`.
Crítica independente fresca continua obrigatória antes de marcar a rodada como
VERIFIED. O stop decision segue `ACTIVE`; não há promoção do ERP, produção,
paridade, operações ou release. Próximo gap: billing `sourceEntityId`/hash,
dois tenants/A-B e hidratação cross-instance.

## Gauntlet iteration — billing source/hash e replay divergente — 24/08/2026

O harness agora exige que o billing seja ligado explicitamente ao
`inventory_consumption.id`, compara `request_hash` ao SHA-256 completo do
envelope canônico `{path, query, body}` e envia replay com `quantity=3` pela API
real, esperando `409 IDEMPOTENCY_CONFLICT` sem novos efeitos.

O primeiro RED encontrou o contrato correto do hash: o dispatcher inclui path e
query; o body cru produziria um digest diferente. A asserção foi alinhada ao
canonicalizer compartilhado. Não houve correção de produção porque a rota/UoW
já estavam corretos; a lacuna era a ausência de prova no boundary processual.
GREEN: **4/4 testes em 125,96 s**, exit 0, em PostgreSQL efêmero novo; SIGKILL
e stale-owner continuam verdes e a reconciliação confirma uma cadeia única.

Artefato: `.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`.
A crítica independente fresca rerodou o slice, retornou `APPROVE bounded` e
não encontrou P0/P1; falta somente publicar e reconciliar o SHA. Stop
decision segue `ACTIVE` e o próximo gap permanece A/B/hydration/failpoints.

## State update — cross-instance hydration bounded — 24/08/2026

A iteração atual fechou apenas o boundary de leitura clínica/discharge entre
processos: o RED reproduziu cache stale em uma API secundária pronta antes da
mutação; o GREEN passou 5/5 com refresh account-scoped desde PostgreSQL.
Regressões close/receipt e discharge passaram 5/5, e a crítica independente
retornou APPROVE bounded. O isolamento A/B foi observado no mesmo secondary:
bearer B não vê os resultados de A.

O stop decision continua ACTIVE. Nenhum gate de ERP, Vetus, produção,
paridade, operações ou release foi promovido. A limitação de concorrência
durante hydration in-flight permanece P2; Redis invalidation, full failpoints,
PIX/RLS e webhook retry/DLQ/fencing continuam abertos. Próximo estado:
publicar o código/teste/artefato e reconciliar o SHA remoto, preservando o
cache tsbuildinfo fora do stage.

## Publication checkpoint — cross-instance hydration — 24/08/2026

Commit 20cf9e666d20adeb5303f86cf32d0346e025898d is the published implementation
SHA and equals origin after fetch. The artifact, handoff and verification
ledger contain the bounded HYD/TEN/REG evidence. Stop decision remains ACTIVE;
do not promote ERP/production/parity/release. Preserve tsbuildinfo outside
stage and continue with failpoints plus the P2 in-flight hydration follow-up.

## Gauntlet iteration — worker account scope fail-closed — 24/08/2026

The production-like worker requires `WORKER_ACCOUNT_IDS`, but the Helm chart
had not injected it. A validator RED failed before implementation; the GREEN
static validation now requires operator-managed staging/prod Secrets, a
required `secretKeyRef` and schema/overlay assertions, while dev keeps local
account discovery. `pnpm security:secrets`, schema parsing, `pnpm typecheck`
(70/70) and `git diff --check` passed. The runner has no Helm binary, so
`helm lint`/`helm template` remain pending in a Helm-enabled CI/deploy runner.

Artifact: `.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md`.
Stop decision remains ACTIVE; no ERP, production, parity, operations or
release gate is promoted. Next gate is the real API child-process cash-receipt
SIGKILL/restart/replay proof, then discharge/close/receipt failpoints.

## Publication checkpoint — worker account scope — 24/08/2026

Commit `c93d672a47ad1bdb391c4af8a8963c012fd4219b` was pushed and reconciled
with `origin/agent/sync-v4-full-program`. The handoff and artifact are now
the next-session pointers; `tsbuildinfo` remains outside stage. Stop decision
continues ACTIVE and rendered Helm validation is the first action in a
Helm-enabled runner, followed by the API cash-receipt SIGKILL gate.

## Gauntlet iteration — API cash receipt SIGKILL/restart/replay — 24/08/2026

O novo fixture inicia o entrypoint real da API em processo filho, prepara a
jornada pública de internação até fechamento e pausa a transação de receipt
em um trigger `AFTER INSERT` no PostgreSQL. O RED encontrou limites reais do
harness (import path, segredo inseguro de teste, boot staging sem a role
esperada e predicado `/health`); essas expectativas foram corrigidas sem
alterar runtime de produção. O dispatcher também foi confirmado como dono da
operação de idempotência HTTP `POST /encounters/{id}/cash-receipts`.

GREEN: `receipt_kill_green6` passou 1/1 em 60,95 s e uma rerun independente
`receipt_kill_green5` passou 1/1 em 81,96 s. O `SIGKILL` ocorreu enquanto o
trigger segurava a transação; antes do restart não restou receipt/payment,
movimento, journal, audit, outbox, idempotência, receivable ou financial
account, e o billing permaneceu aberto. Depois do restart, o replay criou um
único grafo balanceado em 260; payload divergente retornou 409 e o bearer do
tenant B retornou 404. A revisão independente foi `APPROVE bounded`, sem
CRITICAL/HIGH; PID distinto, cleanup seguro e contagens financeiras explícitas
foram incorporados.

Artefato: `.agent/artifacts/CVG-002C6-cash-receipt-sigkill-2026-08-24.md`.
Handoff: `docs/2026-08-24-handoff-cash-receipt-sigkill.md`.
O stop decision continua ACTIVE: esta prova é bounded em `NODE_ENV=test` e
não promove ERP, produção, paridade, operações ou release. Próximo trabalho:
Helm lint/template em runner autorizado, depois failpoints completos de
discharge/close/receipt, concorrência, PIX PostgreSQL/RLS e webhook
retry/DLQ/lease fencing.

Publication checkpoint: implementation/docs commit
`7aeb81d4081e84080fc6cf83759a193dd04a27dd` was pushed and fetch confirmed
`HEAD == origin/agent/sync-v4-full-program`. The new handoff and artifact are
the next-session pointers; only the user-owned `tsbuildinfo` cache is dirty.

## Publication checkpoint — continuation documentation — 24/08/2026

The continuation surface was reconciled and published in commit `937d8ed`
(`docs: reconcile continuation pointers`). README, source-of-truth, the short
checkpoint, CI gates, global audit and historical backlog now lead with the
24/08 handoffs, distinguish historical evidence from current Quality Bar state,
and preserve `IN_PROGRESS/PARTIAL` for ERP, production, parity, operations and
release. An active-surface audit found 81 Markdown files and zero broken local
links; docs JSON parsing, Prettier and diff checks passed. Stop decision remains
ACTIVE. The next session should read the cash-receipt handoff, worker handoff,
global audit and short checkpoint before continuing Helm-rendered validation,
receipt concurrency/takeover and PIX/RLS/webhook work.

## Quality Bar v1 — cash-receipt concurrency round — 24/08/2026

This round is frozen before implementation and is narrower than the global ERP
bar. It targets the highest open correctness gap in `CVG-002C6`, while all
global gates remain `IN_PROGRESS/PARTIAL`.

| ID               | Required target                                                                                                                                                                                                      | Evidence                                                                                      | Priority |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| `QB-REC-RACE-01` | Two real API processes receive concurrent public requests for the same tenant-A encounter with distinct idempotency keys; responses are exactly one `201` and one domain `409`, with no `500` or duplicate success.  | Fresh Vitest process test against disposable PostgreSQL, two serving PIDs and HTTP responses. | P0       |
| `QB-REC-RACE-02` | Tenant B cannot address A's encounter/register (`404`); database has exactly one receipt/payment/cash movement/journal entry, two balanced journal lines, one audit/outbox graph and no completed losing-key effect. | SQL reconciliation after the concurrent requests under restricted `NOBYPASSRLS` roles.        | P0       |
| `QB-REC-RACE-03` | The harness is representative and safe: isolated database suffix, real entrypoint, distinct process cleanup, deterministic barriers, no production credentials or mutations.                                         | Direct fixture/test inspection plus command output and cleanup observation.                   | P0       |
| `QB-REC-REG-01`  | Existing SIGKILL rollback/restart/replay proof remains green after the race test is added.                                                                                                                           | Fresh rerun of `inpatient-cash-receipt-sigkill.test.ts`.                                      | P1       |

Known-bad baseline: the new concurrency test path is absent at HEAD and must
fail to resolve before the Builder creates it. A green test alone does not
promote `CVG-002C6`, ERP, production, parity, operations or release. A later
round may promote the proven process matrix into CI after serialized runtime,
timeout and database-isolation costs are measured.

## Round result — cash-receipt concurrency — 24/08/2026

The Builder added only `tests/integration/process/inpatient-cash-receipt-concurrency.test.ts`.
An independent critic first rejected the weak single-lock observation; after the
barrier was changed to require one granted and one waiting backend on the same
advisory key, a fresh critic approved all four criteria. Lead reruns passed the
concurrency test in `receipt_concurrency_lead_final` (1/1, exit 0, 41.02s) and
the SIGKILL regression in `receipt_concurrency_regression` (1/1, exit 0,
61.96s). Prettier, ESLint, secrets, typecheck 70/70, active-doc link-check and
diff-check passed. The stop decision remains ACTIVE; the test is not yet a
`test:critical` gate, and simultaneous replica bootstrap remains a separate
startup-idempotency gap.

## Quality Bar v1 — serialized critical process suite — 24/08/2026

The next round targets the P1 regression-protection gap. The global ERP bar and
all production gates remain unchanged.

| ID              | Required target                                                                                                                                                                                                        | Evidence                                                                                | Priority |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| `QB-CI-PROC-01` | A named `test:critical:process` command runs every required real process boundary: inpatient-domain, clinical-financial restart, cash-receipt SIGKILL, cash-receipt concurrency, PIX settlement and worker entrypoint. | Manifest inspection plus fresh command output naming all six files.                     | P1       |
| `QB-CI-PROC-02` | Process tests run serially with a distinct ephemeral database suffix per file, explicit no-file-parallelism and bounded hooks/timeouts.                                                                                | Runner trace and database/process cleanup observations.                                 | P1       |
| `QB-CI-PROC-03` | Any child failure propagates nonzero and stops the suite; existing `test:critical` database/foundational phase remains unchanged.                                                                                      | Known-bad injected command or runner unit check plus `test:critical` script inspection. | P1       |
| `QB-CI-REG-01`  | The new runner does not regress the already-green bounded process tests or leak credentials/production mutations.                                                                                                      | Focused process suite, secrets scan, diff/type checks and isolated DB evidence.         | P1       |

Known-bad baseline: `pnpm test:critical:process` is absent at the current
commit, and `test:critical` contains only the inpatient-domain process test.
This round must measure actual serial runtime before any release claim.

## Round result — serialized critical process suite — 24/08/2026

The Builder changed only `package.json` and
`infra/scripts/run-critical-process-suite.mjs`. The independent critic
returned `APPROVE` for all four frozen criteria. The real Lead run executed all
six process files serially in distinct ephemeral databases and exited `0`:
inpatient-domain `4/4` in `78.28s`, clinical-financial restart `1/1` in
`39.19s`, cash-receipt SIGKILL `1/1` in `60.26s`, cash-receipt concurrency
`1/1` in `40.67s`, PIX settlement `5/5` in `117.31s`, and worker entrypoint
`1/1` in `55.20s`. The reported test durations sum to `390.91s`.

`--list`, `--dry-run`, JSON/node checks, Prettier, ESLint, secrets and diff
checks passed. The original database/setup/foundational phase of
`test:critical` remains textually intact; its complete top-level command was
not rerun after wiring because the process phase was executed independently.
The stop decision remains ACTIVE. This closes only the bounded CI process
Quality Bar; simultaneous laboratory bootstrap, Helm-rendered validation,
PIX/RLS, webhook retry/DLQ/fencing and all global ERP/production/parity/
operations/release gates remain open. P2 residual: runner cleanup is delegated
to each test's global teardown and signals are not forwarded by the runner.

## Quality Bar v1 — bootstrap laboratorial concorrente — 24/08/2026

Esta rodada fecha o maior gap local seguinte: o seed lazy do catálogo
laboratorial faz check-then-act durante `hydrateCatalog`, podendo derrubar uma
réplica quando duas APIs reais iniciam para a mesma conta. A barra é um recorte
bounded de inicialização horizontal e não altera os gates globais do ERP.

| ID               | Required target                                                                                                                                                                                     | Evidence                                                                                                                            | Priority |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `QB-LAB-BOOT-01` | Duas instâncias reais da API, em PIDs/portas distintos e iniciadas simultaneamente contra o mesmo PostgreSQL/conta, alcançam readiness de banco sem `duplicate key`, crash ou timeout.              | Teste de processo com `apps/api/src/index.ts`, PostgreSQL efêmero, roles restritas e observação de `/health`/saída dos dois filhos. | P0       |
| `QB-LAB-BOOT-02` | Após o boot concorrente existe exatamente um conjunto canônico por conta: 4 equipamentos, 6 tipos de laudo e 6 valores de referência, com IDs determinísticos sem duplicação e leitura A/B isolada. | Consultas SQL administrativas e GETs autenticados em dois tenants sob o boundary HTTP real.                                         | P0       |
| `QB-LAB-BOOT-03` | A hidratação é idempotente e repara catálogo parcial: remover um item canônico e repetir a leitura/hidratação repõe apenas o ausente, sem duplicar ou sobrescrever dados customizados.              | Cenário de recuperação no mesmo teste/fixture, com contagens e IDs antes/depois.                                                    | P1       |
| `QB-LAB-REG-01`  | A correção não regressa os seis limites da suíte crítica serial nem a concorrência/SIGKILL de receipt.                                                                                              | `pnpm test:critical:process` e reruns focados com suffixes efêmeros novos.                                                          | P1       |

Baseline conhecido-ruim: `ensureSeedData` observa ausência apenas em
`laboratory_report_types` e executa três INSERTs determinísticos separados sem
`ON CONFLICT`; dois processos podem competir no mesmo
`laboratory_equipment_pkey`, e uma falha no meio deixa o catálogo parcial. O
baseline deve falhar o teste de boot concorrente antes do GREEN. Não promover
CVG-002C6, ERP, produção, paridade, operações ou release nesta rodada.

## Round result — bootstrap laboratorial concorrente — 24/08/2026

RED real capturado em `lab_catalog_bootstrap_red2`: dois PIDs alcançaram a
barreira e um morreu com duplicate key na PK determinística de
`laboratory_equipment`. O Builder removeu o sentinel check-then-act e adicionou
`onConflictDoNothing({ target: table.id })` aos três lotes. O processo API
resolve `@cvg-his-v2/module-diagnostics` via `dist/index.js`, então o teste
compila o pacote antes do spawn.

O primeiro critic rejeitou a prova porque a barreira era global e podia
sincronizar contas diferentes. Após a correção, o trigger pausa somente para
`NEW.account_id = accountA` e o observador exige a chave advisory exata
`(41673, 1)`. A crítica independente final aprovou `QB-LAB-BOOT-01`,
`QB-LAB-BOOT-02` e `QB-LAB-BOOT-03`.

GREEN final em `lab_catalog_bootstrap_final`: 1/1, exit 0, 66,64 s. O teste
prova readiness de dois PIDs/portas, 4 equipamentos/6 tipos/6 referências por
conta, IDs canônicos exatos, isolamento A/B, customização preservada e reparo
de um default removido. `pnpm test:critical:process` também terminou exit 0
com 6/6 em bancos efêmeros distintos: 4/4, 1/1, 1/1, 1/1, 5/5 e 1/1
(395,30 s somados). Typecheck, Prettier, ESLint, Secretlint, node check e
diff-check passaram.

Isso fecha somente a barra local de bootstrap e sua regressão processual. O
stop decision permanece ACTIVE; CVG-002C6, ERP, produção, paridade, operações,
release e gates globais continuam `IN_PROGRESS/PARTIAL`. Próximo workstream:
Helm lint/template em runner autorizado, depois PIX PostgreSQL/RLS e webhook
retry/DLQ/lease fencing. O teste laboratorial dedicado ainda requer uma decisão
explícita de custo antes de entrar no manifesto `test:critical:process`.

## Quality Bar v1 — Helm render-path scope fix — 24/08/2026

Esta rodada fecha um defeito determinístico no próximo gate de deployment: o
fallback estático não executa o caminho `helm lint/template`, e o loop de
renderização referencia `values` fora do escopo em que ele é carregado. A
correção é limitada ao validador e não promove o chart sem um binário Helm
autorizado.

| ID                  | Required target                                                                                                                                      | Evidence                                                               | Priority |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| `QB-HELM-RENDER-01` | Com Helm disponível, `pnpm validate:helm` executa lint e template para dev, staging e prod sem `ReferenceError`, e valida os manifests renderizados. | Runner Helm autorizado, saída por overlay e manifests parseados.       | P0       |
| `QB-HELM-STATIC-01` | Sem Helm, a validação estática continua cobrindo os contratos fail-closed de setup, `WORKER_ACCOUNT_IDS`, Secrets e datastores.                      | `pnpm validate:helm` local e inspeção do script.                       | P1       |
| `QB-HELM-REG-01`    | O conserto não introduz erro de sintaxe, segredo ou regressão global de tipos.                                                                       | RED/GREEN, `node --check`, ESLint, Secretlint, typecheck e diff-check. | P1       |

Baseline RED conhecido antes da correção: `pnpm exec eslint
infra/scripts/validate-helm.mjs` reportava `no-undef` para `values` no bloco de
renderização; com Helm instalado, o primeiro overlay renderizado falharia antes
das asserções de Secret do worker. O host continua sem Helm, mas a execução
pinada registrada no resultado desta rodada cobre o caminho real.

## Quality Bar v1 — PIX settlement runtime-role process proof — 24/08/2026

Esta rodada amplia a prova de settlement para o papel PostgreSQL que o worker
realmente usa. A URL administrativa do teste anterior tornava a prova
vacuamente permissiva, apesar de o reconciler exigir `LOGIN NOINHERIT
NOBYPASSRLS` e separar API/worker.

| ID                  | Required target                                                                                                                               | Evidence                                                                                    | Priority |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| `QB-PIX-RLS-01`     | O PID real do settlement conecta como role worker reconciliada, sem `BYPASSRLS`, aplica exatamente uma liquidação e permanece account-scoped. | Processo filho, `current_user`, `has_function_privilege`, SQL administrativo e fixture A/B. | P0       |
| `QB-PIX-RLS-02`     | O worker não pode inserir/alterar recibos do provedor; a role API não pode alterar deliveries diretamente.                                    | Negativos PostgreSQL com roles descartáveis, savepoints e grants reconciliados.             | P0       |
| `QB-PIX-RLS-03`     | SIGKILL/takeover, stale-owner fencing e replay continuam exatamente uma vez sob a role worker.                                                | Matriz real de checkpoints, dois PIDs e estado final receipt/billing/PIX/delivery.          | P0       |
| `QB-PIX-RLS-REG-01` | O endurecimento de ACL não regressa o foco de grants nem o restante runner processual crítico.                                                | Unit ACL, focused process e `pnpm test:critical:process`.                                   | P1       |

Baseline RED conhecido: com a URL `TEST_DB_URL`, `PIX_READY.databaseUser` era
`postgres`; com a URL worker, o settlement terminava em
`PIX_SETTLEMENT_UNEXPECTED` porque `app.assert_encounter_non_cash_receipt_consistent(uuid)`
não estava na allowlist de grants. A correção adiciona essa função à política
do reconciler e fixa seu `search_path` na migration `0124`. O gate continua
bounded a PostgreSQL descartável e não promove provider real, produção ou ERP
global.

## Round result — Helm e PIX runtime-role — 24/08/2026

O validator Helm corrigido passou o caminho real `lint/template` em um runner
pinado `alpine/helm:3.15.4` para dev, staging e prod. A crítica independente
aprovou o conserto de escopo/fallback, mas não tinha Helm próprio para repetir
o render; por isso a revisão permanece bounded. Não há evidência de cluster,
Secret provisionado ou rollout.

O rerun independente do PIX passou `8/8` em `136,24 s`, com a role worker real,
`rolbypassrls=false`, A/B, ACLs negativas, quatro checkpoints de SIGKILL,
takeover, stale fencing e replay. O unit test de grants passou `11/11`.

Depois, o runner crítico completo passou `6/6`, exit `0`, em seis bancos
efêmeros distintos: inpatient-domain `4/4` (`82,95 s`), clinical-financial
restart `1/1` (`39,57 s`), cash-receipt SIGKILL `1/1` (`60,88 s`),
cash-receipt concurrency `1/1` (`40,98 s`), PIX `8/8` (`137,13 s`) e worker
entrypoint `1/1` (`62,82 s`). Assim, `QB-PIX-RLS-01/02/03` e
`QB-PIX-RLS-REG-01` ficam verificados somente no escopo bounded.

Limitações residuais explícitas: o cleanup de roles do teste ainda suprime
erros (P2), a fixture usa TypeScript via `tsx` em vez de bundle de produção,
o Helm não foi admitido em cluster real e o executor webhook HTTP durável
(claim/retry/backoff/DLQ/lease fencing) continua sendo o próximo gap P0. O
stop decision permanece ACTIVE; ERP, produção, paridade, operações e release
seguem `IN_PROGRESS/PARTIAL`.

## Latest bounded checkpoint — 2026-08-24

This checkpoint records the bounded webhook, participant-lifecycle and
concurrent-check-in waves completed after the previous process/PIX gates. It
does not rewrite or promote the global Quality Bar statuses above.

### Implemented

- Migration `0125_webhook_delivery_leases` adds durable delivery attempts,
  leases, fencing/version fields, retry/DLQ state, recovery of abandoned
  processing rows, claim indexes and FORCE RLS for webhook tables.
- Webhook delivery re-normalizes persisted URLs before network access, keeps
  SSRF/DNS pinning/timeout/response-size/HMAC protections, renews leases and
  maps retry exhaustion to a durable failure state. Retries and takeovers send
  a stable `Idempotency-Key` equal to the delivery id.
- Migration `0126_owner_patient_authorized_relationship` persists
  `authorized`/`spouse` relationships and enforces the `is_primary` invariant;
  owner routes now use account-scoped authoritative reads and audit the
  relationship snapshot.
- Participant lifecycle checks refresh authoritative owner/patient state and
  enforce active/account ownership at service and PostgreSQL boundaries for
  scheduling, check-in and encounter open/reopen.
- Check-in persistence is one transaction (appointment state plus queue row),
  binds queue participants to the appointment, and migration
  `0127_scheduling_checkin_uniqueness` adds a partial unique index so one
  appointment cannot have two active queue entries. Legacy duplicates fail
  the migration before the index is created.
- OpenAPI and SPA webhook delivery contracts now expose processing/retrying,
  attempts, response errors, dead-letter timestamps and correct pending/last
  attempt statistics.

### Fresh evidence

- `pnpm test:coverage`: 133 files, 1,810 tests; statements 82.67%, branches
  80.03%, functions 88.39% (all configured 80% thresholds green).
- `pnpm typecheck`: all 70 workspace projects passed.
- API package tests: 332/332 passed.
- Critical process runner: 7/7 passed in isolated ephemeral databases:
  inpatient domain 4/4, clinical-financial restart 1/1, cash receipt SIGKILL
  1/1, cash receipt concurrency 1/1, PIX restricted-worker matrix 8/8, worker
  entrypoint 1/1 and webhook provider-acceptance/takeover 1/1.
- PostgreSQL database matrix: 10/10 passed for worker consumers/RLS,
  authorized owner links and authoritative participant lifecycle, including
  two concurrent check-ins producing one success, one `ConflictError` and one
  active queue row.
- OpenAPI validation passed with 338 paths/390 schemas; RLS validation passed
  with 154/155 tenant tables and one documented exception; static Helm
  validation and secret scanning passed; `git diff --check` passed.
- Independent Tesla review accepted the final concurrent-check-in wave with
  no material blocker.

### Global status remains unpromoted

`pnpm vetus:parity:audit` remains 95/100 evidence, 0/11 areas verified;
`pnpm vetus:clinical-parity` remains 0/3 verified; and
`pnpm readiness:enterprise` remains 95/100 with the Vetus parity failure and
environment-dependent warnings. The stable webhook idempotency key proves an
at-least-once sender plus receiver deduplication contract, not exactly-once
provider side effects.

Remaining release blockers include real fiscal/provider homologation and
certificates, Live Pet/Live Lab connectors, full Vetus import reconciliation,
cash/sangria/deposit/close/refund/reconciliation journeys, commission and
report worker delivery E2E, complete RBAC/LGPD acceptance, and the end-to-end
transfer/receipt/close, merge/owner-switch, laboratory signature/recollect and
inventory procurement/document journeys listed by the parity audit. CI,
staging/production backup-restore, cluster Helm admission and real provider
credentials remain external operational gates. The temporary PostgreSQL
container created for this run was stopped; no commit or push was performed.

## Latest bounded checkpoint — reports in `run-once` — 2026-08-24

The report worker lane was audited against the real runtime. The initial RED
was a genuine tenant-context failure in `apps/worker/src/run-once.ts`: the
notification tick executed outside `runWithTenantContext`. The GREEN correction
now scopes notifications, outbox, webhooks and scheduled reports to the worker
account and invokes `runScheduledReportsTick` with `WORKER_REPORTS_USER_ID`.

The provider gained a validated `REPORT_EMAIL_ENDPOINT` override restricted to
`test`/`development`; production-like environments reject it and keep the
fixed Resend endpoint. Provider tests passed 4/4, the worker package test and
module-reports test passed, and the fresh process fixture passed 3/3 against a
disposable PostgreSQL database. The second process case delivered a real CSV
payload to a local HTTP receiver with stable `rep_deliv_*` idempotency key,
`cvg-delivery-id` tag and persisted `sent` execution/export links.

The third process case returned HTTP 503 to the first child, persisted
`failed`, then used the explicit `WORKER_REPORTS_RETRY_FAILED=1` flag in a
second child to hydrate and reprocess the same delivery after HTTP 200. Both
requests carried the same idempotency key. The runner unit suite passed 19
tests; the retry is intentionally one-shot and does not claim a distributed
lease for concurrent replay.

This verifies only the bounded one-shot/report-delivery criteria. It does not
promote external provider homologation, report SIGKILL retry or distributed
retry lease, cluster/Secrets,
Redis, DR/RPO, global ERP/Vetus parity, operations or release. The historical
webhook storage handoff was reconciled because its “not implemented” claims are
stale; webhook behavior is already covered by the current database/process/unit
tests and remains at-least-once rather than provider-side exactly-once.

Stop decision remains `ACTIVE`; CVG-002C6, ERP, production, parity, operations
and release stay `IN_PROGRESS/PARTIAL`.

## Follow-up bounded checkpoint — report delivery recovery after `SIGKILL` — 2026-08-24

The independent report review found a concrete restart gap: a new delivery was
only persisted after the provider returned. A worker killed while the external
request was in flight therefore left no row for `WORKER_REPORTS_RETRY_FAILED=1`
to discover.

TDD RED reproduced the absence with a real child process and a local receiver.
The GREEN correction in `packages/modules/reports/src/index.ts` persists the
stable delivery identity as retryable before the provider call. The fresh
process fixture passed 4/4: execution, controlled delivery, HTTP 503 replay and
SIGKILL recovery. In the fourth case the receiver accepted the first request,
the child was killed with `SIGKILL` while the response remained in flight, and
the second child reprocessed the same `rep_deliv_*` identity to `sent`.

The proof remains bounded: the receiver is local, the provider is not
homologated externally, and the explicit replay still has no distributed
delivery lease/fencing for concurrent retry workers. The next report-specific
gap is that lease, unless the complete clinical-financial P0 has higher value.

Stop decision remains `ACTIVE`; CVG-002C6, ERP, production, parity, operations
and release stay `IN_PROGRESS/PARTIAL`.

## Follow-up bounded checkpoint — report retry lease/fencing — 2026-08-24

The report retry race was closed at the PostgreSQL boundary. Migration
`0143_reports_delivery_leases.sql` adds `claim_token`, `claim_until` and
`claim_worker_id`, a failed-row claim index and a constraint preventing a
partial claim. `ReportsService` exposes account-scoped failed-delivery claims;
the database repository uses `FOR UPDATE SKIP LOCKED`, and the final update
requires the current token, fencing a stale worker after takeover.

TDD RED first failed because the migration did not exist. GREEN evidence is:
the migration contract unit 2/2, module-reports 11/11, PostgreSQL reports
delivery 2/2 (claim competition, expiry takeover and stale-token rejection),
and the real one-shot process fixture 5/5. The fifth process case launched two
retry workers concurrently and observed one provider retry only.

This is GREEN bounded to disposable PostgreSQL, `NODE_ENV=test` and the local
controlled provider. The default lease is 120 seconds; external provider
deduplication, cluster/Secrets, Redis, DR/RPO, Vetus parity and global ERP,
operations and release gates remain open. Stop decision remains `ACTIVE`.

## Follow-up bounded checkpoint — reports workbench export — 2026-08-24

The next P0 slice made the legacy report workbench operational for the loaded
audit, financial and attendance recortes that already have authoritative local
sources. `ReportWorkbenchPage.vue` now offers `Exportar CSV` only for those
specs; the builder adds UTF-8 BOM, semicolon separation, escaping, object/null
handling and spreadsheet-formula protection. Other Vetus report families keep
the disabled action and explicit source limitation.

TDD RED was the missing `@/utils/report-export` module. GREEN is the utility
3/3, ReportWorkbenchPage 30/30, SPA `vue-tsc` exit 0, SPA production build
exit 0 and a real Chromium download 1/1 from `/reports/appointments`. The
parity contract test passed 4/4; report-only parity is 98/100 with 4/11
verified and the reports area has 100/100 structural evidence. Enterprise
readiness remains 95/100 (42 PASS, 3 WARN, 1 FAIL from strict parity).

This is a client-side snapshot, not a server-side audited export or full Excel
legacy implementation. Accounts payable, paid accounts, cheques, advance
payments, NFS-e, registration and inventory report families remain open, as do
provider/cluster/Secrets, Redis, DR/RPO, global ERP/parity, operations and
release. Stop decision remains `ACTIVE`; no global gate is promoted.

## Follow-up bounded checkpoint — reports workbench inventory export — 2026-08-24

The next P0 slice enabled CSV export for the four inventory recortes whose
authoritative local data is already loaded by the existing workbench:
`inventory-stock`, `inventory-movements`, `inventory-invoices` and
`inventory-products`. The implementation reuses the immutable CSV builder and
keeps the source limitations visible: inventory invoices are derived from lots,
while transfers, adjustments, physical counts, average cost and server-side
audited exports remain outside the evidence.

The component suite remained 30/30, the SPA production build passed, and a real
Chromium flow downloaded both agenda and inventory snapshots 2/2. No fake
inventory rows or unverified Vetus claims were introduced. The parity and
readiness gates were rerun after this contract update; the remaining report
blocker is the unimplemented financial/registration/custom export families and
the missing server-side audited export contract. Stop decision remains
`ACTIVE`; no global gate is promoted.

## Final bounded retest — payable loading fail-closed — 2026-08-24

After review, the payable snapshot is cleared before the subledger request so a
failed report switch cannot render stale rows as current. Focused utility and
component tests passed 30/30 and the SPA production build passed with 769
modules transformed. This is a regression hardening proof inside the payable
slice; it does not change the global parity or release decision.

## Final bounded review — reports workbench inventory export — 2026-08-24

The post-handoff review reran the broad quality gates: full monorepo typecheck
passed for 70/70 workspace projects, Secretlint passed, the high-severity
dependency audit reported no known vulnerabilities, Prettier passed on touched
implementation/control files, the JSON/JSONL ledgers parsed and `git diff
--check` passed. The focused evidence remains 30/30 component tests, SPA build
exit 0, agenda/inventory browser downloads 2/2 and parity contract 4/4.

The bounded increment is approved only as GREEN for source-backed inventory
snapshot export. Report-only parity remains 98/100 with 4/11 areas verified;
enterprise readiness remains 95/100 (42 PASS, 3 WARN, 1 FAIL from strict
parity). Server-side audited export, the remaining financial/registration/custom
families, external providers, target operations and release remain open. Stop
decision remains `ACTIVE`; no global gate is promoted.

## Follow-up bounded checkpoint — reports workbench payable export — 2026-08-24

The next source-backed P0 slice connected the workbench to the existing
tenant-scoped `/financial/payables` subledger. `Contas a Pagar` exports all
loaded payable records; `Contas Pagas` requests the authoritative `paid`
status. Both use the protected immutable CSV builder and remain read-only;
settlement, cancellation and reconciliation actions stay in their financial
pages.

TDD RED was the still-disabled `Solicitar Excel` action. GREEN is the combined
utility/component suite 30/30, SPA build exit 0 and real Chromium downloads
3/3 for agenda, inventory and accounts payable. The parity contract passed
4/4; report-only parity remains 98/100 with 4/11 verified and the reports area
blocked only by cheques, advance-payment, registration/custom families and the
missing server-side audited-export contract. Enterprise readiness remains
95/100 (42 PASS, 3 WARN, 1 FAIL from strict parity). Stop decision remains
`ACTIVE`; no global gate is promoted.

## Final bounded verification — server-side audited payable export — 2026-08-24

The server-side payable increment completed its executable quality bar. API
route tests passed 7/7, the reports module passed 12/12, the workbench passed
29/29, the Enterprise browser gate passed 5/5, monorepo typecheck passed
70/70, security:enterprise passed with zero high/critical/moderate
dependency findings, vetus:parity:test passed 4/4, the SPA production build
passed with 769 modules, and the clinical-financial HTTP/PostgreSQL regression
passed 5/5. git diff --check and the control-ledger JSON parse also passed.

Temporal self-review checked the authenticated billing.read boundary,
principal-derived account scope, source pagination, status/search/date
validation, persisted execution/export, audit events, opaque foreign-account
errors, CSV formula neutralization and the persisted browser artifact. No
critical gap was found inside this bounded slice. The independent reviewer
could not start in this account, so this is CONDITIONAL_PASS based on fresh
executable gates and local review, not independent approval.

The E2E run used the explicit controlled test configuration with in-memory
runtime repositories despite a healthy disposable database; it is not
production persistence proof. The full API package still has the pre-existing
laboratory expectation mismatch (202 observed versus 201 expected). Global ERP,
complete Vetus parity, provider, production, Redis, RLS/FORCE RLS, DR/RPO,
operations, WCAG, coverage and release gates remain IN_PROGRESS/PARTIAL.
Stop decision remains ACTIVE; no global gate is promoted.

## Final bounded verification — server-side audited receivables export — 2026-08-24

The second server-side report slice now reads the authoritative
`EncounterFinancialService.listReceivables` source. `Contas a Receber` is
`open` and date-filtered by due date; `Contas Recebidas` is `settled` and
date-filtered by settlement date, with explicit issued-date fallback. The
route derives account scope from the authenticated principal, validates
status/search/date, drains every source page, persists the ReportsService
execution/export and appends audit events. The workbench drains the same source
for display and downloads only the persisted server artifact.

Fresh gates: API reports route 10/10, module-reports 12/12,
ReportWorkbenchPage 30/30, SPA build with 769 modules, Chromium 11/11
(Enterprise 6/6), clinical-financial HTTP/PostgreSQL 7/7, monorepo typecheck
70/70, security:enterprise with zero critical/high/moderate dependency
findings, and Vetus parity contract 4/4. Temporal local review found no
critical gap in this bounded slice. The independent reviewer role was
unavailable in this account, so the verdict is CONDITIONAL_PASS, not
independent approval. The controlled E2E uses in-memory runtime repositories
despite a healthy disposable database; this is not production persistence
proof. Global ERP, full Vetus parity, providers, production, Redis,
RLS/FORCE RLS, DR/RPO, operations, WCAG, coverage and release remain open.
Stop decision remains ACTIVE; no global gate is promoted.

## Final bounded verification — inpatient command idempotency — 2026-08-24

The next clinical-financial seam now protects admission and inpatient
daily-charge creation with the tenant command boundary. TDD RED exposed both
missing route seams; GREEN passed 16/16. Fresh PostgreSQL HTTP evidence passed
5/5 with two API instances, A/B tenant fixtures and real API/worker roles
created as `LOGIN NOSUPERUSER NOBYPASSRLS`; admission and daily replay/conflict,
durable HTTP idempotency rows, transaction/audit ordering and cross-instance
daily billing hydration are reconciled by SQL. Controlled clinical-financial
restart passed 1/1 and the inpatient child-process SIGKILL/takeover matrix
passed 4/4.

The bounded result is `CONDITIONAL_PASS`, not independent approval: no
independent reviewer was available in this account. Handoffs,
progress/occurrence idempotency, cross-domain failpoints, providers, Redis,
cluster/Secrets, global RLS/FORCE RLS, full Vetus parity, DR/RPO, operations,
WCAG, coverage and release remain open. Stop decision remains ACTIVE; no
global gate is promoted.

## Final bounded verification — clinical handoff/progress/occurrence idempotency — 2026-08-24

The clinical-notes increment moved inpatient progress and occurrence creation
inside the tenant command seam, added failure-time inpatient/audit cache
recovery, and made the progress-to-medical-record callback awaitable. The API
now waits for the `inpatient_progressed` clinical timeline projection before
the command completes. Fresh route tests passed 19/19. The HTTP/PostgreSQL
vertical passed 5/5 with two API instances, two tenants and real
`LOGIN NOSUPERUSER NOBYPASSRLS` roles; SQL reconciled handoff send/ack,
progress and occurrence replay/conflict, one durable idempotency row per
command and one clinical timeline projection. Controlled restart passed 1/1
and inpatient child-process SIGKILL/takeover passed 4/4.

The bounded result is `CONDITIONAL_PASS`, not independent approval: no
independent reviewer was available in this account. Assignment/transfer/status
bed transitions, remaining cross-domain failpoints, providers, Redis,
cluster/Secrets, global RLS/FORCE RLS, full Vetus parity, DR/RPO, operations,
WCAG, coverage and release remain open. Stop decision remains ACTIVE; no
global gate is promoted.

## Final bounded verification — inpatient bed/status command seams — 2026-08-24

The next clinical-financial increment moved inpatient bed assignment, bed
transfer and status update into explicit tenant command seams. Each mutation
validates the tenant-owned stay/bed, waits for inpatient persistence and audit,
and returns only after the transfer/status clinical callback completes. The
route recovery path refreshes inpatient/audit caches after an injected
post-command failure; the public vertical now binds the sector/bed service to
the durable database client.

Fresh evidence: API build and inpatient route tests passed 22/22; the
HTTP/PostgreSQL vertical passed 5/5 with two APIs, two tenants and real
`LOGIN NOSUPERUSER NOBYPASSRLS` roles. SQL reconciled assignment/status/transfer
replay and divergent conflict, one durable idempotency row per command, one
`inpatient_transferred` timeline row, three `inpatient_progressed` rows from
the journey and all three catalog beds available after discharge. Focused
Prettier passed. The independent reviewer role remains unavailable, so the
verdict is local `CONDITIONAL_PASS`; no global gate is promoted.

The next P0 is real cross-domain failure injection for bed persistence,
medical-record projection and audit, followed by endpoint-specific restart or
SIGKILL evidence. Production/provider/cluster/Secrets, Redis, global
RLS/FORCE RLS, DR/RPO, complete Vetus parity, WCAG, coverage, operations and
release remain open. Stop decision remains ACTIVE.

## Final bounded verification — inpatient cross-domain failpoint and recovery — 2026-08-24

A real PostgreSQL constraint failpoint on `clinical_timeline` caused the
status command to return 500 and rolled back the inpatient stay, clinical
timeline, audit and idempotency together. The hot medical-record cache was
then rehydrated from committed rows, and the same idempotency key succeeded
after the failpoint was removed with exactly one timeline, audit and completed
idempotency row. The process fixture now dispatches the public status command;
SIGKILL/replay passed 2/2 at `after_claim` and
`after_domain_command_before_cas`. Fresh regression evidence: route 22/22,
medical-records 17/17, failpoint 1/1, status process 2/2 and full clinical
vertical 6/6; API and module builds passed.

The verdict is bounded `CONDITIONAL_PASS`, not independent approval: no
independent reviewer was available. Bed/transfer/audit-specific database
failpoints, process restart for assignment/transfer, production/provider,
Redis, global RLS/FORCE RLS, DR/RPO, complete Vetus parity, WCAG, coverage,
operations and release remain open. No global gate is promoted; stop decision
remains ACTIVE.

## Final bounded verification — inpatient bed/transfer/audit recovery — 2026-08-24

The recovery boundary is now exercised with real temporary PostgreSQL
constraints for clinical-timeline projection, assignment bed occupation,
transfer destination occupation and audit persistence. The failpoint matrix
passed 5/5: failed commands returned 500 without committed state, and same-key
retries converged to one durable timeline/audit/idempotency result. The child
process fixture binds the sector/bed service to PostgreSQL and passed
assignment/transfer SIGKILL replay 4/4 at claim and post-command checkpoints;
the complete inpatient process regression passed 10/10. The current public
clinical-financial HTTP/PostgreSQL vertical passed 9/9.

The verdict remains bounded `CONDITIONAL_PASS`, not independent approval: no
independent reviewer was available. Temporary SQL constraints are not a
production fault-injection platform. Provider/production/Redis, global
RLS/FORCE RLS, DR/RPO, complete Vetus parity, WCAG, coverage, operations and
release remain open. No global gate is promoted; stop decision remains ACTIVE.

## Current bounded verification — consolidated clinical HTTP/cache rollback — 2026-08-25

The cross-domain correction now snapshots the medical-record cache before
inpatient status, transfer and progress commands. If the clinical projection
fails after creating a record in memory, the synchronous catch removes that
speculative record or restores the previous record/entries/timeline before the
deferred committed-row refresh.

Fresh evidence is route 24/24, medical-records 17/17, inpatient 17/17, API
boundary 366/366, API typecheck/build and the complete clinical-financial
HTTP/PostgreSQL vertical 11/11 on a fresh database with two API instances,
two tenants and restricted runtime roles. The vertical verifies the
HTTP-created Owner→Patient→Encounter chain through care, inpatient, billing,
stock, discharge, close and receipt, including exact SQL links/totals,
cross-tenant negatives, same-key close retry and clinical-timeline failpoint
retry.

Noether performed a fresh independent read-only review and returned
`CONDITIONAL_PASS`, with no BLOCKER/HIGH/MEDIUM finding. LOW observations are
direct unit coverage for `restoreEncounterSnapshot` and best-effort refresh
observability. The separate API db-persistence fixture remains harness debt:
its 16 tests require seeded tenant/auth principals and are not promoted by
this slice. Target RLS/FORCE RLS, representative restore/RTO-RPO, providers,
Redis failover, remote CI, Vetus parity, WCAG, coverage, operations and
release remain open; no global gate or go-live decision is promoted.

## Current bounded verification — CVG-001 setup-to-session — 2026-08-25

The setup lifecycle now has a real process proof across two hot API instances.
The RED reproduced a 503 under the intended `NOINHERIT` runtime role because
installer membership was not effective for the capability function. The GREEN
boundary uses `BEGIN`, `SET LOCAL ROLE cvg_installer`, the operation and
`COMMIT`/rollback on one connection; it does not change the safe login-role
inheritance contract.

The final process test passed 1/1 with a fresh database and random fixture
roles. It verified status propagation, exactly one installation, login and
session across replicas, refresh rotation, stale refresh rejection, logout
revocation on both replicas and second-setup `409`; generated secrets were not
returned or present in captured output. Setup unit tests passed 26/26,
installation/ACL integration 9/9, CI/runtime-role contracts 15/15, cleanup
5/5, full typecheck 70/70 and diff-check. Independent security/reliability
review approved the bounded implementation.

This does not close the full Quality Bar. Wizard Playwright/axe, invalid and
oversize input coverage, target RLS/FORCE RLS, Redis/failover, production,
global coverage, operations and release remain open. Stop decision remains
ACTIVE; no global gate, commit or push is promoted.

## Current bounded verification — CVG-001 setup wizard accessibility — 2026-08-25

The setup UI now exposes visible hints to assistive technology. `DsInput`
assigns deterministic hint/error IDs and selects the currently visible
description through `aria-describedby` for all supported control variants.
The component RED failed before the association existed; GREEN and the final
tests passed for input, textarea, select and error-over-hint precedence.

The focused component suite passed 9/9, design-system 26/26, SetupPage 8/8;
design-system typecheck, SPA vue-tsc, targeted lint, Prettier and diff-check
passed. Independent review approved after the initial coverage finding was
closed. The browser Playwright/axe wizard proof, invalid/oversize HTTP matrix,
target RLS/FORCE RLS, Redis/failover, DR/RPO, global coverage and release remain
open; no global gate is promoted.

## Current bounded verification — CVG-001 setup negative HTTP matrix — 2026-08-25

The setup process now has a negative HTTP matrix before mutation. Against a
fresh disposable PostgreSQL database and two restricted API processes it
returned `400 INVALID_JSON_BODY` for malformed JSON, `400 INVALID_SETUP_PAYLOAD`
for non-object/invalid fields, `401 INVALID_SETUP_TOKEN` without echo and `413
SETUP_PAYLOAD_TOO_LARGE`; the status remained setup-required before the valid
POST. The valid setup/session lifecycle continued to pass in the same 1/1 run.

The first assertion RED was corrected to the route's intentional generic parse
message. Independent read-only review approved the route-aligned coverage.
This remains bounded local evidence; browser Playwright/axe, target
RLS/FORCE RLS, Redis/failover, restore/RTO-RPO, production, coverage and
release remain open.

## Current bounded verification — CVG-001 setup browser/axe — 2026-08-25

The stale browser-open notes above are superseded for this bounded wizard
slice. The built SPA passed `pnpm test:e2e:spa:setup` 4/4 in Chromium after a
real axe RED found and fixed light-theme contrast. The final contract covers
exact status and setup URLs, GET/POST methods, no request cookies and exact
payloads on success and retry; it also covers form naming, keyboard/focus,
`aria-describedby`, `aria-invalid`, 390px layout, WCAG 2.1/2.2 AA axe tags and
cleanup of all credential fields after success/failure.

SetupPage 8/8, DsInput 9/9 and SPA typecheck/build passed; the test is selected
by the package setup script and CI enterprise list. Kepler independently
re-reviewed the corrected worktree and returned `APPROVE_BOUNDED` with no
HIGH/MEDIUM findings. `QB-UX-01` and related quality rows remain `PARTIAL`:
this does not certify all critical flows, dark-theme/manual review, target
RLS/FORCE RLS, Redis/failover, DR/RPO, parity, coverage, operations or release.

## Current bounded verification — SPA enterprise and clinical browser continuation — 2026-08-25

The selected enterprise browser gate passed 15/15 against the built SPA,
including dashboard/report exports, 360 reception/mobile and the four setup
wizard cases. The standalone critical journey passed 1/1 from Owner and Patient
through Encounter, clinical entry, billing item and close, with test-resource
cleanup. Appointment passed 2/2 and inpatient passed 2/2.

The adjacent billing suite is not promoted: 5/6 cases passed and the cash
settlement case stopped at `R$ 0,00` because the default local harness runs
with incompatible DB repositories disabled, so the persistent encounter cash
receipt route is absent. `API_DISABLE_INCOMPATIBLE_DB_REPOS=0` could not start
against the local unseeded database (`user_admin` session fixture missing).
`QB-CORE-01`/`QB-UX-01` remain `PARTIAL`; run the seeded Docker/CI E2E before
claiming billing receipt browser evidence. Target RLS/FORCE RLS, Redis/failover,
DR/RPO, parity, global coverage, operations and release remain open.

## Current bounded verification — SPA DB-backed Docker runner — 2026-08-25

O runner canônico `pnpm test:e2e:spa:docker` foi executado em uma stack Docker
descartável de PostgreSQL e Redis. O caminho aplicou migrations 0000–0143,
seed primário/secundário, verificou restart/rehydration do runtime e iniciou a
API/SPA com os repositórios persistentes habilitados.

O primeiro bootstrap expôs signer laboratorial ausente e a criação de roles
runtime não montada; os contratos de seed/Compose/role corrigiram as lacunas.
A primeira suíte pós-fix marcou 59/60 porque o stub visual comparava `/queue`
com uma requisição real `/api/queue`; a análise do diff descartou regressão de
tema e o stub foi endurecido com teste de contrato. Sem atualizar snapshots, a
repetição passou **60/60 em aproximadamente 4 minutos**, incluindo cash
settlement persistente.

Este GREEN é bounded ao runner local. O stop decision permanece ACTIVE:
RLS/FORCE RLS no PostgreSQL alvo, restore/RTO-RPO, Redis/failover, providers,
CI remoto, parity, cobertura, operações e release continuam sem promoção.

## Current bounded verification — restore drill timing — 2026-08-25

O contrato de restore começou RED porque o script não possuía campos de
tempo. Após a implementação, o contrato passou e o shell manteve `sh -n`
verde. O drill real foi repetido com bundle/PG16 descartáveis e produziu
`checksumVerification=passed`, `storageListingMatch=true`, 2 tabelas, 2
arquivos, `elapsedMs=8657` e fases de 995 ms, 6961 ms, 581 ms e 14 ms.

Isso fecha apenas a observabilidade do drill local. O stop decision permanece
ACTIVE: backup representativo, RTO/RPO, retenção e restore/failover no ambiente
autorizado ainda não foram executados.

## Current bounded verification — local FORCE RLS catalog — 2026-08-25

The first catalog contract was intentionally RED: 123 public tables carrying
`account_id` had RLS enabled but not `relforcerowsecurity`; `installation_state`
was the documented global exception. Migration `0144_force_rls_tenant_tables.sql`
now applies `FORCE ROW LEVEL SECURITY` to every public base/partitioned tenant
table and excludes only that setup singleton.

The fresh catalog contract passed 2/2. The adjacent RLS/isolation/sensitive-ACL/
installation regression passed 4 files and 26/26 tests, with migration-source
and static RLS guards green. This is local bounded evidence only: target
ownership/grants, NOBYPASSRLS runtime roles, cross-tenant proof, staging,
restore/RTO-RPO, Redis, providers, parity, coverage, operations and release
remain open. The CI repository-guards command now includes the catalog
contract; its focused composition test passed 4/4.

## Current bounded verification — representative restore drill — 2026-08-25

The official `pnpm ops:restore:drill:fixture:representative` command passed
end-to-end. The representative fixture applies canonical migrations 0000–0144
in disposable PostgreSQL, restores 176 public tables and 3 storage files, and
passes 19 graph assertions after `SET ROLE restore_probe` with
`rolsuper=false,rolbypassrls=false` and `app.current_account_id`; checksums, TOC,
globals and listing match are green. Report timing is `elapsedMs=28610`.

This is bounded local evidence only. Target backup/RTO-RPO, retention,
ownership/grants, failover, Game Day, remote CI, providers, parity, coverage,
operations and release remain open; CVG-002C6 remains `IN_PROGRESS` and stop
decision remains ACTIVE.

## Current bounded verification — behavioral evidence spine — 2026-08-25

CVG-003 now has a revision-bound local matrix at
`docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md`. Its contract maps every
frozen Quality Bar ID to observable rejecting evidence, artifact/ledger and an
honest status; the focused test passed 2/2. Repository-guards now runs that
contract with `REQUIRE_TEST_DB=1`, and the CI composition contract passed 4/4.

This closes only the core matrix/indexing gap. It does not turn `PARTIAL` or
`BLOCKED` rows into release evidence; subordinate Gauntlet criteria, target
operations, providers, parity, global WCAG/coverage and release remain open.

## Current bounded verification — subordinate Gauntlet evidence index — 2026-08-25

`docs/engineering/GAUNTLET_SUBCRITERIA_EVIDENCE.md` now indexes the 30 unique
`QB-*` identifiers present across `.gauntlet/state.md`, including
`QB-REL-CRITICAL-HARNESS` from the historical continuity record. Each row has
five auditable cells: frozen source/criterion, rejecting observable behavior,
artifact/ledger reference and an honest bounded status/limit.

The Node contract passed 2/2 after a deliberate RED for the missing document
and a parser RED that exposed the table-only 29-ID blind spot. The parser now
collects all frozen `QB-*` tokens and the repository-guards workflow invokes
the contract. The combined matrix/CI contract passed 2 files/6 tests.

This remains an audit index, not behavior or release proof. `PASS_BOUNDED`
rows are local scope only; `PARTIAL`, `BLOCKED`, `FAIL` and `NOT_RUN` remain
open. Confucius returned `APPROVE_BOUNDED` without a blocking finding, and the
final formatting, test, validator, ledger, diff, staging and Docker-residue
controls passed. Target evidence and publication authorization remain
required; stop decision remains ACTIVE.

## Current bounded verification — critical process regression — 2026-08-25

The canonical `test:critical:process` runner passed all eight serial process
boundaries after migrations `0000`–`0144`: setup/session `1/1`, inpatient
SIGKILL/takeover `10/10`, clinical-financial restart `1/1`, cash SIGKILL `1/1`,
cash concurrency `1/1`, PIX settlement `8/8`, worker entrypoint `1/1` and
webhook delivery `1/1`. Each child used a distinct ephemeral database suffix.

Artifact: `.agent/artifacts/CVG-002C6-critical-process-regression-2026-08-25.md`.
The eight exact databases created by this run were removed in a separate
cleanup step and no critical-process/restore Docker residue remained. An
independent review returned `APPROVE_BOUNDED`, with the explicit caveat that
cleanup is not automatic runner behavior.

This strengthens only local process-harness continuity. Target execution,
ownership/grants/cross-tenant RLS, provider/Redis failover, RTO/RPO, parity,
global WCAG/coverage, operations and release remain open; stop decision remains
ACTIVE.

## Current bounded verification — critical base regression — 2026-08-26

A first full local base run exposed one honest RED in the marketing fixture:
`OWNER_A` and `OWNER_B` were generated and passed to consent, but no `owners`
rows existed. The tenant-scoped MarketingService validation correctly rejected
the missing Owner. The GREEN was limited to inserting both Owners in account A;
the focused test then passed 1/1.

The repeated suite covering `tests/integration/database`,
`tests/integration/setup` and `tests/integration/foundational.test.ts` passed
**40/40 files and 447/447 tests** in 698,27 s after migrations `0000`–`0144`.
The exact disposable database was dropped, the matching suffix query was
empty and no critical-process/restore/restore-drill container remained.

Artifact: `.agent/artifacts/CVG-002C6-critical-base-regression-2026-08-26.md`.
Confucius returned `APPROVE_BOUNDED`; the review confirmed the command, the
fixture-only correction, cleanup wording and bounded limits, with the caveat
that raw stdout is not attached for a second independent check of the aggregate
447/447 and duration values. This remains local evidence only; target,
providers/Redis, RTO/RPO, parity, coverage, operations and release remain open.

## Current bounded verification — CVG-003 spine reconciliation — 2026-08-26

The requirement matrix and subordinate Gauntlet index now cite the fresh
critical-base artifact for `QB-CLIN-01`/`QB-CORE-01` and `QB-REL-01`. The
reconciliation preserved the existing `PARTIAL` and `BOUNDED PASS` states.

The combined matrix/CI contract passed 2 files and 6 tests in 52,07 s; the
subordinate Node contract passed 2/2. The disposable database was removed
explicitly. Artifact:
`.agent/artifacts/CVG-003-evidence-spine-reconciliation-2026-08-26.md`.

Confucius first found a wording-precision issue and then returned
`APPROVE_BOUNDED` after the artifact distinguished documentary reference
changes from the existing read-only verification contracts. This remains local
audit-spine evidence only; product, target, provider/Redis, RTO/RPO, parity,
coverage, operations and release remain open.

## Checkpoint — CVG-003 access-control/audit/cache — 2026-08-26

The authorization, audit-persistence and cross-instance cache slice is
`PASS_BOUNDED`. The initial independent critique found the token/data H-01
race; the implementation now reads the change token before and after the
account-scoped snapshot, retries unstable reads, coalesces hydrations per
account, awaits audit persistence, fails closed during pending mutations,
refreshes after commit, and bounds audit inputs.

Fresh evidence: access-control 32/32, API 373/373, disposable PostgreSQL/HTTP
vertical 14/14, green builds/typecheck, and protected-route revocation denied
on the secondary instance. Turing's final independent review returned
`APPROVE_BOUNDED`. Artifact:
`.agent/artifacts/CVG-003-access-control-audit-cache-2026-08-26.md`.

Global state remains `IN_PROGRESS`/`PARTIAL`; target ownership/grants/RLS,
Redis/failover, providers, RTO/RPO, remote CI, parity, coverage, operations,
rollout and go-live evidence remain open. No commit, push, staging, or
production action was performed.

## Current bounded verification — release identity/deploy surface — 2026-08-26

The release identity contract now declares `CVG-HIS-V4`, the V4 repository
metadata, `docker-compose.v2.yml`, and `infra/helm/cvg-his-v2` as canonical
surfaces while retaining V2 names only as compatibility identifiers.
`charts/helm` is explicitly non-canonical and its README no longer contains
installation commands or `/health/startup`. The active deploy guard scanned 68
files, passed the current tree, and rejected an artificial active reference to
the legacy track; repository-guards executes the guard.

The focused Vitest contract passed 2 files/6 tests with disposable PostgreSQL
setup, `deploy:check` passed 12/12, OpenAPI passed 345 paths/40 tags/396
schemas, and YAML/JSON/diff checks passed. Helm validation was static only
because the Helm binary was unavailable. No independent reviewer returned in
this round, so the result is `PASS_BOUNDED` local control-plane evidence, not
approval. Target render/rollout, remote CI, rollback, provider/Redis,
RTO/RPO, parity, coverage, operations and go-live remain open.

## Current bounded verification — executable Helm gate — 2026-08-26

The Helm validator now has an explicit fail-closed mode. With REQUIRE_HELM=1,
missing Helm or a version other than v3.15.4 exits non-zero. The repository
guard installs the pinned Linux archive, verifies SHA-256
11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9, and runs
the required validator. The local official Helm v3.15.4 run passed lint/template
for dev, staging and prod.

The missing-executable contract passed 2/2, the CI contract 4/4, the deploy
surface contract 3/3 and syntax/YAML/diff checks passed. This is bounded
control-plane evidence only: GitHub execution, cluster render, target identity,
rollout/rollback, providers, Redis, RTO/RPO, parity, coverage and go-live
remain open. No independent approval is claimed for this slice.

## Final control — Helm executable gate — 2026-08-26

Estado: `PASS_BOUNDED` local/declared-CI. Validator 5/5; CI/deploy contracts
8/8; official Helm v3.15.4 via explicit `HELM_BIN` passed dev/staging/prod;
SHA/path/version and fail-closed behavior are guarded. Averroes returned
`CONDITIONAL PASS` after the HIGH/MEDIUM findings were resolved; only minor
constant duplication and worktree/untracked hygiene caveats remain. Target
render, remote workflow, rollout/rollback and go-live remain open.

## Final control — access/final-guard/restore-security — 2026-08-26

Estado: `PASS_BOUNDED` local. Access-control 35/35, API typecheck, webhook
2/2, deterministic PostgreSQL/HTTP revocation interleaving, restore security
13/13 and representative restore 176/3/19 passaram. Hooke e Averroes deram
`PASS`; a varredura confirmou 406 guards de rotas e 79 guards no servidor,
todos aguardados. Permanece aberta a linearização de autorização por
transação/versionamento após a leitura final, além de target, CI remoto,
providers, Redis, parity, coverage, operations e release. O programa segue
`IN_PROGRESS/PARTIAL`; nenhum target ou sistema de produção foi tocado.

## Final control — structured laboratory results — 2026-08-26

Estado: `PASS_BOUNDED` local para CVG-004. `resultValues` é validado,
defensivamente copiado/congelado, persistido em `diagnostic_orders` e
`diagnostic_order_workflows` pela migration 0145, incluído na assinatura e
exposto pelo API/OpenAPI, relatório imprimível e páginas analíticas. A
compatibilidade com `resultSummary` permanece; recolhimento limpa valores
antigos e a busca de laboratório é estruturada e accent-insensitive.

Diagnostics passou 30/30 com 1 arquivo PostgreSQL skipado pelo pacote; a prova
PostgreSQL passou 1/1; API 21/21; SPA 7/7; OpenAPI 345/40/397;
migration-source, typecheck/build, revisão independente e diff check passaram.
Russell retornou `PASS` após três achados MEDIUM e um LOW serem corrigidos.
Artefato: `.agent/artifacts/CVG-004-laboratory-structured-results-2026-08-26.md`.

Este resultado não promove a paridade geral: 4/11 áreas Vetus continuam
verificadas e o status funcional permanece `NOT VERIFIED`; clínica continua
2/3 com provider/homologação bloqueados. Target, CI remoto, RTO/RPO, providers,
Redis, cobertura, operações e release permanecem abertos. Nenhum commit, push,
staging, deploy ou sistema de produção foi tocado.

Follow-up bounded: `LaboratoryResultsPage` também inclui parâmetro, valor,
unidade e referência na busca local de corpo, com fallback e normalização sem
acentos. O teste do consumidor geral passou 5/5; a suíte analítica 7/7 e o
typecheck SPA permaneceram verdes. A revisão narrow não encontrou novo
problema; nenhum bloqueador externo foi promovido.

## Current bounded verification — CVG-003 transaction authorization linearization — 2026-08-26

Recovery reconciled the stale pointers and preserved the historic ledger field
conventions. The selected P0 slice adds an account-scoped PostgreSQL
transaction advisory lock before the final fresh authorization read, inside
the existing tenant unit of work. The helper fails closed when no active scope
exists or the account does not match; read-only and direct SQL/admin paths are
outside the scope.

Intentional RED unit and two-instance PostgreSQL/HTTP race evidence showed the
old final-guard-only gap. GREEN evidence passed shared transaction controls
8/8, API regression 374/374 and the exact race 1/1 selected with 15 unrelated
tests intentionally skipped. Parfit's independent review returned PASS with no
Critical/High/Medium finding. This is `PASS_BOUNDED` local evidence only.

Global state remains `IN_PROGRESS/PARTIAL`: general Vetus parity is 4/11 and
`NOT VERIFIED`, clinical parity is 2/3, readiness is 95/100, and target,
provider/homologation, Redis, restore/RTO-RPO, remote CI, coverage, operations
and release remain open. Keep `next_gate=VERIFIED` as the next target rather
than a passed gate; reconcile the ledgers and choose the next bounded control.

## Current bounded verification — CVG-004 audited server-side Cheques report — 2026-08-26

The corrected implementation adds the financial-cheques catalog and a
tenant-scoped persisted counter-sale payment source. It filters method=check
by payment createdAt, maps only stored payment/sale facts, uses the existing
audited report execution/export path and rejects snapshots above 10,000 rows
after reading at most one extra row. SQL date bounds are explicit UTC
half-open timestamps. The SPA consumes the persisted execution, clears stale
rows and success state, validates malformed responses and does not hydrate
sale details or infer lifecycle fields.

Local GREEN evidence is current: counter-sales 39/39, reports 12/12, compiled
reports routes 11/11, API 375/375, ReportWorkbench 34/34, builds/typechecks and
the relevant contract/security/diff checks passed. Zeno's independent review
returned PASS with no Critical/High/Medium finding. This is PASS_BOUNDED for
the local report slice only; focused tests do not directly execute the live SQL
method against seeded report rows, and the production-like runtime refuses the
in-memory fallback. The general parity gate is still 4/11 at 98/100 evidence
and NOT VERIFIED, clinical parity is 2/3 and NOT VERIFIED, and enterprise
readiness is 95/100 with 42 PASS, 3 WARN and 1 FAIL. Keep next_gate=VERIFIED
as a target, not a passed gate; Pagamento Antecipado, registration/custom
reports, worker delivery, providers, target, operations, coverage,
accessibility and release evidence remain open.

## Current bounded verification — CVG-004 scheduled Cheques worker source — 2026-08-26

The worker now resolves the existing `financial-cheques` report from the
tenant-aware persisted counter-sale payment source, forwards schedule date
filters and maps only the report catalog facts. The database bootstrap reuses
the `CounterSalesService` instance for commercial and Cheques sources; missing
Cheques source configuration fails closed.

The intentional RED compilation failed before the source contract existed; a
follow-up RED caught a numeric schedule date before strict boundary validation.
Final direct coverage also rejects impossible calendar dates and inverted
intervals. GREEN passed the worker package suite with 23 runner tests and all
auxiliary worker suites. The real PostgreSQL one-shot worker process suite
passed 6/6, including a persisted check payment and the saved report execution
row. The retry path now omits a delivery when source resolution fails before
execution, while post-execution export/provider failures retain the stable
execution identity needed by the retry worker. The independent review returned
PASS with no Critical/High/Medium finding; the one-tenant process fixture is a
documented LOW limitation. This is `PASS_BOUNDED` only for the local scheduled
Cheques source; it does not claim external provider delivery or complete
report/Vetus parity.

Global state remains `IN_PROGRESS/PARTIAL`: general parity is 4/11 at 98/100
evidence and `NOT VERIFIED`, clinical parity is 2/3, readiness is 95/100, and
Pagamento Antecipado, registration/custom reports, remaining report families,
providers, target, operations, coverage, accessibility and release remain
open. No external mutation was made.

## Current bounded verification — CVG-004 persisted inventory purchases SPA — 2026-08-26

The persisted purchase queue contract is now consumed by the SPA through the
existing account-scoped service. The list preserves stored line facts and
statuses, computes open value from persisted totals/receipts, clears stale
derived rows on failed refresh and avoids inventing delivery dates. The new
read-only detail route renders the entity, all lines, audit timestamps, and
missing/retry states without introducing a mutation.

RED was the focused page failure before `listPurchases` consumption. GREEN was
25 inventory test files/103 tests, SPA typecheck/build and focused Playwright
1/1; the inventory module remained 24/24. OpenAPI, security, secrets,
migration-source, deploy-surface, Prettier and diff-check were green. The
browser proof uses an API stub and is not a PostgreSQL browser-persistence or
two-tenant/restart/concurrency/failure claim.

`PASS_BOUNDED` applies only to this local SPA integration. Global parity,
clinical parity, readiness, Pagamento Antecipado, remaining Vetus families,
providers, target, backup/restore, CI, coverage, accessibility, operations and
release remain open; no commit, push, staging, deploy, provider, target or
production action occurred. Artifact:
`.agent/artifacts/CVG-004-inventory-purchases-spa-2026-08-26.md`.

Two independent reviews in this slice found and drove corrections for the
persisted open-value calculation, detail navigation and error/retry state.
Two subsequent narrow final-review attempts did not return and were shut down;
they are not counted as approval. The bounded local result rests on the
corrections, direct post-correction inspection and green local gates.

## Current bounded verification — CVG-004 audited registry exports — 2026-08-26

The owner and patient registry reports now use the existing audited
server-side execution/export path. `registration-owners` and
`registration-patients` require the existing tenant permissions, filter stored
`createdAt` with strict ISO dates, leave optional facts blank and reject more
than 10,000 rows. The SPA buttons assert the audited execution and CSV export
requests while keeping the table views read-only.

RED caught the missing SPA action and API definition. GREEN passed Reports
13/13, compiled report routes 12/12, ReportWorkbench 35/35, builds/typechecks
and Playwright 2/2. The browser uses API stubs; live PostgreSQL browser
persistence, two-tenant restart/concurrency/failure, providers, target,
operations and release remain unproven. Global parity is still 4/11 at 98/100
evidence, clinical parity 2/3 and readiness 95/100.

The specialized reviewer was rejected by account model policy and the default
reviewer timed out without a report; no reviewer PASS is inferred. This is
`PASS_BOUNDED` local evidence for Clients/Animals only. Services, suppliers,
Pagamento Antecipado, personalized and remaining report families remain open;
no commit, push, staging, deploy or production action occurred.

## Current bounded verification — CVG-004 audited services registry export — 2026-08-26

O cadastro persistido de Serviços foi conectado ao caminho server-side auditado
como `registration-services`. A rota exige `service.read`, usa o
`ServicesService` hidratado em modo database para a conta autenticada, valida
datas ISO estritas, limita 10.000 linhas, mantém opcionais vazios e recusa
fallback em memória. A SPA conserva a tabela read-only e solicita execução e
exportação CSV auditadas.

RED confirmou a ausência do catálogo, da fonte API e da ação SPA. GREEN passou
Services 17/17, Reports 14/14, rotas compiladas 14/14, páginas Reports 56/56,
build/typecheck e Playwright 3/3 depois do rebuild do `dist`; o timeout inicial
foi somente artefato stale. A tentativa de revisão independente foi rejeitada
por incompatibilidade do modelo da conta e não gera aprovação.

O bounded local é `PASS_BOUNDED`; CVG-004 e o programa seguem
`IN_PROGRESS/PARTIAL`. A auditoria global permanece 98/100 com 4/11 áreas
verificadas, clínica 100/100 com 2/3 e readiness 95/100 (42 PASS, 3 WARN,
1 FAIL). Worker público, laboratório, fornecedores, Pagamento Antecipado,
personalizados/demais relatórios, providers, target, dois tenants, backup,
restore, CI remoto, coverage, acessibilidade, operações e release continuam
abertos. Nenhuma mutação externa ocorreu.

## Current bounded verification — CVG-004 public API to durable worker chain — 2026-08-26

O fluxo autenticado `POST /billing/estimate` agora tem uma prova local de
composição: uma linha `billing.record.created` pendente é persistida no
outbox, o processo real restrito de `apps/worker/src/index.ts` reporta
`payments`, `billing` e `webhooks`, processa o evento pelo guard durável e o
completa. Após restart permanecem um evento, três claims no inbox e um registro
de billing; a segunda conta do fixture não recebe evento. Os papéis API/worker
são verificados como logináveis, sem superuser, `BYPASSRLS`, herança,
replicação, criação de role ou criação de database.

A execução final fresca passou 1/1 depois da correção de uma falha somente do
harness, em que o polling consultava um UUID placeholder em vez do ID real do
outbox; ela não é contada como RED de produto. Não há aprovação independente:
os scouts de orquestração não iniciaram porque a capacidade Spark configurada
estava esgotada. O resultado é `PASS_BOUNDED` somente para essa cadeia local.

Paridade geral/clínica, readiness, observabilidade distribuída do worker,
retry/DLQ com falha injetada, conectores externos, importação Vetus,
fornecedores, Pagamento Antecipado, relatórios personalizados/demais,
providers, target, dois tenants, backup/restore, CI, coverage, acessibilidade,
operações e release continuam abertos. Não houve commit, push, staging,
deploy, provider, target ou produção.

## Current bounded verification — CVG-004 public laboratory structured-results process — 2026-08-26

La prueba local autenticada de laboratorio pasó 1/1 en tres bases PostgreSQL
efímeras nuevas, incluida la ejecución equivalente al runner crítico. Cubre
orden, transiciones `collected`/`in_analysis`/`reported`/`recollected`, rechazo
de firmante falsificado, identidad del firmante derivada por servidor, ALT
estructurado en persistencia y búsquedas, replay idempotente, limpieza de
resultado/firma al recollectar, roles runtime restringidos y aislamiento entre
cuentas. La prueba ya estaba verde antes de cambios de producción:
`BASELINE_PASS_NO_PRODUCT_RED`.

El manifiesto crítico quedó con 9 procesos seriales. El revisor independiente
expiró sin informe y no se infiere aprobación. El resultado es
`PASS_BOUNDED` solo para esta composición local; paridad Vetus general/clínica,
proveedor/Live Lab, worker distribuido, importación, release y demás gates
externos siguen abiertos. No hubo commit, push, staging, deploy, provider,
target, credencial, migración ni mutación de producción.

## Current bounded checkpoint — CVG-004 supplier/expense registry export — 2026-08-26

`registration-suppliers` is now verified only as a local, on-demand,
read-only ReportsService export over authenticated-account finance catalog
facts. The source is fail-closed when the database repository is not composed;
filters, strict persisted dates, deterministic pagination and the 10,000-row
guard are enforced before audit persistence. Migration 0146 is additive with
tenant RLS/FORCE RLS. The SPA executes and exports through the existing audited
server path, and `description` remains `Descrição` rather than an inferred
supplier attribute.

Current bounded result: `PASS_BOUNDED`. Reports 15/15, API 382/382, SPA 36/36,
finance/global RLS 4/4, migration unit 1/1, canonical runtime 1/1, and official
coverage 82.07% statements / 80.06% branches / 88.53% functions / 82.07% lines.
The independent critique’s seven P1/P2 findings were addressed. The parent
CVG-004 and global gates remain `IN_PROGRESS/PARTIAL`; general parity is
98/100 with 4/11 verified, clinical parity 100/100 with 2/3 verified, and
readiness 95/100 (42 PASS, 3 WARN, 1 FAIL). No external, target, provider,
production, commit, push, deploy or release action occurred.

## Current bounded checkpoint — CVG-004 inventory transaction-context repair — 2026-08-26

The latest critical regression found a concrete fail-closed composition defect:
inventory consumption entered the non-idempotent tenant-command fallback, but
the fallback did not install `TenantTransactionContext`; Flow 7 returned
`503 TRANSACTION_REQUIRED`. The contract test first failed at TypeScript RED,
then the repair propagated actor/correlation metadata to the existing context
aware transaction helper.

Fresh local evidence is green: helper 8/8, API 383/383, Flow 7 1/1, critical
HTTP 11/11, full Docker SPA PostgreSQL/Redis 64/64, full typecheck and lint,
coverage 82.06% statements / 80.06% branches / 88.53% functions / 82.06%
lines, OpenAPI/RLS/secrets/migration-source/deploy-surface. The gate is
`PASS_BOUNDED` only for this fallback composition. The current SPA runner
provisions `admin_b` and `reception`, correcting the stale note, but the access
area remains blocked until all seven profiles and sensitive operations are
covered.

General parity remains 98/100 with 4/11 verified; clinical parity 100/100 with
2/3; readiness 95/100 with 42 PASS, 3 WARN and 1 FAIL. No independent reviewer
was available, so no approval is inferred. Target, provider, Redis failover,
backup/restore, remote CI, full access governance, operations and release gates
remain open. No external mutation occurred.

## Current bounded checkpoint — CVG-003 canonical seven-profile access matrix — 2026-08-26

`PASS_BOUNDED` applies to the local application access boundary. The shared v2
catalog has 64 permission seeds and seven exact role projections; migration
0147 aligns only the seven system roles, and dedicated route tests cover
prescription executions, discharges and LGPD requests. Fresh disposable
PostgreSQL/Redis E2E passed 1/1 across the seven profiles, governance
allow/deny boundaries and cross-account access-subject isolation. API passed
385/385 and catalog contracts 4/4.

The full SPA aggregate had one queue visual `networkidle` timeout among 65
tests; the same target passed 1/1 immediately afterward. It is retained as a
transient flake rather than hidden as a 65/65 pass. The independent reviewer
was unavailable and no approval is inferred. Parent CVG-003, global parity,
target/provider/operational LGPD, worker failure, accessibility, operations
and release gates remain open. No external mutation occurred.

## Current bounded checkpoint — CVG-004 audited advance-payment report — 2026-08-26

The local advance-payment report slice is `PASS_BOUNDED`. Migration 0148,
the tenant-scoped source, API route, SPA workbench and audited export path are
covered by fresh focused evidence: reports/migration 17/17, API 389/389, SPA
38/38, disposable PostgreSQL 5/5 and canonical runtime 1/1. Full typecheck,
lint, coverage, security and structural controls remain green. The initial
independent critique found and the implementation corrected the SPA filter
gap and table-only bootstrap composition; no reviewer approval is inferred.

Parent CVG-004 and global parity/readiness remain `IN_PROGRESS/PARTIAL`.
Advance-payment writes, providers, target operations, accessibility,
operations and release evidence remain open. No commit, push, deploy, provider,
target or production mutation occurred.

## Current bounded checkpoint — CVG-004 advance-payment write lifecycle — 2026-08-26

`PASS_BOUNDED` applies only to manual advance-payment issuance and append-only
compensation through the canonical 0148 ledger. The authenticated
`billing.manage` commands validate exact BRL cents and idempotency, execute in
the tenant UoW, derive tenant/actor identity server-side, append audit/outbox
events transactionally and rely on the database over-allocation guard. The
Finance SPA reads persisted summaries rather than synthetic owner credit
metadata and exposes explicit pending/empty/error/retry/success states.

Fresh local evidence passed API 5/5 and 394/394, focused SPA/service 7/7 and
full SPA 1,036/1,036, disposable PostgreSQL 7/7, typecheck, lint, build,
coverage 1,954 passed/1 skipped at 82.09% statements, 80.07% branches, 88.53%
functions and 82.09% lines, plus OpenAPI/RLS/migration/deploy/Helm/security and
parity-contract controls. TDD found and fixed malformed encoded UUID handling
and unsafe persisted bigint conversion. The global readiness command remains
95/100 (42 PASS, 3 WARN, 1 FAIL), so parent/global status stays
`IN_PROGRESS/PARTIAL`; no external mutation occurred.

## Current bounded verification — CVG-004 Vetus import integrity — 2026-08-26

The bounded import control plane is `PASS_BOUNDED`. The additive canonical
0149 stores internal fingerprints for normalized single/batch commands, rejects
divergent source references with 409, locks source acquisition in the tenant
transaction, preserves rejected row numbers on resume, and protects batch
response size before the final audit write. Fresh authenticated HTTP→PostgreSQL
evidence passed 7/7 with two API instances and migrations through 0149;
focused route/cache/UoW passed 25/25; full API passed 401/401; workspace
typecheck/lint passed across 70 projects; official coverage is 81.98% statements,
80.08% branches, 88.56% functions and 81.98% lines.

Commit/rollback recovery refreshes owner, patient and audit caches. The
per-account queue waits for all sibling refreshes to settle, including when one
fails, and the final independent reviewer returned `PASS_BOUNDED` with no
current High/Medium findings. This remains a local bounded control-plane
result. General Vetus parity/readiness, browser/target/provider evidence,
external reconciliation, distributed worker failure, backup/restore,
accessibility, operations, remote CI and release remain open. Parent/global
state is still `IN_PROGRESS/PARTIAL`; no commit, push, staging, deploy or
external mutation occurred.

## Current bounded verification — CVG-002B2B signed synthetic PIX composition — 2026-08-26

The signed synthetic PIX composition is `PASS_BOUNDED` only. The current
evidence proves raw-body HMAC ingress, durable receipt/delivery replay,
cross-tenant spoof rejection, retry before attempt correlation, actual worker
shared-B1 settlement, service-principal revocation linearization and
independent-process SIGKILL/restart fencing. Focused, process and package
results are recorded in the task, artifact, gate and verification ledger.

The fixes include production-like environment aliases and process-environment
guards, append-only API lookup compatible with SELECT-only ACL, worker
schema/RLS/ACL readiness, the shared tenant authorization lock, transactional
fixtures and explicit ephemeral-database teardown. Global setup and db-admin
also preserve an explicitly non-ephemeral database without reset, creation,
migrations, seed, grants or drop, and the guarded process suites/hooks skip in
that mode. The final independent read-only review returned `PASS_BOUNDED`
with no Critical, High or remaining Medium finding. This bounded review must
not be read as global readiness. Privileged SQL writers outside runtime roles
remain a residual until their writer protocol is enforced.

Parent CVG-002B2B, CVG-002 and global state remain `IN_PROGRESS/PARTIAL`.
General parity is 98/100 with 4/11 verified, clinical parity is 100/100 with
2/3 verified, and enterprise readiness is 95/100 with 42 PASS, 3 WARN and 1
FAIL. Real providers, target, external reconciliation, browser/accessibility,
backup/restore, remote CI, operations and release remain open. No commit,
push, staging, deploy or external mutation occurred.

## Current bounded verification — CVG-003 prescription collection tenant isolation — 2026-08-26

The prescription collection isolation slice is `PASS_BOUNDED`. The service
requires the authenticated account for encounter/patient filters and applies
the predicate before returning summaries; the route validates query values and
passes only principal-derived tenant context. The two-account hydration
regression with shared clinical identifiers passed for both filters.

Fresh evidence is 37/37 focused integration/service tests, 32/32 prescription
unit tests, 401/401 full API tests, module/API typechecks, Prettier, ESLint and
diff hygiene, with official coverage 1,959 passed/1 skipped at 81.98%
statements, 80.08% branches, 88.56% functions and 81.98% lines. The final
independent reviewer returned `PASS_BOUNDED` with no current blocker finding.

The gate remains bounded to local application service/HTTP behavior and does
not claim PostgreSQL-specific HTTP evidence, all clinical routes, target RLS,
providers, direct SQL writers, accessibility, operations or release. Parent
CVG-003 and global state stay `IN_PROGRESS/PARTIAL`; parity is 98/100 (4/11),
clinical parity 100/100 (2/3), and enterprise readiness 95/100 (42 PASS, 3
WARN, 1 FAIL). No commit, push, deploy or external mutation occurred.

## Current bounded verification — CVG-003 prescription-execution collection tenant isolation — 2026-08-26

The prescription-execution collection slice is `PASS_BOUNDED`. The service
requires principal-derived account context for encounter/patient filters and
applies the account predicate before returning records; missing context fails
closed. The route rejects empty values and never broadens a filtered request
to the account list. Unit hydration and HTTP-shaped tests cover two accounts
with shared encounter/patient identifiers.

Fresh evidence passed module 15/15, route 2/2, HTTP-shaped integration 1/1,
full API 402/402, module/API typechecks, Prettier, ESLint and diff hygiene.
Official coverage is 1,960 passed/1 skipped at 81.98% statements, 80.08%
branches, 88.56% functions and 81.98% lines. Independent review returned
`PASS_BOUNDED` with no current blocker finding.

The gate is limited to local application service/HTTP behavior and does not
claim PostgreSQL-specific collection proof, all administration-event detail
ownership, target RLS, providers, operations, accessibility or release.
Parent CVG-003 and global state remain `IN_PROGRESS/PARTIAL`; parity is
98/100 (4/11), clinical parity 100/100 (2/3), readiness 95/100 (42 PASS, 3
WARN, 1 FAIL). No external mutation occurred.

## Current bounded verification — CVG-003 triage collection, history and update tenant isolation — 2026-08-26

O slice de triagem foi reconciliado como `PASS_BOUNDED`, com residual `HIGH`.
`AccountId` é obrigatório na hidratação, coleção, detalhe, histórico, criação
e atualização; os queries do repositório são account-scoped; filtro vazio
falha fechado; cópias defensivas, rollback de cache e ordenação POST passaram.
O fixture HTTP usa duas contas e cobre coleção própria, histórico/PATCH/POST
cruzados; módulo `10/10`, serviço `3/3`, API `405/405`, PostgreSQL `17/17`,
typechecks, Prettier, ESLint escopado e cobertura oficial `1.964/1 skipped`
(`82,03% / 80,20% / 88,59% / 82,03%`) passaram.

A revisão independente retornou `PASS_BOUNDED`, sem Critical/High, mantendo
residuais de atomicidade dependente do wrapper transacional, HTTP local sem
prova TCP/RLS do target, lint agregado com 45 diagnósticos não relacionados e
um gap de teste separado para mutação de snapshot persistido. CVG-003 e o
programa global permanecem `IN_PROGRESS/PARTIAL`; paridade geral `98/100`
(`4/11`), clínica `100/100` (`2/3`) e readiness `95/100` (`42 PASS / 3 WARN /
1 FAIL`). Não houve mutação externa.

## Current bounded verification — CVG-003 discharge tenant isolation — 2026-08-26

O slice `CVG-003-DISCHARGE-TENANT-ISOLATION` foi reconciliado como
`PASS_BOUNDED`. O serviço e os dois repositórios exigem `AccountId` não vazio;
leituras, atualização, lookup por encounter e delete aplicam escopo de conta;
modelos retornados são cópias defensivas; e a fila não fica envenenada por uma
falha de persistência. O PATCH reidrata a conta antes de ler e atualizar,
permitindo atender uma réplica secundária; o INSERT compara a conta solicitada
com `app.current_account_id()`; e o update usa `version` anterior como guarda
atômica.

Evidência fresca: módulo `17/17`, rota `2/2`, integração HTTP→PostgreSQL
descartável `6/6`, API `406/406`, concorrência de repositório com um conflito,
criação com conta ativa incompatível, builds/typechecks, lint isolado,
Prettier, secrets e diff hygiene. Cobertura oficial: `1.970/1 skipped`,
`82,03%` statements, `80,22%` branches, `88,59%` functions e `82,03%` lines.
A primeira revisão independente ficou registrada como `CONDITIONAL`; o
follow-up pós-fix confirmou Critical `0`, High `0`, Medium técnico `0` e Low
`0`.

O resultado continua limitado ao boundary local serviço/repositório/HTTP e ao
PostgreSQL descartável. Não prova target TCP/RLS, papel runtime
`NOBYPASSRLS` conectado separadamente, browser, demais rotas clínicas,
providers, operações, CI remoto, restore, paridade Vetus restante ou release.
CVG-003 e o programa global permanecem `IN_PROGRESS/PARTIAL`; geral `98/100`
(`4/11`), clínica `100/100` (`2/3`) e readiness `95/100` (`42 PASS / 3 WARN /
1 FAIL`). Nenhuma mutação externa ocorreu.

Artefatos: `.agent/tasks/CVG-003-discharge-tenant-isolation.md`,
`.agent/gates/verified-CVG-003-discharge-tenant-isolation.json`,
`.agent/artifacts/CVG-003-discharge-tenant-isolation-2026-08-26.md` e
`.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-FINAL-001`.

## Bounded checkpoint — CVG-004 financial cash-receipt reversal — 2026-08-27

The authorized full-BRL cash-receipt reversal slice is `PASS_BOUNDED` with
residual risk `HIGH`. The API, command, repository, additive migration and
runtime role configuration now provide an authenticated, idempotent,
tenant-scoped append-only reversal with compensating cash/journal artifacts,
projection recovery, audit/outbox evidence and later-receipt support. The
original receipt/payment/movement/journal proof remains immutable.

Fresh local evidence is focused unit `30/30`, PostgreSQL command/HTTP/RLS
`44/44`, runtime-role ACL `1/1`, compiled API `408/408`, global typecheck,
package lint/build, OpenAPI/migration/Helm/static security checks and official
coverage `80.72%` statements, `80.22%` branches and `88.06%` functions. The
independent post-fix review returned `PASS_BOUNDED` with zero Critical, High,
Medium or Low findings.

This checkpoint does not promote the frozen quality bars or global readiness.
Strict parity remains `98/100` with `4/11` verified, clinical parity remains
`100/100` with `2/3` verified and enterprise readiness remains `95/100` with
`42 PASS / 3 WARN / 1 FAIL`. Target TCP/RLS, production roles, providers,
non-cash settlement, browser acceptance, accessibility, remote CI, operations,
backup/restore, remaining parity and release acceptance remain open. No
external mutation or production action occurred.

## Bounded checkpoint — CVG-004 scheduled financial-payables report — 2026-08-27

The authorized scheduled-payables worker slice is `PASS_BOUNDED` with `HIGH`
residual risk. `financial-payables` now reads the tenant-scoped persisted
subledger, validates strict status/search/date filters, applies inclusive
`dueAt`, checks account/status defensively and maps exactly the existing eleven
catalog columns. Missing/unsupported/unknown worker sources fail closed.

Fresh evidence passed worker `74/74`, reports `16/16`, real run-once
PostgreSQL `9/9`, API `408/408`, global typecheck, worker build, coverage
`1,982/1 skipped` at `80.72/80.23/88.05/80.72`, security, OpenAPI,
migration-source, RLS, deploy-surface, Helm static, Prettier and diff hygiene.
Ramanujan's independent review was `CONDITIONAL` with no Critical/High and
its evidence gaps were remediated or explicitly scoped. The post-remediation
review attempts were unavailable due account model policy and usage limits;
there is no independent post-fix approval claim.

This does not promote CVG-004, global parity, clinical parity, enterprise
readiness or release. Global metrics remain parity `98/100` (`4/11`), clinical
`100/100` (`2/3`) and readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Other
scheduled reports, providers, target RLS, browser/accessibility, distributed
worker operations, remote CI, backup/restore, remaining parity and release
remain open. No commit, push, deploy, credential/provider action or external
mutation occurred.

## Bounded checkpoint — CVG-004 scheduled financial-advance-payments report

The bounded scheduled advance-payment worker path is `PASS_BOUNDED` with
`HIGH` residual risk. The shared financial-module source, worker filters and
bootstrap schema guard passed the frozen read-only contract. Evidence is
worker `77/77`, module `16/16`, API `408/408`, process `10/10`, canonical RLS
`9/9`, coverage `1,983/1 skipped` (`80.42% / 80.21% / 87.74% / 80.42%`),
typecheck across 70 projects, security and static validation.

Hubble's independent review is conditional with no Critical finding; actor,
audit, duplicate API projection, bootstrap completeness and edge-test
residuals remain open. General parity is `98/100` (`4/11`), clinical parity
`100/100` (`2/3`) and readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Keep
CVG-004 and the global state `IN_PROGRESS/PARTIAL`, and do not promote this
checkpoint to production, parity, readiness or release.

## Bounded checkpoint — CVG-002 active encounter uniqueness — 2026-08-27

`CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS` is `PASS_BOUNDED` with `HIGH` residual
risk. The canonical 0151 migration now fails closed on historical active
duplicates and enforces a valid/ready partial unique index on
`(account_id, patient_id)` for non-closed encounters. Repository create,
update and reopen map only the named PostgreSQL conflict; service timeline and
API queue state are restored when persistence fails.

Evidence passed repository `5/5`, PostgreSQL `7/7`, module `32/32`, database
package `22/22`, compiled API `410/410`, full workspace test/build/typecheck,
coverage `80.45%` statements/lines, `80.20%` branches and `87.75%` functions,
security and static validators. Lovelace found no Critical/High issue in the
bounded review; Medium findings were fixed. A separate reviewer-role attempt
was unavailable under account model policy and is explicitly not approval.

The migration remains blocked by historical data requiring human remediation,
and local evidence does not certify target roles/RLS, distributed replicas or
cache, providers, remote CI, operations, accessibility or release. Global
metrics stay parity `98/100` (`4/11`), clinical `100/100` (`2/3`) and readiness
`95/100` (`42 PASS / 3 WARN / 1 FAIL`). Parent CVG-002 and global state remain
`IN_PROGRESS/PARTIAL`; no external mutation occurred.

Evidence: `.agent/tasks/CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.md`,
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`,
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md` and
`.agent/verification.jsonl#VFY-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS-FINAL-001`.

## Bounded checkpoint — CVG-004 worker report service identity — 2026-08-27

The worker report actor fallback is removed within a `PASS_BOUNDED` boundary:
one resolver and shared config validate a non-nil UUID, the continuous and
run-once paths use it, and production-like Compose/Helm wiring requires the
operator-managed Secret. Focused worker/config/process/Helm proof and the
workspace quality rails passed locally. The independent review is conditional
and retains the per-account service-principal mapping as `P1 — BOUNDED/OPEN`.

Global promotion remains blocked. General parity is `98/100` (`4/11`), clinical
parity `100/100` (`2/3`) and enterprise readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). No production/target/provider/credential,
deployment, external mutation or release action occurred.

Evidence: `.agent/tasks/CVG-004-WORKER-REPORT-SERVICE-IDENTITY.md`,
`.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json`,
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md` and
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-SERVICE-IDENTITY-FINAL-001`.

## Bounded checkpoint — CVG-004 tenant-aware worker report principal — 2026-08-27

`CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL` is `PASS_BOUNDED` with
residual risk `HIGH`. The additive 0152 migration extends service-principal
purpose, binds report audit actors to their owning account with composite FKs
and rechecks active report mapping in a transaction-time trigger. The worker
resolver, continuous path and run-once path all fail closed unless the
configured UUID is an active non-interactive report service principal for the
current account.

Evidence passed schema `4/4`, resolver/trigger `9/9`, FKs `6/6`, run-once
PostgreSQL `13/13`, process fixture regressions, full workspace tests,
coverage `80.45%` statements/lines, `80.19%` branches and `87.74%` functions,
typecheck, build, lint, security and static validators. The independent review
is conditional and not production approval. One worker/account mapping is the
current supported topology.

Global promotion remains blocked: parity `98/100` (`4/11`), clinical parity
`100/100` (`2/3`) and readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Target
roles/RLS, provisioning, distributed worker operations, providers, remote CI,
restore, accessibility, remaining parity and release remain open. No
commit, push, deploy, credential/provider action or external mutation occurred.

Evidence: `.agent/tasks/CVG-004-worker-report-tenant-aware-principal.md`,
`.agent/gates/verified-CVG-004-worker-report-tenant-aware-principal.json`,
`.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-001`.

## Bounded checkpoint — CVG-001 Redis distributed readiness — 2026-08-27

The authorized Redis slice is `PASS_BOUNDED` with residual risk `HIGH`.
Local evidence covers bounded Redis `PING`/command timeouts, actual readiness
aggregation, fail-closed auth, idempotent API dependency cleanup and a real
two-API disposable PostgreSQL/Redis process proof. The final critical runner
verified `9/9` entries with zero failed, pending or todo tests; the complete
quality and security rails also passed.

Global state remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`:
Vetus parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Managed Redis/HA,
target/RLS, providers, remote CI, restore, accessibility and release evidence
remain open. No commit, push, deploy, credential/provider action or external
mutation occurred.

Evidence: `.agent/tasks/CVG-001-REDIS-DISTRIBUTED-READINESS.md`,
`.agent/gates/verified-CVG-001-redis-distributed-readiness.json`,
`.agent/artifacts/CVG-001-redis-distributed-readiness-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-001-REDIS-DISTRIBUTED-READINESS-FINAL-001`.

## Bounded checkpoint — CVG-006 database-chaos fail-closed — 2026-08-27

The authorized `CVG-006-DATABASE-CHAOS-FAIL-CLOSED` slice is reconciled as
`PASS_BOUNDED` with residual risk `HIGH`. Database failure no longer projects
an initialized database runtime as in-memory: it reports `unavailable`, closes
readiness, keeps `/live` independent and blocks tenant mutations and durable
public webhooks before dispatch. Production-like chaos start/stop is rejected,
and the health, metrics, OpenAPI, alert and runbook contracts are aligned.

Fresh evidence passed focused contracts `77/77`, API `414/414`, full workspace
tests, official coverage `80.48%` statements, `80.23%` branches and `87.76%`
functions, typecheck, build, lint, security and static validators. The
independent review was conditional with no Critical/High finding and does not
approve production.

Global state remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`:
Vetus parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Real target,
provider, failover, restore/RTO-RPO, distributed-worker, accessibility,
remote-CI and release evidence remain open. No external mutation occurred.

Evidence: `.agent/tasks/CVG-006-DATABASE-CHAOS-FAIL-CLOSED.md`,
`.agent/gates/verified-CVG-006-database-chaos-fail-closed.json`,
`.agent/artifacts/CVG-006-database-chaos-fail-closed-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-006-DATABASE-CHAOS-FAIL-CLOSED-FINAL-001`.

## Bounded checkpoint — CVG-002B2B legacy PIX settlement barrier — 2026-08-27

The authorized `CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER` slice is
`PASS_BOUNDED` with residual risk `HIGH`. The shared legacy PIX consumer now
requires authoritative no-attempt state and validates account, billing,
currency and exact value before status or financial mutation. Unknown and
attempt-linked events fail through the worker to DLQ; the dedicated B1 flow is
unchanged.

The focused consumer passed `14/14`, the module `2/2`, PostgreSQL worker
composition `6/6`, API `428/428`, and workspace tests exited `0` with SPA
`1036/1036`. Coverage is `80.50%` statements/lines, `80.19%` branches and
`87.76%` functions; typecheck, build, lint, security and static rails passed.
Independent review found no Critical, High or Medium functional finding, and
its harness condition was cleared.

Global state remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`:
Vetus `98/100` (`4/11`), clinical `100/100` (`2/3`) and readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). Providers, target, distributed worker
failpoints, restore/RTO-RPO, remote CI, accessibility, operational LGPD and
release acceptance remain open. No external mutation occurred.

Evidence: `.agent/tasks/CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER.md`,
`.agent/gates/verified-CVG-002B2B-legacy-pix-settlement-barrier.json`,
`.agent/artifacts/CVG-002B2B-legacy-pix-settlement-barrier-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER-FINAL-001`.

## Bounded reconciliation — CVG-003 prescription-execution clinical integrity — 2026-08-27

The authorized `CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY` slice is
`PASS_BOUNDED` with residual risk `HIGH`. Signed active prescription linkage,
account/patient/encounter coherence, canonical medication data, optimistic CAS
and compound execution/administration-event persistence are verified locally.
The PostgreSQL path uses source/signature locks, a tenant composite FK and
transaction rollback; the in-memory path serializes mutations and restores
state on event failure. HTTP action matching is exact, request boundaries are
strict and authorization is evaluated before idempotency replay.

Evidence is module `27/27`, route `5/5`, API integration `1/1`, disposable
PostgreSQL integrity/RLS/FK `5/5`, compiled API server `45/45` including the
permission-revoked replay test and workspace `pnpm test` exit `0`. Official
coverage is `80.51%` statements/lines, `80.22%` branches and `87.70%`
functions; the global coverage configuration excludes the slice's primary
files. Security, OpenAPI, RLS, migration-source and diff checks passed. The
independent review found no technical Critical or High finding; its prior
governance-only condition is now reconciled in the control plane.

The global state remains `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`: Vetus parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`)
and enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Target
roles/RLS, providers/homologation, backup/restore/RTO-RPO, distributed worker
recovery, remote CI, accessibility, operational LGPD, remaining parity and
release acceptance remain open. No provider, target, credential, deployment,
commit, push or external mutation occurred.

Evidence: `.agent/tasks/CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY.md`,
`.agent/gates/verified-CVG-003-prescription-execution-integrity.json`,
`.agent/artifacts/CVG-003-prescription-execution-integrity-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-INTEGRITY-FINAL-001`.

## Bounded verification — CVG-002B2B live-worker contention — 2026-08-27

The existing synthetic PIX worker contract was verified with two independent
live processes contending for one durable delivery. A held the processing
lease, B remained live and returned `idle`, and A later applied the settlement
once. The fresh PostgreSQL process file passed `9/9`; final reconciliation
confirmed one receipt, settled billing/attempt, completed PIX and applied
settlement with no duplicate effect.

This is a bounded local verification, not a production gate. The independent
reviewer role was unavailable because `gpt-5.3-codex` is unsupported for the
active account, so no reviewer approval is claimed. B2B/global status remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`; B1 failpoints,
principal matrix, privileged writer enforcement, providers, target, DR,
accessibility, operations, parity, CI and release remain open.

Evidence: `.agent/tasks/CVG-002B2B.md`,
`.agent/gates/verified-CVG-002B2B-live-worker-contention.json`,
`.agent/artifacts/CVG-002B2B-live-worker-concurrency-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002B2B-LIVE-WORKER-CONTENTION-001`.

## Bounded verification — CVG-002B2B internal B1 SIGKILL matrix — 2026-08-27

The authorized local worker harness now pauses at each of the sixteen internal
B1 transaction checkpoints. A fresh focused PostgreSQL process run passed
`16/16`: every killed worker left the intermediate graph uncommitted, the
expired lease was taken over by a second process, and the final state contained
one receipt and one applied settlement. The root workspace regression and
coverage remained green after the test assertion was added.

The bounded result is `PASS_BOUNDED` with HIGH residual risk, not a production
gate. The independent reviewer could not start because the active ChatGPT
account does not support `gpt-5.3-codex`; no approval is claimed. Global state
remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`; principal
login/cache/MFA, privileged writers, providers, target, DR, accessibility,
operations, parity, CI and release remain open.

Evidence: `.agent/tasks/CVG-002B2B.md`,
`.agent/gates/verified-CVG-002B2B-b1-sigkill-failpoints.json`,
`.agent/artifacts/CVG-002B2B-b1-sigkill-failpoints-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002B2B-B1-SIGKILL-FAILPOINTS-001`.

## Bounded reconciliation — CVG-004 two-tenant scheduled Cheques worker — 2026-08-27

The authorized local `financial-cheques` worker scope is now
`PASS_BOUNDED` with HIGH residual risk. Two persisted tenant fixtures and two
distinct non-interactive principals were used by two real concurrent one-shot
worker processes. Schedule-to-execution joins and an inverse-payment query
prove that each execution contains only its own account's check payment.

The focused process assertion passed `1/1`, the complete run-once boundary
passed `14/14`, and the independent review returned `APPROVE_BOUNDED`. This
does not certify continuous topology, target RLS/roles, providers, restore,
remote CI, operations, remaining report families or release readiness.

Global state remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`:
general Vetus parity is `98/100` (`4/11` verified), clinical parity is
`100/100` (`2/3` verified), and enterprise readiness is `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`). No production, target, credential, deployment, commit,
push or external mutation occurred.

Evidence: `.agent/tasks/CVG-004-reports-cheques-export.md`,
`.agent/gates/verified-CVG-004-report-cheques-worker-tenant-scope.json`,
`.agent/artifacts/CVG-004-reports-cheques-worker-tenant-scope-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-CHEQUES-WORKER-TENANT-SCOPE-FINAL-001`.

## Bounded verification — CVG-004 Vetus assisted-import browser E2E — 2026-08-27

The local browser proof for the existing Vetus assisted-import workflow is
now `PASS_BOUNDED` with HIGH residual risk. The official runner passed `1/1`
with fresh disposable PostgreSQL/Redis, migrations `0000`–`0153`, canonical
two-tenant seed, real browser authentication and database-backed API runtime.
The flow validates one CSV row, performs durable dry-run and import, then
rolls the batch back in the UI and verifies the persisted owner and patient
are both `inactive` through authenticated API reads.

The independent reviewer returned `APPROVE_BOUNDED` after the test added the
domain-state assertion and accessible CSV selector. This is local composition
evidence only: external Vetus/Live Pet/Live Lab connectors, providers,
target, distributed worker operations, backup/restore, operational LGPD,
remote CI, accessibility, full parity and release remain open.

Global state remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`:
Vetus parity `98/100` (`4/11`), clinical parity `100/100` (`2/3`) and
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). No external
mutation occurred.

Evidence: `.agent/tasks/CVG-004-vetus-import-integrity.md`,
`.agent/gates/verified-CVG-004-vetus-import-integrity.json`,
`.agent/artifacts/CVG-004-vetus-import-browser-e2e-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-VETUS-IMPORT-BROWSER-E2E-FINAL-001`.

## Bounded verification — CVG-004 deleted-sales report snapshot/export — 2026-08-27

The bounded current cancelled-counter-sale report snapshot/export is now
`PASS_BOUNDED` with HIGH residual risk. The source is the authoritative,
tenant-scoped database repository; the API and export reads recheck
`billing.read` and the report definition permission. SQL applies persisted
status/search/opening-date filters, deterministic ordering and a 10,001-row
read bound. The SPA labels `createdAt` as opening date and documents that
cancelled-at, actor and reason are unavailable.

Focused suites, workspace regression, official coverage, disposable
PostgreSQL and the official authenticated Docker browser flow passed; the
independent reviewer returned `APPROVE_BOUNDED`. Strict parity remains `4/4`,
but general parity is `98/100` (`4/11` verified), clinical parity is `100/100`
(`2/3` verified), and enterprise readiness is `95/100` (`42 PASS`, `3 WARN`,
`1 FAIL`). These global gates remain open and promotion is blocked.

Evidence: `.agent/tasks/CVG-004-report-deleted-sales-snapshot.md`,
`.agent/gates/verified-CVG-004-report-deleted-sales-snapshot.json`,
`.agent/artifacts/CVG-004-report-deleted-sales-snapshot-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-DELETED-SALES-SNAPSHOT-FINAL-001`.

## Bounded verification — CVG-004 NFS-e service-invoice report/export — 2026-08-27

The bounded persisted NFS-e service-invoice report/export is now
PASS_BOUNDED with HIGH residual risk. The Reports Workbench, API and
scheduled worker use the authenticated tenant's persisted
fiscal_nfse_documents source through FiscalService. Status, competence and
search filters are strict; SQL search escapes ILIKE wildcards; ordering is
deterministic; source reads are bounded; and execution/export remains audited
through ReportsService.

Reports/Fiscal module tests passed 36/36, compiled Reports API 26/26, Fiscal
routes 16/16 and SPA Workbench 40/40. Worker suites, vue-tsc and builds
passed. Disposable PostgreSQL fiscal/RLS integration passed 2/2, the selected
real worker-process execution passed 1/1, and the official authenticated
browser flow passed 1/1 with cleanup. Coverage passed at 80.60% statements,
80.09% branches, 87.64% functions and 80.60% lines with 2,038 tests passed
and 1 skipped.

The independent reviewer returned APPROVE_BOUNDED after confirming closure of
worker wiring, adversarial RLS proof, the shared fiscal endpoint limit,
literal SQL wildcard escaping and whitespace-prefixed CSV formula
neutralization. OpenAPI, RLS, migration-source, deploy-surface, secrets,
formatting and diff hygiene passed.

This closes only the local persisted document report. Exact Vetus dynamic
executor parity, fiscal writes/provider/municipality homologation,
commercial/financial reconciliation, external credentials, target
operations, backup/restore/RTO-RPO, distributed worker observability,
accessibility, operational LGPD, remote CI, remaining reports and release
acceptance remain open. Global parity and readiness remain non-promotable;
CVG-004 and the ERP remain IN_PROGRESS/PARTIAL.

Evidence: `.agent/tasks/CVG-004-report-service-invoices.md`,
`.agent/gates/verified-CVG-004-report-service-invoices.json`,
`.agent/artifacts/CVG-004-report-service-invoices-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-INVOICES-FINAL-001`.

## Gauntlet checkpoint — 2026-08-27 — CVG-004 scheduled deleted-sales

The selected bounded slice closed as `PASS_BOUNDED` after intentional RED,
worker GREEN/regression, two-account disposable PostgreSQL process proof,
coverage, validators and independent post-fix review. The worker is
database-only for the persisted current cancelled-sales snapshot and retains
the exact eleven-field report contract. Global promotion remains `BLOCKED`:
Vetus/clinical parity, providers, target, production, distributed operations,
remaining report families and release acceptance are still open.

## 2026-08-27 — implementation-ready inventory-products report

The next bounded gauntlet slice is `CVG-004-REPORT-INVENTORY-PRODUCTS`.
Authority is confirmed for an on-demand, database-backed, tenant-scoped report
over persisted `inventory_items` with exactly eight fields, strict createdAt
and search filters, deterministic ordering and a 10,000-row bound. The current
SPA local item/lot projection, scheduled worker, historical/as-of semantics,
valuation, providers, target and release remain out of scope. RED/GREEN and
verification are pending; global promotion remains blocked.

## Gauntlet checkpoint — 2026-08-27 — CVG-004 inventory-products

The bounded inventory-products slice is reconciled as `PASS_BOUNDED` after
intentional TDD RED/GREEN, focused package/API/SPA regression, disposable
PostgreSQL proof 3/3, authenticated browser E2E 1/1, coverage, validators and
independent `APPROVE_BOUNDED` re-review. The source is persisted
`inventory_items` only, with the exact eight-field contract, strict filters,
deterministic order, overflow detection and audited export. Global promotion
remains `BLOCKED`; Vetus/clinical parity, providers, target operations,
remaining reports, worker operations, accessibility, LGPD, remote CI and
release acceptance remain open.
Evidence: `.agent/gates/verified-CVG-004-report-inventory-products.json`.

## Restart checkpoint — CVG-004 inventory-stock — 2026-08-28

Lifecycle is `VERIFY / RECONCILE`. The server-backed current-stock report is
implemented and its local technical proof is green, but the gate remains
`PENDING_RECONCILIATION` until the final independent review and control-plane
hygiene are recorded. Resume instructions and evidence are in
`.agent/artifacts/CVG-004-report-inventory-stock-2026-08-28.md`; the source of
truth is `.agent/state.json`.

No scheduled worker, historical/as-of stock, lot/movement/NF semantics,
valuation, provider, target, production, deployment or release authority is
implied. Keep CVG-004/ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`.

## Final bounded reconciliation — CVG-004 inventory-stock — 2026-08-28

The bounded on-demand `inventory-stock` report/export is `PASS_BOUNDED` with
`HIGH` residual risk. The exact ten-field persisted `inventory_items` contract,
tenant boundary, strict filters, current stock derivation, overflow guard,
awaited audit/export and SPA server-only path remain the certified scope.

The first fresh independent reviewer found no functional CRITICAL/HIGH/MEDIUM
issue; its reported `BLOCKED` decision was limited to the pre-closure
gate/state/hygiene records and is now reconciled. A second fresh read-only
review returned `APPROVE` for V-001 through V-008. Final control-plane
parsing, reference, formatting, secret-scan, diff and empty-index checks
passed.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general Vetus parity remains
4/11, clinical parity 2/3 and enterprise readiness 95/100 (42 PASS, 3 WARN,
1 FAIL). Promotion remains `BLOCKED`; no provider, target, production,
deployment or release acceptance is implied.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-stock.json`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FINAL-002`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-REVIEW-FINAL-002` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-HYGIENE-002`.

## Final bounded reconciliation — 2026-08-28 — CVG-004 inventory-movements

The selected movement slice is now `PASS_BOUNDED` with `HIGH` residual risk.
It implements only the authenticated, tenant-scoped, on-demand raw
`inventory_stock_movements` ledger joined to same-account `inventory_items`,
with the exact thirteen-field contract, strict inclusive filters,
deterministic order, SQL-bounded overflow detection, durable execution/export
and server-only Workbench consumption.

The gauntlet recorded intentional RED, GREEN and remediation after fresh
independent findings: missing same-account joins, post-load bounds, malformed
row shapes, non-durable ReportsService execution and a final in-memory guard.
Current proof is module/API/SPA regression, disposable PostgreSQL 4/4,
authenticated browser E2E 1/1, coverage above the 80% bar, builds,
security/format/diff/index hygiene and a fresh independent final `APPROVE`.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, promotion remains `BLOCKED`,
and invoice/NF semantics remain outside authority. Exact Vetus dynamic
executor parity, history, valuation, providers, target/production operations,
backup/restore/RTO-RPO, accessibility, operational LGPD, remote CI and release
acceptance remain open. The next slice requires fresh scouting and a new
implementation-ready authority.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-movements.json`,
`.agent/artifacts/CVG-004-report-inventory-movements-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-REVIEW-FINAL-001`.

## Final bounded reconciliation — 2026-08-28 — CVG-004 inventory-invoices

The selected purchase-entry slice is `PASS_BOUNDED` with `MEDIUM` confidence
and `HIGH` residual risk. It reads only tenant-scoped persisted
`inventory_purchases` headers with non-empty stored invoice references and
returns the exact twelve operational purchase/receipt fields. The API uses
`billing.read` plus `inventory.read`, validates source/output/filter bounds,
persists execution and audit through `ReportsService`, and the Workbench uses
the server execution without local item/lot/consumption reconstruction.

Focused/regression evidence passed: reports 22/22, inventory 33/33, compiled
API 39/39, SPA 174 files/1,042 tests, disposable PostgreSQL 5/5 and official
authenticated browser E2E 1/1. Coverage remained above 80% in all dimensions;
secrets, formatting, diff and empty-index hygiene passed. Independent
post-remediation approval was unavailable and is explicitly retained as a
limitation, not approval. Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL` and
promotion remains `BLOCKED`; fiscal NF, providers, target, remote CI,
accessibility, LGPD and release remain open.

Evidence: `.agent/gates/verified-CVG-004-report-inventory-invoices.json`,
`.agent/artifacts/CVG-004-report-inventory-invoices-2026-08-28.md`.

## Implementation-ready checkpoint — 2026-08-28 — scheduled financial-receivables

Two independent read-only scouts ranked the missing scheduled
`financial-receivables` worker branch as the next bounded gap. The existing
on-demand catalog/API contract and worker financial database boundary make a
local implementation possible without provider credentials. A new authority
freezes the shared persisted tenant-scoped source, exact sixteen-column output,
strict status/search/date filters, deterministic ordering, a 10,000-row bound,
PII-safe logging, two-account isolation and no empty-success fallback.

The parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
remains `BLOCKED`; settlement, providers, target, production, accessibility,
remote CI and release work remain outside this slice.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-receivables.json`,
`.agent/tasks/CVG-004-report-scheduled-receivables.md` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-RECEIVABLES-001`.

## Final bounded reconciliation — 2026-08-28 — CVG-004 scheduled financial-receivables

The scheduled financial-receivables worker slice is `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. It adds the tenant-scoped
read-only financial source and exact sixteen-column worker mapping, strict
status/search/date validation, explicit UTC report-date boundaries with
`issuedAt` fallback, a 10,000-row fail-closed bound and durable non-PII audit
for execution/export. One-shot scheduled failures now return code 1; the
continuous worker remains tick-and-continue.

The fresh process proof passed `19/19` against disposable PostgreSQL with two
accounts, exact rows, cross-account negatives, overflow, fallback, audit and
delivery/lease recovery. Financial module `20/20`, worker suites,
build/typecheck, secrets, formatting and diff hygiene passed. Darwin's fresh
independent read-only review returned `PASS` without a scoped
Critical/High/Medium issue.

This closes only the bounded scheduled report path. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity remains `4/11`, clinical parity `2/3`,
readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains
`BLOCKED`. No settlement, provider, target, production, deployment, remote CI,
accessibility or release authority is inferred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-receivables.json`,
`.agent/artifacts/CVG-004-report-scheduled-receivables-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-services — 2026-08-28

A fresh local inspection selected the missing scheduled `registration-services`
worker source as the next bounded gap after scheduled financial-receivables.
The existing catalog/API contract exposes exactly six persisted service fields,
and the `services` relation/repository/RLS provide a credential-free local
source; the worker resolver and database source composition do not yet cover
this report id.

The new authority and implementation-ready gate freeze only a shared
tenant-scoped read source, strict inclusive UTC `createdAt` date filters,
deterministic ordering, a 10,000-row fail-closed bound, malformed/foreign-row
rejection, exact catalog mapping, existing PII-safe schedule audit and the
real two-account one-shot proof. No migration, CRUD, supplier/owner/patient
expansion, provider, target, production, deployment or release behavior is
authorized.

Delegated fresh explorer attempts were unavailable and are not represented as
consensus or approval. The parent CVG-004/global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-services.json`,
`.agent/tasks/CVG-004-report-scheduled-services.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-SERVICES-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-SERVICES-001`.

## Bounded closure — CVG-004 scheduled registration-services — 2026-08-28

The scheduled `registration-services` worker path is `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The implementation is limited
to the shared tenant-safe services projection, strict inclusive UTC date
filters, deterministic ordering, a 10,000-row fail-closed bound, exact six
catalog fields, durable non-PII audit and existing one-shot semantics.

Fresh local evidence passed module `21/21`, worker `97/97`, builds/typechecks
and the disposable PostgreSQL two-account process `20/20`. Independent review
was attempted but unavailable and is recorded as a condition, not approval.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, global promotion remains
`BLOCKED`, and general parity `4/11`, clinical parity `2/3` and readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) remain open. No commit, push, deploy
or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-services.json`,
`.agent/artifacts/CVG-004-report-scheduled-services-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-FINAL-001`.

## Bounded closure — CVG-004 scheduled registration-suppliers — 2026-08-28

The scheduled `registration-suppliers` path is `PASS_BOUNDED` with `MEDIUM`
confidence and `HIGH` residual risk. It is limited to the shared,
tenant-scoped persisted financial catalog source, exact nine-field mapping,
strict existing filters, inclusive UTC date semantics, deterministic ordering,
fail-closed 10,000-row bounds and durable non-PII schedule audit.

Financial module `24/24`, worker regression suites and post-format disposable
PostgreSQL process `21/21` passed, including two-account isolation, filters,
exact rows, excluded-row behavior and audit. The independent reviewer timed out
and was shut down without a verdict; this is a condition, not approval.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, global promotion remains
`BLOCKED`, and general parity `4/11`, clinical parity `2/3` and readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) remain open. Providers, target
operations, distributed workers, accessibility, operational LGPD, remote CI,
remaining parity and release acceptance remain open. No commit, push, deploy or
external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-suppliers.json`,
`.agent/artifacts/CVG-004-report-scheduled-suppliers-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-owners — 2026-08-28

Local fresh scouting selected the missing scheduled `registration-owners`
worker source after the suppliers slice closed. The existing seven-field
on-demand contract and persisted owners table with RLS/FORCE-RLS provide a
smaller tenant-safe path without patient joins or microchip exposure.

The authority freezes only the shared read-only owners projection, explicit
tenant context/predicate, strict inclusive UTC `createdAt` filters,
deterministic `fullName ASC, id ASC` order, a 10,000-row fail-closed bound,
validated metadata fallback and exact seven-field mapping. Existing schedule
audit and one-shot semantics remain unchanged; no migration or lifecycle
expansion is authorized.

Both delegated scouts errored before execution because the
`gpt-5.3-codex-spark` usage limit was reached. This is local repository
evidence, not scout consensus or approval. RED is the next checkpoint.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-owners.json`,
`.agent/tasks/CVG-004-report-scheduled-owners.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-OWNERS-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-OWNERS-001`.

## Bounded closure — CVG-004 scheduled registration-owners — 2026-08-28

The scheduled `registration-owners` path is closed as `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The owners source and worker
preserve the existing seven-field catalog contract, explicit tenant context
and predicate, strict inclusive UTC dates, deterministic ordering, metadata
fallback, fail-closed malformed/foreign results and the existing durable
audit/one-shot behavior. No patient join, microchip exposure, owner CRUD,
migration, provider, target or production behavior was added.

Owners module `49/49`, worker runner `46/46` plus all configured worker suites,
and the disposable PostgreSQL process `22/22` passed. Review attempts were
unavailable and are recorded as a condition, not approval. Global
CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical
parity `2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion
`BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-owners.json`,
`.agent/artifacts/CVG-004-report-scheduled-owners-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-FINAL-001`.

## Bounded closure — CVG-004 scheduled registration-patients — 2026-08-28

The scheduled `registration-patients` path is closed as `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The shared patients source is
read-only, tenant-scoped by explicit context plus predicate, limited to the
persisted `patients` relation and the exact eight catalog fields, and bounded
to 10,000 rows with strict inclusive UTC `createdAt` dates and deterministic
`name ASC, id ASC` ordering. Legacy code and nullable report cells use the
authorized fallbacks; patient PII is not written to schedule audit or worker
logs.

TDD RED was recorded before implementation. Patients module `55/55`, focused
source coverage (`94.07%` statements/lines, `90.41%` branches, `100%`
functions), configured worker suites and disposable PostgreSQL process `23/23`
passed, including two-account isolation, exact rows, fallback, durable
execution and audit redaction. The independent reviewer was unavailable and
is recorded as a condition, not approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical parity `2/3`, readiness
`95/100` and promotion `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-patients.json`,
`.agent/artifacts/CVG-004-report-scheduled-patients-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-FINAL-001`.

## Bounded closure — CVG-004 scheduled commission-calculations — 2026-08-28

The scheduled commission-calculations path is closed as `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The explicit persisted source
uses tenant context plus predicates on `commission_calculations` and
`commission_lines`, same-account line aggregation, strict status/date
overlap, deterministic `created_at DESC, id DESC` order and a 10,000-row
fail-closed bound. The worker emits exactly the existing six catalog fields
and retains durable schedule/audit/one-shot behavior.

The source and worker GREEN evidence passed commissions `18/18`, focused
coverage `94.02%` statements/lines, `88%` branches and `100%` functions,
worker runner `51/51` plus all configured worker suites, and disposable
PostgreSQL process `24/24` across two accounts. Independent review was
unavailable and is recorded as a condition, not approval. Global
CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical
parity `2/3`, readiness `95/100` and promotion `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-commissions.json`,
`.agent/artifacts/CVG-004-report-scheduled-commissions-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-FINAL-001`.

## 2026-08-28 — scheduled inventory-products bounded closure

The current bounded slice is `CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS`,
reconciled as `PASS_BOUNDED` with `HIGH` confidence for the local slice and
`HIGH` residual risk. The verified gate covers only the persisted
`inventory_items` scheduled read path, exact eight-field mapping, explicit
tenant context/predicate, escaped literal search, inclusive UTC dates,
deterministic order, fail-closed bound and unchanged durable audit semantics.

TDD RED preceded implementation. Inventory module `37/37`, source coverage
`92.07%` statements/lines, `89.85%` branches and `100%` functions, module
typecheck/build, worker suites and disposable PostgreSQL process `25/25`
passed. Independent review returned `APPROVE_BOUNDED` with no
CRITICAL/HIGH/MEDIUM issue; its LOW `ILIKE ESCAPE` testing gap was closed by a
real process assertion. Global parity/readiness remain open and promotion is
`BLOCKED`; the next gate is fresh scouting under a new authority.

## Bounded closure — CVG-004 scheduled inventory-stock — 2026-08-28

The scheduled `inventory-stock` worker path is `PASS_BOUNDED` with `HIGH`
confidence for the bounded local slice and `HIGH` residual risk. It is limited
to the exact ten-field current persisted-item contract, explicit tenant-safe
`inventory_items` source, current stock value/status derivation, strict
inclusive UTC dates, case-insensitive search, deterministic ordering, the
10,000-row bound and unchanged durable schedule/audit semantics.

Inventory module `43/43`, focused source coverage `96.15%` statements/lines,
`91.42%` branches and `100%` functions, module build/typecheck, worker suites
and focused disposable PostgreSQL process passed. Independent review returned
`APPROVE_BOUNDED` with no severity finding. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical parity `2/3`, readiness
`95/100` and promotion `BLOCKED`; target, providers, distributed operations,
accessibility, operational LGPD, remote CI, backup/restore, remaining parity
and release acceptance remain open.

## Current checkpoint — 2026-08-28 — CVG-002 child-process closure

`CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART` is closed only as a local
`PASS_BOUNDED` slice under the verified gate. The focused real API child proof
passed `1/1` with restricted disposable roles, exact billing-item failpoint,
SIGKILL rollback, distinct-PID restart, replay/conflict, tenant-B isolation and
complete clinical-financial SQL reconciliation. Independent final review is
`APPROVE_BOUNDED`.

The critical runner remains conditional: entries `1–7` passed, while the
existing PIX entry 8 timed out at `15/25` with `spawnSync pnpm ETIMEDOUT`, so
later entries and full-runner/provider/distributed claims remain open. Global
parity is `4/11`, clinical parity `2/3`, readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`) and promotion is `BLOCKED`. The parent and ERP remain
`IN_PROGRESS/PARTIAL`; the next action is fresh scouting under new authority.

## Current Gauntlet checkpoint — 2026-08-28

The scheduled `inventory-movements` report is closed only as a local
`PASS_BOUNDED` slice under
`.agent/gates/verified-CVG-004-report-scheduled-inventory-movements.json`.
Its source, worker branch/bootstrap, module/worker suites and full
two-account disposable PostgreSQL report process passed; independent review
returned `APPROVE_BOUNDED` and final hygiene passed. The incompatible first
reviewer attempt is explicitly unavailable, not approval.

CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity is `4/11`,
clinical parity `2/3`, readiness is `95/100` (`42 PASS`, `3 WARN`,
`1 FAIL`) and promotion is `BLOCKED`. Target, provider, distributed
operations, accessibility, operational LGPD, remote CI, backup/restore,
remaining parity and release acceptance remain open. No external mutation,
commit, push or deploy occurred.

## Current bounded checkpoint — 2026-08-28 — critical process runner

`CVG-OPS-CRITICAL-PROCESS-RUNNER-001` is `PASS_BOUNDED` under its verified
gate. The final4 disposable matrix passed `10/10` serial entries, including
PIX `25/25`; combined runner/CI contracts passed `31/31`; Windows native
contracts are assigned to the `windows-2022` CI job and skip locally on Linux.
All per-entry ephemeral databases and post-run owned process/artifact checks
are clean. Independent final review is `APPROVE_BOUNDED` with no P0/P1/P2
finding.

The parent/global ERP remains `IN_PROGRESS/PARTIAL`; general parity is `4/11`,
clinical parity `2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and
promotion is `BLOCKED`. This checkpoint does not approve providers, target,
production, remote CI, accessibility, operational LGPD, backup/restore or
release. No commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-OPS-CRITICAL-PROCESS-RUNNER-001.json`,
`.agent/artifacts/CVG-OPS-CRITICAL-PROCESS-RUNNER-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-OPS-CRITICAL-PROCESS-RUNNER-FINAL-001`.

## Current bounded checkpoint — 2026-08-29 — scheduled inventory-invoices

`CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES` is `PASS_BOUNDED` under its
verified gate. The source, worker, bootstrap and scheduled-job failure path
passed focused and complete regressions; the disposable process passed `28/28`
with a non-UTC PostgreSQL session, including the UTC boundary record,
two-account isolation and null-ID failed delivery persistence. Independent
review is `APPROVE_BOUNDED` with no P0/P1/P2 finding, and final hygiene passed.

Global ERP remains `IN_PROGRESS/PARTIAL`; general Vetus parity is `4/11`,
clinical parity `2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and
promotion is `BLOCKED`. This checkpoint approves no provider, fiscal, target,
production, distributed, accessibility, operational-LGPD, backup/restore,
remote-CI or release behavior. No commit, push, deploy or external mutation
occurred. Next state is fresh scouting with a new implementation-ready
authority.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-invoices.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-invoices-2026-08-29.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-FINAL-001`.

## Current bounded checkpoint — 2026-08-29 — local laboratory provider ingress

`CVG-005-LAB-PROVIDER-INGRESS-LOCAL` is reconciled as `PASS_BOUNDED` under
`.agent/gates/verified-CVG-005-lab-provider-ingress-local.json`, with overall
confidence `MEDIUM` because the post-fix independent-review criterion is
conditional. The implementation is repository-local: strict raw-body HMAC,
account-bound freshness/keyring, durable atomic replay/conflict ledger,
`pending_human_review`, awaited redacted audit, no diagnostic-order mutation,
and runtime API/worker DELETE/TRUNCATE denial for the append-only ledger.

The initial review found P1 clean-install catalog drift and P2 runtime ACL
drift; both were corrected and directly proven by API `474/474` plus serial
PostgreSQL setup/ingress/runtime-ACL `3 files / 15 tests`. Aggregate coverage
was `80.16%` statements, `81.08%` branches and `88.31%` functions; workspace
typecheck/lint/build and static/security gates passed. Two post-fix reviewer
attempts timed out and were shut down, so no independent approval is claimed.

Global ERP remains `IN_PROGRESS/PARTIAL`; general Vetus parity is `4/11`,
clinical parity `2/3`, readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and
promotion is `BLOCKED`. This checkpoint does not approve Live Lab/provider
homologation, external credentials, target, production, remote CI,
accessibility, LGPD, backup/restore, distributed operations or release. The
recursive `pnpm test` attempt that saturated local resources and exited `130`
is not treated as a pass. Next state is fresh scouting under a new authority;
obtain independent review before any production/release claim.

Evidence: `.agent/gates/verified-CVG-005-lab-provider-ingress-local.json`,
`.agent/artifacts/CVG-005-lab-provider-ingress-local-2026-08-29.md`,
`.agent/verification.jsonl#VFY-CVG-005-LAB-PROVIDER-INGRESS-LOCAL-FINAL-001`.

## Current execution state — 2026-08-29 — service-principal interactive boundary

Fresh scouting has selected
`CVG-002B2B-SERVICE-PRINCIPAL-INTERACTIVE-BOUNDARY` as the next narrow P0
identity-safety slice. The repository-backed `UsersService.resolveById` still
uses the generic materializer and can index a non-interactive service
principal; existing username/hydration and AuthService session/MFA checks are
the surrounding guardrails. A new implementation-ready authority is
confirmed, with intentional RED next.

This state authorizes only interactive resolver/cache correction and focused
auth/users evidence. The dedicated worker service-principal resolver, PIX
settlement UoW, provider, credentials, target, production and release remain
out of scope. Global ERP remains `IN_PROGRESS/PARTIAL`, and promotion remains
`BLOCKED`.

Evidence: `.agent/gates/implementation-ready-CVG-002B2B-service-principal-interactive-boundary-IR-001.json`,
`.agent/authority.jsonl#AUTH-CVG-002B2B-SERVICE-PRINCIPAL-INTERACTIVE-BOUNDARY-IR-001`,
`.agent/verification.jsonl#VFY-SCOUT-CVG-002B2B-SERVICE-PRINCIPAL-INTERACTIVE-BOUNDARY-001`.

## Current bounded checkpoint — 2026-08-29 — privileged service-principal writer linearization

`CVG-002B2B-PRIVILEGED-SERVICE-PRINCIPAL-WRITER-LINEARIZATION` is closed as
`PASS_BOUNDED` under
`.agent/gates/verified-CVG-002B2B-privileged-service-principal-writer-linearization.json`.
The additive migration 0155 serializes direct mapping INSERT/UPDATE/DELETE and
the four named `users` identity fields with account-scoped writer gates plus
the worker's account lock. The temporary global mutex design was rejected and
removed; independent accounts remain concurrent and contested cross-account
writes fail fast with retryable `40001`.

The final PostgreSQL writer suite passed `13/13`, including migration replay,
all watched fields, rollback, account isolation, deterministic cross-account
ordering and hostile `pg_temp` shadowing. The real PIX consumer passed `8/8`:
trigger-backed writer commit caused worker re-read/fail-closed behavior with
zero B1 calls. Static migration contracts passed `2/2`; worker baseline passed
`116/116`; migration-source, RLS (`163/164`), secret, lint and diff checks
passed. Two fresh independent read-only reviewers returned
`APPROVE_BOUNDED` with no P0/P1/P2.

Global ERP remains `IN_PROGRESS/PARTIAL`; Vetus is `4/11`, clinical parity is
`2/3`, readiness is `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion is
`BLOCKED`. This checkpoint does not approve providers, credentials, target,
production, deployment, distributed operations, backup/restore, accessibility,
LGPD, complete parity, remote CI or release. No commit, push or external
mutation occurred. Next state is fresh scouting under a new authority.

Evidence: `.agent/gates/verified-CVG-002B2B-privileged-service-principal-writer-linearization.json`,
`.agent/verification.jsonl#VFY-CVG-002B2B-PRIVILEGED-SERVICE-PRINCIPAL-WRITER-LINEARIZATION-FINAL-001`,
`.agent/execution-log.jsonl#EVT-0927`.

## Current bounded checkpoint — 2026-08-29 — prescription-execution command/event boundary

Fresh scouting selected
`CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION` under a new
implementation-ready authority. The service methods `getEvents`, `execute`,
`suspend`, `resume` and `logEvent` still resolve by execution id alone, so the
HTTP pre-check is not sufficient protection for direct service callers.

The authority is limited to principal-derived `AccountId` propagation through
the existing service and routes, with no migration, provider, target,
production or release expansion. Intentional RED is recorded: module `27/28`
and route `4/5`, exactly at missing-scope validation and route forwarding.

Evidence: `.agent/gates/implementation-ready-CVG-003-prescription-execution-command-event-tenant-isolation.json`,
`.agent/authority.jsonl#AUTH-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-IR-001`,
`.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-RED-001`,
`.agent/execution-log.jsonl#EVT-0929`.

## Bounded closure — 2026-08-29 — prescription-execution command/event boundary

`CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION` is closed
locally as `PASS_BOUNDED` under
`.agent/gates/verified-CVG-003-prescription-execution-command-event-tenant-isolation.json`.
The service now requires principal-derived `AccountId` for event detail and
all four administration commands, and routes forward that account explicitly.

Evidence passed: module `28/28`, focused HTTP routes `7/7`, canonical
PostgreSQL runtime `1/1` after clean disposable reset/seed, full API `476/476`,
typecheck/format/lint/diff/security/RLS checks and two fresh independent
`APPROVE_BOUNDED` reviews with no P0/P1/P2. Global ERP remains
`IN_PROGRESS/PARTIAL`, Vetus is `4/11`, clinical parity `2/3`, readiness
`95/100` and promotion `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-003-prescription-execution-command-event-tenant-isolation.json`,
`.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-COMMAND-EVENT-TENANT-ISOLATION-FINAL-001`,
`.agent/execution-log.jsonl#EVT-0935`.

## Bounded checkpoint — 2026-08-29 — operational coverage source of truth

`CVG-003-AUDIT-OPERATIONAL-COVERAGE-SOURCE-OF-TRUTH` and its
`CVG-003-AUDIT-OPERATIONAL-COVERAGE-LEGACY-RLS` dependency are reconciled as
`COMPLETE_BOUNDED` / `PASS_BOUNDED`. The final local evidence is restricted
PostgreSQL `2/2`, audit module `27/27`, focused route `14/14`, runtime restart
`1/1`, full API `496/496`, official coverage `80.09%` statements/lines,
`80.97%` branches and `88.28%` functions, green static gates and an
independent `APPROVE` review with no findings. The legacy policy is forward
only, exact-tenant read-only compatibility, and the repository predicates have
the explicit NULL-account defense-in-depth guard.

The active state is now `CVG-003-FRESH-SCOUT-NEXT-GAP` in `SCOUT`; no new
implementation is authorized until fresh evidence, residual ranking and an
implementation-ready gate exist. Global ERP remains `IN_PROGRESS/PARTIAL`,
Vetus `4/11`, clinical `2/3`, readiness `95/100` and promotion `BLOCKED`.

Evidence: `.agent/state.json`, `.agent/backlog.json`,
`.agent/gates/verified-CVG-003-audit-operational-coverage-source-of-truth.json`,
`.agent/gates/verified-CVG-003-audit-operational-coverage-legacy-rls.json`,
`.agent/execution-log.jsonl#EVT-1024`.

## 2026-08-30 — bounded InpatientService stay tenant closure

The residual `CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY` is reconciled
locally as `PASS_BOUNDED` / `COMPLETE_BOUNDED`. The service now requires the
principal-derived `AccountId` for stay identifier operations, and inpatient,
discharge and inventory callers forward that scope. Existing database stay,
progress, occurrence and daily-charge repositories retain account predicates;
no migration was added.

Current evidence is module `19/19`, PostgreSQL `2/2`, compiled inpatient routes
`26/26`, complete API `519/519`, module/API typecheck and build, and official
coverage `2,174` passed / `1` skipped at `80.17%` statements/lines, `80.74%`
branches and `86.66%` functions. Migration-source, RLS `165/166`, OpenAPI
`354/40/413`, secrets, targeted ESLint/Prettier and diff checks passed.

The PostgreSQL pre-fix RED was not claimed after the initial fixture UUID
mismatch. Independent review was attempted but unavailable, so no approval is
inferred; confidence is medium and residual risk high. Global ERP remains
`IN_PROGRESS/PARTIAL`, Vetus evidence is `100/100` with `4/11` areas verified,
clinical parity is `2/3`, readiness is `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`)
and promotion remains `BLOCKED`. Fresh scouting under a new authority is next.

Evidence: `.agent/gates/verified-CVG-003-inpatient-stay-service-tenant-boundary.json`,
`.agent/artifacts/CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-2026-08-30.md`,
`.agent/verification.jsonl#VFY-CVG-003-INPATIENT-STAY-SERVICE-TENANT-BOUNDARY-FINAL-001`,
`.agent/execution-log.jsonl#EVT-1216`.
## 2026-08-30 — CVG-012 bounded canonical namespace closure

`CVG-012-NAMESPACE-CANONICAL-BOUNDARY` is reconciled locally as
`PASS_BOUNDED` / `COMPLETE_BOUNDED`. The RBAC package is now
`@cvg-his-v2/rbac`, active callers and lockfile are canonical, module-fiscal's
unused legacy DB dependency is gone, and `validate:namespaces` is a blocking
CI repository guard. The guard uses TypeScript AST analysis and fixtures cover
static/dynamic/template imports, exports, require variants, comments and
ordinary strings.

The initial independent critic returned `FAIL_BOUNDED` for lexical false
negatives and incomplete closure evidence. The guard was replaced with AST
traversal, tests passed `10/10`, official coverage stayed above 80%, and the
task/state/gate/artifact ledgers were reconciled. No post-fix compatible review
approval is available, so no approval is inferred. Global ERP remains
`IN_PROGRESS/PARTIAL`, parity/readiness and target/provider/release gates stay
open, and promotion remains `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-012-namespace-canonical-boundary.json`,
`.agent/artifacts/CVG-012-NAMESPACE-CANONICAL-BOUNDARY-2026-08-30.md`,
`.agent/verification.jsonl#VFY-CVG-012-NAMESPACE-CANONICAL-BOUNDARY-FINAL-001`,
`.agent/execution-log.jsonl#EVT-1227`.
