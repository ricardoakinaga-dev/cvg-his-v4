# ONDA 1 — FUNDAÇÃO CRITICA (Meses 1-4)
## Score: 42 → 58 (+16 pontos)

## Objetivo
Construir a fundação técnica que permite todas as outras ondas: multi-tenancy, segurança avançada, LGPD compliance e observabilidade.

## Etapas

### Etapa 1.1 — Multi-Tenancy no Banco (Mês 1)
**Entregas:**
- [ ] Adicionar `tenant_id` UUID em todas as 49 tabelas existentes
- [ ] Criar tabela `tenants` com configurações
- [ ] Criar tabela `companies` (entidades jurídicas)
- [ ] Criar tabela `branches` (filiais) — expandir `units`
- [ ] Implementar Row-Level Security (RLS) no PostgreSQL
- [ ] Middleware de injeção de `tenant_id` em todas as queries
- [ ] Script de migração de dados existentes para tenant padrão
- [ ] Índices compostos `(tenant_id, ...)` em tabelas críticas
- [ ] Testes de isolamento entre tenants

**Critérios de Aceite:**
- Query sem `tenant_id` retorna erro ou vazio
- Dois tenants não veem dados um do outro
- Migração não perde dados existentes

### Etapa 1.2 — MFA e Segurança Avançada (Mês 1-2)
**Entregas:**
- [ ] TOTP MFA (Google Authenticator compatible)
- [ ] WebAuthn MFA (biometria/chave de segurança)
- [ ] Setup de MFA obrigatório para perfis: admin, financeiro, gestor
- [ ] Step-up authentication para ações sensíveis (estorno, ajuste)
- [ ] Rate limiting no API (100 req/min por usuário)
- [ ] Password policy enforcement (12+ chars, complexity)
- [ ] Session anomaly detection (IP change, concurrent sessions)
- [ ] Credential rotation policy

**Critérios de Aceite:**
- Admin não consegue login sem MFA
- Estorno exige re-autenticação
- Brute force é bloqueado após 5 tentativas

### Etapa 1.3 — LGPD Pipeline (Mês 2-3)
**Entregas:**
- [ ] Tabela `consent_records` com granularidade por finalidade
- [ ] Tabela `data_subject_requests` para solicitações
- [ ] API de consentimento (grant, revoke, list)
- [ ] Pipeline de exportação de dados pessoais (JSON/CSV)
- [ ] Pipeline de anonimização (right to be forgotten)
- [ ] Data classification (Público, Interno, Confidencial, Restrito)
- [ ] Mascaramento de dados sensíveis em logs
- [ ] Retention policies configuráveis por tipo de dado
- [ ] Portal básico de solicitações do titular

**Critérios de Aceite:**
- Consentimento é registrado antes de coleta de dados
- Exportação de dados pessoais em < 5 minutos
- Anonimização é auditada e irreversível

### Etapa 1.4 — Observabilidade Premium (Mês 2-3)
**Entregas:**
- [ ] Prometheus metrics endpoint em todos os serviços
- [ ] Grafana dashboards (infra, app, business)
- [ ] OpenTelemetry tracing em requests críticos
- [ ] Structured logging com correlation IDs
- [ ] AlertManager com regras para P1/P2
- [ ] SLOs definidos por serviço
- [ ] Error budgets calculados
- [ ] Uptime monitoring (synthetic checks)
- [ ] Log aggregation (Loki ou ELK)

**Critérios de Aceite:**
- Dashboard mostra latência, erro rate, throughput por endpoint
- Alerta dispara em < 1min para erro > 1%
- Trace de request mostra chamada entre serviços

### Etapa 1.5 — API Gateway (Mês 3-4)
**Entregas:**
- [ ] Gateway com roteamento por path/service
- [ ] Rate limiting por tenant e por usuário
- [ ] Request/Response logging
- [ ] API versioning (/v1, /v2)
- [ ] CORS configuration
- [ ] Health check aggregation
- [ ] Circuit breaker para dependências externas
- [ ] Request ID propagation

**Critérios de Aceite:**
- Todas as requests passam pelo gateway
- Rate limiting bloqueia após limite
- Versionamento funciona (/v1/owners vs /v2/owners)

### Etapa 1.6 — Testes e Quality Gates (Mês 4)
**Entregas:**
- [ ] Coverage > 60% (target: subir de ~35%)
- [ ] Contract testing (Pact) entre módulos
- [ ] Integration tests para multi-tenancy
- [ ] Security tests (OWASP ZAP scan)
- [ ] Performance benchmarks baseline
- [ ] CI pipeline com quality gates

**Critérios de Aceite:**
- PR não merge com coverage < 60%
- Security scan sem high/critical
- API P95 < 500ms documentado

## Score Esperado ao Final da Onda 1

| Categoria | Antes | Depois |
|-----------|-------|--------|
| Modelo de Dados | 70 | 85 (+15) |
| Auth/Autorização | 65 | 85 (+20) |
| LGPD/Compliance | 15 | 60 (+45) |
| Observabilidade | 30 | 75 (+45) |
| Segurança | 45 | 70 (+25) |
| CI/CD | 55 | 70 (+15) |
| Testes | 35 | 55 (+20) |
| **Score Global** | **42** | **58** |
