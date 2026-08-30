/**
 * Dependency-free v2 access-control policy.
 *
 * The API runtime, first-run provisioning and the PostgreSQL seed all consume
 * this data. Keep it free of database/runtime imports so policy cannot drift
 * between those boundaries.
 */

export interface V2AccessControlPermissionSeed {
  readonly id: string;
  readonly key: string;
  readonly module: string;
  readonly description: string;
}

export interface V2AccessControlRoleSeed {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly permissionCodes: readonly string[];
}

export const V2_ACCESS_CONTROL_PERMISSION_SEEDS = [
  {
    id: 'perm_auth_session_read',
    key: 'auth.session.read',
    module: 'auth',
    description: 'Read the current authenticated session.'
  },
  {
    id: 'perm_auth_mfa_read',
    key: 'auth.mfa.read',
    module: 'auth',
    description: 'Read the authenticated user MFA status.'
  },
  {
    id: 'perm_auth_mfa_manage',
    key: 'auth.mfa.manage',
    module: 'auth',
    description: 'Manage MFA enrollment and recovery for the authenticated user.'
  },
  {
    id: 'perm_users_read',
    key: 'users.read',
    module: 'users',
    description: 'Read user records.'
  },
  {
    id: 'perm_users_manage',
    key: 'users.manage',
    module: 'users',
    description: 'Manage user records.'
  },
  {
    id: 'perm_staff_read',
    key: 'staff.read',
    module: 'staff',
    description: 'Read staff records.'
  },
  {
    id: 'perm_staff_manage',
    key: 'staff.manage',
    module: 'staff',
    description: 'Manage staff records.'
  },
  {
    id: 'perm_access_read',
    key: 'access.read',
    module: 'access-control',
    description: 'Read roles and permissions.'
  },
  {
    id: 'perm_audit_read',
    key: 'audit.read',
    module: 'audit',
    description: 'Read audit trail events.'
  },
  {
    id: 'perm_audit_write',
    key: 'audit.write',
    module: 'audit',
    description: 'Write audit trail events.'
  },
  {
    id: 'perm_lgpd_requests_read',
    key: 'lgpd.requests.read',
    module: 'lgpd',
    description: 'Read LGPD consent and data-subject requests.'
  },
  {
    id: 'perm_lgpd_requests_manage',
    key: 'lgpd.requests.manage',
    module: 'lgpd',
    description: 'Manage LGPD consent and data-subject requests.'
  },
  {
    id: 'perm_owners_read',
    key: 'owners.read',
    module: 'owners',
    description: 'Read owner records.'
  },
  {
    id: 'perm_owners_manage',
    key: 'owners.manage',
    module: 'owners',
    description: 'Manage owner records.'
  },
  {
    id: 'perm_patients_read',
    key: 'patients.read',
    module: 'patients',
    description: 'Read patient records.'
  },
  {
    id: 'perm_patients_manage',
    key: 'patients.manage',
    module: 'patients',
    description: 'Manage patient records.'
  },
  {
    id: 'perm_scheduling_read',
    key: 'scheduling.read',
    module: 'scheduling',
    description: 'Read appointments and operational queue.'
  },
  {
    id: 'perm_scheduling_manage',
    key: 'scheduling.manage',
    module: 'scheduling',
    description: 'Manage appointments and queue flow.'
  },
  {
    id: 'perm_encounters_read',
    key: 'encounters.read',
    module: 'encounters',
    description: 'Read encounter records and operational timeline.'
  },
  {
    id: 'perm_encounters_manage',
    key: 'encounters.manage',
    module: 'encounters',
    description: 'Open, transition and close encounters.'
  },
  {
    id: 'perm_triage_read',
    key: 'triage.read',
    module: 'triage',
    description: 'Read triage records.'
  },
  {
    id: 'perm_triage_manage',
    key: 'triage.manage',
    module: 'triage',
    description: 'Record and update initial triage.'
  },
  {
    id: 'perm_medical_records_read',
    key: 'medical-records.read',
    module: 'medical-records',
    description: 'Read medical records and clinical timeline.'
  },
  {
    id: 'perm_medical_records_manage',
    key: 'medical-records.manage',
    module: 'medical-records',
    description: 'Create clinical entries, prescriptions and conduct.'
  },
  {
    id: 'perm_prescriptions_read',
    key: 'prescriptions.read',
    module: 'medical-records',
    description: 'Read prescription entries linked to the clinical record.'
  },
  {
    id: 'perm_prescriptions_write',
    key: 'prescriptions.write',
    module: 'medical-records',
    description: 'Create, update and archive prescription entries.'
  },
  {
    id: 'perm_prescription_executions_read',
    key: 'prescription-executions.read',
    module: 'medical-records',
    description: 'Read scheduled prescription execution plans.'
  },
  {
    id: 'perm_prescription_executions_manage',
    key: 'prescription-executions.manage',
    module: 'medical-records',
    description: 'Schedule, execute and suspend prescription administrations.'
  },
  {
    id: 'perm_discharges_read',
    key: 'discharges.read',
    module: 'encounters',
    description: 'Read discharge summaries and follow-up instructions.'
  },
  {
    id: 'perm_discharges_manage',
    key: 'discharges.manage',
    module: 'encounters',
    description: 'Create and update discharge records.'
  },
  {
    id: 'perm_attachments_read',
    key: 'attachments.read',
    module: 'attachments',
    description: 'Read clinical attachments.'
  },
  {
    id: 'perm_attachments_manage',
    key: 'attachments.manage',
    module: 'attachments',
    description: 'Upload and link clinical attachments.'
  },
  {
    id: 'perm_inpatient_read',
    key: 'inpatient.read',
    module: 'inpatient',
    description: 'Read inpatient stays and progress.'
  },
  {
    id: 'perm_inpatient_manage',
    key: 'inpatient.manage',
    module: 'inpatient',
    description: 'Admit and update inpatient stays.'
  },
  {
    id: 'perm_surgery_read',
    key: 'surgery.read',
    module: 'surgery',
    description: 'Read surgery cases.'
  },
  {
    id: 'perm_surgery_manage',
    key: 'surgery.manage',
    module: 'surgery',
    description: 'Manage surgery requests and statuses.'
  },
  {
    id: 'perm_diagnostics_read',
    key: 'diagnostics.read',
    module: 'diagnostics',
    description: 'Read diagnostic orders and results.'
  },
  {
    id: 'perm_diagnostics_manage',
    key: 'diagnostics.manage',
    module: 'diagnostics',
    description: 'Create diagnostic orders and record results.'
  },
  {
    id: 'perm_laboratory_results_write',
    key: 'laboratory.results.write',
    module: 'laboratory',
    description: 'Accept authenticated laboratory provider results for human review.'
  },
  {
    id: 'perm_billing_read',
    key: 'billing.read',
    module: 'billing',
    description: 'Read encounter-linked billing records.'
  },
  {
    id: 'perm_billing_manage',
    key: 'billing.manage',
    module: 'billing',
    description: 'Manage encounter-linked billing records and items.'
  },
  {
    id: 'perm_inventory_read',
    key: 'inventory.read',
    module: 'inventory',
    description: 'Read stock items and assistive consumption records.'
  },
  {
    id: 'perm_inventory_manage',
    key: 'inventory.manage',
    module: 'inventory',
    description: 'Register assistive consumption and adjust stock usage.'
  },
  {
    id: 'perm_fiscal_read',
    key: 'fiscal.read',
    module: 'fiscal',
    description: 'Read fiscal catalogs, tax rules and NFS-e layouts.'
  },
  {
    id: 'perm_fiscal_manage',
    key: 'fiscal.manage',
    module: 'fiscal',
    description: 'Manage fiscal parametrization and tax rules.'
  },
  {
    id: 'perm_marketing_read',
    key: 'marketing.read',
    module: 'marketing',
    description: 'Read marketing audiences, campaigns and delivery history.'
  },
  {
    id: 'perm_marketing_manage',
    key: 'marketing.manage',
    module: 'marketing',
    description: 'Manage consent preferences, campaigns and marketing deliveries.'
  },
  {
    id: 'perm_notifications_read',
    key: 'notifications.read',
    module: 'notifications',
    description: 'Read internal operational notifications.'
  },
  {
    id: 'perm_notifications_manage',
    key: 'notifications.manage',
    module: 'notifications',
    description: 'Create and process operational notification jobs.'
  },
  {
    id: 'perm_product_read',
    key: 'product.read',
    module: 'products',
    description: 'Read product catalog items.'
  },
  {
    id: 'perm_product_write',
    key: 'product.write',
    module: 'products',
    description: 'Create and manage product catalog items.'
  },
  {
    id: 'perm_service_read',
    key: 'service.read',
    module: 'services',
    description: 'Read service catalog items.'
  },
  {
    id: 'perm_service_write',
    key: 'service.write',
    module: 'services',
    description: 'Create and manage service catalog items.'
  },
  {
    id: 'perm_counter_sale_read',
    key: 'counter_sale.read',
    module: 'counter-sales',
    description: 'Read counter sale records.'
  },
  {
    id: 'perm_counter_sale_write',
    key: 'counter_sale.write',
    module: 'counter-sales',
    description: 'Create and manage counter sales.'
  },
  {
    id: 'perm_quote_read',
    key: 'quote.read',
    module: 'quotes',
    description: 'Read quote records.'
  },
  {
    id: 'perm_quote_write',
    key: 'quote.write',
    module: 'quotes',
    description: 'Create and manage quotes.'
  },
  {
    id: 'perm_webhooks_read',
    key: 'webhooks.read',
    module: 'webhooks',
    description: 'Read webhook integrations and delivery history.'
  },
  {
    id: 'perm_webhooks_manage',
    key: 'webhooks.manage',
    module: 'webhooks',
    description: 'Register, update and disable webhook integrations.'
  },
  {
    id: 'perm_integrations_read',
    key: 'integrations.read',
    module: 'integrations',
    description: 'Read the premium integrations catalog and event surface.'
  },
  {
    id: 'perm_integrations_manage',
    key: 'integrations.manage',
    module: 'integrations',
    description: 'Manage premium integrations and third-party access.'
  },
  {
    id: 'perm_api_keys_manage',
    key: 'api_keys.manage',
    module: 'integrations',
    description: 'Create and manage API keys for third-party access.'
  },
  {
    id: 'perm_payments_manage',
    key: 'payments.manage',
    module: 'billing',
    description: 'Create and manage payment intents and provider access.'
  },
  {
    id: 'perm_flags_read',
    key: 'flags.read',
    module: 'feature-flags',
    description: 'Read feature flag definitions, overrides and evaluation results.'
  },
  {
    id: 'perm_flags_admin',
    key: 'flags.admin',
    module: 'feature-flags',
    description: 'Create, update and delete feature flags and overrides. Apply kill switches.'
  }
] as const satisfies readonly V2AccessControlPermissionSeed[];

const allPermissionCodes = V2_ACCESS_CONTROL_PERMISSION_SEEDS.map((permission) => permission.key);

export const V2_ACCESS_CONTROL_ROLE_SEEDS = [
  {
    id: 'role_admin',
    name: 'admin',
    displayName: 'Admin',
    description: 'Governanca sistêmica e administracao de identidade.',
    permissionCodes: allPermissionCodes
  },
  {
    id: 'role_reception',
    name: 'reception',
    displayName: 'Reception',
    description: 'Acesso operacional basico para cadastro mestre.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'users.read',
      'staff.read',
      'owners.read',
      'owners.manage',
      'patients.read',
      'patients.manage',
      'scheduling.read',
      'scheduling.manage',
      'encounters.read',
      'encounters.manage',
      'medical-records.read',
      'billing.read',
      'inventory.read',
      'notifications.read',
      'notifications.manage',
      'webhooks.read',
      'webhooks.manage',
      'product.read',
      'service.read',
      'counter_sale.read',
      'counter_sale.write',
      'quote.read',
      'quote.write'
    ] as const
  },
  {
    id: 'role_nurse',
    name: 'nurse',
    displayName: 'Nurse',
    description: 'Acesso assistencial inicial para triagem e fluxo operacional.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'patients.read',
      'owners.read',
      'scheduling.read',
      'encounters.read',
      'encounters.manage',
      'triage.read',
      'triage.manage',
      'medical-records.read',
      'prescriptions.read',
      'prescriptions.write',
      'prescription-executions.read',
      'prescription-executions.manage',
      'discharges.read',
      'discharges.manage',
      'attachments.read',
      'inpatient.read',
      'inventory.read',
      'inventory.manage',
      'notifications.read',
      'notifications.manage'
    ] as const
  },
  {
    id: 'role_veterinarian',
    name: 'veterinarian',
    displayName: 'Veterinarian',
    description: 'Acesso clinico para registro de prontuario base e condutas.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'patients.read',
      'owners.read',
      'encounters.read',
      'encounters.manage',
      'triage.read',
      'medical-records.read',
      'medical-records.manage',
      'prescriptions.read',
      'prescriptions.write',
      'prescription-executions.read',
      'prescription-executions.manage',
      'discharges.read',
      'discharges.manage',
      'attachments.read',
      'attachments.manage',
      'inpatient.read',
      'inpatient.manage',
      'surgery.read',
      'surgery.manage',
      'diagnostics.read',
      'diagnostics.manage',
      'inventory.read',
      'inventory.manage',
      'notifications.read',
      'notifications.manage'
    ] as const
  },
  {
    id: 'role_finance',
    name: 'finance',
    displayName: 'Finance',
    description: 'Acesso administrativo para cobranca sem leitura clinica sensivel.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'owners.read',
      'patients.read',
      'encounters.read',
      'billing.read',
      'billing.manage',
      'fiscal.read',
      'fiscal.manage',
      'product.read',
      'service.read',
      'counter_sale.read',
      'counter_sale.write',
      'quote.read',
      'quote.write',
      'notifications.read',
      'notifications.manage'
    ] as const
  },
  {
    id: 'role_inventory',
    name: 'inventory',
    displayName: 'Inventory',
    description: 'Acesso administrativo-operacional para consumo assistencial e estoque basico.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'patients.read',
      'encounters.read',
      'inventory.read',
      'inventory.manage',
      'fiscal.read',
      'product.read',
      'service.read',
      'counter_sale.read',
      'quote.read',
      'notifications.read',
      'notifications.manage'
    ] as const
  },
  {
    id: 'role_auditor',
    name: 'auditor',
    displayName: 'Auditor',
    description: 'Consulta de trilha auditavel sem operacao administrativa.',
    permissionCodes: [
      'auth.session.read',
      'auth.mfa.read',
      'auth.mfa.manage',
      'audit.read',
      'lgpd.requests.read',
      'access.read',
      'fiscal.read',
      'owners.read',
      'patients.read',
      'scheduling.read',
      'encounters.read',
      'triage.read',
      'medical-records.read',
      'attachments.read',
      'inpatient.read',
      'surgery.read',
      'diagnostics.read',
      'billing.read',
      'inventory.read',
      'notifications.read'
    ] as const
  }
] as const satisfies readonly V2AccessControlRoleSeed[];
