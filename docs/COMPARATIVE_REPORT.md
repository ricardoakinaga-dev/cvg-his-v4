# Relatório Comparativo — Código Real vs. Documentação

> Auditoria executada em 2026-03-30 sobre o repositório `cvg-his-v2`
> Comparação: Documentação (docs/SUMMARY.md) vs. código-fonte real no repositório

---

## 1. Estrutura Real vs. Documentada

### Documentação afirma:
```
cvg-his-v2/
├── apps/
│   ├── api/
│   ├── web/
│   └── worker/
├── packages/
│   ├── modules/*    # 17 módulos de negócio
│   └── shared/*     # 9 pacotes de infraestrutura
├── infra/
├── tools/
└── docs/
```

### O que realmente existe:

**Apps (✅ Conforme):**
- `apps/api/` — Servidor HTTP com todas as rotas
- `apps/web/` — SPA inline com 23 páginas/rotas
- `apps/worker/` — Worker de processamento de notificações

**Packages/modules (18 módulos, não 17):**
- access-control, attachments, audit, auth, billing, diagnostics, encounters, inpatient, inventory, medical-records, notifications, owners, patients, scheduling, staff, surgery, triage, users
- **Ausentes documentados:** `discharges` e `prescription-executions` — **NÃO existem como módulos separados**. Discharge é um status dentro de `inpatient`. Prescrições estão em `medical-records`.

**Packages/shared (10 pacotes, não 9):**
- auth-sdk, config, contracts, database, errors, logging, types, **ui** (vazio!), utils, validation
- **`ui` está vazio** — contém apenas um diretório vazio, sem código.

**Pacotes adicionais em `packages/` (NÃO mencionados nos docs como ativos):**
- `packages/db/` — Pacote Drizzle ORM com schema completo (50+ tabelas), 1 migration auto-gerada, seed
- `packages/domain/` — Pacote legacy com tipos de domínio (owner, patient, encounter, medication, etc.)
- `packages/events/` — Pacote de eventos
- `packages/rbac/` — Pacote RBAC separado
- `packages/audit/` — Pacote de auditoria separado
- `packages/config/` — Pacote de configuração separado

**pnpm-workspace.yaml** — Configurado para `apps/*`, `packages/*`, `packages/modules/*`, `packages/shared/*`. Isso significa que `packages/db`, `packages/domain`, etc. estão no workspace mas **não mencionados na documentação como ativos**.

**turbo.json** — Presente e configurado com tasks: build, typecheck, lint, test, dev. ✅ Conforme.

---

## 2. Status de Cada Módulo

### 2.1 Tutores / Owners

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ✅ Implementado |
| Repositories | In-memory + Database | ✅ Ambos existem (`in-memory-owner.repository.ts`, `database-owner.repository.ts`) |
| Service | `OwnersService` com `listForAccount`, `getForAccountOrThrow` | ✅ Existe, com `create`, `update`, `getOrThrow`, `list` |
| Testes | Focados mencionados | ❌ **Nenhum teste dedicado** (sem `owners.test.ts`) |
| Contacts repetíveis | Sim | ✅ Suportado no schema e service |
| Mascáras CPF/CNPJ | Implementado | ⚠️ Service aceita `documentId` livre, sem validação de formato |

**Gap crítico:** Docs afirmam "testes focados" mas **não há teste algum** para o módulo owners.

### 2.2 Pacientes / Patients

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ✅ Implementado |
| Repositories | In-memory + Database | ✅ Ambos existem |
| Alertas clínicos estruturados | jsonb | ⚠️ Schema inicial (001) não tem coluna de alertas clínicos estruturados |
| Migration 007 | Expansão de patients | ❌ **Migration 007 não existe** — apenas 001-005 |
| Testes | Focados mencionados | ❌ **Nenhum teste dedicado** (sem `patients.test.ts`) |

**Gap crítico:** Migration 007 não existe no código. Apenas 5 migrations manuais SQL.

### 2.3 Atendimentos / Encounters

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ✅ Implementado |
| Repositories | In-memory + Database | ✅ Ambos existem |
| Migration 008 e 009 | Expansão de encounters | ❌ **Não existem** — apenas 001-005 |
| `chiefComplaint` como campo principal | Sim | ✅ Service aceita `chiefComplaint` em create |
| Timeline | Implementado | ✅ `EncounterTimelineRepository` + endpoint `/encounters/{id}/timeline` |
| Testes | Focados mencionados | ✅ `encounters.test.ts` existe |

**Gap:** Migrations 008 e 009 não existem. Schema inicial (001) já contém tabela `encounters`.

### 2.4 Prontuário Clínico / Medical Records

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Implementado e validado | ✅ Implementado |
| Versionamento com `expectedVersion` | Sim | ✅ `updateEntry` aceita `expectedVersion` |
| Soft-delete lógico | Sim | ✅ `archiveEntry` implementado |
| `entry_revisions` | Migration 002 | ✅ `002_entry_revisions.sql` existe |
| `clinical_timeline` | Implementado | ✅ `ClinicalTimelineRepository` + endpoint |
| `AttachmentRepository` + `LocalFileStorage` | Sim | ✅ Ambos implementados |
| Testes | `db-persistence.test.ts` | ✅ `medical-records.test.ts` existe |

### 2.5 Prescrições / Prescriptions

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Implementado no módulo `medical-records` | ⚠️ **Parcialmente** — mencionado em `access-control` e `inventory`, mas não há service/repo dedicado |
| Módulo separado `prescription-executions` | Mencionado nos docs 82-86 | ❌ **Não existe como módulo** |

**Gap crítico:** Não existe módulo `prescription-executions`. Prescrições não são gerenciadas por um service dedicado. Apenas o tipo de entry clínica (`prescription`) é suportado no prontuário.

### 2.6 Exames / Diagnostics

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ✅ Implementado |
| `DatabaseDiagnosticOrderRepository` | Sim | ✅ Existe |
| Catálogo com 6 exames | HEM, BIO, URIN, RX, US, ECO | ✅ Conforme |
| Lifecycle requested→collected→resulted | Sim | ✅ `VALID_DIAGNOSTIC_TRANSITIONS` implementado |
| Migration para exam tables | Mencionado | ❌ Não há migration SQL dedicada. Schema inicial (001) contém `exam_orders` e `exam_results` |
| Testes | 9 testes mencionados | ✅ `diagnostics.test.ts` existe |

### 2.7 Internação / Inpatient

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ✅ Implementado |
| `DatabaseInpatientStayRepository` | Sim | ✅ Existe |
| `DatabaseInpatientProgressRepository` | Sim | ✅ Existe |
| `SectorBedService` com CRUD | Sim | ✅ Implementado com `DatabaseSectorRepository`, `DatabaseBedRepository` |
| `assign-bed` e `transfer-bed` | Sim | ✅ Endpoints implementados |
| `bed-map` operacional | Sim | ✅ Endpoint `/bed-map` implementado |
| Migrations 005, 011 | Setores/leitos, expansão inpatient | ⚠️ `005_sectors_beds.sql` existe, mas **011 não existe** |
| Testes | 7 + teste 13 de persistência | ✅ `inpatient.test.ts` existe |

### 2.8 Execução de Prescrição / Enfermagem

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Implementado no módulo `prescription-executions` | ❌ **Módulo não existe** |
| Status de administração | pendente, administrado, não administrado, suspenso, cancelado | ❌ Não implementado |
| Checagem dupla | Mencionado | ❌ Não implementado |
| Snapshot de sinais vitais | Mencionado | ❌ Não implementado |

**Gap crítico total:** O módulo de execução de prescrição **não existe no código**.

### 2.9 Alta / Desfecho Clínico

| Aspecto | Docs | Código Real |
|---------|------|-------------|
| Status | Aprovado com ressalvas | ⚠️ **Parcialmente implementado** |
| Módulo `discharges` | Mencionado | ❌ **Não existe como módulo separado** |
| Permissões `discharges.read`/`discharges.manage` | Mencionado | ⚠️ Não encontradas no `access-control` |
| Tipos de alta (ambulatorial, internação, transferência, óbito) | Sim | ⚠️ Apenas `discharge` como status de inpatient |

**Gap crítico:** Não existe módulo `discharges`. Alta é apenas um status dentro de `inpatient` (`discharged`). Não há resumo clínico final, orientações de continuidade ou follow-up como módulo independente.

---

## 3. Migrations Reais

### O que docs afirmam:
Migrations 001-020+ em `packages/shared/database/src/migrations/`:
- 001: Schema inicial (22 tabelas)
- 002: Revisões de entries
- 003: Persistência de cuidados avançados
- 004: Governança de clinical entries
- 005: Setores e leitos
- 006: Expansão de owners
- 007: Expansão de patients
- 008: Expansão de encounters
- 009: Hardening de encounters
- 011: Expansão de inpatient stays
- 015-020: Versionamento

### O que realmente existe:

**`packages/shared/database/src/migrations/` — 5 migrations SQL manuais:**
| Arquivo | Tamanho | Descrição Real |
|---------|---------|----------------|
| `001_initial_schema.sql` | 340 linhas | Schema inicial com tabelas: sessions, audit_events, owners, patients, owner_patient_links, encounters, clinical_entries, medical_records, exam_orders, exam_results, inpatient_stays, inpatient_progress, billing_records, billing_items, inventory_items, inventory_consumptions, notifications, notification_jobs, surgery_cases, attachments |
| `002_entry_revisions.sql` | 21 linhas | Tabela `entry_revisions` |
| `003_advanced_care_persistence.sql` | 21 linhas | Persistência de cuidados avançados (inpatient progress, surgery cases) |
| `004_clinical_entry_governance.sql` | 8 linhas | Campos `archived_at`, `archived_by` em `clinical_entries` |
| `005_sectors_beds.sql` | 37 linhas | Tabelas `sectors` e `beds` |

**`packages/db/migrations/` — 1 migration Drizzle auto-gerada:**
| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `0000_vengeful_pet_avengers.sql` | 890 linhas | Schema Drizzle completo com 50+ tabelas (accounts, roles, permissions, users, owners, patients, encounters, clinical_notes, exam_orders, beds, wards, protocols, etc.) |

### Gap: Migrations 006-020 **NÃO EXISTEM**. Apenas 5 migrations manuais + 1 auto-gerada. As expansões de schema documentadas (006-020) não estão materializadas como migrations.

---

## 4. Testes Reais

### Testes encontrados (21 arquivos):

**Apps:**
| Arquivo | Módulo |
|---------|--------|
| `apps/api/src/runtime.test.ts` | Runtime API |
| `apps/api/src/health.test.ts` | Health check |
| `apps/api/src/db-persistence.test.ts` | Persistência DB |

**Módulos:**
| Arquivo | Módulo |
|---------|--------|
| `packages/modules/auth/src/auth.test.ts` | Auth ✅ |
| `packages/modules/attachments/src/attachments.test.ts` | Attachments ✅ |
| `packages/modules/billing/src/billing.test.ts` | Billing ✅ |
| `packages/modules/diagnostics/src/diagnostics.test.ts` | Diagnostics ✅ |
| `packages/modules/encounters/src/encounters.test.ts` | Encounters ✅ |
| `packages/modules/inpatient/src/inpatient.test.ts` | Inpatient ✅ |
| `packages/modules/inventory/src/inventory.test.ts` | Inventory ✅ |
| `packages/modules/medical-records/src/medical-records.test.ts` | Medical Records ✅ |
| `packages/modules/notifications/src/notifications.test.ts` | Notifications ✅ |
| `packages/modules/surgery/src/surgery.test.ts` | Surgery ✅ |

**Domain (legacy):**
| Arquivo | Módulo |
|---------|--------|
| `packages/domain/src/index.test.ts` | Domain index |
| `packages/domain/src/doseDueLogic.test.ts` | Dose due logic |
| `packages/domain/src/medicationSlots.test.ts` | Medication slots |

**Contracts:**
| Arquivo | Módulo |
|---------|--------|
| `packages/contracts/src/__tests__/contracts.test.ts` | Contracts |

**E2E (Playwright):**
| Arquivo | Módulo |
|---------|--------|
| `e2e/tests/fluxo-principal.spec.ts` | Fluxo principal (tutor→paciente→agendamento→atendimento) |
| `e2e/tests/fluxo-exames.spec.ts` | Fluxo exames |
| `e2e/tests/fluxo-internacao.spec.ts` | Fluxo internação |
| `e2e/tests/smoke.spec.ts` | Smoke test |

### Módulos SEM testes:
- ❌ owners
- ❌ patients
- ❌ access-control
- ❌ audit
- ❌ scheduling
- ❌ staff
- ❌ triage
- ❌ users

### Gap: Docs afirmam "testes focados" para owners e patients, mas **nenhum existe**. Docs mencionam "52/52 suite ampla" mas a suite real de módulos tem apenas 11 testes de módulo + 3 de API + 3 de domain + 1 contracts = **18 testes unitários** (não 52).

---

## 5. API Endpoints

### Rotas implementadas em `apps/api/src/server.ts`:

**Autenticação (4 rotas):**
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/session`

**Health (3 rotas):**
- `GET /health`
- `GET /ready`
- `GET /live`

**Owners (4 rotas):**
- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`

**Patients (4 rotas):**
- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`

**Owner-Patient Links (2 rotas):**
- `GET /owner-patient-links`
- `POST /owner-patient-links`

**Encounters (5 rotas):**
- `GET /encounters`
- `POST /encounters`
- `GET /encounters/:id`
- `GET /encounters/:id/timeline`
- `POST /encounters/:id/transition`
- `POST /encounters/:id/close`

**Medical Records (6 rotas):**
- `GET /medical-records?encounterId=`
- `GET /medical-records/entries?encounterId=`
- `POST /medical-records/entries`
- `PATCH /medical-records/entries/:id`
- `DELETE /medical-records/entries/:id`
- `GET /medical-records/timeline?encounterId=`

**Attachments (2 rotas):**
- `GET /attachments`
- `POST /attachments`

**Inpatient (7 rotas):**
- `GET /inpatient`
- `POST /inpatient`
- `GET /inpatient/:id/progress`
- `POST /inpatient/progress`
- `POST /inpatient/:id/status`
- `POST /inpatient/:id/assign-bed`
- `POST /inpatient/:id/transfer-bed`

**Sectors & Beds (4 rotas):**
- `GET /sectors`
- `POST /sectors`
- `GET /beds`
- `POST /beds`
- `GET /bed-map`

**Surgeries (3 rotas):**
- `GET /surgeries`
- `POST /surgeries`
- `POST /surgeries/:id/status`

**Diagnostics (3 rotas):**
- `GET /diagnostics/orders`
- `POST /diagnostics/orders`
- `POST /diagnostics/orders/:id/result`

**Billing (5 rotas):**
- `GET /billing`
- `GET /billing/items?encounterId=`
- `POST /billing/estimate`
- `POST /billing/items`
- `POST /billing/:encounterId/status`

**Inventory (3 rotas):**
- `GET /inventory/items`
- `GET /inventory/consumptions`
- `POST /inventory/consumptions`

**Notifications (4 rotas):**
- `GET /notifications`
- `GET /notifications/jobs`
- `POST /notifications`
- `POST /notifications/process`

**Scheduling (4 rotas):**
- `GET /appointments`
- `POST /appointments`
- `GET /queue`
- `POST /queue/check-in`
- `POST /queue/:id/call`

**Triage (2 rotas):**
- `GET /triage`
- `POST /triage`

**Users (3 rotas):**
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`

**Staff (2 rotas):**
- `GET /staff`
- `GET /staff/:id`

**Access Control (1 rota):**
- `GET /access-control`

**Audit (1 rota):**
- `GET /audit/events`

**Master Search (1 rota):**
- `GET /master-search`

**Total: ~67 endpoints**

### Rotas que docs indicam "prontas sem fluxo frontend real":
- `PATCH /owners/:id` — Update de owners ✅ existe na API
- `PATCH /patients/:id` — Update de patients ✅ existe na API
- `PATCH /users/:id` — Update de users ✅ existe na API
- `POST /inpatient/:id/assign-bed` — ✅ existe
- `POST /inpatient/:id/transfer-bed` — ✅ existe

---

## 6. Frontend Real

### Páginas implementadas em `apps/web/src/`:

| Rota | Página | Arquivo |
|------|--------|---------|
| `/login` | Login | `login.ts` |
| `/` | Dashboard | `dashboard.ts` |
| `/owners` | Tutores | `owners.ts` |
| `/patients` | Pacientes | `patients.ts` |
| `/encounters` | Atendimentos | `encounters.ts` |
| `/medical-records` | Prontuário | `medical-records.ts` |
| `/users` | Usuários | `users.ts` |
| `/staff` | Equipe | `staff.ts` |
| `/access-control` | Permissões | `access-control.ts` |
| `/appointments` | Agenda | `appointments.ts` |
| `/queue` | Recepção/Fila | `queue.ts` |
| `/triage` | Triagem | `triage.ts` |
| `/inpatient` | Internação | `inpatient.ts` |
| `/sectors` | Setores | `sectors.ts` |
| `/beds` | Leitos | `beds.ts` |
| `/bed-map` | Mapa de Leitos | `bedmap.ts` |
| `/diagnostics` | Diagnósticos/Exames | `diagnostics.ts` |
| `/surgeries` | Cirurgias | `surgeries.ts` |
| `/inventory` | Estoque | `inventory.ts` |
| `/billing` | Faturamento | `billing.ts` |
| `/notifications` | Notificações | `notifications.ts` |
| `/audit` | Auditoria | `audit.ts` |
| `/master-search` | Busca Mestra | `master-search.ts` |

**Total: 23 páginas** ✅

### Sidebar/Navegação (documentada em docs 904-907):
- Sidebar com grupos: Essencial, Administrativo, Operação, Assistencial, Backoffice, Governança
- Layout legado paralelo (`layout.ts`) coexistindo com shell novo no `index.ts` — **confirmado** ✅
- `styles.ts` com estilos base ✅

### Gap: Não há página dedicada para **Prescrições** (`/prescriptions`), **Alta/Desfecho** (`/discharges`), ou **Execução de Prescrição** (/prescription-executions), apesar de estarem na sidebar documentada.

---

## 7. Gaps Críticos

### 🔴 Críticos (Impacto Alto):

1. **Módulo `discharges` não existe** — Docs aprovam com ressalvas, mas o módigo não tem módulo, service, repository ou testes. Alta é apenas um status de inpatient.

2. **Módulo `prescription-executions` não existe** — Documentação afirma "implementado" com detalhes de administração, checagem dupla e sinais vitais. Nada disso existe no código.

3. **Migrations 006-020 não existem** — Docs detalham 20 migrations, mas apenas 5 estão presentes. As expansões de schema (owners, patients, encounters, inpatient) não estão materializadas como migrations SQL. O schema Drizzle em `packages/db` tem uma migration auto-gerada com 890 linhas cobrindo 50+ tabelas, mas esse pacote não é usado pela API.

4. **Pacote `packages/db` duplicado/paralelo** — Existe um pacote `packages/db` com Drizzle ORM, schema completo de 50+ tabelas, seed, migrations — mas a API usa `packages/shared/database` com apenas 5 migrations SQL manuais e repositórios próprios. Há dois sistemas de banco coexistindo.

5. **`packages/shared/ui` vazio** — Documentação não menciona, mas existe no workspace sem conteúdo.

### 🟡 Médios (Impacto Médio):

6. **Testes insuficientes** — 8 módulos de negócio não têm testes (owners, patients, access-control, audit, scheduling, staff, triage, users). Docs afirmam "52/52 suite ampla" mas a suite real tem ~18 testes unitários.

7. **`packages/domain` declarado legacy** — Existe com código ativo (doseDueLogic, medicationSlots, etc.) e 3 testes, mas docs dizem que será removido.

8. **Billing e Inventory são in-memory only** — Não têm `database-*.repository.ts` — apenas in-memory no service. Sem persistência real.

9. **Triage e Scheduling são in-memory only** — Não têm database repositories.

10. **Surgery tem `DatabaseSurgeryCaseRepository`** mas o service ainda mantém `Map` em memória com lógica de `#enqueuePersist` — padrão híbrido.

### 🟢 Observações:

11. **Config V1 vs V2** — `.env.example` tem variáveis legadas (JWT_SECRET, Next.js, Qdrant). `.env.v2.example` tem variáveis corretas (AUTH_SECRET, POSTGRES_*). O sistema real usa o padrão V2.

12. **Docker Compose correto** — `docker-compose.v2.yml` está bem configurado com PostgreSQL 16, Redis 7, API, Web, Worker.

13. **E2E tests existem** — 4 testes Playwright no diretório `e2e/`, não mencionados nos docs.

---

## 8. Conclusão

### Avaliação Geral: **O código implementa ~60-70% do que a documentação descreve**

**O que está REALMENTE implementado e funcional:**
- ✅ Arquitetura monorepo com pnpm + Turbo
- ✅ API com ~67 endpoints HTTP com auth, RBAC e audit logging
- ✅ Frontend SPA com 23 páginas/hash-routes
- ✅ Worker para processamento de notificações
- ✅ Módulos core: owners, patients, encounters, medical-records, inpatient, diagnostics, surgery
- ✅ Repositories database para módulos core (auth, audit, owners, patients, encounters, medical-records, inpatient, surgery, diagnostics, attachments, notifications)
- ✅ Docker Compose com PostgreSQL + Redis + API + Web + Worker
- ✅ 18 testes unitários + 4 E2E

**O que NÃO existe (mas docs afirmam que sim):**
- ❌ Módulo `discharges` (alta/desfecho clínico)
- ❌ Módulo `prescription-executions` (enfermagem)
- ❌ Migrations 006-020
- ❌ Testes para 8 módulos
- ❌ Database repositories para billing, inventory, triage, scheduling, staff, users, access-control

**O que existe mas não é documentado:**
- ⚠️ `packages/db` com Drizzle ORM completo (paralelo ao `packages/shared/database`)
- ⚠️ `packages/domain`, `packages/events`, `packages/rbac`, `packages/audit`, `packages/config`
- ⚠️ `packages/shared/ui` vazio

**A documentação é significativamente mais otimista que a realidade.** Muitos módulos são descritos como "aprovados com ressalvas" ou "implementados" quando na verdade são apenas skeletons com services in-memory sem testes. O gap mais crítico é a ausência total dos módulos `discharges` e `prescription-executions`, que são funcionalidades essenciais para um HIS veterinário.

---

*Relatório gerado por auditoria de código em 2026-03-30.*
