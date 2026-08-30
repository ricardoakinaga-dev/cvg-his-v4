-- Align the persisted v2 access catalog with the dependency-free policy used
-- by runtime enforcement, first-run provisioning and the seed rail.
--
-- This migration is idempotent. It reconciles only the seven supported system
-- roles. It does not touch user_roles or user/team/sector subject grants.

INSERT INTO permissions (key, description)
VALUES
  ('auth.session.read', 'Read the current authenticated session.'),
  ('auth.mfa.read', 'Read the authenticated user MFA status.'),
  ('auth.mfa.manage', 'Manage MFA enrollment and recovery for the authenticated user.'),
  ('users.read', 'Read user records.'),
  ('users.manage', 'Manage user records.'),
  ('staff.read', 'Read staff records.'),
  ('staff.manage', 'Manage staff records.'),
  ('access.read', 'Read roles and permissions.'),
  ('audit.read', 'Read audit trail events.'),
  ('audit.write', 'Write audit trail events.'),
  ('lgpd.requests.read', 'Read LGPD consent and data-subject requests.'),
  ('lgpd.requests.manage', 'Manage LGPD consent and data-subject requests.'),
  ('owners.read', 'Read owner records.'),
  ('owners.manage', 'Manage owner records.'),
  ('patients.read', 'Read patient records.'),
  ('patients.manage', 'Manage patient records.'),
  ('scheduling.read', 'Read appointments and operational queue.'),
  ('scheduling.manage', 'Manage appointments and queue flow.'),
  ('encounters.read', 'Read encounter records and operational timeline.'),
  ('encounters.manage', 'Open, transition and close encounters.'),
  ('triage.read', 'Read triage records.'),
  ('triage.manage', 'Record and update initial triage.'),
  ('medical-records.read', 'Read medical records and clinical timeline.'),
  ('medical-records.manage', 'Create clinical entries, prescriptions and conduct.'),
  ('prescriptions.read', 'Read prescription entries linked to the clinical record.'),
  ('prescriptions.write', 'Create, update and archive prescription entries.'),
  ('prescription-executions.read', 'Read scheduled prescription execution plans.'),
  ('prescription-executions.manage', 'Schedule, execute and suspend prescription administrations.'),
  ('discharges.read', 'Read discharge summaries and follow-up instructions.'),
  ('discharges.manage', 'Create and update discharge records.'),
  ('attachments.read', 'Read clinical attachments.'),
  ('attachments.manage', 'Upload and link clinical attachments.'),
  ('inpatient.read', 'Read inpatient stays and progress.'),
  ('inpatient.manage', 'Admit and update inpatient stays.'),
  ('surgery.read', 'Read surgery cases.'),
  ('surgery.manage', 'Manage surgery requests and statuses.'),
  ('diagnostics.read', 'Read diagnostic orders and results.'),
  ('diagnostics.manage', 'Create diagnostic orders and record results.'),
  ('billing.read', 'Read encounter-linked billing records.'),
  ('billing.manage', 'Manage encounter-linked billing records and items.'),
  ('inventory.read', 'Read stock items and assistive consumption records.'),
  ('inventory.manage', 'Register assistive consumption and adjust stock usage.'),
  ('fiscal.read', 'Read fiscal catalogs, tax rules and NFS-e layouts.'),
  ('fiscal.manage', 'Manage fiscal parametrization and tax rules.'),
  ('marketing.read', 'Read marketing audiences, campaigns and delivery history.'),
  ('marketing.manage', 'Manage consent preferences, campaigns and marketing deliveries.'),
  ('notifications.read', 'Read internal operational notifications.'),
  ('notifications.manage', 'Create and process operational notification jobs.'),
  ('product.read', 'Read product catalog items.'),
  ('product.write', 'Create and manage product catalog items.'),
  ('service.read', 'Read service catalog items.'),
  ('service.write', 'Create and manage service catalog items.'),
  ('counter_sale.read', 'Read counter sale records.'),
  ('counter_sale.write', 'Create and manage counter sales.'),
  ('quote.read', 'Read quote records.'),
  ('quote.write', 'Create and manage quotes.'),
  ('webhooks.read', 'Read webhook integrations and delivery history.'),
  ('webhooks.manage', 'Register, update and disable webhook integrations.'),
  ('integrations.read', 'Read the premium integrations catalog and event surface.'),
  ('integrations.manage', 'Manage premium integrations and third-party access.'),
  ('api_keys.manage', 'Create and manage API keys for third-party access.'),
  ('payments.manage', 'Create and manage payment intents and provider access.'),
  ('flags.read', 'Read feature flag definitions, overrides and evaluation results.'),
  ('flags.admin', 'Create, update and delete feature flags and overrides. Apply kill switches.')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

CREATE TEMP TABLE cvg_canonical_role_permissions (
  role_name text PRIMARY KEY,
  permission_keys text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO cvg_canonical_role_permissions (role_name, permission_keys)
VALUES
  (
    'admin',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'users.read', 'users.manage', 'staff.read', 'staff.manage',
      'access.read', 'audit.read', 'audit.write',
      'lgpd.requests.read', 'lgpd.requests.manage',
      'owners.read', 'owners.manage', 'patients.read', 'patients.manage',
      'scheduling.read', 'scheduling.manage', 'encounters.read', 'encounters.manage',
      'triage.read', 'triage.manage', 'medical-records.read', 'medical-records.manage',
      'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage',
      'attachments.read', 'attachments.manage', 'inpatient.read', 'inpatient.manage',
      'surgery.read', 'surgery.manage', 'diagnostics.read', 'diagnostics.manage',
      'billing.read', 'billing.manage', 'inventory.read', 'inventory.manage',
      'fiscal.read', 'fiscal.manage', 'marketing.read', 'marketing.manage',
      'notifications.read', 'notifications.manage',
      'product.read', 'product.write', 'service.read', 'service.write',
      'counter_sale.read', 'counter_sale.write', 'quote.read', 'quote.write',
      'webhooks.read', 'webhooks.manage', 'integrations.read', 'integrations.manage',
      'api_keys.manage', 'payments.manage', 'flags.read', 'flags.admin'
    ]
  ),
  (
    'reception',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'users.read', 'staff.read', 'owners.read', 'owners.manage',
      'patients.read', 'patients.manage', 'scheduling.read', 'scheduling.manage',
      'encounters.read', 'encounters.manage', 'medical-records.read',
      'billing.read', 'inventory.read', 'notifications.read', 'notifications.manage',
      'webhooks.read', 'webhooks.manage', 'product.read', 'service.read',
      'counter_sale.read', 'counter_sale.write', 'quote.read', 'quote.write'
    ]
  ),
  (
    'nurse',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'patients.read', 'owners.read', 'scheduling.read',
      'encounters.read', 'encounters.manage', 'triage.read', 'triage.manage',
      'medical-records.read', 'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage', 'attachments.read', 'inpatient.read',
      'inventory.read', 'inventory.manage', 'notifications.read', 'notifications.manage'
    ]
  ),
  (
    'veterinarian',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'patients.read', 'owners.read', 'encounters.read', 'encounters.manage',
      'triage.read', 'medical-records.read', 'medical-records.manage',
      'prescriptions.read', 'prescriptions.write',
      'prescription-executions.read', 'prescription-executions.manage',
      'discharges.read', 'discharges.manage', 'attachments.read', 'attachments.manage',
      'inpatient.read', 'inpatient.manage', 'surgery.read', 'surgery.manage',
      'diagnostics.read', 'diagnostics.manage', 'inventory.read', 'inventory.manage',
      'notifications.read', 'notifications.manage'
    ]
  ),
  (
    'finance',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'owners.read', 'patients.read', 'encounters.read',
      'billing.read', 'billing.manage', 'fiscal.read', 'fiscal.manage',
      'product.read', 'service.read', 'counter_sale.read', 'counter_sale.write',
      'quote.read', 'quote.write', 'notifications.read', 'notifications.manage'
    ]
  ),
  (
    'inventory',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'patients.read', 'encounters.read', 'inventory.read', 'inventory.manage',
      'fiscal.read', 'product.read', 'service.read', 'counter_sale.read', 'quote.read',
      'notifications.read', 'notifications.manage'
    ]
  ),
  (
    'auditor',
    ARRAY[
      'auth.session.read', 'auth.mfa.read', 'auth.mfa.manage',
      'audit.read', 'lgpd.requests.read', 'access.read', 'fiscal.read', 'owners.read', 'patients.read',
      'scheduling.read', 'encounters.read', 'triage.read', 'medical-records.read',
      'attachments.read', 'inpatient.read', 'surgery.read', 'diagnostics.read',
      'billing.read', 'inventory.read', 'notifications.read'
    ]
  );

-- System role links are the durable baseline. Reconcile only these named
-- roles; direct user/team/sector assignments remain untouched.
DELETE FROM role_permissions
WHERE role_id IN (
  SELECT id FROM roles
  WHERE name IN ('admin', 'veterinarian', 'nurse', 'reception', 'finance', 'inventory', 'auditor')
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM cvg_canonical_role_permissions AS canonical
JOIN roles AS role ON role.name = canonical.role_name
JOIN LATERAL unnest(canonical.permission_keys) AS allowed(permission_key) ON TRUE
JOIN permissions AS permission ON permission.key = allowed.permission_key
ON CONFLICT (role_id, permission_id) DO NOTHING;
