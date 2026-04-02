# 705 — Diagnóstico Técnico do Repositório para Camada de Validação

**Status:** R0 — diagnóstico executável
**Data:** 2026-03-31
**Faixa:** 700-790

---

## 1. Estrutura Encontrada

### 1.1 Monorepo

```
cvg-his-v2/
├── apps/
│   ├── api/          # API HTTP (Node.js nativo, sem framework)
│   ├── web/          # Frontend (Next.js, dist/ presente)
│   └── worker/       # Worker de processamento assíncrono
├── packages/
│   ├── audit/        # Pacote standalone de audit DB-backed
│   ├── config/       # Configuração da aplicação
│   ├── contracts/    # DTOs de request/response (com testes Zod)
│   ├── db/           # Schema Drizzle + migrations + seed
│   ├── domain/       # Vazio (apenas node_modules/)
│   ├── events/       # Domain events (2 tipos: ClinicalNote*)
│   ├── modules/      # 21 módulos de domínio (ver seção 4)
│   ├── rbac/         # Permissões canônicas (53 perms, 4 roles)
│   └── shared/       # 9 sub-pacotes compartilhados
├── infra/
│   ├── docker/       # Caddyfile, .gitkeep
│   ├── db/           # .gitkeep
│   ├── observability/# .gitkeep
│   ├── scripts/      # bootstrap, prepare-test-db, check-health, seed.sql
│   └── systemd/      # 3 service files (api, web, worker)
├── e2e/              # Testes Playwright (4 specs)
├── docs/             # Documentação existente (100+ arquivos)
├── tools/            # Ferramentas auxiliares
├── test-results/     # Resultados do último run Playwright
└── node_modules/     # pnpm workspace
```

### 1.2 Gerenciamento de Pacotes

- **Package manager:** pnpm 10.0.0
- **Workspace config:** `pnpm-workspace.yaml`
- **Task runner:** Turbo 2.5.0 (`turbo.json`)
- **Node.js:** >= 22.0.0
- **TypeScript:** 5.7.3

### 1.3 Apps

| App    | Package Name         | Script dev         | Framework                                        |
| ------ | -------------------- | ------------------ | ------------------------------------------------ |
| api    | `@cvg-his-v2/api`    | `tsx src/index.ts` | Node.js http nativo (sem Express/Fastify)        |
| web    | `@cvg-his-v2/web`    | Next.js dev        | Next.js (dist/ compilado presente)               |
| worker | `@cvg-his-v2/worker` | Worker dev         | Node.js (detalhes não inspecionados nesta etapa) |

---

## 2. Stack Real Identificada

### 2.1 Backend

| Componente    | Tecnologia                            | Versão   | Confirmação                   |
| ------------- | ------------------------------------- | -------- | ----------------------------- |
| Runtime       | Node.js                               | >= 22    | `package.json` engines        |
| HTTP Server   | `node:http` (nativo)                  | built-in | `apps/api/src/server.ts:1`    |
| ORM           | Drizzle ORM                           | 0.38.4   | `packages/db/package.json`    |
| Driver DB     | pg                                    | 8.13.1   | `packages/db/package.json`    |
| Migração      | drizzle-kit                           | 0.30.4   | `packages/db/package.json`    |
| Auth tokens   | HMAC (node:crypto)                    | built-in | `apps/api/src/server.ts:3`    |
| Hash de senha | scrypt (node:crypto)                  | built-in | `apps/api/src/server.ts:1606` |
| Logging       | Custom (`@cvg-his-v2/shared-logging`) | interno  | `apps/api/src/bootstrap.ts:8` |
| Config        | Custom (`@cvg-his-v2/shared-config`)  | interno  | `apps/api/src/index.ts:1`     |

### 2.2 Testes

| Runner              | Versão   | Onde Usado                                      |
| ------------------- | -------- | ----------------------------------------------- |
| Vitest              | 3.0.5    | 20 módulos em `packages/modules/*/` + contracts |
| Node.js `node:test` | built-in | 3 testes em `apps/api/src/`                     |
| Playwright          | 1.58.2   | 4 specs em `e2e/tests/`                         |

### 2.3 Infraestrutura

| Componente    | Tecnologia             | Confirmação                 |
| ------------- | ---------------------- | --------------------------- |
| Banco         | PostgreSQL 16 (Alpine) | `docker-compose.v2.yml:3`   |
| Cache         | Redis 7 (Alpine)       | `docker-compose.v2.yml:20`  |
| Reverse Proxy | Caddy                  | `infra/docker/Caddyfile.v2` |
| Deploy        | systemd services       | `infra/systemd/*.service`   |

---

## 3. Runners e Bibliotecas Encontrados

### 3.1 Comandos de Teste Existentes

```bash
# Root
pnpm test              → pnpm -r --filter @cvg-his-v2/* run test
pnpm test:all          → pnpm test + pnpm test:db + pnpm test:smoke
pnpm test:smoke        → npx playwright test --config e2e/playwright-smoke.config.ts

# API
pnpm --filter @cvg-his-v2/api test       → node --test dist/health.test.js dist/runtime.test.js
pnpm --filter @cvg-his-v2/api test:db    → prepare-test-db.mjs + node --test dist/db-persistence.test.js
pnpm --filter @cvg-his-v2/api test:all   → todos os 3 arquivos acima

# Módulos (cada um)
pnpm --filter @cvg-his-v2/module-* test  → vitest run --passWithNoTests

# DB
pnpm --filter @cvg-his/db test           → vitest run --passWithNoTests
```

### 3.2 Configurações de Teste Encontradas

| Arquivo                                            | Conteúdo                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `playwright.config.ts`                             | Main E2E: sequential, 1 worker, 60s timeout, chromium, globalSetup       |
| `e2e/playwright-smoke.config.ts`                   | Smoke: auto-start API:4001 + Web:4000, 30s timeout, apenas smoke.spec.ts |
| `packages/contracts/vitest.config.ts`              | Vitest com v8 coverage, globals, node env                                |
| **Ausente:** `vitest.config.ts` em qualquer módulo | 20 módulos sem config explícita                                          |

---

## 4. Estado Atual das Migrations

### 4.1 Track Drizzle (Produção/Dev)

| Propriedade         | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Localização         | `packages/db/migrations/`                                             |
| Arquivos SQL ativos | 1 (`0000_vengeful_pet_avengers.sql`)                                  |
| Conteúdo            | Schema completo: 34 tabelas + 28 ENUMs + FKs + CHECKs                 |
| Journal             | 1 entrada (idx 0, ~2026-03-24)                                        |
| Runner              | `tsx packages/db/src/migrate.ts` (drizzle-orm/node-postgres/migrator) |
| Config              | `packages/db/drizzle.config.ts` (schema: `./dist/schema/index.js`)    |

### 4.2 Track SQL Legado (Apenas Testes)

| Propriedade   | Valor                                                         |
| ------------- | ------------------------------------------------------------- |
| Localização   | `packages/shared/database/src/migrations/`                    |
| Arquivos SQL  | 16 (`001_initial_schema.sql` a `016_constraints_indexes.sql`) |
| Consumido por | `infra/scripts/prepare-test-db.mjs`                           |
| Status        | **Não usado pelo runner Drizzle**                             |

### 4.3 Seeds

| Mecanismo    | Localização               | Status       | Problemas                                                                                     |
| ------------ | ------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| Drizzle seed | `packages/db/src/seed.ts` | Funcional    | SHA-256 para senhas, role names em português                                                  |
| SQL seed     | `infra/scripts/seed.sql`  | **Quebrado** | Referencia tabelas inexistentes (`inventory_items`, `medical_records`, `owner_patient_links`) |

### 4.4 Divergência Crítica: Drizzle vs SQL Legado

| Aspecto              | Drizzle (produção)                                             | SQL Legado (testes)                                      |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Número de migrations | 1 (mega-migration)                                             | 16 (incrementais)                                        |
| Tabela de estoque    | `stock_items`, `stock_lots`, `stock_movements`                 | `inventory_items`                                        |
| Tabela de prontuário | Sem tabela `medical_records` (usa encounters + clinical_notes) | `medical_records`                                        |
| Link tutor-paciente  | `patients.owner_id` direto                                     | `owner_patient_links` (tabela separada)                  |
| Permission keys      | 51 canônicas (`owner.read`)                                    | 27 hardcoded (`owners.read`)                             |
| Role names           | `admin`, `vet`, `enfermagem`, `recepcao`                       | `admin`, `reception`, `veterinarian`, `nurse`, `auditor` |

---

## 5. Estado Atual dos Módulos-Chave

### 5.1 Visão Geral dos 21 Módulos

| Módulo                  | Source Files (.ts) | Service                       | Repository                                                 | DB Injection            | Cross-Module Deps                       |
| ----------------------- | ------------------ | ----------------------------- | ---------------------------------------------------------- | ----------------------- | --------------------------------------- |
| access-control          | 3                  | AccessControlService          | DatabaseAccessControlRepository                            | N/A (catálogo estático) | Nenhuma                                 |
| attachments             | 3                  | AttachmentsService            | DatabaseAttachmentRepository                               | Sim                     | encounters, medicalRecords, diagnostics |
| audit                   | 4                  | AuditService                  | DatabaseAuditRepository                                    | Sim                     | Nenhuma                                 |
| auth                    | 5                  | AuthService                   | DatabaseSessionRepository                                  | Sim                     | users, staff, accessControl, audit      |
| billing                 | 3                  | BillingService                | DatabaseBillingRepository                                  | **NÃO**                 | encounters                              |
| diagnostics             | 3                  | DiagnosticsService            | DatabaseDiagnosticOrderRepository                          | Sim                     | encounters                              |
| discharges              | 4                  | DischargesService             | DatabaseDischargeRepository                                | Sim                     | Nenhuma                                 |
| encounters              | 4                  | EncountersService             | DatabaseEncounterRepository                                | Sim                     | owners, patients                        |
| inpatient               | 4                  | InpatientService              | DatabaseInpatientStayRepository                            | Sim                     | encounters                              |
| inventory               | 3                  | InventoryService              | DatabaseInventoryRepository                                | **NÃO**                 | encounters                              |
| medical-records         | 5                  | MedicalRecordsService         | 4 repos (MedicalRecord, ClinicalEntry, Timeline, Revision) | Sim                     | encounters, patients                    |
| notifications           | 3                  | NotificationsService          | DatabaseNotificationRepository                             | Sim                     | encounters (opt), patients (opt)        |
| owners                  | 4                  | OwnersService                 | DatabaseOwnerRepository                                    | Sim                     | Nenhuma                                 |
| patients                | 4                  | PatientsService               | DatabasePatientRepository                                  | Sim                     | owners                                  |
| prescription-executions | 4                  | PrescriptionExecutionsService | DatabasePrescriptionExecutionRepository                    | Sim                     | Nenhuma                                 |
| scheduling              | 3                  | SchedulingService             | DatabaseSchedulingRepository                               | **NÃO**                 | owners, patients                        |
| staff                   | 2                  | StaffService                  | **Nenhum**                                                 | N/A                     | Nenhuma                                 |
| surgery                 | 3                  | SurgeryService                | DatabaseSurgeryCaseRepository                              | Sim                     | encounters                              |
| triage                  | 3                  | TriageService                 | DatabaseTriageRepository                                   | Sim                     | encounters                              |
| users                   | 3                  | UsersService                  | DatabaseUsersRepository                                    | **NÃO**                 | Nenhuma                                 |

### 5.2 Módulos com Problemas de Persistência

**4 módulos exportam repositórios DB mas nunca os injetam no service:**

1. **BillingService** — `packages/modules/billing/src/index.ts`: service usa Maps em memória; `DatabaseBillingRepository` é exportado mas não recebido no constructor
2. **InventoryService** — mesmo padrão
3. **SchedulingService** — mesmo padrão
4. **UsersService** — mesmo padrão

Consequência: em produção com banco real, os dados desses módulos são perdidos a cada restart do processo API.

### 5.3 Módulos sem Validação de Entidades Referenciadas

| Módulo                  | Entidade Não Validada                   | Risco                                            |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| discharges              | encounterId                             | Alta pode ser criada para encounter inexistente  |
| prescription-executions | clinicalEntryId, patientId, encounterId | Execução pode referenciar entidades inexistentes |

### 5.4 Módulo Staff — Sem Persistência

- Sem repository interface
- Sem implementação DB
- Sem operações CRUD (create/update/delete)
- Apenas 7 registros seed hardcoded
- Usado pelo AuthService para construir o principal autenticado

### 5.5 Dual RBAC

| Pacote                             | Permissões | Roles | Role Codes                                                                       |
| ---------------------------------- | ---------- | ----- | -------------------------------------------------------------------------------- |
| `packages/rbac/`                   | 53         | 4     | `admin`, `vet`, `enfermagem`, `recepcao`                                         |
| `packages/modules/access-control/` | 30         | 7     | `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor` |

O AuthService usa `AccessControlService` (modules) para autorização, mas o seed Drizzle usa `@cvg-his/rbac` para popular permissões. Os role codes não batem.

### 5.6 Dual Audit

| Pacote                    | Persistência                | API                  | Consumidor                                      |
| ------------------------- | --------------------------- | -------------------- | ----------------------------------------------- |
| `packages/audit/`         | DB direto via `@cvg-his/db` | append com JSON diff | Não consumido pela API principal                |
| `packages/modules/audit/` | In-memory + optional DB     | write/list/seed      | Consumido pela API (`appendAudit` em cada rota) |

---

## 6. Estado Atual da Cobertura de Testes

### 6.1 Testes Unitários/Integração por Módulo

| Módulo                  | Arquivo de Teste                      | Runner | Testes Estimados |
| ----------------------- | ------------------------------------- | ------ | ---------------- |
| access-control          | `src/access-control.test.ts`          | vitest | ~5               |
| attachments             | `src/attachments.test.ts`             | vitest | ~5               |
| audit                   | `src/audit.test.ts`                   | vitest | ~5               |
| auth                    | `src/auth.test.ts`                    | vitest | ~10              |
| billing                 | `src/billing.test.ts`                 | vitest | ~5               |
| diagnostics             | `src/diagnostics.test.ts`             | vitest | ~5               |
| discharges              | `src/discharges.test.ts`              | vitest | ~5               |
| encounters              | `src/encounters.test.ts`              | vitest | ~10              |
| inpatient               | `src/inpatient.test.ts`               | vitest | ~10              |
| inventory               | `src/inventory.test.ts`               | vitest | ~5               |
| medical-records         | `src/medical-records.test.ts`         | vitest | ~15              |
| notifications           | `src/notifications.test.ts`           | vitest | ~5               |
| owners                  | `src/owners.test.ts`                  | vitest | ~5               |
| patients                | `src/patients.test.ts`                | vitest | ~5               |
| prescription-executions | `src/prescription-executions.test.ts` | vitest | ~10              |
| scheduling              | `src/scheduling.test.ts`              | vitest | ~5               |
| staff                   | `src/staff.test.ts`                   | vitest | ~3               |
| surgery                 | `src/surgery.test.ts`                 | vitest | ~5               |
| triage                  | `src/triage.test.ts`                  | vitest | ~5               |
| users                   | `src/users.test.ts`                   | vitest | ~5               |
| contracts               | `src/__tests__/contracts.test.ts`     | vitest | ~10              |

**Total estimado:** ~140 testes unitários, todos com dados in-memory, sem banco real.

### 6.2 Testes da API

| Arquivo                  | Runner    | Testes | Descrição                                                                                                                                               |
| ------------------------ | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health.test.ts`         | node:test | 8      | Health/liveness/readiness response shapes                                                                                                               |
| `runtime.test.ts`        | node:test | 11     | Auth, RBAC, owner/patient/encounter/triage/surgery/diagnostics/billing/inventory/notifications, persistence                                             |
| `db-persistence.test.ts` | node:test | 12     | Medical records, clinical entries, notifications, inpatient, surgery, diagnostics, attachments, versioning, archiving, sectors/beds, worker integration |

**Total:** 31 testes de API, dos quais 12 requerem PostgreSQL real.

### 6.3 Testes E2E (Playwright)

| Spec                       | Tipo | Testes | Fluxo                                                                             |
| -------------------------- | ---- | ------ | --------------------------------------------------------------------------------- |
| `smoke.spec.ts`            | UI   | 6      | Login→Dashboard, Owner CRUD, Patient CRUD, Encounter, Medical Records, Navigation |
| `fluxo-principal.spec.ts`  | API  | 3      | Tutor→Paciente→Agendamento→Atendimento                                            |
| `fluxo-internacao.spec.ts` | API  | 3      | Admit→Prescrever→Alta                                                             |
| `fluxo-exames.spec.ts`     | API  | 5      | Lab exam, Imaging, Result, Status transitions, Pending reports                    |

**Total:** 17 testes e2e. Apenas 6 são UI; 11 são API-level via `apiContext`.

### 6.4 Cobertura de Fluxos Críticos

| Fluxo                           | Unitários | API | E2E UI      | E2E API                |
| ------------------------------- | --------- | --- | ----------- | ---------------------- |
| Auth (login/refresh/logout)     | Sim       | Sim | Sim (smoke) | —                      |
| RBAC (autorização)              | Sim       | Sim | —           | —                      |
| Owner CRUD                      | Sim       | —   | Sim (smoke) | —                      |
| Patient CRUD + link             | Sim       | —   | Sim (smoke) | —                      |
| Scheduling (appointments)       | Sim       | —   | —           | Sim (fluxo-principal)  |
| Encounter open/transition/close | Sim       | Sim | Sim (smoke) | Sim (fluxo-principal)  |
| Triage                          | Sim       | Sim | —           | —                      |
| Medical records                 | Sim       | Sim | Sim (smoke) | —                      |
| Inpatient                       | Sim       | —   | —           | Sim (fluxo-internacao) |
| Surgery                         | Sim       | Sim | —           | —                      |
| Diagnostics                     | Sim       | Sim | —           | Sim (fluxo-exames)     |
| Billing                         | Sim       | Sim | —           | —                      |
| Inventory                       | Sim       | Sim | —           | —                      |
| Prescription executions         | Sim       | —   | —           | —                      |
| Discharges                      | Sim       | —   | —           | Sim (fluxo-internacao) |
| Notifications                   | Sim       | Sim | —           | —                      |
| Audit                           | Sim       | —   | —           | —                      |
| Staff                           | Sim       | —   | —           | —                      |
| Access control                  | Sim       | —   | —           | —                      |
| Attachments                     | Sim       | —   | —           | —                      |

### 6.5 Fixtures/Factories/Helpers Existentes

| Arquivo                           | Tipo                   | Conteúdo                                                                                                |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `e2e/fixtures/cvg-his.fixture.ts` | Playwright fixture     | authPage, apiContext, testUser, createOwner, createPatient, createAppointment, createEncounter, cleanup |
| `e2e/fixtures/global-setup.ts`    | Playwright globalSetup | Health poll, auth poll, env vars E2E_AUTH_TOKEN/USER_ID/ACCOUNT_ID                                      |
| `apps/api/src/bootstrap.ts`       | In-memory repos        | InMemorySessionRepository, InMemoryAuditRepository, InMemoryOwnerRepository, etc. (13 classes)          |
| Nenhum                            | Shared test utilities  | **Inexistente** — cada módulo constrói seu grafo de serviços do zero                                    |

### 6.6 Gargalos que Impedem Testes Ponta a Ponta

1. **4 módulos sem persistência DB real** (billing, inventory, scheduling, users) — fluxos que dependem deles não sobrevivem a um restart
2. **Dual migration tracks** — testes de persistência usam schema SQL legado, produção usa Drizzle; divergência não detectada
3. **Dual RBAC** — role codes diferentes entre seed e access-control; testes podem passar com roles erradas
4. **Sem banco isolado de validação** — `prepare-test-db.mjs` dropa e recria o schema, mas usa o track SQL legado
5. **Sem CI** — nenhum pipeline automático executa testes
6. **E2E fixture baseURL mismatch** — fixture aponta para `:3000`, smoke config usa `:4001`
7. **Sem shared test utilities** — duplicação de setup em cada módulo

---

## 7. Riscos Técnicos para Construção da Camada de Validação

### 7.1 Riscos Críticos

| Risco                                          | Probabilidade | Impacto | Mitigação                                                           |
| ---------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------- |
| Schema de testes diverge do schema de produção | Alta          | Alto    | Unificar migration track — testes devem usar Drizzle `0000_`        |
| 4 módulos sem persistência DB                  | Confirmado    | Alto    | Injetar repositórios DB nos services antes de validar fluxos        |
| Dual RBAC com role codes incompatíveis         | Confirmado    | Alto    | Reconciliar ou eliminar um dos sistemas antes de testar autorização |
| seed.sql referencia tabelas inexistentes       | Confirmado    | Médio   | Eliminar seed.sql ou atualizar para schema Drizzle                  |

### 7.2 Riscos Moderados

| Risco                           | Probabilidade | Impacto | Mitigação                                         |
| ------------------------------- | ------------- | ------- | ------------------------------------------------- |
| Vitest sem config em 20 módulos | Confirmado    | Médio   | Criar vitest.config.ts compartilhado              |
| Sem cobertura configurada       | Confirmado    | Médio   | Adicionar coverage config ao vitest compartilhado |
| E2E fixture baseURL mismatch    | Confirmado    | Médio   | Corrigir baseURL na fixture                       |
| SHA-256 no seed de senha        | Confirmado    | Médio   | Usar bcrypt/argon2 compatível com UsersService    |
| Staff sem CRUD                  | Confirmado    | Médio   | Criar StaffRepository ou eliminar dependência     |

### 7.3 Riscos Baixa Prioridade

| Risco                                 | Probabilidade | Impacto | Mitigação                                                |
| ------------------------------------- | ------------- | ------- | -------------------------------------------------------- |
| Triage imutável                       | Confirmado    | Baixo   | Adicionar update method se necessário para fluxos        |
| Prescription-executions sem validação | Confirmado    | Baixo   | Adicionar validação de existência antes de testar fluxos |
| Dual audit packages                   | Confirmado    | Baixo   | Consolidar em um único pacote                            |
| Events package mínimo                 | Confirmado    | Baixo   | Expandir se necessário para testes de eventos            |

---

## 8. Confirmações vs Hipóteses

### 8.1 Confirmado por Inspeção de Código

- API usa Node.js http nativo, sem framework
- Drizzle ORM com 1 mega-migration para produção
- 21 módulos em `packages/modules/`
- 3 runners de teste coexistem
- 4 módulos sem injeção de repositório DB
- Dual RBAC com role codes diferentes
- Dual migration tracks
- seed.sql com tabelas inexistentes
- 4 specs e2e Playwright
- 3 testes de API com node:test
- 20 testes de módulo com vitest
- Sem vitest.config em módulos
- Sem cobertura configurada para módulos/API
- Sem CI pipeline
- EncountersService é o hub central (9 dependências)

### 8.2 Não Confirmado Nesta Etapa

- Estado real do worker app (não inspecionado em profundidade)
- Estado do frontend web além do dist/ compilado
- Se há testes existentes que foram removidos do git
- Se o banco de produção está em sync com a migration `0000_`
- Performance dos testes com banco real (não executados)

---

## 9. Próximos Arquivos da Faixa 700-790

| Arquivo                                | Conteúdo                                       |
| -------------------------------------- | ---------------------------------------------- |
| `710-integration-test-architecture.md` | Arquitetura detalhada dos testes de integração |
| `720-flow-specifications.md`           | Especificação de cada fluxo de validação       |
| `730-rbac-validation-matrix.md`        | Matriz de permissões por role × recurso        |
| `740-database-isolation-strategy.md`   | Estratégia de isolamento de banco              |
| `750-factory-and-fixture-design.md`    | Design das factories e fixtures                |
| `760-e2e-extension-plan.md`            | Plano de extensão dos e2e                      |
| `770-migration-integrity-tests.md`     | Testes de migração                             |
| `780-ci-pipeline-for-validation.md`    | Pipeline de CI                                 |
| `790-validation-gate-criteria.md`      | Critérios de aceite                            |
