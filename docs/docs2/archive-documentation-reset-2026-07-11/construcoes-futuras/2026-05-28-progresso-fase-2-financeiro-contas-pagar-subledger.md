# Progresso Fase 2 - Financeiro Contas a Pagar com Subledger

Data: 2026-05-28

## Objetivo

Aprofundar a F2-04 criando um subledger real de contas a pagar para o financeiro Premium Enterprise, com fornecedor, vencimento, liquidação, cancelamento, persistência e superfície operacional na SPA.

## Entregas

- O módulo `@cvg-his-v2/module-financial` recebeu o domínio `FinancialPayablesService`.
- Foram adicionados contratos e repositórios para contas a pagar:
  - `FinancialPayableRecord`;
  - `FinancialPayablesRepository`;
  - `InMemoryFinancialPayablesRepository`;
  - `DatabaseFinancialPayablesRepository`.
- A migration `0049_financial_payables.sql` cria a tabela `financial_payables` com:
  - vínculo multi-tenant por `account_id`;
  - fornecedor, descrição, categoria e centro de custo;
  - emissão, vencimento, valor total, valor pago e saldo;
  - status `open`, `partial`, `paid` e `cancelled`;
  - usuários de criação, liquidação e cancelamento;
  - RLS baseada em `app.current_account_id()`.
- A API passou a expor rotas operacionais:
  - `GET /financial/payables`;
  - `POST /financial/payables`;
  - `POST /financial/payables/{payableId}/pay`;
  - `POST /financial/payables/{payableId}/cancel`.
- O runtime e o bootstrap da API agora injetam o repositório PostgreSQL quando a tabela existe, mantendo fallback in-memory para desenvolvimento/testes.
- O OpenAPI foi atualizado com os contratos de criação, listagem, pagamento e cancelamento de contas a pagar.
- A SPA recebeu o serviço `financialPayablesService`.
- A tela `AccountsPayablePage.vue` agora opera sobre contas a pagar reais, com:
  - criação de conta avulsa;
  - filtros por busca, status, fornecedor e centro de custo;
  - resumo de aberto, vencido, pago e total aberto;
  - baixa individual;
  - baixa em lote para títulos abertos ou parciais;
  - link de apoio para despesas legadas por fornecedor.
- Testes cobrem criação, listagem, pagamento, lote, estados vazios e erros.

## Validação

- `pnpm --filter @cvg-his-v2/module-financial build`
- `pnpm --filter @cvg-his-v2/module-financial test`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/module-reports build`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/financial-routes-payables.test.js`
- `pnpm validate:openapi`
- `pnpm exec vitest run src/pages/finance/__tests__/AccountsPayablePage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

A F2-04 avançou de consulta financeira para operação real em contas a pagar. O sistema agora possui um ledger próprio para obrigações com fornecedores, pronto para alimentar DRE, fluxo de caixa, conciliação e controle de competência.

## Próximos Passos

1. Integrar liquidação de contas a pagar com caixa, banco e método de pagamento.
2. Permitir pagamento parcial com valor editável e observação operacional.
3. Conectar despesas legadas ao novo subledger para migração gradual.
4. Expandir DRE usando receitas realizadas, contas a pagar, despesas, centro de custo e comissões pagas.
5. Criar conciliação bancária entre recebíveis, pagáveis, cartões, PIX, cheques e extratos.
