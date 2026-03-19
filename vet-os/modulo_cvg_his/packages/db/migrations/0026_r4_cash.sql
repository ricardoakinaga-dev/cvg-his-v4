-- R4.2: Caixa/Gaveta
-- Migration 0026

BEGIN;

-- =====================
-- Enums
-- =====================

CREATE TYPE cash_register_status AS ENUM (
  'open',   -- Aberto
  'closed'  -- Fechado
);

CREATE TYPE cash_movement_type AS ENUM (
  'opening',     -- Abertura (saldo inicial)
  'closing',     -- Fechamento (saldo final informado)
  'payment',     -- Entrada por pagamento
  'supply',      -- Suprimento (entrada de dinheiro)
  'withdrawal',  -- Sangria (saída de dinheiro)
  'adjustment'   -- Ajuste
);

-- =====================
-- Cash Registers (Caixas)
-- =====================

CREATE TABLE cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  opened_by_user_id UUID NOT NULL REFERENCES users(id),
  closed_by_user_id UUID REFERENCES users(id),
  opening_amount NUMERIC(12, 2) NOT NULL,
  closing_amount NUMERIC(12, 2),
  expected_closing_amount NUMERIC(12, 2),
  difference NUMERIC(12, 2),
  status cash_register_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantir apenas um caixa aberto por conta
  CONSTRAINT uq_cash_register_one_open UNIQUE (account_id, status)
    -- Nota: esta constraint só funciona se usarmos WHERE status = 'open'
);

-- Índice parcial para garantir apenas 1 caixa aberto por conta
CREATE UNIQUE INDEX uq_cash_registers_one_open 
  ON cash_registers(account_id) 
  WHERE status = 'open';

CREATE INDEX idx_cash_registers_account_status ON cash_registers(account_id, status);
CREATE INDEX idx_cash_registers_opened_at ON cash_registers(account_id, opened_at);
CREATE INDEX idx_cash_registers_opened_by ON cash_registers(opened_by_user_id);

-- =====================
-- Cash Movements (Movimentações do Caixa)
-- =====================

CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  movement_type cash_movement_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  running_balance NUMERIC(12, 2) NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);
CREATE INDEX idx_cash_movements_account_type ON cash_movements(account_id, movement_type);
CREATE INDEX idx_cash_movements_created_at ON cash_movements(account_id, created_at);

COMMIT;
