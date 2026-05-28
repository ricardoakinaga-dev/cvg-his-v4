# Progresso RC - Observabilidade e SLO operacional

## Objetivo

Fechar a lacuna de F3-06 para Release Candidate: transformar health, metricas Prometheus, SLO, OpenAPI, SPA e Dashboard em evidencia automatizada.

## Entregue

- Adicionado o gate `pnpm governance:observability`.
- O gate valida:
  - catalogo de SLOs de disponibilidade, latencia P95 e taxa de erro;
  - calculo de status, error budget e burn rate;
  - gauges Prometheus `app_slo_status`, `app_slo_error_budget_percent` e `app_slo_burn_rate`;
  - endpoints `/slos` e `/health/slos`;
  - contrato OpenAPI e api-docs;
  - painel de SLO no Cliente API;
  - SLO e foco operacional no Dashboard Premium;
  - testes de API, SPA e Dashboard.
- O readiness passou a exigir o script e este documento.
- O pacote RC passou a executar `pnpm governance:observability`.

## Validacoes locais

- `pnpm governance:observability`
- `pnpm readiness:enterprise`
- `pnpm rc:evidence`
- `pnpm rc:evidence:strict` com variaveis externas preenchidas

## Status

F3-06 deixa de depender apenas da validacao funcional previa e passa a ser criterio automatizado de Release Candidate. A observabilidade operacional esta coberta por gate local e agregada ao pacote RC.
