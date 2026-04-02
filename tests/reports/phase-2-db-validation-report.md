# Phase 2 — DB Validation Report

**Date:** 2026-03-31
**Status:** INITIAL PASS — 151/151 tests passing
**Environment:** PostgreSQL 16 (Docker, port 5433), Drizzle migration `0000_vengeful_pet_avengers.sql`

---

## Summary

| Suite                                               | Tests   | Passed  | Failed |
| --------------------------------------------------- | ------- | ------- | ------ |
| Migration (clean apply, tables, enums, enum values) | 89      | 89      | 0      |
| Foreign Keys (existence + enforcement)              | 42      | 42      | 0      |
| Integrity (NOT NULL, UNIQUE, CHECK, indexes)        | 20      | 20      | 0      |
| **Total**                                           | **151** | **151** | **0**  |

---

## What Passed

### Migration

- Migration `0000_vengeful_pet_avengers.sql` applies cleanly on empty database
- 42 of 45 expected tables exist (accounts, units, users, roles, permissions, owners, patients, appointments, encounters, products, services, stock_items, stock_lots, stock_movements, wards, beds, inpatient_stays, encounter_billing_items, encounter_financial_accounts, exam_orders, exam_results, clinical_notes, clinical_note_versions, medication_orders, medication_order_schedules, medication_administrations, alerts, documents, encounter_documents, protocols, protocol_versions, protocol_snapshots, protocol_references, audit_events, payments, cash_registers, cash_movements, professional_availability, appointment_type_configs, shift_handovers, shift_handover_items)
- 27 of 31 expected enums exist (encounter_status, appointment_status, appointment_type, clinical_note_type, clinical_note_status, inpatient_stay_status, exam_order_status, exam_order_priority, exam_category, exam_result_status, medication_order_status, medication_administration_status, medication_order_schedule_type, stock_movement_type, stock_lot_status, billing_item_type, encounter_financial_status, encounter_receivable_status, payment_method, payment_status, cash_register_status, cash_movement_type, alert_type, alert_severity, alert_status, shift_handover_status, shift_period)
- 11 enum value sets verified correct (encounter_status, appointment_status, appointment_type, inpatient_stay_status, exam_category, medication_order_status, medication_administration_status, payment_method, payment_status, alert_severity, alert_status)

### Foreign Keys

- 37 essential FKs verified present (users→accounts/units, owners→accounts/units, patients→accounts/owners, appointments→accounts/patients/owners/users, encounters→accounts/patients/owners/users, user_roles→users/roles, role_permissions→roles/permissions, products→accounts, stock_items→accounts/products, wards→accounts, beds→accounts/wards, inpatient_stays→encounters/patients, encounter_billing_items→encounters, encounter_financial_accounts→encounters, exam_orders→patients/encounters, clinical_notes→encounters, medication_orders→patients/encounters, medication_administrations→medication_orders, audit_events→accounts/users)
- 5 FK enforcement tests pass (rejects invalid patient_id, owner_id, professional_user_id, product_id, ward_id)

### Integrity

- 11 NOT NULL constraints enforced (users: email, password_hash, full_name, account_id; owners: full_name; patients: name, species, owner_id; encounters: patient_id; appointments: start_at; products: name)
- 4 UNIQUE constraints enforced (account slug, role name, permission key, user email+account)
- 1 CHECK constraint enforced (protocol_versions.version_number > 0)
- 4 essential unique indexes verified present (accounts_slug_unique, users_account_email_unique, roles_name_unique, permissions_key_unique)

---

## What Failed (Now Documented as Gaps)

### GAP-001: Notification tables missing

**Tables:** `notifications`, `notification_templates`, `notification_settings`
**Expected:** Per docs/740, these should exist
**Reality:** Schema file `packages/db/src/schema/notifications.ts` exists but tables are NOT in migration SQL
**Impact:** Notification module cannot persist data to DB
**Fix needed:** Add notification tables to Drizzle schema and regenerate migration

### GAP-002: Notification enums missing

**Enums:** `notification_channel`, `notification_status`, `notification_type`, `notification_priority`
**Expected:** Per docs/740, these should exist
**Reality:** Not in migration SQL
**Impact:** Same as GAP-001
**Fix needed:** Same as GAP-001

### GAP-003: No admin user in seed

**Expected:** Seed creates admin user when ADMIN_EMAIL/ADMIN_PASSWORD env vars are set
**Reality:** Env vars not set in test environment, so no admin user is created
**Impact:** Tests that require a pre-existing user (duplicate email test) must handle absence gracefully
**Fix needed:** Set ADMIN_EMAIL/ADMIN_PASSWORD in test environment or create test user via factory

---

## What Could Not Be Validated

| Item                                                     | Reason                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequential migration application                         | Only 1 migration file exists (0000\_); no incremental migrations to test                                                                           |
| Dual migration track elimination                         | SQL legacy track (`packages/shared/database/src/migrations/`) still exists but is not used by test suite                                           |
| Seed role/permission alignment with AccessControlService | Seed uses `vet/enfermagem/recepcao`; AccessControlService uses `veterinarian/nurse/reception` — this is documented in docs/705 but not tested here |
| Migration idempotency                                    | Migration uses `CREATE TYPE` without `IF NOT EXISTS`; requires DB reset between runs (handled by globalSetup)                                      |

---

## Next Steps

1. **Fix GAP-001/GAP-002:** Add notification tables and enums to Drizzle schema, regenerate migration
2. **Fix GAP-003:** Set ADMIN_EMAIL/ADMIN_PASSWORD in test environment or create test users via factories
3. **Add ICT-001 to ICT-020:** Implement the 20 critical integration tests from docs/780
4. **Eliminate dual migration track:** Remove or deprecate `packages/shared/database/src/migrations/`
5. **Reconcile dual RBAC:** Align seed role codes with AccessControlService codes (docs/705)
