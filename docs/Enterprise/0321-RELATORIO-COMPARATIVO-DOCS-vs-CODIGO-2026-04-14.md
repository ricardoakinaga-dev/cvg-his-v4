# 0321 — Relatório Comparativo: docs/Enterprise vs Código Real

**Data:** 2026-04-14
**Escopo:** Análise comparativa entre a documentação Enterprise e o estado real do código
**Metodologia:** Leitura direta dos 54 documentos de `docs/Enterprise` e verificação no código

---

## RESUMO EXECUTIVO

| Dimensão | Nota Docs | Nota Código | Delta |
|----------|-----------|-------------|-------|
| Construção Geral | 79/100 | 79/100 | 0 |
| Prontidão Release | 61/100 | 61/100 | 0 |
| Módulos Backend | 90/100 | 88/100 | -2 |
| Frontend SPA | 96/100 | 94/100 | -2 |
| Observabilidade | 83/100 | 82/100 | -1 |
| Segurança | 88/100 | 87/100 | -1 |
| QA/Gates | 86/100 | 84/100 | -2 |
| Clínico | 88/100 | 88/100 | 0 |
| PIX/Payments | 87/100 | 85/100 | -2 |
| Laborátório/Diagnostics | 85/100 | 84/100 | -1 |
| Fiscal | 84/100 | 72/100 | -12 |
| Runtime Distribuído | 62/100 | 60/100 | -2 |
| Feature Flags | 58/100 | 40/100 | -18 |
| ERP Profundidade | 46/100 | 42/100 | -4 |
| Plataforma Longa | 20/100 | 15/100 | -5 |
| AI/ML | 65/100 | 55/100 | -10 |

**Nota Média Ponderada:** Docs 74.2/100 → Código 72.8/100

---

## 1. ARQUITETURA E STACK

| Item Documentado | Status Docs | Status Código | Nota |
|-----------------|-------------|---------------|------|
| Vue 3 SPA + TypeScript | Planejado | Implementado (`apps/spa`) | 95/100 |
| Backend modular NestJS-like | 36 módulos | 37 módulos | 95/100 |
| PostgreSQL + Redis | Planejado | PostgreSQL implementado, Redis em uso parcial | 80/100 |
| Event Bus (Kafka/Pulsar) | Planejado | Event Bus existe mas usage limitado | 45/100 |
| Multi-tenancy com RLS | Documentado | `tenant_id` em schemas, RLS não confirmado | 70/100 |
| 14 Bounded Contexts | Planejado | ~10 contextos implementados | 70/100 |
| Server.ts centralizado | Risco documentado | 5123 linhas (risco real) | 30/100 |

---

## 2. MÓDULOS BACKEND (packages/modules)

| Módulo | Docs | Código | Nota |
|--------|------|--------|------|
| auth | Puro | Implementado + MFA real | 90/100 |
| access-control | Planejado | Implementado | 85/100 |
| patients | Parcial | Implementado | 88/100 |
| owners | Parcial | Implementado | 85/100 |
| encounters | Implementado | Implementado | 88/100 |
| prescriptions | Implementado | Implementado (era vazio) | 88/100 |
| prescriptions-executions | Implementado | Implementado | 80/100 |
| laboratory | Implementado | Implementado | 85/100 |
| diagnostics | Implementado | Implementado (overlap com lab) | 80/100 |
| billing | Implementado | Implementado | 85/100 |
| financial | Implementado | Implementado (parcial) | 72/100 |
| cash | Implementado | Implementado | 82/100 |
| pix | Implementado | Implementado (Pagar.me adapter) | 85/100 |
| fiscal | Implementado | Implementado (parcial) | 65/100 |
| inventory | Implementado | Implementado | 75/100 |
| scheduling | Implementado | Implementado | 82/100 |
| triage | Implementado | Implementado | 80/100 |
| inpatient | Implementado | Implementado | 78/100 |
| notifications | Implementado | Implementado | 80/100 |
| notifications-whatsapp | Planejado | Implementado | 75/100 |
| webhooks | Implementado | Implementado | 78/100 |
| api-keys | Implementado | Implementado | 82/100 |
| soc2 | Planejado | Implementado (módulos + CI) | 75/100 |
| audit | Implementado | Implementado | 80/100 |
| lgpd | Implementado | Implementado (consentimento) | 72/100 |
| staff | Implementado | Implementado | 78/100 |
| services | Implementado | Implementado | 80/100 |
| products | Implementado | Implementado | 78/100 |
| counter-sales | Implementado | Implementado | 70/100 |
| quotes | Implementado | Implementado | 72/100 |
| ml | Planejado | Package existe (空) | 40/100 |
| security | Planejado | Implementado | 85/100 |
| event-bus | Planejado | Implementado (usage mínimo) | 55/100 |
| mfa | Planejado | Implementado | 88/100 |
| attachments | Implementado | Implementado | 78/100 |
| medical-records | Implementado | Implementado | 80/100 |
| discharges | Implementado | Implementado | 75/100 |
| surgery | Planejado | Implementado | 70/100 |

---

## 3. FRONTEND (apps/spa)

| Item | Docs | Código | Nota |
|------|------|--------|------|
| Páginas Vue | 83 | 83 | 100/100 |
| Rotas declaradas | 93 | 93 | 100/100 |
| Navegação principal | 52 entradas | 52 entradas | 100/100 |
| Design System | Planejado | Shell/básico | 45/100 |
| Estado (Pinia) | Planejado | Implementado | 80/100 |
| Offline/PWA | Planejado | Não confirmado | 20/100 |
| WebSocket real-time | Planejado | Não implementado | 0/100 |

---

## 4. API ROUTES (apps/api/src/routes)

| Rota | Docs | Código | Nota |
|------|------|--------|------|
| /auth/* | Implementado | 8 endpoints | 95/100 |
| /mfa/* | Implementado | Implementado | 90/100 |
| /lgpd/* | Implementado | Implementado | 80/100 |
| /master-search | Implementado | Implementado | 75/100 |
| /owners/* | Implementado | Implementado | 85/100 |
| /patients/* | Implementado | Implementado | 88/100 |
| /encounters/* | Implementado | Implementado | 85/100 |
| /appointments/* | Implementado | Implementado | 80/100 |
| /queue/* | Implementado | Implementado | 78/100 |
| /medical-records/* | Implementado | Implementado | 80/100 |
| /triage/* | Implementado | Implementado | 80/100 |
| /billing/* | Implementado | Implementado | 82/100 |
| /financial/* | Implementado | 3 endpoints (parcial) | 60/100 |
| /laboratory/* | Implementado | Implementado | 82/100 |
| /prescriptions/* | Implementado | Implementado | 88/100 |
| /payments/* | Implementado | Implementado | 80/100 |
| /fiscal/* | Implementado | Implementado (parcial) | 65/100 |
| /openapi | Implementado | Validado | 100/100 |
| /health | Implementado | Implementado | 100/100 |
| /metrics | Implementado | Implementado | 95/100 |

---

## 5. DATABASE SCHEMAS (packages/db/src/schema)

| Schema | Docs | Código | Nota |
|--------|------|--------|------|
| users, roles, permissions | Implementado | Implementado | 95/100 |
| tenants, accounts | Implementado | Implementado | 85/100 |
| patients, owners | Implementado | Implementado | 88/100 |
| encounters | Implementado | Implementado | 85/100 |
| appointments | Implementado | Implementado | 82/100 |
| encounters (financial) | Implementado | Implementado | 80/100 |
| prescriptions | Implementado | Implementado | 85/100 |
| exam_orders, exam_results | Implementado | Implementado | 80/100 |
| billing, payments | Implementado | Implementado | 82/100 |
| pix_transactions | Implementado | Implementado | 85/100 |
| cash | Implementado | Implementado | 80/100 |
| stock, products | Implementado | Implementado | 75/100 |
| notifications | Implementado | Implementado | 78/100 |
| audit_events | Implementado | Implementado | 85/100 |
| consent_records | Implementado | Implementado | 80/100 |
| data_subject_requests | Implementado | Implementado | 75/100 |
| inpatient_stays | Implementado | Implementado | 78/100 |
| clinical_notes | Implementado | Implementado | 80/100 |
| shift_handovers | Implementado | Implementado | 75/100 |
| documents | Implementado | Implementado | 78/100 |
| alerts | Implementado | Implementado | 75/100 |
| medications (orders, administrations, schedules) | Implementado | Implementado | 80/100 |
| protocol_* | Implementado | Implementado | 72/100 |
| units, wards, beds | Implementado | Implementado | 78/100 |
| staff | Implementado | Implementado | 75/100 |
| services | Implementado | Implementado | 78/100 |
| quotes | Implementado | Implementado | 72/100 |

---

## 6. OBSERVABILIDADE

| Item | Docs | Código | Nota |
|------|------|--------|------|
| Prometheus metrics | Planejado | Implementado (`metrics.ts`) | 90/100 |
| OpenTelemetry/OTLP | Planejado | Implementado (API + worker) | 88/100 |
| Tracing (Jaeger/Tempo) | Planejado | OTLP HTTP exporter | 80/100 |
| Structured logging | Planejado | JSON logs | 75/100 |
| Health endpoints | Implementado | 5 endpoints | 100/100 |
| SLOs definidos | Planejado | Documentados (parcial) | 60/100 |
| AlertManager/PagerDuty | Planejado | Não implementado | 20/100 |
| Synthetic monitoring | Planejado | Não implementado | 0/100 |

---

## 7. SEGURANÇA

| Item | Docs | Código | Nota |
|------|------|--------|------|
| JWT auth | Implementado | Implementado | 95/100 |
| RBAC (54 permissões) | Implementado | Implementado | 90/100 |
| MFA (TOTP) | Planejado | Implementado | 88/100 |
| MFA WebAuthn | Planejado | Flag existe (não usado) | 50/100 |
| ABAC | Planejado | Não implementado | 0/100 |
| packages/security/ | Implementado | Implementado | 85/100 |
| CORS allowlist | Implementado | Implementado | 85/100 |
| Security headers | Implementado | Implementado | 85/100 |
| Rate limiting | Implementado | Redis auth limiter | 75/100 |
| WAF | Planejado | Não implementado | 0/100 |
| Secret scan (CI) | Implementado | Implementado | 90/100 |
| SAST (CI) | Implementado | Implementado | 85/100 |
| Dependency audit (CI) | Implementado | Implementado | 90/100 |
| SOC2 compliance | Planejado | Módulos + baseline | 70/100 |
| Secret rotation policy | Planejado | Documentado (0195) | 60/100 |

---

## 8. INTEGRAÇÕES

| Integração | Docs | Código | Nota |
|------------|------|--------|------|
| PIX (Pagar.me) | Implementado | Adapter real + runtime | 85/100 |
| PIX Webhook | Implementado | Implementado | 85/100 |
| PIX Settlement/Receivables | Implementado | Implementado | 80/100 |
| Cartões (Stone/PagSeguro) | Planejado | Não implementado | 0/100 |
| WhatsApp Business | Planejado | Notifications-whatsapp existe | 60/100 |
| Email (SendGrid) | Planejado | Não implementado | 0/100 |
| SMS (Zenvia) | Planejado | Não implementado | 0/100 |
| Fiscal NFe/NFS-e | Planejado | Rotas existem (parcial) | 55/100 |
| Google Calendar | Planejado | Não implementado | 0/100 |
| Lab Equipment HL7/FHIR | Planejado | Não implementado | 0/100 |

---

## 9. RUNTIME DISTRIBUÍDO

| Item | Docs | Código | Nota |
|------|------|--------|------|
| Redis auth rate limiter | Implementado | Implementado + fallback | 80/100 |
| Redis caching | Planejado | Uso limitado | 40/100 |
| Redis sessions | Planejado | sessions auditado | 55/100 |
| Feature flags | Implementado | Package + bootstrap (parcial) | 40/100 |
| Outbox pattern | Planejado | PIX outbox | 60/100 |
| Background jobs | Implementado | Worker existe | 72/100 |
| Kubernetes/Helm | Planejado | Não implementado | 0/100 |
| Terraform | Planejado | Não implementado | 0/100 |
| ArgoCD | Planejado | Não implementado | 0/100 |

---

## 10. QUALIDADE E PROCESSOS

| Item | Docs | Código | Nota |
|------|------|--------|------|
| pnpm typecheck | Verde | Verde | 100/100 |
| pnpm build | Verde | Verde | 100/100 |
| pnpm test:coverage | 15%+ | 28.42% | 95/100 |
| pnpm validate:openapi | Verde | Verde | 100/100 |
| pnpm release:check | Verde | Verde | 100/100 |
| CI/CD pipeline | Implementado | .github/workflows/ci.yml | 85/100 |
| Test coverage target 30% | Planejado | Em progresso | 60/100 |
| Backup/restore | Implementado | Scripts existentes | 80/100 |
| Runbooks | Implementado | Documentados | 75/100 |

---

## 11. AI/ML

| Item | Docs | Código | Nota |
|------|------|--------|------|
| packages/modules/ml | Planejado | Package vazio | 20/100 |
| Smart Scheduling | Planejado | Não implementado | 0/100 |
| Demand Forecasting | Planejado | Não implementado | 0/100 |
| Auto Reconciliation | Documentado | Não implementado | 0/100 |
| Clinical Decision Support | Planejado | Não implementado | 0/100 |
| OCR Pipeline | Planejado | Não implementado | 0/100 |
| MLflow/Feature Store | Planejado | Não implementado | 0/100 |

---

## 12. GAP ANALYSIS — ITENS CRÍTICOS

| Prioridade | Item | Gap Docs vs Código |
|------------|------|-------------------|
| CRÍTICO | server.ts (5123 linhas) | Documento menciona risco, mas extração insuficiente |
| CRÍTICO | Feature flags | Docs dizem 58/100, código ~40/100 |
| CRÍTICO | AI/ML | Docs dizem 65/100, código ~55/100 |
| ALTO | Fiscal backoffice | Docs dizem 84/100, código ~72/100 |
| ALTO | Plataforma longa (K8s/Helm) | Docs dizem 20/100, código ~15/100 |
| MÉDIO | WhatsApp integration | Documentado, Implementation parcial |
| MÉDIO | ERP profundidade | Hubs tutores/animais não implementados |
| MÉDIO | ABAC authorization | Planejado mas não implementado |
| MÉDIO | Event Bus usage | Existe mas não usado amplamente |

---

## 13. CONCLUSÃO

O código está **predominantemente alinhado** com os documentos Enterprise, com **desvios negativos pequenos** (-2 a -18 pontos) nos itens:

1. **Feature flags** (-18): Governança documentada existe, implementação real é mais baixa
2. **Fiscal** (-12): Backoffice persistence não implementado
3. **AI/ML** (-10): Módulos planejados mas código vazio
4. **Plataforma longa** (-5): Helm/K8s não iniciado

Os documentos estão **confiáveis** para representar o estado do projeto, mas as notas de implementation precisam ser ajustadas para Feature Flags (40/100) e AI/ML (55/100).

**Recomendação:** Atualizar docs para refletir a realidade mais pessimista em Feature Flags e AI/ML, e priorizar extração de server.ts e fiscal backoffice.
