# Progresso Fase 4 - Alerta visual de relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar a operacao Premium dos relatorios agendados, tornando falhas recentes visiveis diretamente no Motor Enterprise de Relatorios.

## Entregue

- A tabela de agendamentos agora exibe o status operacional do schedule como badge.
- Quando `lastError` esta preenchido, a linha exibe tambem o badge `Falha no ultimo envio`.
- A mensagem da ultima falha fica destacada visualmente.
- O comportamento preserva o status ativo/pausado, evitando confundir falha de envio com pausa operacional.
- O teste da pagina foi atualizado para validar que schedules com erro exibem o alerta visual.

## Evidencias tecnicas

- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 3/3 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.

## Impacto no Premium Enterprise

A operacao consegue identificar falhas de relatorios agendados sem consultar logs, banco ou Prometheus. Isso melhora resposta a incidentes e torna a automacao de relatorios mais adequada para uso enterprise assistido.

## Proximos passos recomendados

- Linkar o badge de falha a um historico de entregas por destinatario.
- Exibir contador de schedules com erro nos KPIs da pagina.
- Criar alerta global quando houver schedules ativos com `lastError`.

