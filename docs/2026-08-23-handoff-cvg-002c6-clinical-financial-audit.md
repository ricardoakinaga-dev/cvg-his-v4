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
