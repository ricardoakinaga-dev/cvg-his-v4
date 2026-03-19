-- R4.1: Controle de Estoque
-- Migration 0024

BEGIN;

-- =====================
-- Enums
-- =====================

CREATE TYPE stock_movement_type AS ENUM (
  'purchase',       -- Entrada por compra
  'sale',           -- Saída por venda
  'adjustment_in',  -- Ajuste positivo
  'adjustment_out', -- Ajuste negativo
  'transfer',       -- Transferência entre unidades
  'return',         -- Devolução
  'loss',           -- Perda/avaria
  'initial'         -- Saldo inicial
);

CREATE TYPE stock_lot_status AS ENUM (
  'active',   -- Ativo
  'expired',  -- Vencido
  'recalled', -- Recolhido
  'depleted'  -- Esgotado
);

-- =====================
-- Stock Items (Saldo por produto)
-- =====================

CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  max_quantity INTEGER,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantir um registro de estoque por produto por conta
  CONSTRAINT uq_stock_items_account_product UNIQUE (account_id, product_id)
);

CREATE INDEX idx_stock_items_account_product ON stock_items(account_id, product_id);
CREATE INDEX idx_stock_items_account_active ON stock_items(account_id, active);
CREATE INDEX idx_stock_items_low_stock ON stock_items(account_id, quantity, min_quantity);

-- =====================
-- Stock Lots (Lotes com validade)
-- =====================

CREATE TABLE stock_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  manufacture_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  supplier TEXT,
  status stock_lot_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_lots_account_product ON stock_lots(account_id, product_id);
CREATE INDEX idx_stock_lots_expiry ON stock_lots(account_id, expiry_date);
CREATE INDEX idx_stock_lots_number ON stock_lots(account_id, lot_number);
CREATE INDEX idx_stock_lots_status ON stock_lots(account_id, status);

-- =====================
-- Stock Movements (Histórico de movimentações)
-- =====================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES stock_lots(id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12, 2),
  reference TEXT,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_account_product ON stock_movements(account_id, product_id);
CREATE INDEX idx_stock_movements_account_type ON stock_movements(account_id, movement_type);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(account_id, created_at);
CREATE INDEX idx_stock_movements_lot ON stock_movements(lot_id);

-- =====================
-- Seed: Criar itens de estoque para produtos existentes
-- =====================

INSERT INTO stock_items (account_id, product_id, quantity, min_quantity, active)
SELECT account_id, id, 0, 0, true
FROM products
WHERE active = true
ON CONFLICT (account_id, product_id) DO NOTHING;

COMMIT;
