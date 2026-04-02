# 730 — Test Data Fixtures and Factories

**Status:** R0 — contrato
**Data:** 2026-03-31
**Faixa:** 700-790

---

## 1. Propósito

Este documento define os padrões obrigatórios para criação, organização e uso de dados de teste no CVG-HIS-V2. Aplica-se a testes unitários (Vitest), testes de API (node:test) e testes E2E (Playwright).

---

## 2. Princípios

| Princípio           | Regra                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Factory-first       | Criar entidades via services reais (API ou module service), nunca INSERT direto no DB    |
| Sem acaso           | Proibido `Math.random()` para IDs, timestamps ou valores de domínio                      |
| Sem dados hardcoded | Todo dado de teste deve ser produzido por factory ou fixture                             |
| Composição          | Cenários complexos montados pela composição de factories simples                         |
| Isolamento          | Cada teste limpa seus próprios recursos; cleanup é responsabilidade do teste             |
| Determinismo        | Mesmos inputs de factory → mesmos outputs (exceto `defaultRandom()` do UUID do Postgres) |

---

## 3. Hierarquia de Dados de Teste

```
Seed mínimo (banco) → Factory (entidade) → Fixture (Playwright) → Helper (composição de cenário)
```

| Camada      | Responsabilidade                                                                     | Onde vive                                             |
| ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Seed**    | Dados mínimos para o banco funcionar (account, unit, permissions, roles, admin user) | `packages/db/src/seed.ts`                             |
| **Factory** | Criação programática de entidades de teste via services reais                        | `packages/modules/*/src/*.test.ts` ou `e2e/fixtures/` |
| **Fixture** | Extensão do `test` do Playwright com helpers pré-configurados                        | `e2e/fixtures/cvg-his.fixture.ts`                     |
| **Helper**  | Composição de factories para montar cenários completos                               | `e2e/helpers/` (a criar)                              |

---

## 4. Seed Mínimo Obrigatório

O seed Drizzle (`packages/db/src/seed.ts`) é a única fonte de seed válida para testes com banco real. Ele cria:

### 4.1 Account

| Campo       | Valor          |
| ----------- | -------------- |
| `slug`      | `default`      |
| `name`      | `Conta padrão` |
| `is_active` | `true`         |

### 4.2 Unit

| Campo        | Valor                     |
| ------------ | ------------------------- |
| `code`       | `hq`                      |
| `name`       | `Unidade Central`         |
| `account_id` | FK para account `default` |

### 4.3 Permissions (51 canônicas via `@cvg-his/rbac`)

Populadas a partir de `CANONICAL_PERMISSIONS` do pacote `packages/rbac/src/permissions.ts`. Exemplos:

| Permission Key       | Descrição                                 |
| -------------------- | ----------------------------------------- |
| `rbac.manage`        | Gerenciar papéis, permissões e vínculos   |
| `owner.read`         | Leitura de proprietários                  |
| `owner.write`        | Criação/alteração de proprietários        |
| `patient.read`       | Leitura de pacientes                      |
| `patient.write`      | Criação/alteração de pacientes            |
| `encounter.read`     | Leitura de atendimentos                   |
| `encounter.write`    | Abertura/atualização de atendimentos      |
| `encounter.close`    | Encerramento de atendimentos              |
| `note.read`          | Leitura de notas clínicas                 |
| `note.write`         | Criação/edição de notas clínicas          |
| `note.sign`          | Assinatura de nota clínica                |
| `appointment.read`   | Leitura da agenda                         |
| `appointment.write`  | Criação/alteração de agendamentos         |
| `billing_item.read`  | Leitura de itens de cobrança              |
| `billing_item.write` | Criação/alteração de itens de cobrança    |
| `product.read`       | Leitura do catálogo de produtos           |
| `product.write`      | Criação/alteração do catálogo de produtos |
| `service.read`       | Leitura do catálogo de serviços           |
| `service.write`      | Criação/alteração do catálogo de serviços |

Total: 51 permissões canônicas.

### 4.4 Roles (4 roles Drizzle)

| Role Name    | Descrição                      |
| ------------ | ------------------------------ |
| `admin`      | Acesso administrativo completo |
| `vet`        | Perfil de médico veterinário   |
| `enfermagem` | Perfil de enfermagem           |
| `recepcao`   | Perfil de recepção             |

> **Nota:** Os roles do Drizzle (`admin`, `vet`, `enfermagem`, `recepcao`) divergem dos roles do AccessControlService (`admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`). Para testes de autorização, usar os roles do AccessControlService. Para seed de banco, usar os roles Drizzle.

### 4.5 Role-Permission Mapping

Populado via `ROLE_PERMISSIONS` do pacote `@cvg-his/rbac`. O role `admin` recebe todas as 51 permissões.

### 4.6 Admin User

Criado condicionalmente via variáveis de ambiente:

| Campo           | Fonte                       |
| --------------- | --------------------------- |
| `email`         | `ADMIN_EMAIL`               |
| `password_hash` | SHA-256 de `ADMIN_PASSWORD` |
| `full_name`     | `Administrador Seed`        |

### 4.7 Seed In-Memory (UsersService — 7 users)

O `UsersService` (`packages/modules/users/src/index.ts`) possui 7 seed users in-memory com hash scrypt:

| User ID          | Username    | Email                     | Role Codes         | Password (prefix) |
| ---------------- | ----------- | ------------------------- | ------------------ | ----------------- |
| `user_admin`     | `admin`     | `admin@cvg-his.local`     | `['admin']`        | `seed_admin`      |
| `user_reception` | `reception` | `reception@cvg-his.local` | `['reception']`    | `seed_reception`  |
| `user_auditor`   | `auditor`   | `auditor@cvg-his.local`   | `['auditor']`      | `seed_auditor`    |
| `user_nurse`     | `nurse`     | `nurse@cvg-his.local`     | `['nurse']`        | `seed_nurse`      |
| `user_vet`       | `vet`       | `vet@cvg-his.local`       | `['veterinarian']` | `seed_vet`        |
| `user_finance`   | `finance`   | `finance@cvg-his.local`   | `['finance']`      | `seed_finance`    |
| `user_inventory` | `inventory` | `inventory@cvg-his.local` | `['inventory']`    | `seed_inventory`  |

### 4.8 Seed In-Memory (StaffService — 7 staff)

O `StaffService` (`packages/modules/staff/src/index.ts`) possui 7 registros seed:

| Staff ID          | User ID          | Employee Code | Department  | Job Title                |
| ----------------- | ---------------- | ------------- | ----------- | ------------------------ |
| `staff_admin`     | `user_admin`     | `ADM-001`     | Governanca  | Administrador do Sistema |
| `staff_reception` | `user_reception` | `REC-001`     | Atendimento | Recepcionista            |
| `staff_auditor`   | `user_auditor`   | `AUD-001`     | Governanca  | Auditor                  |
| `staff_nurse`     | `user_nurse`     | `NUR-001`     | Triagem     | Enfermeira               |
| `staff_vet`       | `user_vet`       | `VET-001`     | Clinica     | Medico Veterinario       |
| `staff_finance`   | `user_finance`   | `FIN-001`     | Financeiro  | Analista Financeiro      |
| `staff_inventory` | `user_inventory` | `INV-001`     | Suprimentos | Analista de Estoque      |

---

## 5. Convenções de Factories

### 5.1 Regras Gerais

- Factories criam entidades via **services reais** (module services ou API endpoints), nunca por INSERT direto no banco
- Factories retornam o objeto completo criado (com ID gerado pelo banco ou service)
- Factories aceitam parâmetros opcionais com defaults determinísticos
- Factories registram recursos criados para cleanup posterior
- Proibido usar `Math.random()` para IDs, emails, documentos ou qualquer campo de domínio

### 5.2 Padrão de Nomes

| Entidade        | Factory Name            | Exemplo                                                           |
| --------------- | ----------------------- | ----------------------------------------------------------------- |
| Tutor (owner)   | `createOwner`           | `createOwner({ fullName: 'Tutor Teste' })`                        |
| Paciente        | `createPatient`         | `createPatient(ownerId, { name: 'Rex' })`                         |
| Agendamento     | `createAppointment`     | `createAppointment(patientId, ownerId, professionalUserId)`       |
| Atendimento     | `createEncounter`       | `createEncounter(patientId, ownerId)`                             |
| Usuário         | `createUser`            | `createUser({ username, email, roleCode })`                       |
| Produto         | `createProduct`         | `createProduct({ name, basePrice })`                              |
| Item de estoque | `createStockItem`       | `createStockItem(productId)`                                      |
| Serviço         | `createService`         | `createService({ name, basePrice })`                              |
| Ala             | `createWard`            | `createWard({ name, code })`                                      |
| Leito           | `createBed`             | `createBed(wardId, { name, code })`                               |
| Internação      | `createInpatientStay`   | `createInpatientStay(patientId, wardId, bedId)`                   |
| Exame           | `createExamOrder`       | `createExamOrder(patientId, { examName, category })`              |
| Prescrição      | `createMedicationOrder` | `createMedicationOrder(patientId, { medicationName, doseValue })` |
| Nota clínica    | `createClinicalNote`    | `createClinicalNote(encounterId, { type, status })`               |

### 5.3 Factories Existentes (Playwright)

Local: `e2e/fixtures/cvg-his.fixture.ts`

| Fixture             | Tipo        | Endpoint             | Payload                                                                                         |
| ------------------- | ----------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| `createOwner`       | Factory API | `POST /owners`       | `{ fullName, document: E2E-{timestamp}, phoneMain, email: E2E-{timestamp}@test.com }`           |
| `createPatient`     | Factory API | `POST /patients`     | `{ ownerId, name, species: 'Canina', breed: 'SRD', sex: 'male', microchip: E2E-{timestamp} }`   |
| `createAppointment` | Factory API | `POST /appointments` | `{ patientId, ownerId, professionalUserId, startAt: +1h, endAt: +1h30m, type: 'consultation' }` |
| `createEncounter`   | Factory API | `POST /encounters`   | `{ patientId, ownerId, reason }`                                                                |
| `cleanup`           | Cleanup     | In-memory tracking   | Limpa array `createdResources` ao final do teste                                                |

> **Problema conhecido:** As factories existentes usam `Date.now()` para gerar documentos e emails únicos. Isso é aceitável para E2E mas **proibido** para testes unitários/determinísticos. Para testes unitários, usar valores fixos com sufixo incremental (ex: `test-owner-001`).

---

## 6. Catálogo de Entidades de Teste Mínimas

### 6.1 Admin (user com role admin)

```
Entidade: users + user_roles + roles
Tabela: users, user_roles, roles
Campos mínimos:
  users: account_id (FK), unit_id (FK, nullable), email, password_hash, full_name, is_active
  user_roles: user_id (FK), role_id (FK)
  roles: name = 'admin'
Permissões: todas as 51 canônicas via role_permissions
```

### 6.2 Recepcionista (user com role reception)

```
Entidade: users + user_roles + roles
Tabela: users, user_roles, roles
Campos mínimos:
  users: account_id, unit_id, email, password_hash, full_name, is_active
  user_roles: user_id, role_id
  roles: name = 'reception' (AccessControlService) ou 'recepcao' (Drizzle seed)
Permissões: 15 permissões do role reception no AccessControlService
```

### 6.3 Veterinário (user com role veterinarian)

```
Entidade: users + user_roles + roles
Tabela: users, user_roles, roles
Campos mínimos:
  users: account_id, unit_id, email, password_hash, full_name, is_active
  user_roles: user_id, role_id
  roles: name = 'veterinarian' (AccessControlService) ou 'vet' (Drizzle seed)
Permissões: 20 permissões do role veterinarian no AccessControlService
```

### 6.4 Tutor (owner)

```
Entidade: owners
Tabela: owners
Campos mínimos: account_id (FK), unit_id (FK, nullable), full_name, document, phone_main, email
FK: account_id → accounts.id, unit_id → units.id
Índices: idx_owners_account_full_name, idx_owners_account_document, idx_owners_account_phone
```

### 6.5 Paciente (patient com owner_id)

```
Entidade: patients
Tabela: patients
Campos mínimos: account_id (FK), unit_id (FK, nullable), owner_id (FK), name, species, breed, sex, alerts_json
FK: account_id → accounts.id, unit_id → units.id, owner_id → owners.id (ON DELETE CASCADE)
Índices: idx_patients_account_name, idx_patients_account_microchip, idx_patients_owner_id
```

### 6.6 Unidade (account + unit)

```
Entidade: accounts + units
Tabela: accounts, units
Campos mínimos:
  accounts: slug (unique), name, is_active
  units: account_id (FK), code, name, is_active
FK: units.account_id → accounts.id (ON DELETE CASCADE)
Índices: accounts_slug_unique, units_account_code_unique
```

### 6.7 Agendamento (appointment)

```
Entidade: appointments
Tabela: appointments
Campos mínimos: account_id (FK), patient_id (FK), owner_id (FK), professional_user_id (FK), start_at, end_at, status, type
ENUM status: scheduled, confirmed, in_progress, completed, cancelled, no_show
ENUM type: consultation, vaccination, surgery, exam, return, other
FK: account_id → accounts.id, patient_id → patients.id, owner_id → owners.id, professional_user_id → users.id (ON DELETE RESTRICT)
Índices: idx_appointments_account_start, idx_appointments_account_professional, idx_appointments_account_patient, idx_appointments_account_status
```

### 6.8 Atendimento (encounter)

```
Entidade: encounters
Tabela: encounters
Campos mínimos: account_id (FK), patient_id (FK), owner_id (FK), status, opened_by_user_id (FK), opened_at, reason
ENUM status: open, closed
FK: account_id → accounts.id, patient_id → patients.id, owner_id → owners.id, opened_by_user_id → users.id, closed_by_user_id → users.id (nullable, SET NULL)
Índices: idx_encounters_patient_id, idx_encounters_account_status
```

### 6.9 Item de Estoque (product + stock_item)

```
Entidade: products + stock_items
Tabela: products, stock_items
Campos mínimos:
  products: account_id (FK), name, code, description, base_price, active
  stock_items: account_id (FK), product_id (FK), quantity, min_quantity, max_quantity, location, active
FK products: account_id → accounts.id
FK stock_items: account_id → accounts.id, product_id → products.id (ON DELETE RESTRICT)
Índices products: idx_products_account_name, idx_products_account_active, uq_products_account_code (partial, WHERE code IS NOT NULL)
Índices stock_items: idx_stock_items_account_product, idx_stock_items_account_active, idx_stock_items_low_stock
```

### 6.10 Item Faturável (billing item)

```
Entidade: encounter_billing_items
Tabela: encounter_billing_items
Campos mínimos: account_id (FK), encounter_id (FK), item_type, catalog_item_id (nullable), name_snapshot, code_snapshot (nullable), unit_price, quantity, discount_amount, line_total, created_by_user_id (FK), updated_by_user_id (FK)
ENUM item_type: service, product
FK: account_id → accounts.id, encounter_id → encounters.id (ON DELETE CASCADE), created_by_user_id → users.id, updated_by_user_id → users.id
Índices: idx_ebi_account_encounter, idx_ebi_account_type
```

---

## 7. Proibições

| Prática                          | Status                             | Justificativa                                                         |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `Math.random()` para IDs         | PROIBIDO                           | IDs devem vir do banco (defaultRandom UUID) ou do service             |
| `Math.random()` para emails      | PROIBIDO em testes determinísticos | Usar sufixo incremental fixo (ex: `test-owner-001@test.local`)        |
| `Math.random()` para documentos  | PROIBIDO                           | Usar formato determinístico (ex: `DOC-001`)                           |
| INSERT direto no DB              | PROIBIDO                           | Usar services reais para garantir validações de negócio               |
| Dados hardcoded sem factory      | PROIBIDO                           | Todo dado deve passar por factory                                     |
| Fixture acoplada ao acaso        | PROIBIDO                           | Factories devem ser determinísticas                                   |
| `Date.now()` em testes unitários | PROIBIDO                           | Aceitável apenas em E2E; testes unitários devem usar timestamps fixos |

---

## 8. Estratégia de Isolamento e Reset de Banco

### 8.1 Procedimento de Reset Completo

Para testes que requerem banco limpo:

```
1. DROP SCHEMA public CASCADE
2. CREATE SCHEMA public
3. Aplicar migration Drizzle: 0000_vengeful_pet_avengers.sql
4. Aplicar seed Drizzle: packages/db/src/seed.ts (com ADMIN_EMAIL/ADMIN_PASSWORD definidos)
```

### 8.2 Reset por Teste (E2E)

Para testes E2E com Playwright:

1. Usar `createdResources` array para rastrear recursos criados
2. No teardown, deletar recursos em ordem inversa de dependência:
   - `encounter_billing_items` → `encounters` → `appointments` → `patients` → `owners`
3. Ou: usar transação com rollback (se suportado pelo driver)

### 8.3 Reset por Teste (Unitário)

Testes unitários com Vitest usam services in-memory:

1. Cada teste instancia um novo service com seed vazio ou seed customizado
2. Não há persistência entre testes
3. Usar `seedUsers` e `seedStaff` do modules como base

---

## 9. Estratégia de Montagem de Cenários por Composição

### 9.1 Padrão

Cenários complexos são montados pela composição sequencial de factories simples:

```
createFullEncounterScenario():
  1. createOwner() → ownerId
  2. createPatient(ownerId) → patientId
  3. createAppointment(patientId, ownerId, professionalUserId) → appointmentId
  4. checkIn(appointmentId) → (status: in_progress)
  5. createEncounter(patientId, ownerId) → encounterId
  6. openEncounter(encounterId) → (status: open)
```

### 9.2 Cenários Padrão

| Cenário                         | Composição                                                                                               | Uso                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `createMinimalOwnerPatient()`   | createOwner() → createPatient()                                                                          | Testes de CRUD básico          |
| `createScheduledAppointment()`  | createOwner() → createPatient() → createAppointment()                                                    | Testes de agendamento          |
| `createFullEncounterScenario()` | createOwner() → createPatient() → createAppointment() → checkIn() → openEncounter()                      | Testes de atendimento completo |
| `createInpatientScenario()`     | createOwner() → createPatient() → createEncounter() → createWard() → createBed() → createInpatientStay() | Testes de internação           |
| `createExamScenario()`          | createOwner() → createPatient() → createEncounter() → createExamOrder()                                  | Testes de diagnósticos         |
| `createBillingScenario()`       | createFullEncounterScenario() → createService() → createBillingItem()                                    | Testes de faturamento          |
| `createMedicationScenario()`    | createInpatientScenario() → createMedicationOrder() → createMedicationAdministration()                   | Testes de prescrição           |

### 9.3 Ordem de Dependência entre Entidades

```
accounts
  └── units
  └── users (FK: account_id, unit_id)
  └── owners (FK: account_id, unit_id)
  └── patients (FK: account_id, unit_id, owner_id)
  └── appointments (FK: account_id, patient_id, owner_id, professional_user_id)
  └── encounters (FK: account_id, patient_id, owner_id, opened_by_user_id)
  └── products (FK: account_id)
  └── stock_items (FK: account_id, product_id)
  └── services (FK: account_id)
  └── wards (FK: account_id)
  └── beds (FK: account_id, ward_id)
  └── inpatient_stays (FK: account_id, patient_id, owner_id, encounter_id, ward_id, bed_id, admitted_by_user_id)
  └── encounter_billing_items (FK: account_id, encounter_id, created_by_user_id, updated_by_user_id)
  └── exam_orders (FK: account_id, patient_id, encounter_id, requested_by_user_id)
  └── exam_results (FK: account_id, patient_id, exam_order_id, performed_by_user_id, reviewed_by_user_id)
  └── clinical_notes (FK: encounter_id, signed_by_user_id, created_by_user_id, updated_by_user_id)
  └── clinical_note_versions (FK: note_id, created_by_user_id)
  └── medication_orders (FK: account_id, encounter_id, stay_id, patient_id, created_by_user_id, stopped_by_user_id)
  └── medication_order_schedules (FK: account_id, order_id)
  └── medication_administrations (FK: account_id, order_id, stay_id, encounter_id, administered_by_user_id)
  └── alerts (FK: account_id, stay_id, order_id)
  └── encounter_financial_accounts (FK: account_id, encounter_id, closed_by_user_id)
  └── encounter_receivables (FK: account_id, encounter_id, financial_account_id)
  └── encounter_receivable_payments (FK: account_id, encounter_id, financial_account_id, receivable_id, paid_by_user_id)
  └── notifications (FK: account_id, template_id, patient_id, appointment_id, created_by_user_id)
  └── notification_templates (FK: account_id)
  └── notification_settings (FK: account_id)
  └── audit_events (FK: account_id, actor_user_id)
  └── documents (FK: account_id, created_by_user_id)
  └── encounter_documents (FK: encounter_id, document_id, attached_by_user_id)
  └── protocols (FK: account_id, created_by_user_id, updated_by_user_id)
  └── protocol_versions (FK: protocol_id, created_by_user_id)
  └── protocol_snapshots (FK: protocol_id, version_id)
  └── protocol_references (FK: protocol_id, version_id)
  └── appointment_type_configs (FK: account_id)
  └── professional_availability (FK: account_id, user_id)
  └── shift_handovers (FK: account_id, unit_id, author_user_id)
  └── shift_handover_items (FK: handover_id)
  └── cash (FK: account_id, unit_id)
  └── payments (FK: account_id, encounter_id, financial_account_id, receivable_id, paid_by_user_id)
  └── roles (sem FK)
  └── permissions (sem FK)
  └── user_roles (FK: user_id, role_id)
  └── role_permissions (FK: role_id, permission_id)
```

---

## 10. Helpers Recomendados (a criar)

| Helper                          | Responsabilidade                                         | Localização                         |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `createFullEncounterScenario()` | Owner → Patient → Appointment → Encounter                | `e2e/helpers/encounter-helpers.ts`  |
| `createInpatientScenario()`     | Owner → Patient → Encounter → Ward → Bed → InpatientStay | `e2e/helpers/inpatient-helpers.ts`  |
| `createBillingScenario()`       | Full encounter → Service → BillingItem                   | `e2e/helpers/billing-helpers.ts`    |
| `createExamScenario()`          | Full encounter → ExamOrder → ExamResult                  | `e2e/helpers/exam-helpers.ts`       |
| `createMedicationScenario()`    | InpatientStay → MedicationOrder → Administration         | `e2e/helpers/medication-helpers.ts` |
| `createUserWithRole()`          | User + role assignment via AccessControlService          | `e2e/helpers/auth-helpers.ts`       |
| `loginAs()`                     | Autenticar com credenciais de um role específico         | `e2e/helpers/auth-helpers.ts`       |

---

## 11. Dual RBAC — Impacto nos Testes

O CVG-HIS-V2 possui dois sistemas RBAC com role codes diferentes:

| Sistema              | Package                            | Role Codes                                                                       | Permissões   |
| -------------------- | ---------------------------------- | -------------------------------------------------------------------------------- | ------------ |
| Drizzle Seed         | `packages/rbac/`                   | `admin`, `vet`, `enfermagem`, `recepcao`                                         | 51 canônicas |
| AccessControlService | `packages/modules/access-control/` | `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor` | 30           |

**Regra para testes:**

- Testes de **autorização** (RBAC) devem usar os roles do `AccessControlService` (`admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`)
- Testes de **seed de banco** devem usar os roles Drizzle (`admin`, `vet`, `enfermagem`, `recepcao`)
- Testes de **fluxo completo** devem criar users com roles do AccessControlService e validar permissões via `assertAuthorized()`

---

## 12. Módulos sem Persistência DB — Impacto nos Testes

Quatro módulos usam Maps em memória e não injetam repositórios DB:

| Módulo       | Consequência para Testes                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| `billing`    | Dados de faturamento são perdidos a cada restart; testes devem usar service in-memory |
| `inventory`  | Dados de estoque são perdidos a cada restart; testes devem usar service in-memory     |
| `scheduling` | Dados de agendamento são perdidos a cada restart; testes devem usar service in-memory |
| `users`      | Dados de usuário são perdidos a cada restart; testes devem usar service in-memory     |

Para testes E2E com API real, esses módulos **não persistem** no banco. Isso é um risco conhecido (ver 705).

---

## 13. Convenções de Nomes para Dados de Teste

| Campo             | Padrão                               | Exemplo                |
| ----------------- | ------------------------------------ | ---------------------- |
| Owner full_name   | `Test Tutor {n}`                     | `Test Tutor 001`       |
| Owner document    | `DOC-{n}`                            | `DOC-001`              |
| Owner email       | `tutor-{n}@test.local`               | `tutor-001@test.local` |
| Owner phone       | `119{n}`                             | `11900000001`          |
| Patient name      | `{species} Test {n}`                 | `Canina Test 001`      |
| Patient species   | `Canina`, `Felina`, `Ave`, `Exótico` | `Canina`               |
| Patient breed     | `SRD` (sem raça definida)            | `SRD`                  |
| Patient sex       | `male`, `female`                     | `male`                 |
| Patient microchip | `CHIP-{n}`                           | `CHIP-001`             |
| User email        | `{role}-{n}@test.local`              | `vet-001@test.local`   |
| User password     | `Test123!` (fixo para testes)        | `Test123!`             |
| Product name      | `Produto Test {n}`                   | `Produto Test 001`     |
| Product code      | `PROD-{n}`                           | `PROD-001`             |
| Service name      | `Serviço Test {n}`                   | `Serviço Test 001`     |
| Service code      | `SRV-{n}`                            | `SRV-001`              |
| Ward name         | `Ala Test {n}`                       | `Ala Test 001`         |
| Ward code         | `WARD-{n}`                           | `WARD-001`             |
| Bed name          | `Leito {n}`                          | `Leito 001`            |
| Bed code          | `BED-{n}`                            | `BED-001`              |

---

## 14. Tabela de Enums do Domínio

Todos os enums do schema Drizzle que factories devem respeitar:

| Enum                               | Tabela                       | Valores Válidos                                                                                                            |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `encounter_status`                 | encounters                   | `open`, `closed`                                                                                                           |
| `appointment_status`               | appointments                 | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`                                               |
| `appointment_type`                 | appointments                 | `consultation`, `vaccination`, `surgery`, `exam`, `return`, `other`                                                        |
| `clinical_note_type`               | clinical_notes               | `SOAP`                                                                                                                     |
| `clinical_note_status`             | clinical_notes               | `draft`, `signed`                                                                                                          |
| `inpatient_stay_status`            | inpatient_stays              | `active`, `discharged`, `transferred`                                                                                      |
| `exam_order_status`                | exam_orders                  | `requested`, `collected`, `in_progress`, `completed`, `cancelled`                                                          |
| `exam_order_priority`              | exam_orders                  | `routine`, `urgent`, `stat`                                                                                                |
| `exam_category`                    | exam_orders                  | `laboratory`, `imaging`, `other`                                                                                           |
| `exam_result_status`               | exam_results                 | `draft`, `review_required`, `approved`, `released`, `cancelled`                                                            |
| `medication_order_status`          | medication_orders            | `active`, `stopped`                                                                                                        |
| `medication_administration_status` | medication_administrations   | `administered`, `refused`, `delayed`, `held`                                                                               |
| `medication_order_schedule_type`   | medication_order_schedules   | `interval`, `fixed_times`                                                                                                  |
| `stock_movement_type`              | stock_movements              | `purchase`, `sale`, `adjustment_in`, `adjustment_out`, `transfer`, `return`, `loss`, `initial`                             |
| `stock_lot_status`                 | stock_lots                   | `active`, `expired`, `recalled`, `depleted`                                                                                |
| `billing_item_type`                | encounter_billing_items      | `service`, `product`                                                                                                       |
| `encounter_financial_status`       | encounter_financial_accounts | `pending`, `partial`, `paid`                                                                                               |
| `encounter_receivable_status`      | encounter_receivables        | `open`, `settled`                                                                                                          |
| `alert_type`                       | alerts                       | `medication_delay`, `dose_refused_needs_review`                                                                            |
| `alert_severity`                   | alerts                       | `low`, `medium`, `high`                                                                                                    |
| `alert_status`                     | alerts                       | `active`, `acknowledged`, `resolved`                                                                                       |
| `notification_channel`             | notifications                | `sms`, `whatsapp`, `email`, `push`                                                                                         |
| `notification_status`              | notifications                | `pending`, `queued`, `sent`, `delivered`, `failed`, `cancelled`                                                            |
| `notification_type`                | notifications                | `appointment_confirmed`, `appointment_reminder`, `appointment_cancelled`, `exam_result`, `prescription`, `promo`, `custom` |
| `notification_priority`            | notifications                | `low`, `normal`, `high`, `urgent`                                                                                          |

---

## 15. Checklist de Validação de Test Data

Antes de submeter um teste que usa dados de teste:

- [ ] Dados criados via factory, não INSERT direto
- [ ] Sem `Math.random()` para IDs, emails ou documentos
- [ ] Factory retorna objeto completo com ID
- [ ] Recursos registrados para cleanup
- [ ] Enums usados são valores válidos do schema Drizzle
- [ ] FKs respeitam ordem de dependência
- [ ] Teste é determinístico (mesmo input → mesmo output)
- [ ] Cleanup funciona em ordem inversa de dependência
