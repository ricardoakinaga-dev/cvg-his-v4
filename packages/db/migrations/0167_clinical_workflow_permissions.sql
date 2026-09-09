-- Add the clinical workflow control-plane permissions to already-provisioned
-- installations. The catalog remains the application/seed source of truth;
-- this append-only migration keeps existing role caches aligned after upgrade.
INSERT INTO permissions (key, description)
VALUES
  ('workflow-tasks.read', 'Read tenant-scoped clinical workflow tasks and lifecycle events.'),
  ('workflow-tasks.manage', 'Create, acknowledge, complete and cancel clinical workflow tasks.'),
  ('workflow-tasks.replay', 'Replay dead-lettered clinical workflow tasks after operator review.')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM roles AS role
JOIN permissions AS permission ON permission.key = ANY (
  CASE role.name
    WHEN 'admin' THEN ARRAY['workflow-tasks.read', 'workflow-tasks.manage', 'workflow-tasks.replay']
    WHEN 'veterinarian' THEN ARRAY['workflow-tasks.read', 'workflow-tasks.manage', 'workflow-tasks.replay']
    WHEN 'nurse' THEN ARRAY['workflow-tasks.read', 'workflow-tasks.manage']
    WHEN 'reception' THEN ARRAY['workflow-tasks.read']
    WHEN 'auditor' THEN ARRAY['workflow-tasks.read']
    ELSE ARRAY[]::text[]
  END
)
WHERE role.name IN ('admin', 'veterinarian', 'nurse', 'reception', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
