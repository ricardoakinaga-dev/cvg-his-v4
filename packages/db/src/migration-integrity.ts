interface MigrationChecksumFile {
  readonly name: string;
  readonly checksum: string;
}

export interface AppliedMigration {
  readonly migrationName: string;
  readonly hash: string;
}

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX_PATTERN.test(value);
}

function hashPrefix(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 12) || '<empty>' : '<invalid>';
}

/**
 * Verify that the release contains the exact SQL already accepted by the
 * database. A migration name is not a sufficient identity.
 */
export function assertMigrationChecksums(
  files: readonly MigrationChecksumFile[],
  applied: readonly AppliedMigration[]
): ReadonlySet<string> {
  const localByName = new Map<string, MigrationChecksumFile>();
  for (const file of files) {
    if (typeof file.name !== 'string' || file.name.trim().length === 0) {
      throw new Error('invalid local migration name');
    }
    if (!isSha256Hex(file.checksum)) {
      throw new Error(`invalid local migration checksum for ${file.name}`);
    }
    if (localByName.has(file.name)) {
      throw new Error(`duplicate local migration file: ${file.name}`);
    }
    localByName.set(file.name, file);
  }

  const appliedNames = new Set<string>();

  for (const record of applied) {
    const migrationName =
      typeof record.migrationName === 'string' ? record.migrationName : '<invalid-name>';
    if (migrationName.trim().length === 0 || migrationName === '<invalid-name>') {
      throw new Error('invalid applied migration name');
    }
    if (appliedNames.has(record.migrationName)) {
      throw new Error(`duplicate applied migration record: ${record.migrationName}`);
    }

    const local = localByName.get(migrationName);
    if (!local) {
      throw new Error(`applied migration is missing from the release: ${migrationName}`);
    }

    if (!isSha256Hex(record.hash)) {
      throw new Error(
        `invalid applied migration hash for ${migrationName}: `
        + `expected=${hashPrefix(local.checksum)} recorded=${hashPrefix(record.hash)}`
      );
    }

    if (local.checksum !== record.hash) {
      throw new Error(
        `migration checksum mismatch for ${migrationName}: `
        + `expected=${hashPrefix(local.checksum)} `
        + `recorded=${hashPrefix(record.hash)}`
      );
    }

    appliedNames.add(migrationName);
  }

  return appliedNames;
}
