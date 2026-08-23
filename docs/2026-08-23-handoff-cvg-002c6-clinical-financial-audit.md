# Handoff CVG-002C6 — auditoria clínica-financeira e continuidade

**Data:** 23 de agosto de 2026
**Branch:** `agent/sync-v4-full-program`
**Escopo:** salvar o estado reproduzível para a próxima sessão; nenhuma
implementação foi declarada nesta fatia documental.

## Ponto de entrada

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` já estava modificado e deve
continuar fora de stage, commit, limpeza ou reversão.

## O que foi consolidado nesta sessão

- O corpus `docs/` foi enumerado como bytes e os arquivos textuais foram
  varridos como UTF-8. O snapshot de leitura tinha 1.450 arquivos, 1.194
  textuais, 256 binários e 53.810.236 bytes; 129 JSON foram analisados, 255
  assinaturas PNG foram reconhecidas e a validação gzip passou. Esse número é
  um inventário da leitura anterior à inclusão deste handoff, não um novo gate
  de release.
- A precedência documental foi preservada: comportamento executado/testes e
  estado persistido; código/contratos; camada ativa de agosto; arquitetura e
  ADRs; auditorias antigas; Vetus e `docs2`. A regra está em
  [`docs/README.md`](README.md) e
  [`docs/430-fonte-de-verdade-documental.md`](430-fonte-de-verdade-documental.md).
- A auditoria integral e a pesquisa de mercado continuam registradas em
  [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md)
  e [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md).
  Benchmark de fornecedor é requisito de produto, nunca prova de paridade CVG-HIS.
- O checkpoint anterior e os slices já publicados continuam preservados em
  [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md),
  nos handoffs anteriores e nos artefatos sob `.agent/artifacts/`.

## Estado técnico comprovado

As provas abaixo são limitadas ao escopo de cada teste e não elevam o ERP
inteiro a produção:

- admission, handoff/permanência, diária, inventário, alta e recibo possuem
  fronteiras individuais implementadas e testes dirigidos;
- a diária HTTP/UoW cobre commit, replay, conflito, rollback e concorrência
  same-key;
- a matriz HTTP de recibo cobre commit/replay/conflito e isolamento A/B;
- a alta HTTP/PostgreSQL `CVG-002C5` passou `5/5`, fecha a stay inpatient,
  reexecuta com segurança, limpa rollback e transforma a corrida de chaves
  distintas em `201` + `409`;
- a alta agora preserva o cache de auditoria sem o corte legado de 100 eventos,
  ainda sem paginação/cursor para históricos muito grandes;
- builds, typechecks, parse estrutural de OpenAPI e `git diff --check` dos
  slices publicados estão registrados nos artefatos e no ledger de verificação.

O `Quality Bar` continua congelado e `IN_PROGRESS/PARTIAL`. A paridade
comportamental permanece `0/11` geral e `0/3` clínica; nenhum gate de provider,
SPA/B2c, WCAG, target operations, cobertura, deploy/restore ou release foi
promovido.

## Maior lacuna encontrada

A crítica independente desta sessão rejeitou a jornada como completa porque
não existe ainda um único teste público HTTP/PostgreSQL que ligue, com
idempotência e rollback observáveis:

`admission → handoff/permanence → inventory consumption → daily charge →
 billing → discharge → cash receipt → journal/audit/outbox`.

Evidência de código que deve orientar a próxima sessão:

- `apps/api/src/routes/inventory-routes.ts` grava consumo e auditoria, mas não
  cria item de billing;
- `packages/modules/inventory/src/index.ts` consome lotes/estoque e movimento,
  sem ledger financeiro ou outbox correspondente;
- `apps/api/src/routes/discharges-routes.ts` fecha discharge/stay/audit, mas é
  uma unidade separada do consumo e do recebimento;
- `apps/api/src/runtime.ts` e `apps/api/src/consumers/billing.consumer.ts`
  ainda não formam a transação clínica-financeira única esperada;
- o contrato `CreateInventoryConsumptionRequest` não contém preço/charge
  capture, e o source enum de billing ainda não aceita
  `inventory_consumption`; a migration `0115` só cobre
  `inpatient_daily_charge`.

## Próximo RED recomendado

Criar primeiro
`tests/integration/database/inpatient-inventory-charge-capture-http-postgres.test.ts`
com PostgreSQL descartável e dois tenants. O RED deve:

1. autenticar tokens A/B e semear encounter, stay e item/lote de estoque;
2. criar admission e consumo com `sourceEntityType=inpatient_stay`;
3. exigir item de billing com origem determinística no consumo, além de
   movement/consumption e audit/outbox correlacionados;
4. repetir a mesma `Idempotency-Key`, tentar payload divergente e executar
   duas chaves distintas em paralelo;
5. provar que B não lê nem altera recursos de A, mesmo falsificando headers;
6. só depois costurar discharge e cash receipt, verificando settlement,
   journal balanceado, movimento de caixa, audit e outbox;
7. adicionar failpoints depois de cada escrita para demonstrar rollback sem
   estoque, cobrança, stay, audit ou outbox fantasma.

O RED deve falhar pela ausência de charge capture de consumo, não por fixture
frágil. Antes do GREEN, decidir explicitamente a fonte de preço assistencial;
não assumir que custo de estoque é preço de venda sem decisão de domínio.

## Limites e regras de retomada

- Não repetir as fatias já publicadas de DLQ, principal/rate-limit, stale-fence,
  migration `0115`/`0116`, diária HTTP/UoW, isolamento inpatient ou alta C5.
- Não copiar padrões inseguros encontrados em referências Vetus (tokens em
  `localStorage`/query string ou PII sem mascaramento).
- Não usar fallback em memória como evidência de PostgreSQL, não contar score
  estrutural como paridade e não afirmar produção/go-live.
- Redis failover real entre processos, providers, SPA/B2c, paridade Vetus,
  WCAG, operações alvo, cobertura, restore/deploy e release continuam gates
  independentes.

## Arquivos de continuidade

- [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md)
- [artefato técnico CVG-002C6](../.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md)
- [estado canônico](../.agent/state.json)
- [backlog](../.agent/backlog.json)
- [ExecPlan](../.agent/plans/premium-enterprise-mvp.md)
- [Quality Bar](../.gauntlet/state.md)

## Publicação confirmada

Este handoff e os ledgers foram publicados em
`59eabc465e610187212f2b6f4458d61d00df8086`
(`docs: save clinical-financial continuation handoff`). Após `git fetch`,
`HEAD == origin/agent/sync-v4-full-program`. O checker canônico retorna 11
PASS, 1 WARN histórico de ownership paralelo e 0 FAIL. O único caminho dirty
é o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`.

## Atualização executada — implementação CVG-002C6

O próximo RED foi executado contra HTTP real, PostgreSQL efêmero e dois
tenants. A primeira execução falhou exatamente na lacuna esperada: consumo e
movimento foram persistidos, porém não havia `billing_item`/`billing_record`
para a origem `inventory_consumption`. O GREEN bounded foi publicado em
`ef4ee2d` (`feat: capture inpatient inventory charges`).

### O que mudou

- `inventory_items.charge_unit_price_amount` separa preço assistencial de
  custo, aceita `NULL` para item ainda sem preço e exige valor positivo quando
  configurado;
- contratos compartilhados, Drizzle/OpenAPI e repositório persistem o novo
  campo;
- billing aceita `inventory_consumption` e possui unicidade parcial tenantizada
  para replay/concurrency;
- `POST /inventory/consumptions` valida a stay/encounter no escopo da conta,
  recusa preço ausente com `422 PRICE_SOURCE_REQUIRED`, grava o consumo e
  captura o item financeiro no mesmo comando/UoW, com auditoria para billing e
  inventory;
- CAS de saldo produz `ConflictError` estruturado e reidrata/re tenta uma vez;
- migration `0118_inventory_consumption_stay_integrity.sql` endurece o trigger
  SQL já existente: stay inexistente (`23503`), encounter divergente (`23514`),
  referência cross-tenant e pós-alta são rejeitados no banco.

### Evidência fresca

- `tests/integration/database/inpatient-inventory-charge-capture-http-postgres.test.ts`: **3/3**;
- `tests/integration/database/inpatient-discharge-cutoff.test.ts`: **4/4**;
- module-inventory: **21/21**; module-billing: **16/16**;
- typechecks de inventory, billing, shared-contracts e API: **PASS**;
- OpenAPI: **337 paths / 390 schemas**;
- `pnpm audit --audit-level=high`: **No known vulnerabilities found**;
- `git diff --check`: **PASS**; revisão independente final: **APPROVE**, sem
  Critical/High/Medium no slice.

O teste prova replay same-key, duas chaves distintas `201/201`, três
consumos/movimentos/billing items, total `240`, saldo `4`, preço ausente sem
mutação e isolamento A/B. A prova direta SQL também cobre stay inexistente,
encounter incompatível e stay de outro tenant.

### Retomada obrigatória

O slice C6 não fecha a jornada inteira: discharge, cash receipt, journal e
outbox ainda não estão costurados no mesmo fluxo público; não há failpoint por
escrita, teste dedicado de conflito de payload same-key ou CRUD unitário do
novo preço. O programa permanece `IN_PROGRESS/PARTIAL`, e os gates de provider,
Redis failover real, SPA/B2c, paridade Vetus, WCAG, target operations,
cobertura, deploy/restore e release continuam abertos.

O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu fora do commit.

## Publicação confirmada — 23/08/2026

O commit de implementação `ef4ee2d` e a reconciliação documental
`e480952` foram enviados para `origin/agent/sync-v4-full-program`. Após
`git fetch`, `HEAD` e `origin/agent/sync-v4-full-program` apontaram para
`e480952bb8ec55f288ab48f8982f0510b9f9d05d`. O checker canônico retornou 11
PASS, 1 WARN histórico de ownership paralelo e 0 FAIL. O único caminho dirty
continua sendo o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, que não foi estagiado.

## Próxima fatia P0 — C6-NEXT (fechamento público até recebimento)

O mapeamento executado após a publicação confirmou que a rota
`POST /encounters/:encounterId/close` ainda é o bypass central: ela atualiza o
serviço/cache, espera a fila de persistência e chama auditoria fora do
`runTenantCommand`. O comportamento esperado agora é um UoW tenantizado com
`Idempotency-Key`, payload canônico `closeReason`, timeline, auditoria
transacional e outbox `encounter.closed`; a mesma chave deve reproduzir a
mesma resposta e payload divergente deve retornar `409` sem mutação.

O RED será o teste HTTP/PostgreSQL
`tests/integration/database/inpatient-clinical-financial-close-receipt-http-postgres.test.ts`.
Ele começa com encounter aberto e billing originado no episódio, chama close
e só depois receipt. Além do isolamento A/B e corrida de chaves distintas,
consulta o grafo SQL (`encounters`, `encounter_timeline`, `billing_records`,
`encounter_cash_receipts`, `encounter_receivable_payments`, `cash_movements`,
`financial_journal_entries/lines`, `audit_events`, `outbox_events` e
`idempotency_requests`) e exige journal balanceado e ausência de duplicatas.
O RED precisa falhar hoje pela ausência de idempotência/outbox no close, não
por fixture pré-fechado.

A crítica independente manteve a jornada ERP ampla em `REJECT`: continuam
abertos failpoints entre escritas, outbox de charge capture de inventário,
prova cross-domain e reconciliação observável. O benchmark oficial atualizado
em [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md)
registra Shepherd, ezyVet/Vet Radar, Covetrus Ascend, DaySmart Vet, Provet
Cloud, Digitail e Vetspire, com ressalvas de claims e certificações.

## Hardening verificado antes da publicação — C6-NEXT (23/08/2026)

O patch local resolve os findings do review: `closeReason` agora tem migration
e persistência real; `EncountersService` captura/restaura encounter + timeline
imediatamente em falha; o audit event é identificado antes da persistência; e
OpenAPI declara limites, campos extras proibidos e resposta `Encounter`.

Evidência fresca: close → receipt HTTP/PostgreSQL **5/5**, com SQL
`close_reason`, failpoint de constraint sem mutação fantasma, replay/conflict,
corrida `200/409`, receipt/journal e tenant B `404`.

O outbox `inventory.consumption.created` também foi adicionado ao comando
inpatient e catalogado no event-bus. O repositório CAS reutiliza
`getTenantTransactionContext()` quando o dispatcher já abriu UoW, mantendo
consumo, billing, audit e outbox no mesmo commit. A integração de charge
capture passou **3/3** e confirma três eventos de outbox. A primeira rodada
retornou `201/409` na corrida; o resultado foi mantido como evidência e a
assertiva só ficou verde após a correção transacional.

Antes do commit/push ainda executar revisão independente final, checker,
`git diff --check`, audit e reconciliação dos ledgers. O programa amplo segue
`IN_PROGRESS/PARTIAL`; failpoints/restart cross-domain, admission/handoff,
paginação, Redis, providers, SPA/B2c, paridade, WCAG, operações, cobertura,
deploy/restore e release continuam abertos.

### Ajuste final de boundary

O estado especulativo de scheduling também participa do rollback: a rota
captura/restaura queue entry e appointment vinculados e agenda hidratação da
conta. O consumo PostgreSQL agora exige contexto UoW canônico antes da
mutação; sem ele retorna `503 TRANSACTION_REQUIRED`, evitando outbox omitido
no caminho alternativo. A hidratação posterior continua best-effort e
assíncrona para convergência de dados externos, mas o snapshot local cobre a
mutação do comando que falhou.

## Publicação da continuação — 23/08/2026

O bounded C6-NEXT foi publicado no commit
`90873f1dfa0ad0e649a8813927d78c66249373b8` em
`origin/agent/sync-v4-full-program`. O `fetch` pós-push confirmou
`HEAD == origin/agent/sync-v4-full-program` nesse SHA. Este é o ponto de
entrada da próxima sessão: executar a jornada vertical
inventory → close → receipt com failpoints/restart e reconciliação.

O ERP completo não foi declarado pronto. Permanecem explicitamente
`IN_PROGRESS/PARTIAL` o failpoint do callback de status, hidratação assíncrona
cross-instance, admission/handoff, Redis/provider, SPA/B2c, paridade Vetus,
WCAG, cobertura, operações, deploy/restore e release. O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` foi preservado fora do
commit.

## Registro posterior de continuidade — 23/08/2026, 12:21 BRT

O handoff curto e canônico desta sessão está em
[`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md).
Ele consolida a crítica independente `REJECT` para a jornada ERP inteira,
os resultados frescos de readiness/paridade/RLS/OpenAPI e a próxima ação
vertical. Não interpretar os slices C6/C6-NEXT como prova de que o fluxo
admissão → recebimento já existe como uma transação/jornada única.

O próximo RED deve usar PostgreSQL descartável, dois tenants e role
`NOBYPASSRLS`, sem semear o billing/receipt final. Deve ligar admission,
handoff/stay, consumo com charge capture, diária, alta, close e receipt, com
replay, conflito de payload, corrida, failpoints, restart e consultas de
clínica/estoque/billing/caixa/journal/audit/outbox/idempotência. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do stage.

O handoff documental curto foi publicado em
`d355513e82fc0a51b7e4e39e2a93ed3d9daf154d`; o branch remoto foi revalidado
após o push e ficou alinhado ao `HEAD` local.

## Correção de bootstrap que precede o próximo RED

O bloqueio de segurança encontrado em `staging`/`stage` recebeu uma correção
fail-closed compartilhada em API e worker. Os quatro aliases production-like,
as flags de RLS/schema e o `NODE_ENV` do processo prevalecem sobre qualquer
opção menos restritiva. URL ausente, DB down, role/schema/repositórios/UoW
incompletos agora abortam antes de listen/loop. A evidência detalhada e os
limites estão em [`.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md`](../.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md).

Gates locais: API bootstrap 18/18, shared-config 40/40, worker 62 e API
package 331/331, com typechecks/builds, diff check e revisão independente PASS.
Isso não muda a conclusão deste handoff: a jornada completa permanece
`REJECT`, e o próximo RED continua admission → handoff/stay → inventory →
daily → discharge → close → receipt, com `NOBYPASSRLS`, dois tenants,
failpoints, restart e reconciliação.

Uma revisão de segurança posterior encontrou risco `HIGH/P0` de fallback
fail-open em `staging`/`stage` quando DB/schema estão ausentes, além de
assimetria no worker. Antes do RED vertical de inventory→receipt, a próxima
sessão deve provar startup fail-closed, bloqueio de rotas mutáveis e health /
readiness; WebAuthn process-local e auditoria com `account_id` nulo também
ficam registrados como riscos abertos.

Esse adendo foi publicado em `6caecfde57a8c50941de3eac5d76d66da04f827b` e
confirmado no branch remoto.

O código e a evidência do gate fail-closed foram publicados em
`620791e61a275af47974ad5dae4d5b5848b53406`; o `fetch` confirmou `HEAD ==
origin/agent/sync-v4-full-program`. O cache user-owned do design-system segue
fora do commit. A jornada clínica-financeira e todos os gates externos
continuam `IN_PROGRESS/PARTIAL`.

## Nova evidência — RED público da jornada admission → receipt (23/08/2026)

O teste vertical
`tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`
foi executado com PostgreSQL descartável, dois tenants, duas instâncias HTTP
e dados clínicos/estoque sem semear billing/receivable final. A jornada já
prova admission, handoff/ack, consumo com charge capture, diária faturada,
alta, close e a tentativa de recebimento, além de replay/conflito,
concorrência de mesma chave, rollback por constraint e tentativa de spoofing.

O RED inicial foi corrigido apenas no fixture: a abertura do billing agora usa
o endpoint HTTP público, as verificações comparam `entity_id`/payload como
text e o spoof usa bearer A contra encounter/patient B. A repetição passou
**4/4** e confirmou a jornada pública até cash receipt, ledger balanceado,
replay/conflito, corrida de billing, rollback de close sem resíduos e
isolamento A/B. O artefato é
[`.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md).

A aceitação global continua rejeitada: este GREEN não usa uma role runtime
clínica `NOBYPASSRLS` para todas as mutações, não cobre SIGKILL/restart entre
cada boundary, failpoints cross-domain completos, hidratação cross-instance,
`FORCE ROW LEVEL SECURITY` global, todos os campos clínicos ou todos os
domínios de reconciliação. Esses gates seguem necessários antes de promoção.

O harness de startup que antecede este RED está GREEN bounded em **6/6**, no
commit `25d7aa209fffeda7ce566d6a237f39b76d609be5`; isso não certifica o
comportamento clínico-financeiro sob uma role de runtime real
`NOBYPASSRLS`.

## Publicação do GREEN bounded

O teste vertical e a documentação foram publicados em
`d25151d96b1f7f0a17e3e08122d263507ec0353d` (`test: prove inpatient clinical
financial vertical`) e o `fetch` confirmou `HEAD ==
origin/agent/sync-v4-full-program`. O artefato 4/4 é
[`.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md).
O cache `packages/design-system/tsconfig.vue.tsbuildinfo` foi preservado fora
do commit; nenhum gate global foi promovido.

O ponteiro documental final desta sessão é `7d57225ce1936f174eae5c4012ea69accac94519`;
`HEAD` e `origin/agent/sync-v4-full-program` ficaram alinhados após o push.

## Gate seguinte executado — runtime role, restart e proteção contra pg_temp (17:28 BRT)

O RED vertical foi elevado para um login API real com
`NOSUPERUSER/NOBYPASSRLS`. A execução passou **5/5** e confirmou:

- `current_user` API, `rolsuper = false`, `rolbypassrls = false`;
- `EXECUTE` do helper de settlement apenas para API/worker, sem `PUBLIC`;
- fluxo único admission → handoff/stay → inventory → daily/billing-open →
  discharge → close → receipt;
- vínculos por registro e valores `2×50 → 80`, `180`, total `260`, pagamento,
  caixa e journal balanceados;
- replay, corrida, rollback, headers falsificados e isolamento A/B.

O teste de processo de restart controlado passou **1/1**: consumo confirmado,
rebootstrap, replay idempotente e conclusão sem duplicatas. A revisão
independente bloqueou temporariamente o gate por HIGH de `search_path`; o
teste de shadowing foi RED antes da migration `0120`, que agora fixa
`pg_catalog, public, app, pg_temp` com `pg_temp` no fim. Depois do hardening,
o mesmo caso passou GREEN.

Artefato: `.agent/artifacts/CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md`.
Commits: `ee126a6` e `67bfe2d`. Não promover ainda: faltam SIGKILL de processo
filho, failpoints admission/inventory/daily/discharge/close/receipt, worker
independente, equivalência Helm executada e todos os gates globais/exteriores.

O commit documental desta atualização é
`b8fc3eccbfff7ab30e44ee92b109c08cc60159e2`; o branch remoto foi revalidado e
permanece alinhado ao `HEAD`.
