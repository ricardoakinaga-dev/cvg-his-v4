-- GAP-08: Fiscal Tables Migration
-- Creates canonical storage for Brazilian fiscal data: CFOP, ICMS, NCM, PIS/COFINS, NFS-e

-- 1. CFOP Entries (Cadastro de CFOP)
CREATE TABLE IF NOT EXISTS cfop_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(7) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  section VARCHAR(10) NOT NULL CHECK (section IN ('entrada', 'saida')),
  category VARCHAR(64) NOT NULL,
  applicable_to JSONB NOT NULL DEFAULT '["nfe", "nfce", "nfse", "cte"]',
  icms_relevant BOOLEAN NOT NULL DEFAULT false,
  pis_cofins_relevant BOOLEAN NOT NULL DEFAULT false,
  ipi_relevant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfop_code ON cfop_entries (code);
CREATE INDEX IF NOT EXISTS idx_cfop_section ON cfop_entries (section);
CREATE INDEX IF NOT EXISTS idx_cfop_category ON cfop_entries (category);

-- 2. ICMS Rules (Regras de ICMS Interestadual)
CREATE TABLE IF NOT EXISTS icms_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf_origin VARCHAR(2) NOT NULL,
  uf_destination VARCHAR(2) NOT NULL,
  ncm VARCHAR(10),
  rate DECIMAL(5,2) NOT NULL,
  cst VARCHAR(4) NOT NULL,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('interna', 'interestadual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_uf_pair_ncm UNIQUE (uf_origin, uf_destination, ncm)
);

CREATE INDEX IF NOT EXISTS idx_icms_uf_origin ON icms_rules (uf_origin);
CREATE INDEX IF NOT EXISTS idx_icms_uf_dest ON icms_rules (uf_destination);
CREATE INDEX IF NOT EXISTS idx_icms_ncm ON icms_rules (ncm);

-- 3. NCM Entries (Cadastro de NCM)
CREATE TABLE IF NOT EXISTS ncm_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncm VARCHAR(10) NOT NULL UNIQUE,
  category VARCHAR(64) NOT NULL,
  ipi_rate DECIMAL(5,2),
  source VARCHAR(128),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ncm_code ON ncm_entries (ncm);
CREATE INDEX IF NOT EXISTS idx_ncm_category ON ncm_entries (category);

-- 4. PIS/COFINS Rules (Regras de PIS/COFINS)
CREATE TABLE IF NOT EXISTS pis_cofins_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime VARCHAR(24) NOT NULL CHECK (regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  applies_to VARCHAR(16) NOT NULL CHECK (applies_to IN ('mercadoria', 'servico', 'ambos')),
  pis_rate DECIMAL(5,2) NOT NULL,
  cofins_rate DECIMAL(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pis_cofins_regime ON pis_cofins_rules (regime);
CREATE INDEX IF NOT EXISTS idx_pis_cofins_applies_to ON pis_cofins_rules (applies_to);

-- 5. NFS-e Layouts (Layouts de NFS-e por Municipio)
CREATE TABLE IF NOT EXISTS nfse_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(128) NOT NULL,
  state VARCHAR(2) NOT NULL,
  municipality_code VARCHAR(10),
  provider VARCHAR(64) NOT NULL,
  version VARCHAR(16) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  environment VARCHAR(16) NOT NULL DEFAULT 'production',
  service_code VARCHAR(16),
  service_focus VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_city_state UNIQUE (city, state)
);

CREATE INDEX IF NOT EXISTS idx_nfse_state ON nfse_layouts (state);
CREATE INDEX IF NOT EXISTS idx_nfse_active ON nfse_layouts (active);
CREATE INDEX IF NOT EXISTS idx_nfse_provider ON nfse_layouts (provider);
