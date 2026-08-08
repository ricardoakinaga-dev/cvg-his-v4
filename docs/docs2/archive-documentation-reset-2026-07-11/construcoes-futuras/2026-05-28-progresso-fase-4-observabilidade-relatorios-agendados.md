# Progresso Fase 4 - Observabilidade de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operabilidade Premium dos relatorios agendados, adicionando metricas Prometheus especificas para acompanhar schedules vencidos, executados, exportados e com falha.

## Entregue

- Criadas metricas Prometheus no worker:
  - `worker_scheduled_report_schedules_total`;
  - `worker_scheduled_report_tick_duration_ms`.
- O job `runScheduledReportJob` passou a registrar:
  - agendamentos vencidos;
  - agendamentos executados;
  - exportacoes geradas;
  - falhas por schedule;
  - duracao do tick.
- Os testes do job validam que as metricas aparecem no texto de `/metrics`.
- As metricas usam outcomes agregados:
  - `due`;
  - `executed`;
  - `exported`;
  - `failed`.

## Evidencias tecnicas

- `apps/worker/src/worker-metrics.ts`
- `apps/worker/src/jobs/scheduled-report-job.ts`
- `apps/worker/src/jobs/scheduled-report-job.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/worker test` - passou, incluindo validacao das metricas.
- `pnpm validate:openapi` - passou com 290 paths e 330 schemas.
- `pnpm --filter @cvg-his-v2/module-reports test` - 6/6 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 3/3 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.

## Impacto no Premium Enterprise

Relatorios agendados passam a ser monitoraveis na camada operacional. A equipe consegue acompanhar volume de schedules vencidos, sucesso, exportacoes e falhas via Prometheus, sustentando uma operacao enterprise com alertas e SLOs futuros.

## Proximos passos recomendados

- Criar alerta para aumento de `outcome="failed"`.
- Adicionar dashboard operacional com taxa de sucesso de schedules.
- Correlacionar `lastError` da SPA com metricas Prometheus.
- Criar resolvedores reais por relatorio para reduzir execucoes vazias.

