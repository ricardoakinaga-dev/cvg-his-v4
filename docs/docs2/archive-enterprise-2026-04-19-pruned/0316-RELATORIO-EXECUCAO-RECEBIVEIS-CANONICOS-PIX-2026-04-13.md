# 0316 - Relatorio de Execucao: recebiveis canonicos e settlement PIX

Data: 2026-04-13  
Status: concluido

## Objetivo

Implementar o service/runtime canonico de recebiveis sobre:

- `encounter_financial_accounts`
- `encounter_receivables`
- `encounter_receivable_payments`

e integrar esse trilho ao settlement PIX, para que a confirmacao de pagamento atualize:

1. `billing`
2. `cash`
3. `receivables`

## Resultado executivo

O runtime da API agora possui um `EncounterFinancialService` proprio, com repositório in-memory e database, apoiado diretamente nas tabelas canonicas de recebiveis. O fluxo de PIX confirmado passou a registrar pagamento no trilho financeiro canônico, e a API ganhou endpoints reais para resumo financeiro do encounter, fechamento financeiro, listagem de recebiveis e liquidacao de recebivel.

## Arquitetura implementada

### 1. Service canonico

Novo service local da API:

- `apps/api/src/encounter-financial-service.ts`

Capacidades entregues:

- sincronizar billing -> conta financeira canônica
- garantir receivel default quando ainda nao houver parcelamento
- fechar conta financeira com parcelamento explicito
- liquidar recebivel individual
- registrar pagamento por `billingRecordId`
- listar recebiveis com enriquecimento por encounter/patient/owner

### 2. Persistencia canonica

Novo repositório database:

- `apps/api/src/repositories/database-encounter-financial.repository.ts`

Ele opera diretamente sobre:

- `encounter_financial_accounts`
- `encounter_receivables`
- `encounter_receivable_payments`

sem criar tabela paralela nem trilho financeiro alternativo.

### 3. Runtime/API

O runtime passou a expor `encounterFinancial` e a emitir `receivable.paid` via event bus quando um pagamento de recebivel e registrado.

Arquivos principais:

- `apps/api/src/runtime.ts`
- `apps/api/src/runtime-repositories.ts`
- `apps/api/src/bootstrap.ts`
- `apps/api/src/server.ts`

### 4. Integracao com PIX

Ao confirmar PIX por API ou webhook:

1. confirma provider
2. liquida `billing`
3. registra pagamento no trilho canonico de recebiveis
4. reconcilia em `cash` quando houver caixa aberto

Arquivo principal:

- `apps/api/src/routes/payments-routes.ts`

## Endpoints entregues

- `GET /encounters/:encounterId/financial-summary`
- `POST /encounters/:encounterId/financial-close`
- `GET /financial/receivables`
- `POST /financial/receivables/:receivableId/settle`

Documentados em:

- `apps/api/src/openapi.yaml`

## Arquivos alterados

- `apps/api/src/encounter-financial-service.ts`
- `apps/api/src/repositories/database-encounter-financial.repository.ts`
- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/runtime-repositories.ts`
- `apps/api/src/bootstrap.ts`
- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/api/src/metrics.ts`
- `apps/api/package.json`
- `packages/modules/billing/src/index.ts`

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-billing typecheck` -> PASS
- `pnpm --filter @cvg-his-v2/module-billing build` -> PASS
- `pnpm --filter @cvg-his-v2/module-billing test` -> PASS (`5/5`)
- `pnpm --filter @cvg-his-v2/api typecheck` -> PASS
- `pnpm --filter @cvg-his-v2/api build` -> PASS
- `pnpm --filter @cvg-his-v2/api test` -> PASS (`56/56`)

## Riscos remanescentes

1. O trilho de recebiveis foi implementado no runtime da API, mas ainda nao existe package de dominio dedicado para finanças/recebiveis.
2. O `snapshot_json` da conta financeira ainda e operacional, nao um snapshot fiscal/contabil rico.
3. O settlement PIX ja atualiza recebiveis, mas ainda nao ha dashboard administrativo dedicado para conciliacao cruzada `billing` x `receivables` x `cash`.

## Proximos passos recomendados

1. Extrair o dominio financeiro canônico para package proprio, reduzindo logica financeira dentro da API.
2. Adicionar consulta administrativa de conciliacao cruzada por `billingRecordId`, `encounterId` e `providerTransactionId`.
3. Produzir eventos de dominio adicionais para `financial.account.closed` e `financial.receivable.settled`.
4. Integrar o trilho de recebiveis a fechamento de caixa, relatórios financeiros e exportação contábil.
