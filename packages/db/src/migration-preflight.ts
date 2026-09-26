import {
  assertMigrationChecksums,
  type AppliedMigration
} from './migration-integrity.js';

export interface LocalMigrationChecksum {
  readonly name: string;
  readonly checksum: string;
}

export interface MigrationPreflightInput {
  /** PostgreSQL's reported server_version_num; this helper applies no version policy. */
  readonly postgresVersionNum: number;
  readonly migrationLedgerPresent: boolean;
  readonly localMigrations: readonly LocalMigrationChecksum[];
  readonly appliedMigrations: readonly AppliedMigration[];
}

export type MigrationPreflightStatus =
  | 'ledger-missing'
  | 'migrations-pending'
  | 'ready';

export interface MigrationPreflightAssessment {
  readonly status: MigrationPreflightStatus;
  readonly postgresVersionNum: number;
  readonly appliedMigrationNames: readonly string[];
  readonly pendingMigrationNames: readonly string[];
}

/**
 * Assess migration-ledger compatibility without performing I/O or changing inputs.
 * Applied records are checksum-validated against the local migration set.
 */
export function assessMigrationPreflight(
  input: MigrationPreflightInput
): MigrationPreflightAssessment {
  if (!Number.isSafeInteger(input.postgresVersionNum) || input.postgresVersionNum <= 0) {
    throw new Error('invalid PostgreSQL server_version_num');
  }

  const appliedNames = assertMigrationChecksums(
    input.localMigrations,
    input.appliedMigrations
  );

  if (!input.migrationLedgerPresent && input.appliedMigrations.length > 0) {
    throw new Error('applied migration records supplied without a migration ledger');
  }

  const appliedMigrationNames = input.migrationLedgerPresent
    ? input.localMigrations
        .filter((migration) => appliedNames.has(migration.name))
        .map((migration) => migration.name)
    : [];
  const pendingMigrationNames = input.localMigrations
    .filter((migration) => !appliedNames.has(migration.name))
    .map((migration) => migration.name);

  const status: MigrationPreflightStatus = !input.migrationLedgerPresent
    ? 'ledger-missing'
    : pendingMigrationNames.length > 0
      ? 'migrations-pending'
      : 'ready';

  return {
    status,
    postgresVersionNum: input.postgresVersionNum,
    appliedMigrationNames,
    pendingMigrationNames
  };
}
