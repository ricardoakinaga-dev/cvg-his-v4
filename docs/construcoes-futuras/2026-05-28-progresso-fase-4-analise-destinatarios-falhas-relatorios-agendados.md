# Progresso Fase 4 - Analise de destinatarios com falhas em relatorios agendados

Data: 2026-05-28

## Objetivo

Avancar o suporte operacional dos relatorios agendados, destacando destinatarios com maior recorrencia de falhas dentro dos filtros ativos do historico.

## Entregue

- O card `Historico de entregas` recebeu a secao `Falhas recorrentes por destinatario`.
- A analise agrupa entregas falhadas por destinatario.
- A tabela exibe:
  - destinatario;
  - quantidade de falhas;
  - ultima falha;
  - ultimo erro.
- A ordenacao prioriza maior quantidade de falhas.
- A analise respeita os filtros ativos de status e periodo.
- O teste cobre destinatarios com uma e duas falhas e confirma recalculo ao mudar o periodo.

## Evidencias tecnicas

- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts --pool=forks` - 10/10 testes passando.

## Impacto no Premium Enterprise

A operacao passa a identificar rapidamente quais destinatarios concentram falhas de entrega. Isso melhora triagem de incidentes, direciona correcao de e-mails problematicos e reduz reprocessamentos repetidos sem diagnostico.

## Proximos passos recomendados

- Criar auditoria operacional agregada para destinatarios com falhas recorrentes.
- Criar politica de limite para evitar reprocessamentos em massa acidentais.
- Elevar falhas recorrentes para alertas operacionais quando ultrapassarem limite configurado.
