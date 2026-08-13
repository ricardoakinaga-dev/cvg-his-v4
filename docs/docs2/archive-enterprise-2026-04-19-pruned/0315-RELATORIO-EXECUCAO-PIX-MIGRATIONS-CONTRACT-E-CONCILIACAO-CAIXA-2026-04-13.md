# 0315 - Relatorio de Execucao: PIX, migrations canonicas e conciliacao explicita em caixa

Data: 2026-04-13  
Status: concluido  
Fonte de verdade: `docs/Enterprise/*` + estado atual validado no repositorio

## Objetivo

Executar o proximo passo logico apos a consolidacao de `pix_transactions` no schema canonico:

1. aplicar a migration no banco de teste;
2. validar o contrato de deploy/migrations;
3. avancar a reconciliacao financeira do PIX para alem de `billing.settleByRecordId()`;
4. explicitar isso em runtime, testes e OpenAPI.

## Resultado executivo

O fluxo de PIX agora fecha tres camadas:

- liquidacao de billing;
- conciliacao explicita em caixa quando existe caixa aberto;
- persistencia auditavel do resultado financeiro em `pix_transactions`.

Tambem foi promovido o teste automatizado de contrato de migrations para a esteira padrao do `vitest`, cobrindo:

- ordem migrate-before-start no cutover;
- ordem migrate-before-seed no bootstrap de testes;
- correspondencia entre `packages/db/migrations/*.sql` e `drizzle_migrations`.

## Arquitetura implementada

### 1. Conciliacao financeira explicita em caixa

Ao confirmar um PIX por API ou por webhook:

1. o pagamento e confirmado no provider/gateway;
2. o billing e liquidado quando houver `billingRecordId`;
3. a API tenta reconciliar em caixa usando `CashService.findOpenRegister(accountId)`;
4. se houver caixa aberto, registra `payment` em `cash_movements`;
5. o resultado e persistido em `pix_transactions`.

Estados persistidos para conciliacao de caixa:

- `pending`
- `applied`
- `skipped_no_open_register`
- `failed`

Metadados persistidos:

- `cash_reconciled_at`
- `cash_reconciliation_error`
- `cash_register_id`
- `cash_movement_id`

### 2. Movimentos sistemicos em caixa

`CashService.recordPaymentMovement()` passou a aceitar `createdByUserId: UserId | null`, permitindo conciliacao originada por webhook sem inventar usuario operacional falso.

### 3. Contrato de migrations promovido a teste executavel

`tests/integration/deploy-migrations-contract.test.ts` entrou no `vitest.config.ts`, deixando de ser um artefato fora da esteira.

## Arquivos alterados

### Runtime / API

- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/payment-gateway.ts`
- `apps/api/src/pix-transaction-repository.ts`
- `apps/api/src/server.ts`
- `apps/api/src/openapi.yaml`
- `apps/api/src/payment-gateway.test.ts`
- `apps/api/src/server.test.ts`

### Cash

- `packages/modules/cash/src/index.ts`
- `packages/modules/cash/src/cash.test.ts`

### Banco / migrations

- `packages/db/src/schema/pix_transactions.ts`
- `packages/db/migrations/0013_pix_transactions.sql`
- `packages/db/migrations/0014_pix_transactions_cash_reconciliation.sql`
- `packages/shared/database/src/migrations/020_create_pix_transactions.sql`
- `packages/shared/database/src/migrations/021_add_pix_cash_reconciliation.sql`

### Test runner

- `vitest.config.ts`

## Validacoes executadas

### Banco de teste e migrations

- `pnpm test:db:start` -> PASS
- `DATABASE_URL="<test-database-url>" node infra/scripts/prepare-test-db.mjs` -> PASS
  - migrations aplicadas ate `0014_pix_transactions_cash_reconciliation`
- `pnpm exec vitest run tests/integration/deploy-migrations-contract.test.ts --config vitest.config.ts` -> PASS
  - `3/3` testes passando

### Packages tocados

- `pnpm --filter @cvg-his/db build` -> PASS
- `pnpm --filter @cvg-his/db test` -> PASS (`6/6`)
- `pnpm --filter @cvg-his-v2/module-cash build` -> PASS
- `pnpm --filter @cvg-his-v2/module-cash test` -> PASS (`15/15`)

### API

- `pnpm --filter @cvg-his-v2/api typecheck` -> PASS
- `pnpm --filter @cvg-his-v2/api build` -> PASS
- `pnpm --filter @cvg-his-v2/api test` -> PASS (`55/55`)

## Limites e riscos remanescentes

1. A aplicacao da migration foi validada no banco de teste local; nao houve execucao remota em staging neste ciclo porque esse ambiente nao esta exposto pelo workspace.
2. A reconciliacao financeira ficou explicita em caixa, mas o trilho canônico de `encounter_receivables` / `encounter_receivable_payments` ainda nao tem service/runtime ativo na API.
3. O settlement financeiro continua centrado em `billing` + `cash`; a reconciliacao contabil/recebiveis ainda e o proximo degrau.

## Proximos passos recomendados

1. Implementar service/runtime para `encounter_financial_accounts`, `encounter_receivables` e `encounter_receivable_payments`.
2. Fazer o PIX confirmado atualizar recebiveis de forma canonica, e nao apenas billing + caixa.
3. Expor consulta administrativa de conciliacao PIX com filtros por `billingSettlementStatus` e `cashReconciliationStatus`.
4. Validar o mesmo trilho de migration no ambiente de staging real quando o acesso estiver disponivel.

## Melhorias recomendadas

- Adicionar idempotencia explicita para conciliacao financeira em nivel de `cash_movement_id`.
- Criar evento de dominio separado para `payment.pix.cash_reconciled`.
- Acrescentar dashboard operacional para `skipped_no_open_register` e `failed`.
