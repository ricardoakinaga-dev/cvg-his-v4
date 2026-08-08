# Progresso Fase 2 - Internacao: Fila Gerencial de Diarias

Data: 2026-05-28

## Objetivo

Dar visibilidade operacional e financeira para as diarias de internacao, permitindo que a gestao acompanhe itens pendentes e faturados por unidade e enfermaria sem depender da abertura individual de cada ficha.

## Entregas Realizadas

- O dominio de internacao ganhou a consulta `listDailyChargeWorklist`, consolidando diarias com unidade, enfermaria, leito e status da internacao.
- A API passou a expor `GET /inpatient/daily-charges/worklist`, com filtros por `status`, `unit` e `ward`.
- A resposta da API retorna os totais consolidados de valores pendentes e faturados.
- O OpenAPI foi atualizado com os contratos `InpatientDailyChargeWorklistResponse` e `InpatientDailyChargeWorklistItem`.
- A SPA ganhou a pagina `/inpatient/daily-charges`, com aliases `/internacao/diarias` e `/internação/diárias`.
- A tela de diarias exibe indicadores de pendente, faturado e quantidade de itens, tabela operacional e atalhos para ficha de internacao e cobranca.
- A navegacao principal de internacao passou a incluir "Diarias de Internacao".
- A lista de internacoes passou a ter atalho direto para a fila de diarias.
- Foram adicionados testes de dominio, API e SPA cobrindo filtros, totais, renderizacao, links e estado de erro.

## Resultado no Roadmap

Este incremento fortalece F2-05 ao transformar as diarias de internacao em uma fila gerencial auditavel. A operacao consegue identificar rapidamente quais diarias ainda precisam ser faturadas, onde estao concentradas por setor e quais ja possuem vinculo financeiro.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/shared-types build`
- `pnpm --filter @cvg-his-v2/shared-contracts build`
- `pnpm --filter @cvg-his-v2/module-inpatient build`
- `pnpm --filter @cvg-his-v2/module-inpatient test`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/inpatient-routes.test.js`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inpatient/__tests__/InpatientDailyChargesPage.test.ts src/router/routes.test.ts --pool=forks`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Persistir e hidratar a fila gerencial diretamente a partir dos repositorios PostgreSQL em cenarios de reinicio completo.
- Criar indicadores por setor/unidade no dashboard executivo.
- Gerar relatorio de internacao com receita por periodo, paciente, unidade e status de faturamento.
