# Progresso - Fase 4 - KPI de alertas resolvidos no Dashboard Premium

Data: 2026-05-28

## Objetivo

Conectar os alertas operacionais de entregas de relatórios à Central executiva Premium, permitindo que a gestão veja quantos alertas já tiveram reprocessamento auditado.

## Entregue

- Dashboard Premium passou a consultar eventos de auditoria de entregas de relatórios.
- Novo KPI executivo `Alertas resolvidos` na Central executiva Premium.
- O indicador contabiliza eventos `retry_report_schedule_delivery`, usando a trilha auditada do reprocessamento de entregas.
- O card leva para auditoria filtrada por `report-schedule-delivery`, mantendo rastreabilidade do indicador.
- Teste do Dashboard cobre carregamento do indicador e chamada ao serviço de auditoria.

## Arquivos principais

- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/__tests__/DashboardPage.test.ts`

## Validação executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/__tests__/DashboardPage.test.ts`

## Impacto no plano Premium Enterprise

Este incremento fortalece a Fase 4 ao transformar falhas operacionais de relatórios em métrica executiva rastreável. A gestão agora enxerga não apenas a existência de alertas, mas também evidência auditada de resolução operacional via reprocessamento.
