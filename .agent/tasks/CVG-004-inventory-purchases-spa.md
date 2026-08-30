# CVG-004 — fila de compras persistidas na SPA

Status: `PASS_BOUNDED` local; CVG-004 permanece `IN_PROGRESS/PARTIAL`.

## Objetivo

Retirar a fila de compras da SPA do estado apenas sintético e conectá-la ao
contrato persistido já exposto por `GET /inventory/purchases`, mantendo a
leitura account-scoped e fornecendo uma navegação read-only para o detalhe.

## Critérios bounded

- [x] Carregar compras persistidas junto dos itens/lotes da página.
- [x] Mapear linhas, status, fornecedor e valores sem inventar fatos ausentes.
- [x] Calcular o aberto persistido usando os totais do contrato e recebimentos.
- [x] Limpar estado derivado quando a consulta falhar.
- [x] Exibir detalhe, todas as linhas, auditoria e retry/missing state.
- [x] Cobrir rota, unidade/componente e fluxo browser de leitura.
- [x] Manter a fatia sem mutações, provider, target, migração ou produção.

## Evidência

- Artefato: `.agent/artifacts/CVG-004-inventory-purchases-spa-2026-08-26.md`.
- Implementação: `apps/spa/src/pages/inventory/InventoryPurchasesPage.vue` e
  `InventoryPurchaseDetailPage.vue`.
- Testes: `InventoryPurchasesPage.test.ts`,
  `InventoryPurchaseDetailPage.test.ts`, `routes.test.ts` e
  `e2e/spa/inventory-purchases-persistence.spec.ts`.
- Suíte de inventário: 25 arquivos/103 testes; E2E focado 1/1; typecheck e
  build SPA verdes.

Duas revisões independentes encontraram e motivaram correções de KPI, rota de
detalhe e estado de erro. Tentativas posteriores de obter um parecer final
estreito não retornaram e foram encerradas; não são contadas como aprovação.

## Não encerrado

Este task não encerra a paridade Vetus de Compras, recebimento, NF,
Pagamento Antecipado ou os onze domínios. O browser E2E usa stub da API e não
substitui prova PostgreSQL multi-tenant. Os gates globais, target/provider,
backup/restore, CI remoto, coverage, operações e release continuam abertos.
