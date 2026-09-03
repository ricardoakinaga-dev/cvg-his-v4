import {
  DATABASE_RUNTIME_API_FUNCTIONS,
  DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS
} from '@cvg-his-v2/security';

export const API_GLOBAL_TABLE_MUTATIONS = DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS;

/**
 * Tables whose mutations are reserved for the installer capability role.
 *
 * The broad tenant-table grant is intentionally applied to both runtime
 * roles, but the worker must not inherit these setup/governance mutations.
 * Keeping this list next to the API mutation contract lets reconciliation and
 * deployment ACLs close the same boundary after every broad grant.
 */
export const RUNTIME_INSTALLER_MUTATIONS = DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS;

export { DATABASE_RUNTIME_API_FUNCTIONS };

/** Runtime roles may ingest and review provider rows, but never remove them. */
export const RUNTIME_APPEND_ONLY_TABLES = ['laboratory_result_imports'] as const;

/** Direct DML required by API-owned authentication and user repositories. */
export const API_SENSITIVE_TABLE_PRIVILEGES = [
  { tableName: 'users', privileges: 'SELECT, INSERT, UPDATE' },
  { tableName: 'sessions', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
  { tableName: 'mfa_credentials', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
  { tableName: 'auth_mfa_login_challenges', privileges: 'SELECT, INSERT, UPDATE' },
  { tableName: 'auth_webauthn_credentials', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
  { tableName: 'auth_webauthn_challenges', privileges: 'SELECT, INSERT, UPDATE' },
  { tableName: 'api_keys', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
  { tableName: 'api_key_usage', privileges: 'SELECT, INSERT' },
  { tableName: 'api_key_rate_limits', privileges: 'SELECT, INSERT, UPDATE' }
] as const;

/** Non-secret identity attributes required to validate a mapped worker principal. */
export const WORKER_USER_READ_COLUMNS = [
  'id',
  'account_id',
  'is_active',
  'principal_kind',
  'interactive_login_enabled'
] as const;

export const RUNTIME_SENSITIVE_TABLES = [
  'users',
  'account_service_principals',
  'sessions',
  'mfa_credentials',
  'auth_mfa_login_challenges',
  'auth_webauthn_credentials',
  'auth_webauthn_challenges',
  'api_keys',
  'api_key_usage',
  'api_key_rate_limits'
] as const;

/**
 * Internal consistency helpers invoked by tenant-scoped database triggers.
 *
 * Runtime roles deliberately lose EXECUTE on every `app` function during
 * reconciliation. These helpers are the narrow exception required when the
 * API or worker mutates a linked cash-settlement artifact and PostgreSQL
 * revalidates the receipt inside the same transaction.
 */
export const RUNTIME_SETTLEMENT_FUNCTIONS = [
  {
    functionName: 'assert_encounter_cash_receipt_consistent',
    argumentTypes: 'uuid, boolean'
  },
  {
    functionName: 'assert_encounter_non_cash_receipt_consistent',
    argumentTypes: 'uuid'
  },
  {
    functionName: 'assert_one_active_encounter_cash_receipt',
    argumentTypes: 'uuid, uuid'
  }
] as const;
