# Progresso Fase 4 - Metricas por reportId em Relatorios Agendados

Data: 2026-05-28

## Contexto

O roadmap Premium Enterprise apontava a necessidade de aprofundar a observabilidade dos relatorios agendados para diferenciar execucoes vazias de execucoes com linhas reais. A metrica anterior agregava apenas outcomes gerais do tick, sem visibilidade por `reportId`.

## Entrega realizada

- Criada a metrica Prometheus `worker_scheduled_report_executions_total`.
- A metrica possui labels:
  - `report_id`
  - `outcome`: `executed`, `exported` ou `failed`
  - `row_state`: `filled`, `empty` ou `not_executed`
- O job de relatorios agendados passou a registrar:
  - execucoes exportadas com linhas preenchidas;
  - execucoes bem-sucedidas sem destinatarios;
  - execucoes vazias;
  - falhas que impediram a execucao.
- Os testes do worker cobrem os cenarios de exportacao preenchida e falha sem execucao.

## Evidencia tecnica

- Arquivos alterados:
  - `apps/worker/src/worker-metrics.ts`
  - `apps/worker/src/jobs/scheduled-report-job.ts`
  - `apps/worker/src/jobs/scheduled-report-job.test.ts`
- Validacao executada:
  - `pnpm --filter @cvg-his-v2/worker test`

## Impacto Premium Enterprise

Esta entrega melhora a operabilidade do Motor Enterprise de Relatorios ao permitir dashboards e alertas por relatorio recorrente, separando schedules que geram dados reais de schedules que passam pelo pipeline sem conteudo operacional.

## Proximos passos

- Plugar fontes reais completas de financeiro, comercial e caixa nos resolvedores recorrentes.
- Expor painel operacional de relatorios vazios versus preenchidos.
- Criar alerta quando um `reportId` recorrente executar repetidamente com `row_state="empty"`.
