# Gauntlet Progress

- Goal: Deliver a behaviorally proven Premium Enterprise veterinary ERP MVP.
- Phase: BUILD
- Current round: 8
- Active workstreams: `CVG-002` encounter-to-receipt; bounded `CVG-002A`, `CVG-002B1`, durable outbound `CVG-002B2a` and the B2b parser/receipt/delivery ingress checkpoint are verified only within their stated boundaries.
- Largest current gap: the bounded PIX callback/worker slice now has a real pre-context API-key capability, local atomic rate-limit proof and an operator-facing DLQ/runbook/alert slice; it still needs a multi-replica rate-limit policy, minimum principal projection and real process restart proof. Card, inventory linkage and the complete scheduled/walk-in E2E remain later milestones.
- Latest verification: API-key service passed 13/13, mapper 3/3, auth helper 2/2, runtime ACL/RLS 1/1 and HTTP→PostgreSQL 4/4 (including 2 accepted/6 rate-limited concurrent requests) on the real repository; B2b parser/ingress passed focused 77/77 and PostgreSQL 11/11, B1 regression 18/18 and B2a regression 33/33. The preceding B2a VERIFIED gate records coverage 1.646/1.646 with 83% lines and 80,3% branches, typecheck/lint, OpenAPI, RLS, dependency audit, secret scan, diff check and two independent approvals.
- Blockers: Target environment, provider decisions and production authority block only their dependent future work.
- Planning checkpoint: architecture, security, official-source and TDD reviews plus the parser/receipt/delivery implementation are consolidated in `.agent/tasks/CVG-002B2B.md` and `docs/2026-08-22-handoff-cvg-002b2.md`; the implementation gate is still not a full B2b VERIFIED gate.
- Latest bounded local increment: EVT-0055 through EVT-0059 adds the raw `node:net` callback harness, deferred-ACK and opaque-error checks, CORS decision and OpenAPI contract. An independent review found two medium contract mismatches; follow-up `705052b` aligned the key ID/timestamp/signature regexes and webhook correlation schema. Fresh evidence is HTTP 13/13, verifier/keyring 35/35, shared-config 32/32, startup 6/6 and OpenAPI 334/385. This is evidence for the HTTP seam only; it does not satisfy HTTP-to-PostgreSQL, principal or worker requirements.
- Next action: define the multi-replica rate-limit policy, narrow the authenticated principal, prove real SIGKILL/restart and rerun bounded regressions; SPA remains separately gated `B2c` work.

## Checkpoint 2026-08-22 — EVT-0060…EVT-0065

- HTTP→PostgreSQL receipt/delivery proof passed 2/2 with a separate observer connection and rollback failpoint.
- Service-principal migration/schema passed 5/5 PostgreSQL integration and 3/3 schema unit checks; auth/cache/MFA guard passed 7/7, users 13/13 and auth 30/30.
- Runtime ACL/RLS passed 7/7 unit + 1/1 integration. The worker remains read-only for identity; the attempted `FOR UPDATE` principal lock was removed instead of widening privileges.
- B1 consumer passed 6/6 unit, 3/3 PostgreSQL integration and worker suite 47/47. It is default-off and synthetic-provider capability is explicit; no `idempotency_requests` path is used.
- Remaining gate gaps: shared transaction helper, real worker-role query, transient database/transport retry, restart/takeover/redrive/DLQ, legacy `410`, provider/SPA/E2E, Vetus parity, WCAG, operations and production.
- Publication: implementation checkpoint `26f3281` and documentation synchronization `3cba876` are pushed to `origin/agent/sync-v4-full-program`; the next session can resume from `3cba876`. The design-system tsbuildinfo cache remains unstaged.

## Checkpoint 2026-08-22 — EVT-0068…EVT-0071

- Shared `runInTenantTransactionContext` now owns the canonical tenant UoW used by B1 and the final delivery CAS; shared context unit evidence is 3/3 and the real worker integration is included in the 5/5 PostgreSQL result.
- Transient PostgreSQL/transport errors are explicitly allowlisted for retry; unknown or divergent errors remain terminal. The internal `reconciliation_required` redrive is bounded, audited and a no-op after the state transition.
- The actual worker-role principal query passed under `SET ROLE` with `FORCE RLS`; identity access remains read-only and `password_hash` is denied. Runtime ACL/RLS evidence is 8/8.
- Attempt-linked legacy PIX confirmation returns `410 LEGACY_PIX_CONFIRMATION_DISABLED` before gateway/event; route evidence is 3/3, repository evidence 5/5 and OpenAPI is 335 paths/386 schemas.
- Implementation `46b84cb` is pushed. The detailed continuation artifact is `.agent/artifacts/CVG-002B2B-worker-uow-legacy-410-2026-08-22.md`; the handoff and audit have matching sections. The broad goal remains `IN_PROGRESS/PARTIAL`.
- Remaining gate work: process crash/restart and multi-pool takeover, DLQ/observability, HTTP-to-PostgreSQL proof for the 410 barrier, provider/SPA/E2E, Vetus parity, WCAG, operations and release. Preserve the design-system tsbuildinfo cache outside scope.

## Checkpoint 2026-08-22 — EVT-0072…EVT-0076

- Worker observability now covers retry/applied/lease-lost/idle, terminal failures and automatic `attempts_exhausted` promotions. Metrics are aggregate-only and telemetry errors are best-effort; worker suite is 54/54.
- Two independent PostgreSQL pools prove lease expiry, stale-fence rejection, takeover and one B1/receipt after the first worker loses its pool. The result is 6/6, but it is not a SIGKILL or full crash matrix.
- HTTP→PostgreSQL legacy evidence is 3/3: persisted attempt-linked owner gets 410 before gateway/outbox, foreign account gets opaque 404, direct legacy path remains 200 with one gateway and one outbox. The API-key adapter exposes a production gap in the default JSONB/pre-context repository path.
- Service-principal/RLS integration is 5/5 with non-vacuous backfill reconstruction and cross-tenant negatives; the nested shared UoW direct test is 4/4; API route is 4/4; API-key module is 10/10; OpenAPI is 335/386 and secret/diff checks pass.
- Recovery implementation `fdb0995` and documentation `75bfa72` are pushed. Broad objective remains `IN_PROGRESS/PARTIAL`; next session should repair the safe pre-context API-key capability, add DLQ/runbook/alerts and keep B2c/SPA, providers, Vetus parity, WCAG, operations and release as separate gates.

## Checkpoint 2026-08-23 — EVT-0079…EVT-0081

- The PostgreSQL API-key boundary is implemented locally in migration `0113`: exact prefix+hash lookup through an API-only `SECURITY DEFINER`, strict JSONB mapping, tenantized usage/rate-limit tables, worker/API ACL separation and no account identifier leak from the PIX ownership probe.
- The extracted auth helper now enforces rate limiting before `last_used_at`; the repository consumes the counter atomically. Real HTTP→PostgreSQL evidence is 4/4: owner `410`, foreign opaque `404`, direct legacy `200`, and eight concurrent low-limit requests with two `201` plus six `429`.
- Fresh bounded evidence is API-key service 13/13, mapper 3/3, auth helper 2/2, runtime ACL/RLS 1/1, shared-database/API builds and lint, RLS 153/154, OpenAPI 335/386, Helm static validation, secret scan and diff check. Implementation `62db87e`, documentation checkpoint `8d226d0` and final hash reconciliation `3c76ce0` are pushed; the design-system tsbuildinfo cache remains unstaged.
- Remaining gate work: real process SIGKILL/restart, operator DLQ/runbook/alerts, multi-replica rate-limit benchmark/policy, minimal authenticated-principal narrowing, SPA/B2c, provider, Vetus parity, WCAG, target operations and release. The broad objective remains `IN_PROGRESS/PARTIAL`.

## Checkpoint 2026-08-23 — documentação de continuidade

- O inventário determinístico de `docs/` foi refeito: 1.447 arquivos, 90
  diretórios, 53.728.402 bytes, manifesto `sha256`
  `52ab7100d5272df769f61fb6323da250987b10f404a9fb8fc0fdf4198d19c5bf`.
- O ponto de entrada para a próxima sessão é
  `docs/2026-08-23-checkpoint-continuacao.md`; o handoff detalhado aponta para
  ele e o ExecPlan deixou de repetir a auditoria documental já concluída.
- A auditoria independente confirmou que o maior gap local era a DLQ
  operacional de settlement PIX; endpoint, runbook, alertas e dashboard foram
  implementados no slice publicado. O worker continua com telemetria agregada e
  o repository mantém redrive interno auditado; falta exercitar isso em
  ambiente target-like.
- Estado permanece `CVG-002B2B IN_PROGRESS/PARTIAL`; não houve promoção de
  quality bar, produção, provider, SPA, paridade Vetus ou release.

## Checkpoint 2026-08-23 — PIX settlement DLQ operator slice

Published implementation `35f68fd` and replicated-observability correction
`1217882` to `origin/agent/sync-v4-full-program`.

- Added tenant-scoped, sanitized `GET /internal/pix-settlement/deliveries` and
  audited `POST /internal/pix-settlement/deliveries/:deliveryId/redrive`.
- Migration `0114` keeps direct API `UPDATE` denied and exposes one atomic
  `SECURITY DEFINER` redrive function owned by a non-login capability; the
  worker retains delivery mutation and the API receives only function execute.
- Added OpenAPI paths/schemas, Prometheus alert, Grafana DLQ panel and the
  operator runbook `docs/runbooks/pix-settlement-dlq.md`.
- Fresh evidence: route 4/4, PostgreSQL/ACL 3/3 (durable backlog 1→0 after
  redrive), runtime grants 9/9, worker 54/54, alert alignment 5/5, OpenAPI
  337/390, API/DB/worker builds and Helm/YAML/JSON/shell checks PASS. The
  alert/panel use the current DB-backed gauge
  `worker_pix_provider_settlement_reconciliation_required` with `max(...)`
  across replicated full-account observers; direct 404/503
  envelopes include the request correlation ID required by OpenAPI.
- The quality bar remains frozen and `CVG-002B2B` remains `IN_PROGRESS/PARTIAL`.
  The next local work is multi-replica rate-limit policy, minimal principal,
  real SIGKILL/restart and then the separate B2c/SPA/ERP gates.

## Handoff final — 23/08/2026, 02:08 BRT

The remote base before this handoff was `d525acc`; the continuation checkpoint
is published in `76f7ec5`; the canonical checker returned 11 PASS, 1 historical
WARN and 0 FAIL. Preserve the only dirty user-owned cache path and resume from
`docs/2026-08-23-checkpoint-continuacao.md`. Do not repeat the DLQ slice or
promote the ERP, provider, SPA, parity, WCAG or release gates.

## Incremento 23/08/2026 — principal mínimo e fail-closed

O caminho pré-contexto de API key agora usa uma projeção de oito campos, com
`GRANT` e `RETURNS TABLE` estreitos na migration `0113`; o mapper dedicado e a
ACL PostgreSQL passaram. O runtime não mascara indisponibilidade do Redis
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
`origin/agent/sync-v4-full-program`. A revisão independente registrou
`VFY-CVG-002B2B-REVIEW-001` como PASS; os dois listeners HTTP são uma prova de
storage compartilhado no mesmo processo, não de failover entre processos.

## Checkpoint 2026-08-23 — processo PIX comprovado

O settlement consumer agora possui checkpoints `after_claim_commit`,
`before_b1`, `after_b1_before_cas` e `after_applied_cas`; o harness de processo
independente passou `4/4` com `SIGKILL` real, PIDs distintos, takeover/fence,
estado PostgreSQL final canônico e probes `/ready`/`/metrics` em A e B. A
suíte do worker/build (`58`), settlement PostgreSQL (`6/6`), B1 (`18/18`) e
ingress/callback HTTP (`2/2`) permaneceu verde. O bar continua local e
sintético; não há promoção de `VERIFIED` nem de ERP/provider/SPA/paridade/
WCAG/target/release. Próximo produto recomendado: jornada de internação até
item cobrável, depois de preservar Redis failover/clock-skew como gate aberto.

Limite registrado pela crítica independente: `REL-SIGKILL-04` ainda não tem
prova processual de A vivo tentando operar após takeover de B; journal/outbox/
inbox detalhados e readiness do worker principal também permanecem fora desta
matriz. O fixture sintético agora é fail-closed (`NODE_ENV=test` + marcador)
e o canal de controle usa fd 3 dedicado.

## Handoff de continuidade — 23/08/2026, 03:13 BRT

Read-only audit: o teste de dois pools (`6/6`) prova takeover/fence, mas não
uma morte abrupta de processo. O próximo slice é adicionar checkpoints ao
settlement consumer e um harness com dois processos independentes para
`SIGKILL` em `after_claim_commit`, `before_b1`, `after_b1_before_cas` e
`after_applied_cas`, verificando exatamente uma aplicação B1 e probes
`/ready`/`/metrics`. O detalhe está em
`.agent/artifacts/CVG-002B2B-process-restart-and-erp-slices-2026-08-23.md`.

Após esse gate operacional, a primeira jornada de produto a decompor é
`internação -> handoff/permanência -> diária -> item cobrável`, com
idempotência, proveniência, auditoria, cutoff de alta, RLS/tenant e estados de
UI. Esta é uma recomendação de planejamento; não altera o status `BUILD` nem
promove qualquer gate do ERP.

## Checkpoint mais recente — stale-fence e billing diário (23/08/2026)

O race stale que faltava foi executado no boundary de processos: A permanece
vivo em `after_claim_commit`, sua lease expira, B assume com fence 2, A é
liberado primeiro e retorna `lease_lost` sem atravessar B1; B é liberado depois
e aplica uma vez. A matriz total passou `5/5` (quatro pontos de SIGKILL mais o
takeover stale). A prova continua delimitada a PostgreSQL descartável,
`local-pix` e fixture mínimo; readiness do worker principal, journal/outbox/
inbox detalhados, Redis failover/clock-skew e provider real permanecem abertos.

A primeira fatia clínica-financeira não-PIX também foi implementada:
`inpatient_daily_charge` é uma fonte financeira idempotente, com replay `200`,
conflito para vínculo divergente, índice unique partial, convergência de
`23505` e recuperação do billing record vencedor na corrida de primeira
criação. Evidência: route `10/10`, module-inpatient `17/17`, module-billing
`16/16`, integração PostgreSQL `2/2`, API `324/324`, worker `58` + build e
builds DB/module/API. O artefato é
`.agent/artifacts/CVG-002C-inpatient-daily-billing-idempotency-2026-08-23.md`.

O Quality Bar continua sem promoção global. Próxima ação: publicar este
checkpoint, exercitar Redis failover/clock-skew sob `fail-closed` e decompor
`admissão → handoff/permanência → diária → alta → item/recebimento` com REDs
PostgreSQL/RLS. B2c/SPA, provider, Vetus parity, WCAG, target ops, coverage e
release permanecem gates separados.

## Checkpoint 23/08/2026 — cutoff de alta e Redis

Redis local passou `21/21`; a migration `0116_inpatient_discharge_cutoff.sql`
fechou no banco os inserts pós-alta para progresso, ocorrência, diária e
consumo de estoque `inpatient_stay`, com prova descartável `2/2`. O teste HTTP
de login quando o rate limiter falha passou `1/1` sem cookie/token, e a
descrição do chaos foi alinhada a fail-closed. O PostgreSQL compartilhado de
testes entrou em recovery por repetidas bases efêmeras; isso é limitação de
ambiente. Próximo round: atomicidade/rollback billing ↔ daily charge e depois
admission → handoff → inventory → discharge → receipt/ledger/audit/outbox.

Publication checkpoint: `2b33aea` is pushed to
`origin/agent/sync-v4-full-program` with migration 0116, its independent
cutoff proof and the next-session handoff. Reconcile the final docs pointer,
then run the billing-item/daily-charge rollback RED; preserve
`IN_PROGRESS/PARTIAL` and all external gates.
