-- Persistencia transacional do PDV e de orcamentos.
-- Estas tabelas eram referenciadas pela camada de repositorios e pelas policies
-- de RLS, mas ainda nao faziam parte do schema executavel do banco.

DO $$
BEGIN
  CREATE TYPE counter_sale_status AS ENUM ('open', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE counter_sale_item_type AS ENUM ('product', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE counter_sale_payment_method AS ENUM (
    'cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'insurance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE quote_status AS ENUM ('draft', 'approved', 'rejected', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE quote_item_type AS ENUM ('product', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS counter_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  number text NOT NULL,
  owner_id uuid,
  status counter_sale_status NOT NULL DEFAULT 'open',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance_due numeric(12, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  notes text,
  opened_by_user_id uuid NOT NULL,
  closed_by_user_id uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_sales_account_number_unique UNIQUE (account_id, number),
  CONSTRAINT counter_sales_account_id_unique UNIQUE (account_id, id),
  CONSTRAINT counter_sales_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sales_account_opened_by_fk
    FOREIGN KEY (account_id, opened_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sales_account_closed_by_fk
    FOREIGN KEY (account_id, closed_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS counter_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_sale_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type counter_sale_item_type NOT NULL,
  catalog_item_id uuid,
  name_snapshot text NOT NULL,
  code_snapshot text,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total numeric(12, 2) NOT NULL CHECK (line_total >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_sale_items_account_sale_fk
    FOREIGN KEY (account_id, counter_sale_id) REFERENCES counter_sales(account_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counter_sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_sale_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  method counter_sale_payment_method NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  installments integer NOT NULL DEFAULT 1 CHECK (installments > 0),
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_sale_payments_account_sale_fk
    FOREIGN KEY (account_id, counter_sale_id) REFERENCES counter_sales(account_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  number text NOT NULL,
  owner_id uuid,
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until timestamptz,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  created_by_user_id uuid NOT NULL,
  converted_to_sale_id uuid,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_account_number_unique UNIQUE (account_id, number),
  CONSTRAINT quotes_account_id_unique UNIQUE (account_id, id),
  CONSTRAINT quotes_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT quotes_account_created_by_fk
    FOREIGN KEY (account_id, created_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT quotes_account_converted_sale_fk
    FOREIGN KEY (account_id, converted_to_sale_id) REFERENCES counter_sales(account_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type quote_item_type NOT NULL,
  catalog_item_id uuid,
  name_snapshot text NOT NULL,
  code_snapshot text,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total numeric(12, 2) NOT NULL CHECK (line_total >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_items_account_quote_fk
    FOREIGN KEY (account_id, quote_id) REFERENCES quotes(account_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_counter_sales_account ON counter_sales(account_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_status ON counter_sales(account_id, status);
CREATE INDEX IF NOT EXISTS idx_counter_sales_number ON counter_sales(account_id, number);
CREATE INDEX IF NOT EXISTS idx_counter_sales_created_at ON counter_sales(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_counter_sale_items_sale ON counter_sale_items(counter_sale_id);
CREATE INDEX IF NOT EXISTS idx_counter_sale_items_account ON counter_sale_items(account_id);
CREATE INDEX IF NOT EXISTS idx_counter_sale_items_type ON counter_sale_items(item_type);
CREATE INDEX IF NOT EXISTS idx_counter_sale_payments_sale ON counter_sale_payments(counter_sale_id);
CREATE INDEX IF NOT EXISTS idx_counter_sale_payments_account ON counter_sale_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_counter_sale_payments_method ON counter_sale_payments(account_id, method);
CREATE INDEX IF NOT EXISTS idx_quotes_account ON quotes(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(account_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(account_id, number);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_account ON quote_items(account_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_type ON quote_items(item_type);

ALTER TABLE counter_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sales_tenant_isolation ON counter_sales;
CREATE POLICY counter_sales_tenant_isolation ON counter_sales
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE counter_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_items_tenant_isolation ON counter_sale_items;
CREATE POLICY counter_sale_items_tenant_isolation ON counter_sale_items
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE counter_sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_payments_tenant_isolation ON counter_sale_payments;
CREATE POLICY counter_sale_payments_tenant_isolation ON counter_sale_payments
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotes_tenant_isolation ON quotes;
CREATE POLICY quotes_tenant_isolation ON quotes
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quote_items_tenant_isolation ON quote_items;
CREATE POLICY quote_items_tenant_isolation ON quote_items
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
