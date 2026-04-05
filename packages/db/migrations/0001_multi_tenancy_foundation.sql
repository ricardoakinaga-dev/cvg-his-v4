-- Onda 1 - Fase 1: Multi-Tenancy Foundation
-- Criação da tabela tenants e adição de tenant_id em accounts

-- 1. Criar tabela tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_name TEXT,
  tax_id VARCHAR(18),
  contact_email TEXT,
  contact_phone TEXT,
  settings_json JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  subscription_tier VARCHAR(30) DEFAULT 'standard',
  subscription_expires_at TIMESTAMPTZ,
  max_users VARCHAR(10) DEFAULT '50',
  max_branches VARCHAR(10) DEFAULT '5',
  features_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants (created_at);

-- 2. Adicionar tenant_id na tabela accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. Criar tenant padrão para dados existentes
INSERT INTO tenants (id, slug, name, status, activated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Default Tenant',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Associar accounts existentes ao tenant padrão
UPDATE accounts
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- 5. Tornar tenant_id NOT NULL após migração
ALTER TABLE accounts ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Adicionar FK constraint
ALTER TABLE accounts
ADD CONSTRAINT accounts_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;

-- 7. Índice composto tenant_id em accounts
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts (tenant_id);

-- 8. Updated_at trigger para tenants
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
