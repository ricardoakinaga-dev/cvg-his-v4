# Progresso Fase 4 - Alertas Operacionais de Entregas de Relatorios

Data: 2026-05-28

## Contexto

O Motor Enterprise de Relatorios ja registrava entregas por destinatario, reprocessamento individual, reprocessamento em lote e analise visual de falhas recorrentes na SPA. A lacuna seguinte era transformar esse sinal em contrato operacional backend/API para que auditoria, suporte e dashboards possam consumir a mesma leitura.

## Entrega realizada

- Criado o contrato de dominio `ReportScheduleDeliveryAlertSummary`.
- Criado o metodo `ReportsService.listScheduleDeliveryAlerts(...)`.
- Alertas sao emitidos quando um destinatario acumula falhas recorrentes em um agendamento.
- Criado endpoint:
  - `GET /reports/schedules/{scheduleId}/delivery-alerts`
- OpenAPI atualizado com:
  - path `listReportScheduleDeliveryAlerts`
  - schemas `ReportScheduleDeliveryAlert` e `ReportScheduleDeliveryAlertListResponse`
- SPA do Motor Enterprise de Relatorios passou a carregar e exibir a secao `Alertas operacionais` junto ao historico de entregas.
- Testes adicionados em dominio, API e SPA.

## Evidencia tecnica

- Arquivos alterados:
  - `packages/modules/reports/src/index.ts`
  - `packages/modules/reports/src/reports.test.ts`
  - `apps/api/src/routes/reports-routes.ts`
  - `apps/api/src/routes/reports-routes.test.ts`
  - `apps/api/src/openapi.yaml`
  - `apps/spa/src/services/reports.ts`
  - `apps/spa/src/pages/reports/ReportsEnginePage.vue`
  - `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Impacto Premium Enterprise

Esta entrega reduz dependencia de analises apenas visuais na SPA e cria um sinal operacional reutilizavel para auditoria, suporte, SLOs e gestao executiva. Falhas recorrentes de entrega deixam de ser apenas linhas de historico e passam a ser alertas consultaveis por contrato.

## Proximos passos

- Integrar estes alertas ao painel central de auditoria operacional.
- Adicionar filtro global de alertas por `reportId` e severidade.
- Criar acao assistida para reprocessar todas as entregas vinculadas a um alerta.
