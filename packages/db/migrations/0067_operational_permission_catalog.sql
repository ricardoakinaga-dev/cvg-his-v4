-- Align persisted RBAC with permission codes required by active API routes.

INSERT INTO permissions (key, description)
VALUES
  ('prescriptions.read', 'Permite leitura de prescricoes clinicas.'),
  ('prescriptions.write', 'Permite criar e alterar prescricoes clinicas.'),
  ('prescription-executions.read', 'Permite leitura da execucao de prescricoes.'),
  ('prescription-executions.manage', 'Permite gerenciar a execucao de prescricoes.'),
  ('discharges.read', 'Permite leitura de altas clinicas.'),
  ('discharges.manage', 'Permite gerenciar altas clinicas.'),
  ('fiscal.read', 'Permite leitura de configuracoes fiscais.'),
  ('fiscal.manage', 'Permite gerenciar configuracoes fiscais.'),
  ('product.read', 'Permite leitura do cadastro de produtos.'),
  ('product.write', 'Permite gerenciar o cadastro de produtos.'),
  ('service.read', 'Permite leitura dos cadastros auxiliares e servicos.'),
  ('service.write', 'Permite gerenciar cadastros auxiliares e servicos.'),
  ('counter_sale.read', 'Permite leitura de vendas de balcao.'),
  ('counter_sale.write', 'Permite gerenciar vendas de balcao.'),
  ('quote.read', 'Permite leitura de orcamentos.'),
  ('quote.write', 'Permite gerenciar orcamentos.'),
  ('webhooks.read', 'Permite leitura de webhooks.'),
  ('webhooks.manage', 'Permite gerenciar webhooks.'),
  ('integrations.read', 'Permite leitura de integracoes.'),
  ('integrations.manage', 'Permite gerenciar integracoes.'),
  ('api_keys.manage', 'Permite gerenciar chaves de API.')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM roles AS role
CROSS JOIN permissions AS permission
WHERE role.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
