# Checkpoint de retomada — sessão atual

**Data:** 23 de agosto de 2026, 22:34 BRT
**Repositório:** `/home/ricardo/cvg-his-v4`
**Branch:** `agent/sync-v4-full-program`
**Estado:** `BUILD/VERIFY`, `IN_PROGRESS/PARTIAL`

Este é o índice curto para continuar o trabalho em outra sessão. Ele resume o
que está comprovado, o que foi publicado e o que continua aberto. Não é uma
declaração de produção, paridade, conformidade ou release.

A auditoria documental integral e o handoff consolidado desta sessão estão em
[`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md).
Use aquele arquivo para o inventário atual de `docs/`, a Quality Bar
reconciliada, a pesquisa oficial e a ordem de retomada; este checkpoint mantém
o resumo executável de cinco minutos.

## Retomada em cinco minutos

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
git diff --check
```

Leia, nesta ordem:

1. este checkpoint;
2. [`../.agent/state.json`](../.agent/state.json);
3. [`../.agent/backlog.json`](../.agent/backlog.json), item `CVG-002C6`;
4. [`../.agent/plans/premium-enterprise-mvp.md`](../.agent/plans/premium-enterprise-mvp.md);
5. [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md);
6. os últimos registros de [`../.agent/execution-log.jsonl`](../.agent/execution-log.jsonl)
   e [`../.agent/verification.jsonl`](../.agent/verification.jsonl).

O único caminho local que pode aparecer como dirty é o cache user-owned
[`../packages/design-system/tsconfig.vue.tsbuildinfo`](../packages/design-system/tsconfig.vue.tsbuildinfo).
Não adicionar, reverter, limpar ou fazer stage desse arquivo.

## O que foi concluído nesta sessão

### Harness crítico PostgreSQL

- O contaminante mínimo foi localizado em
  [`tests/integration/database/encounter-cash-receipts.test.ts`](../tests/integration/database/encounter-cash-receipts.test.ts).
- O cleanup deixou de usar `session_replication_role`; agora usa uma única
  transação, savepoints para erros esperados e rollback final da graph inteira.
- O prefixo cash-receipt → PIX passou **30/30**.
- O harness crítico controlado passou **28/28 arquivos e 387/387 testes**, com
  PostgreSQL descartável novo, migrations `0000–0123`, 172 tabelas, 43 enums,
  456 FKs, teardown concluído e exit `0` após 669,60 s.
- A revisão independente classificou a correção como **ACCEPT**. Residual
  explícito: este cenário de isolamento não comita um receipt válido; adicionar
  depois uma prova separada de commit-boundary.

Evidência reproduzível:

- [`../.agent/artifacts/CVG-002C6-critical-harness-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-critical-harness-green-2026-08-23.md)
- [`../.agent/verification.jsonl`](../.agent/verification.jsonl),
  `VFY-CVG-002C6-CRITICAL-HARNESS-GREEN-001` e
  `VFY-CVG-002C6-ISOLATION-REVIEW-001`

Comando usado:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/database tests/integration/setup tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
```

### Controle e publicação

- Implementação publicada: `76d94a3` — `fix: isolate encounter cash receipt fixtures`.
- Documentação e control plane publicados: `4f8d8d8` — `docs: record critical harness green checkpoint`.
- A consolidação documental global desta sessão será publicada em commit
  separado; o SHA remoto deve ser confirmado pelo comando `git fetch` da seção
  de retomada e pelo registro de verificação correspondente.
- `git fetch` confirmou `HEAD == origin/agent/sync-v4-full-program` em
  `4f8d8d8b806098241cd716ff12b13ac2e74d9621`.
- `state.json`, `backlog.json`, ExecPlan, Gauntlet state/progress e os dois
  ledgers JSONL foram atualizados. O estado permanece `IN_PROGRESS/PARTIAL`.
- O checker canônico ainda termina em
  `RESULT FAIL (pass=9, warn=1, fail=43)` por registros históricos com tipos,
  `evidence_kind` e ordenação não canônicos. Parse e reconciliação ativa passam;
  não tratar esse checker como aprovação nem reescrever o histórico nesta
  retomada.

## Fluxo clínico-financeiro já existente

O menor seam público reutilizável está em
[`tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`](../tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts)
e já costura, em HTTP real e PostgreSQL:

`admissão → handoff/ack → internação → consumo de estoque/lote → charge capture → diária/billing → alta → close → cash receipt → ledger/reconciliation → audit/outbox`.

O teste possui dois tenants, duas instâncias HTTP, spoofing A→B,
replay/conflito de idempotência, corrida e rollback. Os helpers de seed/request
e o `TenantUnitOfWork` são candidatos a fixture compartilhada para a prova de
processo filho.

Limites encontrados na inspeção:

- ainda não há uma única prova cross-domain com morte de processo em cada
  boundary e takeover real;
- admission, handoff, inventory, daily billing, discharge, close e receipt não
  têm uma matriz completa de failpoints/restart entre todas as escritas;
- handoff ainda está concentrado no `server.ts` e não usa o mesmo boundary
  explícito de `runTenantCommand` dos demais mutadores;
- após a morte no consumo de inventário, falta provar rebootstrap/hidratação de
  cache e reconciliação SQL dos vínculos clínico, estoque, billing, audit e
  outbox;
- `GET /audit/events` usa cache/lista e deve ser conferido também por contagem
  persistida; o journal do recebimento é criado no repository de receipt, não
  pelo serviço de ledger isolado.

### Primeiro gate child-process bounded

Foram adicionados o fixture
[`../apps/worker/test-fixtures/inpatient-domain-process.ts`](../apps/worker/test-fixtures/inpatient-domain-process.ts)
e o teste
[`../tests/integration/process/inpatient-domain-sigkill.test.ts`](../tests/integration/process/inpatient-domain-sigkill.test.ts).
O processo filho real recebe o evento outbox, faz claim com lease, chama o
endpoint HTTP de consumo de inventário e pode morrer em dois checkpoints:
`after_claim` e `after_domain_command_before_cas`. O teste envia `SIGKILL`,
aguarda a expiração do lease, inicia um segundo PID e verifica takeover,
replay idempotente, completion do outbox e reconciliação SQL de consumo/estoque/
billing/audit/outbox/idempotência. API e worker usam roles distintas `LOGIN
NOSUPERUSER NOBYPASSRLS`; o teste verifica a identidade e os flags de bypass em
cada processo.

Evidência fresca:

- [`../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md`](../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md)

```text
REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/process/inpatient-domain-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=dot --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
1 arquivo, 2 testes, 2 passed, exit 0, 81,65 s
```

Esta é uma prova P0 bounded de processo filho/takeover, não a matriz completa:
o API continua no mesmo processo do teste, os pontos de morte cobrem apenas o
consumer outbox de inventário e o escopo é uma fixture/tenant. A reconciliação
confirmou um consumo, estoque `10 → 8`, billing de `80`, duas auditorias, outbox
derivado com `sourceEntityId`, idempotência com operação/hash/resposta `201` e
outbox original concluído após duas tentativas. Rate-limit em memória aparece
no ambiente de teste e não prova Redis multi-réplica.

A revisão independente aceitou o gate somente neste limite e não encontrou
vacuidade relevante ou regressão no contrato outbox/UoW. Permanecem como
follow-ups: stale-owner fencing com A ainda vivo, `billing_items.source_entity_id`
explícito, hash canônico completo (não apenas comprimento), replay com payload
divergente, inclusão no critical/CI, dois tenants/spoofing e rebootstrap/
hidratação cross-instance. O teardown com `TRUNCATE ... CASCADE` depende de
`fileParallelism=false`.

## Próxima sequência obrigatória

1. Adicionar stale-owner fencing com A vivo e asserções explícitas de origem e
   hash canônico sem enfraquecer o gate atual.
2. Expandir a matriz para `inventory consumption → billing item → audit/outbox`,
   depois `discharge → close`, e por último `receipt → payment/receivable →
cash/journal`.
3. Reexecutar em dois tenants, duas instâncias, mesma chave concorrente e chave
   conflitante; validar por SQL, não apenas por cache ou resposta HTTP.
4. Completar a matriz de failpoints cross-domain e repetir regressões focadas e
   o harness crítico.
5. Só então avançar PIX PostgreSQL/RLS e webhook HTTP retry/DLQ/lease fencing.

Não reabrir slices já bounded sem regressão nova. Não promover `CVG-002C6`,
`CVG-002`, a Quality Bar ou o ERP global. Continuam abertos: RLS/FORCE RLS
global, hidratação cross-instance, WebAuthn durável, atribuição de auditoria,
Redis/provider, SPA, paridade geral `0/11`, paridade clínica `0/3`, WCAG,
coverage, deploy/restore/failover, operações e release.

## Pesquisa e decisões de produto preservadas

A pesquisa oficial de ERPs veterinários, FHIR R5, DICOMweb, LGPD e CFMV está em
[`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md)
e na auditoria integral. Ela serve para definir critérios de produto, não para
provar o código CVG-HIS. Os critérios executáveis mantidos são: workflow
clínico persistido, flowboard/internação, lote/validade/FEFO, charge capture,
portal/comunicação, integrações autenticadas com outbox/inbox/idempotência,
retry/DLQ/fence, proveniência/auditoria, consentimento e reconciliação.

## Restrições de segurança e escopo

- Não usar fallback `Map`/in-memory como evidência de durabilidade.
- Não acessar produção, provedores, credenciais, homologação fiscal ou cluster
  alvo sem autorização humana explícita.
- Antes de qualquer commit, revisar diff e secrets; manter validação de entrada,
  RLS, autorização, rate limiting, auditoria e mensagens sem vazamento.
- Commits convencionais e push com `-u` quando necessário; nunca incluir o
  `tsbuildinfo` user-owned.

## Fonte de verdade

O estado operacional atual está em [`../.agent/state.json`](../.agent/state.json)
(`active_task=CVG-002C6`, `verification_state=PARTIAL`, `last_event_id` será
reconciliado no commit final desta sessão).
O checkpoint histórico detalhado continua em
[`2026-08-23-checkpoint-retomada-integral.md`](2026-08-23-checkpoint-retomada-integral.md);
esta página é o índice curto e mais recente para a próxima sessão.

## Auditoria documental global — 22:34 BRT

O corpus atual de `docs/` foi inventariado em **1.456 arquivos** (1.004
Markdown, 129 JSON, 67 HTML, 255 PNG e 1 gzip), totalizando **53.957.807
bytes**. Foram lidos/varridos os 1.200 arquivos textuais; os 129 JSON foram
parseados sem erro e os binários foram verificados por assinatura. O manifesto
ordenado por caminho e conteúdo é
`5f16bfc916277a232726ea670e140c9b87c4da3e0c091e529d560b097679e546`.

O documento [`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md)
consolida as contradições históricas, a regra de precedência, os gates
`QB-SEC-01`/`QB-DATA-01`/`QB-AUTH-01`/`QB-CORE-01` parciais, `QB-PARITY-01`
falho, `QB-UX-01` não executado, `QB-REL-01` parcial/falho, `QB-OPS-01`
bloqueado e `QB-MKT-01` não executado. Não houve promoção global. A próxima
ação continua sendo stale-owner A vivo → A/B/hidratação → failpoints
cross-domain, preservando `CVG-002C6=IN_PROGRESS/PARTIAL`.

## Publicação reconciliada — 22:41 BRT

A auditoria global foi publicada em
`a4b85624653314b06aa951e8046664852a7a9c56` (`docs: consolidate global audit handoff`)
e a reconciliação documental seguinte em `b41e938` (`docs: reconcile audit
handoff publication`). Para o ponteiro atual, a próxima sessão deve executar
`git fetch` e comparar `HEAD` com `origin/agent/sync-v4-full-program`. Somente
o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` permanece
dirty e fora do stage. O trabalho deve seguir pelo handoff global, stale-owner
A vivo, A/B/hidratação e a matriz de failpoints.

## Publicação final desta sessão — 22:12 BRT

Commits publicados no GitHub:

- `eccdacc` — `test: prove inpatient process takeover`;
- `af499e3` — `docs: save session continuation checkpoint`.

Os commits posteriores de reconciliação são apenas ponteiros de continuidade;
o SHA exato do branch remoto deve ser confirmado pelo comando `git fetch` da
seção de retomada e pelo último registro `VFY-DOCS-CONTINUATION`. O único
caminho dirty continua sendo `packages/design-system/tsconfig.vue.tsbuildinfo`,
preservado fora do stage. A próxima sessão deve começar por este arquivo,
`.agent/state.json`, `.agent/backlog.json` e o artefato do processo; o próximo
gate é stale-owner/A-B/hidratação/failpoints, não uma promoção global.

## Atualização executável — 24/08/2026

O handoff mais recente está em
[`../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md).
Antes de retomar o próximo workstream, a sessão fechou:

- `test:critical` base: 28 arquivos, 387/387 testes, exit 0;
- `test:critical` processo inpatient/SIGKILL: 1 arquivo, 2/2 testes, exit 0;
- inventory charge-capture focado: 3/3;
- close → receipt focado: 5/5;
- production-like bootstrap focado: 6/6;
- cutover/deploy: 12/12 checks;
- migration consistency, OpenAPI, RLS e `security:secrets`: exit 0.

O comando crítico aplica sufixos distintos aos bancos `critical_base_<pid>` e
`critical_process_<pid>`, inclusive quando a URL é explícita; migrations,
seed e pools seguem a URL resolvida. O único dirty path permitido continua
[`../packages/design-system/tsconfig.vue.tsbuildinfo`](../packages/design-system/tsconfig.vue.tsbuildinfo),
que não deve ser staged.

A próxima sessão deve atacar stale-owner com A vivo, source/hash de billing,
payload divergente, dois tenants/A-B, hidratação cross-instance e failpoints
de discharge/close/receipt. O gate global segue `IN_PROGRESS/PARTIAL`; não
interpretar o verde do harness bounded como paridade, produção ou release.

### SHA publicado

O commit `d23120a` (`fix: harden critical runtime and deployment gates`) foi
enviado ao GitHub. `git fetch` confirmou
`HEAD == origin/agent/sync-v4-full-program` em
`d23120accb6c6f5ea1e26d6e54bbef9477bc5622`; somente o cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece dirty e fora do
stage.

O commit documental de ponteiro `4ee4afc` (`docs: record critical gates
publication`) sucedeu o commit de implementação `d23120a` e foi enviado ao
remoto. Como o branch pode avançar com novos checkpoints, a próxima sessão
deve sempre repetir `git fetch` e comparar `HEAD` com `origin`.

## Stale-owner A vivo — evidência executável de 24/08/2026

O RED de fencing com A vivo falhou **2/2** antes da alteração porque o fixture
não publicava a perda da lease no `completeClaim` tardio. A implementação
adicionou uma barreira de teste `SIGUSR2` e o campo `leaseLost`, sem alterar o
contrato de produção.

O GREEN atual passou **4/4 testes em 1 arquivo**, exit 0, em PostgreSQL
efêmero novo. Em `after_claim` e
`after_domain_command_before_cas`, A permanece vivo, a lease expira, B assume
com `leaseVersion=2` e conclui; só então A é liberado e seu CAS retorna
`outboxCompletion=false`/`leaseLost=true`. A SQL confirma uma única cadeia de
efeitos, estoque 8, idempotência 1, attempts 2 e `lease_version=2`. Os dois
casos SIGKILL preexistentes continuam verdes. Prettier e ESLint passaram.

Artefato: [`../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`](../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md).

Estado permanece `CVG-002C6=IN_PROGRESS/PARTIAL` até crítica independente
fresca e até fechar source/hash de billing, dois tenants/A-B, hydration
cross-instance e failpoints da jornada admission→receipt. Não promover ERP,
produção, paridade, operações ou release.

### SHA da publicação stale-owner

O commit `af4bf20` (`test: prove stale-owner fencing with live worker`) foi
publicado no GitHub. A próxima sessão deve executar `git fetch` e confirmar
`HEAD == origin/agent/sync-v4-full-program`; a reconciliação desta rodada
observou `af4bf20e2c2fbbbf716bd8a0fba13a008af88c54`. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` continua dirty, user-owned e
fora do stage.

## Billing source/hash — evidência executável de 24/08/2026

O harness agora verifica, no SQL, que o billing aponta para o
`inventory_consumption.id` correto e que `request_hash` é o SHA-256 completo do
envelope canônico `{path, query, body}`. O replay com a mesma chave e
`quantity=3` retorna `409 IDEMPOTENCY_CONFLICT` e não cria consumo, billing,
auditoria ou outbox adicional.

O primeiro RED encontrou a diferença entre o hash do body cru e o envelope
real do dispatcher; a asserção foi corrigida para usar o canonicalizer
compartilhado. A rodada GREEN passou **4/4 testes em 125,96 s**, incluindo os
casos SIGKILL e stale-owner A-alive. Nenhuma alteração de produção foi
necessária; a lacuna era de prova comportamental.

Artefato: [`../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`](../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md).

A crítica independente fresca deste slice já foi executada: o rerun
`billing_hash_review_20260824` passou 4/4 e recebeu **APPROVE bounded**, sem
P0/P1. Falta apenas publicar o commit desta rodada e reconciliar o SHA remoto;
depois, o próximo gate é A/B entre tenants, hydration cross-instance e
failpoints admission→receipt. Não promover ERP, produção, paridade, operações
ou release.

### SHA publicado — billing source/hash

O commit `9bd8cd8` (`test: assert billing provenance and canonical replay hash`)
foi publicado no GitHub. `git fetch` confirmou
`HEAD == origin/agent/sync-v4-full-program` em
`9bd8cd8aab0c9f7fe78f4f0b6a5355619cd827a5`; somente o cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece dirty e fora do
stage. Esta é a ponte para a próxima sessão: iniciar por este checkpoint,
`.agent/state.json`, `.agent/backlog.json` e o artefato billing, e então atacar
A/B, hydration cross-instance e failpoints.


## Atualização de execução — hidratação cross-instance — 24/08/2026

A regressão vertical adicionou uma prova real entre duas APIs prontas antes da
mutação. O RED em vertical_hydration_red passou 4 testes e falhou 1 porque a
segunda instância retornava lista vazia para o stay committed de A. O runtime
agora refresca a fatia do account a partir do PostgreSQL antes de GET
/inpatient e de GET /discharges (lista e detalhe).

Resultado GREEN e regressões em bancos descartáveis:

- vertical_hydration_green2: 5/5, exit 0, 36,06 s;
- close/receipt: 5/5, exit 0, 50,35 s;
- discharge: 5/5, exit 0, 44,93 s;
- typecheck: 70/70 projetos scoped; secrets, Prettier, ESLint focado e
  diff check: exit 0.

O bearer A viu o stay discharged e o discharge na instância secundária; o
bearer B recebeu items=[] para A. A revisão independente retornou APPROVE
bounded, sem P0/P1. Artefato:
[CVG-002C6-cross-instance-hydration-2026-08-24.md](../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md).

Limitação explícita: concorrência durante refresh em voo permanece P2; Redis
invalidation, demais domínios cacheados, failpoints admission→receipt,
PIX/webhook, paridade e release continuam abertos. Próxima ação: publicar a
rodada e expandir failpoints de discharge/close/receipt sem promover o ERP.
