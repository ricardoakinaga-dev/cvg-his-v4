-- Keep the persisted RBAC catalog aligned with the marketing API surface.

INSERT INTO permissions (key, description)
VALUES
  (
    'marketing.read',
    'Permite leitura de audiencias, campanhas e entregas de marketing.'
  ),
  (
    'marketing.manage',
    'Permite gerenciar consentimentos, campanhas e entregas de marketing.'
  )
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM roles AS role
CROSS JOIN permissions AS permission
WHERE role.name = 'admin'
  AND permission.key IN ('marketing.read', 'marketing.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;
