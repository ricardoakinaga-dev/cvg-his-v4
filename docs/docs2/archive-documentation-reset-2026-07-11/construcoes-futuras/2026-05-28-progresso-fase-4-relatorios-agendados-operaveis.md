# Progresso Fase 4 - Relatorios agendados operaveis

Data: 2026-05-28

## Objetivo

Avancar o diferencial `Relatorios agendados`, transformando o agendamento basico do motor enterprise em uma superficie mais operavel para suporte, worker futuro e piloto Premium.

## Entregue

- O dominio de relatorios agora calcula `nextRunAt` para agendamentos:
  - diarios: +1 dia;
  - semanais: +7 dias;
  - mensais: +1 mes.
- O `ReportsService` passou a expor `listDueSchedules(accountId, asOf)` para listar agendamentos ativos vencidos.
- A API passou a expor `GET /reports/schedules/due?asOf=...`.
- O OpenAPI documenta:
  - `ReportSchedule.nextRunAt`;
  - endpoint `/reports/schedules/due`.
- A SPA do `Motor Enterprise de Relatorios` passou a exibir:
  - proxima execucao;
  - quantidade de destinatarios;
  - formato do agendamento.
- Testes cobrem calculo de proxima execucao, consulta de vencidos, rota de API e apresentacao na SPA.

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

- `pnpm --filter @cvg-his-v2/module-reports build && pnpm --filter @cvg-his-v2/module-reports test` - 4/4 testes passando.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 2/2 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.
- `pnpm validate:openapi` - passou com 289 paths e 329 schemas.
- `git diff --check` nos arquivos alterados - passou.

## Impacto no Premium Enterprise

Relatorios agendados deixam de ser apenas cadastro de recorrencia e passam a ter uma nocao operacional de proxima execucao e vencimento. Isso cria base para worker de disparo, fila de entregas e monitoramento de automacoes premium.

## Proximos passos recomendados

- Criar worker de execucao de agendamentos vencidos.
- Persistir historico de entregas por destinatario.
- Adicionar status de ultima execucao e ultima falha.
- Permitir pausar/reativar agendamentos pela SPA.

