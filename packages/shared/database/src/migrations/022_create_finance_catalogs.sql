-- Migration 022: Financial catalogs for cost centers and expenses

CREATE TABLE IF NOT EXISTS finance_cost_centers (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  owner VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_cost_centers_pk PRIMARY KEY (account_id, code),
  CONSTRAINT finance_cost_centers_kind_chk CHECK (kind IN ('Operacional', 'Administrativo'))
);

CREATE INDEX IF NOT EXISTS idx_finance_cost_centers_account_name
  ON finance_cost_centers(account_id, name);

CREATE TABLE IF NOT EXISTS finance_expense_catalog_items (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  cost_center_code VARCHAR(100) NOT NULL,
  cost_center_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_expense_catalog_items_cost_center_fk
    FOREIGN KEY (account_id, cost_center_code)
    REFERENCES finance_cost_centers(account_id, code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_name
  ON finance_expense_catalog_items(account_id, name);
CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_category
  ON finance_expense_catalog_items(account_id, category);
CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_cost_center
  ON finance_expense_catalog_items(account_id, cost_center_code);
