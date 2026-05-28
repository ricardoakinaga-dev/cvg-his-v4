# Progresso Fase 2 - Financeiro DRE Gerencial

Data: 2026-05-28

## Objetivo

Avançar a F2-04 além de contas a receber e contas a pagar isoladas, criando uma visão gerencial de DRE para o CVG-HIS v4 Premium Enterprise com receitas, despesas, pendências e resultado por período.

## Entregas

- O módulo `@cvg-his-v2/module-financial` recebeu o serviço `FinancialIncomeStatementService`.
- O DRE consolida dados reais dos repositórios de recebíveis e contas a pagar:
  - receita bruta por títulos do período;
  - receita realizada por títulos liquidados no período;
  - recebíveis em aberto;
  - despesas por competência;
  - despesas pagas;
  - contas a pagar em aberto;
  - resultado realizado;
  - resultado por competência;
  - margem bruta;
  - conversão de caixa;
  - despesas agrupadas por categoria.
- A API passou a expor `GET /financial/income-statement` com filtros `dateFrom` e `dateTo`.
- O runtime compartilha os mesmos repositórios de recebíveis e pagáveis entre os serviços operacionais e o DRE, mantendo consistência em memória e em PostgreSQL.
- O OpenAPI foi atualizado com:
  - path `/financial/income-statement`;
  - schema `FinancialIncomeStatement`;
  - schema `FinancialIncomeStatementCategory`.
- A SPA recebeu o serviço `financialStatementsService`.
- O `FinancialDashboardPage.vue` passou a carregar o DRE junto com os hubs administrativos e exibir:
  - card `Resultado Realizado`;
  - linhas `DRE Realizado` e `DRE Competência`;
  - filtro de visão `DRE`;
  - detalhes de receita realizada, despesas pagas, margem e conversão.
- Testes cobrem o serviço de domínio, rota HTTP e dashboard financeiro.

## Validação

- `pnpm --filter @cvg-his-v2/module-financial build`
- `pnpm --filter @cvg-his-v2/module-financial test`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/financial-routes-payables.test.js`
- `pnpm validate:openapi`
- `pnpm exec vitest run src/pages/finance/__tests__/FinancialDashboardPage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

A F2-04 ganhou uma camada gerencial real. O financeiro agora consegue sair da operação de títulos e apresentar resultado consolidado por período, usando recebíveis e contas a pagar implementados no sistema. Isso aproxima o produto do pacote Premium Enterprise porque dá evidência executiva de margem, caixa realizado e obrigações pendentes.

## Próximos Passos

1. Integrar liquidação de contas a pagar com caixa, banco e método de pagamento.
2. Refinar receita realizada por eventos de pagamento, incluindo baixas parciais por data de pagamento.
3. Evoluir o DRE para centro de custo, unidade e categoria.
4. Criar conciliação bancária entre recebíveis, pagáveis, cartões, PIX, cheques e extratos.
5. Conectar o DRE ao motor de relatórios para exportação e agendamento.
