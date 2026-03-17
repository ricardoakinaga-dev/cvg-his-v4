-- Migration: Add tenant scoping indexes for multi-tenant queries
-- These indexes optimize queries that filter by account_id and order by created_at

-- Patients table
CREATE INDEX IF NOT EXISTS "patients_account_created_at_idx"
ON "patients" USING btree ("account_id", "created_at" DESC);

-- Owners table
CREATE INDEX IF NOT EXISTS "owners_account_created_at_idx"
ON "owners" USING btree ("account_id", "created_at" DESC);

-- Encounters table
CREATE INDEX IF NOT EXISTS "encounters_account_opened_at_idx"
ON "encounters" USING btree ("account_id", "opened_at" DESC);

-- Inpatient stays table
CREATE INDEX IF NOT EXISTS "inpatient_stays_account_admitted_at_idx"
ON "inpatient_stays" USING btree ("account_id", "admitted_at" DESC);

-- Medication orders table
CREATE INDEX IF NOT EXISTS "medication_orders_account_created_at_idx"
ON "medication_orders" USING btree ("account_id", "created_at" DESC);

-- Medication administrations table
CREATE INDEX IF NOT EXISTS "medication_administrations_account_scheduled_for_idx"
ON "medication_administrations" USING btree ("account_id", "scheduled_for" DESC);

-- Medication order schedules table
CREATE INDEX IF NOT EXISTS "medication_order_schedules_account_created_at_idx"
ON "medication_order_schedules" USING btree ("account_id", "created_at" DESC);

-- Clinical notes table (via encounters join)
-- Note: clinical_notes doesn't have account_id directly, it's through encounters
-- This index helps with the join pattern

-- Documents table
CREATE INDEX IF NOT EXISTS "documents_account_created_at_idx"
ON "documents" USING btree ("account_id", "created_at" DESC);

-- Protocols table
CREATE INDEX IF NOT EXISTS "protocols_account_created_at_idx"
ON "protocols" USING btree ("account_id", "created_at" DESC);

-- Protocol versions table
CREATE INDEX IF NOT EXISTS "protocol_versions_account_created_at_idx"
ON "protocol_versions" USING btree ("account_id", "created_at" DESC);

-- Protocol references table
CREATE INDEX IF NOT EXISTS "protocol_references_account_created_at_idx"
ON "protocol_references" USING btree ("account_id", "created_at" DESC);

-- Shift handovers table
CREATE INDEX IF NOT EXISTS "shift_handovers_account_created_at_idx"
ON "shift_handovers" USING btree ("account_id", "created_at" DESC);

-- Shift handover items table
CREATE INDEX IF NOT EXISTS "shift_handover_items_account_created_at_idx"
ON "shift_handover_items" USING btree ("account_id", "created_at" DESC);

-- Alerts table
CREATE INDEX IF NOT EXISTS "alerts_account_created_at_idx"
ON "alerts" USING btree ("account_id", "created_at" DESC);

-- Wards table
CREATE INDEX IF NOT EXISTS "wards_account_created_at_idx"
ON "wards" USING btree ("account_id", "created_at" DESC);

-- Beds table
CREATE INDEX IF NOT EXISTS "beds_account_created_at_idx"
ON "beds" USING btree ("account_id", "created_at" DESC);

-- Additional composite indexes for common query patterns

-- Medication orders by stay and status
CREATE INDEX IF NOT EXISTS "medication_orders_account_stay_status_idx"
ON "medication_orders" USING btree ("account_id", "stay_id", "status");

-- Medication administrations by stay
CREATE INDEX IF NOT EXISTS "medication_administrations_account_stay_idx"
ON "medication_administrations" USING btree ("account_id", "stay_id", "scheduled_for" DESC);

-- Inpatient stays by ward and status
CREATE INDEX IF NOT EXISTS "inpatient_stays_account_ward_status_idx"
ON "inpatient_stays" USING btree ("account_id", "ward_id", "status");

-- Beds by ward
CREATE INDEX IF NOT EXISTS "beds_account_ward_idx"
ON "beds" USING btree ("account_id", "ward_id");

-- Shift handovers by ward and status
CREATE INDEX IF NOT EXISTS "shift_handovers_account_ward_status_idx"
ON "shift_handovers" USING btree ("account_id", "ward_id", "status");
