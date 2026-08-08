# Progresso Fase 4 - Reprocessamento de entregas de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operacao assistida dos relatorios agendados, permitindo reprocessar uma entrega falhada quando ha execucao de relatorio associada.

## Entregue

- O dominio `ReportsService` recebeu `retryScheduleDelivery`.
- O reprocessamento valida:
  - schedule pertencente a conta;
  - entrega pertencente ao schedule;
  - status original `failed`;
  - existencia de `executionId`.
- O retry gera nova exportacao da execucao original.
- O retry registra uma nova entrega `sent` para o mesmo destinatario.
- A API passou a expor `POST /reports/schedules/{scheduleId}/deliveries/{deliveryId}/retry`.
- A rota registra auditoria `retry_report_schedule_delivery`.
- A SPA passou a exibir acao `Reprocessar` apenas em entregas falhadas.
- A tela atualiza o historico local com a nova entrega enviada e mostra mensagem de sucesso.
- O OpenAPI foi atualizado com o endpoint de retry.

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

- `pnpm --filter @cvg-his-v2/module-reports build && pnpm --filter @cvg-his-v2/module-reports test` - 8/8 testes passando.
- `pnpm --filter @cvg-his-v2/api build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/reports-routes.test.js` - 3/3 testes passando.
- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 8/8 testes passando.

## Impacto no Premium Enterprise

A equipe deixa de apenas identificar falhas de entrega e passa a corrigi-las pela propria interface. Isso reduz dependencia tecnica para incidentes simples e aproxima os relatorios agendados de uma automacao enterprise operavel, rastreavel e assistida.

## Proximos passos recomendados

- Criar auditoria operacional agregada para entregas falhadas recorrentes.
- Adicionar analise por destinatario com maior recorrencia de falhas.
- Permitir reprocessamento em lote de entregas falhadas filtradas.
