import { describe, expect, it } from 'vitest';

import {
  DatabasePreflightError,
  assertSupportedPostgresVersion,
  compareDatabaseSchema,
  getExpectedDatabaseTables,
  validateLoopbackDatabaseUrl
} from '../../../packages/db/src/database-preflight.ts';

describe('validateLoopbackDatabaseUrl', () => {
  it('accepts loopback postgres URLs', () => {
    expect(() =>
      validateLoopbackDatabaseUrl('postgres://user:pass@127.0.0.1:5432/db')
    ).not.toThrow();
    expect(() => validateLoopbackDatabaseUrl('postgresql://localhost/db')).not.toThrow();
    expect(() => validateLoopbackDatabaseUrl('postgres://[::1]:5432/db')).not.toThrow();
    expect(() => validateLoopbackDatabaseUrl('postgres://127.10.0.1/db')).not.toThrow();
  });

  it('rejects invalid or non-loopback URLs', () => {
    expect(() => validateLoopbackDatabaseUrl('not-a-url')).toThrow(DatabasePreflightError);
    expect(() => validateLoopbackDatabaseUrl('mysql://localhost/db')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://db.example.com/db')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://10.0.0.5/db')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://localhost/db#frag')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://localhost/db?host=evil')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://localhost/db?port=1')).toThrow(
      DatabasePreflightError
    );
    expect(() => validateLoopbackDatabaseUrl('postgres://localhost/db?options=-cfoo')).toThrow(
      DatabasePreflightError
    );
  });
});

describe('assertSupportedPostgresVersion', () => {
  it('accepts PostgreSQL 16 version numbers only', () => {
    expect(() => assertSupportedPostgresVersion(160_000)).not.toThrow();
    expect(() => assertSupportedPostgresVersion(169_999)).not.toThrow();
    expect(() => assertSupportedPostgresVersion(150_000)).toThrow(DatabasePreflightError);
    expect(() => assertSupportedPostgresVersion(170_000)).toThrow(DatabasePreflightError);
    expect(() => assertSupportedPostgresVersion(16.5)).toThrow(DatabasePreflightError);
    expect(() => assertSupportedPostgresVersion(Number.NaN)).toThrow(DatabasePreflightError);
  });
});

describe('getExpectedDatabaseTables', () => {
  it('collects drizzle tables with schema and columns', () => {
    const tables = getExpectedDatabaseTables();
    expect(tables.length).toBeGreaterThan(50);
    expect(tables.every((table) => table.name.length > 0 && table.columns.length > 0)).toBe(true);
    expect(tables.some((table) => table.schema === 'public' || table.schema === 'app')).toBe(true);
  });
});

describe('compareDatabaseSchema', () => {
  it('reports missing tables and columns', () => {
    const differences = compareDatabaseSchema(
      [
        { schema: 'public', name: 'patients', columns: ['id', 'name'] },
        { schema: 'app', name: 'ledger', columns: ['id'] }
      ],
      [{ schema: 'public', name: 'patients', columns: ['id'] }]
    );
    expect(differences.missingTables).toEqual(['app.ledger']);
    expect(differences.missingColumns).toEqual(['public.patients.name']);
  });

  it('returns empty differences when catalogs match', () => {
    const differences = compareDatabaseSchema(
      [{ schema: 'public', name: 't', columns: ['a', 'b'] }],
      [{ schema: 'public', name: 't', columns: ['a', 'b'] }]
    );
    expect(differences).toEqual({ missingTables: [], missingColumns: [] });
  });
});
