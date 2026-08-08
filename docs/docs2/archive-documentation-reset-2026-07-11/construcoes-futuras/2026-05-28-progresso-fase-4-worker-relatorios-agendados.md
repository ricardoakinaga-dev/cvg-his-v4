# Progresso Fase 4 - Worker de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a automacao Premium de relatorios agendados, conectando o motor enterprise de relatorios ao worker para executar recorrencias vencidas, exportar entregas configuradas e registrar evidencias operacionais.

## Entregue

- O dominio de relatorios passou a registrar execucao de agendamento com:
  - `lastRunAt`;
  - `lastExecutionId`;
  - `lastError`;
  - avanco de `nextRunAt` apos cada tentativa.
- A tabela `report_schedules` foi ampliada com campos operacionais de ultima execucao/falha e indice por vencimento.
- Criado o job `runScheduledReportJob` no worker.
- O job:
  - lista agendamentos vencidos;
  - resolve linhas do relatorio;
  - executa o relatorio;
  - exporta quando ha destinatarios;
  - avanca a recorrencia;
  - registra falhas sem interromper o lote.
- O runner do worker passou a criar `ReportsService` e executar tick de relatorios agendados quando ha `WORKER_ACCOUNT_ID`.
- O bootstrap do worker passou a expor `DatabaseReportRepository`.
- A documentacao do worker foi atualizada com a responsabilidade de relatorios enterprise agendados.
- O OpenAPI passou a expor metadados operacionais de schedule:
  - `nextRunAt`;
  - `lastRunAt`;
  - `lastExecutionId`;
  - `lastError`.

## Evidencias tecnicas

- `packages/modules/reports/src/index.ts`
- `packages/modules/reports/src/reports.test.ts`
- `packages/db/migrations/0048_report_engine.sql`
- `apps/worker/src/jobs/scheduled-report-job.ts`
- `apps/worker/src/jobs/scheduled-report-job.test.ts`
- `apps/worker/src/runner.ts`
- `apps/worker/src/runner.test.ts`
- `apps/worker/src/bootstrap.ts`
- `apps/worker/src/index.ts`
- `apps/worker/README.md`
- `apps/api/src/openapi.yaml`

## Validacao executada

- `pnpm --filter @cvg-his-v2/module-reports build && pnpm --filter @cvg-his-v2/module-reports test` - 5/5 testes passando.
- `pnpm --filter @cvg-his-v2/worker test` - runner, bootstrap e job de relatorios passando.
- `pnpm validate:openapi` - passou com 289 paths e 329 schemas.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 2/2 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.

## Impacto no Premium Enterprise

Relatorios agendados passam a ter ciclo operacional real: cadastro, proxima execucao, vencimento, execucao por worker, exportacao e evidencia de ultima execucao/falha. Isso aproxima o modulo de uma automacao enterprise monitoravel e reduz dependencia de operacao manual.

## Proximos passos recomendados

- Implementar resolvedores de linhas por tipo de relatorio no worker para evitar execucoes vazias quando nao houver fonte plugada.
- Persistir entregas por destinatario com status individual.
- Expor pausa/reativacao e ultima falha diretamente na SPA.
- Adicionar metricas Prometheus especificas de relatorios agendados.

