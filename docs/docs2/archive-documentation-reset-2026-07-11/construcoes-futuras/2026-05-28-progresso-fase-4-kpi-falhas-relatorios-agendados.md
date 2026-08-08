# Progresso Fase 4 - KPI de falhas em relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a triagem operacional do Motor Enterprise de Relatorios, mostrando no topo da pagina quantos agendamentos possuem falha recente.

## Entregue

- Criado KPI `Agendamentos com falha`.
- O KPI conta schedules com `lastError` preenchido.
- O alerta visual por linha foi preservado com badge `Falha no ultimo envio`.
- O teste da pagina valida a presenca do KPI quando ha schedule com erro.

## Evidencias tecnicas

- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 3/3 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.

## Impacto no Premium Enterprise

A equipe de operacao consegue ver imediatamente se ha automacoes de relatorio com erro, antes mesmo de rolar ate a tabela. Isso melhora tempo de resposta e deixa a superficie de relatorios mais adequada para uso enterprise assistido.

## Proximos passos recomendados

- Linkar o KPI para filtro automatico de schedules com falha.
- Adicionar cards de sucesso/falha por periodo.
- Correlacionar o KPI com metricas Prometheus do worker.

