# Progresso Fase 4 - Controle operacional de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operacao Premium dos relatorios agendados, permitindo que a equipe pause ou reative recorrencias diretamente pela SPA e visualize evidencias de ultima execucao ou falha.

## Entregue

- O dominio de relatorios passou a suportar `setScheduleActive(accountId, scheduleId, isActive)`.
- A API passou a expor `PATCH /reports/schedules/{scheduleId}` para pausar ou reativar agendamentos.
- O OpenAPI foi atualizado com:
  - path `/reports/schedules/{scheduleId}`;
  - schema `UpdateReportScheduleRequest`;
  - metadados operacionais de `ReportSchedule`.
- O Motor Enterprise de Relatorios na SPA passou a mostrar:
  - status `Ativo` ou `Pausado`;
  - proxima execucao;
  - ultima execucao;
  - ultima falha;
  - destinatarios;
  - acao de `Pausar` ou `Reativar`.
- O cliente SPA ganhou `reportsService.updateSchedule(...)`.
- Eventos de pausa/reativacao geram auditoria de risco medio na API.

## Evidencias tecnicas

- `packages/modules/reports/src/index.ts`
- `packages/modules/reports/src/reports.test.ts`
- `apps/api/src/routes/reports-routes.ts`
- `apps/api/src/routes/reports-routes.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/services/reports.ts`
- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/module-reports build && pnpm --filter @cvg-his-v2/module-reports test` - 6/6 testes passando.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 3/3 testes passando.
- `pnpm validate:openapi` - passou com 290 paths e 330 schemas.
- `pnpm --filter @cvg-his-v2/worker test` - passou.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.

## Impacto no Premium Enterprise

Relatorios agendados ficam administraveis pela operacao: o usuario consegue pausar uma automacao problematica, reativar quando corrigida e conferir evidencias de ultima execucao/falha sem depender de acesso tecnico ao banco ou ao worker.

## Proximos passos recomendados

- Expor historico de entregas por destinatario.
- Adicionar metricas de sucesso/falha de relatorios agendados no Prometheus.
- Criar resolvedores reais no worker para os principais relatórios recorrentes.
- Adicionar alerta visual quando `lastError` estiver preenchido.

