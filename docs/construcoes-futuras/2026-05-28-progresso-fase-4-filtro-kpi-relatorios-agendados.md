# Progresso Fase 4 - Filtro por KPI em relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operacao assistida do Motor Enterprise de Relatorios, transformando o KPI de agendamentos com falha em uma acao direta de triagem.

## Entregue

- O KPI `Agendamentos com falha` passou a ser acionavel.
- Ao clicar no KPI, a tabela de agendamentos mostra somente schedules com `lastError`.
- A tela exibe o estado `Filtro ativo: somente agendamentos com falha`.
- Foi adicionada acao `Limpar filtro` para retornar a visualizacao completa.
- Os valores dos KPIs foram normalizados como texto formatado em `pt-BR`, alinhando o uso do `DsStatCard` ao contrato do design system.

## Evidencias tecnicas

- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 4/4 testes passando.

## Impacto no Premium Enterprise

A operacao deixa de apenas enxergar a quantidade de falhas e passa a agir sobre ela imediatamente. Isso reduz tempo de triagem, melhora a usabilidade do monitoramento de automacoes e aproxima os relatorios agendados de uma superficie enterprise operavel.

## Proximos passos recomendados

- Persistir historico de entregas por destinatario.
- Adicionar visao de sucesso/falha por periodo.
- Conectar o filtro de falhas ao historico e as metricas Prometheus do worker.
