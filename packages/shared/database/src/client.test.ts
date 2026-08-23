import { describe, expect, it } from 'vitest';

import {
  DATABASE_RUNTIME_API_FUNCTIONS,
  DATABASE_RUNTIME_INSTALLER_FUNCTIONS,
  DATABASE_RUNTIME_INSTALLER_MUTATIONS,
  DATABASE_RUNTIME_ROLE_CHECK_SQL,
  isDatabaseRuntimeRoleInspectionSafe
} from './client.js';

describe('database runtime role guard', () => {
  it('keeps the installer table capability allowlist exact', () => {
    expect(DATABASE_RUNTIME_INSTALLER_MUTATIONS).toEqual([
      ['roles', 'INSERT'],
      ['permissions', 'INSERT'],
      ['role_permissions', 'INSERT'],
      ['role_permissions', 'DELETE'],
      ['user_roles', 'INSERT'],
      ['user_roles', 'DELETE'],
      ['cfop_entries', 'INSERT'],
      ['cfop_entries', 'UPDATE'],
      ['icms_tables', 'INSERT'],
      ['icms_tables', 'UPDATE'],
      ['ipi_tables', 'INSERT'],
      ['ipi_tables', 'UPDATE'],
      ['pis_tables', 'INSERT'],
      ['pis_tables', 'UPDATE'],
      ['cofins_tables', 'INSERT'],
      ['cofins_tables', 'UPDATE'],
      ['ibs_cbs_tables', 'INSERT'],
      ['ibs_cbs_tables', 'UPDATE'],
      ['icms_rules', 'INSERT'],
      ['nfse_layouts', 'INSERT'],
      ['nfse_layouts', 'UPDATE']
    ]);
  });

  it('keeps the installer function capability allowlist exact', () => {
    expect(DATABASE_RUNTIME_INSTALLER_FUNCTIONS).toEqual([
      ['is_initial_setup_required', ''],
      [
        'provision_initial_installation',
        'text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text'
      ]
    ]);
  });

  it('allows only the narrow API-key resolver for the configured API role', () => {
    expect(DATABASE_RUNTIME_API_FUNCTIONS).toEqual([
      ['resolve_active_api_key', 'text, text'],
      ['is_pix_transaction_owned_by', 'text, uuid']
    ]);
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('allowed_api_functions');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("current_user = 'cvg_api'");
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("procedure.proname = 'resolve_active_api_key'");
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("'is_pix_transaction_owned_by'");
  });

  it('accepts installer functions only through the hardened NOLOGIN membership', () => {
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("installer.rolname = 'cvg_installer'");
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('NOT installer.rolcanlogin');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('NOT membership.admin_option');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('membership.inherit_option');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('runtime_role.rolinherit');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      "procedure.proconfig = ARRAY['search_path=pg_catalog, public']::text[]"
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      'procedure.proowner NOT IN (SELECT role_id FROM effective_roles)'
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      "NOT has_schema_privilege(current_user, namespace.oid, 'CREATE')"
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('acl.grantee = 0');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('acl.grantee <> installer.role_id');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain('acl.is_grantable');
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      "has_schema_privilege(installer.role_id, namespace.oid, 'USAGE')"
    );
  });

  it('blocks every mutation not covered by RLS or the exact installer capability', () => {
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("('TRUNCATE')");
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain("mutation.table_name = 'audit_events'");
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      'allowed_mutation.privilege_type = mutation.privilege_type'
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      'allowed_table.table_name = mutation.table_name'
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      "COALESCE(mutation.table_acl, acldefault('r', mutation.table_owner))"
    );
    expect(DATABASE_RUNTIME_ROLE_CHECK_SQL).toContain(
      'table_acl.grantee = mutation.runtime_role_id'
    );
  });

  it('fails closed for every unsafe inspection counter', () => {
    const safeInspection = {
      current_user: 'cvg_api',
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
      privileged_memberships: 0,
      owned_rls_tables: 0,
      forbidden_table_privileges: 0,
      executable_security_definer_functions: 0
    } as const;

    expect(isDatabaseRuntimeRoleInspectionSafe(safeInspection)).toBe(true);

    for (const counter of [
      'privileged_memberships',
      'owned_rls_tables',
      'forbidden_table_privileges',
      'executable_security_definer_functions'
    ] as const) {
      expect(isDatabaseRuntimeRoleInspectionSafe({ ...safeInspection, [counter]: 1 })).toBe(false);
    }

    for (const attribute of [
      'rolsuper',
      'rolbypassrls',
      'rolcreatedb',
      'rolcreaterole',
      'rolreplication'
    ] as const) {
      expect(isDatabaseRuntimeRoleInspectionSafe({ ...safeInspection, [attribute]: true })).toBe(
        false
      );
    }
  });
});
