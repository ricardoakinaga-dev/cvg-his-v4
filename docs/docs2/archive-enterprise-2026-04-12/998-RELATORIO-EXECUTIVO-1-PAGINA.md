# RELATORIO EXECUTIVO 1 PAGINA - ENTERPRISE PLAN CVG-HIS-V2

## Objetivo

Transformar o CVG-HIS-V2 em uma plataforma enterprise premium em `18 meses`, elevando o score global de maturidade de `42/100` para `90+/100`.

## Diagnostico atual

O produto ja possui uma base funcional relevante, com arquitetura modular, backend estruturado e cobertura ampla de dominios de negocio. Ainda assim, existem gaps materiais nas frentes de:

- frontend e experiencia do usuario
- design system
- observabilidade
- seguranca avancada
- LGPD e compliance
- integracoes externas
- AI/ML
- testes, performance e documentacao

## Estrategia de transformacao

O plano esta dividido em `5 ondas` sequenciais:

| Onda | Periodo     | Objetivo central          | Evolucao de score |
| ---- | ----------- | ------------------------- | ----------------- |
| 1    | Meses 1-4   | Fundacao critica          | `42 -> 58`        |
| 2    | Meses 5-9   | Frontend premium          | `58 -> 72`        |
| 3    | Meses 10-13 | Integracoes e API         | `72 -> 82`        |
| 4    | Meses 14-16 | AI/ML                     | `82 -> 87`        |
| 5    | Meses 17-18 | Excelencia e certificacao | `87 -> 90+`       |

## Entregas mais relevantes por onda

### Onda 1

- multi-tenancy com isolamento por tenant
- MFA, step-up auth e rate limiting
- pipeline LGPD
- observabilidade com metricas, logs, traces e alertas
- API Gateway e quality gates

### Onda 2

- design system proprio
- SPA em Vue 3
- migracao das principais telas
- dark mode, acessibilidade, WebSocket e PWA

### Onda 3

- Event Bus e arquitetura assincrona
- pagamentos PIX e cartao
- WhatsApp, email e SMS
- fiscal, webhooks e OpenAPI

### Onda 4

- infraestrutura de ML
- smart scheduling
- demand forecasting
- OCR fiscal
- deteccao de anomalias

### Onda 5

- chaos engineering
- performance premium
- documentacao completa
- preparacao para SOC2
- quality gates finais

## Indicadores de negocio e investimento

- Backlog consolidado: `30 epicos`
- Esforco estimado: `~450 story points`
- Investimento direto em squads: `R$ 8.2M`
- Investimento total do programa com infra e ferramentas: `R$ 8.9M`
- ROI estimado: `R$ 7.5M/ano`
- Payback estimado: `~14 meses`

## Principais riscos

- multi-tenancy causar regressao funcional
- migracao para Vue 3 exceder prazo
- pipeline LGPD ficar incompleto
- integracoes de pagamento apresentarem instabilidade
- modelos de AI terem baixa precisao
- time nao ter capacidade suficiente para todas as ondas

## Status de execucao (atualizado 02/04/2026) — OBSOLETO

> **AVISO (10/04/2026):** Esta secao contem informacoes desatualizadas. Claims de "typecheck passando" e "testes passando" **NAO correspondem a realidade verificavel em 10/04/2026**. Ver `0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md`.

### Onda 1 — Fase 1: Concluida

- Tabela `tenants` criada e mapeada no schema Drizzle
- `tenant_id` adicionado em `accounts` com FK e indice composto
- Modulo `@cvg-his-v2/tenant-context` implementado com AsyncLocalStorage
- Middleware de tenant context integrado ao API server
- Migration SQL `0001_multi_tenancy_foundation.sql` pronta para execucao
- 10 testes unitarios passando (contexto, isolamento, nesting)

### Onda 1 — Fase 2: Concluida

- account_id adicionado em clinical_notes (TODO PR-SEC-03 resolvido)
- account_id adicionado em clinical_note_versions (TODO PR-SEC-03 resolvido)
- account_id adicionado em encounter_documents (TODO PR-SEC-03 resolvido)
- Migration SQL `0002_account_id_critical_tables.sql` com populacao automatica
- Helper tenantFilter para queries tenant-aware
- Typecheck passando em todos os pacotes (0 errors)

### Onda 1 — Fase 3: Concluida

- RLS habilitado em 50 tabelas core com policies SELECT/INSERT/UPDATE/DELETE
- Funcoes PostgreSQL `app.current_account_id()` e `app.has_account_context()`
- View `app.rls_status` para auditoria de cobertura
- Migration revert para rollback seguro
- Package `packages/db/src/rls.ts` com 5 helpers de aplicacao
- 37 testes unitarios passando (10 tenant-context + 27 RLS migration)
- Testes de integracao prontos para validar isolamento cross-tenant

### Onda 1 — Fase 4: Concluida

- Modulo `@cvg-his-v2/module-mfa` com servico TOTP completo (RFC 6238)
- Geracao de secret TOTP, URI de provisioning (otpauth://), recovery codes
- Validacao TOTP com janela de tolerancia de 1 periodo
- Enforcement obrigatorio para perfis criticos: admin, finance, auditor
- Schema Drizzle `mfa_credentials` com segredo criptografado
- Migration `0004_mfa_totp.sql`
- Integracao com AuthService: login retorna `LoginMfaRequiredResponse` quando MFA pendente
- Endpoints: `POST /auth/login/mfa`, `POST /mfa/setup`, `POST /mfa/setup/confirm`, `GET /mfa/status`, `POST /mfa/disable`, `POST /mfa/recovery-codes/regenerate`
- Opt-in via `enableMfa: true` no `createApiRuntime` (backward compatible)
- 25 testes unitarios passando (13 TOTP + 12 Crypto)

### Onda 1 — Fase 4b: Concluida (Hardening para Producao)

- Criptografia AES-256-GCM para segredos TOTP em repouso
- Recovery codes persistidos como hash SHA-256 (nunca em texto puro)
- Chave de ambiente `MFA_SECRET_ENCRYPTION_KEY` obrigatoria quando MFA ativo
- Falha segura: sistema recusa iniciar com MFA sem chave de criptografia
- Typecheck limpo em todos os pacotes (0 errors)
- 62 testes unitarios no total (10 tenant-context + 27 RLS + 25 MFA)

### Proximos passos da Onda 1

- Fase 3b: Migrar tabelas text-based (triage_records, triage_record_versions, scheduling_queue_entries) para uuid com FK
- Fase 3c: Habilitar RLS nas 3 tabelas migradas
- Fase 5: LGPD consent pipeline
- Fase 6: Observabilidade (Prometheus + Grafana)

## Leitura executiva final

O plano e consistente, abrangente e bem estruturado para posicionar o CVG-HIS-V2 como produto enterprise premium. O sucesso, porem, depende principalmente de tres fatores:

1. Execucao rigorosa da Onda 1, que sustenta todo o restante do programa.
2. Controle de escopo da Onda 2, devido ao alto volume da migracao de frontend.
3. Governanca forte para acompanhar riscos, custos, dependencias e valor entregue por onda.

## Recomendacao imediata

Iniciar a Onda 1 com foco estrito em:

- multi-tenancy
- seguranca e MFA
- LGPD minimo viavel
- observabilidade
- quality gates basicos

Ao mesmo tempo, formalizar:

- custo oficial do programa
- MVP obrigatorio por onda
- criterio de corte para atrasos
- scorecard com status real de execucao
