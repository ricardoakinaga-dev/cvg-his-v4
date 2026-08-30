import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const guardrail = resolve(root, 'scripts/check-migration-source-of-truth.mjs');

describe('database migration source-of-truth guardrail', () => {
  it('accepts only packages/db as the executable migration and seed surface', () => {
    expect(() =>
      execFileSync(process.execPath, [guardrail], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
      })
    ).not.toThrow();
  });
});
