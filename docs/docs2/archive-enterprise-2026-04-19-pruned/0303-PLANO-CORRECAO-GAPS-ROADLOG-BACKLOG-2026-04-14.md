# 0303 — Plano de Correcao de Gaps Docs vs Codigo + Roadmap + Backlog

**Status:** em elaboracao
**Data:** 2026-04-14
**Base:** `0302-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-14.md`
**Escopo:** transformar GAPs identificados em plano executavel, roadmap por horizonte e backlog priorizado

---

## 1. Leitura dos Gaps Priorizados

| Prioridade | Domain | Gap | Impacto |
|------------|--------|-----|---------|
| P0 | PIX | Production usa mock — `PagarMePixAdapter` existe mas NAO conectado | Release blockers |
| P0 | server.ts | 5431 linhas monolitico | Release blockers |
| P0 | Multi-tenancy RLS | Schema existe, accountId threadado, porem SEM RLS enforcement na API | Release blockers |
| P1 | Secrets Manager | Nenhum manager codificado (0 code vs 22 doc) | Seguranca production |
| P1 | Feature Flags — consumo | `runtime.distributed_state.enabled` definida MAS NAO consumida | Incompleto |
| P1 | Feature Flags — metrics | `createDatabaseFeatureFlagProvider` NAO instrumentado com metrics | Incompleto |
| P1 | Fiscal DB schemas | ICMS/CFOP/NCM nao persistidos em DB (managed in-memory) | Completar backoffice |
| P2 | AI/ML integration | Modulo existe com servicos+repos, ZERO imports em runtime | Desconectado |
| P2 | Platform artifacts | Zero Helm/K8s/Terraform | Long-term |
| P2 | Coverage threshold | CI job existe MAS SEM threshold gate | Regressao risk |
| P2 | Rate limiter helper | Uso inline em server.ts (deveria via helper) | Manutenibilidade |
| P3 | Module Feature Flags | Worker NAO consome metrics collector | Incompleto |

---

## 2. Roadmap por Horizonte

### Horizonte 0 — Cleanup immediate (0-2 semanas)
**Objetivo:** fechar P0 blockers para release production-ready

| Item | Responsabilidade | Dependencia | Estimativa |
|------|-----------------|-------------|------------|
| HG-01: Wire `PagarMePixAdapter` ao runtime | API + PIX module | Nenhuma | 3 dias |
| HG-02: Extrair dominios restantes de server.ts | API team | Nenhuma | 5 dias |
| HG-03: Implementar RLS enforcement na API | API + DB team | schema existente OK | 4 dias |

### Horizonte 1 — Estabilizacao (2-6 semanas)
**Objetivo:** fechar gaps P1, eliminar divida tecnica critica

| Item | Responsabilidade | Dependencia | Estimativa |
|------|-----------------|-------------|------------|
| HG-04: Codificar Secrets Manager (ADR decide: Vault vs cloud-native) | Platform team | HG-01 (pode paralelizar se ADR e rapido) | 5 dias |
| HG-05: Consumir `runtime.distributed_state.enabled` em handler/runtime | API team | FF infrastructure OK | 2 dias |
| HG-06: Instrumentar `createDatabaseFeatureFlagProvider` com metrics | API team | FF infrastructure OK | 2 dias |
| HG-07: Adicionar threshold de coverage no CI gate | CI/DevOps | Nenhuma (pode паралелизar) | 1 dia |
| HG-08: Criar migracoes DB para ICMS/CFOP/NCM | DB team | Fiscal module OK | 5 dias |
| HG-09: Migrar fiscal module para DB-backed | Fiscal team | HG-08 | 3 dias |

### Horizonte 2 — Operacionalizacao (6-16 semanas)
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
| HG-14: Coverage 80%+ | All teams | Contínuo |
| HG-15: Chaos engineering (Onda 5 E5-01) | Platform team | 8 dias |
| HG-16: Performance optimization (E5-02) | All teams | 8 dias |
| HG-17: SOC2 certification evidence (E5-04) | Compliance team | 8 dias |

---

## 3. Backlog Operacional — GAP-* Series

### GAP-01 a GAP-03: P0 Blockers

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-01 | Wire PagarMePixAdapter em producao | Substituir `LocalPixPaymentGateway` por `PagarMePixAdapter` em `payment-gateway.ts`. Validar fluxo intent->confirm em staging antes de production. | P0 | 3 dias | TODO |
| GAP-02 | Extrair server.ts — hotspot 1 | 5431 linhas e monolitico. Extrair: discharges+billing+prescription-executions (623 linhas), webhooks+payments+api-keys (550 linhas). Meta: reduzir para <4000 linhas. | P0 | 5 dias | TODO |
| GAP-03 | Implementar RLS enforcement | Multi-tenancy: `accountId` deve ser filtrado automaticamente em todas as queries. Implementar middleware de tenant context + row-level policy no Postgres. Validar que queries sem accountId falham fast. | P0 | 4 dias | TODO |

### GAP-04 a GAP-08: P1 Security + Completude

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-04 | Codificar Secrets Manager | Nenhum manager codificado. Contexto: `0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md` existe com politica de rotacao e inventario de segredos; porem NAO existe codigo de manager dedicado (Vault, AWS SM, GCP SM, ou Azure Key Vault). Implementar escolha: (a) Vault self-hosted ou (b) cloud-native (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault). Implementar: provider client, leitura de secrets em bootstrap, rotacao automatica documentada, scanning em runtime. ADR deve decidir antes de codificar. Impacto: ate 22/100 em `0196`. | P1 | 5 dias | TODO |
| GAP-05 | Consumir `runtime.distributed_state.enabled` | Flag definida em `apps/api/src/feature-flags.ts:35-43` em `API_FEATURE_FLAG_DEFINITIONS`; boolean `runtimeDistributedStateEnabled` computado em `createApiFeatureFlags` (feature-flags.ts:112) POREM zero handler ou runtime consome esse valor. Evidencia: grep em server.ts e runtime.ts NAO encontra nenhum uso de `runtimeDistributedStateEnabled`. Acoes: (1) identificar onde a flag deve controlar distribuited state (ex: redis session store, cache distributed, rate limiter per-account); (2) adicionar gate em `createApiRuntime` ou no handler responsavel; (3) garantir fallback seguro se flag e false. Impacto: flag 4/4 consumida em handlers, EP-FF-07 fecha COMPLETO.
| GAP-06 | Instrumentar database provider com metrics | `createDatabaseFeatureFlagProvider` em `packages/modules/feature-flags/src/repositories/database-feature-flag.repository.ts:187` NAO aceita `FeatureFlagMetricsCollector`. O provider env em `apps/api/src/feature-flags.ts` JA esta instrumentado via `createCompositeFeatureFlagProviderWithMetrics`, porem o database provider NAO. Acoes: (1) adicionar parametro `metrics?: FeatureFlagMetricsCollector` a `createDatabaseFeatureFlagProvider`; (2) no metodo `evaluate`, antes de retornar, chamar `metrics.recordEvaluation(...)` com flagKey, provider=db-repository, reason e enabled; (3) no fallback, chamar `metrics.recordFallback(...)`. Impacto: metricas FF completas em ambos providers.
| GAP-07 | Coverage threshold no CI | ✅ FEITO. `vitest.config.ts` `coverage.thresholds` com 60% para lines, functions, branches, statements. `pnpm test:coverage` exit 1 se coverage cair abaixo do threshold. Threshold documentado em IMP-308 (`0193`). GAP-13 (dup) removido. Impacto: regressao de coverage detectada automaticamente em CI. | P1 | 1 dia | ✅ DONE |
| GAP-08 | Migrar fiscal ICMS/CFOP/NCM para DB | Modulo fiscal gerencia ICMS/CFOP/NCM in-memory via arrays hardcoded. Evidencia: `packages/modules/fiscal/src/service.ts:48` define `NCM_ENTRIES` como array const imutavel; `service.ts:83` define `ICMS_RULES` como array const imutavel; `cfop-table.ts` exporta `CFOP_TABLE` como array em memoria; NENHUM schema DB existe em `packages/db/src/schema/` para icms, cfop ou ncm. Acoes: (1) criar schemas Drizzle em `packages/db/src/schema/fiscal/` para cfop_entries, icms_rules, ncm_entries, icms_matrix; (2) criar migracao SQL; (3) migrar FiscalService para ler de DatabaseFiscalRepository em vez de arrays hardcoded; (4) criar seed data com valores atuais do catalogo; (5) expor endpoints POST/PATCH para administracao fiscal. Impacto: fiscal backoffice production-grade, nota 0196 sobe de 72 para 90.

### GAP-09 a GAP-13: P2 Integracao + Infraestrutura

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-09 | Integrar AI/ML ao runtime | ✅ FEITO. SmartSchedulingService (F3-03) wired in runtime.ts; ModelRegistry + FeatureStore tambem disponiveis; ML status exposto em `/health/ready` como `dependencies.ml`. | P2 | 8 dias | ✅ DONE |
| GAP-10 | Helm charts + K8s manifests | Zero artefatos K8s/Helm. Criar Chart.yaml, values.yaml, deployment.yaml para cada app (api, spa, web, worker). Adicionar Terraform para infra provisionamento. | P2 | 10 dias | TODO |
| GAP-11 | Refatorar rate limiter via helper | ✅ FEITO. `createAuthRateLimiter` em `apps/api/src/http/auth-rate-limiter.ts` com suporte Redis store configuravel. `RateLimiterStore` interface com `InMemoryRateLimiterStore` e `RedisRateLimiterStore`. server.ts:8 importa helper. | P2 | 2 dias | ✅ DONE |
| GAP-12 | Instrumentar worker com metrics collector | ✅ FEITO. `worker-metrics.ts` com `createWorkerFeatureFlagMetricsCollector()`. `/metrics` exporta `worker_feature_flag_*`. | P2 | 2 dias | ✅ DONE |
| GAP-13 | ~~Adicionar threshold coverage CI~~ | REMOVIDO — duplicado de GAP-07. | P2 | 1 dia | REMOVE |

### GAP-14 a GAP-16: P3 excelencia

| ID | Titulo | Descricao | Prioridade | Estimativa | Status |
|----|--------|-----------|------------|------------|--------|
| GAP-14 | Coverage 80%+ | Coverage atual ~28%. Fases: 28%->45%->60%->80%. Priorizar dominos com mais risco: fiscal, payments, auth. | P3 | Contínuo | TODO |
| GAP-15 | Chaos engineering | Implementar E5-01: Chaos Monkey + network partition + game days. Priorizar para Onda 5. | P3 | 8 dias | TODO |
| GAP-16 | Performance gates | Implementar E5-02: query optimization, CDN + connection pooling, load testing. Priorizar para Onda 5. | P3 | 8 dias | TODO |

---

## 4. Ordem de Execucao Recomendada

```
Semana 0-2 (H0):
  GAP-01 (PIX) → GAP-02 (server.ts) → GAP-03 (RLS)

Semana 2-6 (H1):
  GAP-04 (Secrets Manager)
  GAP-05 (runtime.distributed_state.enabled consumo)
  GAP-06 (database provider metrics)
  GAP-07 (coverage threshold CI)
  GAP-08 (fiscal DB) [em paralelo com GAP-04]

Semana 6-16 (H2):
  GAP-09 (AI/ML integration)
  GAP-10 (Helm/K8s)
  GAP-11 (rate limiter refactor)
  GAP-12 (worker metrics)
  GAP-13 (coverage threshold finalize)

Semana 16+ (H3):
  GAP-14 (coverage 80%)
  GAP-15 (chaos)
  GAP-16 (performance)
```

**Bloqueios:**
- GAP-05 depende de GAP-03 (RLS OK antes de distribuir state)
- GAP-06 depende de FF infrastructure (ja existe, OK)
- GAP-08 depende de fiscal module existente (ja existe, OK)
- GAP-09 depende de ML module services OK (ja existe, OK)
- GAP-10 pode ser executado em paralelo com qualquer um

---

## 5. Metricas de Progresso

| Metrica | Baseline | Meta H0 | Meta H1 | Meta H2 | Meta H3 |
|---------|----------|---------|---------|---------|---------|
| server.ts linhas | 5431 | <4500 | <3500 | <2500 | <1500 |
| Coverage | ~28% | 35% | 45% | 60% | 80% |
| P0 blockers | 3 | 0 | 0 | 0 | 0 |
| P1 gaps | 6 | 3 | 0 | 0 | 0 |
| P2 gaps | 5 | 5 | 3 | 0 | 0 |
| Release readiness | 61/100 (doc) | 70 | 80 | 85 | 90 |

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
| PIX adapter continua nao-wired | MEDIA | ALTO | GAP-01 priorizado H0 |
| server.ts refactor introduce regressao | ALTA | CRITICO | cobertura de testes antes de extrair |
| RLS enforcement quebra queries existentes | MEDIA | CRITICO | validar em staging antes de production |
| Secrets Manager escolha tecnologica Bloqueia | BAIXA | ALTO | ADR definido antes de codificar |
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

## 9. Score Alvo Pos-Fechamento

| Dominio | Score Atual (code) | Score Pos-GAP |
|---------|---------------------|---------------|
| Feature Flags | 40 | 75 (consumo + metrics OK) |
| server.ts | 0 | 65 (meta <2500 linhas) |
| PIX | 40 | 85 (PagarMe wired) |
| Multi-tenancy | 50 | 80 (RLS enforced) |
| Secrets Manager | 0 | 60 (manager codificado) |
| AI/ML | 55 | 75 (integrado ao runtime) |
| Platform/K8s | 0 | 40 (Helm+manifests OK) |
| Fiscal | 72 | 90 (DB-backed completo) |
| Coverage | ~28% | 60% (H2 target) |
| **Overall Construction** | ~79/100 | **85/100** |
| **Release Readiness** | ~61/100 | **82/100** |