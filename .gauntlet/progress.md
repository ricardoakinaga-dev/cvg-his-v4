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
cutoff proof and the next-session handoff; docs pointer reconciliation is
published as `432887f`. Run the billing-item/daily-charge rollback RED; preserve
`IN_PROGRESS/PARTIAL` and all external gates.

## Registro de retomada — auditoria integral e pesquisa de mercado (23/08/2026)

- Corpus `docs/` relido e inventariado em 1.449 arquivos; manifesto atual
  `d23f84a7000e42943093090e706db12e01a6e4189f61f5bd833f67b5e92ea2db`.
- Readiness estrutural permanece 95/100; Vetus geral `0/11` e clínica `0/3`.
- Benchmark oficial atualizado com Shepherd, ezyVet/IDEXX, Digitail, Vetspire,
  Covetrus, Provet, Oracle e SAP. Os padrões são critérios de produto, não
  evidência de paridade.
- Próximo RED: rollback billing ↔ diária; depois jornada clínica-financeira
  PostgreSQL/RLS. Estado global não promovido.

## Progresso mais recente — recibo de caixa HTTP/UoW (23/08/2026, 07:09 BRT)

O RED da rota que ignorava o runner e o RED do snapshot com
`statusMessage: undefined` foram corrigidos em `3e278c8`. A evidência fresca é
rota + buffer `10/10`, helpers `6/6`, comando PostgreSQL `8/8`, integração HTTP
→ PostgreSQL `1/1`, typecheck PASS e diff check PASS. O teste confirma commit,
replay, conflito e uma única cadeia financeira/auditável.

A revisão independente aprovou sem P0/P1. O próximo gap local é P2: HTTP
cross-tenant A/B com segundo token. Depois, continuar a jornada completa com
PostgreSQL/RLS, replay, concorrência e failpoints; o ERP e os gates externos
continuam `IN_PROGRESS/PARTIAL`.

## Progresso mais recente — matriz HTTP A/B concluída (23/08/2026, 07:20 BRT)

O teste `encounter-cash-receipt-http-postgres` agora cria um segundo tenant e
token e prova GET/POST cross-tenant opacos (`404`), sem recibo ou idempotência
estrangeira. A integração passou `2/2`; rota + response-buffer `10/10`, API
typecheck e diff check PASS. O P2 local foi removido. Próxima ação: jornada
clínica-financeira completa com PostgreSQL/RLS, replay, concorrência e
failpoints, preservando todos os gates externos.

## Continuidade publicada — diária HTTP/UoW (23/08/2026)

Commit `9a93ebc` endureceu a cobrança diária HTTP: replay de diária faturada
fica dentro de `runCommand`, e a reidratação de caches é postergada quando a
UoW HTTP ainda possui uma transação abortada. Evidência fresca: API build PASS,
rota 13/13, module-inpatient 17/17, module-billing 16/16 e integração
HTTP/PostgreSQL 3/3. A integração cobre commit, replay, conflito, rollback
forçado e concorrência same-key.

O programa permanece `IN_PROGRESS/PARTIAL`. O próximo slice é HTTP A/B da
internação e revisão de cache de auditoria; em seguida, a jornada completa de
admissão → handoff/permanência → estoque → alta → billing →
recebimento/ledger/auditoria/outbox. Nenhum gate de produção, provider, Redis
failover real, SPA/B2c, paridade, WCAG, operações, cobertura ou release foi
promovido.

## Continuidade publicada — internação HTTP A/B e cache de auditoria

O próximo slice foi implementado em `c647db1` e passou a matriz de dois
tenants `4/4`. O token B, com headers A falsificados, faturou apenas a diária
de B; a worklist omitiu A; leitura e escrita contra a stay A retornaram `404`,
sem billing item, status alterado ou idempotência estrangeira. A rota passou
`14/14`, AuditService `19/19`, inpatient `17/17`, billing `16/16` e as
regressões rollback/idempotência `3/3`.

O cache quente de auditoria também é reconstruído por conta a partir de linhas
commitadas após falha tardia, fora do contexto assíncrono da transação abortada.
O default de 100 eventos do repositório continua documentado como limite de
produção a revisar. A próxima ação é a jornada admissão → handoff/permanência →
inventário → alta → billing → recebimento/ledger/auditoria/outbox; nenhum gate
global ou externo foi promovido.

## Checkpoint atual — CVG-002C5 discharge HTTP (23/08/2026)

- Alta HTTP/PostgreSQL passou `5/5`, incluindo fechamento da stay inpatient,
  replay, rollback limpo, dois tenants com bearer/headers falsos, guarda
  non-inpatient e corrida entre duas instâncias com `201` + `409`.
- AuditService + discharges passaram `31/31`; daily-charge + cash HTTP `6/6`;
  tenant-command `5/5`; API build/typecheck, module typechecks, OpenAPI parse,
  Prettier direcionado e diff check passaram.
- O runner SQL recebe `tenantTransaction`; a reidratação de auditoria evita o
  corte de 100 eventos e o OpenAPI de alta/PATCH reflete o contrato real.
- O maior gap segue a jornada admissão → handoff/permanência → inventário →
  alta → billing → recebimento/ledger/auditoria/outbox. Cursor pagination,
  Redis failover, provider, SPA/B2c, Vetus parity, WCAG, target operations,
  cobertura e release continuam abertos.

## Handoff 23/08/2026 — auditoria da jornada clínica-financeira

O registro dedicado em
`docs/2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md` preserva a
leitura integral do corpus, a precedência documental e a crítica independente.
As fatias admission/handoff/daily-charge/inventory/discharge/receipt continuam
provas separadas; a jornada completa foi classificada `REJECT` porque o
consumo de estoque não gera ainda item de billing e não existe E2E público
HTTP/PostgreSQL único com rollback, replay, concorrência, dois tenants e
auditoria/outbox correlacionados.

Próximo RED: criar
`tests/integration/database/inpatient-inventory-charge-capture-http-postgres.test.ts`,
expor a lacuna de charge capture e decidir o contrato de preço antes do GREEN.
O Quality Bar e o ERP continuam `IN_PROGRESS/PARTIAL`, com provider, SPA,
Vetus parity, WCAG, operações, cobertura e release separados.

## Continuidade executada — CVG-002C6 (23/08/2026, 10:45 BRT)

O RED de charge capture foi convertido em um GREEN bounded no commit
`ef4ee2d`. A implementação separa preço assistencial de custo, registra billing
item com origem `inventory_consumption`, mantém replay/concurrency por índice
parcial tenantizado, reidrata após conflito de CAS e fecha no PostgreSQL as
referências de stay inexistente, encounter divergente, cross-tenant e pós-alta.

Evidência fresca: HTTP/PostgreSQL C6 `3/3`, cutoff SQL `4/4`, module-inventory
`21/21`, module-billing `16/16`, typechecks PASS, OpenAPI `337/390` e
`pnpm audit --audit-level=high` sem vulnerabilidades conhecidas. O review final
foi APPROVE sem Critical/High/Medium no slice.

O próximo trabalho continua sendo a jornada admission → handoff/permanence →
inventory → discharge → billing → cash receipt → journal/audit/outbox, com
failpoints e conflito de payload same-key. O programa permanece
`IN_PROGRESS/PARTIAL`; nenhum gate externo ou de release foi promovido.

## C6-NEXT — close HTTP transacional até receipt (23/08/2026)

RED/GREEN local: o novo teste HTTP/PostgreSQL passou `4/4`, incluindo
replay/conflict, corrida de chaves distintas `200/409`, auditoria e outbox
`encounter.closed`, settlement do cash receipt com journal debit=credit e
isolamento A/B. A rota agora bloqueia a linha do encounter, grava audit/outbox
no mesmo UoW e reidrata cache depois de rollback; `closeReason` e
`Idempotency-Key` estão alinhados no contrato/OpenAPI.

Próximo passo: RED/GREEN de outbox por `inventory_consumption` e failpoints
cross-domain. A barra global não muda: `IN_PROGRESS/PARTIAL`, sem promoção de
produção, release, provider, SPA, paridade, WCAG ou operações.

## Iteração local — hardening closeReason/cache + inventory outbox (23/08/2026)

O review adversarial foi incorporado antes da publicação: migration 0119 e
schema/repositório persistem `closeReason`; snapshot/restore remove estado
especulativo de encounter/timeline; auditoria captura o ID antes do await; e
OpenAPI exige request estrito e descreve a resposta. A integração close →
receipt passou **5/5**, incluindo failpoint SQL com 500, rollback sem ghosts e
GET de cache aberto.

O próximo gap bounded passou **3/3** depois que o repositório de inventário
reutilizou o UoW tenant ativo. A suíte agora prova três
`inventory.consumption.created` no outbox, replay/concurrency `201/201`,
billing capture, no-price rollback e tenant isolation. A primeira rodada
`201/409` foi registrada como RED da fronteira transacional.

Quality bar global continua `IN_PROGRESS/PARTIAL`; revisão final, checker,
security/diff, commit/push e failpoints/restart cross-domain permanecem os
próximos gates.

O último hardening também restaura queue entry + appointment no rollback do
close e falha fechado (`503 TRANSACTION_REQUIRED`) antes de consumo PostgreSQL
sem contexto UoW canônico. A hidratação assíncrona posterior permanece apenas
convergência best-effort para mudanças externas concorrentes.

## Publicação C6-NEXT — 23/08/2026

O commit bounded `90873f1dfa0ad0e649a8813927d78c66249373b8` foi enviado para
`origin/agent/sync-v4-full-program`, e o fetch confirmou `HEAD == origin`.
Próxima ação: provar inventory → close → receipt como uma jornada vertical com
failpoints/restart. O cache `packages/design-system/tsconfig.vue.tsbuildinfo`
continua fora do stage; os gates globais seguem `IN_PROGRESS/PARTIAL`.

## Handoff documental da sessão — 23/08/2026, 12:21 BRT

Foi criado [`docs/2026-08-23-handoff-sessao-atual.md`](../docs/2026-08-23-handoff-sessao-atual.md)
como ponto de entrada curto para a próxima sessão. A reconciliação repetiu
readiness `95/100` (score estrutural), Vetus `0/11`, clínico `0/3`, RLS
`153/154`, OpenAPI `337/390`, checker `11 PASS / 1 WARN histórico / 0 FAIL` e
`git diff --check` PASS.

A crítica independente mantém `REJECT` para `ERP-CLIN-001` e `ERP-E2E-006`:
as provas C6 de inventory e close→receipt ainda são separadas. O próximo RED
deve unir admission/handoff/stay, consumo com charge capture, diária, alta,
close e receipt com PostgreSQL, dois tenants, role sem `BYPASSRLS`, replay,
conflito, corrida, failpoints, restart e reconciliação de journal/audit/outbox.
Nenhum gate de provider, Redis, SPA, paridade, WCAG, operações, cobertura,
deploy/restore ou release foi promovido.

Publicação documental confirmada em `d355513e82fc0a51b7e4e39e2a93ed3d9daf154d`;
o cache user-owned do design-system permanece fora do commit.

Auditoria de segurança posterior encontrou `HIGH/P0`: `staging`/`stage` pode
iniciar com repositórios em memória/mistos quando DB/schema falham, e o worker
tem assimetria. O próximo gate local passa a ser RED/GREEN de startup
fail-closed e bloqueio de mutações; a jornada vertical clínica permanece logo
depois, com todos os gates externos ainda separados.

## Gate concluído localmente — CVG-001 startup fail-closed (23/08/2026)

- API e worker agora compartilham a classificação production-like para
  `production`, `prod`, `staging` e `stage`; `NODE_ENV` do processo, ambiente
  explícito e flags RLS/schema são monotônicos e não permitem downgrade.
- URL ausente, DB indisponível, role insegura, schema de delivery incompleto,
  repositório misto ou UoW ausente abortam antes de listen/loop em ambientes
  protegidos. O artefato é
  `.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md`.
- API bootstrap **18/18**, shared-config **40/40**, worker **62**, API package
  **331/331**, typecheck/build e diff check passaram; revisão independente foi
  PASS para esse escopo. A barra global continua `IN_PROGRESS/PARTIAL`; ainda
  faltam harness real de schema/role e a jornada clínica-financeira única.

## Checkpoint 16:35 BRT — defesa de bootstrap publicada e RED vertical aberto

O harness real de startup production-like passou **6/6** em PostgreSQL
descartável com role restrita `NOBYPASSRLS`, role insegura, schema incompleto e
subprocessos API/worker sem listener/loop após DB recusado. O commit publicado
é `25d7aa2`; o artefato é
`.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md`.

O maior gap local agora é o RED
`tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`:
admission → handoff → inventory → daily → discharge → close já executam em
PostgreSQL efêmero. A revisão independente corrigiu o fixture (billing-open
HTTP, casts `::text` e bearer A→recurso B) e a repetição passou **4/4**,
incluindo receipt, ledger/reconciliation, rollback e isolamento A/B. Isso é
GREEN bounded; não promover ERP, produção ou release. Permanecem abertos
NOBYPASSRLS comportamental clínico,
failpoints/restart/reconciliação cross-domain, SPA, provider, paridade, WCAG,
operações e cobertura.

Publicação: commit `d25151d96b1f7f0a17e3e08122d263507ec0353d` foi enviado ao
branch remoto e o fetch confirmou `HEAD == origin`; o cache user-owned do
design-system permaneceu fora do commit.

## Iteração 17:28 BRT — role runtime, restart e search_path hardening

O gate bounded foi elevado para login API real `NOBYPASSRLS` e passou **5/5**;
um teste separado de restart/replay controlado passou **1/1**. A execução
confirma ACL API/worker sem `PUBLIC EXECUTE`, reconciliação por registro,
headers falsificados e o grafo inventory → billing → receivable → payment →
cash → journal com total `260` balanceado.

A crítica encontrou HIGH no `search_path` da função invoker. O cenário de
shadowing foi mantido como RED até a migration `0120` fixar
`pg_catalog, public, app, pg_temp`; depois passou GREEN sob a mesma role real.
Commits locais: `ee126a6` e `67bfe2d`. Artefato:
`.agent/artifacts/CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md`.

Quality Bar global continua `IN_PROGRESS/PARTIAL`: ainda faltam SIGKILL de
processo filho, failpoints por boundary, worker independente, equivalência Helm
executada, RLS/FORCE RLS global e gates de produto/operação/release.

## Iteração atual — worker ACL e recuperação de processo (23/08/2026, 17:53 BRT)

O RED do worker real foi fechado bounded: a role `NOBYPASSRLS` falhava com seis
privilégios proibidos e, após uma correção parcial, ainda havia dois. A política
final revoga todo DML/truncate de tabelas de instalação/governança do worker
após o grant amplo, em reconciler, init e Helm. A prova process-level passou
**1/1** com `/live`, ticks reais, inspeção positiva de privilégios vazia antes e
depois do restart, `/ready` HTTP `503`, `SIGKILL`, restart na mesma porta e
`SIGTERM` limpo; o contrato de ACL passou **11/11**. A revisão independente foi
**APPROVE bounded**, sem Critical/High.

Stop decision: `ACTIVE`; não promover readiness nem a Quality Bar global. O
residual Medium é explícito: `payments`, `billing` e `webhooks` ainda não são
registrados, então não há processamento real de eventos de domínio. Próximo
gate: compor/revisar esses handlers, repetir readiness e executar a matriz de
failpoints e equivalência Helm aplicada. `tsconfig.vue.tsbuildinfo` continua
user-owned e fora do stage.

Publicação: `adde66b7a1b33333126f4832b3c728abb2db8500` (`fix: harden worker
runtime role boundary`) foi enviado para `origin/agent/sync-v4-full-program`; o
fetch confirmou igualdade entre `HEAD` e o remoto. O checkpoint do worker e o
artefato são a referência da próxima sessão.

O ponteiro final do handoff é `720876ec1f5ce30275b1160df7ef5f35c6fb1b0e`; a
implementação está em `adde66b7a1b33333126f4832b3c728abb2db8500`.

## Iteração atual — consumidores do worker e persistência de cartão (16:25 BRT)

O pacote compartilhado registra `payments → billing → webhooks`; o bootstrap do
worker exige o schema completo e hidrata cada conta sob contexto tenant. A
migration `0121_card_transactions.sql` adiciona cartão PostgreSQL com
`ENABLE/FORCE RLS`, FK composta e checks. O fluxo `card.completed` falha fechado
sem intent autoritativo ou com divergência de conta, billing, moeda ou valor.

Provas bounded: composition `2/2`, payments `9/9`, card repository `3/3`, worker
child-process `1/1`, RLS coverage `154/155 + 1 exceção`, builds/typechecks PASS.
Billing faz leitura autoritativa; webhooks apenas enfileiram deliveries
pendentes. A próxima sessão deve publicar fixtures de eventos sob
`NOBYPASSRLS`, testar inbox/outbox, settlement, replay/concurrency, rollback e
isolamento A/B; transaction-id global, card cross-tenant, retry/DLQ, failpoints,
Helm e os gates globais continuam abertos.
