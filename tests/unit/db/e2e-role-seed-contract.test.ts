import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const seed = readFileSync(resolve(root, 'packages/db/src/seed.ts'), 'utf8');
const runner = readFileSync(resolve(root, 'infra/scripts/run-e2e-spa.sh'), 'utf8');

describe('E2E role matrix seed contract', () => {
  it('keeps the non-admin acceptance principal opt-in and wired end to end', () => {
    expect(seed).toContain('RECEPTION_EMAIL');
    expect(seed).toContain("roleName: 'reception'");
    expect(runner).toContain('RECEPTION_PASSWORD');
    expect(runner).toContain('RECEPTION_USERNAME');
  });
});
