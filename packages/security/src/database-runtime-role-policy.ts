export type DatabaseMutationPrivilege = 'INSERT' | 'UPDATE' | 'DELETE';
export type DatabaseRuntimeCapability = readonly [name: string, detail: string];

export interface DatabaseRuntimeTableGrant {
  readonly tableName: string;
  readonly privileges: string;
}

function immutableCapability<const Detail extends string>(
  name: string,
  detail: Detail
): readonly [string, Detail] {
  return Object.freeze([name, detail] as const);
}

export const DATABASE_RUNTIME_ROLE_CONTRACT = Object.freeze({
  login: Object.freeze({
    inherit: false,
    superuser: false,
    bypassRls: false,
    createDatabase: false,
    createRole: false,
    replication: false
  }),
  installerMembership: Object.freeze({
    adminOption: false,
    inheritOption: false,
    setOption: true
  }),
  securityDefinerSearchPath: 'search_path=pg_catalog, public'
});

/** API-only direct DML required by global setup/governance repositories. */
export const DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS: readonly DatabaseRuntimeTableGrant[] =
  Object.freeze([
    Object.freeze({ tableName: 'roles', privileges: 'INSERT' }),
    Object.freeze({ tableName: 'permissions', privileges: 'INSERT' }),
    Object.freeze({ tableName: 'role_permissions', privileges: 'INSERT, DELETE' }),
    Object.freeze({ tableName: 'user_roles', privileges: 'INSERT, DELETE' }),
    Object.freeze({ tableName: 'cfop_entries', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'icms_tables', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'ipi_tables', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'pis_tables', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'cofins_tables', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'ibs_cbs_tables', privileges: 'INSERT, UPDATE' }),
    Object.freeze({ tableName: 'icms_rules', privileges: 'INSERT' }),
    Object.freeze({ tableName: 'nfse_layouts', privileges: 'INSERT, UPDATE' })
  ] satisfies readonly DatabaseRuntimeTableGrant[]);

export const DATABASE_RUNTIME_INSTALLER_MUTATIONS: readonly DatabaseRuntimeCapability[] =
  Object.freeze(
    DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS.flatMap((grant) =>
      grant.privileges
        .split(', ')
        .map((privilege) => immutableCapability(grant.tableName, privilege))
    )
  );

export const DATABASE_RUNTIME_INSTALLER_FUNCTIONS: readonly DatabaseRuntimeCapability[] =
  Object.freeze([
    immutableCapability('is_initial_setup_required', ''),
    immutableCapability(
      'provision_initial_installation',
      'text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text'
    )
  ]);

/** API-only SECURITY DEFINER entrypoints accepted by the runtime guard. */
export const DATABASE_RUNTIME_API_FUNCTIONS: readonly DatabaseRuntimeCapability[] = Object.freeze([
  immutableCapability('resolve_active_api_key', 'text, text'),
  immutableCapability('is_pix_transaction_owned_by', 'text, uuid'),
  immutableCapability('redrive_pix_provider_event_delivery', 'uuid, uuid, uuid, text, text')
]);
