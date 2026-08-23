# Quality Bar — internação → diária → item de billing idempotente

Data: 23/08/2026
Tarefa de continuidade: `CVG-002` / fatia clínica-financeira não-PIX
Escopo: boundary local, reversível e tenant-scoped entre uma diária de
internação e o item financeiro correspondente. Não é a jornada completa de
internação nem certificação do ERP.

## Contrato

Uma diária pendente representa uma única cobrança lógica. A primeira chamada
cria o item com `sourceEntityType=inpatient_daily_charge` e
`sourceEntityId=<daily-charge-id>`. Replays byte-equivalentes devolvem o mesmo
item e não alteram a contagem financeira. Payload divergente para a mesma
fonte termina em conflito. Duas instâncias concorrentes convergem por
lookup/replay e pelo índice único parcial PostgreSQL. Se o billing record ainda
não existe, a corrida de criação também converge pelo índice único de
`(account_id, encounter_id)` e o runtime recarrega o vencedor antes de inserir
o item.

## Implementação

- `packages/modules/inpatient/src/index.ts`: `markDailyChargeBilled` é replay
  seguro; uma diária `billed` retorna o vínculo existente e rejeita vínculo
  divergente.
- `apps/api/src/routes/inpatient-routes.ts`: o endpoint de billing retorna
  `200` no replay idempotente e `409` para billing record divergente.
- `packages/modules/billing/src/index.ts`: valida a proveniência, procura
  fonte existente, trata o vencedor de `23505` e recupera o billing record
  criado por outra instância antes de continuar.
- `packages/modules/billing/src/repositories/database-billing.repository.ts`:
  lookup tenant-scoped por fonte.
- `packages/db/migrations/0115_inpatient_daily_charge_billing_idempotency.sql`
  e `packages/db/src/schema/billing_items.ts`: allowlist da fonte e índice
  único parcial `(account_id, source_entity_type, source_entity_id)`.
- `apps/api/src/openapi.yaml`: contrato público de `sourceEntityType` e
  `sourceEntityId`.

## Evidência executada

- RED de rota antes da implementação; depois `inpatient-routes.test.ts` isolado
  passou `10/10`.
- `pnpm --filter @cvg-his-v2/module-inpatient test`: `17/17`.
- `pnpm --filter @cvg-his-v2/module-billing test`: `16/16`.
- `pnpm vitest run tests/integration/database/inpatient-daily-charge-billing-idempotency.test.ts --config vitest.integration.config.ts --pool=forks --poolOptions.forks.singleFork=true`: `2/2`, incluindo corrida de duas instâncias sem `billing_records` pré-existente.
- Builds `@cvg-his-v2/module-inpatient`, `@cvg-his-v2/module-billing`, `@cvg-his-v2/api` e `@cvg-his/db`: PASS.
- Suíte API após atualizar o mock do rate-limit obrigatório: `324/324`.
- `git diff --check`: deve ser executado antes da publicação.

## Limites

Este artefato não prova admissão completa, handoff/permanência, cutoff de
alta, fechamento clínico, estoque, ledger, recebimento, UI/SPA, paridade Vetus,
WCAG, carga/performance, restore/failover ou produção. O índice partial exige
que dados históricos inválidos/duplicados sejam reconciliados antes de uma
migration equivalente em ambiente não descartável; nenhuma limpeza de dados
externos foi autorizada nesta sessão.

## Próxima ação

Preservar esta fronteira idempotente e decompor a jornada completa
`admissão → handoff/permanência → diária → alta → item/recebimento` com REDs
PostgreSQL/RLS e estados de UI. Em paralelo, manter aberto o gate operacional
PIX de Redis failover/clock-skew e os gates separados de B2c/SPA, provider,
paridade, WCAG, operações alvo e release.
