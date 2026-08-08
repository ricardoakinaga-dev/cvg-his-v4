# 0342 - CHECKLIST DE RELEASE POR AMBIENTE - 2026-04-22

**Taxonomia:** `OPERACIONAL`
**Papel no sistema documental:** checklist objetivo de promocao e verificacao por ambiente
**Ler em conjunto com:** `0341-RELATORIO-EVIDENCIAS-OPERACAO-PREMIUM-2026-04-22.md`, `0100-EXECUTION-TRACKER.md`, `201-BACKLOG-RUMO-96.md`

**Data UTC:** `2026-04-22`

---

## 1. Regra de uso

Este checklist nao substitui gates automatizados. Ele organiza a verificacao humana e operacional minima antes de promover o programa entre ambientes.

Status aceitos por linha:

- `ok`
- `pendente`
- `bloqueado`

---

## 2. DEV

Objetivo:

- validar desenvolvimento local e stacks descartaveis sem drift estrutural.

Checklist:

| Item | Status esperado | Evidencia |
|---|---|---|
| `pnpm typecheck` | `ok` | sem erro de tipagem |
| `pnpm build` | `ok` | workspace compila |
| `pnpm test:integration` | `ok` | suite verde |
| `pnpm test:smoke` | `ok` | `13 passed` ou baseline vigente |
| `node scripts/validate-openapi.js` | `ok` | contrato valido |
| `node infra/scripts/check-cutover-readiness.mjs` | `ok` | `failures=0` |
| `GET /health` | `ok` | responde `200` |
| `GET /ready` | `ok` | responde `200` |
| migrations canonicas | `ok` | `packages/db/migrations` aplicadas |
| docs da rodada | `ok` | tracker/backlog/checklist atualizados |

Bloqueios:

- qualquer drift de migration;
- falha em `smoke` ou `integration`;
- contrato OpenAPI invalido.

---

## 3. STAGING

Objetivo:

- provar que a stack production-like sobe de forma coerente e observavel.

Checklist:

| Item | Status esperado | Evidencia |
|---|---|---|
| imagens oficiais atualizadas | `ok` | tag/build aplicado na stack canonica |
| `docker compose ... ps` | `ok` | `api`, `worker`, `spa`, `postgres`, `redis` saudaveis |
| `GET /health` e `GET /ready` | `ok` | `productionReady=true` |
| `GET /slos` | `ok` | `overallStatus=healthy` ou desvio explicado |
| Prometheus alerts alinhados | `ok` | teste de alinhamento verde |
| dashboard Grafana vigente | `ok` | json versionado em `infra/observability/grafana` |
| restore drill mais recente | `ok` | bundle e report disponiveis |
| release notes da rodada | `ok` | tracker e docs enterprise atualizados |
| smoke regression | `ok` | ao menos uma rodada verde no ambiente alvo |

Bloqueios:

- stack sem health/readiness;
- observabilidade sem SLO/alertas coerentes;
- ausencia de restore drill recente.

---

## 4. PROD

Objetivo:

- promover somente quando houver seguranca, observabilidade e rollback defensavel.

Checklist:

| Item | Status esperado | Evidencia |
|---|---|---|
| gate `90+` ou `96` elegivel | `ok` | conforme `0340` |
| checklist DEV e STAGING completos | `ok` | sem item `bloqueado` |
| backup novo gerado | `ok` | bundle versionado antes da promocao |
| restore drill recente | `ok` | report da mesma fase ou imediatamente anterior |
| `deploy:check` | `ok` | `failures=0` |
| health, ready, slos | `ok` | todos respondem e sem degradacao critica |
| smoke pos-deploy | `ok` | fluxo principal verde |
| rollback plan conhecido | `ok` | imagem anterior, compose canonico e dados protegidos |
| doc de evidencias atualizado | `ok` | `0100`, `0339`, `201` e relatorio da rodada |

Bloqueios:

- ausencia de backup/restore drill;
- score promovido sem gate formal;
- release sem smoke pos-deploy;
- documentacao operacional sem atualizacao.

---

## 5. Fechamento da rodada

Antes de considerar uma release encerrada:

1. registrar comandos e resultados no tracker;
2. atualizar status no checklist formal da fase;
3. apontar qualquer debito residual com owner e proxima data;
4. derrubar infraestrutura de teste descartavel que nao faca parte da stack canonica.
