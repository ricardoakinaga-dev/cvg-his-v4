import { describe, expect, it } from 'vitest';

import {
  assessMigrationPreflight,
  type MigrationPreflightInput
} from './migration-preflight.js';

const localMigrations = [
  { name: '0001_initial', checksum: 'a'.repeat(64) },
  { name: '0002_accounts', checksum: 'b'.repeat(64) }
] as const;

const baseInput: MigrationPreflightInput = {
  postgresVersionNum: 160004,
  migrationLedgerPresent: true,
  localMigrations,
  appliedMigrations: []
};

describe('migration preflight assessment', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    'rejects invalid PostgreSQL server_version_num %s',
    (postgresVersionNum) => {
      expect(() =>
        assessMigrationPreflight({ ...baseInput, postgresVersionNum })
      ).toThrow('invalid PostgreSQL server_version_num');
    }
  );

  it('reports ready when all applied migrations match the local checksums', () => {
    const result = assessMigrationPreflight({
      ...baseInput,
      appliedMigrations: [
        { migrationName: '0001_initial', hash: localMigrations[0].checksum },
        { migrationName: '0002_accounts', hash: localMigrations[1].checksum }
      ]
    });

    expect(result).toEqual({
      status: 'ready',
      postgresVersionNum: 160004,
      appliedMigrationNames: ['0001_initial', '0002_accounts'],
      pendingMigrationNames: []
    });
  });

  it('reports pending migrations in local release order', () => {
    const result = assessMigrationPreflight({
      ...baseInput,
      appliedMigrations: [
        { migrationName: '0001_initial', hash: localMigrations[0].checksum }
      ]
    });

    expect(result).toEqual({
      status: 'migrations-pending',
      postgresVersionNum: 160004,
      appliedMigrationNames: ['0001_initial'],
      pendingMigrationNames: ['0002_accounts']
    });
  });

  it('reports a missing ledger and treats every local migration as pending', () => {
    const result = assessMigrationPreflight({
      ...baseInput,
      migrationLedgerPresent: false
    });

    expect(result).toEqual({
      status: 'ledger-missing',
      postgresVersionNum: 160004,
      appliedMigrationNames: [],
      pendingMigrationNames: ['0001_initial', '0002_accounts']
    });
  });

  it('rejects applied records when the ledger is reported missing', () => {
    expect(() =>
      assessMigrationPreflight({
        ...baseInput,
        migrationLedgerPresent: false,
        appliedMigrations: [
          { migrationName: '0001_initial', hash: localMigrations[0].checksum }
        ]
      })
    ).toThrow('applied migration records supplied without a migration ledger');
  });

  it('fails closed when an applied migration checksum no longer matches', () => {
    expect(() =>
      assessMigrationPreflight({
        ...baseInput,
        appliedMigrations: [{ migrationName: '0001_initial', hash: 'c'.repeat(64) }]
      })
    ).toThrow(/migration checksum mismatch for 0001_initial/);
  });

  it('fails closed when the ledger contains an unknown migration', () => {
    expect(() =>
      assessMigrationPreflight({
        ...baseInput,
        appliedMigrations: [{ migrationName: '0000_removed', hash: 'c'.repeat(64) }]
      })
    ).toThrow(/applied migration is missing from the release: 0000_removed/);
  });

  it('fails closed when an applied checksum is malformed', () => {
    expect(() =>
      assessMigrationPreflight({
        ...baseInput,
        appliedMigrations: [{ migrationName: '0001_initial', hash: 'not-a-checksum' }]
      })
    ).toThrow(/invalid applied migration hash for 0001_initial/);
  });

  it('fails closed when a local migration checksum is malformed', () => {
    expect(() =>
      assessMigrationPreflight({
        ...baseInput,
        localMigrations: [{ name: '0001_initial', checksum: 'not-a-checksum' }]
      })
    ).toThrow(/invalid local migration checksum for 0001_initial/);
  });

  it('does not mutate the local migrations or applied records', () => {
    const local = localMigrations.map((migration) => ({ ...migration }));
    const applied = [
      { migrationName: '0001_initial', hash: localMigrations[0].checksum }
    ];
    const beforeLocal = structuredClone(local);
    const beforeApplied = structuredClone(applied);

    const result = assessMigrationPreflight({
      ...baseInput,
      localMigrations: local,
      appliedMigrations: applied
    });

    expect(local).toEqual(beforeLocal);
    expect(applied).toEqual(beforeApplied);
    expect(result.appliedMigrationNames).not.toBe(applied);
    expect(result.pendingMigrationNames).not.toBe(local);
  });
});
