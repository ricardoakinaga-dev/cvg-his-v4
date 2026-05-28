# Progresso Fase 2 - Estoque: Ledger de Movimentacoes

Data: 2026-05-28

## Objetivo

Iniciar a consolidacao transacional do estoque premium com um ledger auditavel de movimentacoes por item, cobrindo consumo, ajustes de inventario e base para entradas, transferencias e auditoria operacional.

## Entregas Realizadas

- Criado o tipo `InventoryStockMovementSummary`.
- Criado o contrato `CreateInventoryStockAdjustmentRequest`.
- O dominio de estoque agora registra movimentacoes de consumo assistencial e venda comercial.
- Criada a rotina `createStockAdjustment`, permitindo ajuste positivo ou negativo com motivo, referencia, saldo anterior e saldo final.
- Ajustes que deixariam estoque negativo sao rejeitados.
- A lista `listStockMovements` permite consultar o ledger por conta e item.
- O reposititorio PostgreSQL ganhou suporte a `inventory_stock_movements`.
- Criadas migrations:
  - `packages/db/migrations/0052_inventory_stock_movements.sql`
  - `packages/shared/database/src/migrations/022_inventory_stock_movements.sql`
- O bootstrap da API ativa persistencia de movimentacoes quando a tabela existe e mantem fallback sem quebrar ambientes ainda nao migrados.
- A API ganhou endpoints:
  - `GET /inventory/movements`
  - `POST /inventory/adjustments`
- O OpenAPI foi atualizado com paths e schemas de movimentacao.
- O service/tipos da SPA ganharam contratos para listar movimentacoes e criar ajustes.
- Testes de dominio e rota cobrem ajuste, rejeicao de saldo negativo, consulta de movimentos e hidratacao por repositorio.

## Resultado no Roadmap

Este incremento inicia F2-07 com a base de auditoria transacional do estoque. O sistema passa a explicar variacoes de saldo por evento registrado, requisito essencial para inventario, compras, transferencias e conciliacao operacional.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/shared-types build`
- `pnpm --filter @cvg-his-v2/shared-contracts build`
- `pnpm --filter @cvg-his-v2/module-inventory build`
- `pnpm --filter @cvg-his-v2/module-inventory test`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/inventory-routes.test.js`
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- `pnpm --filter @cvg-his-v2/api typecheck`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Criar tela operacional de ledger de estoque com filtros por item, tipo e periodo.
- Criar entrada de compra/NF alimentando o ledger como `inbound`.
- Criar transferencia entre locais/unidades com movimentos pareados.
- Expandir lotes reais persistidos em vez de lotes derivados.
