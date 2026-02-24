-- Billing items table for encounter billing
CREATE TYPE billing_item_status AS ENUM ('draft', 'confirmed', 'cancelled');

CREATE TABLE IF NOT EXISTS "billing_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "service_id" uuid REFERENCES "services"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "qty" numeric(10,2) NOT NULL DEFAULT 1,
  "unit_price" numeric(12,2) NOT NULL DEFAULT 0,
  "total_price" numeric(12,2) NOT NULL DEFAULT 0,
  "status" billing_item_status NOT NULL DEFAULT 'draft',
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient encounter lookups
CREATE INDEX IF NOT EXISTS "idx_billing_items_encounter_id"
  ON "billing_items"("encounter_id");

-- Index for account + status filtering
CREATE INDEX IF NOT EXISTS "idx_billing_items_account_status"
  ON "billing_items"("account_id", "status");

-- Index for service lookups
CREATE INDEX IF NOT EXISTS "idx_billing_items_service_id"
  ON "billing_items"("service_id");

-- Index for created_by_user lookups
CREATE INDEX IF NOT EXISTS "idx_billing_items_created_by_user_id"
  ON "billing_items"("created_by_user_id");

-- ============================================
-- RBAC PERMISSIONS FOR BILLING
-- ============================================

-- Insert billing-related permissions
INSERT INTO "permissions" ("key", "description") VALUES
  ('clinica.atendimentos.read', 'Visualizar atendimentos e itens de cobrança'),
  ('clinica.atendimentos.update', 'Editar atendimentos'),
  ('financeiro.comandas.read', 'Visualizar comandas e cobranças'),
  ('financeiro.comandas.update', 'Editar comandas e adicionar itens de cobrança')
ON CONFLICT ("key") DO NOTHING;
