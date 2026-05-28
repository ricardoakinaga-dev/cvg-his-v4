# Progresso Fase 4 - Contexto de Auditoria no Motor de Relatorios

Data: 2026-05-28

## Contexto

O link reverso da auditoria ja abria o agendamento no Motor Enterprise de Relatorios. A melhoria seguinte era deixar claro para o operador que ele chegou ali a partir de uma trilha auditada e oferecer retorno direto ao painel de auditoria.

## Entrega realizada

- O Motor Enterprise agora interpreta `origin` e `originLabel` vindos da rota.
- Quando um `scheduleId` e uma origem sao informados, a pagina exibe o card `Agendamento aberto pela auditoria`.
- O card mostra:
  - nome do agendamento;
  - `reportId`;
  - quantidade de destinatarios;
  - botao de retorno contextual, como `Voltar para Auditoria`.
- O carregamento por `scheduleId` continua abrindo historico de entregas e alertas operacionais automaticamente.

## Evidencia tecnica

- Arquivos alterados:
  - `apps/spa/src/pages/reports/ReportsEnginePage.vue`
  - `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`
- Validacao executada:
  - `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Impacto Premium Enterprise

O fluxo auditavel fica mais claro para operacao e suporte: o usuario entende qual agendamento esta investigando, de onde veio e como retornar para a auditoria sem perder contexto.

## Proximos passos

- Registrar evento auditado quando o operador reprocessar a partir do alerta contextual.
- Consolidar alertas resolvidos em indicador executivo.
- Destacar o item selecionado na tabela de agendamentos.
