# Progresso Fase 4 - Historico de entregas de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operacao enterprise dos relatorios agendados, persistindo e exibindo o historico de entregas por destinatario.

## Entregue

- Criado contrato `ReportScheduleDeliverySummary` no dominio de relatorios.
- O servico passou a registrar entregas por schedule, destinatario, status, formato, execucao, data e erro.
- O worker registra entregas `sent` quando exporta um agendamento para destinatarios.
- O worker registra entregas `failed` por destinatario quando um agendamento com destinatarios falha.
- A persistencia PostgreSQL recebeu a tabela `report_schedule_deliveries`, indices e RLS tenant-aware.
- A API passou a expor `GET /reports/schedules/{scheduleId}/deliveries`.
- A SPA passou a permitir abrir `Entregas` na tabela de agendamentos e visualizar o historico por destinatario.
- O OpenAPI foi atualizado com path e schemas de entregas.

## Evidencias tecnicas

- `packages/modules/reports/src/index.ts`
- `packages/modules/reports/src/reports.test.ts`
- `packages/db/migrations/0048_report_engine.sql`
- `apps/worker/src/jobs/scheduled-report-job.ts`
- `apps/worker/src/jobs/scheduled-report-job.test.ts`
- `apps/api/src/routes/reports-routes.ts`
- `apps/api/src/routes/reports-routes.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/services/reports.ts`
- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/module-reports build && pnpm --filter @cvg-his-v2/module-reports test` - 7/7 testes passando.
- `pnpm --filter @cvg-his-v2/worker test` - runner, bootstrap e job de relatorios passando.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 5/5 testes passando.

## Impacto no Premium Enterprise

Relatorios agendados deixam de ter apenas uma ultima falha agregada e passam a ter rastreabilidade por destinatario. A operacao consegue comprovar quem recebeu, quando recebeu, qual formato foi entregue e qual erro ocorreu em caso de falha.

Isso aproxima o modulo de uma automacao enterprise auditavel, com base para suporte, SLA de entrega, reprocessamento futuro e analise de falhas recorrentes por destinatario.

## Proximos passos recomendados

- Criar acao de reprocessamento por entrega falhada.
- Adicionar filtros por periodo/status no historico de entregas.
- Correlacionar entregas com alertas Prometheus e auditoria operacional.
