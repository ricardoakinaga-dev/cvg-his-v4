# 0320 - Relatorio de Execucao: referencia externa canonica entre PIX e recebiveis

Data: 2026-04-13  
Status: concluido  
Fonte de verdade: `0315`, `0316`, `0319`

## Objetivo

Eliminar a dependencia de `notes` para correlacionar:

- `pix_transactions`
- `encounter_receivable_payments`

e persistir esse vinculo de forma canonica no trilho financeiro.

## Resultado executivo

`encounter_receivable_payments` agora persiste:

- `external_reference_type`
- `external_reference_id`

O fluxo de PIX confirmado grava `pix_transaction` + `transactionId` nesses campos, e a visao administrativa `/financial/reconciliation` passou a priorizar esse vinculo canonico, mantendo fallback por `notes` apenas para historico legado.

## Mudancas implementadas

### 1. Schema canonico

Arquivo:

- `packages/db/src/schema/encounter_financial_accounts.ts`

Novos campos em `encounter_receivable_payments`:

- `external_reference_type`
- `external_reference_id`

Novo indice:

- `idx_erp_account_external_reference`

Migration:

- `packages/db/migrations/0015_encounter_receivable_payments_external_reference.sql`

Backfill best-effort incluido:

- pagamentos antigos com nota `PIX settlement ...` passam a receber `external_reference_type='pix_transaction'` e `external_reference_id=transaction_id` quando houver match com `pix_transactions`.

### 2. Modulo financeiro

Arquivos:

- `packages/modules/financial/src/index.ts`
- `packages/modules/financial/src/repositories/database-financial.repository.ts`
- `packages/modules/financial/src/financial.test.ts`

Mudancas:

- `EncounterReceivablePaymentRecord` ganhou referencia externa canonica;
- `SettleEncounterReceivableInput` passou a aceitar referencia externa opcional;
- pagamentos persistidos pelo service carregam e retornam essa referencia.

### 3. Runtime/API

Arquivos:

- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/routes/financial-routes.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/openapi.yaml`
- `apps/api/src/server.test.ts`

Mudancas:

- PIX confirmado grava `externalReferenceType='pix_transaction'`;
- PIX confirmado grava `externalReferenceId=<transactionId>`;
- a reconciliacao administrativa cruza pagamentos por referencia canonica primeiro;
- permanece fallback por `notes` apenas para compatibilidade com historico anterior;
- o resumo financeiro HTTP agora expoe a referencia externa no array de pagamentos.

## Arquivos alterados

- `packages/db/src/schema/encounter_financial_accounts.ts`
- `packages/db/migrations/0015_encounter_receivable_payments_external_reference.sql`
- `packages/modules/financial/src/index.ts`
- `packages/modules/financial/src/repositories/database-financial.repository.ts`
- `packages/modules/financial/src/financial.test.ts`
- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/routes/financial-routes.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/openapi.yaml`
- `apps/api/src/server.test.ts`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0301-RELATORIO-CONSOLIDADO-AUDITORIA-ENTERPRISE-2026-04-13.md`
- `docs/Enterprise/0320-RELATORIO-EXECUCAO-REFERENCIA-EXTERNA-CANONICA-PIX-RECEBIVEIS-2026-04-13.md`

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-financial typecheck` -> PASS
- `pnpm --filter @cvg-his-v2/module-financial build` -> PASS
- `pnpm --filter @cvg-his-v2/module-financial test` -> PASS (`2/2`)
- `pnpm --filter @cvg-his/db build` -> PASS
- `pnpm --filter @cvg-his/db test` -> PASS (`6/6`)
- `pnpm --filter @cvg-his-v2/api typecheck` -> PASS
- `pnpm --filter @cvg-his-v2/api build` -> PASS
- `pnpm --filter @cvg-his-v2/api test` -> PASS (`56/56`)
- `pnpm validate:openapi` -> PASS
- `pnpm exec vitest run tests/integration/deploy-migrations-contract.test.ts --config vitest.config.ts` -> PASS (`3/3`)

## Observacao operacional

`DATABASE_URL=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test node infra/scripts/prepare-test-db.mjs` falhou neste workspace com erro preexistente de enum duplicado (`appointment_status`) no bootstrap local do zero. Ainda assim, o contrato oficial de migrations executado pela suite `deploy-migrations-contract` aplicou `0015` com sucesso e validou o trilho canonico de deploy.

## Riscos remanescentes

1. O fallback por `notes` ainda existe para historico legado; o ideal e remove-lo depois de uma janela de transicao.
2. Ainda nao existe view materializada/dashboard dedicado para pendencias de conciliacao.
3. Os eventos de dominio financeiros ainda nao carregam essa referencia externa de forma padronizada em todos os consumidores.

## Proximos passos recomendados

1. Propagar `externalReferenceType` e `externalReferenceId` para eventos financeiros e relatórios administrativos.
2. Criar dashboard/consulta operacional para pendencias `attention_required`.
3. Remover fallback por `notes` depois de estabilizar backfill e dados novos.
4. Continuar a extracao de bootstrap/rotas residuais de `server.ts`.
