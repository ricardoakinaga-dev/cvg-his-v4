import { describe, expect, it } from 'vitest';

import { getMigrationFiles } from '../../../packages/db/src/migration-files.ts';

describe('getMigrationFiles', () => {
  it('returns sorted SQL migrations with sha256 checksums', () => {
    const files = getMigrationFiles();
    expect(files.length).toBeGreaterThan(10);
    const names = files.map((file) => file.name);
    expect([...names].sort()).toEqual(names);
    expect(files.every((file) => file.path.endsWith('.sql'))).toBe(true);
    expect(files.every((file) => /^[0-9a-f]{64}$/.test(file.checksum))).toBe(true);
    expect(names.some((name) => name.endsWith('.revert'))).toBe(false);
    // getMigrationFiles only drops *.seed.sql / *.revert.sql file suffixes; some
    // numbered migrations still contain "seed" in the stem and must remain.
    expect(files.every((file) => !file.path.endsWith('.seed.sql'))).toBe(true);
    expect(files.every((file) => !file.path.endsWith('.revert.sql'))).toBe(true);
  });

  it('is deterministic across calls', () => {
    const first = getMigrationFiles();
    const second = getMigrationFiles();
    expect(second.map((file) => file.checksum)).toEqual(first.map((file) => file.checksum));
  });
});
