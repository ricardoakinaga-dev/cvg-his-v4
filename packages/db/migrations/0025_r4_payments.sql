-- R4.3: Pagamentos
-- Migration 0025

BEGIN;

-- =====================
-- Enums
-- =====================

CREATE TYPE payment_method AS ENUM (
  'cash',          -- Dinheiro
  'credit_card',   -- Cartão de crédito
  'debit_card',    -- Cartão de débito
  'pix',           -- PIX
  'bank_transfer', -- Transferência bancária
  'check',         -- Cheque
  'insurance',     -- Convênio/Seguro
  'other'          -- Outro
);

CREATE TYPE payment_status AS ENUM (
  'pending',    -- Pendente
  'completed',  -- Concluído
  'refunded',   -- Estornado
  'cancelled'   -- Cancelado
);

-- =====================
-- Payments
-- =====================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES encounter_financial_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'completed',
  installments INTEGER NOT NULL DEFAULT 1,
  installment_number INTEGER NOT NULL DEFAULT 1,
  reference TEXT,
  notes TEXT,
  processed_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_account ON payments(account_id);
CREATE INDEX idx_payments_financial_account ON payments(financial_account_id);
CREATE INDEX idx_payments_method ON payments(account_id, method);
CREATE INDEX idx_payments_status ON payments(account_id, status);
CREATE INDEX idx_payments_created_at ON payments(account_id, created_at);

COMMIT;
