# BLUEPRINT ENTERPRISE — CVG-HIS-V2

## 1. Arquitetura Alvo Premium

### Stack Atual → Alvo

| Camada | Atual | Alvo Premium |
|--------|-------|-------------|
| Frontend | Server-side HTML | Vue 3 SPA + Design System |
| API | HTTP REST nativo | REST + Gateway + WebSocket |
| Auth | JWT + RBAC | JWT + RBAC + ABAC + MFA + SSO |
| Backend | NestJS-like modular | Modular + CQRS + Event Sourcing |
| Database | PostgreSQL 16 | PostgreSQL + Redis + Elasticsearch + ClickHouse |
| Cache | Redis 7 | Redis Cluster + CDN |
| Events | Nenhum | Kafka/Pulsar + Outbox Pattern |
| Observability | Logs básicos | Prometheus + Grafana + Jaeger + SLOs |
| Deploy | Docker Compose | Kubernetes + Terraform + ArgoCD |
| Security | RBAC | Zero Trust + WAF + MFA + SOC2 |

### 14 Bounded Contexts Alvo

```
┌─────────────────────────────────────────────────┐
│  1. Identity & Access (SSO, MFA, RBAC, ABAC)    │
│  2. Organization & Tenancy (multi-tenant)       │
│  3. Master Data (owners, patients, staff)       │
│  4. Scheduling (appointments, queue, triage)    │
│  5. Encounter & Billing (atendimento, comanda)  │
│  6. Medical Record (prontuário, prescrições)    │
│  7. Inpatient (internação, bed board, handover) │
│  8. Diagnostics (exames, laudos, equipamentos)  │
│  9. Inventory & Procurement (estoque, compras)  │
│  10. Billing & Treasury (financeiro, split)     │
│  11. Tax (fiscal, NF, tributário)               │
│  12. CRM & Notifications (WhatsApp, email)      │
│  13. Commissions & Productivity                 │
│  14. Reporting & Analytics (dashboards, BI)     │
└─────────────────────────────────────────────────┘
```

## 2. Modelo de Multi-Tenancy

### Estrutura
```
Tenant (corporação cliente)
  └── Company (entidade jurídica — CNPJ)
        └── Branch (filial/unidade)
              └── Sector (setor operacional)
                    └── Bed (leito)
```

### Implementação
- `tenant_id` UUID em TODAS as tabelas transacionais
- Row-level security (RLS) no PostgreSQL
- Middleware de injeção de contexto em toda request
- Configurações herdadas com override por branch
- Dados mestres compartilhados ou locais por tenant

### Regras de Isolamento
- Tenant não vê dados de outro tenant (hard isolation)
- Branch não vê dados de outra branch (filtragem)
- Dados mestres podem ser globais (serviços, produtos) ou locais (estoque, agenda)

## 3. Frontend Premium Alvo

### Stack
- **Framework:** Vue 3 + TypeScript + Composition API
- **State:** Pinia com persistência
- **UI:** Design System próprio (tokens + 50 componentes)
- **Build:** Vite com HMR
- **PWA:** Service Worker + offline mode
- **Real-time:** WebSocket para updates ao vivo

### Design System
- **Tokens:** cores, spacing, typography, shadows, borders
- **Components:** Button, Input, Card, Table, Modal, Toast, Select, DatePicker, Tabs, Badge, Avatar, Tooltip, Dropdown, Pagination, Skeleton, EmptyState, CommandPalette, SearchBar, FileUpload, Charts...
- **Patterns:** list page, detail page, wizard, dashboard, form
- **Themes:** light + dark + custom per tenant

## 4. Security Alvo

### Auth Stack
- JWT (access + refresh) — já existe
- MFA (TOTP + WebAuthn) — novo
- SSO (OAuth2/OIDC) — novo
- Adaptive auth (step-up) — novo

### Authorization
- RBAC (54 permissões) — já existe
- ABAC (contexto: tenant, branch, sector) — novo
- Segregação enforcement automático — novo
- Recertificação trimestral — novo

### Infrastructure Security
- WAF (Cloudflare/AWS WAF) — novo
- Rate limiting (API Gateway) — novo
- TLS 1.3 everywhere — configurar
- Secret management (Vault) — novo
- DLP para exportações — novo

## 5. Observability Alvo

### Stack
- **Metrics:** Prometheus + Grafana
- **Logs:** Structured JSON → ELK/Loki
- **Traces:** OpenTelemetry → Jaeger/Tempo
- **Alerting:** AlertManager + PagerDuty
- **Uptime:** Synthetic monitoring

### SLOs
| Serviço | SLO | Error Budget |
|---------|-----|-------------|
| API Gateway | 99.95% | 21.9min/mês |
| Auth | 99.99% | 4.3min/mês |
| Core API | 99.9% | 43.8min/mês |
| Web App | 99.9% | 43.8min/mês |
| Background Jobs | 99.5% | 3.6h/mês |

## 6. AI/ML Alvo

### Modelos Planejados
1. **Smart Scheduling:** sugestão de horários ótimos
2. **Demand Forecasting:** previsão de demanda de insumos
3. **Auto Reconciliation:** conciliação financeira automática
4. **Clinical Decision Support:** alertas de interações
5. **Anomaly Detection:** anomalias em exames laboratoriais
6. **OCR Pipeline:** leitura de notas fiscais
7. **Smart Collections:** cobrança inteligente
8. **Recommendation Engine:** recomendação de serviços

### Infraestrutura
- Feature Store
- Model Registry (MLflow)
- Training Pipeline (Airflow/Prefect)
- Serving Infrastructure (FastAPI + Redis)
- Monitoring de modelos (drift, accuracy)

## 7. Integrações Alvo

| Integração | Protocolo | Prioridade |
|-----------|-----------|-----------|
| PIX | REST | Onda 3 |
| Cartões (Stone/PagSeguro) | REST + Webhook | Onda 3 |
| WhatsApp Business | Cloud API | Onda 3 |
| Email (SendGrid) | SMTP/API | Onda 3 |
| SMS (Zenvia) | REST | Onda 3 |
| Fiscal (NFe/NFS-e) | REST + Cert | Onda 3 |
| Google Calendar | REST | Onda 3 |
| Maps | REST | Onda 4 |
| BI (Metabase) | JDBC | Onda 4 |
| Lab Equipment | HL7/FHIR | Onda 4 |
