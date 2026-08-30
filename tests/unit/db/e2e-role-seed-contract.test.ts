import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const seed = readFileSync(resolve(root, 'packages/db/src/seed.ts'), 'utf8');
const runner = readFileSync(resolve(root, 'infra/scripts/run-e2e-spa.sh'), 'utf8');
const compose = readFileSync(resolve(root, 'docker-compose.e2e.yml'), 'utf8');

describe('E2E role matrix seed contract', () => {
  it('keeps the non-admin acceptance principal opt-in and wired end to end', () => {
    expect(seed).toContain('RECEPTION_EMAIL');
    expect(seed).toContain("roleName: 'reception'");
    expect(runner).toContain('RECEPTION_PASSWORD');
    expect(runner).toContain('RECEPTION_USERNAME');
  });

  it('boots the installer capability role before migrations in the Docker harness', () => {
    expect(compose).toContain('./infra/postgres/init-runtime-role.sh');
    expect(compose).toContain('POSTGRES_RUNTIME_PASSWORD');
    expect(compose).toContain('POSTGRES_API_USER');
    expect(compose).toContain('POSTGRES_WORKER_USER');
  });
});
