# 0303 — Plano de Correcao de Gaps Docs vs Codigo + Roadmap + Backlog

**Status:** em atualizacao + nova rodada de construcao
**Data:** 2026-04-14
**Auditado em:** 2026-04-15 (auditoria profunda vs codigo)
**Ultima atualizacao:** 2026-04-15 R2 — auditoria profunda + scorecard corrigido + plano de execucao Round 2
**Base:** `0302-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-14.md`
**Escopo:** transformar GAPs identificados em plano executavel, roadmap por horizonte e backlog priorizado

---

## 1. Leitura dos Gaps Priorizados — AUDITADO 2026-04-15 vs Codigo

| Prioridade | Domain | Gap | Score Real | Status Real |
|------------|--------|-----|-----------|-------------|
| P0 | PIX | **C1 FEITO** — PagarMe agora e DEFAULT (server.ts:381-393). `usePixMock` defaulted false. `LocalPixPaymentGateway` e fallback. `PIX_MOCK_MODE=true` forcing mock. Score sobe 70->85. Restante: validar intent->confirm em staging. | **85/100** | PARTIAL — C1 done, falta staging validation |
| P0 | server.ts | Reduzido de 5431 para **3119 linhas** (-**42.6%**). Dominios extraidos para 14+ arquivos de rota. Ainda monolitico porem em progresso. Score doc estava 40, real e **~80** dado o progresso. | **80/100** | EM PROGRESSO — reducao MELHOR que reportado (doc decia 3846, real 3119) |
| P0 | Multi-tenancy RLS | `withTenantQuery` centralizado em `tenant-context`; 19+ repositorias usam SET LOCAL; `requireAccountId` fail-fast; RLS enforcement completo ao nivel de query | **85/100** | ✅ DONE — enforcement completo |
| P1 | Secrets Manager | **DONE** — `@cvg-his-v2/secrets` criado com `VaultSecretsProvider` (AppRole+KV-v2) + `EnvSecretsProvider` fallback; integrado em bootstrap.ts + index.ts; ADR-010 documenta decisao; Score 75/100 | **75/100** | ✅ DONE |
| P1 | Feature Flags — consumo | `runtimeDistributedStateEnabled` definidade em feature-flags.ts:35-43, computada em createApiFeatureFlags:125-126, consumida pelo auth rate limiter (auth-rate-limiter.ts:43); 1 gate feito (auth rate limiter). Score: 75/100 | **75/100** | **PARTIAL** (1 gate feito — auth rate limiter) |
| P1 | Feature Flags — metrics | `createDatabaseFeatureFlagProvider` agoraaceita `metrics?: FeatureFlagMetricsCollector` (database-feature-flag.repository.ts:196-203); database provider usado como upstream PRIMARY no composite da API (feature-flags.ts:87-93); metrics gravados em todas avaliacoes/fallback/erros. Score 90/100 | **90/100** | ✅ DONE |
| P1 | Fiscal DB schemas | Schemas Drizzle criados (cfop-entries, icms-rules, ncm-entries, pis-cofins-rules, nfse-layouts). DatabaseFiscalRepository com CRUD completo. Migracao 0017 + seed. FiscalService async com DB repo como primary + fallback in-memory. HandleFiscalRoutes async. POST/PATCH endpoints RESTANTES. Score 80/100 | **80/100** | **PARTIAL** (schemas+repo+migration+seed+service done) |
| P2 | AI/ML integration | `SmartSchedulingService` + `ModelRegistryService` + `FeatureStoreService` wired in runtime.ts:107-113; ML exposto em `/health/ready` via `dependencies.ml`; teste em health.test.ts confirma wiring. Score 100/100 | **100/100** | ✅ DONE |
| P2 | Platform artifacts | Helm charts criados em `charts/helm/` com 4 charts (api, worker, spa, web) + umbrella chart + README. API: deployment+service+ingress+hpa+networkpolicy+pdb+servicemonitor+configmap+secret+_helpers. Worker: deployment+configmap+secret+_helpers. SPA/Web: deployment+service+ingress+hpa+nginx-configmap+_helpers. Score 75/100 | **75/100** | ✅ DONE |
| P2 | Coverage threshold | CI job executa `pnpm test:coverage` (ci.yml:440). POREM threshold atual e **10/28/40/10** (nao 60% como reportado). vitest threshold existe e enforcea exit 1 se coverage cair abaixo, mas valores sao faceis (10% lines vs 60% meta). Score 100 no doc mas real e **~50**. | **50/100** | **PARTIAL** (CI gate existe, thresholds faceis demais) |
| P2 | Rate limiter helper | `createAuthRateLimiter` importado em server.ts:9, usado em server.ts:400 com suporte Redis configuravel. ANTERIOR ao plano — JA FEITO. Score 100/100 | **100/100** | **DONE** |
| P3 | Module Feature Flags | `worker-metrics.ts` JA EXISTE com `createWorkerFeatureFlagMetricsCollector()` retornando `FeatureFlagMetricsCollector` Prometheus-backed; usado em worker/index.ts:64. Score 100/100 | **100/100** | **DONE** |
| P3 | Coverage 80%+ | Coverage ~28% conforme 0301. 13 arquivos de teste em apps/api/src/. CI NAO esta sem threshold — thresholds existem (10/28/40/10). Doc decia "sem threshold" estava ERRADO. Score ajustado: **40** (CI gate existe porem com thresholds faceis). | **40/100** | **PARTIAL** (CI gate existe, meta 80% longe) |
| P3 | Chaos engineering | **DESCOBERTA CRITICA**: `packages/chaos/` EXISTE com engine completo, 5 fault types, 5 experiments, metrics Prometheus. POREM NAO esta wired ao runtime — zero imports em server.ts/runtime.ts. Score existence: ~50, wired: 0. Doc decia "zero code" estava ERRADO. | **25/100** | **PARTIAL** (codigo existe completo, porem nao integrado) |
| P3 | Performance gates | k6 benchmark existe em `benchmarks/k6/api-benchmark.js` com 10 cenarios e SLOs (slos.json). PgBouncer NAO configurado. CDN NAO configurado. Score 40/100 | **40/100** | **PARCIAL** (k6+SLOs existem, pooling+CDN faltam) |

---

## 1b. Scorecard Resumo — Pos-Auditoria 2026-04-15 R2

| GAP | Titulo | Score | Status | Prox Acao |
|-----|--------|-------|--------|-----------|
| GAP-01 | PIX PagarMe wired | 85 | **PARTIAL** (C1 done) | GAP-01-STAGING: validar fluxo intent->confirm em staging |
| GAP-02 | server.ts reducao | **80** | EM PROGRESSO | server.ts 3119 linhas (-42.6%). Proxima meta: <2500 |
| GAP-03 | RLS enforcement | 85 | ✅ DONE | Testar em staging queries sem accountId |
| GAP-04 | Secrets Manager | 75 | ✅ DONE | Vault AppRole + KV-v2 provider + EnvSecretsProvider fallback + bootstrap integration + ADR-010 |
| GAP-05 | FF consumo flag | 75 | **PARTIAL** (auth rate limiter gate done) | Identificar gates adicionais: session Redis, distributed cache, encounter timeline |
| GAP-06 | FF database metrics | 90 | ✅ DONE | `createDatabaseFeatureFlagProvider` instrumentado com metrics; database provider usado como upstream no composite da API |
| GAP-07 | Coverage threshold CI | **50** | **PARTIAL** | Elevar thresholds para H2 (20/40/45/20); GAP-08 added fiscal tests |
| GAP-08 | Fiscal DB schemas | 80 | **PARTIAL** (schemas + repository + migration + seed + service async done) | FiscalService DB-backed (async wiring done) + POST/PATCH endpoints |
| GAP-09 | AI/ML integration | 100 | ✅ DONE | SmartSchedulingService wired in runtime.ts |
| GAP-10 | Helm/K8s | 75 | ✅ DONE | Charts Helm completos para api/worker/spa/web + umbrella chart + README |
| GAP-11 | Rate limiter helper | 100 | ✅ DONE | Nenhuma — ja feito |
| GAP-12 | Worker metrics | 100 | ✅ DONE | Nenhuma — ja feito |
| GAP-13 | Coverage threshold (dup) | REMOVE | REMOVE | Removido do backlog |
| GAP-14 | Coverage 80%+ | **40** | **PARTIAL** | CI gate existe (thresholds 10/28/40/10), meta 80% ainda distante |
| GAP-15 | Chaos engineering | **25** | **PARTIAL** (codigo chaos completo existe porem nao wired) | Integrar chaos package ao runtime (health/startup hook) |
| GAP-16 | Performance gates | 40 | **PARCIAL** | PgBouncer + CDN + executar k6 em staging |

**Resumo: 7 DONE | 1 EM PROGRESSO | 4 PARCIAL | 2 TODO** (GAP-04/GAP-05+GAP-08+GAP-14+GAP-15 = PARCIAL)
**Score Release Readiness atual: ~72/100**

---

## 2. Roadmap por Horizonte — R2

### Horizonte 0 — Cleanup immediate (0-2 semanas) — RESTANTE
**Objetivo:** fechar P0 blockers para release production-ready

| Item | Responsabilidade | Dependencia | Estimativa |
|------|-----------------|-------------|------------|
| HG-01: Wire `PagarMePixAdapter` ao runtime (staging validation) | API + PIX module | Nenhuma | 3 dias |
| HG-02: Extrair dominios restantes de server.ts | API team | Nenhuma | 5 dias |

### Horizonte 1 — Estabilizacao (2-6 semanas) — R2
**Objetivo:** fechar gaps P1, eliminar divida tecnica critica

| Item | Responsabilidade | Dependencia | Estimativa |
|------|-----------------|-------------|------------|
| HG-04: Codificar Secrets Manager | Platform team | Nenhuma | 5 dias |
| HG-05: Consumir `runtime.distributed_state.enabled` em handler/runtime | API team | FF infrastructure OK | 2 dias |
| HG-06: Instrumentar `createDatabaseFeatureFlagProvider` com metrics | API team | FF infrastructure OK | 2 dias |
| **HG-07 R2: Elevar coverage thresholds para H2 (20/40/45/20)** | CI/DevOps | GAP-08 fiscal tests adicionados | 1 dia |
| **HG-08 R2: POST/PATCH endpoints para administracao fiscal** | Fiscal team | GAP-08 migration+seed+service ready | 5 dias |
| **HG-09 R2: Integrar packages/chaos ao runtime** | API team | packages/chaos existe (nao wired) | 3 dias |

### Horizonte 2 — Operacionalizacao (6-16 semanas) — R2
**Objetivo:** fechar gaps P2, integrar modulos desconectados

| Item | Responsabilidade | Dependencia | Estimativa |
|------|-----------------|-------------|------------|
| HG-10: Integrar AI/ML module ao runtime | ML team | services+repos existem | 8 dias |
| HG-11: Criar Helm charts e estrutura K8s | Platform team | Nenhuma | 10 dias |
| HG-12: Refatorar rate limiter para uso via helper | API team | Nenhuma | 2 dias |
| HG-13: Instrumentar worker com metrics collector | Worker team | FF infrastructure OK | 2 dias |

### Horizonte 3 — Excelencia (16+ semanas)
**Objetivo:** fechar gaps P3, evoluir para maturity enterprise

| Item | Responsabilidade | Estimativa |
|------|-----------------|------------|
| HG-14: Coverage 80%+ (elevar thresholds progressivamente) | All teams | Contínuo |
| HG-15: Chaos engineering — game days + runbooks | Platform team | 8 dias |
| HG-16: Performance optimization (PgBouncer + CDN) | All teams | 8 dias |
| HG-17: SOC2 certification evidence (E5-04) | Compliance team | 8 dias |

---

## 3. Backlog Operacional — GAP-* Series (R2)

### GAP-01 a GAP-03: P0 Blockers

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-01 | Wire PagarMePixAdapter em producao | **PARTIAL** — `PagarMePaymentGatewayAdapter` existe (payment-gateway.ts:92-99) e wireado condicionalmente em server.ts:381-393. `usePixMock` default false (PagarMe default). `LocalPixPaymentGateway` e fallback. Score: 85/100. Acoes restantes: validar intent->confirm em staging. | P0 | 3 dias | CONDICIONAL |
| GAP-02 | Extrair server.ts — hotspot 1 | **MAJOR CORRECTION**: Reduzido de 5431 para **3119 linhas** (-**42.6%**). Doc decia 3846 (-29%) mas audit real mostra 3119. Rotas extraidas para 14+ arquivos dedicados. Meta atual: <2500 linhas. Score: real ~80, doc decia 40/65. Acoes restantes: extrair dominios restantes (discharges+billing+prescription-executions ~623 linhas, webhooks+payments+api-keys ~550 linhas). | P0 | 5 dias | EM PROGRESSO |
| GAP-03 | Implementar RLS enforcement | ✅ FEITO. `withTenantQuery` centralizado em `tenant-context` — todas as 19+ operacoes de repository passam por `SET LOCAL app.current_account_id`. Repos migrados: billing, discharges, financial, inventory, scheduling, users, access-control, api-keys, triage, staff, services, quotes, products, prescription-executions, counter-sales, cash, event-bus, feature-flags + pix-transaction. Cada query executa `BEGIN` + `SELECT set_config('app.current_account_id', $1, true)` antes de operar — RLS policies no DB recebem o accountId correto. `requireAccountId()` fail-fast. Score: 85/100. | P0 | 4 dias | ✅ DONE |

### GAP-04 a GAP-08: P1 Security + Completude

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-04 | Codificar Secrets Manager | ✅ FEITO. `@cvg-his-v2/secrets` package criado com `VaultSecretsProvider` (AppRole+KV-v2) + `EnvSecretsProvider` fallback. Integrado em `apps/api/src/index.ts:63-72` (bootstrap). ADR-010 documenta decisao. Score: 75/100. | P1 | 5 dias | ✅ DONE |
| GAP-05 | Consumir `runtime.distributed_state.enabled` | **PARTIAL** — Flag definida em feature-flags.ts:35-43, computada em createApiFeatureFlags:125-126, consumida pelo auth rate limiter (auth-rate-limiter.ts:43: `canUseRedis = options.runtimeDistributedStateEnabled === true`). 1 gate feito. Acoes restantes: gates para session Redis, distributed cache, encounter timeline. Score: 75/100. | P1 | 2 dias | PARTIAL |
| GAP-06 | Instrumentar database provider com metrics | ✅ FEITO. `createDatabaseFeatureFlagProvider` aceita `metrics?: FeatureFlagMetricsCollector` (database-feature-flag.repository.ts:196-203). Database provider usado como **upstream PRIMARY** no composite da API (feature-flags.ts:87-93). Todos os caminhos de avaliacao chamam `metrics.recordEvaluation/recordFallback/recordError`. Score: 90/100. | P1 | 2 dias | ✅ DONE |
| GAP-07 | Coverage threshold no CI | **CORRECAO CRITICA**: CI job existe (ci.yml:440 executa `pnpm test:coverage`), thresholds existem (vitest.config.ts:111-123) e **enforcam exit 1 se coverage cair abaixo**. POREM valores sao faceis: lines=10, functions=28, branches=40, statements=10 — **NAO 60%** como o doc decia. GAP-07 score real ~50, nao 100. Acao: elevar thresholds para H2 (20/40/45/20). GAP-13 removido como dup. | P1 | 1 dia | PARTIAL |
| GAP-08 | Migrar fiscal ICMS/CFOP/NCM para DB | **PARTIAL FEITO** — (1) schemas Drizzle criados em packages/db/src/schema/: cfop-entries.ts, icms-rules.ts, ncm-entries.ts, pis-cofins-rules.ts, nfse-layouts.ts. (2) DatabaseFiscalRepository em packages/modules/fiscal/src/database-fiscal.repository.ts com todos os metodos CRUD. Build OK. (3) migracao 0017_fiscal_tables.sql + seed 0017_fiscal_tables.seed.sql criados. (4) FiscalService agora async com DatabaseFiscalRepository como primary + fallback in-memory. (5) handleFiscalRoutes async (server.ts await). (6) testes fiscal-routes.test.ts atualizados para async/await. RESTANTE: POST/PATCH endpoints para administracao fiscal. Score: 80/100. | P1 | 5 dias | PARTIAL |

### GAP-09 a GAP-13: P2 Integracao + Infraestrutura

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-09 | Integrar AI/ML ao runtime | ✅ FEITO. SmartSchedulingService + ModelRegistryService + FeatureStoreService wired in `runtime.ts:107-113`. ML exposto em `/health/ready` via `dependencies.ml`. Teste em `health.test.ts:19` confirma wiring. Score: 100/100. | P2 | 8 dias | ✅ DONE |
| GAP-10 | Helm charts + K8s manifests | ✅ FEITO. estrutura `charts/helm/` criada com 4 charts completos (api, worker, spa, web) + umbrella chart. API: Chart.yaml+values.yaml+deployment.yaml (probes+initContainers)+service.yaml+ingress.yaml+hpa.yaml+networkpolicy.yaml+pdb.yaml+servicemonitor.yaml+configmap.yaml+secret.yaml+_helpers.tpl. SPA/Web: nginx configmap com SPA routing. README.md com quickstart+troubleshooting+production checklist. Score: 75/100. | P2 | 10 dias | ✅ DONE |
| GAP-11 | Refatorar rate limiter via helper | ✅ ANTERIOR AO PLANO — JA FEITO. server.ts:9 importa `createAuthRateLimiter`; server.ts:400 usa com suporte Redis configuravel + `runtimeDistributedStateEnabled` gate. Helper em `apps/api/src/http/auth-rate-limiter.ts`. Score: 100/100. | P2 | 2 dias | DONE |
| GAP-12 | Instrumentar worker com metrics collector | ✅ ANTERIOR AO PLANO — JA FEITO. `worker-metrics.ts:55` com `createWorkerFeatureFlagMetricsCollector()` Prometheus-backed. worker/index.ts:64 passa metrics a FF config. `/metrics` exporta `worker_feature_flag_*`. Score: 100/100. | P2 | 2 dias | DONE |
| GAP-13 | ~~Coverage threshold CI (DUPLICADO)~~ | DUPLICADO — ver GAP-07. Removido. | P2 | 1 dia | REMOVE |

### GAP-14 a GAP-16: P3 excelencia

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-14 | Coverage 80%+ | **CORRECAO**: Doc decia "CI sem threshold" (score 28). **FALSO** — CI tem thresholds configurados (10/28/40/10). Threshold enforcement funciona (vitest exit 1). POREM valores faceis (10% lines vs meta 80%). Atual: 13 arquivos de teste em apps/api/src/. Fases: H1(10)->H2(20)->H3(40)->H4(60)->GAP-14(80%). Acoes restantes: (1) elevar thresholds progressivamente; (2) expandir suite de testes cobrindo dominios de risco (fiscal, payments, auth). Score ajustado: 40/100. | P3 | Contínuo | PARTIAL |
| GAP-15 | Chaos engineering | **DESCOBERTA CRITICA**: `packages/chaos/` EXISTE com codigo completo: ChaosEngine class (singleton, registry), 5 fault types (error-fault, timeout-fault, resource-fault, delay-fault), 5 experiments (database-failure, redis-failure, network-latency, worker-failure, api-latency), Prometheus metrics (chaos_experiments_total, chaos_faults_injected_total). POREM NAO esta wired ao runtime — zero imports em server.ts ou runtime.ts. Score existence: ~50, wired: 0. Acao: integrar chaos package ao runtime (health/startup hook + endpoint de trigger). Score: 25/100. | P3 | 8 dias | PARTIAL |
| GAP-16 | Performance gates | k6 benchmark JA EXISTE em `benchmarks/k6/api-benchmark.js` com 10 cenarios e SLOs em `slos.json` (P95<200ms, P99<500ms, error rate<0.1%). POREM PgBouncer NAO configurado (sem pooler externo, overhead no Postgres). CDN NAO configurado. `POSTGRES_MAX_CONNECTIONS` NAO exposto como env var. Acoes: (1) configurar PgBouncer; (2) configurar CDN; (3) executar k6 em staging validando SLOs. Score: 40/100. | P3 | 8 dias | PARCIAL |

---

## 4. Ordem de Execucao Recomendada — R2

```
Semana 0-2 (H0) — RESTANTE:
  GAP-01 (PIX staging validation)
  GAP-02 (server.ts reducao)

Semana 2-6 (H1) — R2:
  GAP-04 (Secrets Manager) ✅ DONE
  GAP-05 (runtime.distributed_state.enabled consumo) — PARTIAL
  GAP-06 (database provider metrics) ✅ DONE
  GAP-07 (coverage threshold) — **ELEVAR THRESHOLDS PARA H2 (20/40/45/20)**
  GAP-08 (fiscal DB) — **POST/PATCH endpoints** (migration+seed+service done)
  GAP-15 (chaos) — **INTEGRAR packages/chaos ao runtime** (3 dias)

Semana 6-16 (H2) — ATUALIZADO:
  GAP-09 (AI/ML integration) ✅ DONE
  GAP-10 (Helm/K8s) ✅ DONE
  GAP-16 (PgBouncer + CDN + k6 SLO validation)

Semana 16+ (H3):
  GAP-14 (coverage 80% — elevar thresholds progressivamente)
  GAP-15 (chaos — game days + runbooks)
  GAP-16 (PgBouncer + CDN)
```

**GAP-11 e GAP-12 removidos da ordem — ja feitos antes do plano.**

**Bloqueios:**
- GAP-05 depende de GAP-03 (RLS OK antes de distribuir state)
- GAP-06 depende de FF infrastructure (ja existe, OK)
- GAP-08 depende de fiscal module existente (ja existe, OK)
- GAP-09 depende de ML module services OK (ja existe, OK)
- GAP-10 pode ser executado em paralelo com qualquer um
- **GAP-15**: packages/chaos existe mas precisa ser integrado ao runtime
- **GAP-07**: precisa de GAP-08 (testes fiscais) antes de elevar thresholds

---

## 5. Metricas de Progresso — R2

| Metrica | Baseline | Atual (2026-04-15 real) | Meta H0 | Meta H1 | Meta H2 | Meta H3 |
|----------|---------|----------------------|---------|---------|---------|---------|
| server.ts linhas | 5431 | **3119** (-42.6%) | <4500 | <3500 | <2500 | <1500 |
| Coverage | ~28% | ~28% (sem melhoria) | 35% | 45% | 60% | 80% |
| P0 blockers | 3 | **1** (GAP-01 CONDITIONAL + GAP-02 em progresso) | 0 | 0 | 0 | 0 |
| P1 gaps | 6 | **3** (GAP-04 DONE, GAP-05 PARTIAL, GAP-06 DONE) | 3 | 0 | 0 | 0 |
| P2 gaps | 5 | **2** (GAP-07 PARTIAL, GAP-08 PARTIAL; GAP-09/10/11/12 DONE) | 5 | 3 | 0 | 0 |
| P3 gaps | 3 | **2** (GAP-14 PARTIAL, GAP-15 PARTIAL (nao 0!), GAP-16 PARTIAL) | 3 | 3 | 1 | 0 |
| Release readiness | 61/100 (doc) | **~72/100** | 70 | 80 | 85 | 90 |

**Mudancas desde baseline:** +11 pts release readiness gracias a GAP-02 progresso real, GAP-04 DONE, GAP-06 DONE, GAP-10 DONE, GAP-09 DONE, GAP-11/12 DONE.
**Correcoes**: GAP-02 melhor que reportado (3119 vs 3846), GAP-07+14 piores que reportados (thresholds faceis), GAP-15 existencia real (comprehensive chaos package existe porem nao wired).

---

## 6. Definition of Done

Cada GAP fecha quando:
- implementacao existe e esta wireada (nao apenas criada)
- testes unitarios cobrindo o novo codigo existem
- CI gate esta verde
- documentacao do dominio atualizada (nota de score real)
- nenhuma regressao em outros dominos

---

## 7. Riscos Residuais

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| PIX adapter continua nao-wired em staging | MEDIA | ALTO | GAP-01 priorizado H0 |
| server.ts refactor introduce regressao | ALTA | CRITICO | cobertura de testes antes de extrair |
| RLS enforcement quebra queries existentes | MEDIA | CRITICO | validar em staging antes de production |
| Chaos package (`packages/chaos/`) nao wired gera falsa sensacao de seguranca | MEDIA | MEDIO | GAP-15: integrar ao runtime |
| Coverage thresholds faceis demais (10%) nao detectam regressoes reais | MEDIA | ALTO | GAP-07 R2: elevar thresholds para H2 |
| Fiscal POST/PATCH endpoints sem autenticacao correta | MEDIA | ALTO | GAP-08: implementar com FF gate `fiscalBackofficeEnabled` |
| Secrets Manager escolha tecnologica bloqueia | BAIXA | ALTO | ADR definido antes de codificar |
| AI/ML integration requer re-treinamento | BAIXA | MEDIO | modulo existente ja tem servicos |

---

## 8. Artifacts Derivados

| Artifact | Origem | Destino |
|----------|--------|---------|
| `0302-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-14.md` | Auditoria completa | Base para este plano |
| `0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md` | IMP-* series | GAP-* series complementares |
| `0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md` | Sprints | Atualizar com horizontes H0-H3 |
| `0316-BACKLOG-OPERACIONAL-SERVER-TS.md` | PR-01 a PR-20 | GAP-02 mapa de extracao |

---

## 9. Score — Baseline vs Atual vs Target

| Dominio | Score Baseline (doc 0196) | Score Auditoria 2026-04-14 | Score Auditoria 2026-04-15 (real) | Delta vs Doc Anterior |
|---------|--------------------------|---------------------------|----------------------------------|----------------------|
| PIX | 70 | 85 | 85 | 0 |
| server.ts | 40 | 40/65 (inconsistente) | **80** (3119 linhas real) | **+15** (doc subestimou progresso) |
| RLS | 85 | 85 | 85 | 0 |
| Secrets Manager | 0 | 75 | 75 | 0 |
| FF consumption | 20 | 75 | 75 | 0 |
| FF metrics | 15 | 90 | 90 | 0 |
| Fiscal DB | 72 | 80 | 80 | 0 |
| AI/ML | 55 | 100 | 100 | 0 |
| Helm/K8s | 0 | 75 | 75 | 0 |
| Coverage CI | 15 | 100 (incorreto) | **50** (threshold facil) | **-50** (doc superestimou) |
| Rate limiter | 100 | 100 | 100 | 0 |
| Worker metrics | 100 | 100 | 100 | 0 |
| Coverage 80%+ | 28 | 28 (incorreto) | **40** (CI gate existe) | **+12** (doc subestimou) |
| Chaos | 0 | 0 (incorreto) | **25** (package existe) | **+25** (doc subestimou) |
| Performance | 40 | 40 | 40 | 0 |

---

## 10. Round 2 — Plano de Execucao de Melhorias (2026-04-15 R2)

### Acoes Imediatas (Semana 0-2)

| # | Acao | GAP | Responsavel | Estimativa | Dependencia |
|---|------|-----|-------------|------------|-------------|
| R2-01 | Elevar coverage thresholds para H2 (lines:20, functions:40, branches:45, statements:20) | GAP-07 | CI/DevOps | 1 dia | Nenhuma |
| R2-02 | Integrar `packages/chaos` ao runtime (ChaosEngine singleton + health/startup + endpoint `/chaos/start`) | GAP-15 | API team | 3 dias | packages/chaos existe |
| R2-03 | Fiscal POST/PATCH endpoints (administracao fiscal gated por `fiscalBackofficeEnabled` FF) | GAP-08 | Fiscal team | 5 dias | GAP-08 migration+seed+service ready |
| R2-04 | Continuar reducao server.ts (meta <2500 linhas, extrair dominios restantes) | GAP-02 | API team | 5 dias | Nenhuma |

### Acoes de Curto Prazo (Semana 2-6)

| # | Acao | GAP | Responsavel | Estimativa | Dependencia |
|---|------|-----|-------------|------------|-------------|
| R2-05 | PgBouncer connection pooling (configurar + expor POSTGRES_MAX_CONNECTIONS env var) | GAP-16 | Platform team | 3 dias | Nenhuma |
| R2-06 | CDN configuracao para assets estaticos (SPA/Web) | GAP-16 | Platform team | 3 dias | Helm charts OK |
| R2-07 | Session Redis gate (consumir `runtimeDistributedStateEnabled` para session store) | GAP-05 | API team | 2 dias | GAP-03 DONE |

### Acoes de Medio Prazo (Semana 6-16)

| # | Acao | GAP | Responsavel | Estimativa | Dependencia |
|---|------|-----|-------------|------------|-------------|
| R2-08 | Executar k6 benchmark em staging + validar SLOs | GAP-16 | Platform team | 2 dias | PgBouncer + CDN ready |
| R2-09 | Game days + runbooks de incidentes (chaos) | GAP-15 | Platform team | 5 dias | GAP-15 R2-02 DONE |
| R2-10 | Elevar coverage thresholds para H3 (lines:40, functions:50, branches:50, statements:40) | GAP-14 | All teams | Contínuo | Suite expandida |

---

### Priorizacao Round 2

**Foco principal: Fechar GAP-07 (coverage threshold) e GAP-15 (chaos integration)**

```
R2-01 (GAP-07 threshold H2)  → 1 dia, impacto alto em CI gate
R2-02 (GAP-15 chaos wiring)  → 3 dias, impacto medio (seguranca)
R2-03 (GAP-08 fiscal PATCH)  → 5 dias, impacto alto (complitude fiscal)
R2-04 (GAP-02 server.ts)     → 5 dias, impacto alto (manutenibilidade)
```

**Nota:** GAP-15 (chaos) foi completamente redescoberto nesta auditoria. O codigo existe e e completo mas nao esta wired. Integracao ao runtime e rapida (3 dias) mas o impacto em resiliencia e alto para game days e runbooks.
