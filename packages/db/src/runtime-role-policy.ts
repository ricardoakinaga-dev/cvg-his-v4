export const API_GLOBAL_TABLE_MUTATIONS = [
  { tableName: 'roles', privileges: 'INSERT' },
  { tableName: 'permissions', privileges: 'INSERT' },
  { tableName: 'role_permissions', privileges: 'INSERT, DELETE' },
  { tableName: 'user_roles', privileges: 'INSERT, DELETE' },
  { tableName: 'cfop_entries', privileges: 'INSERT, UPDATE' },
  { tableName: 'icms_tables', privileges: 'INSERT, UPDATE' },
  { tableName: 'ipi_tables', privileges: 'INSERT, UPDATE' },
  { tableName: 'pis_tables', privileges: 'INSERT, UPDATE' },
  { tableName: 'cofins_tables', privileges: 'INSERT, UPDATE' },
  { tableName: 'ibs_cbs_tables', privileges: 'INSERT, UPDATE' },
  { tableName: 'icms_rules', privileges: 'INSERT' },
  { tableName: 'nfse_layouts', privileges: 'INSERT, UPDATE' }
] as const;
