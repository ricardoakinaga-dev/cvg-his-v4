-- Products table for inventory management
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "uom" text,
  "cost" numeric(12,2) NOT NULL DEFAULT 0,
  "price" numeric(12,2) NOT NULL DEFAULT 0,
  "is_controlled" boolean NOT NULL DEFAULT false,
  "track_lot" boolean NOT NULL DEFAULT false,
  "track_expiry" boolean NOT NULL DEFAULT false,
  "min_stock" numeric(12,2) NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one SKU per account
CREATE UNIQUE INDEX IF NOT EXISTS "products_account_sku_unique"
  ON "products"("account_id", "sku");

-- Index for efficient name searches
CREATE INDEX IF NOT EXISTS "products_account_name_idx"
  ON "products"("account_id", "name");

-- Index for active products filtering
CREATE INDEX IF NOT EXISTS "products_account_active_idx"
  ON "products"("account_id", "active");

-- Index for category filtering
CREATE INDEX IF NOT EXISTS "products_account_category_idx"
  ON "products"("account_id", "category");
