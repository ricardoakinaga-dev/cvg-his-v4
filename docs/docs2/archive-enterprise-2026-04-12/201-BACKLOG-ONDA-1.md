# BACKLOG ONDA 1 — Fundação Crítica (Detalhado)

## E1-01: Multi-Tenancy no Banco (34 pts)

### Histórias
- **E1-01-01** (8pts): Como DBA, quero adicionar `tenant_id` UUID em todas as 49 tabelas para suportar isolamento de dados.
  - AC: Todas as tabelas têm coluna `tenant_id NOT NULL` com FK para `tenants`
  - AC: Índices compostos `(tenant_id, ...)` em tabelas transacionais

- **E1-01-02** (5pts): Como arquiteto, quero criar tabelas `tenants`, `companies`, `branches` para modelar organização multi-nível.
  - AC: Hierarquia Tenant → Company → Branch funcional
  - AC: Configurações herdadas com override por branch

- **E1-01-03** (8pts): Como segurança, quero Row-Level Security no PostgreSQL para garantir isolamento.
  - AC: RLS policies em todas as tabelas transacionais
  - AC: Usuário sem contexto de tenant não vê dados

- **E1-01-04** (5pts): Como backend, quero middleware que injeta `tenant_id` em todas as queries automaticamente.
  - AC: Request sem tenant_id é rejeitada
  - AC: Queries automaticamente filtradas por tenant

- **E1-01-05** (5pts): Como DevOps, quero script de migração que move dados existentes para tenant padrão.
  - AC: Zero dados perdidos na migração
  - AC: Migração executável em < 30min

- **E1-01-06** (3pts): Como QA, quero testes de isolamento entre tenants.
  - AC: Tenant A não vê dados de Tenant B em nenhum cenário

## E1-02: MFA e Autenticação Avançada (21 pts)

### Histórias
- **E1-02-01** (8pts): Como segurança, quero TOTP MFA (Google Authenticator) para perfis críticos.
  - AC: Setup de MFA com QR code
  - AC: Login exige TOTP para perfis admin/financeiro/gestor
  - AC: Recovery codes gerados

- **E1-02-02** (5pts): Como segurança, quero WebAuthn MFA para biometria/chave de segurança.
  - AC: Cadastro de chave de segurança
  - AC: Login com biometria em dispositivos compatíveis

- **E1-02-03** (5pts): Como sistema, quero step-up authentication para ações sensíveis.
  - AC: Estorno, ajuste de estoque e alteração de preço exigem re-autenticação
  - AC: Re-autenticação válida por 5 minutos

- **E1-02-04** (3pts): Como sistema, quero rate limiting (100 req/min por usuário).
  - AC: Requests acima do limite retornam 429
  - AC: Headers `X-RateLimit-*` presentes

## E1-03: LGPD Pipeline (21 pts)

### Histórias
- **E1-03-01** (5pts): Como sistema, quero tabela `consent_records` para registrar consentimento granular.
  - AC: Consentimento por finalidade (marketing, clínico, analytics)
  - AC: Revogação propagada para todos os sistemas

- **E1-03-02** (5pts): Como titular, quero solicitar exportação dos meus dados pessoais.
  - AC: Exportação em JSON/CSV em < 5min
  - AC: Inclui dados de owners, patients, encounters

- **E1-03-03** (5pts): Como titular, quero solicitar exclusão dos meus dados (direito ao esquecimento).
  - AC: Anonimização irreversível com audit trail
  - AC: Dados fiscais preservados conforme lei

- **E1-03-04** (3pts): Como sistema, quero mascaramento de dados sensíveis em logs.
  - AC: CPF, telefone, endereço mascarados em logs
  - AC: Dados clínicos nunca aparecem em logs

- **E1-03-05** (3pts): Como compliance, quero retenção policies configuráveis.
  - AC: Retenção por tipo de dado configurável
  - AC: Descarte automático com auditoria

## E1-04: Observabilidade Premium (13 pts)
- **E1-04-01** (5pts): Prometheus + Grafana com dashboards
- **E1-04-02** (3pts): OpenTelemetry tracing
- **E1-04-03** (3pts): AlertManager com SLOs
- **E1-04-04** (2pts): Uptime monitoring

## E1-05: API Gateway (13 pts)
- **E1-05-01** (5pts): Gateway com roteamento e rate limiting
- **E1-05-02** (3pts): API versioning
- **E1-05-03** (3pts): Circuit breaker
- **E1-05-04** (2pts): Health check aggregation

## E1-06: Quality Gates (8 pts)
- **E1-06-01** (3pts): Coverage > 60% enforcement
- **E1-06-02** (3pts): Contract testing setup
- **E1-06-03** (2pts): Security scan pipeline
