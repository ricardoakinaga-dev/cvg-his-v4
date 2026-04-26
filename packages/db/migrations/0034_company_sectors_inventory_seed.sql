-- Vetus parity: Estoque > Cadastros > Setores da Empresa
-- Reuses the durable sectors catalog created for inpatient areas and seeds
-- generic company sectors for accounts that do not have them yet.

INSERT INTO sectors (id, account_id, code, name, kind, active, created_at, updated_at)
SELECT gen_random_uuid()::text, a.id::text, seed.code, seed.name, seed.kind, true, NOW(), NOW()
FROM accounts a
CROSS JOIN (
  VALUES
    ('REC', 'Recepcao', 'reception'),
    ('CLI', 'Clinica', 'clinic'),
    ('CIR', 'Cirurgia', 'surgery'),
    ('INT', 'Internacao', 'inpatient'),
    ('EST', 'Estoque', 'inventory'),
    ('FAR', 'Farmacia', 'pharmacy')
) AS seed(code, name, kind)
WHERE NOT EXISTS (
  SELECT 1
  FROM sectors s
  WHERE s.account_id = a.id::text
    AND s.code = seed.code
);

COMMENT ON TABLE sectors IS 'Company sectors catalog reused by Vetus parity flows for Estoque > Cadastros > Setores da Empresa and inpatient bed management.';
