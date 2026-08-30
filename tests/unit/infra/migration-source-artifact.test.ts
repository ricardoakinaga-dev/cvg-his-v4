import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

describe('canonical migration source artifacts', () => {
  it('does not retain stale source-level migration artifacts or Drizzle-kit config', () => {
    const forbiddenArtifacts = [
      'packages/db/src/migrate.js',
      'packages/db/src/migrate.d.ts',
      'packages/db/src/migrate.js.map',
      'packages/db/src/migrate.d.ts.map',
      'packages/db/drizzle.config.ts'
    ];

    for (const artifact of forbiddenArtifacts) {
      expect(existsSync(resolve(root, artifact)), artifact).toBe(false);
    }
  });
});
