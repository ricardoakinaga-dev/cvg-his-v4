# Progresso Fase 3 - Observabilidade e SLO operacional

Data: 2026-05-28

## Objetivo

Avancar o item F3-06 do roadmap Premium Enterprise: validar health, metrics e SLOs com uma superficie operacional consumivel por API, Prometheus, OpenAPI e SPA.

## Entregue

- Endpoint publico `GET /slos` com snapshot operacional, relatorio de conformidade, status geral, budget, burn rate e links de runbook.
- Alias operacional `GET /health/slos` para manter a familia de probes sob `/health`.
- Gauges Prometheus:
  - `app_slo_status{slo_id,category}`
  - `app_slo_error_budget_percent{slo_id,category}`
  - `app_slo_burn_rate{slo_id,category}`
- Normalizacao de rota `/slos` para evitar cardinalidade indevida em metricas HTTP.
- OpenAPI atualizado com `/slos`, `/health/slos` e schemas de SLO.
- `/api-docs` atualizado para anunciar o endpoint de SLO.
- SPA atualizada no Cliente API com painel "SLO e orcamento de erro":
  - disponibilidade 1h;
  - latencia P95 5min;
  - taxa de erro 5min;
  - status por objetivo;
  - budget e burn rate por SLO.

## Evidencias tecnicas

- `apps/api/src/routes/health-routes.ts`
- `apps/api/src/metrics.ts`
- `apps/api/src/slos.ts`
- `apps/api/src/openapi.yaml`
- `apps/api/src/routes/openapi-routes.ts`
- `apps/api/src/server.test.ts`
- `apps/spa/src/services/health.ts`
- `apps/spa/src/pages/api-client/ApiClientPage.vue`
- `apps/spa/src/pages/__tests__/EnterpriseSurfaces.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/server.test.js` - 26/26 testes passando
- `pnpm validate:openapi` - OpenAPI valido, 286 paths, 324 schemas
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/__tests__/EnterpriseSurfaces.test.ts --pool=forks` - 12/12 testes passando
- `pnpm --filter @cvg-his-v2/spa build`
- Conferencia do lockfile preservando `vue-component-type-helpers@3.2.7`

## Atualizacao RC

O incremento posterior `2026-05-28-progresso-rc-observabilidade-slo-evidencias.md` adicionou o gate `pnpm governance:observability`, validando catalogo de SLOs, calculo de status/budget/burn rate, gauges Prometheus, endpoints `/slos` e `/health/slos`, OpenAPI, Cliente API, Dashboard Premium e testes.

## Status

F3-06 fica atendido como criterio tecnico local de Release Candidate. A validacao final ainda depende das evidencias externas gerais do RC.
