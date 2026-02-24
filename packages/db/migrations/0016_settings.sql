-- Settings table for per-account configuration
CREATE TABLE IF NOT EXISTS "settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "namespace" text NOT NULL,
  "key" text NOT NULL,
  "value_json" jsonb NOT NULL DEFAULT '{}',
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one key per namespace per account
CREATE UNIQUE INDEX IF NOT EXISTS "settings_account_namespace_key_unique"
  ON "settings"("account_id", "namespace", "key");

-- Index for efficient namespace queries
CREATE INDEX IF NOT EXISTS "settings_account_namespace_idx"
  ON "settings"("account_id", "namespace");
