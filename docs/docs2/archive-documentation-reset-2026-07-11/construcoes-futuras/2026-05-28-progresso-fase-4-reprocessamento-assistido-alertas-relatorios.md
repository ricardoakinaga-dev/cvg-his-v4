# Progresso Fase 4 - Reprocessamento Assistido por Alerta de Relatorio

Data: 2026-05-28

## Contexto

O fluxo de auditoria passou a abrir diretamente o agendamento relacionado a um alerta de entrega de relatorio. A proxima melhoria operacional era permitir que a equipe resolvesse o problema a partir do proprio alerta, sem localizar manualmente as entregas falhadas.

## Entrega realizada

- A tabela `Alertas operacionais` do Motor Enterprise recebeu a acao `Reprocessar alerta`.
- A acao identifica entregas falhadas e reprocessaveis do destinatario do alerta.
- O reprocessamento reutiliza o endpoint auditado `retryScheduleDelivery`.
- O feedback informa quantas entregas daquele alerta foram reprocessadas.
- O botao fica desabilitado quando nao ha entrega falhada com `executionId` para o destinatario.

## Evidencia tecnica

- Arquivos alterados:
  - `apps/spa/src/pages/reports/ReportsEnginePage.vue`
  - `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`
- Validacao executada:
  - `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Impacto Premium Enterprise

O operador consegue sair do evento auditado, abrir o agendamento e resolver o alerta recorrente em uma acao assistida. Isso reduz friccao de suporte e fecha o ciclo entre auditoria, triagem e correcao operacional.

## Proximos passos

- Destacar visualmente o agendamento aberto a partir de auditoria.
- Criar link de retorno contextual do Motor Enterprise para `/audit`.
- Consolidar quantidade de alertas resolvidos no dashboard executivo Premium.
