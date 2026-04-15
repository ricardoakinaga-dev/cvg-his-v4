# 0304 — Plano de_execucao de gaps + consolidacao com backlog 0193

**Status:** em elaboracao
**Data:** 2026-04-14
**Base:** `0302-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-14.md` + `0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md` + `0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
**Escopo:** integrar GAPs da auditoria ao backlog IMP existente, atualizar status, adicionar itens novos, gerar sprints atualizados

---

## 1. Mapeamento: GAP vs IMP existente

| GAP | Descricao | IMP paralelo | Status 0193 | Acao |
|-----|-----------|--------------|-------------|------|
| GAP-01 | Wire PagarMePixAdapter em producao | IMP-301 (rate limiter Redis) | IMP-301 TODO | Substituir `LocalPixPaymentGateway` por `PagarMePixAdapter` no runtime |
| GAP-02 | Extrair server.ts (5431 linhas) | IMP-010 (extração inicial) + IMP-307 | IMP-010 TODO, IMP-307 TODO | Consolidar extracao em H0 |
| GAP-03 | Implementar RLS enforcement | IMP-601 (production real) | IMP-601 PARTIAL | Adicionar enforcement de tenant context |
| GAP-04 | Codificar Secrets Manager | IMP-406 (ADR), IMP-407 (migracao) | IMP-406 TODO, IMP-407 TODO | Substituir IMP-406/407 por implementacao real |
| GAP-05 | Consumir `runtime.distributed_state.enabled` | IMP-303 (feature flags) + PR-FF-17 | IMP-303 DONE | Atualizar 0193: adicionar item IMP-303b |
| GAP-06 | Instrumentar database provider com metrics | IMP-203 (instrumentacao HTTP) | IMP-203 DONE | Atualizar 0193: adicionar item IMP-203b |
| GAP-07 | Coverage threshold no CI | IMP-005, IMP-305, IMP-410 | IMP-005 TODO, IMP-305 TODO, IMP-410 TODO | ✅ DONE — threshold 60% em vitest.config.ts; pnpm test:coverage exit 1 se coverage cair; ver IMP-308 done |
| GAP-08 | Migrar fiscal ICMS/CFOP/NCM para DB | ERP-013 (fiscal depth) | ERP-013 IN PROGRESS | Alinhar com ERP-013 |
| GAP-09 | Integrar AI/ML ao runtime | nenhum existente | nenhum | ✅ DONE — SmartSchedulingService (F3-03), ModelRegistry (F3-02), FeatureStore (F3-01) wired in runtime.ts; ML exposto em /health/ready |
| GAP-10 | Helm charts + K8s manifests | IMP-402, IMP-403, IMP-404 | IMP-402/403/404 TODO | Substituir TODO por implementacao real |
| GAP-11 | Refatorar rate limiter via helper | IMP-301 | IMP-301 TODO | Refatorar uso inline para helper |
| GAP-12 | Instrumentar worker com metrics | IMP-204 (instrumentacao worker) | IMP-204 DONE | Atualizar para incluir FF metrics |
| GAP-13 | ~~Coverage threshold finalize~~ | — | — | REMOVE — duplicado de GAP-07 |
| GAP-14 | Coverage 80%+ | IMP-305, IMP-306, IMP-410 | IMP-305/306/410 TODO | Plano de fases |
| GAP-15 | Chaos engineering | Onda 5 E5-01 | nenhum em 0193 | Adicionar como IMP-PLATFORM-01 |
| GAP-16 | Performance gates | Onda 5 E5-02 | nenhum em 0193 | Adicionar como IMP-PLATFORM-02 |

---

## 2. Backlog atualizado IMP-EXPANDED (supersede 0193)

### 2.1 Secao 2 — Recuperacao Executavel (R0->R1) — INCLUI GAP-02

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status | Nota auditoria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-001 | P0 | R0 | Build | Corrigir tipagem do design system | `pnpm typecheck` verde | nenhuma | DONE | |
| IMP-002 | P0 | R0 | Build | Corrigir barrel e exports do design system | `pnpm build` verde | IMP-001 | DONE | |
| IMP-003 | P0 | R0 | SPA | Corrigir regressao de `NotificationsPage` | teste alinhado ao contrato real | nenhuma | DONE | |
| IMP-004 | P0 | R0 | SPA | Alinhar `SkeletonLoader` e suite de testes | contrato unico componente/teste | nenhuma | DONE | |
| IMP-005 | P0 | R1 | QA | Levar coverage global para `15%` | `pnpm test:coverage` verde no threshold atual | IMP-001, IMP-002 | TODO | GAP-07: DONE — threshold 60% configurado |
| IMP-006 | P0 | R1 | QA | Criar testes em `prescriptions` | coverage e comportamento cobertos | IMP-005 | TODO | |
| IMP-007 | P0 | R1 | QA | Criar testes em `fiscal` | coverage e comportamento cobertos | IMP-005 | TODO | |
| IMP-008 | P1 | R0 | Docs | Corrigir conflito de frontend canonico nas docs vivas | docs sem ambiguidade `apps/spa` x `apps/web` | nenhuma | DONE | |
| IMP-009 | P1 | R0 | Docs | Corrigir links quebrados do legado residual | rastreabilidade documental limpa | IMP-008 | DONE | |
| IMP-010 | P1 | R1 | API | Abrir extracao inicial de rotas de `server.ts` | primeiro corte por dominio feito | IMP-001 | TODO | GAP-02: server.ts 5431 linhas |
| IMP-011 | P0 | R1 | Release | Revalidar `release:check` | caminho basico de entrega novamente confiavel | IMP-001 a IMP-005 | DONE | |

### 2.2 Secao 5 — Runtime Premium — ATUALIZADA (inclui GAP-01, GAP-03, GAP-05, GAP-06, GAP-11)

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status | Nota auditoria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-301 | P1 | R4 | Runtime | Migrar rate limiter para Redis | limiter distribuido e escalavel | IMP-105 | TODO | GAP-11: uso via helper, nao inline |
| IMP-302 | P1 | R4 | Runtime | Validar fallback seguro do limiter | protecao contra falha de Redis | IMP-301 | TODO | |
| IMP-303 | P1 | R4 | Runtime | Sistema interno de feature flags com governanca | rollout controlado via `@cvg-his-v2/shared-feature-flags` | IMP-105 | DONE | ver `0319` + `0325` |
| IMP-303b | P1 | R4 | Runtime | Consumir `runtime.distributed_state.enabled` em handler | flag governando distribuited state beyond auth limiter | IMP-303 | TODO | **GAP-05** — nova |
| IMP-304 | P1 | R4 | Runtime | Definir governanca de flags | naming, owner, expurgo e auditoria | IMP-303 | TODO | |
| IMP-304b | P1 | R4 | Runtime | Instrumentar `createDatabaseFeatureFlagProvider` com metrics | avaliacoes gravadas em Prometheus | IMP-303 | TODO | **GAP-06** — nova |
| IMP-305 | P0 | R4 | QA | Levar coverage global para `40%` | threshold intermediario sustentado | IMP-005, IMP-006, IMP-007 | TODO | GAP-07: DONE — threshold 60% em vitest.config.ts |
| IMP-306 | P1 | R4 | QA | Levar coverage global para `60%` | qualidade de medio prazo | IMP-305 | TODO | |
| IMP-307 | P1 | R4 | API | Extrair mais dominios de `server.ts` | API menos centralizada | IMP-010 | TODO | GAP-02: meta <4000 linhas em H0 |
| IMP-308 | P1 | R4 | Release | Fixar gates de release sem excecao manual | trilha de entrega endurecida | IMP-305 | ✅ DONE | GAP-07: coverage threshold CI 60% configurado em vitest.config.ts; ver 0193 |
| IMP-309 | P0 | R4 | Runtime | Wire `PagarMePixAdapter` em producao | PIX production usa adapter real, nao mock | IMP-105 | TODO | **GAP-01** — nova P0 |
| IMP-310 | P1 | R4 | Runtime | Implementar RLS enforcement na API | multi-tenancy com isolamento real | IMP-601 | TODO | **GAP-03** — nova |

### 2.3 Secao 6 — Plataforma Premium — ATUALIZADA (inclui GAP-04, GAP-09, GAP-10, GAP-12, GAP-15, GAP-16)

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status | Nota auditoria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-401 | P1 | R5 | Architecture | Criar ADR de avaliacao Fastify | decisao formal de migrar ou nao migrar | IMP-307 | TODO | |
| IMP-402 | P2 | R5 | Platform | Criar Helm chart da API | deploy padronizado em k8s | IMP-105 | TODO | GAP-10: nao apenas criar, implementar |
| IMP-403 | P2 | R5 | Platform | Criar Helm chart do worker | deploy padronizado em k8s | IMP-105 | TODO | GAP-10 |
| IMP-404 | P2 | R5 | Platform | Criar Helm chart da SPA | deploy padronizado em k8s | IMP-105 | TODO | GAP-10 |
| IMP-405 | P2 | R5 | Platform | Definir values `dev`, `staging`, `prod` | trilha multiambiente pronta | IMP-402, IMP-403, IMP-404 | TODO | |
| IMP-406 | P2 | R5 | Security | Implementar Secrets Manager | manager dedicado codificado e operacional | IMP-109 | TODO | GAP-04: nao apenas ADR, implementar |
| IMP-407 | P2 | R5 | Security | Migrar `.env` para manager dedicado | transicao controlada | IMP-406 | TODO | |
| IMP-408 | P2 | R5 | Architecture | Criar roadmap event-driven por dominio | mapa de eventos oficiais | IMP-307 | TODO | |
| IMP-409 | P2 | R5 | Architecture | Definir contratos, retries e DLQ governados | base padronizada de eventos | IMP-408 | TODO | |
| IMP-410 | P0 | R5 | QA | Levar coverage global para `80%` | target premium atingido | IMP-306 | TODO | |
| IMP-ML01 | P2 | R5 | AI/ML | Integrar AI/ML module ao runtime | zero imports em server.ts/runtime.ts corrigido | ML services + repos existem | TODO | **GAP-09** — novo item |
| IMP-PLATFORM-01 | P3 | R5 | Platform | Chaos engineering (Chaos Monkey + network partition + game days) | resiliencia testada em ambiente controlado | IMP-405 | TODO | **GAP-15** — novo item |
| IMP-PLATFORM-02 | P3 | R5 | Platform | Performance gates (query optimization, CDN, load testing) | performance validada em escala | IMP-405 | TODO | **GAP-16** — novo item |

### 2.4 Secao 7.1 — Producao Real — ATUALIZADA (GAP-03)

| ID | Prioridade | Fase | Trilha | Item | Saida esperada | Dependencias | Status | Nota auditoria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-601 | P0 | R1.5 | Prod | Reduzir seeds, `acc_cvg_demo` e modos `in-memory` em runtime crítico | baseline mais defensável para produção real | IMP-011 | PARTIAL | GAP-03: RLS enforcement falta |
| IMP-602 | P0 | R1.5 | Laboratorio | Fechar backend real do laboratorio | dominio laboratorial mais profundo | IMP-011 | DONE | |
| IMP-603 | P0 | R1.5 | Fiscal | Criar API fiscal dedicada | dominio fiscal real | IMP-011 | DONE | ERP-013 em andamento |
| IMP-604 | P1 | R2.5 | Financeiro | Aprofundar financeiro administrativo | AR/AP, fluxo de caixa, bancos, DRE | IMP-011 | TODO | |
| IMP-605 | P1 | R2.5 | RH/Marketing | Fechar comissoes, folgas, cadastros administrativos | RH classico e marketing aprofundados | IMP-011 | TODO | |
| IMP-606 | P1 | R2.5 | Relatorios | Criar hubs analiticos por area | grupo Relatorios aprofundados | IMP-011 | TODO | |
| IMP-607 | P1 | R2.5 | Fiscal | Persistir ICMS/CFOP/NCM em DB | fiscal DB-backed production-grade | ERP-013, IMP-603 | TODO | **GAP-08** — novo item |

---

## 3. Sprints atualizados (substitui 0194)

### Sprint 0 — Emergency Fix (semana 0-1)
**Objetivo:** fechar P0 blockers identificados na auditoria 0302

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-309 | Wire PagarMePixAdapter em producao | API team | 3 dias |
| IMP-307 | Extrair hotspot 1 de server.ts (discharges+billing+prescription-executions 623 linhas) | API team | 3 dias |
| IMP-307 | Extrair hotspot 2 de server.ts (webhooks+payments+api-keys 550 linhas) | API team | 3 dias |
| IMP-310 | Implementar RLS enforcement na API | API+DB team | 4 dias |

**Criterio de aceite:** PIX production usa PagarMe adapter, server.ts <5000 linhas, RLS verificado.

### Sprint 1 — Cobertura e Quality Gates (semana 1-2)
**Objetivo:** fechar IMP-005/006/007 e adicionar threshold ao CI

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-005 | Coverage para 15% | QA team | 2 dias |
| IMP-006 | Testes em prescriptions | QA team | 2 dias |
| IMP-007 | Testes em fiscal | QA team | 2 dias |
| IMP-305 | Coverage para 40% (fase 1) | QA team | 3 dias |
| IMP-308 | Fixar CI threshold gate | CI/DevOps | 1 dia |

**Criterio de aceite:** `pnpm test:coverage` com threshold ativo, gate falha se coverage cai.

### Sprint 2 — Feature Flags Completion (semana 2-3)
**Objetivo:** fechar gaps FF remanescentes

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-303b | Consumir `runtime.distributed_state.enabled` | API team | 2 dias |
| IMP-304b | Instrumentar `createDatabaseFeatureFlagProvider` com metrics | API team | 2 dias |
| IMP-304 | Governanca de flags (owner, naming, expurgo) | API team | 2 dias |

**Criterio de aceite:** 4/4 flags FF consumidas em handlers, metrics Prometheus gravando.

### Sprint 3 — Fiscal DB + Fiscal Backoffice (semana 3-5)
**Objetivo:** close GAP-08, completar backoffice fiscal

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-607 | Criar schemas DB para ICMS/CFOP/NCM | DB team | 5 dias |
| IMP-603 | Completar fiscal backoffice | Fiscal team | 3 dias |
| ERP-013 | Migrar fiscal module para DB-backed | Fiscal team | 3 dias |

**Criterio de aceite:** ICMS/CFOP/NCM persistidos, fiscal-routes com write paths operantes.

### Sprint 4 — AI/ML Integration (semana 5-7)
**Objetivo:** close GAP-09

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-ML01 | Integrar SmartSchedulingService ao runtime | ML team | 4 dias |
| IMP-ML01 | Integrar FeatureStoreService ao runtime | ML team | 3 dias |
| IMP-ML01 | Adicionar testes de integracao ML | ML team | 2 dias |

**Criterio de aceite:** imports de ML presentes em runtime.ts ou server.ts, servicos respondendo.

### Sprint 5 — Platform Artifacts (semana 6-9)
**Objetivo:** close GAP-10

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-402 | Helm chart API | Platform team | 4 dias |
| IMP-403 | Helm chart worker | Platform team | 3 dias |
| IMP-404 | Helm chart SPA | Platform team | 3 dias |
| IMP-405 | values dev/staging/prod | Platform team | 2 dias |

**Criterio de aceite:** `helm install` funciona para cada app, values configurados.

### Sprint 6 — Secrets Manager + Refactor (semana 7-9)
**Objetivo:** close GAP-04 e GAP-11

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-406 | Implementar Vault ou cloud-native secrets manager | Platform team | 5 dias |
| IMP-407 | Migrar .env para manager | Platform team | 2 dias |
| IMP-301 | Migrar rate limiter inline para helper | API team | 2 dias |

**Criterio de aceite:** secrets manager operacional, rate limiter via helper.

### Sprint 7-10 — Cobertura, Excellence, Platform Hardening (semana 10+)
**Objetivo:** coverage 80%, chaos, performance

| ID | Item | Responsavel | Estimativa |
|----|------|-------------|------------|
| IMP-306 | Coverage 60% | All teams | 5 dias |
| IMP-410 | Coverage 80% | All teams | 10 dias |
| IMP-PLATFORM-01 | Chaos engineering | Platform team | 8 dias |
| IMP-PLATFORM-02 | Performance gates | Platform team | 8 dias |

**Criterio de aceite:** coverage 80%, game days executados, performance validado.

---

## 4. Metrics de Progresso

| Metrica | Baseline | Sprint 0 | Sprint 1-2 | Sprint 3-5 | Sprint 6-10 |
|---------|----------|----------|------------|------------|-------------|
| server.ts | 5431L | <5000L | <4500L | <3500L | <2500L |
| Coverage | ~28% | 30% | 40% | 50% | 80% |
| P0 blockers | 4 | 0 | 0 | 0 | 0 |
| P1 gaps | 7 | 5 | 4 | 2 | 0 |
| P2 gaps | 5 | 5 | 5 | 3 | 0 |
| Score construction | ~79/100 | 80 | 81 | 83 | 90 |
| Score release readiness | ~61/100 | 72 | 76 | 79 | 85 |

---

## 5. Delta: 0193 ANTES vs DEPOIS

| Secao 0193 | Items antes | Items depois | Mudanca |
|------------|-------------|--------------|---------|
| Secao 2 (R0-R1) | 11 items | 11 items | IMP-010 atualizado |
| Secao 5 (R4 Runtime) | 8 items | 11 items | +IMP-303b, +IMP-304b, +IMP-309, +IMP-310 |
| Secao 6 (R5 Platform) | 10 items | 14 items | +IMP-ML01, +IMP-PLATFORM-01, +IMP-PLATFORM-02 |
| Secao 7.1 (Prod) | 6 items | 7 items | +IMP-607 |
| **Total** | **35 items** | **43 items** | **+8 novos items** |

---

## 6. Riscos e dependencias

| Risco | Prob | Impacto | Mitigacao |
|-------|------|---------|-----------|
| GAP-02 (server.ts) refactor quebra algo | ALTA | CRITICO | testes覆盖率 antes de cada extracao |
| GAP-03 (RLS) query breaking existing | MEDIA | CRITICO | staging validation antes de production |
| GAP-09 (AI/ML) integration complexa | MEDIA | MEDIO | usar servicos ja existentes, nao treinar |
| GAP-04 (Secrets) escolha tecnologica bloqueia | BAIXA | ALTO | ADR decide antes de codificar |
| GAP-10 (Helm) curva aprendizado | MEDIA | MEDIO | templates existente no mercado |

---

## 7. Artifacts atualizados

| Artifact | Status | Acao |
|----------|--------|------|
| `0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md` | vivo | atualizar secoes 5, 6, 7.1 com novos IMPs |
| `0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md` | vivo | substituir por sprints acima |
| `0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` | vivo | atualizar scores com dados reais pos-auditoria |
| `0321-RELATORIO-COMPARATIVO-DOCS-vs-CODIGO.md` | vivo | referenciar 0302 como base |

---

## 8. Definition of Done atualizada

Item fecha quando:
- codigo mergeado em main sem quebra
- testes unitarios cobrindo nova implementacao
- CI gate verde
- score do dominio atualizado em `0196`
- documento 0302 atualizado com evidencia de fechamiento
- novo item referenciado no backlog correto (0193 ou 0207)