-- Services table for billing items (consultations, procedures, exams, etc.)
CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "group" text NOT NULL,
  "sector" text NOT NULL,
  "base_price" numeric(12,2) NOT NULL DEFAULT 0,
  "duration_minutes" integer,
  "requires_report" boolean NOT NULL DEFAULT false,
  "consumes_stock" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one code per account
CREATE UNIQUE INDEX IF NOT EXISTS "services_account_code_unique"
  ON "services"("account_id", "code");

-- Index for efficient name searches
CREATE INDEX IF NOT EXISTS "services_account_name_idx"
  ON "services"("account_id", "name");

-- Index for group filtering
CREATE INDEX IF NOT EXISTS "services_account_group_idx"
  ON "services"("account_id", "group");

-- Index for sector filtering
CREATE INDEX IF NOT EXISTS "services_account_sector_idx"
  ON "services"("account_id", "sector");

-- Index for active services filtering
CREATE INDEX IF NOT EXISTS "services_account_active_idx"
  ON "services"("account_id", "active");
