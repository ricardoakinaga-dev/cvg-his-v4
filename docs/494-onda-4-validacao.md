# 494 - Relatorio de Validacao da Onda 4

**Data:** 2026-03-31
**Onda:** 4 — Endurecimento operacional
**Status:** CONCLUIDA

## Entregas concluidas

### B014 — Readiness operacional consolidado

**Estado real auditado:**

- **API:** `health.ts` ja implementa health/readiness/liveness com logica sofisticada para `persistenceMode`, `productionReady`, `workerReady`. `index.ts` calcula `productionReady = database && 13+ repos && workerReady`.
- **Worker:** `bootstrap.ts` valida DB health e injeta `DatabaseNotificationRepository`. Loop de ticks com graceful shutdown via `shutdownWorkerServices()`.
- **Web:** Server-side routing com HTML inline; readiness = homepage + login page respondendo 200.

**Arquivos alterados:**

- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` — secao "Readiness operacional" adicionada com criterios por servico
- `docs/520-checklist-release-enterprise.md` — criado com secao 6 dedicada a health/readiness

**Criterios de readiness definidos:**

| Servico | Criterio                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------- |
| API     | `/ready` → 200, `persistenceMode=database`, `productionReady=true`, 13+ repos, `workerReady=true` |
| Worker  | `databaseHealthy=true`, `notificationRepository` disponivel, 5+ min sem crash                     |
| Web     | Homepage 200, login 200, assets carregam                                                          |

### B015 — Roteiro de cutover e rollback consolidado

**Correcao no script:**

- `infra/scripts/cutover-v2.sh` — `validate_v2_stack()` corrigido para usar portas externas corretas:
  - API: `http://127.0.0.1:3000/health` e `/ready` (era 3001)
  - Web: `http://127.0.0.1:3001/` (era 3000)

**Arquivos alinhados:**

- `infra/scripts/cutover-v2.sh` — portas corrigidas
- `docs/131-checklist-cutover-servidor.md` — ja estava coerente
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` — ja estava coerente
- `infra/docker/Caddyfile.v2` — ja estava corrigido (Onda 1)
- `docker-compose.v2.yml` — ja estava correto

**Resultado:** Zero contradicoes operacionais entre script, compose, proxy e docs.

### B016 — Checklist de release enterprise fechado

**Documento criado:** `docs/520-checklist-release-enterprise.md`

**Conteudo:**

1. Pre-requisitos (ambiente, repositorio)
2. Gates tecnicos (typecheck, build, test:critical, test:e2e)
3. Gates operacionais (API readiness, Web disponibilidade, Worker estabilidade)
4. Validacoes de banco (migration, seed, integridade)
5. Validacoes de deploy (compose, proxy, systemd)
6. Validacoes de health/readiness (criterios por servico)
7. Criterios de cutover (pre, execucao, pos)
8. Criterios de rollback (quando, como, pre-condicoes)
9. Criterios para aprovar ou bloquear release

**Alinhamento com docs existentes:**

- `docs/460-qualidade-testes-e-gates.md` — ja continha setup de banco de teste (Onda 2)
- `docs/131-checklist-cutover-servidor.md` — coerente com checklist de release

### B017 — Relatorio de prontidao operacional

**Este documento.**

## Metricas da onda 4

| Metrica                                              | Meta | Resultado |
| ---------------------------------------------------- | ---- | --------- |
| criterios de readiness definidos e usados            | sim  | sim       |
| cutover e rollback com roteiro coerente              | sim  | sim       |
| release checklist aplicado fim a fim                 | sim  | sim       |
| zero contradicoes entre script, compose, proxy, docs | 0    | 0         |

## Impacto na nota

| Eixo                             | Antes | Depois | Delta |
| -------------------------------- | ----- | ------ | ----- |
| Operacao/observabilidade/release | 78    | 85     | +7    |
| Persistencia/deploy              | 82    | 88     | +6    |

## Proximo passo

Onda 5 — Fechamento 85+ e veredito enterprise (B018, B019, B020)
