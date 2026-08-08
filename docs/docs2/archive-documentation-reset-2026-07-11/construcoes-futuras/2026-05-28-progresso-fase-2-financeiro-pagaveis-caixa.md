# Progresso Fase 2 - Financeiro Pagáveis Integrados ao Caixa

Data: 2026-05-28

## Objetivo

Avançar a F2-04 conectando a baixa de contas a pagar ao método de pagamento e à gaveta de caixa, reduzindo divergência entre subledger financeiro e movimentação operacional.

## Entregas

- `FinancialPayableRecord` passou a guardar:
  - `paymentMethod`;
  - `paymentReference`.
- A baixa de contas a pagar aceita método:
  - `cash`;
  - `bank_transfer`;
  - `pix`;
  - `card`;
  - `cheque`;
  - `other`.
- `FinancialPayablesService` recebeu callback `onPayablePaid`.
- O runtime usa esse callback para registrar saída de caixa quando uma conta a pagar é baixada com `paymentMethod = cash`.
- A saída é registrada como `withdrawal` na gaveta aberta, com:
  - referência para o `payable.id`;
  - valor pago;
  - usuário responsável;
  - observação com fornecedor e referência da baixa.
- A persistência PostgreSQL de `financial_payables` foi ampliada com `payment_method` e `payment_reference`.
- A API `POST /financial/payables/{payableId}/pay` passou a aceitar `paymentMethod` e `paymentReference`.
- O OpenAPI foi atualizado para refletir os novos campos.
- A SPA de Contas a Pagar recebeu configuração operacional de baixa:
  - método de baixa;
  - referência;
  - propagação para baixa individual e baixa em lote.
- Testes cobrem:
  - metadados de método/referência no domínio;
  - propagação via rota HTTP;
  - integração runtime criando saída de caixa;
  - UI usando método e referência na baixa.

## Validação

- `pnpm --filter @cvg-his-v2/module-financial build`
- `pnpm --filter @cvg-his-v2/module-financial test`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/financial-routes-payables.test.js`
- `node apps/api/dist/runtime.test.js`
- `pnpm validate:openapi`
- `pnpm exec vitest run src/pages/finance/__tests__/AccountsPayablePage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

A F2-04 deixou de tratar contas a pagar como baixa isolada. Quando a clínica paga fornecedor em dinheiro, o sistema agora baixa o título e registra a saída da gaveta aberta, aproximando o financeiro do padrão Premium Enterprise de rastreabilidade entre obrigação, método de pagamento e caixa.

## Próximos Passos

1. Criar conciliação bancária para métodos `bank_transfer`, `pix`, `card`, `cheque` e `other`.
2. Evoluir baixa parcial com valor editável na SPA.
3. Exibir no detalhe do caixa a origem `financial_payable` de forma estruturada.
4. Expandir DRE por centro de custo, unidade e método de pagamento.
5. Conectar pagáveis e recebíveis ao motor de relatórios para exportação/agendamento.
