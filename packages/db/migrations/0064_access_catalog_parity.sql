-- Keep the durable RBAC catalog aligned with the permissions enforced by the
-- application. This migration is deliberately idempotent and replaces only
-- assignments for the seven canonical roles; customer-defined roles remain
-- untouched.

WITH catalog(key) AS (
  SELECT unnest(ARRAY[
    'auth.session.read',
    'users.read', 'users.manage',
    'staff.read', 'staff.manage',
    'access.read',
    'audit.read', 'audit.write',
    'owners.read', 'owners.manage',
    'patients.read', 'patients.manage',
    'scheduling.read', 'scheduling.manage',
    'encounters.read', 'encounters.manage',
    'triage.read', 'triage.manage',
    'medical-records.read', 'medical-records.manage',
    'prescriptions.read', 'prescriptions.write',
    'prescription-executions.read', 'prescription-executions.manage',
    'discharges.read', 'discharges.manage',
    'attachments.read', 'attachments.manage',
    'inpatient.read', 'inpatient.manage',
    'surgery.read', 'surgery.manage',
    'diagnostics.read', 'diagnostics.manage',
    'billing.read', 'billing.manage',
    'inventory.read', 'inventory.manage',
    'fiscal.read', 'fiscal.manage',
    'notifications.read', 'notifications.manage',
    'product.read', 'product.write',
    'service.read', 'service.write',
    'counter_sale.read', 'counter_sale.write',
    'quote.read', 'quote.write',
    'webhooks.read', 'webhooks.manage',
    'integrations.read', 'integrations.manage',
    'api_keys.manage', 'payments.manage',
    'flags.read', 'flags.admin'
  ]::varchar[])
)
INSERT INTO permissions (key, description)
SELECT key, 'Canonical enterprise permission: ' || key
FROM catalog
ON CONFLICT (key) DO NOTHING;

INSERT INTO roles (name, description)
VALUES
  ('admin', 'Governanca sistemica e administracao de identidade.'),
  ('reception', 'Acesso operacional basico para cadastro mestre.'),
  ('nurse', 'Acesso assistencial inicial para triagem e fluxo operacional.'),
  ('veterinarian', 'Acesso clinico para registro de prontuario base e condutas.'),
  ('finance', 'Acesso administrativo para cobranca sem leitura clinica sensivel.'),
  ('inventory', 'Acesso administrativo-operacional para consumo assistencial e estoque basico.'),
  ('auditor', 'Consulta de trilha auditavel sem operacao administrativa.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

DELETE FROM role_permissions
USING roles
WHERE role_permissions.role_id = roles.id
  AND roles.name IN ('admin', 'reception', 'nurse', 'veterinarian', 'finance', 'inventory', 'auditor');

WITH role_catalog(role_name, permission_keys) AS (
  VALUES
    ('admin', ARRAY[
      'auth.session.read',
      'users.read', 'users.manage',
      'staff.read', 'staff.manage',
      'access.read',
      'audit.read', 'audit.write',
      'owners.read', 'owners.manage',
      'patients.read', 'patients.manage',
      'scheduling.read', 'scheduling.manage',
      'encounters.read', 'encounters.manage',
      'triage.read', 'triage.manage',
      'medical-records.read', 'medical-records.manage',
      'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage',
      'attachments.read', 'attachments.manage',
      'inpatient.read', 'inpatient.manage',
      'surgery.read', 'surgery.manage',
      'diagnostics.read', 'diagnostics.manage',
      'billing.read', 'billing.manage',
      'inventory.read', 'inventory.manage',
      'fiscal.read', 'fiscal.manage',
      'notifications.read', 'notifications.manage',
      'product.read', 'product.write',
      'service.read', 'service.write',
      'counter_sale.read', 'counter_sale.write',
      'quote.read', 'quote.write',
      'webhooks.read', 'webhooks.manage',
      'integrations.read', 'integrations.manage',
      'api_keys.manage', 'payments.manage',
      'flags.read', 'flags.admin'
    ]::text[]),
    ('reception', ARRAY[
      'auth.session.read', 'users.read', 'staff.read',
      'owners.read', 'owners.manage', 'patients.read', 'patients.manage',
      'scheduling.read', 'scheduling.manage', 'encounters.read', 'encounters.manage',
      'medical-records.read', 'billing.read', 'inventory.read',
      'notifications.read', 'notifications.manage', 'webhooks.read', 'webhooks.manage',
      'product.read', 'service.read', 'counter_sale.read', 'counter_sale.write',
      'quote.read', 'quote.write'
    ]::text[]),
    ('nurse', ARRAY[
      'auth.session.read', 'patients.read', 'owners.read', 'scheduling.read',
      'encounters.read', 'encounters.manage', 'triage.read', 'triage.manage',
      'medical-records.read', 'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage', 'attachments.read',
      'inpatient.read', 'inventory.read', 'inventory.manage',
      'notifications.read', 'notifications.manage'
    ]::text[]),
    ('veterinarian', ARRAY[
      'auth.session.read', 'patients.read', 'owners.read',
      'encounters.read', 'encounters.manage', 'triage.read',
      'medical-records.read', 'medical-records.manage',
      'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage',
      'attachments.read', 'attachments.manage',
      'inpatient.read', 'inpatient.manage', 'surgery.read', 'surgery.manage',
      'diagnostics.read', 'diagnostics.manage',
      'inventory.read', 'inventory.manage',
      'notifications.read', 'notifications.manage'
    ]::text[]),
    ('finance', ARRAY[
      'auth.session.read', 'owners.read', 'patients.read', 'encounters.read',
      'billing.read', 'billing.manage', 'fiscal.read', 'fiscal.manage',
      'product.read', 'service.read', 'counter_sale.read', 'counter_sale.write',
      'quote.read', 'quote.write', 'notifications.read', 'notifications.manage'
    ]::text[]),
    ('inventory', ARRAY[
      'auth.session.read', 'patients.read', 'encounters.read',
      'inventory.read', 'inventory.manage', 'fiscal.read',
      'product.read', 'service.read', 'counter_sale.read', 'quote.read',
      'notifications.read', 'notifications.manage'
    ]::text[]),
    ('auditor', ARRAY[
      'auth.session.read', 'audit.read', 'access.read', 'fiscal.read',
      'owners.read', 'patients.read', 'scheduling.read', 'encounters.read',
      'triage.read', 'medical-records.read', 'attachments.read', 'inpatient.read',
      'surgery.read', 'diagnostics.read', 'billing.read', 'inventory.read',
      'notifications.read'
    ]::text[])
), expanded AS (
  SELECT role_name, unnest(permission_keys) AS permission_key
  FROM role_catalog
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM expanded
JOIN roles ON roles.name = expanded.role_name
JOIN permissions ON permissions.key = expanded.permission_key
ON CONFLICT (role_id, permission_id) DO NOTHING;
