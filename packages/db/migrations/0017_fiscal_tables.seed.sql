-- GAP-08: Seed data for Brazilian fiscal tables
-- CFOP, ICMS, NCM, PIS/COFINS, NFS-e

-- CFOP Entries (partial list of most common medical/clinic operations)
INSERT INTO cfop_entries (code, description, section, category, applicable_to, icms_relevant, pis_cofins_relevant, ipi_relevant) VALUES
-- Entrada
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

-- ICMS Rules (interestadual - commonly 7% or 12%)
INSERT INTO icms_rules (uf_origin, uf_destination, ncm, rate, cst, operation_type) VALUES
('SP', 'RJ', NULL, 12.00, '000', 'interestadual'),
('SP', 'MG', NULL, 12.00, '000', 'interestadual'),
('SP', 'ES', NULL, 12.00, '000', 'interestadual'),
('RJ', 'SP', NULL, 12.00, '000', 'interestadual'),
('RJ', 'MG', NULL, 12.00, '000', 'interestadual'),
('MG', 'SP', NULL, 12.00, '000', 'interestadual'),
('RS', 'SP', NULL, 12.00, '000', 'interestadual'),
-- Operacao interna
('SP', 'SP', NULL, 18.00, '000', 'interna'),
('RJ', 'RJ', NULL, 20.00, '000', 'interna'),
('MG', 'MG', NULL, 18.00, '000', 'interna')
ON CONFLICT (uf_origin, uf_destination, ncm) DO NOTHING;

-- NCM Entries (common medical supplies and equipment)
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

-- PIS/COFINS Rules
INSERT INTO pis_cofins_rules (regime, applies_to, pis_rate, cofins_rate, notes) VALUES
('simples_nacional', 'mercadoria', 0.65, 3.00, 'Simples Nacional - aliquota unificada'),
('simples_nacional', 'servico', 0.65, 3.00, 'Simples Nacional - servicos'),
('lucro_presumido', 'mercadoria', 1.65, 7.60, 'Lucro Presumido - revenda'),
('lucro_presumido', 'servico', 1.65, 7.60, 'Lucro Presumido - servicos'),
('lucro_real', 'mercadoria', 1.86, 8.76, 'Lucro Real - pis/cofins cumulativo'),
('lucro_real', 'servico', 1.86, 8.76, 'Lucro Real - pis/cofins cumulativo'),
('lucro_real', 'ambos', 1.86, 8.76, 'Lucro Real - pis/cofins nao cumulativo')
ON CONFLICT DO NOTHING;

-- NFS-e Layouts (major Brazilian cities with ISS providers)
INSERT INTO nfse_layouts (city, state, municipality_code, provider, version, active, environment, service_code, service_focus) VALUES
('Sao Paulo', 'SP', '3550308', 'nota_paulista', '1.0', true, 'production', '14005', 'Saude e educacao'),
('Rio de Janeiro', 'RJ', '3304557', 'nota_rio', '1.0', true, 'production', '14001', 'Servicos medicos'),
('Belo Horizonte', 'MG', '3106200', 'iss_bh', '1.0', true, 'production', '1402', 'Servicos de saude'),
('Salvador', 'BA', '2927408', 'iss_salvador', '1.0', true, 'production', '1403', 'Servicos medicos'),
('Curitiba', 'PR', '4106902', 'iss_curitiba', '1.0', true, 'production', '1404', 'Servicos hospitalares'),
('Porto Alegre', 'RS', '4314902', 'iss_poa', '1.0', true, 'production', '1405', 'Atividades medicas'),
('Brasilia', 'DF', '5300108', 'issdf', '1.0', true, 'production', '1406', 'Servicos de saude'),
('Fortaleza', 'CE', '2304400', 'iss_fortaleza', '1.0', true, 'production', '1407', 'Servicos medicos')
ON CONFLICT (city, state) DO NOTHING;
