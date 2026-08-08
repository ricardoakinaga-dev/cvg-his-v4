# Progresso Fase 2 - Financeiro Conciliação de Pagáveis

Data: 2026-05-28

## Objetivo

Avançar a F2-04 criando conciliação operacional para contas a pagar liquidadas fora da gaveta, cobrindo banco, PIX, cartão, cheque e outros métodos não-caixa.

## Entregas

- `FinancialPayableRecord` passou a guardar:
  - `reconciliationStatus`;
  - `reconciliationReference`;
  - `reconciledByUserId`;
  - `reconciledAt`.
- O domínio passou a classificar automaticamente a baixa:
  - `cash` ou sem método: `not_required`;
  - `bank_transfer`, `pix`, `card`, `cheque` e `other`: `pending` quando o título é quitado.
- `FinancialPayablesService` recebeu:
  - `listPayableReconciliation`;
  - `reconcilePayablePayment`.
- A API recebeu:
  - `GET /financial/reconciliation/payables`;
  - `POST /financial/payables/{payableId}/reconcile`.
- O OpenAPI foi atualizado com os novos paths e schemas de conciliação.
- A migration `0049_financial_payables.sql` foi ampliada com colunas e índice de conciliação.
- A SPA de Contas a Pagar passou a exibir ação `Conciliar` para títulos pagos, não-caixa e pendentes.
- A ação de conciliação usa a referência operacional preenchida na tela e recarrega o subledger.

## Validação

- `pnpm --filter @cvg-his-v2/module-financial build`
- `pnpm --filter @cvg-his-v2/module-financial test`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/financial-routes-payables.test.js`
- `pnpm validate:openapi`
- `pnpm exec vitest run src/pages/finance/__tests__/AccountsPayablePage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

A F2-04 agora cobre a trilha completa para contas a pagar: criação, baixa, método de pagamento, saída de caixa quando aplicável e conciliação manual dos pagamentos não-caixa. Isso reduz o gap de financeiro profundo indicado no roadmap Premium Enterprise.

## Próximos Passos

1. Criar tela dedicada de conciliação consolidando pagáveis, PIX e cartões.
2. Evoluir conciliação bancária com importação de extrato/OFX.
3. Propagar status de conciliação para o DRE e fluxo de caixa.
4. Adicionar conciliação estruturada para cheques emitidos.
5. Conectar conciliação ao motor de relatórios para exportação e agendamento.
