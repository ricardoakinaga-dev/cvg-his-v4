import { describe, expect, it } from 'vitest';

import { assertMigrationChecksums, type AppliedMigration } from './migration-integrity.js';
import { APPLIED_MIGRATIONS_QUERY } from './migration-query.js';

describe('migration checksum integrity', () => {
  const files = [
    { name: '0001_initial', checksum: 'a'.repeat(64) },
    { name: '0002_accounts', checksum: 'b'.repeat(64) }
  ] as const;

  it('accepts applied migrations whose recorded checksum matches the local file', () => {
    const applied: readonly AppliedMigration[] = [
      { migrationName: files[0].name, hash: files[0].checksum }
    ];

    expect(assertMigrationChecksums(files, applied)).toEqual(new Set([files[0].name]));
  });

  it('fails before applying anything when an applied migration was edited', () => {
    const applied: readonly AppliedMigration[] = [
      { migrationName: files[0].name, hash: 'c'.repeat(64) }
    ];

    expect(() => assertMigrationChecksums(files, applied)).toThrow(
      new RegExp(`checksum mismatch.*${files[0].name}.*expected=${files[0].checksum.slice(0, 12)}.*recorded=c{12}`)
    );
  });

  it('fails when the database contains an applied migration missing from the release', () => {
    const applied: readonly AppliedMigration[] = [
      { migrationName: '0000_removed', hash: 'd'.repeat(64) }
    ];

    expect(() => assertMigrationChecksums(files, applied)).toThrow(
      /applied migration is missing from the release: 0000_removed/
    );
  });

  it('does not mutate the local or applied collections', () => {
    const applied: readonly AppliedMigration[] = [
      { migrationName: files[0].name, hash: files[0].checksum }
    ];
    const beforeFiles = [...files];
    const beforeApplied = [...applied];

    assertMigrationChecksums(files, applied);

    expect(files).toEqual(beforeFiles);
    expect(applied).toEqual(beforeApplied);
  });

  it.each([
    null,
    '',
    'short',
    'g'.repeat(64)
  ])('rejects malformed applied hash %s without leaking SQL', (hash) => {
    const applied = [
      { migrationName: files[0].name, hash }
    ] as unknown as readonly AppliedMigration[];

    expect(() => assertMigrationChecksums(files, applied)).toThrow(
      new RegExp(`invalid applied migration hash for ${files[0].name}`)
    );
    expect(() => assertMigrationChecksums(files, applied)).not.toThrow(/SELECT|DATABASE_URL/i);
  });

  it('freezes the applied migration query to migration name and hash', () => {
    expect(APPLIED_MIGRATIONS_QUERY).toMatch(/migration_name AS "migrationName"/);
    expect(APPLIED_MIGRATIONS_QUERY).toMatch(/\bhash\b/);
    expect(APPLIED_MIGRATIONS_QUERY).toMatch(/ORDER BY id ASC/);
  });
});
