# Handoff da sessão atual — CVG-HIS v4

**Data:** 23 de agosto de 2026, 12:21 BRT
**Objetivo:** preservar o estado reproduzível para continuar em outra sessão.
**Conclusão:** documentação reconciliada; o ERP continua `IN_PROGRESS/PARTIAL`.

## Retomada imediata

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

O branch local e o remoto estavam alinhados em `6ae674d8ab0a11ffa6a2674cb0e175175833d4bd` durante esta reconciliação. O único caminho fora do commit é o cache gerado e user-owned:
`packages/design-system/tsconfig.vue.tsbuildinfo`. Ele deve permanecer fora de stage, commit, limpeza ou reversão.

## Estado canônico

- Tarefa ativa: `CVG-002C6` — jornada clínica-financeira inpatient.
- Estado: `BUILD / VERIFY`, `IN_PROGRESS / PARTIAL`; próximo gate: `VERIFIED`.
- Quality Bar: congelado, sem promoção global.
- Fonte operacional: [`state.json`](../.agent/state.json), [`backlog.json`](../.agent/backlog.json), [`premium-enterprise-mvp.md`](../.agent/plans/premium-enterprise-mvp.md) e [`state.md`](../.gauntlet/state.md).
- Precedência documental: comportamento executado/testes e estado persistido → código/contratos → camada ativa de agosto → arquitetura/ADRs → auditorias antigas → Vetus → `docs2/`. A regra está em [`README.md`](README.md).

## O que já foi feito e possui evidência limitada

As fatias abaixo estão publicadas e não devem ser refeitas sem uma regressão nova:

- PIX/B1/B2a/B2b: ingestão, worker, fencing, restart/SIGKILL bounded, DLQ operacional, principal mínimo e rate-limit fail-closed.
- `CVG-002C`: diária inpatient idempotente, cobrança e rollback entre billing e diária.
- `CVG-002C2/C3/C4/C5`: recibo de caixa HTTP/UoW, cobrança diária HTTP, isolamento A/B, auditoria após rollback e alta que fecha a stay.
- `CVG-002C6`: preço assistencial separado do custo, consumo inpatient com `billing_item` de origem `inventory_consumption`, replay/concurrency, trigger de integridade stay/encounter/pós-alta e `inventory.consumption.created` no outbox ativo.
- C6-NEXT close→receipt: `closeReason` persistido pela migration `0119`, lock/idempotência/auditoria/outbox do close, rollback de encounter/timeline/scheduling/cache e recibo com journal balanceado.

Evidência focal recente, sempre limitada ao escopo do teste:

| Verificação | Resultado |
| --- | ---: |
| Close → receipt HTTP/PostgreSQL | 5/5 |
| Inventory charge capture HTTP/PostgreSQL | 3/3 |
| Event catalog / contratos | 1/1 e 43/43 |
| RLS estrutural | 153/154 tabelas protegidas; 1 exceção documentada |
| OpenAPI estrutural | 337 paths, 40 tags, 390 schemas |
| Checker canônico | 11 PASS, 1 WARN histórico de ownership, 0 FAIL |
| `git diff --check` | PASS |

Esses números não significam paridade, produção, certificação fiscal ou release.

## Auditoria independente desta retomada

A decisão foi `REJECT` para a jornada ERP completa. Ainda não existe um único teste público HTTP/PostgreSQL que execute e prove, no mesmo episódio:

`admissão → handoff/permanência → consumo de estoque → diária → alta → billing → recebimento → caixa/ledger → auditoria/outbox`.

O teste de inventário e o teste close→receipt continuam provas separadas. A revisão também registrou:

- a prova de RLS do slice ainda precisa usar uma role sem `BYPASSRLS`, não somente o usuário de testes administrativo;
- replay/concurrency existem nas fatias, mas falta conflito de payload e convergência da jornada inteira;
- faltam failpoints depois de cada escrita, restart cross-domain e reconciliação observável;
- o walkthrough da SPA chega à comanda, mas ainda encontra cobrança não persistida no fluxo clínico; configurações administrativas e alguns relatórios continuam placeholders/estados parciais;
- Redis failover/clock-skew real, provedores, paridade Vetus, WCAG, target operations, cobertura, deploy/restore e release continuam gates separados.

Os relatórios completos e a matriz de mercado permanecem em [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) e [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md). Claims de fornecedores não são evidência do CVG-HIS.

### Bloqueio de segurança encontrado na auditoria final

Uma revisão de segurança read-only, confirmada por uma segunda revisão
independente, encontrou um risco `HIGH/P0` que deve preceder a próxima fatia
clínica: com `NODE_ENV=staging`/`stage`, banco indisponível ou schema
incompleto pode haver fallback para repositórios em memória (ou modo misto)
enquanto o servidor continua aceitando rotas mutáveis. O worker possui
assimetria semelhante e pode entrar no loop sem UoW durável. Isso remove as
garantias de durabilidade, RLS, idempotência, auditoria e consistência entre
réplicas; `/ready` em 503 não desfaz o fato de o processo já estar escutando.

Também ficaram registrados como riscos separados WebAuthn process-local e a
política de auditoria com possíveis `account_id` nulos. A retomada deve
primeiro escrever REDs de startup fail-closed para `production`, `staging` e
`stage`, schema/role ausentes e health/readiness; só depois retomar o RED
vertical clínico-financeiro. Nenhuma credencial, provedor ou ambiente de
produção foi acessado nesta auditoria.

## Próxima ação obrigatória

1. Escrever REDs de startup fail-closed para `staging`/`stage` com DB indisponível, schema incompleto, role insegura e modo misto; bloquear rotas mutáveis e separar `/health` de `/ready` corretamente.
2. Criar o RED novo da jornada vertical completa, preferencialmente em `tests/integration/database/inpatient-inventory-close-receipt-vertical-http-postgres.test.ts`, sem semear billing/receipt final.
3. Exercitar admission/handoff/stay, consumo com charge capture, diária, alta, close e cash receipt usando HTTP real, PostgreSQL descartável, dois tenants e uma role `NOBYPASSRLS`.
4. Cobrir replay da mesma chave, payload divergente, corrida de chaves distintas, reinício e failpoints após cada escrita; consultar clínica, estoque, billing, caixa, journal, audit, outbox e idempotência.
5. Só promover os slices se o RED/GREEN deixar ausência de órfãos, duplicatas, fallback inseguro e vazamentos demonstrada; depois executar a mesma jornada pela SPA real.

Não reabrir PIX/DLQ, diária, alta ou close bounded sem um defeito/regressão nova. Não usar fallback em memória como evidência de durabilidade e não marcar `CVG-002C6`, `CVG-002` ou o ERP como concluídos.

## Arquivos de continuidade

- [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md)
- [`2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md`](2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md)
- [`../.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md`](../.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md)
- [`../.agent/state.json`](../.agent/state.json)
- [`../.agent/backlog.json`](../.agent/backlog.json)
- [`../.gauntlet/state.md`](../.gauntlet/state.md)

Esta página é um handoff de continuidade, não uma declaração de prontidão operacional.

## Publicação

Este handoff e a reconciliação documental foram publicados em
`d355513e82fc0a51b7e4e39e2a93ed3d9daf154d`
(`docs: save current session handoff`) no branch
`origin/agent/sync-v4-full-program`. O `fetch` posterior confirmou
`HEAD == origin`; somente o cache user-owned do design-system permanece fora
do commit.

O adendo de segurança e a reconciliação final desta sessão foram publicados em
`6caecfde57a8c50941de3eac5d76d66da04f827b` (`docs: record staging fail-closed
security gap`), também alinhado ao remoto após `git fetch`.

## Implementação local posterior — startup fail-closed (23/08/2026)

O finding `HIGH/P0` foi tratado em uma fatia local e independente antes de
retomar o RED clínico. O classificador production-like agora é compartilhado
por config/API/worker e reconhece `production`, `prod`, `staging` e `stage`.
Além disso, a política é monotônica: `NODE_ENV` do processo, ambiente explícito
do bootstrap e as flags `DATABASE_REQUIRE_RLS_ROLE`/
`DATABASE_REQUIRE_SCHEMA` só podem elevar a exigência, nunca rebaixá-la por
`environment: 'development'`.

API e worker recusam URL ausente, PostgreSQL indisponível, role insegura,
schema de garantias incompleto e qualquer erro que produziria repositório
`Map`, modo misto ou worker sem UoW. A API lança antes de chegar ao `listen`; o
worker lança antes do loop. RED/GREEN, arquivos, limites e próximos gates estão
em [`.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md`](../.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md).

Evidência executada:

- API bootstrap: **18/18**;
- shared-config: **40/40**;
- worker: **62 testes**, cinco suites, todos PASS;
- API package: **331/331**;
- typecheck/build e `git diff --check`: PASS;
- revisão independente posterior: **PASS** para o escopo fail-closed, sem
  bypass restante; schema/role via doubles e harness process-level são
  recomendações não bloqueantes deste patch.

O ERP, `CVG-001`, `CVG-002C6` e a Quality Bar continuam
`IN_PROGRESS/PARTIAL`. Ainda não há certificação de PostgreSQL alvo com schema
parcial/role `NOBYPASSRLS`, nem jornada clínica-financeira única, failpoints,
restart/reconciliação, SPA, Redis, providers, paridade, WCAG, coverage,
operações, deploy/restore ou release. O próximo gate segue sendo o RED vertical
admissão → handoff/stay → inventário → diária → alta → close → receipt.

## Publicação do gate fail-closed

O commit `620791e61a275af47974ad5dae4d5b5848b53406` (`fix: fail closed in
production-like bootstrap`) foi enviado para
`origin/agent/sync-v4-full-program`. O `fetch` posterior confirmou igualdade
entre `HEAD` e o remoto. O único caminho local fora do commit continua sendo
`packages/design-system/tsconfig.vue.tsbuildinfo`, preservado fora do stage.

## Checkpoint mais recente — harness real de bootstrap (23/08/2026, 16:35 BRT)

O gate de defesa de inicialização foi ampliado e publicado em
`25d7aa209fffeda7ce566d6a237f39b76d609be5` (`test: prove production-like
bootstrap boundaries`). O teste usa PostgreSQL descartável real, roles de
login restritas com `NOSUPERUSER`/`NOBYPASSRLS`, uma role superuser insegura,
schema com `public.inbox_events` renomeada e subprocessos dos entrypoints
reais da API e do worker sob `NODE_ENV=staging`.

Evidência fresca: `production-like-runtime-bootstrap.test.ts` passou **6/6**.
O API e o worker rejeitam role insegura e schema de delivery incompleto; com
PostgreSQL recusado, nenhum entrypoint emite `listening`, abre health listener
ou entra no loop de worker. O artefato reproduzível é
[`.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md`](../.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md).

Este resultado é GREEN apenas no limite de startup. Não certifica ACL/RLS
global, `FORCE ROW LEVEL SECURITY` em todas as tabelas, falha fatal pós-start,
durabilidade de instalação/sessão nem deploy alvo.

## RED vertical retomado — admissão até recebimento

O novo teste
[`inpatient-clinical-financial-vertical-http-postgres.test.ts`](../tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts)
foi executado contra PostgreSQL descartável com dois tenants, duas instâncias
HTTP, replay/conflito de idempotência, corrida de diária, failpoint de close e
spoofing de headers. Após a revisão independente, o fixture abriu o billing
via `PATCH /billing/:encounterId/status` público, corrigiu casts `::text` e
usou bearer A contra recurso B. O resultado corrigido passou **4/4** e cobre
admissão → handoff/ack → consumo de estoque → diária/billing → billing-open →
alta → close → receipt, além de ledger/reconciliation e isolamento A/B.

O artefato reproduzível é
[`.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md).
Este é GREEN bounded de HTTP/PostgreSQL; não certifica todas as mutações sob
role clínica `NOBYPASSRLS`, SIGKILL/restart entre boundaries, failpoints
cross-domain completos, `FORCE ROW LEVEL SECURITY` global, hidratação
cross-instance ou qualquer gate externo. A jornada/Quality Bar continua
`IN_PROGRESS/PARTIAL`.

Próxima ação exata: obter a revisão independente final do 4/4 e então elevar
o mesmo fluxo para role runtime `NOBYPASSRLS`, failpoints/restart e
reconciliação completa antes de qualquer promoção.

## Publicação do checkpoint vertical

O teste, artefato e atualização documental foram publicados no commit
`d25151d96b1f7f0a17e3e08122d263507ec0353d` (`test: prove inpatient clinical
financial vertical`) em `origin/agent/sync-v4-full-program`. O `fetch` posterior
confirmou `HEAD == origin`. O único dirty path continua sendo o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`, mantido fora do
stage.

## Handoff adicional — worker event consumers PostgreSQL (23/08/2026, 17:21 BRT)

O RED de eventos reais do worker foi fechado bounded. O teste
[`worker-event-consumers-postgres.test.ts`](../tests/integration/database/worker-event-consumers-postgres.test.ts)
passou **3/3** com role `LOGIN NOSUPERUSER NOBYPASSRLS`, dois accounts e
PostgreSQL descartável. A prova cobre payment → billing → webhook, três inbox
por evento, outbox concluído, settlement financeiro, delivery pendente,
replay/concurrency em dois buses, rollback pós-mutação, captura desconhecida
falhando fechado e isolamento A/B. A role foi observada com
`rolsuper=false`/`rolbypassrls=false`.

O defeito encontrado foi concreto: IDs `efa_*`, `er_*` e `erp_*` eram gerados
para colunas UUID e abortavam o settlement. `EncounterFinancialService` agora
usa `randomUUID()` para esses registros. O alias de Vitest também foi ampliado
para os quatro pacotes de worker, garantindo execução do `src` atual.

Artefato: [`CVG-002C6-worker-event-postgres-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-event-postgres-2026-08-23.md).
O resultado é somente `GREEN bounded`; não muda a rejeição da jornada ERP
completa. Continuam abertos child-process com fixture de domínio/SIGKILL,
unicidade global do cartão, retry/DLQ HTTP de webhook, failpoints completos,
Helm aplicado, RLS/FORCE RLS global, hidratação cross-instance, WebAuthn,
auditoria, providers/Redis, SPA/paridade/WCAG, cobertura, operações,
deploy/restore e release. A próxima sessão deve começar pela decisão de chave
do cartão e pela matriz de retry/failpoint.

O ponteiro final desta documentação é `720876ec1f5ce30275b1160df7ef5f35c6fb1b0e`
(`docs: publish worker runtime checkpoint`); o commit de implementação
continua sendo `adde66b7a1b33333126f4832b3c728abb2db8500`.

O ponteiro documental mais recente desta sessão é o commit
`7d57225ce1936f174eae5c4012ea69accac94519` (`docs: publish vertical
checkpoint`); após o push, `HEAD == origin/agent/sync-v4-full-program`.

## Atualização mais recente — role runtime, restart e shadowing (23/08/2026, 17:28 BRT)

O próximo gate foi executado contra PostgreSQL descartável com login API real
`NOSUPERUSER/NOBYPASSRLS`, sem `rolsuper` e sem `rolbypassrls`. A reconciliação
agora concede `EXECUTE` da função auxiliar de consistência do recebimento apenas
aos papéis API/worker; `PUBLIC` permanece sem esse privilégio. A vertical HTTP
passou **5/5**, pois também rejeitou uma tentativa de settlement falso com
`SET LOCAL search_path = pg_temp, public, app` e tabelas temporárias sombra.

O RED de segurança foi real: antes da migration `0120`, a função invoker
aceitava a sombra em `pg_temp`. A migration fixa a resolução em
`pg_catalog, public, app, pg_temp`, com `pg_temp` explicitamente no fim. O teste
separado de restart controlado passou **1/1**: consumo confirmado, parada e
rebootstrap, replay idempotente com resposta igual e conclusão única até
receipt/payment/cash/journal. A reconciliação por registro valida os vínculos e
valores `2×50 → 80`, `180`, total `260` e débito/crédito balanceados.

Artefato reproduzível:
[`CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md`](../.agent/artifacts/CVG-002C6-runtime-role-restart-reconciliation-2026-08-23.md).
Commits de implementação: `ee126a6` (hardening ACL/search_path) e `67bfe2d`
(vertical restrita/restart). O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` continua fora do stage.

O gate continua bounded e não promove produção. Restam SIGKILL em processo
filho, matriz completa de failpoints em cada boundary, execução independente do
worker, equivalência aplicada de Helm, RLS/FORCE RLS global, hidratação
cross-instance, Redis/providers/SPA/paridade/WCAG/cobertura/operações/deploy/
restore/release e demais gates externos.

## Ponteiro remoto desta documentação

O checkpoint foi publicado em `b8fc3eccbfff7ab30e44ee92b109c08cc60159e2`
(`docs: save restricted clinical financial checkpoint`) no branch
`origin/agent/sync-v4-full-program`; `git fetch` confirmou `HEAD == origin`.

## Checkpoint atual — worker real, ACL e SIGKILL (23/08/2026, 17:46 BRT)

O próximo gate de `CVG-002C6` foi executado com o entrypoint real
`apps/worker/src/index.ts` em processo filho, banco PostgreSQL efêmero e role
LOGIN `NOSUPERUSER/NOBYPASSRLS`. O teste
[`worker-runtime-entrypoint.test.ts`](../tests/integration/process/worker-runtime-entrypoint.test.ts)
passou **1/1**: `/live` abriu, `/metrics` confirmou ticks reais, o processo foi
encerrado por `SIGKILL`, reiniciou na mesma porta e terminou por `SIGTERM` com
`code=0`. A saída não apresentou crash nem violação de ACL.

O RED foi preservado no artefato
[`CVG-002C6-worker-runtime-acl-sigkill-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-runtime-acl-sigkill-2026-08-23.md): a role falhava com
`forbiddenTablePrivileges=6`; uma correção parcial deixou dois privilégios e a
correção final passou a revogar todo DML/truncate de tabelas de instalação e
governança do worker. O catálogo é aplicado no reconciler, no init script e no
template Helm; a suíte de contrato passou **11/11**.

Limite obrigatório: `health` continua degradado porque o entrypoint ainda não
registra os consumidores de produção `payments`, `billing` e `webhooks`. Isso
não é readiness GREEN e não foi mascarado com consumidores no-op. A próxima
sessão deve compor handlers reais (ou aprovar um manifesto explícito do worker)
e repetir a prova de readiness/processamento, além da matriz completa de
failpoints e da equivalência Helm aplicada.

Validações adicionais deste checkpoint: `packages/db` typecheck, Prettier,
syntax check do init script e `git diff --check` passaram. O estado do programa
permanece `BUILD/VERIFY`, `IN_PROGRESS/PARTIAL`; o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` foi mantido fora do stage.

A revisão independente posterior aprovou este gate como **APPROVE bounded**, sem
Critical/High: a consulta positiva de privilégios é executada antes e depois
do restart, e `/ready` observa o `503` degradado real. O residual Medium é
deliberado e está registrado no artefato: ainda não há consumidores/eventos de
domínio reais processados pelo worker.

## Ponteiro remoto desta retomada

O checkpoint, o teste, o artefato e os ledgers foram publicados no commit
`adde66b7a1b33333126f4832b3c728abb2db8500`
([`fix: harden worker runtime role boundary`](https://github.com/ricardoakinaga-dev/cvg-his-v4/commit/adde66b7a1b33333126f4832b3c728abb2db8500))
no branch `origin/agent/sync-v4-full-program`. `git fetch` confirmou
`HEAD == origin/agent/sync-v4-full-program`. O único caminho dirty continua
sendo o `packages/design-system/tsconfig.vue.tsbuildinfo` user-owned, fora do
stage.

## Handoff adicional — eventos reais do worker em PostgreSQL (23/08/2026, 17:26 BRT)

Última fatia executada: o teste
[`worker-event-consumers-postgres.test.ts`](../tests/integration/database/worker-event-consumers-postgres.test.ts)
passou **3/3** em PostgreSQL descartável, com duas contas e worker
`LOGIN NOSUPERUSER NOBYPASSRLS`. A prova cobre composição `payments → billing →
webhooks`, claim/inbox/outbox, settlement financeiro, delivery pendente,
replay concorrente em dois buses, rollback depois de mutação, desconhecido
fail-closed e isolamento A/B. Financial ficou **15/15** e event-bus **23/23**;
builds, audit, Prettier e diff check também passaram.

O RED e a causa estão no artefato
[`CVG-002C6-worker-event-postgres-2026-08-23.md`](../.agent/artifacts/CVG-002C6-worker-event-postgres-2026-08-23.md): IDs `efa_*`, `er_*` e
`erp_*` eram usados em colunas UUID, e o erro útil era mascarado por uma
segunda operação em UoW abortada. A correção usa `randomUUID()` para esses IDs
persistidos, preserva a causa original e adiciona aliases Vitest para executar
o source dos módulos do worker.

Estado: **GREEN bounded**, não pronto para produção. Próximo gate obrigatório:
fixture de domínio no child process/SIGKILL, failpoints completos, decisão de
identidade/collision de `card_transactions`, retry/DLQ HTTP de webhook e
hidratação cross-instance. RLS/FORCE RLS global, WebAuthn, auditoria,
Redis/providers, SPA, paridade Vetus, WCAG, coverage, operations,
deploy/restore e release continuam `IN_PROGRESS/PARTIAL`. SHAs exatos serão
preenchidos após o push; preserve o tsbuildinfo user-owned fora do stage.

## Handoff — chave composta do cartão e revisão independente (23/08/2026, 17:38 BRT)

A revisão encontrou risco alto na PK global de `card_transactions.transaction_id`:
`ON CONFLICT DO NOTHING` poderia descartar o mesmo intent em outro account. A
correção foi implementada com a migration `0122_card_transactions_tenant_key.sql`,
schema Drizzle, repositório SQL e repositório em memória usando
`(account_id, transaction_id)`. A fixture agora usa o mesmo intent em A/B,
confirma duas linhas e comprova leitura RLS por account.

O teste PostgreSQL continua **3/3**, com settlement financeiro completo
(`paid`, `125.00`, `0.00`), receivable `settled` e referência `other`. Os
handlers/gateways passaram **17/17** via `tsx --test`; financial/event-bus
passaram **15/15** e **23/23**; builds, audit e diff check estão verdes.

Residuais explícitos para a próxima sessão: child process/SIGKILL com fixture
de domínio e takeover, PIX PostgreSQL/RLS, retry/DLQ HTTP e fencing de lease,
isolamento restrito de billing/financial/webhook, todos os failpoints e
retornos UUID de `syncEncounter`/`closeEncounterFinancial`. O estado permanece
`GREEN bounded` e `IN_PROGRESS/PARTIAL`; não promover ERP, readiness ou
produção. A implementação final foi publicada em `67d47e2` (`test: stabilize
tenant card collision assertions`), sobre `ab08865233c4091edcb83cb7319c78b9f406645e`
(`fix: harden worker event persistence`). O SHA documental é
`16797efada1747fc2a6046d4dd7842dc6e7eea42` (`docs: publish worker event
continuity`), seguido da reconciliação final
`8c21e246136cd32991b6927171fe67c76d41a27a`; `git fetch` confirmou
`HEAD == origin/agent/sync-v4-full-program`.

Ledgers/control-plane atuais: `execution-log.jsonl` **202** linhas e
`verification.jsonl` **137** linhas parseiam, assim como `state.json` e
`backlog.json`. `.agent/check_state.py` não está presente no workspace atual;
nenhum resultado canônico de checker foi inventado.

## Registro de continuidade mais recente — full critical pós-fix (registrado às 20:38 BRT)

O comando integral pós-correção foi executado com banco PostgreSQL descartável,
`--no-cache`, `--no-file-parallelism`, `--hookTimeout=120000` e
`--teardownTimeout=120000`. Resultado: **386/387 testes**, **27/28 arquivos**,
`exit 1`, em **646,58 s**; migrations `0000`–`0123` aplicadas, 172 tabelas,
43 enums, 456 FKs e teardown concluído.

A única falha ficou em
`tests/integration/database/pix-service-principals.test.ts`, no backfill de
usuários/principals, por `users_account_id_accounts_id_fk` ao aplicar a
migration de service principals. PIX isolado segue **5/5** e provider → PIX
**11/11**. O diagnóstico atual é divergência de isolamento/fixture no contexto
integral; não apagar órfãos, remover FK ou flexibilizar a migration. O artefato
comando/resultado é
[`CVG-002C6-critical-retest-postfix-2026-08-23.md`](../.agent/artifacts/CVG-002C6-critical-retest-postfix-2026-08-23.md).

Retomada executável:

1. Reproduzir a menor sequência de suites anterior ao PIX que deixa usuário
   sem account, começando pelos testes que fazem `TRUNCATE accounts CASCADE` ou
   alteram schema.
2. Corrigir a causa de isolamento no produtor do órfão e preservar o backfill
   como prova real de defaults/FK.
3. Reexecutar PIX/provider e o full critical serial; então obter crítica
   independente pós-fix antes de qualquer promoção.

O estado permanece `BUILD/VERIFY`, `IN_PROGRESS/PARTIAL`; o cache
`packages/design-system/tsconfig.vue.tsbuildinfo` é user-owned e fica fora do
stage.

## Publicação mais recente

O registro de continuidade e o artefato do full critical pós-fix foram
publicados em `54ce516` (`docs: record post-fix critical retest`) no branch
`origin/agent/sync-v4-full-program`. A reconciliação final do estado apontará
para esse SHA; a próxima sessão deve começar pela reprodução mínima da falha
PIX, não por uma promoção de gate.
