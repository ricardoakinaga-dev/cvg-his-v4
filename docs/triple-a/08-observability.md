# Triple-A — 08 Observability

**Status:** IMPLEMENTED LOCALLY / TARGET AND ALERT DELIVERY OPEN

API e worker têm logging estruturado, correlation IDs, readiness compartilhado,
traces OTEL opcionais e métricas operacionais sem labels de tenant. A API
expõe gauges clínicos de baixa cardinalidade, incluindo pendências e pressão
do pool.

Fontes: `apps/api/src/observability.ts`, `apps/worker/src/observability.ts`,
`apps/api/src/clinical-operational-metrics.ts`,
[`docs/operations/SLO_SLI_POLICY.md`](../operations/SLO_SLI_POLICY.md) e
[`docs/engineering/SLO_AND_LOAD_PROFILE.md`](../engineering/SLO_AND_LOAD_PROFILE.md).

Testes de contrato e unidade passam. Não há prova de coleta, retenção,
dashboards, alertas acionáveis e propagação completa SPA→API→worker no
ambiente alvo; esses itens permanecem `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Problema           | Detectar falhas técnicas e operacionais sem expor PHI ou cardinalidade alta.                                         |
| Estado anterior    | Métricas e traces existiam, mas não havia prova de entrega de alertas no target.                                     |
| Decisão            | Padronizar sinais de baixa cardinalidade e fail-closed para evidência ausente.                                       |
| Implementação      | OTEL, logs estruturados, correlation IDs, readiness e gauges clínicos.                                               |
| Arquivos alterados | `apps/api/src/observability.ts`, `apps/worker/src/observability.ts`, `clinical-operational-metrics.ts`, docs de SLO. |
| Testes             | Contratos e unidade; guards de labels/segredos.                                                                      |
| Evidências         | Métricas locais e diagnósticos k6 no CI #135.                                                                        |
| Riscos residuais   | Coleta, retenção, dashboards, alertas e on-call no target.                                                           |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
