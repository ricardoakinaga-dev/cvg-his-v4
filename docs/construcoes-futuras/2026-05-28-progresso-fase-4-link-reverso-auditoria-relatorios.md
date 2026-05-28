# Progresso Fase 4 - Link Reverso da Auditoria para Relatorios Agendados

Data: 2026-05-28

## Contexto

O painel de auditoria ja exibia e filtrava eventos high-risk de leitura de alertas de relatorios. A proxima lacuna operacional era permitir que o gestor saisse do evento auditado e abrisse diretamente o agendamento relacionado no Motor Enterprise de Relatorios.

## Entrega realizada

- Eventos auditados com `entityType=report-schedule-delivery-alert` passaram a exibir a acao `Abrir agendamento`.
- A acao navega para `/reports/engine?scheduleId=<id-do-agendamento>`.
- O Motor Enterprise de Relatorios passou a ler `scheduleId` da rota.
- Ao abrir com `scheduleId`, a pagina carrega automaticamente:
  - historico de entregas do agendamento;
  - alertas operacionais do agendamento;
  - contexto `Entregas de <nome do agendamento>`.
- Testes cobrem tanto o link no `/audit` quanto a abertura contextual em `/reports/engine`.

## Evidencia tecnica

- Arquivos alterados:
  - `apps/spa/src/pages/audit/AuditPage.vue`
  - `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`
  - `apps/spa/src/pages/reports/ReportsEnginePage.vue`
  - `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Impacto Premium Enterprise

O fluxo de suporte deixa de depender de busca manual: um evento auditado de alerta recorrente leva diretamente ao agendamento e ao historico de entregas que originaram o risco operacional.

## Proximos passos

- Adicionar reprocessamento assistido a partir do alerta aberto.
- Destacar visualmente o agendamento aberto por query param.
- Incluir link de retorno contextual do Motor Enterprise para o painel de auditoria.
