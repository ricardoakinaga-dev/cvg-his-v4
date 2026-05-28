# Progresso - Fase 4 - Fontes operacionais no worker de relatórios recorrentes

Data: 2026-05-28

## Objetivo

Reduzir a dependência de linhas sintéticas no resolvedor recorrente `administrative-executive`, conectando o worker a fontes operacionais reais quando o banco estiver disponível.

## Entregue

- O resolvedor `resolveScheduledReportRows` passou a aceitar fontes operacionais para relatório executivo administrativo.
- O relatório recorrente `administrative-executive` agora pode gerar linhas de:
  - comercial: receita líquida, comandas fechadas, comandas abertas e ticket médio;
  - financeiro: resultado líquido realizado, recebíveis em aberto, pagáveis em aberto e margem bruta;
  - caixa: saldo do caixa aberto ou sinalização de ausência de caixa aberto.
- O bootstrap do worker cria fontes reais com:
  - `CounterSalesService` + `DatabaseCounterSalesRepository`;
  - `FinancialIncomeStatementService` + repositórios financeiros;
  - `CashService` + `DatabaseCashRepository`.
- O tick de relatórios agendados injeta essas fontes no resolvedor quando disponíveis.
- O fallback sem fontes continua funcionando para ambientes em memória/teste.
- Teste do worker cobre enriquecimento do relatório administrativo com fontes comerciais, financeiras e de caixa.

## Arquivos principais

- `apps/worker/src/runner.ts`
- `apps/worker/src/bootstrap.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/runner.test.ts`
- `apps/worker/package.json`
- `pnpm-lock.yaml`

## Validação executada

- `pnpm --filter @cvg-his-v2/worker test`

## Impacto no plano Premium Enterprise

Este incremento fecha parte dos próximos passos de relatórios agendados: o worker deixa de depender apenas do metadado do agendamento para o relatório executivo administrativo e passa a buscar sinais operacionais reais de comercial, financeiro e caixa.
