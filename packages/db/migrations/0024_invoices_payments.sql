-- ============================================
-- FINANCIAL MVP: Invoices and Payments
-- ============================================

-- Payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'pix');

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM ('open', 'paid', 'partial', 'cancelled');

-- ============================================
-- INVOICES TABLE
-- Groups billing items from an encounter into a final invoice
-- ============================================
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "invoice_number" text NOT NULL,
  "status" invoice_status NOT NULL DEFAULT 'open',
  "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
  "discount" numeric(12,2) NOT NULL DEFAULT 0,
  "total" numeric(12,2) NOT NULL DEFAULT 0,
  "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
  "due_amount" numeric(12,2) NOT NULL DEFAULT 0,
  "notes" text,
  "closed_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancelled_reason" text,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique invoice number per account
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_account_number_unique"
  ON "invoices"("account_id", "invoice_number");

-- Index for encounter lookups
CREATE INDEX IF NOT EXISTS "invoices_encounter_id_idx"
  ON "invoices"("encounter_id");

-- Index for account + status filtering
CREATE INDEX IF NOT EXISTS "invoices_account_status_idx"
  ON "invoices"("account_id", "status");

-- Index for date range queries
CREATE INDEX IF NOT EXISTS "invoices_account_created_idx"
  ON "invoices"("account_id", "created_at");

-- ============================================
-- PAYMENTS TABLE
-- Tracks payments made against invoices
-- ============================================
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "payment_number" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "method" payment_method NOT NULL DEFAULT 'cash',
  "reference" text, -- For card transactions, pix codes, etc.
  "notes" text,
  "received_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique payment number per account
CREATE UNIQUE INDEX IF NOT EXISTS "payments_account_number_unique"
  ON "payments"("account_id", "payment_number");

-- Index for invoice lookups
CREATE INDEX IF NOT EXISTS "payments_invoice_id_idx"
  ON "payments"("invoice_id");

-- Index for account + date filtering (cash report)
CREATE INDEX IF NOT EXISTS "payments_account_received_idx"
  ON "payments"("account_id", "received_at");

-- Index for payment method filtering
CREATE INDEX IF NOT EXISTS "payments_account_method_idx"
  ON "payments"("account_id", "method");

-- ============================================
-- RBAC PERMISSIONS FOR FINANCIAL MODULE
-- ============================================
INSERT INTO "permissions" ("key", "description") VALUES
  ('financeiro.faturamento.read', 'Visualizar faturas e notas fiscais'),
  ('financeiro.faturamento.update', 'Criar e editar faturas'),
  ('financeiro.pagamentos.read', 'Visualizar pagamentos recebidos'),
  ('financeiro.pagamentos.create', 'Receber pagamentos'),
  ('financeiro.relatorios.read', 'Visualizar relatórios financeiros'),
  ('financeiro.caixa.read', 'Visualizar relatório de caixa'),
  ('financeiro.caixa.close', 'Fechar caixa do dia')
ON CONFLICT ("key") DO NOTHING;

-- ============================================
-- FUNCTION TO GENERATE INVOICE NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_account_id uuid)
RETURNS text AS $$
DECLARE
  v_prefix text := 'INV';
  v_date_part text := to_char(now(), 'YYYYMM');
  v_seq integer;
BEGIN
  -- Get next sequence number for this account/month
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12 FOR 6) AS integer)), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE account_id = p_account_id
    AND invoice_number LIKE v_prefix || '-' || v_date_part || '-%';
  
  RETURN v_prefix || '-' || v_date_part || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO GENERATE PAYMENT NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION generate_payment_number(p_account_id uuid)
RETURNS text AS $$
DECLARE
  v_prefix text := 'PAG';
  v_date_part text := to_char(now(), 'YYYYMM');
  v_seq integer;
BEGIN
  -- Get next sequence number for this account/month
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 12 FOR 6) AS integer)), 0) + 1
  INTO v_seq
  FROM payments
  WHERE account_id = p_account_id
    AND payment_number LIKE v_prefix || '-' || v_date_part || '-%';
  
  RETURN v_prefix || '-' || v_date_part || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER TO UPDATE INVOICE STATUS ON PAYMENT
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_status_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_new_status invoice_status;
BEGIN
  -- Get invoice totals
  SELECT total, paid_amount INTO v_total, v_paid
  FROM invoices WHERE id = NEW.invoice_id;
  
  -- Calculate new paid amount
  v_paid := v_paid + NEW.amount;
  
  -- Determine new status
  IF v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'open';
  END IF;
  
  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = v_paid,
    due_amount = GREATEST(total - v_paid, 0),
    status = v_new_status,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_update_invoice
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_after_payment();

-- ============================================
-- TRIGGER TO UPDATE INVOICE ON PAYMENT DELETE
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_status_after_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_new_status invoice_status;
BEGIN
  -- Get invoice totals (excluding deleted payment)
  SELECT total, paid_amount - OLD.amount INTO v_total, v_paid
  FROM invoices WHERE id = OLD.invoice_id;
  
  -- Determine new status
  IF v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'open';
  END IF;
  
  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = GREATEST(v_paid, 0),
    due_amount = GREATEST(total - GREATEST(v_paid, 0), 0),
    status = v_new_status,
    updated_at = now()
  WHERE id = OLD.invoice_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_delete_update_invoice
AFTER DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_after_payment_delete();