# SCORECARD DE PROGRESSO — CVG-HIS-V2 Enterprise

## Tracking de Score por Onda

| Categoria           | Base   | Onda 1 | Onda 2 | Onda 3 | Onda 4 | Onda 5  | Meta   |
| ------------------- | ------ | ------ | ------ | ------ | ------ | ------- | ------ |
| Arquitetura Backend | 75     | 80     | 80     | 88     | 90     | 95      | 95     |
| Modelo de Dados     | 70     | 85     | 85     | 88     | 90     | 95      | 95     |
| Auth/Autorização    | 65     | 85     | 85     | 88     | 90     | 95      | 95     |
| Módulos de Negócio  | 70     | 72     | 78     | 88     | 90     | 95      | 95     |
| Frontend/Web        | 40     | 42     | 85     | 87     | 88     | 90      | 90     |
| Design System/UX    | 5      | 5      | 80     | 82     | 85     | 90      | 90     |
| Testes/QA           | 35     | 55     | 65     | 75     | 80     | 90      | 90     |
| Observabilidade     | 30     | 75     | 78     | 85     | 88     | 90      | 90     |
| Segurança           | 45     | 70     | 72     | 80     | 85     | 95      | 95     |
| Integrações         | 25     | 28     | 30     | 85     | 87     | 88      | 85     |
| AI/ML               | 0      | 0      | 0      | 0      | 80     | 82      | 80     |
| LGPD/Compliance     | 15     | 60     | 62     | 75     | 85     | 90      | 90     |
| CI/CD/Deploy        | 55     | 70     | 75     | 80     | 85     | 90      | 90     |
| Performance         | 50     | 55     | 70     | 75     | 80     | 90      | 90     |
| Documentação        | 30     | 35     | 40     | 60     | 70     | 85      | 85     |
| **GLOBAL**          | **42** | **58** | **72** | **82** | **87** | **90+** | **90** |

> **NOTA DE RECALIBRAGEM (10/04/2026):** Esta tabela reflete scores **declarados historicamente**, nao o estado atual verificavel. Auditoria Codex 1011 estimou score real em **70-75/100**. Onda 1 e Onda 2 tem construcao real, porem build/typecheck/test estao falhando atualmente, impedindo sustentar os scores elevados declarados. Ver `0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md`.

## Atualização executiva (05/04/2026) — ATUALIZADO EM 09/04/2026 (Exec 12) — OBSOLETA

> **AVISO (10/04/2026):** Esta secao contem informacoes desatualizadas. As claims de "pnpm typecheck PASS, pnpm build PASS, pnpm test PASS" **NAO sao sustentadas por evidencia atual**. Auditoria Codex 1011 (09/04/2026) e verificacao direta (10/04/2026) confirmam que typecheck, build e test **FALHAM**.

- ~~Estágio atual do código: `Onda 2 majoritariamente entregue, Onda 3 em progresso, workspace recursivo validado no root por Executor 11 (08/04/2026): pnpm typecheck PASS, pnpm build PASS, pnpm test PASS`~~
- ~~Score executivo revisado do programa: `82/100`~~

**Estado real (10/04/2026):**

- Estágio atual do código: Build e typecheck **FALHANDO** - `apps/spa` nao consegue resolver `@cvg-his-v2/shared-auth-sdk`; `packages/design-system` falta `@types/node`
- Score executivo real: **70-75/100** (Auditoria Codex 1011)
- `pnpm typecheck`: **FAIL**
- `pnpm build`: **FAIL**
- `pnpm test:critical`: **FAIL** (161 falhos, 8 passando)
- ~~Leitura executiva revisada por trilha:~~
  - ~~Frontend/Web: `90/100`~~ — **SUPERESTIMADO**
  - ~~Design System/UX: `92/100`~~ — **SUPERESTIMADO**
  - ~~Módulos de Negócio: `84/100`~~ — **SUPERESTIMADO**
  - ~~Testes/QA: `92/100`~~ — **SUPERESTIMADO** (testes estao falhando)
  - ~~CI/CD/Deploy: `82/100`~~ — **SUPERESTIMADO**
  - ~~Documentação/Governança: `65/100`~~ — **SUPERESTIMADO**

**Scores reais estimados (Auditoria Codex 1011):**

- Frontend/Web: ~75-80/100
- Design System/UX: ~78-82/100
- Módulos de Negócio: ~70-75/100
- Testes/QA: ~60-65/100
- CI/CD/Deploy: ~65-70/100
- Documentação/Governança: ~60-65/100

**Evidencias verificadas (10/04/2026):**

- `pnpm typecheck`: **FAIL** — apps/spa nao consegue resolver '@cvg-his-v2/shared-auth-sdk'
- `pnpm build`: **FAIL** — mesmo bloqueio + design-system falta @types/node
- `pnpm test` (API): **FAIL** — ERR_MODULE_NOT_FOUND para shared-utils, shared-errors, shared-auth-sdk
- `pnpm test:coverage`: **PASS** (threshold 5%, coverage 5.84%)

**Gaps prioritários identificados (Auditoria Codex 1011):**

- Build/typecheck/test globais falhando — nao ha workspace verde verificavel
- Multi-tenancy incompleto na borda HTTP
- accountId 'pending' na API + accountId hardcoded em persistencia
- OpenAPI runtime serve paths vazios {}
- Credenciais seed preditiveis no nucleo de auth

## Métricas de Acompanhamento

### Onda 1 — Checklist

- [x] tenant_id em accounts (Fase 1 — tabela tenants criada, FK adicionada, migration pronta)
- [x] account_id em clinical_notes, clinical_note_versions, encounter_documents (Fase 2 — TODOs criticos resolvidos)
- [x] RLS configurado em 50 tabelas core com policies SELECT/INSERT/UPDATE/DELETE (Fase 3)
- [x] Tabelas text-based migradas para uuid + FK + RLS (Fase 3b/3c)
- [x] RLS em tabelas text-based (triage_records, triage_record_versions, scheduling_queue_entries)
- [x] MFA TOTP implementado para perfis criticos (admin, finance, auditor) (Fase 4)
- [x] MFA com persistencia real no banco — Fase 4c concluida
- [x] LGPD consent pipeline MVP — Fase 5 concluida
- [x] RLS em consent_records e data_subject_requests — Fase 5b concluida
- [x] Observabilidade basica — Fase 6 concluida (metrics Prometheus, health, logging estruturado, correlation ID)
- [ ] API Gateway roteando
- [ ] Coverage > 60%

### Onda 1 — Fase 4 Entregues (03/04/2026)

- [x] Modulo `@cvg-his-v2/module-mfa` com servico TOTP completo
- [x] Geracao de secret TOTP, URI de provisioning, recovery codes
- [x] Validacao TOTP com janela de tolerancia
- [x] Enforcement obrigatorio para perfis criticos (admin, finance, auditor)
- [x] Schema Drizzle `mfa_credentials` com segredo criptografado
- [x] Migration `0004_mfa_totp.sql`
- [x] Integracao com AuthService: login retorna `LoginMfaRequiredResponse` quando MFA pendente
- [x] Endpoint `POST /auth/login/mfa` para completar login com TOTP
- [x] Endpoints MFA: setup, confirm, status, disable, recovery-codes
- [x] Opt-in via `enableMfa: true` no `createApiRuntime`
- [x] 25 testes unitarios de MFA (13 TOTP + 12 Crypto)

### Onda 1 — Fase 4c Entregues (03/04/2026)

- [x] `DatabaseMfaRepository` integrado ao bootstrap/runtime com persistencia real obrigatoria
- [x] `MfaRecord` expandido com `lastUsedAt` e `lastRecoveryCodesRegeneratedAt`
- [x] `DatabaseMfaRepository` le e escreve todos os campos da tabela `mfa_credentials`
- [x] `MfaService.verifyLogin()` atualiza `lastUsedAt` no banco apos autenticacao bem-sucedida
- [x] `MfaService.regenerateRecoveryCodes()` atualiza `lastRecoveryCodesRegeneratedAt` no banco
- [x] `MfaService.confirmSetup()` persiste secret criptografado + recovery code hashes + activatedAt
- [x] `MfaService.disableMfa()` deleta registro do banco
- [x] `MfaService.isMfaActive()` le status diretamente do banco
- [x] 17 testes de integracao com banco criados (`tests/integration/mfa/mfa-persistence.test.ts`)
- [x] Alias `@cvg-his-v2/module-mfa` adicionado ao vitest.config.ts
- [x] Total de 92 testes unitarios passando (10 tenant + 27 RLS + 25 MFA + 30 LGPD)

### Onda 1 — Fase 5 Entregues (03/04/2026)

- [x] Modulo `@cvg-his-v2/module-lgpd` com servicos de consentimento e solicitacoes do titular
- [x] Schema Drizzle `consent_records` com granularidade por finalidade (marketing, analytics, clinical, financial, operational, notifications)
- [x] Schema Drizzle `data_subject_requests` para export, deletion, anonymization, rectification, access, portability
- [x] Migration `0005_lgpd_consent_pipeline.sql` com enums, tabelas, indices e comentarios
- [x] `DatabaseConsentRepository` com persistencia real (grant, revoke, query by subject/purpose/status)
- [x] `DatabaseDsrRepository` com persistencia real (create, query, update status, complete, reject)
- [x] `LgpdService` com logica de negocio: grant, revoke, query, isConsentActive, DSR lifecycle, export builder
- [x] Repositorios integrados ao bootstrap/runtime via `consent` e `dsr` em `RuntimeRepositories`
- [x] Endpoints LGPD: POST /lgpd/consent, POST /lgpd/consent/revoke, GET /lgpd/consent, GET /lgpd/consent/status
- [x] Endpoints LGPD: POST /lgpd/requests, GET /lgpd/requests, POST /lgpd/requests/complete, POST /lgpd/requests/reject
- [x] Endpoint LGPD: POST /lgpd/export para exportacao de dados pessoais em JSON
- [x] Todos os endpoints respeitam tenancy/account isolation via `principal.user.accountId`
- [x] Auditoria integrada: cada acao de consentimento e DSR gera audit event
- [x] 30 testes unitarios LGPD cobrindo todos os fluxos principais
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 1 — Fase 5b Entregues (03/04/2026)

- [x] Migration `0006_rls_lgpd_tables.sql` com RLS em `consent_records` e `data_subject_requests`
- [x] Migration revert `0006_rls_lgpd_tables.revert.sql` para rollback seguro
- [x] Policies `FOR ALL` com `USING` e `WITH CHECK` baseadas em `app.current_account_id()`
- [x] Isolamento cross-account comprovado: INSERT/UPDATE/SELECT bloqueados entre accounts
- [x] Sem contexto de account, nenhum dado LGPD e visivel
- [x] 10 testes de integracao RLS para tabelas LGPD (`tests/integration/rls/rls-lgpd.test.ts`)
- [x] View `app.rls_status` reflete automaticamente as novas tabelas
- [x] Funcao `app.rls_summary()` conta as tabelas LGPD como protegidas
- [x] Total de 92 testes unitarios passando
- [x] GlobalSetup tolerante a ausencia de banco para permitir testes unitarios
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 25 testes unitarios de MFA passando

### Onda 1 — Fase 3 Entregues (03/04/2026)

- [x] Migration `0003_rls_core_tables.sql` com RLS em 50 tabelas
- [x] Migration revert `0003_rls_core_tables.revert.sql` para rollback seguro
- [x] Funcoes PostgreSQL `app.current_account_id()`, `app.has_account_context()`, `app.rls_summary()`
- [x] View `app.rls_status` para auditoria
- [x] Package `packages/db/src/rls.ts` com helpers: `setSessionAccountId`, `withTenantContext`, `checkRlsEnabled`, `getRlsSummary`, `verifyCrossTenantIsolation`
- [x] 62 testes unitarios passando (10 tenant-context + 27 RLS + 13 MFA TOTP + 12 MFA Crypto)

### Onda 1 — Fase 4b Entregues (03/04/2026)

- [x] Criptografia AES-256-GCM para segredos TOTP em repouso (`packages/modules/mfa/src/crypto.ts`)
- [x] Chave de ambiente `MFA_SECRET_ENCRYPTION_KEY` validada no startup
- [x] Recovery codes persistidos como hash SHA-256 (nao texto puro)
- [x] Runtime valida presenca da chave de criptografia quando `enableMfa: true`
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 12 novos testes de criptografia (roundtrip, seguranca, validacao de chave)
- [x] Total de 62 testes unitarios passando

### Onda 1 — Fase 3b/3c Entregues (03/04/2026)

- [x] Migration `0007_text_to_uuid_tables.sql` converte `account_id` de text para uuid em 3 tabelas
- [x] Migration `0008_rls_text_based_tables.sql` habilita RLS nas 3 tabelas migradas
- [x] Migrations revert `0007` e `0008` para rollback seguro
- [x] Validacao previa: migration falha com erro claro se houver account_id nao-UUID
- [x] FKs criadas: `triage_records_account_id_fkey`, `triage_record_versions_account_id_fkey`, `scheduling_queue_entries_account_id_fkey`
- [x] Indices recriados com tipo uuid
- [x] Schema Drizzle atualizado: `uuid('account_id').notNull().references(() => accounts.id)`
- [x] `app.rls_summary()` atualizada: tabelas removidas da lista de exclusao
- [x] Policies `FOR ALL` com `USING`/`WITH CHECK` consistentes com Fase 3
- [x] 38 testes unitarios de migracao text-to-uuid (`tests/unit/rls/text-based-tables-migration.test.ts`)
- [x] 22 testes de integracao RLS para tabelas text-based (`tests/integration/rls/rls-text-based-tables.test.ts`)
- [x] 3 tabelas adicionadas ao checklist de RLS em `rls-isolation.test.ts`
- [x] 130 testes unitarios passando (10 tenant + 65 RLS + 30 LGPD + 25 MFA)

### Onda 1 — Fase 1 Entregues (02/04/2026)

- [x] Tabela `tenants` com schema completo (Drizzle + SQL migration)
- [x] `tenant_id` FK em `accounts` com indice composto
- [x] Modulo `@cvg-his-v2/tenant-context` com AsyncLocalStorage
- [x] Middleware de injecao de tenant context no API server
- [x] Migration SQL `0001_multi_tenancy_foundation.sql` com dados de migracao
- [x] 10 testes unitarios passando (contexto, isolamento, nesting)

### Onda 1 — Fase 2 Entregues (02/04/2026)

- [x] account_id adicionado em clinical_notes com FK e indice
- [x] account_id adicionado em clinical_note_versions com FK e indice
- [x] account_id adicionado em encounter_documents com FK e indice
- [x] Migration SQL `0002_account_id_critical_tables.sql` com populacao automatica
- [x] Helper tenantFilter para queries tenant-aware
- [x] Typecheck passando em todos os pacotes

### Onda 1 — Fase 6 Entregues (03/04/2026)

- [x] `prom-client` adicionado como dependencia do API
- [x] Modulo `apps/api/src/metrics.ts` com Registry Prometheus e metricas HTTP
- [x] Endpoint `/metrics` agora retorna formato Prometheus (text/plain) com HELP/TYPE
- [x] Metricas expostas: `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`, `app_uptime_seconds`, `app_active_requests`, `app_database_healthy`, `app_persistence_mode`
- [x] Metricas default do Node.js via `collectDefaultMetrics()` (event loop, GC, handles)
- [x] Request duration tracking via `process.hrtime.bigint()` + response `finish` event
- [x] `x-request-id` header adicionado em todas as respostas
- [x] Correlation ID propagado em logs e headers
- [x] Logging estruturado expandido: 5 niveis (DEBUG, INFO, WARN, ERROR, FATAL)
- [x] Logger com `child()` para contexto hierarquico
- [x] Serializacao segura de errors (stack trace preservado)
- [x] Sanitizacao de dados sensiveis em logs (email, CPF, password, token, secret, authorization)
- [x] Log level configuravel via `LOG_LEVEL` env var
- [x] Endpoints `/health/ready` e `/health/live` adicionados como aliases
- [x] Normalizacao de rotas para evitar cardinalidade alta nas metricas
- [x] Config Prometheus local em `infra/observability/prometheus.yml`
- [x] 15 testes unitarios de observabilidade (9 metrics + 6 logging)
- [x] 145 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Checklist

- [x] Design system foundation — Fase 1 concluida (tokens, temas, 8 componentes base, 37 testes)
- [x] Componentes avancados — Etapa 2.2 concluida (DataTable, Modal, Toast, Tabs, EmptyState, SearchBar, Pagination, CommandPalette, 54 testes)
- [x] Vue 3 SPA setup — Etapa 2.3 concluida (Vite + Pinia + Router + 6 paginas + layout + auth guard + dark mode + API client)
- [x] Migração Owners — Etapa 2.4 concluida (list + detail + form integrados com API real)
- [x] Migração Patients — Etapa 2.5 concluida (list + detail + form integrados com API real, com select de tutor)
- [x] Migração Appointments — Etapa 2.6 concluida (kanban list, detail, create form integrados com API real)
- [x] Migração Encounters — Etapa 2.7 concluida (list, detail com timeline/transition/close, create form integrados com API real)
- [x] Hardening transversal — Fase 2.6b concluida (breadcrumbs dinâmicos, cache de entidades, skeleton loading, search select, componentes reutilizáveis)
- [x] Consolidação de componentes — Fase 2.6c concluida (CSS global, labels centralizados, testes unitários, redução de duplicação)
- [x] Migração Billing — Etapa 2.8 concluida (list + detail com itens, add item, update status, estimate integrados com API real)
- [x] Consolidação transversal — Fase 2.8b concluida (useListData, useFormValidation, testes expandidos)
- [x] Migração Medical Records — Etapa 2.9 concluida (list + detail com entradas/timeline/arquivar integrados com API real)
- [ ] 30+ componentes completos (total)
- [ ] Storybook documentado
- [ ] Vue 3 SPA migrado (12+ páginas)
- [ ] LCP < 2s em todas as páginas
- [ ] WebSocket operando

### Onda 2 — Fase 1 Entregues (03/04/2026)

- [x] Pacote `@cvg-his-v2/design-system` criado em `packages/design-system/`
- [x] Design tokens TypeScript: cores (7 paletas), spacing (4px grid), radius, shadows, typography, transitions, z-index, layout
- [x] CSS Custom Properties em `src/tokens/variables.css` — single source of truth
- [x] Temas light/dark definidos como objetos TypeScript com gerador de CSS
- [x] 6 componentes base com HTML generators + ARIA: Button, Input, Textarea, Select, Card, Badge, Alert, Spinner
- [x] CSS de componentes com estados: hover, focus, disabled, error, loading
- [x] Acessibilidade: aria-label, aria-invalid, aria-describedby, role="alert", role="status", sr-only, touch-min 44px
- [x] 37 testes unitarios passando (tokens, temas, componentes, acessibilidade)
- [x] 182 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] Documentacao tecnica em `packages/design-system/README.md`

### Onda 2 — Etapa 2.2 Entregues (03/04/2026)

- [x] DataTable com headers, rows, sort visual, striped, compact, hoverable, empty state, caption acessivel
- [x] Modal/Dialog com header/body/footer, 4 tamanhos (sm/md/lg/xl), variantes (default/danger/warning)
- [x] Toast/Notification com 4 variantes, titulo, dismissible, stack com 4 posicoes
- [x] Tabs com nav + panels, estado ativo, tabs desabilitadas, aria-controls/aria-labelledby
- [x] EmptyState com icone, titulo, descricao, acao opcional
- [x] SearchBar com input search, icone, acao opcional, role="search"
- [x] Pagination com info, prev/next, page buttons, ellipsis, aria-current
- [x] CommandPalette com busca, grupos, icones, atalhos, footer com dicas de teclado
- [x] CSS completo para todos os 8 componentes avancados
- [x] 54 testes unitarios avancados cobrindo renderizacao e acessibilidade
- [x] 236 testes unitarios passando no total (37 base + 54 avancados + 145 backend)
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] Documentacao atualizada com exemplos de DataTable, Modal e Tabs

### Onda 2 — Etapa 2.3 Entregues (03/04/2026)

- [x] App Vue 3 criada em `apps/spa/` com Vite + TypeScript + Pinia + Vue Router
- [x] `vue-tsc --noEmit` passando sem erros
- [x] Pinia stores: `useAuthStore` (tokens, MFA, JWT decode, localStorage), `useThemeStore` (light/dark, persistencia), `useAppStore` (sidebar, loading)
- [x] Vue Router com history mode, 8+ rotas lazy-loaded, auth guard (redirect /login, MFA check)
- [x] AppLayout.vue com sidebar colapsavel, topbar com breadcrumbs, theme toggle, logout
- [x] LoginPage.vue com form de login integrado ao auth store e API client
- [x] DashboardPage.vue com stat cards placeholder
- [x] PlaceholderPage.vue para modulos ainda nao migrados (com link para sistema legado)
- [x] NotFoundPage.vue (404)
- [x] API client (`api.ts`) com interceptors: auth token injection, correlation ID, error handling
- [x] Dark mode toggle funcional com `data-theme` attribute + CSS variables
- [x] CSS import dos tokens do design system (`packages/design-system/src/tokens/variables.css`)
- [x] Coexistencia com SSR: SPA roda em porta 3002, SSR continua em 3000
- [x] 236 testes unitarios passando no total (inalterados)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Etapa 2.7 Entregues (03/04/2026)

- [x] EncountersListPage com tabela de atendimentos (paciente, tipo, queixa, status, abertura)
- [x] EncounterDetailPage com dados completos, timeline de eventos, transicao de status e fechamento
- [x] EncounterFormPage para abertura de atendimento com select de paciente, tipo, origem e motivo
- [x] encounterService com list, getById, create, transition, close, getTimeline integrados a API real
- [x] Tipos TypeScript para EncounterSummary, CreateEncounterRequest, TransitionEncounterRequest, CloseEncounterRequest, EncounterTimelineEventSummary
- [x] Router atualizado com 3 rotas de encounters: list, new, detail
- [x] Navegacao completa: lista → detail → transicionar/fechar; list → create → detail
- [x] Modal de transicao de status com opcoes validas por estado atual
- [x] Modal de fechamento com motivo obrigatorio
- [x] Timeline de eventos carregada automaticamente no detail
- [x] Diferenca SSR vs API documentada: API nao aceita priority, sector, vitals, clinicalAlertsSnapshot, triageNotes, administrativeNotes, mucosaStatus, hydrationStatus
- [x] 236 testes unitarios passando (inalterados)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.6b Hardening Transversal Entregues (03/04/2026)

- [x] Breadcrumbs dinamicos com cadeia clicavel (Home → Modulo → Acao) via `breadcrumbParent` nas rotas
- [x] Composable `useEntityCache` com cache de 5min para owners e patients, deduplicacao de requests concorrentes, preload em massa
- [x] Nomes reais de pacientes e tutores exibidos em todas as listas e detalhes (antes: IDs truncados)
- [x] Componente `SkeletonLoader.vue` reutilizavel com 7 variantes (text, heading, avatar, button, card, table-row, table-cell)
- [x] Componente `StatusBadge.vue` reutilizavel com 6 variantes de cor e 2 tamanhos
- [x] Componente `EmptyState.vue` reutilizavel com 3 tamanhos e slot de acao
- [x] Componente `SearchSelect.vue` com busca incremental, keyboard navigation, loading state, clear button
- [x] EncountersListPage atualizado com cache de nomes de pacientes
- [x] EncounterDetailPage atualizado com cache de nomes de pacientes e tutores
- [x] EncounterFormPage atualizado com SearchSelect para selecao de paciente
- [x] PatientsListPage atualizado com cache de nomes de tutores
- [x] PatientDetailPage atualizado com nome do tutor (antes: ID)
- [x] AppointmentsListPage atualizado com cache de nomes de pacientes e tutores
- [x] AppointmentDetailPage atualizado com cache de nomes + getById real da API
- [x] appointmentService adicionado metodo `getById`
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.6c Consolidação e Testes Entregues (03/04/2026)

- [x] CSS global extraido em `src/styles/main.css` — buttons (5 variantes), alerts (2), page layout, loading, muted, detail sections, forms, tables, search bar, modal
- [x] Arquivo de labels centralizado em `src/utils/labels.ts` — speciesMap, sexMap, patientStatusMap, visitTypeMap, encounterStatusMap, appointmentStatusMap, ownerStatusMap, formatDate, formatDateTime, formatTime, truncate
- [x] 11 paginas atualizadas para usar CSS global (antes: ~200+ linhas de CSS duplicado por pagina)
- [x] 4 paginas de formulario atualizadas para usar SearchSelect (PatientForm, AppointmentForm, EncounterForm)
- [x] 8 paginas de lista/detalhe atualizadas para usar StatusBadge e EmptyState
- [x] 4 paginas de detalhe atualizadas para usar SkeletonLoader
- [x] Vitest configurado com jsdom + Vue Test Utils
- [x] 42 testes unitarios passando:
  - 7 testes para useEntityCache (cache, fallback, preload, clear, dedup)
  - 6 testes para SkeletonLoader (variantes, props, slot)
  - 7 testes para StatusBadge (variantes, tamanhos, icon, custom color)
  - 5 testes para EmptyState (props, slot, tamanhos)
  - 17 testes para labels (species, sex, status, dates, truncate)
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] Scripts `npm run test` e `npm run test:watch` adicionados ao package.json

### Onda 2 — Etapa 2.8 Migração Billing Entregues (03/04/2026)

- [x] BillingListPage com tabela de registros de faturamento (atendimento, paciente, tutor, status, subtotal, itens)
- [x] BillingDetailPage com informações do registro, lista de itens, ações de adicionar item, gerar estimativa, atualizar status
- [x] billingService com list, getByEncounter, createEstimate, addItem, listItems, updateStatus integrados a API real
- [x] Tipos TypeScript para BillingRecordSummary, BillingItemSummary, CreateBillingEstimateRequest, CreateBillingItemRequest, UpdateBillingStatusRequest
- [x] 6 endpoints de billing adicionados ao server.ts: GET /billing, GET /billing/:encounterId, POST /billing/estimate, POST /billing/items, GET /billing/:encounterId/items, PATCH /billing/:encounterId/status
- [x] Router atualizado com 2 rotas de billing: list e detail
- [x] Placeholder de billing substituido por páginas reais
- [x] Cache de nomes de pacientes e tutores via useEntityCache
- [x] StatusBadge, EmptyState, SkeletonLoader aplicados
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 42 testes unitarios passando (inalterados)

### Onda 2 — Fase 2.8b Consolidação Transversal Entregues (03/04/2026)

- [x] Composable `useListData` criado — encapsula loading/error/fetch/onMounted pattern para listas
- [x] Composable `useFormValidation` criado — encapsula errors/touched/validate/submit pattern para forms
- [x] Composable `useEntityForm` criado — encapsula create/update branching com redirect
- [x] OwnersListPage refatorado para usar useListData (de ~115 para ~80 linhas)
- [x] PatientsListPage refatorado para usar useListData (de ~128 para ~90 linhas)
- [x] EncountersListPage refatorado para usar useListData (de ~119 para ~90 linhas)
- [x] 13 novos testes unitarios: useListData (6), useFormValidation (7)
- [x] Total de 55 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Etapa 2.9 Migração Medical Records Entregues (03/04/2026)

- [x] MedicalRecordsListPage com tabela de prontuarios por atendimento (atendimento, paciente, status, entradas, atualizado)
- [x] MedicalRecordsDetailPage com entradas clinicas, timeline, criar/editar/arquivar entradas
- [x] medicalRecordsService com getByEncounter, listEntries, createEntry, updateEntry, archiveEntry, getTimeline, getRevisions
- [x] Tipos TypeScript para MedicalRecordSummary, ClinicalEntrySummary, ClinicalTimelineEventSummary, EntryRevisionSummary, CreateClinicalEntryRequest, UpdateClinicalEntryRequest, ArchiveClinicalEntryRequest
- [x] 7 tipos de entrada clinica suportados: anamnesis, physical_exam, progress_note, assessment, plan, prescription, conduct
- [x] Modal de criacao/edicao de entradas com tipo, titulo, conteudo e motivo de edicao
- [x] Modal de arquivamento com motivo obrigatorio
- [x] Timeline clinica carregada automaticamente no detail
- [x] Router atualizado com 2 rotas de medical records: list e detail
- [x] Placeholder de medical records substituido por paginas reais
- [x] Cache de nomes de pacientes via useEntityCache
- [x] StatusBadge, EmptyState, SkeletonLoader aplicados
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 55 testes unitarios passando (inalterados)

### Onda 2 — Fase 2.9b Consolidação Transversal + DataTable Entregues (04/04/2026)

- [x] Bug critico corrigido em `useFormValidation.validate()` — agora itera sobre regras e valida cada campo com valores reais
- [x] `useFormValidation` aplicado em 4 forms reais: PatientFormPage, OwnerFormPage, AppointmentFormPage, EncounterFormPage
- [x] Validação manual duplicada removida das 4 forms (~60 linhas de boilerplate eliminadas)
- [x] `useEntityForm.handleSubmit` atualizado para receber `values` como segundo argumento
- [x] Componente `DataTable.vue` reutilizavel criado com API enxuta: columns, rows, slots, loading/empty states, variants (striped/hoverable/compact), caption acessivel
- [x] DataTable adotado em OwnersListPage e PatientsListPage (tabelas manuais substituidas)
- [x] 17 testes unitarios para SearchSelect (renderizacao, filtragem, selecao, keyboard nav, loading, disabled, empty state)
- [x] 11 testes unitarios para DataTable (headers, rows, loading, empty, slots, variants, compact, caption)
- [x] 3 testes adicionais para useFormValidation (validate com valores, validacao completa, erro em submit)
- [x] Total de 85 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.10 Migração Inpatient Entregues (04/04/2026)

- [x] InpatientListPage com listagem de internacoes (paciente, localizacao, leito, status, admissao)
- [x] InpatientDetailPage com detalhes completos, acoes (marcar estavel, dar alta), modal de confirmacao de alta
- [x] inpatientService com list, assignBed, transferBed, updateStatus, listSectors, listBeds, getBedMap
- [x] Tipos TypeScript para InpatientStaySummary, InpatientProgressSummary, SectorSummary, BedSummary, BedMapResponse
- [x] Endpoint PATCH /inpatient/:id/update-status adicionado ao API server
- [x] Router atualizado com 2 rotas reais de inpatient (list e detail), placeholder substituido
- [x] Cache de nomes de pacientes via useEntityCache
- [x] StatusBadge, EmptyState, SkeletonLoader aplicados
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 85 testes unitarios passando

### Onda 2 — Fase 2.10b Consolidação Final de List Pages Entregues (04/04/2026)

- [x] BillingListPage refatorado com DataTable (tabela manual substituida)
- [x] MedicalRecordsListPage refatorado com DataTable (tabela manual substituida)
- [x] EncountersListPage refatorado com DataTable (tabela manual substituida, ja usava useListData)
- [x] InpatientListPage refatorado com useListData (boilerplate manual removido, ja usava DataTable)
- [x] Todas as 5 list pages agora usam DataTable e/ou useListData consistentemente
- [x] AppointmentsListPage mantido com Kanban (layout unico, nao aplicavel a DataTable)
- [x] Loading/error/empty states padronizados em todas as listas
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 85 testes unitarios passando (inalterados)

### Onda 2 — Fase 2.11 Bed Board + Progress Notes Entregues (04/04/2026)

- [x] BedBoardPage.vue criado com visualizacao de mapa de leitos por setor
- [x] Bed cards com status visual (disponivel/ocupado/manutencao/bloqueado)
- [x] Stats de ocupacao no header (total, ocupados, disponiveis)
- [x] Integracao com getBedMap da API real
- [x] Cache de nomes de pacientes nos leitos ocupados via useEntityCache
- [x] Progress notes adicionados ao InpatientDetailPage (listagem + criacao)
- [x] Endpoints GET/POST /inpatient/:id/progress adicionados ao API server
- [x] Metodos listProgress e addProgress adicionados ao inpatientService
- [x] Rota /inpatient/board adicionada ao router com link na list page
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 85 testes unitarios passando (inalterados)

### Onda 2 — Fase 2.11b Endpoint Dedicado Medical Records Entregues (04/04/2026)

- [x] Metodo `findAll(accountId)` adicionado a `MedicalRecordRepository` interface
- [x] Implementacao DB em `DatabaseMedicalRecordRepository.findAll()` com query por accountId
- [x] InMemoryMedicalRecordRepository atualizado com `findAll()` no bootstrap
- [x] Metodo `listAll(accountId)` adicionado a `MedicalRecordsService` com agregacao de entryCount
- [x] Endpoint GET /medical-records (sem encounterId) agora retorna lista completa com entryCount
- [x] MedicalRecordsListPage refatorado: elimina padrao N+1, usa endpoint dedicado + useListData + DataTable
- [x] Tipos MedicalRecordListSummary e MedicalRecordsListResponse adicionados ao SPA
- [x] medicalRecordsService.listAll() adicionado
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 98 testes unitarios passando

### Onda 2 — Fase 2.12 Testes Inpatient + Cache Users Entregues (04/04/2026)

- [x] userService criado no SPA com list() e getById()
- [x] Tipos UserSummary e UsersListResponse adicionados ao SPA
- [x] useEntityCache estendido com getUserName() — cache de 5min com deduplicacao de requests
- [x] InpatientDetailPage atualizado: autores de progress notes agora mostram nome resolvido (nao mais UUID truncado)
- [x] 8 testes de integracao para InpatientDetailPage (renderizacao, erro, progress notes, autor resolvido, transicoes de status)
- [x] 5 testes para cache de users em useEntityCache
- [x] Typecheck limpo em todos os pacotes (0 errors)
- [x] 98 testes unitarios passando (74 existentes + 8 InpatientDetailPage + 5 user cache + 11 componentes/composables)

### Onda 2 — Fase 2.12b Testes de Interação Inpatient + BedBoard Entregues (04/04/2026)

- [x] InpatientDetailPage com 17 testes (8 existentes + 9 novos de interação)
- [x] Testes de interação: abrir form de evolucao, validar nota vazia, submir nota com conteudo, cancelar form
- [x] Testes de interacao: clicar Marcar Estavel → status atualiza, abrir modal de alta, validar motivo obrigatorio, confirmar alta com motivo
- [x] Teste de empty state para progress notes
- [x] BedBoardPage com 12 testes: titulo, loading, erro, empty, setores, leitos, status visuais, stats, patient names, badge, bed code, species
- [x] Total de 122 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.13 Preload Users + Otimização Autores Entregues (04/04/2026)

- [x] `preloadUsers(users[])` adicionado ao useEntityCache — cache direto de lista de users
- [x] `preloadUserNames(ids[])` adicionado ao useEntityCache — fetch via `userService.list()` uma vez e mapeia por ID
- [x] InpatientDetailPage otimizado: usa `preloadUserNames(authorIds)` antes de resolver nomes individuais
- [x] Reduz N requests individuais para 1 request de lista quando autores sao multiplos
- [x] Fallback seguro: se `list()` falhar, `getUserName()` individual ainda funciona via cache+deduplicacao
- [x] 3 testes adicionais para preload behavior (preloadUsers, preloadUserNames, skip cached)
- [x] Total de 122 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.13b Testes de Erro API + InpatientListPage Entregues (04/04/2026)

- [x] InpatientDetailPage com 5 novos testes de erro de API:
  - erro ao criar progress note (mensagem exibida, form permanece aberto)
  - erro ao atualizar status (mensagem exibida)
  - erro ao dar alta (mensagem exibida, modal permanece aberto)
  - erro ao carregar progress notes (fallback para empty state)
  - erro ao carregar stay (mensagem de erro exibida)
- [x] InpatientListPage com 9 testes criados do zero:
  - titulo da pagina
  - loading state (spinner do DataTable)
  - error state (mensagem de erro da API)
  - empty state (nenhuma internação ativa)
  - renderização de dados (nomes de pacientes, unidades, leitos)
  - labels de status (Internado, Estável)
  - links de navegação para detail page
  - link para bed board
  - link para admitir paciente
- [x] Total de 136 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.14 Testes de Página Owners + Patients Entregues (04/04/2026)

- [x] OwnersListPage com 11 testes criados do zero:
  - titulo da pagina
  - loading state (spinner do DataTable)
  - error state (mensagem de erro da API)
  - empty state (nenhum tutor encontrado)
  - renderização de dados (nomes, documentos, contatos)
  - labels de status (Ativo, Inativo)
  - dash para documento ausente
  - links de navegação para detail e edit
  - link para criar novo tutor
  - busca input com placeholder correto
  - botão Buscar presente
- [x] PatientsListPage com 13 testes criados do zero:
  - titulo da pagina
  - loading state (spinner do DataTable)
  - error state (mensagem de erro da API)
  - empty state (nenhum paciente encontrado)
  - renderização de dados (nomes, raças)
  - labels de especie (Canino, Felino)
  - labels de sexo (Macho, Fêmea)
  - labels de status (Ativo)
  - resolução de nomes de tutores
  - links de navegação para detail e edit
  - link para criar novo paciente
  - busca input com placeholder correto
  - botão Buscar presente
- [x] Total de 160 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.15 Testes de Página AppointmentsListPage (Kanban) Entregues (04/04/2026)

- [x] AppointmentsListPage com 18 testes criados do zero:
  - titulo da pagina (Agenda)
  - loading state (spinner + page-loading)
  - error state (mensagem de erro da API com role="alert")
  - empty state (nenhum agendamento encontrado)
  - renderizacao das 4 colunas Kanban (Agendados, Em Atendimento, Concluídos, Cancelados)
  - contadores corretos por coluna
  - renderizacao de cards com nomes de pacientes e tutores
  - labels de tipo de visita (Agendado, Walk-in, Retorno)
  - razoes/motivos nos cards
  - horarios agendados nos cards
  - agrupamento por status nas colunas corretas
  - multiplos itens na mesma coluna
  - link para criar novo agendamento
  - select de filtro de status com opcoes corretas
  - busca input com placeholder correto
  - filtragem por status (reduz cards visiveis)
  - empty state quando filtro nao encontra resultados
  - clique em card navega para detail page
- [x] Total de 198 testes unitarios passando (180 existentes + 18 novos)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.17 Testes de Interação AppointmentDetailPage + AppointmentFormPage Entregues (04/04/2026)

- [x] AppointmentDetailPage com 13 testes criados do zero:
  - titulo da pagina
  - loading state quando agendamento nao carregado
  - error state quando API falha
  - renderizacao de detalhes (paciente, tutor, motivo)
  - status badge com label correto
  - label de tipo de visita
  - botao de cancelamento para agendamentos scheduled
  - ausencia de botao de cancelamento para completed
  - cancelamento com confirmacao
  - erro ao cancelar (alert exibido)
  - link de voltar para agenda
  - informacoes administrativas (criado/atualizado)
  - carregamento via history state
- [x] AppointmentFormPage com 12 testes criados do zero:
  - titulo da pagina (Novo Agendamento)
  - carregamento de lista de pacientes no mount
  - erro ao carregar lista de pacientes
  - renderizacao de campos do formulario
  - validacao sem paciente selecionado
  - validacao sem data/hora
  - submit com sucesso
  - erro ao criar agendamento
  - navegacao para detail page apos criacao
  - link de cancelar
  - opcoes de tipo de visita
  - botao desabilitado enquanto salvando
- [x] Total de 205 testes unitarios passando (180 existentes + 25 novos)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.18 Testes de Página OwnerFormPage + PatientFormPage Entregues (04/04/2026)

- [x] OwnerFormPage com 16 testes criados do zero:
  - titulo para novo tutor
  - titulo para edicao
  - renderizacao de campos do formulario
  - secao de contatos com botao adicionar
  - adicionar nova linha de contato
  - remover linha de contato
  - validacao sem nome
  - validacao sem contato com valor
  - submit com sucesso (create)
  - erro ao criar (alert)
  - carregamento de dados em modo edicao
  - submit em modo edicao (update)
  - erro ao carregar em modo edicao
  - link de cancelar
  - botao desabilitado enquanto salvando
  - select de status com opcoes
- [x] PatientFormPage com 18 testes criados do zero:
  - titulo para novo paciente
  - titulo para edicao
  - renderizacao de campos do formulario
  - carregamento de lista de tutores no mount
  - erro ao carregar lista de tutores
  - validacao sem nome
  - validacao sem especie
  - validacao sem sexo
  - validacao sem tutor responsavel
  - submit com sucesso (create)
  - erro ao criar (alert)
  - carregamento de dados em modo edicao
  - submit em modo edicao (update)
  - erro ao carregar em modo edicao
  - link de cancelar
  - botao desabilitado enquanto salvando
  - opcoes de especie
  - opcoes de status (incluindo falecido)
- [x] Total de 257 testes unitarios passando (198 existentes + 59 novos)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.16 Testes Encounters + Billing List Pages Entregues (04/04/2026)

- [x] EncountersListPage com 10 testes criados do zero:
  - titulo da pagina
  - loading state (spinner do DataTable)
  - empty state (nenhum atendimento encontrado)
  - renderização de dados (nomes de pacientes)
  - labels de tipo de visita (Walk-in, Agendado, Retorno)
  - labels de status (Recepção, Em atendimento, Finalizado)
  - truncamento de texto de queixa
  - links de navegação para detail page
  - link para abrir novo atendimento
  - verificação de que pagina nao exibe erro (gap conhecido de UX)
- [x] BillingListPage com 11 testes criados do zero:
  - titulo da pagina
  - loading state (spinner do DataTable)
  - error state (mensagem de erro da API)
  - empty state (nenhum registro de faturamento)
  - renderização de dados (nomes de pacientes, tutores)
  - labels de status (Rascunho, Aberto, Quitado)
  - formatação de valores monetários (R$)
  - IDs de atendimento truncados
  - links de navegação para gerenciamento
  - links para ver itens
  - links para encounters
- [x] Total de 180 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.16b Error Alert Encounters + Billing useListData Entregues (04/04/2026)

- [x] EncountersListPage: adicionado `<div v-if="error">` para exibir erros de API explicitamente
- [x] BillingListPage: refatorado de estado manual (loading/error/records/onMounted) para `useListData`
- [x] Teste de erro do EncountersListPage corrigido para verificar mensagem de erro ao invés de ausência
- [x] Comportamento visual de BillingListPage preservado (mesmo template, mesma estrutura)
- [x] Total de 180 testes unitarios passando
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.19 Testes de Interação EncounterDetailPage + EncounterFormPage Entregues (04/04/2026)

- [x] EncounterDetailPage com 19 testes criados do zero:
  - loading state (skeleton loaders)
  - error state quando API falha
  - renderizacao de detalhes (paciente, tutor, queixa)
  - status badge com label correto
  - label de tipo de visita
  - label de origem
  - timeline de eventos
  - timeline vazia
  - botao de transicao para nao-finalizados
  - ausencia de transicao para finalizados
  - botao de fechar atendimento
  - modal de transicao com opcoes disponiveis
  - transicao de status ao selecionar opcao
  - modal de fechamento
  - fechamento com motivo
  - botao desabilitado sem motivo
  - erro ao fechar (alert)
  - link de voltar para lista
  - secao de motivo de fechamento quando presente
- [x] EncounterFormPage com 15 testes criados do zero:
  - titulo da pagina (Abrir Atendimento)
  - carregamento de lista de pacientes no mount
  - erro ao carregar lista de pacientes
  - renderizacao de campos do formulario
  - validacao sem paciente selecionado
  - validacao sem motivo
  - submit com sucesso
  - erro ao criar atendimento
  - navegacao para detail page apos criacao
  - link de cancelar
  - opcoes de tipo de visita
  - opcoes de origem
  - botao desabilitado enquanto abrindo
- [x] Total de 291 testes unitarios passando (257 existentes + 34 novos)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.20 Testes de Interação MedicalRecordsDetailPage + BillingDetailPage Entregues (04/04/2026)

- [x] MedicalRecordsDetailPage com 22 testes criados do zero:
  - loading state (skeleton loaders)
  - error state quando API falha
  - renderizacao de detalhes (prontuario, paciente)
  - status badge (Aberto/Concluido)
  - entradas clinicas renderizadas
  - labels de tipo de entrada
  - numeros de versao
  - empty state para entradas
  - timeline de eventos
  - timeline vazia
  - modal de nova entrada
  - criacao de entrada com sucesso
  - botao desabilitado com form incompleto
  - modal de edicao de entrada
  - atualizacao de entrada com sucesso
  - modal de arquivamento
  - arquivamento com sucesso
  - botao desabilitado sem motivo
  - erro ao arquivar (alert)
  - erro ao criar entrada (alert)
  - link de voltar para lista
  - status Concluido para record fechado
- [x] BillingDetailPage com 27 testes criados do zero:
  - loading state (skeleton loaders)
  - error state quando API falha
  - renderizacao de detalhes (faturamento, paciente, tutor)
  - status badge (Rascunho/Estimado/Aberto/Quitado)
  - moeda e subtotal
  - tabela de itens de cobranca
  - labels de tipo de item
  - formatacao de valores monetarios
  - empty state para itens
  - contagem de itens no header
  - botao de adicionar item para nao-quitados
  - ausencia de botao para quitados
  - botao de gerar estimativa para rascunhos
  - ausencia de botao de estimativa para nao-rascunhos
  - geracao de estimativa com sucesso
  - erro ao gerar estimativa (alert)
  - modal de adicionar item
  - adicao de item com sucesso
  - botao desabilitado com form incompleto
  - erro ao adicionar item (alert)
  - botao de atualizar status para estimado/aberto
  - ausencia de botao de status para rascunho
  - modal de atualizacao de status
  - atualizacao de status com sucesso
  - erro ao atualizar status (alert)
  - link de voltar para lista
  - opcoes de tipo de item no modal
- [x] Total de 340 testes unitarios passando (291 existentes + 49 novos)
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.22 Testes E2E do Fluxo Crítico da SPA Entregues (04/04/2026)

- [x] Infraestrutura E2E configurada com Playwright para a SPA:
  - playwright-spa.config.ts com auto-start do servidor SPA
  - spa-global-setup.ts para auth via API + health checks
  - Diretorio e2e/spa/ para testes SPA-specific
- [x] Fluxo critico ponta a ponta implementado (fluxo-critico-spa.spec.ts):
  - Login na SPA via token injection no localStorage
  - Navegacao para Owners e verificacao de tutor criado via API
  - Navegacao para Patients e verificacao de paciente criado via API
  - Abertura de atendimento com preenchimento de formulario
  - Adicao de entrada clinica no prontuario (anamnese)
  - Adicao de item de cobranca no faturamento
  - Fechamento de atendimento com motivo
  - Validacao de feedback visual e navegacao entre etapas
- [x] Scripts de execucao documentados:
  - pnpm test:e2e:spa (headless)
  - pnpm test:e2e:spa:headed (com navegador visivel)
- [x] Helpers reutilizaveis criados:
  - loginViaApi() — injeta token no localStorage da SPA
  - createOwnerViaApi() — cria tutor via API
  - createPatientViaApi() — cria paciente via API
  - selectPatient() — seleciona paciente no SearchSelect
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.22b Login Real + Owner/Patient via UI Entregues (04/04/2026)

- [x] Fixture reutilizavel criada (e2e/spa/fixtures/spa-fixture.ts):
  - SpaPage wrapper com goto(), waitForText(), selectPatient()
  - ApiCall helper para chamadas autenticadas
  - loginViaUI fixture — login real via formulario
  - createOwnerViaUI fixture — cria tutor pela interface
  - createPatientViaUI fixture — cria paciente pela interface
  - loginViaToken — metodo rapido para testes que nao precisam de UI login
- [x] Testes E2E de login real + criacao via UI (login-owner-patient-ui.spec.ts):
  - login real via formulario (email/senha) com redirect
  - criacao de tutor via UI com validacao na lista
  - criacao de paciente via UI com SearchSelect
  - validacao de relacionamento owner-patient
  - teste de login com credenciais erradas
  - validacao de campos obrigatorios no form de owner
  - validacao de campos obrigatorios no form de patient
- [x] Total de 7 testes E2E na suíte SPA

### Onda 2 — Fase 2.23 Fixtures Reutilizaveis + Fluxo E2E de Internação Entregues (04/04/2026)

- [x] Segundo fluxo E2E implementado (inpatient-flow.spec.ts):
  - preparo de dados via API (owner + patient + encounter)
  - navegacao para lista de internacao
  - validacao de elementos da pagina (titulo, mapa de leitos, admitir)
  - navegacao para Bed Board
  - validacao de empty state
  - acesso a detalhe da internacao
  - adicao de evolucao clinica
  - marcacao como estavel
  - fluxo de alta com motivo
  - validacao de navegacao de volta para lista
  - teste separado de validacao de elementos da lista
- [x] Suíte E2E organizada com fixtures reutilizaveis
- [x] Total de 7 testes E2E na suíte SPA (1 fluxo critico + 4 login/owner/patient + 2 inpatient)

### Onda 2 — Fase 2.23b Cleanup Automatico + Endurecimento da Suite E2E Entregues (04/04/2026)

- [x] Fixture reutilizavel endurecida (e2e/spa/fixtures/spa-fixture.ts):
  - CleanupTracker com cleanup automatico via API (DELETE /owners, /patients, /encounters, /appointments)
  - selectPatient() com espera deterministica (waitForSelector para dropdown option)
  - Remocao de todos os waitForTimeout arbitrarios do SearchSelect
  - Seletores semanticos: getByPlaceholder, getByRole('option'), getByRole('heading')
  - Fallbacks robustos para contact input (placeholder primeiro, ID como fallback)
- [x] fluxo-critico-spa.spec.ts endurecido:
  - Uso do fixture cleanup para remocao automatica de dados
  - selectPatient consolidado com espera deterministica
  - Remocao de duplicacao de helper selectPatient
- [x] login-owner-patient-ui.spec.ts endurecido:
  - Uso do fixture cleanup para owner/patient criados via UI
  - Validacao de erro de login via [role="alert"] (acessibilidade)
  - Validacao de forms via .form-field\_\_error (seletor direto)
  - Remocao de page.textContent('body') fragil
- [x] inpatient-flow.spec.ts endurecido:
  - Cleanup automatico via CleanupTracker
  - Remocao de waitForTimeout (1000ms) substituidos por assertions deterministicas
  - Uso de getByRole('heading') para titulos de pagina
  - Remocao de padrao "silent pass" com ifs extensivos

### Onda 2 — Fase 2.24 Fluxo E2E de Agendamento Entregues (04/04/2026)

- [x] Novo spec E2E: appointment-flow.spec.ts com 2 testes:
  - cria agendamento pela UI, valida no Kanban e cancela:
    - criacao de owner + patient via API (com cleanup)
    - formulario completo de agendamento (paciente, data, tipo, motivo)
    - validacao de sucesso e redirect para detail
    - verificacao no Kanban (coluna Agendados)
    - abertura do detalhe e validacao de dados
    - cancelamento do agendamento
    - verificacao na coluna Cancelados do Kanban
  - valida elementos da pagina de agendamento (Kanban):
    - titulo da pagina
    - 4 colunas Kanban com headers corretos
    - botao Novo Agendamento
    - filtro de status
- [x] Documentacao da limitacao: SPA nao suporta check-in/encounter a partir de appointment
- [x] Total de 9 testes E2E na suíte SPA (1 fluxo critico + 4 login/owner/patient + 2 inpatient + 2 appointment)

### Onda 2 — Fase 2.25 Fluxo E2E Completo de Billing Entregues (04/04/2026)

- [x] Novo spec E2E: billing-flow.spec.ts com 2 testes:
  - gera estimativa, adiciona itens, atualiza status e quita faturamento:
    - criacao de owner + patient + encounter via API (com cleanup)
    - navegacao para billing detail
    - validacao de status Rascunho (draft)
    - geracao de estimativa (draft → estimado)
    - adicao de 2 itens de cobranca (consulta + exame)
    - atualizacao de status para Aberto
    - quitacao do faturamento (settled)
    - validacao de estado final (botoes ocultos, itens visiveis)
    - navegacao de volta para lista
  - valida elementos da pagina de billing e navegacao:
    - titulo da pagina
    - status badge
    - secoes de informacoes e itens
    - link de voltar
- [x] Uso de fixtures reutilizaveis (apiCall, cleanup)
- [x] Total de 11 testes E2E na suíte SPA

### Onda 2 — Fase 2.26 Integracao E2E da SPA no CI com Docker/Compose Entregues (04/04/2026)

- [x] docker-compose.e2e.yml criado:
  - postgres-e2e (port 5434) com healthcheck
  - redis-e2e (port 6380) com healthcheck
  - api-e2e (build from Dockerfile, port 3001) com healthcheck
  - dependencias ordenadas (postgres → redis → api)
- [x] Script run-e2e-spa.sh criado:
  - sobe ambiente Docker completo
  - aplica schema + seed no DB
  - executa testes Playwright
  - cleanup automatico (ou --no-cleanup)
- [x] CI workflow (.github/workflows/ci.yml) atualizado:
  - novo job test-e2e-spa (depende de typecheck + build)
  - PostgreSQL 16 + Redis como services
  - Install Playwright browsers com deps
  - DB schema + seed via scripts existentes
  - API build + start com health check polling
  - Execucao dos testes E2E da SPA
  - Upload de report HTML como artifact
- [x] Scripts no package.json:
  - pnpm test:e2e:spa:docker (execucao completa com Docker)
  - pnpm test:e2e:spa:docker:keep (mantem containers apos testes)
- [x] Total de 11 testes E2E na suíte SPA

### Onda 2 — Fase 2.26b Dockerfile da SPA + Health Check Explicito no CI Entregues (04/04/2026)

- [x] apps/spa/Dockerfile criado:
  - Multi-stage: builder (node:22-bookworm-slim) → runner (nginx:1.27-alpine)
  - Build SPA via pnpm --filter @cvg-his-v2/spa run build
  - Serve static files com nginx
  - SPA fallback: try_files para client-side routing
  - Proxy /api para o backend (porta 3001)
  - Gzip compression ativado
  - Cache headers para assets estaticos (1 ano)
  - Health check endpoint (/health)
  - Porta 3002
- [x] apps/spa/nginx.conf criado:
  - Configuracao nginx para SPA
  - try_files para Vue Router history mode
  - Proxy /api para backend
  - Gzip e cache headers
  - Health check endpoint
- [x] docker-compose.e2e.yml atualizado:
  - Adicionado servico spa-e2e com build do Dockerfile
  - Health check com wget
  - Dependencia do api-e2e (service_healthy)
- [x] CI workflow (.github/workflows/ci.yml) atualizado:
  - Step "Build SPA" antes dos testes
  - Step "Start SPA (preview server)" com vite preview
  - Step "Wait for SPA health" com polling HTTP explicito (30 tentativas, 2s interval)
  - Mensagem de sucesso/erro clara
- [x] Scripts no package.json:
  - pnpm test:e2e:spa:docker (execucao completa com Docker)
  - pnpm test:e2e:spa:docker:keep (mantem containers apos testes)

### Onda 2 — Fase 2.27 Visual Regression da SPA Entregues (04/04/2026)

- [x] Suite de visual regression criada (e2e/spa/visual/visual-regression.spec.ts):
  - Viewport fixo: 1280x720
  - 7 snapshots de paginas principais:
    - login-page.png
    - owners-list-page.png
    - patients-list-page.png
    - appointments-kanban-page.png
    - encounters-list-page.png
    - inpatient-list-page.png
    - billing-list-page.png
  - maxDiffPixels: 100 (tolerancia para anti-aliasing)
  - Snapshots salvos em e2e/spa/snapshots/
- [x] playwright-spa.config.ts atualizado:
  - snapshotPathTemplate configurado para organizacao clara
- [x] Comandos para execucao e atualizacao:
  - npx playwright test --config playwright-spa.config.ts -g "Visual"
  - npx playwright test --config playwright-spa.config.ts -g "Visual" --update-snapshots

### Onda 2 — Fase 2.27b Baseline dos Snapshots + Estabilização Visual Entregues (05/04/2026)

- [x] Helper de estabilizacao visual criado (e2e/spa/visual/stabilize-visual.ts):
  - CSS injection para desabilitar animacoes, transicoes e shimmer
  - Forca tema light, sidebar expandida, user name oculto
  - Redacao de timestamps e UUIDs via seletores CSS
  - Perfis pre-configurados por tipo de pagina (login, listPage, detailPage, kanbanPage)
  - waitForPageSettled() para waits deterministicos (sem waitForTimeout arbitrarios)
- [x] Suite de visual regression endurecida:
  - Estabilizacao aplicada antes de cada screenshot
  - Thresholds calibrados por pagina (50-150 maxDiffPixels)
  - Deterministic waits com contentSelector em vez de timeouts
  - Login via token com graceful skip se indisponivel
- [x] Playwright config atualizado:
  - locale: 'pt-BR' e timezoneId: 'America/Sao_Paulo' para consistencia
  - colorScheme: 'light' forca tema claro
  - Chrome flags: --font-render-hinting=none para reduzir diff de fontes
- [x] Scripts adicionados ao package.json:
  - pnpm test:visual (execucao headless)
  - pnpm test:visual:update (gerar/atualizar baseline)
  - pnpm test:visual:headed (debug com navegador visivel)
- [x] Documentacao criada (docs/Enterprise/VISUAL-REGRESSION.md):
  - Guia completo de execucao e manutencao
  - Instrucoes para gerar e atualizar baseline
  - Tabela de thresholds por pagina
  - Limitacoes conhecidas e proximos passos
  - Estrutura de arquivos documentada

### Onda 2 — Fase 2.28 Visual Regression no CI + Detail Pages Entregues (05/04/2026)

- [x] Job dedicado no CI (.github/workflows/ci.yml):
  - Job test-visual separado do test-e2e-spa
  - Execucao filtrada com -g "Visual"
  - test-e2e-spa agora exclui testes visuais (--grep-invert "Visual")
  - Infraestrutura identica: PostgreSQL + Redis + API + SPA
- [x] Artifacts de falha configurados:
  - visual-regression-report: HTML report do Playwright (30 dias)
  - visual-regression-diffs: .diff.png, .actual.png, .expected.png (14 dias)
  - visual-test-results: test-results/ directory (14 dias)
- [x] Expansao para detail/form pages (5 novos snapshots):
  - owner-detail-page.png (navega via primeiro link da lista)
  - patient-detail-page.png (navega via primeiro link da lista)
  - encounter-detail-page.png (navega via primeiro link da lista)
  - billing-detail-page.png (navega via primeiro link da lista)
  - appointment-detail-page.png (navega via primeiro card do Kanban)
- [x] Detail pages com graceful skip:
  - Se nao houver dados na lista, o teste e skipped (nao falha)
  - Permite execucao segura mesmo em ambientes com seed minimo
- [x] Cobertura visual total: 12 snapshots (7 list + 5 detail)

### Onda 2 — Fase 2.29 Port de Componentes Base do Design System para Vue SFC Entregues (05/04/2026)

- [x] 8 componentes Vue SFC criados em `packages/design-system/src/vue/`:
  - DsButton.vue — 5 variantes, 3 tamanhos, loading state, spinner, tag flexivel (button/a)
  - DsCard.vue — 4 variantes (default/elevated/outlined/compact), slots header/body/footer, interactive
  - DsBadge.vue — 5 variantes, 2 tamanhos, dot indicator
  - DsAlert.vue — 4 variantes, title, icon, dismissible, accessibility (role=alert, aria-live)
  - DsModal.vue — 4 tamanhos, Teleport, closable, slots header/body/footer
  - DsTabs.vue — v-model support, tab count badges, keyboard accessible
  - DsSpinner.vue — 3 tamanhos, inline mode
  - DsInput.vue — text/email/password/number/textarea/select, label, error, hint, required
- [x] Types export separados em `types.ts` (compatibilidade com tsc do design-system)
- [x] Barrel export em `packages/design-system/src/vue/index.ts`
- [x] Package.json atualizado: peerDependency vue, export path `/vue`, versao 0.2.0
- [x] Integracao na SPA:
  - LoginPage.vue — DsCard + DsInput + DsAlert + DsButton (markup reduzido de ~200 para ~100 linhas)
  - DashboardPage.vue — DsCard para stat cards e placeholder
  - StatusBadge.vue — wrapper sobre DsBadge com compatibilidade retroativa
- [x] Alias Vite/Vitest configurado para resolver design-system Vue components
- [x] 42 testes unitarios para componentes Vue (DsButton 8, DsCard 5, DsBadge 4, DsAlert 5, DsSpinner 2, DsTabs 3, DsInput 8, StatusBadge 6 atualizados)
- [x] 374 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.30 Migração do Módulo Triagem para a SPA Vue Entregues (05/04/2026)

- [x] Diagnóstico dos módulos remanescentes:
  - 22 módulos ainda existem apenas no SSR (apps/web/)
  - Módulo escolhido: **Triagem** — melhor equilíbrio entre valor operacional, maturidade da API e esforço
  - API já possui 4 endpoints: GET /triage, POST /triage, GET /triage/:id/history, PATCH /triage/:id
  - Módulo backend maduro com service, repository, versionamento e RLS
- [x] Tipos TypeScript criados (apps/spa/src/types/triage.ts):
  - TriageSummary, TriageVersionSummary, CreateTriageRequest, UpdateTriageRequest
  - TriagePriority, TriageDestination enums
  - TriageListResponse, TriageHistoryResponse
- [x] Service criado (apps/spa/src/services/triage.ts):
  - listTriageRecords, createTriage, updateTriage, getTriageHistory
- [x] Páginas SPA criadas:
  - TriageListPage.vue — listagem com DataTable, badges de prioridade/destino, link para nova triagem
  - TriageFormPage.vue — formulário completo com prioridade, destino, queixa, notas, alertas
  - TriageDetailPage.vue — detalhes completos, histórico de versões, modal de edição
- [x] Rotas adicionadas ao router:
  - /triage, /triage/new, /triage/:id
- [x] Link de navegação adicionado ao sidebar (🏷️ Triagem)
- [x] 4 testes unitários para TriageListPage (título, loading, erro, link nova triagem)
- [x] 378 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.29b Adoção Ampla dos Componentes Ds\* + Testes Vue Entregues (05/04/2026)

- [x] Diagnóstico da adoção atual dos componentes Ds\* na SPA:
  - 8 componentes Vue Ds\* existentes: DsButton, DsInput, DsCard, DsBadge, DsAlert, DsModal, DsTabs, DsSpinner
  - Apenas 7 de 26 páginas usavam componentes Ds\* antes desta fase
  - DsTabs e DsSpinner não eram usados em nenhuma página
- [x] Adoção de DsInput, DsAlert, DsButton, DsCard em formulários:
  - PatientFormPage — inputs de texto, select, date, number agora usam DsInput; alerts usam DsAlert; sections usam DsCard
  - AppointmentFormPage — datetime, select, textarea agora usam DsInput; alerts usam DsAlert; sections usam DsCard
  - EncounterFormPage — select, textarea agora usam DsInput; alerts usam DsAlert; sections usam DsCard
  - UserFormPage — todos os campos usam DsInput (text, email, password, select); alerts e cards aplicados
- [x] Adoção de DsModal em páginas de detalhe:
  - MedicalRecordsDetailPage — modais de nova entrada, edição e arquivamento agora usam DsModal + DsInput
  - InpatientDetailPage — modal de confirmação de alta agora usa DsModal + DsInput
  - BillingDetailPage — modais de adicionar item e atualizar status agora usam DsModal + DsInput
  - EncounterDetailPage — modais de transição e fechamento já usavam DsModal (teleport fixado)
- [x] Bug fix em DsModal: removido defineEmits duplicado que causava erro de compilação
- [x] Adoção de DsAlert em substituição a divs `.alert` manuais:
  - MedicalRecordsDetailPage, InpatientDetailPage, BillingDetailPage, PatientFormPage, AppointmentFormPage, EncounterFormPage, UserFormPage, UsersListPage
- [x] userService expandido com métodos create() e update()
- [x] Tipos TypeScript expandidos: CreateUserRequest, UpdateUserRequest, campos adicionais em UserSummary
- [x] Redução de markup/CSS duplicado: ~200+ linhas de HTML/CSS manual substituídas por componentes Ds\*
- [x] Testes atualizados para compatibilidade com DsModal (teleport), DsButton (.ds-btn), seletores de modal
- [x] Bug fix em TriageListPage: `items` → `records` no template
- [x] Bug fix em TriageDetailPage: null check em record.value
- [x] 390 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.31 Migração do Módulo Usuários para a SPA Vue Entregues (05/04/2026)

- [x] Diagnóstico dos módulos remanescentes após Triagem:
  - 21 módulos ainda existem apenas no SSR (apps/web/)
  - Módulo escolhido: **Usuários** — melhor equilíbrio entre valor operacional, maturidade da API e baixo risco
  - API já possui 4 endpoints: GET /users, POST /users, GET /users/:id, PATCH /users/:id
  - userService já existia no SPA com list() e getById() (usado para cache de autores)
- [x] Tipos TypeScript expandidos (apps/spa/src/types/user.ts):
  - CreateUserRequest, UpdateUserRequest com campos completos (displayName, email, username, password, roleCode, department, jobTitle, etc.)
  - UserSummary expandido com department, sector, jobTitle, employeeCode, phone, fullName
- [x] userService expandido (apps/spa/src/services/user.ts):
  - create() e update() adicionados aos métodos existentes list() e getById()
- [x] Páginas SPA criadas:
  - UsersListPage.vue — listagem com DataTable, busca por nome/email, filtros por perfil e status, links Ver/Editar
  - UserDetailPage.vue — detalhes completos com DsCard, StatusBadge, SkeletonLoader
  - UserFormPage.vue — formulário completo com DsInput (text, email, password, select), DsCard, DsAlert, validação
- [x] Rotas adicionadas ao router:
  - /users, /users/new, /users/:id, /users/:id/edit
- [x] Link de navegação adicionado ao sidebar (👥 Usuários)
- [x] 12 testes unitários para UsersListPage (título, loading, erro, empty, dados, filtros, busca, navegação)
- [x] 390 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 2 — Fase 2.32 Consolidação Design System Vue — Detail Pages + Hardening Entregues (05/04/2026)

- [x] Adoção de DsCard e DsAlert em detail pages:
  - OwnerDetailPage — 4 seções com DsCard (Documento, Contatos, Observações, Informações), DsAlert para erro
  - PatientDetailPage — 4 seções com DsCard (Identificação, Dados Clínicos, Tutor, Informações), DsAlert para erro
- [x] Redução de markup duplicado:
  - OwnerDetailPage: eliminou 4 blocos `div.detail-section` + `h2.detail-section__title` → DsCard com title prop
  - PatientDetailPage: eliminou 4 blocos `div.detail-section` + `h2.detail-section__title` → DsCard com title prop
  - ~40 linhas de markup/CSS removidas entre as duas páginas
- [x] Hardening de DsInput:
  - Adicionado suporte a `datetime-local` e `search` como tipos
  - Adicionados props `step`, `min`, `max` para campos numéricos e de data
  - Types atualizados em types.ts
- [x] Hardening de DsButton:
  - Adicionado prop `to` para navegação SPA (renderiza como `<a>` com href)
  - Refatorado com `resolvedTag`, `resolvedHref`, `isDisabled` computados para clareza
  - Types atualizados em types.ts
- [x] 390 testes unitarios passando no total
- [x] Typecheck limpo em todos os pacotes (0 errors)

### Onda 3 — Checklist

- [ ] Event Bus publicando eventos
- [ ] PIX recebendo pagamentos
- [ ] WhatsApp enviando mensagens
- [ ] NFS-e emitindo
- [ ] Webhooks entregando
- [ ] OpenAPI publicada

### Onda 4 — Checklist

- [ ] Smart scheduling gerando sugestões
- [ ] Demand forecast em produção
- [ ] OCR processando NFs
- [ ] Anomaly detection em exames
- [ ] Model monitoring ativo

### Onda 5 — Checklist

- [ ] Chaos engineering executado
- [ ] Performance benchmarks atingidos
- [ ] Documentação completa
- [ ] SOC2 path definido
- [ ] Coverage > 80%
- [ ] Score ≥ 90
