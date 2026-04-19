# PLANO DE AÇÃO — MELHORIA ENTERPRISE CVG-HIS-V2
**Data de criação:** 2026-04-13
**Fonte:** ENTERPRISE-BUILD-REPORT.md (2026-04-13) + verificação direta do repositório
**Responsável:** Equipe de Desenvolvimento

---

## 1. RESUMO DO ESTADO ATUAL

| Área | Score Atual | Gap Crítico |
|------|-------------|-------------|
| Frontend SPA | 96/100 | Nenhum |
| Arquitetura Backend | 88/100 | Package prescriptions tem código mas está incompleto |
| Segurança Enterprise | 84/100 | Sem package dedicado `packages/security/` |
| Observabilidade | 82/100 | Sem pilha OTLP completa em runtime |
| Fiscal/Estoque/Lab | 80/100 | Parcial — domain existe mas pode melhorar |
| Integrações | 78/100 | PIX: adapter Pagar.me com métodos em TODO |
| AI/ML | 65/100 | OCR e Forecasting não encontrados |
| Excelência Operacional | 52/100 | Sem chaos engineering, Helm/K8s, Unleash, Redis |
| Testes / Coverage | 30/100 | **Coverage 6.69% — meta >80%** |

---

## 2. ITENS DE AÇÃO PRIORIZADOS

### 🔴 PRIORIDADE CRÍTICA

#### 2.1 — Coverage de Testes (30/100 → meta 80%)
**Responsável:** Todos os módulos
**Estimativa:** 3 sprints

| # | Ação | Módulos Alvo | Tipo |
|---|------|--------------|------|
| T1 | Escrever testes unitários para `packages/shared/config/` | config | unit |
| T2 | Escrever testes unitários para `packages/shared/errors/` | errors | unit |
| T3 | Escrever testes unitários para `packages/shared/validation/` | validation | unit |
| T4 | Escrever testes unitários para `packages/shared/types/` | types | unit |
| T5 | Escrever testes de integração para auth (MFA, brute-force) | auth, mfa | integration |
| T6 | Escrever testes para `packages/modules/billing/` | billing | unit+integration |
| T7 | Escrever testes para `packages/modules/scheduling/` | scheduling | unit+integration |
| T8 | Escrever testes para `packages/modules/diagnostics/` | diagnostics | unit+integration |
| T9 | Escrever testes para `packages/modules/encounters/` | encounters | unit+integration |
| T10 | Escrever testes E2E para fluxos críticos (agendamento, triagem, alta) | e2e | e2e |

**Checkpoints de coverage por fase:**
- Fase 1 (T1-T4): 6.69% → ~25%
- Fase 2 (T5-T7): ~25% → ~45%
- Fase 3 (T8-T10): ~45% → ~65%+
- Meta final: >80%

**Métricas de sucesso:**
- `pnpm test:coverage` passa com coverage >80%
- Todos os módulos com coverage >70%
- Zero regressions nos 394 testes existentes

---

#### 2.2 — Completar Package Prescriptions (88/100 → 95/100)
**Responsável:** Time Backend
**Estimativa:** 1 sprint

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| P1 | Expor repository no package.json exports | ✅ Tem InMemoryPrescriptionRepository | exports configurado |
| P2 | Criar PrescriptionController com CRUD completo | ⚠️ Service existe, controller não exposto via API | Route exposta em apps/api |
| P3 | Criar migrations de schema `prescriptions` se necessário | ⚠️ In-memory apenas | Schema em packages/shared/database |
| P4 | Criar PrescriptionRepository baseado em PostgreSQL | ❌ Não existe | Implementação DB real |
| P5 | Conectar rotas ao router da API | ❌ Não conectado | Route CRUD em `/prescriptions` |
| P6 | Adicionar testes de integração | ⚠️ Testes in-memory existem | Testes de BD |

**Métricas de sucesso:**
- `/prescriptions` endpoints respondendo na API
- `find packages/modules/prescriptions/src -name "*.test.ts" | wc -l` >= 2
- Coverage do package > 70%

---

### 🟠 PRIORIDADE ALTA

#### 2.3 — PIX Integration (78/100 → 90/100)
**Responsável:** Time Backend / Integrações
**Estimativa:** 1 sprint

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| X1 | Implementar `PagarMePixAdapter.createIntent()` | ❌ método em TODO | Método implementado |
| X2 | Implementar `PagarMePixAdapter.getStatus()` | ❌ método em TODO | Método implementado |
| X3 | Implementar `PagarMePixAdapter.confirmPayment()` | ❌ método em TODO | Método implementado |
| X4 | Implementar `PagarMePixAdapter.cancelIntent()` | ❌ método em TODO | Método implementado |
| X5 | Configurar credenciais no `.env.v2` (PAGARME_API_KEY, PAGARME_PIX_KEY) | ⚠️ Variáveis definidas mas não usadas | Variáveis configuradas |
| X6 | Criar testes de integração com mock do provider | ⚠️ Testes unitários existem | Testes de integração |
| X7 | Adicionar webhook handler para confirmação PIX | ❌ Não existe | Handler implementado |

**Métricas de sucesso:**
- PIX Cobrança = criar QR code real (chamada completa ao provider)
- PIX Status = consultar status real (chamada completa ao provider)
- Integração com webhook do Pagar.me funciona

---

#### 2.4 — Consolidar Módulo de Segurança (84/100 → 92/100)
**Responsável:** Time Security / DevOps
**Estimativa:** 1 sprint

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| S1 | Criar package `packages/security/` dedicado | ❌ Não existe | Package criado |
| S2 | Mover/centralizar headers de segurança (`helmet`) | ⚠️ Espalhado em server.ts | Centralizado |
| S3 | Configurar dependency vulnerability scanning (Snyk ou similar) | ❌ Não existe na CI | CI configurada |
| S4 | Configurar CVE scanning automatizado em PRs | ❌ Não existe | Workflow adicionado |
| S5 | Adicionar rate limiter distribuído em Redis | ⚠️ Rate limiter in-memory existe | Redis-based |
| S6 | Sistema interno de feature flags com governanca | ❌ Não existe | ✅ Implementado (`@cvg-his-v2/shared-feature-flags` + `DatabaseFeatureFlagRepository` + catalog `GET /flags`) |

**Métricas de sucesso:**
- `packages/security/` existe e exporta `SecurityModule`
- CI executa `security:audit` em todo PR
- Rate limiter Redis em produção

---

### 🟡 PRIORIDADE MÉDIA

#### 2.5 — AI/ML Completude (65/100 → 80/100)
**Responsável:** Time ML
**Estimativa:** 2 sprints

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| M1 | Implementar pipeline de OCR para receipts/fiscal | ❌ Não encontrado | Pipeline implementado |
| M2 | Implementar demand forecasting (time-series) | ❌ Não encontrado | Módulo implementado |
| M3 | Integrar MLflow como Model Registry adapter | ⚠️ Interface existe, adapter não | Adapter real |
| M4 | Adicionar testes para ML pipeline | ⚠️ Testes de scheduling existem | Cobertura > 70% |
| M5 | Documentar Feature Store com exemplos de uso | ⚠️ Código existe, docs não | README.md completo |

**Métricas de sucesso:**
- OCR processa imagens de documentos fiscais
- Forecasting gera predições de demanda
- MLflow conectado e operacional

---

#### 2.6 — Excelência Operacional F4 (52/100 → 80/100)
**Responsável:** DevOps / Platform
**Estimativa:** 2 sprints

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| F1 | Adicionar chaos engineering (LitmusChaos ou Chaos Mesh) | ❌ Não existe | Framework implementado |
| F2 | Criar Helm charts para deploy Kubernetes | ❌ Não existe | Charts funcionais |
| F3 | Migrar rate limiter para Redis (cluster/distribuído) | ⚠️ In-memory | Redis cluster |
| F4 | Sistema interno de feature flags com governanca | ❌ Não existe | ✅ Implementado (sistema proprio em vez de Unleash; `DatabaseFeatureFlagRepository` + catalog `GET /flags`) |
| F5 | Configurar backup automatizado com verificação | ⚠️ Scripts existem | Cron + verificação |
| F6 | Configurar health checks para todos os serviços | ⚠️ API tem health | Worker + SPA cobertos |

**Métricas de sucesso:**
- Chaos experiments rodando em staging
- Deploy via Helm em Kubernetes funcional
- Feature flags gerenciáveis via Unleash

---

### 🟢 PRIORIDADE BAIXA (Melhoria Contínua)

#### 2.7 — Observabilidade Avançada (82/100 → 90/100)
**Responsável:** DevOps / Platform
**Estimativa:** 1 sprint

| # | Ação | Status Atual | Status Desejado |
|---|------|--------------|-----------------|
| O1 | Configurar OpenTelemetry Collector completo | ⚠️ SDK existe, collector não | Collector configurado |
| O2 | Criar dashboards RCA em Grafana | ⚠️ Dashboard genérico existe | Dashboards específicos |
| O3 | Implementar SLO alerting automatizado | ⚠️ SLOs definidos, alerting manual | Alerting configurado |
| O4 | Adicionar tracing distribuído end-to-end | ⚠️ HTTP tracing existe | DB + worker tracing |

---

## 3. ROADMAP TEMPORAL

```
SPRINT 1  ──────────────────────────────────────────────
│ T1-T4  Cobertura testes (shared packages) ─────────► ~25%
│ X1-X4  Completar PIX adapter Pagar.me
│ P2-P5  Prescriptions: controller + API routes
│
SPRINT 2  ──────────────────────────────────────────────
│ T5-T7  Cobertura testes (auth, billing, scheduling) ─► ~45%
│ S1-S3  Security module dedicado + CVE scan
│ P6     Prescriptions: repository DB + integration tests
│
SPRINT 3  ──────────────────────────────────────────────
│ T8-T9  Cobertura testes (diagnostics, encounters) ───► ~65%
│ S5     Rate limiter Redis
│ F4     ✅ Feature flags implementado (sistema proprio)
│
SPRINT 4  ──────────────────────────────────────────────
│ T10    E2E tests para fluxos críticos ───────────────► ~80%
│ M1-M2  OCR + Forecasting pipeline
│ F1-F2  Chaos engineering + Helm
│
SPRINT 5  ──────────────────────────────────────────────
│ O1-O4  Observabilidade avançada
│ M3-M5  MLflow + Feature Store docs
│ F5-F6  Backup automatizado + health checks estendidos
```

---

## 4. GATES E CRITÉRIOS DE VALIDAÇÃO

### Gate 1 — Cobertura de Testes
```
✅ pnpm test:coverage → coverage > 80% global
✅ pnpm test:coverage → coverage > 70% em cada módulo
✅ 394 testes existentes continuam passando
✅ Zero regressions de lint ou typecheck
```

### Gate 2 — PIX Operacional
```
✅ POST /pix/intent → retorna QR code real do Pagar.me
✅ GET /pix/status/{id} → consulta status real
✅ Webhook /webhooks/pix → confirma pagamento
✅ Testes de integração passam com mock do provider
```

### Gate 3 — Prescriptions Completo
```
✅ GET/POST/PUT/DELETE /prescriptions funcional na API
✅ Repository PostgreSQL implementado
✅ Testes de integração > 80% coverage no package
```

### Gate 4 — Security Module
```
✅ packages/security/ exporta SecurityModule
✅ CI executa scan de vulnerabilidades em todo PR
✅ Rate limiter distribuído com Redis validado
```

### Gate 5 — Excelência Operacional
```
✅ Chaos experiments executando sem impacto em produção
✅ Helm charts deployam stack completa
✅ Feature flags gerenciáveis via Unleash UI
```

---

## 5. RISCOS IDENTIFICADOS

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Coverage >80% demanda mais gente | Alta | Alto | Priorizar módulos mais críticos primeiro |
| API Pagar.me muda endpoint | Média | Médio | Abstrair adapter; mock para testes |
| MLflow requerinfra customizada | Média | Médio | Começar com mock, validar interface primeiro |
| Chaos em produção sem safe guards | Baixa | Crítico | Executar apenas em staging com circuit breakers |

---

## 6. PRÓXIMOS PASSOS IMEDIATOS

1. **Executar Sprint 1 (T1-T4, X1-X4, P2-P5)** — focar em cobertura de testes dos packages compartilhados e completar PIX
2. **Criar `packages/security/`** — centralizar o que existe hoje
3. **Verificar credenciais Pagar.me** — se não houver, abrir conta ou usar mock
4. **Rodar `pnpm test:coverage` semanalmente** — tracking de progresso

---

*Plano gerado em 2026-04-13 por ClawDinho com base em `docs/Enterprise/ENTERPRISE-BUILD-REPORT.md` e verificação do repositório `cvg-his-v2`.*
