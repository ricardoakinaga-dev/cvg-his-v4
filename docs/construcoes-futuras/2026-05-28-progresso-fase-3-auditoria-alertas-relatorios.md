# Progresso Fase 3 - Auditoria de Alertas Operacionais de Relatorios

Data: 2026-05-28

## Contexto

Os relatorios agendados passaram a emitir alertas operacionais para falhas recorrentes por destinatario. Para atender ao criterio Enterprise de operabilidade auditavel, a leitura desses alertas tambem precisa entrar na cobertura central de auditoria operacional.

## Entrega realizada

- Adicionado requisito padrao de cobertura operacional:
  - `reports-delivery-alerts-read`
  - modulo `reports`
  - acao `report_schedule_delivery_alerts_read`
  - entidade `report-schedule-delivery-alert`
  - risco minimo `high`
- A rota `GET /reports/schedules/{scheduleId}/delivery-alerts` passou a registrar auditoria high-risk.
- O painel `/audit` passa a conseguir exibir este requisito quando o backend retornar a cobertura operacional.
- Testes adicionados no modulo de auditoria, API de relatorios e SPA de auditoria.

## Evidencia tecnica

- Arquivos alterados:
  - `packages/modules/audit/src/index.ts`
  - `packages/modules/audit/src/audit.test.ts`
  - `apps/api/src/routes/reports-routes.ts`
  - `apps/api/src/routes/reports-routes.test.ts`
  - `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`

## Impacto Premium Enterprise

Falhas recorrentes de entrega de relatorios agora fazem parte da malha de governanca. A operacao consegue provar que consultas a alertas sensiveis foram rastreadas por usuario, conta, entidade, correlacao e risco.

## Proximos passos

- Exibir resumo executivo de alertas de relatorios diretamente no painel `/audit`.
- Criar filtro rapido em auditoria para `entityType=report-schedule-delivery-alert`.
- Encadear acao de reprocessamento em lote a partir do alerta auditado.
