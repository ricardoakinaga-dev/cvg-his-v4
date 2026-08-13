-- Materialize the fiscal reference data that was previously stored only in the
-- excluded 0017_fiscal_tables.seed.sql file and align NFS-e persistence with
-- the canonical Drizzle schema used by the runtime repository.

ALTER TABLE nfse_layouts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE nfse_layouts ALTER COLUMN id TYPE varchar(60) USING id::text;
ALTER TABLE nfse_layouts ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE nfse_layouts ALTER COLUMN created_at TYPE text USING created_at::text;
ALTER TABLE nfse_layouts ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE nfse_layouts ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE nfse_layouts ALTER COLUMN updated_at TYPE text USING updated_at::text;
ALTER TABLE nfse_layouts ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE nfse_layouts ALTER COLUMN environment SET DEFAULT 'homologacao';
ALTER TABLE nfse_layouts ALTER COLUMN active SET DEFAULT false;

INSERT INTO cfop_entries (
  code, description, section, category, applicable_to,
  icms_relevant, pis_cofins_relevant, ipi_relevant
) VALUES
  ('1.102', 'Compra de mercadoria para revenda', 'entrada', 'Compra mercadoria', '["nfe", "nfce"]', true, true, false),
  ('1.104', 'Compra de material de uso e consumo', 'entrada', 'Material consumo', '["nfe", "nfce"]', true, true, false),
  ('1.108', 'Transferencia de mercadoria filial', 'entrada', 'Transferencia', '["nfe", "nfce"]', true, true, false),
  ('2.102', 'Venda de mercadoria', 'saida', 'Venda mercadoria', '["nfe", "nfce"]', true, true, false),
  ('2.104', 'Venda de mercadoria para fora do estado', 'saida', 'Venda interestadual', '["nfe", "nfce"]', true, true, false),
  ('5.929', 'Prestacao de servico hospitalario', 'saida', 'Servico saude', '["nfse"]', false, true, false),
  ('5.930', 'Prestacao de servico medico ambulatorial', 'saida', 'Servico saude', '["nfse"]', false, true, false),
  ('5.931', 'Prestacao de servico diagnostico', 'saida', 'Servico diagnostico', '["nfse"]', false, true, false),
  ('5.932', 'Prestacao de servico veterinario', 'saida', 'Servico veterinario', '["nfse"]', false, true, false),
  ('6.929', 'Transferencia de servico hospitalar', 'saida', 'Transferencia servico', '["nfse"]', false, true, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO icms_rules (uf_origin, uf_destination, ncm, rate, cst, operation_type)
SELECT seed.uf_origin, seed.uf_destination, NULL, seed.rate, seed.cst, seed.operation_type
FROM (VALUES
  ('SP', 'RJ', 12.00, '000', 'interestadual'),
  ('SP', 'MG', 12.00, '000', 'interestadual'),
  ('SP', 'ES', 12.00, '000', 'interestadual'),
  ('RJ', 'SP', 12.00, '000', 'interestadual'),
  ('RJ', 'MG', 12.00, '000', 'interestadual'),
  ('MG', 'SP', 12.00, '000', 'interestadual'),
  ('RS', 'SP', 12.00, '000', 'interestadual'),
  ('SP', 'SP', 18.00, '000', 'interna'),
  ('RJ', 'RJ', 20.00, '000', 'interna'),
  ('MG', 'MG', 18.00, '000', 'interna')
) AS seed(uf_origin, uf_destination, rate, cst, operation_type)
WHERE NOT EXISTS (
  SELECT 1
  FROM icms_rules current
  WHERE current.uf_origin = seed.uf_origin
    AND current.uf_destination = seed.uf_destination
    AND current.ncm IS NULL
    AND current.operation_type = seed.operation_type
);

INSERT INTO ncm_entries (ncm, category, ipi_rate, source, notes) VALUES
  ('30049046', 'Medicamento alopatico', 0, 'ANVISA', 'Medicamentos para o sistema nervoso'),
  ('30049099', 'Medicamento alopatico', 0, 'ANVISA', 'Outros medicamentos alopaticos'),
  ('90189099', 'Equipamento medico', 5, 'ANVISA', 'Instrumentos e dispositivos medicos'),
  ('90251200', 'Equipamento diagnostico', 5, 'ANVISA', 'Termometros medicos'),
  ('94029000', 'Moveis hospitalares', 10, 'IBAMA', 'Camas e macas hospitalares'),
  ('30059031', 'Material hospitalar', 0, 'ANVISA', 'Algodoes e gazes medicinais'),
  ('73101000', 'Recipientes em aco', 10, 'IBAMA', 'Caixas para residuos hospitalares'),
  ('40151200', 'Luvas cirurgicas', 15, 'IBAMA', 'Luvas de borracha para uso medico')
ON CONFLICT (ncm) DO NOTHING;

INSERT INTO pis_cofins_rules (regime, applies_to, pis_rate, cofins_rate, notes)
SELECT seed.regime, seed.applies_to, seed.pis_rate, seed.cofins_rate, seed.notes
FROM (VALUES
  ('simples_nacional', 'mercadoria', 0.65, 3.00, 'Simples Nacional - aliquota unificada'),
  ('simples_nacional', 'servico', 0.65, 3.00, 'Simples Nacional - servicos'),
  ('lucro_presumido', 'mercadoria', 1.65, 7.60, 'Lucro Presumido - revenda'),
  ('lucro_presumido', 'servico', 1.65, 7.60, 'Lucro Presumido - servicos'),
  ('lucro_real', 'mercadoria', 1.86, 8.76, 'Lucro Real - pis/cofins cumulativo'),
  ('lucro_real', 'servico', 1.86, 8.76, 'Lucro Real - pis/cofins cumulativo'),
  ('lucro_real', 'ambos', 1.86, 8.76, 'Lucro Real - pis/cofins nao cumulativo')
) AS seed(regime, applies_to, pis_rate, cofins_rate, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM pis_cofins_rules current
  WHERE current.regime = seed.regime
    AND current.applies_to = seed.applies_to
    AND current.pis_rate = seed.pis_rate
    AND current.cofins_rate = seed.cofins_rate
);

INSERT INTO icms_tables (id, code, description, percent) VALUES
  ('icms-table-18', '18', 'ICMS 18%', 18),
  ('icms-table-12', '12', 'ICMS 12%', 12),
  ('icms-table-7', '7', 'ICMS 7%', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO ipi_tables (id, code, description, percent) VALUES
  ('ipi-table-0', '0', 'IPI 0%', 0),
  ('ipi-table-3-25', '3,25', 'IPI 3,25%', 3.25),
  ('ipi-table-5', '5', 'IPI 5%', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO pis_tables (id, code, description, percent) VALUES
  ('pis-table-0', '0', 'PIS 0%', 0),
  ('pis-table-0-65', '0,65', 'PIS 0,65%', 0.65),
  ('pis-table-1-65', '1,65', 'PIS 1,65%', 1.65)
ON CONFLICT (code) DO NOTHING;

INSERT INTO cofins_tables (id, code, description, percent) VALUES
  ('cofins-table-0', '0', 'COFINS 0%', 0),
  ('cofins-table-3', '3', 'COFINS 3%', 3),
  ('cofins-table-7-6', '7,6', 'COFINS 7,6%', 7.6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO nfse_layouts (
  id, city, state, municipality_code, provider, version, active,
  environment, service_code, service_focus
) VALUES
  ('nfse-sp', 'São Paulo', 'SP', '3550308', 'ISS SP', 'v2026.1', true, 'producao', '0407', 'Consultas e serviços veterinários'),
  ('nfse-poa', 'Porto Alegre', 'RS', '4314902', 'Abrasf/Betha', '2.04', true, 'producao', '0413', 'Laboratório e imagem'),
  ('nfse-curitiba', 'Curitiba', 'PR', '4106902', 'ISS Curitiba', '1.0', true, 'homologacao', '0407', 'Expansão multiunidade'),
  ('nfse-rio', 'Rio de Janeiro', 'RJ', '3304557', 'Nota Carioca', 'v3', false, 'homologacao', '0407', 'Expansão multiunidade')
ON CONFLICT (city, state) DO UPDATE SET
  id = EXCLUDED.id,
  municipality_code = EXCLUDED.municipality_code,
  provider = EXCLUDED.provider,
  version = EXCLUDED.version,
  active = EXCLUDED.active,
  environment = EXCLUDED.environment,
  service_code = EXCLUDED.service_code,
  service_focus = EXCLUDED.service_focus,
  updated_at = CURRENT_TIMESTAMP::text;
