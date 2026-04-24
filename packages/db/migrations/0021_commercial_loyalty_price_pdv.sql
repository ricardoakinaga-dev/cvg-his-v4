-- Vetus parity: loyalty, price tables and POS synchronization
-- Adds tenant-scoped commercial tables for the SPA surfaces documented in docs/vetus.

DO $$ BEGIN
  CREATE TYPE loyalty_point_source AS ENUM ('purchase', 'bonus', 'adjustment', 'package', 'counter_sale');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE loyalty_redemption_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE price_table_item_kind AS ENUM ('product', 'service');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pos_sync_kind AS ENUM ('stock', 'clients');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pos_sync_status AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  points_per_real NUMERIC(12, 4) NOT NULL DEFAULT 1,
  redemption_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_program_points_non_negative CHECK (points_per_real >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_programs_account_name
  ON loyalty_programs (account_id, name);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_account_active
  ON loyalty_programs (account_id, is_active);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  program_id UUID REFERENCES loyalty_programs(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  source_type loyalty_point_source NOT NULL DEFAULT 'purchase',
  source_id VARCHAR(255),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_points_non_zero CHECK (points <> 0)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_account_owner
  ON loyalty_points (account_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_account_source
  ON loyalty_points (account_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_blocked
  ON loyalty_points (account_id, is_blocked);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  program_id UUID REFERENCES loyalty_programs(id) ON DELETE SET NULL,
  points_used INTEGER NOT NULL,
  reward_description TEXT NOT NULL,
  product_quantity INTEGER NOT NULL DEFAULT 0,
  service_quantity INTEGER NOT NULL DEFAULT 0,
  status loyalty_redemption_status NOT NULL DEFAULT 'pending',
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT loyalty_redemptions_points_positive CHECK (points_used > 0),
  CONSTRAINT loyalty_redemptions_reward_quantity_non_negative CHECK (
    product_quantity >= 0 AND service_quantity >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_owner
  ON loyalty_redemptions (account_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_status
  ON loyalty_redemptions (account_id, status);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_redeemed_at
  ON loyalty_redemptions (account_id, redeemed_at);

CREATE TABLE IF NOT EXISTS price_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  legacy_id VARCHAR(64),
  description VARCHAR(255) NOT NULL,
  context VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_tables_valid_window CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_tables_account_description
  ON price_tables (account_id, description);
CREATE INDEX IF NOT EXISTS idx_price_tables_account_legacy_id
  ON price_tables (account_id, legacy_id);
CREATE INDEX IF NOT EXISTS idx_price_tables_account_active
  ON price_tables (account_id, is_active);

CREATE TABLE IF NOT EXISTS price_table_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  price_table_id UUID NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  item_kind price_table_item_kind NOT NULL,
  item_id UUID NOT NULL,
  price NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_table_items_price_non_negative CHECK (price >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_table_items_unique_item
  ON price_table_items (account_id, price_table_id, item_kind, item_id);
CREATE INDEX IF NOT EXISTS idx_price_table_items_lookup
  ON price_table_items (account_id, item_kind, item_id);

CREATE TABLE IF NOT EXISTS pos_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sync_kind pos_sync_kind NOT NULL,
  status pos_sync_status NOT NULL DEFAULT 'queued',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  processed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT pos_sync_jobs_processed_non_negative CHECK (processed_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pos_sync_jobs_account_status
  ON pos_sync_jobs (account_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_sync_jobs_account_kind_requested
  ON pos_sync_jobs (account_id, sync_kind, requested_at);

COMMENT ON TABLE loyalty_programs IS 'Programas de fidelidade e regras de pontuação por tenant';
COMMENT ON TABLE loyalty_points IS 'Lançamentos de pontos por cliente/tutor';
COMMENT ON TABLE loyalty_redemptions IS 'Histórico de resgate de pontos por cliente';
COMMENT ON TABLE price_tables IS 'Tabelas de preço comerciais reutilizáveis para produtos e serviços';
COMMENT ON TABLE price_table_items IS 'Valores por produto ou serviço dentro de uma tabela de preço';
COMMENT ON TABLE pos_sync_jobs IS 'Jobs de sincronização administrativa com o sistema de ponto de venda';
