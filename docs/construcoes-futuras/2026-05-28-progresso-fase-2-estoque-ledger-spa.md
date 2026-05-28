# Progresso F2-07 - Estoque Ledger SPA

Data: 2026-05-28

## Objetivo

Conectar a interface operacional de movimentacoes de estoque ao ledger transacional real, substituindo a visao limitada de consumo por uma pagina capaz de consultar movimentacoes auditaveis e registrar ajustes de inventario.

## Entregue

- A pagina `InventoryMovementsPage` agora consome `inventoryService.listStockMovements()`.
- A tela exibe ledger de estoque com tipo de movimento, delta, saldo anterior, saldo final, justificativa, referencia, custo unitario e data.
- Foram adicionados filtros por tipo de movimento e item.
- Foi criado formulario operacional para ajuste de estoque com item, delta, justificativa e referencia.
- O formulario grava ajustes via `inventoryService.createStockAdjustment()`.
- Apos ajuste, a tela recarrega itens e movimentacoes para refletir o novo saldo.
- KPIs da pagina foram alinhados ao ledger transacional: total de movimentacoes, ajustes, saidas e delta liquido.

## Evidencias tecnicas

- Teste especifico da tela atualizado para validar renderizacao do ledger e criacao de ajuste auditavel.
- Typecheck do SPA executado com sucesso.
- Build de producao do SPA executado com sucesso.
- Lockfile conferido preservando `vue-component-type-helpers@3.2.7`.

## Validacoes executadas

```bash
pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/InventoryMovementsPage.test.ts --pool=forks
pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit
pnpm --filter @cvg-his-v2/spa build
rg -n "vue-component-type-helpers(@|: )3\\.(2\\.7|3\\.3\\.2)" pnpm-lock.yaml
```

Resultado:

- Teste da pagina: 1 arquivo, 2 testes, todos verdes.
- Typecheck SPA: verde.
- Build SPA: verde.
- Lockfile: `vue-component-type-helpers@3.2.7` preservado.

## Impacto no Premium Enterprise

Esta entrega transforma o estoque de uma visao historica parcial para uma operacao auditavel de ledger, requisito essencial para inventario, conciliacao de consumo, rastreabilidade de perdas/quebras e governanca enterprise.

## Proximos passos recomendados

- Fechar entradas por compra/NF dentro do mesmo ledger.
- Conectar transferencias entre almoxarifados ao ledger.
- Adicionar permissao granular para ajuste de estoque.
- Criar E2E cobrindo ajuste, consumo assistencial e venda com baixa automatica.
- Expor trilha de auditoria por usuario, item e referencia.
