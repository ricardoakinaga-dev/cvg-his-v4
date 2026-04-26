-- Vetus parity: Estoque > Cadastros > Tabelas de Preco.
-- Reuses the durable commercial price_tables catalog and seeds common
-- operational tables for accounts without any price table yet.

INSERT INTO price_tables (
  account_id,
  legacy_id,
  description,
  context,
  is_active
)
SELECT
  accounts.id,
  seed.legacy_id,
  seed.description,
  seed.context,
  true
FROM accounts
CROSS JOIN (
  VALUES
    ('1', 'Tabela Padrao', 'Tabela principal para produtos, servicos, comandas e PDV'),
    ('2', 'Tabela Plantao', 'Atendimentos de plantao, emergencia e operacao fora do horario comercial'),
    ('3', 'Tabela Final de Semana', 'Atendimentos e vendas de sabado, domingo e feriados')
) AS seed(legacy_id, description, context)
WHERE NOT EXISTS (
  SELECT 1
  FROM price_tables existing
  WHERE existing.account_id = accounts.id
)
ON CONFLICT (account_id, description) DO NOTHING;

COMMENT ON TABLE price_tables IS
  'Cadastro Vetus-like de tabelas de preco do modulo Estoque > Cadastros > Tabelas de Preco.';
