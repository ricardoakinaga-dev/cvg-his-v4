# 740 — Migrations and Database Validation

**Status:** R0 — contrato
**Data:** 2026-03-31
**Faixa:** 700-790

---

## 1. Propósito

Este documento define os critérios obrigatórios de validação de migrations e integridade do banco de dados para o CVG-HIS-V2. Aplica-se a qualquer alteração no schema, deploy de produção, e execução de testes com banco real.

---

## 2. Estado Atual das Migrations

### 2.1 Track Drizzle (Produção/Dev — Único Track Válido)

| Propriedade   | Valor                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Localização   | `packages/db/migrations/`                                             |
| Arquivo ativo | `0000_vengeful_pet_avengers.sql`                                      |
| Conteúdo      | Schema completo: 34 tabelas + 28 ENUMs + FKs + CHECKs + índices       |
| Journal       | `packages/db/migrations/meta/` — 1 entrada (idx 0)                    |
| Runner        | `tsx packages/db/src/migrate.ts` (drizzle-orm/node-postgres migrator) |
| Config        | `packages/db/drizzle.config.ts` (schema: `./dist/schema/index.js`)    |

### 2.2 Track SQL Legado (Inválido para Validação)

| Propriedade   | Valor                                                         |
| ------------- | ------------------------------------------------------------- |
| Localização   | `packages/shared/database/src/migrations/`                    |
| Arquivos      | 16 (`001_initial_schema.sql` a `016_constraints_indexes.sql`) |
| Consumido por | `infra/scripts/prepare-test-db.mjs`                           |
| Status        | **NÃO USAR PARA VALIDAÇÃO**                                   |

### 2.3 Mandato: Track Drizzle Apenas

**Toda validação de migrations deve usar exclusivamente o track Drizzle.** O track SQL legado contém divergências críticas:

| Aspecto              | Drizzle (válido)                                        | SQL Legado (inválido)                                    |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Tabela de estoque    | `stock_items`, `stock_lots`, `stock_movements`          | `inventory_items` (inexistente)                          |
| Tabela de prontuário | Sem `medical_records` (usa encounters + clinical_notes) | `medical_records` (inexistente)                          |
| Link tutor-paciente  | `patients.owner_id` direto                              | `owner_patient_links` (inexistente)                      |
| Permission keys      | 51 canônicas (`owner.read`)                             | 27 hardcoded (`owners.read`)                             |
| Role names           | `admin`, `vet`, `enfermagem`, `recepcao`                | `admin`, `reception`, `veterinarian`, `nurse`, `auditor` |

---

## 3. Critérios de Validação de Migrations

### 3.1 Execução em Banco Limpo

Toda migration deve ser validada em banco limpo:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Após o reset, aplicar a mega-migration:

```bash
tsx packages/db/src/migrate.ts
```

A migration `0000_vengeful_pet_avengers.sql` deve criar todas as 34 tabelas e 28 ENUMs sem erros.

### 3.2 Execução Sequencial

O fluxo de geração e aplicação de migrations é:

```bash
# 1. Gerar migration a partir do schema Drizzle
cd packages/db && npx drizzle-kit generate

# 2. Aplicar migration
tsx packages/db/src/migrate.ts
```

Não editar manualmente o arquivo SQL gerado. Alterações ao schema devem ser feitas apenas nos arquivos TypeScript em `packages/db/src/schema/`.

### 3.3 Validação Pós-Migration

Após aplicar a migration, executar as validações das seções 4-10 deste documento.

---

## 4. Validação de Foreign Keys

Todas as FKs do schema Drizzle devem existir após a migration. Abaixo, a lista completa:

### 4.1 Tabela `users`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `unit_id`    | `units.id`    | SET NULL  |

### 4.2 Tabela `units`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.3 Tabela `owners`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `unit_id`    | `units.id`    | SET NULL  |

### 4.4 Tabela `patients`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `unit_id`    | `units.id`    | SET NULL  |
| `owner_id`   | `owners.id`   | CASCADE   |

### 4.5 Tabela `appointments`

| Coluna                 | Referencia    | ON DELETE |
| ---------------------- | ------------- | --------- |
| `account_id`           | `accounts.id` | CASCADE   |
| `patient_id`           | `patients.id` | CASCADE   |
| `owner_id`             | `owners.id`   | CASCADE   |
| `professional_user_id` | `users.id`    | RESTRICT  |

### 4.6 Tabela `encounters`

| Coluna              | Referencia    | ON DELETE |
| ------------------- | ------------- | --------- |
| `account_id`        | `accounts.id` | CASCADE   |
| `patient_id`        | `patients.id` | CASCADE   |
| `owner_id`          | `owners.id`   | CASCADE   |
| `opened_by_user_id` | `users.id`    | —         |
| `closed_by_user_id` | `users.id`    | SET NULL  |

### 4.7 Tabela `user_roles`

| Coluna    | Referencia | ON DELETE |
| --------- | ---------- | --------- |
| `user_id` | `users.id` | CASCADE   |
| `role_id` | `roles.id` | CASCADE   |

### 4.8 Tabela `role_permissions`

| Coluna          | Referencia       | ON DELETE |
| --------------- | ---------------- | --------- |
| `role_id`       | `roles.id`       | CASCADE   |
| `permission_id` | `permissions.id` | CASCADE   |

### 4.9 Tabela `products`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.10 Tabela `services`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.11 Tabela `stock_items`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `product_id` | `products.id` | RESTRICT  |

### 4.12 Tabela `stock_lots`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `product_id` | `products.id` | RESTRICT  |

### 4.13 Tabela `stock_movements`

| Coluna       | Referencia      | ON DELETE |
| ------------ | --------------- | --------- |
| `account_id` | `accounts.id`   | CASCADE   |
| `product_id` | `products.id`   | RESTRICT  |
| `lot_id`     | `stock_lots.id` | SET NULL  |

### 4.14 Tabela `wards`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.15 Tabela `beds`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |
| `ward_id`    | `wards.id`    | CASCADE   |

### 4.16 Tabela `inpatient_stays`

| Coluna                  | Referencia      | ON DELETE |
| ----------------------- | --------------- | --------- |
| `account_id`            | `accounts.id`   | CASCADE   |
| `patient_id`            | `patients.id`   | CASCADE   |
| `owner_id`              | `owners.id`     | CASCADE   |
| `encounter_id`          | `encounters.id` | SET NULL  |
| `ward_id`               | `wards.id`      | —         |
| `bed_id`                | `beds.id`       | —         |
| `admitted_by_user_id`   | `users.id`      | —         |
| `discharged_by_user_id` | `users.id`      | SET NULL  |

### 4.17 Tabela `encounter_billing_items`

| Coluna               | Referencia      | ON DELETE |
| -------------------- | --------------- | --------- |
| `account_id`         | `accounts.id`   | CASCADE   |
| `encounter_id`       | `encounters.id` | CASCADE   |
| `created_by_user_id` | `users.id`      | —         |
| `updated_by_user_id` | `users.id`      | —         |

### 4.18 Tabela `encounter_financial_accounts`

| Coluna              | Referencia      | ON DELETE |
| ------------------- | --------------- | --------- |
| `account_id`        | `accounts.id`   | CASCADE   |
| `encounter_id`      | `encounters.id` | CASCADE   |
| `closed_by_user_id` | `users.id`      | SET NULL  |

### 4.19 Tabela `encounter_receivables`

| Coluna                 | Referencia                        | ON DELETE |
| ---------------------- | --------------------------------- | --------- |
| `account_id`           | `accounts.id`                     | CASCADE   |
| `encounter_id`         | `encounters.id`                   | CASCADE   |
| `financial_account_id` | `encounter_financial_accounts.id` | CASCADE   |

### 4.20 Tabela `encounter_receivable_payments`

| Coluna                 | Referencia                        | ON DELETE |
| ---------------------- | --------------------------------- | --------- |
| `account_id`           | `accounts.id`                     | CASCADE   |
| `encounter_id`         | `encounters.id`                   | CASCADE   |
| `financial_account_id` | `encounter_financial_accounts.id` | CASCADE   |
| `receivable_id`        | `encounter_receivables.id`        | CASCADE   |
| `paid_by_user_id`      | `users.id`                        | SET NULL  |

### 4.21 Tabela `exam_orders`

| Coluna                 | Referencia      | ON DELETE |
| ---------------------- | --------------- | --------- |
| `account_id`           | `accounts.id`   | CASCADE   |
| `patient_id`           | `patients.id`   | CASCADE   |
| `encounter_id`         | `encounters.id` | SET NULL  |
| `requested_by_user_id` | `users.id`      | RESTRICT  |

### 4.22 Tabela `exam_results`

| Coluna                 | Referencia       | ON DELETE |
| ---------------------- | ---------------- | --------- |
| `account_id`           | `accounts.id`    | CASCADE   |
| `patient_id`           | `patients.id`    | CASCADE   |
| `exam_order_id`        | `exam_orders.id` | CASCADE   |
| `performed_by_user_id` | `users.id`       | SET NULL  |
| `reviewed_by_user_id`  | `users.id`       | SET NULL  |

### 4.23 Tabela `clinical_notes`

| Coluna               | Referencia      | ON DELETE |
| -------------------- | --------------- | --------- |
| `encounter_id`       | `encounters.id` | CASCADE   |
| `signed_by_user_id`  | `users.id`      | SET NULL  |
| `created_by_user_id` | `users.id`      | —         |
| `updated_by_user_id` | `users.id`      | —         |

### 4.24 Tabela `clinical_note_versions`

| Coluna               | Referencia          | ON DELETE |
| -------------------- | ------------------- | --------- |
| `note_id`            | `clinical_notes.id` | CASCADE   |
| `created_by_user_id` | `users.id`          | —         |

### 4.25 Tabela `medication_orders`

| Coluna               | Referencia           | ON DELETE |
| -------------------- | -------------------- | --------- |
| `account_id`         | `accounts.id`        | CASCADE   |
| `encounter_id`       | `encounters.id`      | SET NULL  |
| `stay_id`            | `inpatient_stays.id` | SET NULL  |
| `patient_id`         | `patients.id`        | CASCADE   |
| `created_by_user_id` | `users.id`           | —         |
| `stopped_by_user_id` | `users.id`           | SET NULL  |

### 4.26 Tabela `medication_order_schedules`

| Coluna       | Referencia             | ON DELETE |
| ------------ | ---------------------- | --------- |
| `account_id` | `accounts.id`          | CASCADE   |
| `order_id`   | `medication_orders.id` | CASCADE   |

### 4.27 Tabela `medication_administrations`

| Coluna                    | Referencia             | ON DELETE |
| ------------------------- | ---------------------- | --------- |
| `account_id`              | `accounts.id`          | CASCADE   |
| `order_id`                | `medication_orders.id` | CASCADE   |
| `stay_id`                 | `inpatient_stays.id`   | SET NULL  |
| `encounter_id`            | `encounters.id`        | SET NULL  |
| `administered_by_user_id` | `users.id`             | —         |

### 4.28 Tabela `alerts`

| Coluna       | Referencia             | ON DELETE |
| ------------ | ---------------------- | --------- |
| `account_id` | `accounts.id`          | CASCADE   |
| `stay_id`    | `inpatient_stays.id`   | CASCADE   |
| `order_id`   | `medication_orders.id` | CASCADE   |

### 4.29 Tabela `documents`

| Coluna               | Referencia    | ON DELETE |
| -------------------- | ------------- | --------- |
| `account_id`         | `accounts.id` | CASCADE   |
| `created_by_user_id` | `users.id`    | —         |

### 4.30 Tabela `encounter_documents`

| Coluna                | Referencia      | ON DELETE |
| --------------------- | --------------- | --------- |
| `encounter_id`        | `encounters.id` | CASCADE   |
| `document_id`         | `documents.id`  | CASCADE   |
| `attached_by_user_id` | `users.id`      | —         |

### 4.31 Tabela `protocols`

| Coluna               | Referencia    | ON DELETE |
| -------------------- | ------------- | --------- |
| `account_id`         | `accounts.id` | CASCADE   |
| `created_by_user_id` | `users.id`    | —         |
| `updated_by_user_id` | `users.id`    | SET NULL  |

### 4.32 Tabela `protocol_versions`

| Coluna                 | Referencia     | ON DELETE |
| ---------------------- | -------------- | --------- |
| `account_id`           | `accounts.id`  | CASCADE   |
| `protocol_id`          | `protocols.id` | CASCADE   |
| `published_by_user_id` | `users.id`     | SET NULL  |
| `created_by_user_id`   | `users.id`     | —         |
| `updated_by_user_id`   | `users.id`     | SET NULL  |

### 4.33 Tabela `protocol_snapshots`

| Coluna        | Referencia             | ON DELETE |
| ------------- | ---------------------- | --------- |
| `account_id`  | `accounts.id`          | CASCADE   |
| `protocol_id` | `protocols.id`         | CASCADE   |
| `version_id`  | `protocol_versions.id` | CASCADE   |

### 4.34 Tabela `protocol_references`

| Coluna               | Referencia     | ON DELETE |
| -------------------- | -------------- | --------- |
| `account_id`         | `accounts.id`  | CASCADE   |
| `protocol_id`        | `protocols.id` | CASCADE   |
| `created_by_user_id` | `users.id`     | —         |

### 4.35 Tabela `audit_events`

| Coluna          | Referencia    | ON DELETE |
| --------------- | ------------- | --------- |
| `account_id`    | `accounts.id` | SET NULL  |
| `actor_user_id` | `users.id`    | SET NULL  |

### 4.36 Tabela `notifications`

| Coluna           | Referencia                  | ON DELETE |
| ---------------- | --------------------------- | --------- |
| `account_id`     | `accounts.id`               | CASCADE   |
| `template_id`    | `notification_templates.id` | SET NULL  |
| `patient_id`     | `patients.id`               | SET NULL  |
| `appointment_id` | `appointments.id`           | SET NULL  |

### 4.37 Tabela `notification_templates`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.38 Tabela `notification_settings`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.39 Tabela `payments`

| Coluna                 | Referencia                        | ON DELETE |
| ---------------------- | --------------------------------- | --------- |
| `account_id`           | `accounts.id`                     | CASCADE   |
| `financial_account_id` | `encounter_financial_accounts.id` | RESTRICT  |

### 4.40 Tabela `cash_registers`

| Coluna              | Referencia    | ON DELETE |
| ------------------- | ------------- | --------- |
| `account_id`        | `accounts.id` | CASCADE   |
| `opened_by_user_id` | `users.id`    | —         |
| `closed_by_user_id` | `users.id`    | —         |

### 4.41 Tabela `cash_movements`

| Coluna               | Referencia          | ON DELETE |
| -------------------- | ------------------- | --------- |
| `cash_register_id`   | `cash_registers.id` | CASCADE   |
| `account_id`         | `accounts.id`       | CASCADE   |
| `created_by_user_id` | `users.id`          | —         |

### 4.42 Tabela `professional_availability`

| Coluna                 | Referencia    | ON DELETE |
| ---------------------- | ------------- | --------- |
| `account_id`           | `accounts.id` | CASCADE   |
| `professional_user_id` | `users.id`    | CASCADE   |

### 4.43 Tabela `appointment_type_configs`

| Coluna       | Referencia    | ON DELETE |
| ------------ | ------------- | --------- |
| `account_id` | `accounts.id` | CASCADE   |

### 4.44 Tabela `shift_handovers`

| Coluna                 | Referencia     | ON DELETE |
| ---------------------- | -------------- | --------- |
| `account_id`           | `accounts.id`  | CASCADE   |
| `ward_id`              | `wards.id`     | —         |
| `published_by_user_id` | `users.id`     | SET NULL  |
| `document_id`          | `documents.id` | SET NULL  |

### 4.45 Tabela `shift_handover_items`

| Coluna        | Referencia           | ON DELETE |
| ------------- | -------------------- | --------- |
| `account_id`  | `accounts.id`        | CASCADE   |
| `handover_id` | `shift_handovers.id` | CASCADE   |
| `stay_id`     | `inpatient_stays.id` | CASCADE   |

---

## 5. Validação de Índices Críticos

### 5.1 Unique Indexes

| Índice                                          | Tabela                       | Colunas                                         | WHERE                  |
| ----------------------------------------------- | ---------------------------- | ----------------------------------------------- | ---------------------- |
| `accounts_slug_unique`                          | accounts                     | `slug`                                          | —                      |
| `units_account_code_unique`                     | units                        | `account_id, code`                              | —                      |
| `users_account_email_unique`                    | users                        | `account_id, email`                             | —                      |
| `roles_name_unique`                             | roles                        | `name`                                          | —                      |
| `permissions_key_unique`                        | permissions                  | `key`                                           | —                      |
| `uq_products_account_code`                      | products                     | `account_id, code`                              | `code IS NOT NULL`     |
| `uq_services_account_code`                      | services                     | `account_id, code`                              | `code IS NOT NULL`     |
| `documents_storage_key_unique`                  | documents                    | `storage_key`                                   | —                      |
| `uidx_efa_encounter`                            | encounter_financial_accounts | `encounter_id`                                  | —                      |
| `uidx_er_financial_installment`                 | encounter_receivables        | `financial_account_id, installment_number`      | —                      |
| `inpatient_stays_active_bed_unique`             | inpatient_stays              | `bed_id`                                        | `status = 'active'`    |
| `clinical_note_versions_note_version_unique`    | clinical_note_versions       | `note_id, version_number`                       | —                      |
| `encounter_documents_encounter_document_unique` | encounter_documents          | `encounter_id, document_id`                     | —                      |
| `uq_protocols_account_slug`                     | protocols                    | `account_id, slug`                              | —                      |
| `uq_protocol_versions_protocol_version_number`  | protocol_versions            | `protocol_id, version_number`                   | —                      |
| `uq_prof_avail_account_prof_day`                | professional_availability    | `account_id, professional_user_id, day_of_week` | —                      |
| `uq_appt_type_config_account_code`              | appointment_type_configs     | `account_id, code`                              | —                      |
| `uq_alerts_order_slot_type_active`              | alerts                       | `order_id, scheduled_for, type`                 | `status != 'resolved'` |
| `uq_medication_administrations_order_slot`      | medication_administrations   | `order_id, scheduled_for`                       | —                      |
| `idx_notif_templates_unique`                    | notification_templates       | `account_id, type, channel`                     | —                      |
| `idx_notif_settings_account`                    | notification_settings        | `account_id`                                    | —                      |

### 5.2 Partial Indexes

| Índice                              | Tabela          | Colunas                         | WHERE                  |
| ----------------------------------- | --------------- | ------------------------------- | ---------------------- |
| `uq_products_account_code`          | products        | `account_id, code`              | `code IS NOT NULL`     |
| `uq_services_account_code`          | services        | `account_id, code`              | `code IS NOT NULL`     |
| `inpatient_stays_active_bed_unique` | inpatient_stays | `bed_id`                        | `status = 'active'`    |
| `uq_alerts_order_slot_type_active`  | alerts          | `order_id, scheduled_for, type` | `status != 'resolved'` |

---

## 6. Validação de Unicidade

### 6.1 Campos com Restrição de Unicidade

| Campo                                             | Tabela                       | Escopo                               |
| ------------------------------------------------- | ---------------------------- | ------------------------------------ |
| `slug`                                            | accounts                     | Global                               |
| `account_id + code`                               | units                        | Por account                          |
| `account_id + email`                              | users                        | Por account                          |
| `name`                                            | roles                        | Global                               |
| `key`                                             | permissions                  | Global                               |
| `account_id + code` (parcial)                     | products                     | Por account, quando code IS NOT NULL |
| `account_id + code` (parcial)                     | services                     | Por account, quando code IS NOT NULL |
| `storage_key`                                     | documents                    | Global                               |
| `encounter_id`                                    | encounter_financial_accounts | Global (1:1)                         |
| `financial_account_id + installment_number`       | encounter_receivables        | Por financial account                |
| `bed_id` (parcial)                                | inpatient_stays              | Quando status = 'active'             |
| `note_id + version_number`                        | clinical_note_versions       | Por nota                             |
| `encounter_id + document_id`                      | encounter_documents          | Por encounter                        |
| `account_id + slug`                               | protocols                    | Por account                          |
| `protocol_id + version_number`                    | protocol_versions            | Por protocolo                        |
| `account_id + professional_user_id + day_of_week` | professional_availability    | Por account/profissional/dia         |
| `account_id + code`                               | appointment_type_configs     | Por account                          |
| `order_id + scheduled_for`                        | medication_administrations   | Por ordem/horário                    |
| `order_id + scheduled_for + type` (parcial)       | alerts                       | Quando status != 'resolved'          |
| `account_id + type + channel`                     | notification_templates       | Por account                          |
| `account_id`                                      | notification_settings        | Global (1:1)                         |

---

## 7. Validação de Constraints CHECK

| Constraint                                       | Tabela                     | Expressão                                                                                                                                                                                 |
| ------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocols_status_chk`                           | protocols                  | `status IN ('draft', 'published')`                                                                                                                                                        |
| `protocol_versions_status_chk`                   | protocol_versions          | `status IN ('draft', 'publishing', 'published', 'failed')`                                                                                                                                |
| `protocol_versions_version_number_positive_chk`  | protocol_versions          | `version_number > 0`                                                                                                                                                                      |
| `protocol_references_ref_type_chk`               | protocol_references        | `ref_type IN ('qdrant_chunk', 'url', 'pdf', 'doi', 'book')`                                                                                                                               |
| `medication_administrations_reason_required_chk` | medication_administrations | Regra complexa: `administered` requer `effective_at` e sem `reason`; `delayed` requer `reason` e `delayed_until`; `refused`/`held` requer `reason` sem `delayed_until` nem `effective_at` |

---

## 8. Validação de Enums

Todos os 28 ENUMs devem existir após a migration:

| ENUM                               | Tabela(s)                    | Valores                                                                                                                    |
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
| `payment_method`                   | payments                     | `cash`, `credit_card`, `debit_card`, `pix`, `bank_transfer`, `check`, `insurance`, `other`                                 |
| `payment_status`                   | payments                     | `pending`, `completed`, `refunded`, `cancelled`                                                                            |
| `cash_register_status`             | cash_registers               | `open`, `closed`                                                                                                           |
| `cash_movement_type`               | cash_movements               | `opening`, `closing`, `payment`, `supply`, `withdrawal`, `adjustment`                                                      |
| `alert_type`                       | alerts                       | `medication_delay`, `dose_refused_needs_review`                                                                            |
| `alert_severity`                   | alerts                       | `low`, `medium`, `high`                                                                                                    |
| `alert_status`                     | alerts                       | `active`, `acknowledged`, `resolved`                                                                                       |
| `shift_handover_status`            | shift_handovers              | `draft`, `published`                                                                                                       |
| `shift_period`                     | shift_handovers              | `day`, `night`, `custom`                                                                                                   |
| `shift_handover_build_status`      | shift_handovers              | `pending`, `building`, `ready`, `failed`                                                                                   |
| `notification_channel`             | notifications                | `sms`, `whatsapp`, `email`, `push`                                                                                         |
| `notification_status`              | notifications                | `pending`, `queued`, `sent`, `delivered`, `failed`, `cancelled`                                                            |
| `notification_type`                | notifications                | `appointment_confirmed`, `appointment_reminder`, `appointment_cancelled`, `exam_result`, `prescription`, `promo`, `custom` |
| `notification_priority`            | notifications                | `low`, `normal`, `high`, `urgent`                                                                                          |

> **Nota:** A contagem de 28 ENUMs refere-se ao estado da migration `0000_vengeful_pet_avengers.sql`. A lista acima reflete o schema atual completo, que pode ter mais ENUMs. Validar contra o schema TypeScript em `packages/db/src/schema/`.

---

## 9. Validação de Compatibilidade entre Domínio e Banco

### 9.1 Encounters

| Aspecto             | Domínio (EncountersService)              | Banco (encounters)                                                       | Compatível? |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | ----------- |
| Status              | `open`, `closed`                         | ENUM `encounter_status`: `open`, `closed`                                | Sim         |
| Campos obrigatórios | `patientId`, `ownerId`, `openedByUserId` | `patient_id NOT NULL`, `owner_id NOT NULL`, `opened_by_user_id NOT NULL` | Sim         |
| FK patient          | Validada pelo service                    | FK `patient_id → patients.id`                                            | Sim         |
| FK owner            | Validada pelo service                    | FK `owner_id → owners.id`                                                | Sim         |

### 9.2 Appointments

| Aspecto         | Domínio (SchedulingService)                                                  | Banco (appointments)                                    | Compatível? |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| Status          | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show` | ENUM `appointment_status`                               | Sim         |
| Type            | `consultation`, `vaccination`, `surgery`, `exam`, `return`, `other`          | ENUM `appointment_type`                                 | Sim         |
| FK professional | `professionalUserId`                                                         | FK `professional_user_id → users.id` ON DELETE RESTRICT | Sim         |

### 9.3 Inpatient Stays

| Aspecto        | Domínio (InpatientService)            | Banco (inpatient_stays)                                       | Compatível? |
| -------------- | ------------------------------------- | ------------------------------------------------------------- | ----------- |
| Status         | `active`, `discharged`, `transferred` | ENUM `inpatient_stay_status`                                  | Sim         |
| Partial unique | 1 paciente por leito ativo            | `inpatient_stays_active_bed_unique` WHERE `status = 'active'` | Sim         |

### 9.4 Clinical Notes

| Aspecto    | Domínio (MedicalRecordsService) | Banco (clinical_notes)                         | Compatível? |
| ---------- | ------------------------------- | ---------------------------------------------- | ----------- |
| Type       | `SOAP`                          | ENUM `clinical_note_type`: `SOAP`              | Sim         |
| Status     | `draft`, `signed`               | ENUM `clinical_note_status`: `draft`, `signed` | Sim         |
| Versioning | Incremental                     | `clinical_note_versions` com `version_number`  | Sim         |

### 9.5 Medication Orders

| Aspecto        | Domínio (PrescriptionExecutionsService)      | Banco (medication_orders)                        | Compatível? |
| -------------- | -------------------------------------------- | ------------------------------------------------ | ----------- |
| Status         | `active`, `stopped`                          | ENUM `medication_order_status`                   | Sim         |
| Administration | `administered`, `refused`, `delayed`, `held` | ENUM `medication_administration_status`          | Sim         |
| CHECK reason   | Regra de negócio                             | `medication_administrations_reason_required_chk` | Sim         |

### 9.6 Exam Orders

| Aspecto  | Domínio (DiagnosticsService)                                      | Banco (exam_orders)        | Compatível? |
| -------- | ----------------------------------------------------------------- | -------------------------- | ----------- |
| Status   | `requested`, `collected`, `in_progress`, `completed`, `cancelled` | ENUM `exam_order_status`   | Sim         |
| Category | `laboratory`, `imaging`, `other`                                  | ENUM `exam_category`       | Sim         |
| Priority | `routine`, `urgent`, `stat`                                       | ENUM `exam_order_priority` | Sim         |

### 9.7 Protocols

| Aspecto         | Domínio                                      | Banco                                                 | Compatível? |
| --------------- | -------------------------------------------- | ----------------------------------------------------- | ----------- |
| Protocol status | `draft`, `published`                         | CHECK `protocols_status_chk`                          | Sim         |
| Version status  | `draft`, `publishing`, `published`, `failed` | CHECK `protocol_versions_status_chk`                  | Sim         |
| Version number  | > 0                                          | CHECK `protocol_versions_version_number_positive_chk` | Sim         |
| Ref type        | `qdrant_chunk`, `url`, `pdf`, `doi`, `book`  | CHECK `protocol_references_ref_type_chk`              | Sim         |

---

## 10. Seeds Mínimos Obrigatórios

Após aplicar a migration, o seed mínimo obrigatório (`packages/db/src/seed.ts`) deve criar:

| Entidade              | Tabela           | Quantidade Mínima                                         |
| --------------------- | ---------------- | --------------------------------------------------------- |
| Account               | accounts         | 1 (`slug: 'default'`)                                     |
| Unit                  | units            | 1 (`code: 'hq'`, FK para account)                         |
| Permissions           | permissions      | 51 (todas as canônicas de `@cvg-his/rbac`)                |
| Roles                 | roles            | 4 (`admin`, `vet`, `enfermagem`, `recepcao`)              |
| Role-Permissions      | role_permissions | Variável (admin = 51, demais conforme `ROLE_PERMISSIONS`) |
| Admin User            | users            | 1 (condicional via `ADMIN_EMAIL`/`ADMIN_PASSWORD`)        |
| Admin Role Assignment | user_roles       | 1 (admin user → admin role)                               |

---

## 11. Critérios de Falha Crítica

Uma migration é considerada **falha crítica** se qualquer um dos seguintes cenários ocorrer:

| Critério             | Descrição                                                                         | Severidade |
| -------------------- | --------------------------------------------------------------------------------- | ---------- |
| Migration fails      | A migration `0000_vengeful_pet_avengers.sql` não executa sem erros em banco limpo | CRÍTICA    |
| FK missing           | Qualquer foreign key definida no schema Drizzle não existe no banco               | CRÍTICA    |
| ENUM mismatch        | Qualquer ENUM do schema Drizzle não existe ou tem valores diferentes              | CRÍTICA    |
| Unique index missing | Qualquer unique index definido no schema Drizzle não existe                       | CRÍTICA    |
| CHECK missing        | Qualquer CHECK constraint definida no schema Drizzle não existe                   | CRÍTICA    |
| NOT NULL missing     | Qualquer coluna NOT NULL no schema Drizzle é nullable no banco                    | CRÍTICA    |
| Table missing        | Qualquer tabela do schema Drizzle não existe no banco                             | CRÍTICA    |
| Column missing       | Qualquer coluna do schema Drizzle não existe na tabela correspondente             | CRÍTICA    |
| Seed fails           | O seed Drizzle não executa após a migration                                       | CRÍTICA    |
| Dual track used      | Validação usa o track SQL legado em vez do track Drizzle                          | CRÍTICA    |

---

## 12. Cenários que Devem Falhar (Testes de Validação)

Os seguintes cenários devem ser testados e **devem falhar** por violação de constraint:

### 12.1 FK Violations

| Cenário                                                           | Tabela                       | Constraint Violada                   | Erro Esperado                     |
| ----------------------------------------------------------------- | ---------------------------- | ------------------------------------ | --------------------------------- |
| Insert encounter com `patient_id` inexistente                     | encounters                   | FK `patient_id → patients.id`        | `violates foreign key constraint` |
| Insert encounter com `owner_id` inexistente                       | encounters                   | FK `owner_id → owners.id`            | `violates foreign key constraint` |
| Insert encounter com `account_id` inexistente                     | encounters                   | FK `account_id → accounts.id`        | `violates foreign key constraint` |
| Insert encounter com `opened_by_user_id` inexistente              | encounters                   | FK `opened_by_user_id → users.id`    | `violates foreign key constraint` |
| Insert patient com `owner_id` inexistente                         | patients                     | FK `owner_id → owners.id`            | `violates foreign key constraint` |
| Insert appointment com `professional_user_id` inexistente         | appointments                 | FK `professional_user_id → users.id` | `violates foreign key constraint` |
| Insert stock_item com `product_id` inexistente                    | stock_items                  | FK `product_id → products.id`        | `violates foreign key constraint` |
| Insert bed com `ward_id` inexistente                              | beds                         | FK `ward_id → wards.id`              | `violates foreign key constraint` |
| Insert inpatient_stay com `bed_id` inexistente                    | inpatient_stays              | FK `bed_id → beds.id`                | `violates foreign key constraint` |
| Insert clinical_note com `encounter_id` inexistente               | clinical_notes               | FK `encounter_id → encounters.id`    | `violates foreign key constraint` |
| Insert exam_order com `patient_id` inexistente                    | exam_orders                  | FK `patient_id → patients.id`        | `violates foreign key constraint` |
| Insert medication_order com `patient_id` inexistente              | medication_orders            | FK `patient_id → patients.id`        | `violates foreign key constraint` |
| Insert encounter_billing_item com `encounter_id` inexistente      | encounter_billing_items      | FK `encounter_id → encounters.id`    | `violates foreign key constraint` |
| Insert encounter_financial_account com `encounter_id` inexistente | encounter_financial_accounts | FK `encounter_id → encounters.id`    | `violates foreign key constraint` |

### 12.2 NOT NULL Violations

| Cenário                           | Tabela       | Coluna                   | Erro Esperado                                                       |
| --------------------------------- | ------------ | ------------------------ | ------------------------------------------------------------------- |
| Insert user sem `email`           | users        | `email NOT NULL`         | `null value in column "email" violates not-null constraint`         |
| Insert user sem `password_hash`   | users        | `password_hash NOT NULL` | `null value in column "password_hash" violates not-null constraint` |
| Insert user sem `full_name`       | users        | `full_name NOT NULL`     | `null value in column "full_name" violates not-null constraint`     |
| Insert user sem `account_id`      | users        | `account_id NOT NULL`    | `null value in column "account_id" violates not-null constraint`    |
| Insert owner sem `full_name`      | owners       | `full_name NOT NULL`     | `null value in column "full_name" violates not-null constraint`     |
| Insert patient sem `name`         | patients     | `name NOT NULL`          | `null value in column "name" violates not-null constraint`          |
| Insert patient sem `species`      | patients     | `species NOT NULL`       | `null value in column "species" violates not-null constraint`       |
| Insert patient sem `owner_id`     | patients     | `owner_id NOT NULL`      | `null value in column "owner_id" violates not-null constraint`      |
| Insert encounter sem `patient_id` | encounters   | `patient_id NOT NULL`    | `null value in column "patient_id" violates not-null constraint`    |
| Insert appointment sem `start_at` | appointments | `start_at NOT NULL`      | `null value in column "start_at" violates not-null constraint`      |
| Insert appointment sem `end_at`   | appointments | `end_at NOT NULL`        | `null value in column "end_at" violates not-null constraint`        |
| Insert product sem `name`         | products     | `name NOT NULL`          | `null value in column "name" violates not-null constraint`          |
| Insert service sem `name`         | services     | `name NOT NULL`          | `null value in column "name" violates not-null constraint`          |
| Insert ward sem `name`            | wards        | `name NOT NULL`          | `null value in column "name" violates not-null constraint`          |
| Insert bed sem `name`             | beds         | `name NOT NULL`          | `null value in column "name" violates not-null constraint`          |

### 12.3 Unique Constraint Violations

| Cenário                                                                                          | Tabela                       | Constraint                                     | Erro Esperado                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Insert account com `slug` duplicado                                                              | accounts                     | `accounts_slug_unique`                         | `duplicate key value violates unique constraint` |
| Insert unit com `account_id + code` duplicado                                                    | units                        | `units_account_code_unique`                    | `duplicate key value violates unique constraint` |
| Insert user com `account_id + email` duplicado                                                   | users                        | `users_account_email_unique`                   | `duplicate key value violates unique constraint` |
| Insert role com `name` duplicado                                                                 | roles                        | `roles_name_unique`                            | `duplicate key value violates unique constraint` |
| Insert permission com `key` duplicado                                                            | permissions                  | `permissions_key_unique`                       | `duplicate key value violates unique constraint` |
| Insert product com `account_id + code` duplicado (code não null)                                 | products                     | `uq_products_account_code`                     | `duplicate key value violates unique constraint` |
| Insert service com `account_id + code` duplicado (code não null)                                 | services                     | `uq_services_account_code`                     | `duplicate key value violates unique constraint` |
| Insert document com `storage_key` duplicado                                                      | documents                    | `documents_storage_key_unique`                 | `duplicate key value violates unique constraint` |
| Insert encounter_financial_account com `encounter_id` duplicado                                  | encounter_financial_accounts | `uidx_efa_encounter`                           | `duplicate key value violates unique constraint` |
| Insert inpatient_stay com `bed_id` já ativo                                                      | inpatient_stays              | `inpatient_stays_active_bed_unique`            | `duplicate key value violates unique constraint` |
| Insert protocol com `account_id + slug` duplicado                                                | protocols                    | `uq_protocols_account_slug`                    | `duplicate key value violates unique constraint` |
| Insert protocol_version com `protocol_id + version_number` duplicado                             | protocol_versions            | `uq_protocol_versions_protocol_version_number` | `duplicate key value violates unique constraint` |
| Insert professional_availability com `account_id + professional_user_id + day_of_week` duplicado | professional_availability    | `uq_prof_avail_account_prof_day`               | `duplicate key value violates unique constraint` |
| Insert medication_administration com `order_id + scheduled_for` duplicado                        | medication_administrations   | `uq_medication_administrations_order_slot`     | `duplicate key value violates unique constraint` |

### 12.4 ENUM Violations

| Cenário                                      | Tabela            | Coluna     | Valor Inválido | Erro Esperado                                          |
| -------------------------------------------- | ----------------- | ---------- | -------------- | ------------------------------------------------------ |
| Insert encounter com status `in_progress`    | encounters        | `status`   | `in_progress`  | `invalid input value for enum encounter_status`        |
| Insert appointment com status `unknown`      | appointments      | `status`   | `unknown`      | `invalid input value for enum appointment_status`      |
| Insert clinical_note com type `progress`     | clinical_notes    | `type`     | `progress`     | `invalid input value for enum clinical_note_type`      |
| Insert clinical_note com status `published`  | clinical_notes    | `status`   | `published`    | `invalid input value for enum clinical_note_status`    |
| Insert inpatient_stay com status `pending`   | inpatient_stays   | `status`   | `pending`      | `invalid input value for enum inpatient_stay_status`   |
| Insert exam_order com category `pathology`   | exam_orders       | `category` | `pathology`    | `invalid input value for enum exam_category`           |
| Insert medication_order com status `pending` | medication_orders | `status`   | `pending`      | `invalid input value for enum medication_order_status` |
| Insert protocol com status `archived`        | protocols         | `status`   | `archived`     | CHECK `protocols_status_chk` violation                 |

### 12.5 CHECK Constraint Violations

| Cenário                                                            | Tabela                     | Constraint                                       | Erro Esperado                                    |
| ------------------------------------------------------------------ | -------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Insert protocol_version com `version_number = 0`                   | protocol_versions          | `protocol_versions_version_number_positive_chk`  | `new row for relation violates check constraint` |
| Insert protocol_reference com `ref_type = 'invalid'`               | protocol_references        | `protocol_references_ref_type_chk`               | `new row for relation violates check constraint` |
| Insert medication_administration `administered` sem `effective_at` | medication_administrations | `medication_administrations_reason_required_chk` | `new row for relation violates check constraint` |
| Insert medication_administration `delayed` sem `reason`            | medication_administrations | `medication_administrations_reason_required_chk` | `new row for relation violates check constraint` |

### 12.6 ON DELETE RESTRICT Violations

| Cenário                                           | Tabela          | Constraint                                                                  | Erro Esperado                                                                              |
| ------------------------------------------------- | --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Delete professional_user que tem appointment      | appointments    | `professional_user_id → users.id` ON DELETE RESTRICT                        | `update or delete on table "users" violates foreign key constraint`                        |
| Delete product que tem stock_item                 | stock_items     | `product_id → products.id` ON DELETE RESTRICT                               | `update or delete on table "products" violates foreign key constraint`                     |
| Delete product que tem stock_lot                  | stock_lots      | `product_id → products.id` ON DELETE RESTRICT                               | `update or delete on table "products" violates foreign key constraint`                     |
| Delete product que tem stock_movement             | stock_movements | `product_id → products.id` ON DELETE RESTRICT                               | `update or delete on table "products" violates foreign key constraint`                     |
| Delete exam_order_requested_by que tem exam_order | exam_orders     | `requested_by_user_id → users.id` ON DELETE RESTRICT                        | `update or delete on table "users" violates foreign key constraint`                        |
| Delete financial_account que tem payment          | payments        | `financial_account_id → encounter_financial_accounts.id` ON DELETE RESTRICT | `update or delete on table "encounter_financial_accounts" violates foreign key constraint` |

---

## 13. Checklist de Validação de Migration

Antes de aprovar uma alteração de migration:

- [ ] Executada em banco limpo (DROP SCHEMA + CREATE SCHEMA)
- [ ] Todas as 34 tabelas criadas sem erros
- [ ] Todos os ENUMs criados com valores corretos
- [ ] Todas as FKs existem com ON DELETE correto
- [ ] Todos os unique indexes existem
- [ ] Todos os partial indexes existem com WHERE clause correta
- [ ] Todas as CHECK constraints existem com expressão correta
- [ ] Todas as colunas NOT NULL são realmente NOT NULL
- [ ] Seed Drizzle executa sem erros
- [ ] Cenários de FK violation falham conforme esperado
- [ ] Cenários de NOT NULL violation falham conforme esperado
- [ ] Cenários de unique violation falham conforme esperado
- [ ] Cenários de ENUM violation falham conforme esperado
- [ ] Cenários de CHECK violation falham conforme esperado
- [ ] Cenários de ON DELETE RESTRICT falham conforme esperado
- [ ] Schema TypeScript (`packages/db/src/schema/`) está em sync com o SQL gerado
- [ ] Track SQL legado **não** foi usado para validação

---

## 14. Tabela Completa de 34 Tabelas

| #   | Tabela                          | Schema File                     | FK Count | Has ENUMs | Has CHECKs |
| --- | ------------------------------- | ------------------------------- | -------- | --------- | ---------- |
| 1   | `accounts`                      | accounts.ts                     | 0        | Não       | Não        |
| 2   | `units`                         | units.ts                        | 1        | Não       | Não        |
| 3   | `users`                         | users.ts                        | 2        | Não       | Não        |
| 4   | `roles`                         | roles.ts                        | 0        | Não       | Não        |
| 5   | `permissions`                   | permissions.ts                  | 0        | Não       | Não        |
| 6   | `user_roles`                    | user_roles.ts                   | 2        | Não       | Não        |
| 7   | `role_permissions`              | role_permissions.ts             | 2        | Não       | Não        |
| 8   | `owners`                        | owners.ts                       | 2        | Não       | Não        |
| 9   | `patients`                      | patients.ts                     | 3        | Não       | Não        |
| 10  | `appointments`                  | appointments.ts                 | 4        | Sim (2)   | Não        |
| 11  | `encounters`                    | encounters.ts                   | 5        | Sim (1)   | Não        |
| 12  | `encounter_billing_items`       | encounter_billing_items.ts      | 4        | Sim (1)   | Não        |
| 13  | `encounter_financial_accounts`  | encounter_financial_accounts.ts | 3        | Sim (1)   | Não        |
| 14  | `encounter_receivables`         | encounter_financial_accounts.ts | 3        | Sim (1)   | Não        |
| 15  | `encounter_receivable_payments` | encounter_financial_accounts.ts | 5        | Não       | Não        |
| 16  | `encounter_documents`           | encounter_documents.ts          | 3        | Não       | Não        |
| 17  | `clinical_notes`                | clinical_notes.ts               | 4        | Sim (2)   | Não        |
| 18  | `clinical_note_versions`        | clinical_note_versions.ts       | 2        | Não       | Não        |
| 19  | `exam_orders`                   | exam_orders.ts                  | 4        | Sim (3)   | Não        |
| 20  | `exam_results`                  | exam_results.ts                 | 5        | Sim (1)   | Não        |
| 21  | `inpatient_stays`               | inpatient_stays.ts              | 8        | Sim (1)   | Não        |
| 22  | `medication_orders`             | medication_orders.ts            | 6        | Sim (1)   | Não        |
| 23  | `medication_order_schedules`    | medication_order_schedules.ts   | 2        | Sim (1)   | Não        |
| 24  | `medication_administrations`    | medication_administrations.ts   | 5        | Sim (1)   | Sim (1)    |
| 25  | `alerts`                        | alerts.ts                       | 3        | Sim (3)   | Não        |
| 26  | `products`                      | products.ts                     | 1        | Não       | Não        |
| 27  | `services`                      | services.ts                     | 1        | Não       | Não        |
| 28  | `stock_items`                   | stock.ts                        | 2        | Não       | Não        |
| 29  | `stock_lots`                    | stock.ts                        | 2        | Sim (1)   | Não        |
| 30  | `stock_movements`               | stock.ts                        | 3        | Sim (1)   | Não        |
| 31  | `wards`                         | wards.ts                        | 1        | Não       | Não        |
| 32  | `beds`                          | beds.ts                         | 2        | Não       | Não        |
| 33  | `documents`                     | documents.ts                    | 2        | Não       | Não        |
| 34  | `audit_events`                  | audit_events.ts                 | 2        | Não       | Não        |
| 35  | `protocols`                     | protocols.ts                    | 3        | Não       | Sim (1)    |
| 36  | `protocol_versions`             | protocol_versions.ts            | 5        | Não       | Sim (2)    |
| 37  | `protocol_snapshots`            | protocol_snapshots.ts           | 3        | Não       | Não        |
| 38  | `protocol_references`           | protocol_references.ts          | 3        | Não       | Sim (1)    |
| 39  | `notification_templates`        | notifications.ts                | 1        | Sim (3)   | Não        |
| 40  | `notifications`                 | notifications.ts                | 4        | Sim (4)   | Não        |
| 41  | `notification_settings`         | notifications.ts                | 1        | Não       | Não        |
| 42  | `payments`                      | payments.ts                     | 2        | Sim (2)   | Não        |
| 43  | `cash_registers`                | cash.ts                         | 3        | Sim (1)   | Não        |
| 44  | `cash_movements`                | cash.ts                         | 3        | Sim (1)   | Não        |
| 45  | `professional_availability`     | professional_availability.ts    | 2        | Não       | Não        |
| 46  | `appointment_type_configs`      | appointment_type_configs.ts     | 1        | Não       | Não        |
| 47  | `shift_handovers`               | shift_handovers.ts              | 4        | Sim (3)   | Não        |
| 48  | `shift_handover_items`          | shift_handover_items.ts         | 3        | Não       | Não        |

> **Nota:** A contagem de 34 tabelas refere-se ao estado da migration `0000_vengeful_pet_avengers.sql`. O schema Drizzle atual tem mais tabelas (48 listadas acima). A migration pode estar desatualizada em relação ao schema TypeScript. Isso é um risco conhecido — validar que o SQL gerado reflete o schema atual antes de qualquer deploy.
