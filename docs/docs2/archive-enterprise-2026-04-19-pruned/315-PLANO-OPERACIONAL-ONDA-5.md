# PLANO OPERACIONAL — ONDA 5 (Meses 17-18)
## Excelência Operacional e Certificação

---

## 1. CONTEXTO

A Onda 5 é a última onda do programa e visa fechar os gaps finais para operação enterprise de alta confiabilidade. O foco principal é certificabilidade (SOC2) e excelência operacional.

**Score Atual:** 87/100 → **Meta:** 90/100

---

## 2. ESTRUTURA DE SQUADS

### Squad Platform Excellence (Mes 17-18)
| Papel | Qtd | Foco |
|-------|-----|------|
| Platform Engineer | 2 | Chaos, Performance, Kubernetes |
| SRE | 1 | SLOs, alerting, reliability |
| Security Engineer | 1 | SOC2 controls, compliance |
| QA Lead | 1 | Coverage, quality gates |

### Squad Documentation (Mes 17-18)
| Papel | Qtd | Foco |
|-------|-----|------|
| Tech Writer | 1 | Documentação técnica |
| Developer Advocate | 0.5 | Developer guide, API docs |

**Total por mês:** 6-7 pessoas

---

## 3. ETAPAS E DEPENDÊNCIAS

```
Mês 17: Chaos Engineering + Performance
├── Chaos Monkey em staging
├── Performance audit + optimizations
├── Query optimization (EXPLAIN ANALYZE)
├── CDN + PgBouncer configuration
├── OpenTelemetry + OTLP exporter
├── Zod config validation fail-fast
├── CORS/security hardening baseline
└── Load testing (10K users)

Mês 18: Documentation + SOC2 + Quality Gates
├── OpenAPI 3.1 completa
├── Architecture Decision Records (ADRs)
├── Runbooks por domínio
├── Developer + User guides
├── SOC2 gap analysis
├── Coverage gate progressivo 15→40→60→80
├── Backup + restore automatizado
├── Redis rate limiter
├── Unleash feature flags
├── Helm charts base para k8s
├── Vault / secrets manager plan
├── ADR Fastify
├── Event-driven architecture roadmap
└── Disaster recovery test
```

---

## 4. CRITÉRIOS DE ENTREGA POR ETAPA

### 4.1 Chaos Engineering (Mês 17)
- [ ] Chaos Monkey configurado em staging
- [ ] Game day realizado com time de ops
- [ ] Network partition tested
- [ ] Latency injection tested
- [ ] Runbooks documentados
- [ ] Métrica: MTTR < 30min

### 4.2 Performance Premium (Mês 17)
- [ ] Performance audit completo
- [ ] Top 10 queries otimizadas
- [ ] PgBouncer configurado
- [ ] CDN para assets estáticos
- [ ] Read replicas configuradas
- [ ] Métricas: LCP < 1.5s, API P95 < 200ms

### 4.2B Platform Hardening (Mês 17-18)
- [x] Config central validada com schema Zod
- [x] Bootstrap falha ao detectar variáveis inválidas/ausentes
- [x] CORS com allowlist por ambiente
- [x] Secret scanning no CI
- [x] Plano de rotação de segredos documentado
- [x] OpenTelemetry exportando traces reais via OTLP
- [x] Logs e traces correlacionáveis por request/correlation id

### 4.2C Runtime Enterprise (Mês 18)
- [x] Backup automatizado com retenção definida
- [x] Restore test executado com evidência
- [ ] Rate limiter migrado para Redis
- [ ] Feature flags com Unleash
- [ ] Helm charts mínimos de API, worker e SPA
- [ ] ADR de adoção ou rejeição de Fastify
- [ ] Plano progressivo de Vault/secrets manager
- [ ] Roadmap event-driven com contratos e DLQ governados

### 4.3 Documentation Premium (Mês 17-18)
- [ ] OpenAPI 3.1 spec 100% documentada
- [ ] ADRs para decisões-chave
- [ ] Runbooks por domínio
- [ ] Developer guide completo
- [ ] User guide por persona
- [x] Deployment guide

### 4.4 SOC2 Path (Mês 18)
- [ ] Gap analysis SOC2 Type I
- [ ] Controles documentados
- [ ] Evidence collection automated
- [ ] Auditor pre-qualification
- [ ] Timeline: SOC2 Type I (M24), Type II (M30)

### 4.5 Quality Gates Finais (Mês 18)
- [ ] Coverage progression: 15% → 40% → 60% → 80%
- [ ] Zero critical/high vulnerabilities
- [ ] WCAG 2.1 AA validation
- [ ] LGPD compliance audit
- [ ] Disaster recovery tested
- [ ] Load test 10K concurrent users

---

## 5. SOC2 CONTROLS REGISTRY

### Controles Críticos a Documentar
| Controle | Status Atual | Target |
|----------|--------------|--------|
| Access Control (AC) | Parcial | Documentado + Automated |
| Change Management (CM) | Parcial | Automated via CI |
| Incident Response (IR) | Runbooks | Automated evidence |
| Monitoring (MO) | Dashboards | Automated alerting |
| Data Protection (DP) | LGPD | Encryption at rest + transit |
| Vendor Management (VM) | N/A | Contract + review process |

### Evidence Collection
- [ ] Cloudtrail/logs para acesso
- [ ] Git history para mudanças
- [ ] Alerts para incidentes
- [ ] Encryption certificates
- [ ] Access reviews trimestrais

---

## 6. QUALITY GATES FINAIS

| Gate | Critério | Status |
|------|----------|--------|
| Coverage | 15% imediato, 40% intermediário, 80% target | Current executável em 2026-04-12: 4.44% lines/statements |
| Vulnerabilities | 0 Critical/High | Current: needs scan |
| Performance | LCP < 1.5s, API P95 < 200ms | Current: unknown |
| Accessibility | WCAG 2.1 AA | Current: not tested |
| LGPD | Compliance audit passed | Current: partial |
| DR | RTO < 4h, RPO < 1h | Current: restore drill local executado em 2026-04-12 com `pnpm ops:restore:drill:v2`; restore de DB + storage validado em runtime descartável |
| Config | Fail-fast + schema strict | Current: baseline entregue em 2026-04-12 |
| Observability | OTel + OTLP + correlation | Current: OTel + OTLP + spans HTTP/DB/worker entregues; logs estruturados correlacionados por `requestId`/`correlationId` e `traceId` |
| Secrets | Vault/manager + scan + rotation | Current: scan + politica de rotacao entregues; manager dedicado pendente |

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Prob | Impacto | Mitigação |
|-------|------|---------|------------|
| SOC2 auditor não disponível | Média | Alto | Pre-qualify 2 auditors agora |
| Coverage target muito agressivo | Alta | Médio | Priorizar módulos críticos primeiro |
| Load test revela problemas graves | Média | Alto | Começar testing cedo no mês 17 |
| Documentação desatualizada | Alta | Médio | Automatizar onde possível |

---

## 8. ORQUESTRADOR E EXECUTORES

**Orquestrador:** Platform Engineer Lead + Security Engineer
- Coordena entrega de qualidade
- Garante alinhamento SOC2
- Valida quality gates

**Executores:**
- Executor A: Chaos + Performance (Platform Eng 2)
- Executor B: Documentation + SOC2 (Tech Writer + Security)
- Executor C: Quality Gates + DR (QA Lead + SRE)
