# Progresso Fase 1 - Counter-sales OpenAPI Enterprise

Data: 2026-05-28

## Incremento entregue

Incremento da Fase 1 do roadmap Premium Enterprise no item `F1-02 - Consolidar comandas/counter-sales`.

O foco foi transformar a API real de comandas em superficie contratual documentada, validavel e integravel via OpenAPI.

## Escopo implementado

- Nova tag OpenAPI `Counter Sales`.
- Documentacao do dashboard comercial:
  - `GET /admin/commercial-dashboard`.
- Documentacao do ciclo principal de comandas:
  - `GET /counter-sales`;
  - `POST /counter-sales`;
  - `GET /counter-sales/{counterSaleId}`.
- Documentacao de itens da comanda:
  - `POST /counter-sales/{counterSaleId}/items`;
  - `PATCH /counter-sales/{counterSaleId}/items/{itemId}`;
  - `DELETE /counter-sales/{counterSaleId}/items/{itemId}`.
- Documentacao de pagamento:
  - `POST /counter-sales/{counterSaleId}/payments`.
- Documentacao das transicoes operacionais:
  - `POST /counter-sales/{counterSaleId}/close`;
  - `POST /counter-sales/{counterSaleId}/cancel`;
  - `POST /counter-sales/{counterSaleId}/reopen`.
- Novos schemas:
  - `CounterSaleStatus`;
  - `CounterSaleItemType`;
  - `CounterSalePaymentMethod`;
  - `CounterSale`;
  - `CounterSaleItem`;
  - `CounterSalePayment`;
  - `CounterSaleDetail`;
  - `CounterSalesListResponse`;
  - `OpenCounterSaleRequest`;
  - `CreateCounterSaleItemRequest`;
  - `UpdateCounterSaleItemRequest`;
  - `CreateCounterSalePaymentRequest`;
  - `CounterSalesCommercialDashboard`;
  - `CounterSalesDashboardLeader`.

## Evidencias de validacao

- `pnpm validate:openapi`: passou.
  - `244 paths`;
  - `36 tags`;
  - `245 schemas`.
- `pnpm --filter @cvg-his-v2/api build`: passou.
- `node --test apps/api/dist/routes/counter-sales-routes.test.js`: passou.
  - `4` testes.
- `pnpm --filter @cvg-his-v2/module-counter-sales build`: passou.
- `pnpm --filter @cvg-his-v2/module-counter-sales test`: passou.
  - `27` testes.

## Impacto no roadmap

Este incremento reforca o item `F1-02` porque comandas/counter-sales deixam de ser apenas uma implementacao interna e passam a ter contrato publico para integracoes, QA, homologacao e governanca.

Tambem melhora o criterio Enterprise de auditabilidade tecnica, pois o fluxo abrir comanda, adicionar item, pagar, fechar, cancelar e reabrir agora esta documentado no contrato HTTP principal do produto.

## Proximo foco recomendado

Continuar `F1-02` com teste de integracao/E2E cobrindo o fluxo ponta a ponta de comanda:

1. Abrir comanda.
2. Adicionar produto e servico.
3. Registrar pagamento parcial e final.
4. Fechar comanda.
5. Validar bloqueio de edicao financeira indevida apos pagamento ou fechamento.
