import { describe, expect, it } from 'vitest';

import { selectMigrationsThrough } from './migration-target.js';

describe('migration target selection', () => {
  const files = [
    { name: '0001_initial' },
    { name: '0002_accounts' },
    { name: '0003_runtime' },
  ] as const;

  it('selects an inclusive prefix for an upgrade fixture', () => {
    expect(selectMigrationsThrough(files, '0002_accounts')).toEqual(files.slice(0, 2));
  });

  it('returns all migrations when no target is configured', () => {
    expect(selectMigrationsThrough(files)).toBe(files);
  });

  it('fails closed for an unknown target', () => {
    expect(() => selectMigrationsThrough(files, '9999_missing')).toThrow(
      'unknown migration target: 9999_missing'
    );
  });
});
