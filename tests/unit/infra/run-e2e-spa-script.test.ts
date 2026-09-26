import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const script = readFileSync(resolve(root, 'infra/scripts/run-e2e-spa.sh'), 'utf8');
const compose = readFileSync(resolve(root, 'docker-compose.e2e.yml'), 'utf8');

describe('run-e2e-spa.sh portability (R2-TOOL-01)', () => {
  it('does not depend on ripgrep or other non-POSIX tools', () => {
    expect(script).not.toMatch(/(^|[\s|])rg\s/m);
    expect(script).not.toMatch(/\bfd\s|\bbat\s/);
  });

  it('derives the database and redis URLs from configurable host ports', () => {
    expect(script).toContain('E2E_POSTGRES_HOST_PORT');
    expect(script).toContain('E2E_REDIS_HOST_PORT');
    expect(script).toContain('localhost:${E2E_POSTGRES_HOST_PORT}/cvg_his_e2e');
    expect(script).toContain('redis://127.0.0.1:${E2E_REDIS_HOST_PORT}');
    expect(script).not.toMatch(/localhost:5434\/cvg_his_e2e/);
    expect(script).not.toMatch(/127\.0\.0\.1:6381\b/);
  });

  it('falls back to a free port when the default host port is busy', () => {
    expect(script).toContain('host_port_in_use');
    expect(script).toContain('find_free_host_port');
    expect(script).toMatch(/resolve_host_port PostgreSQL "\$\{E2E_POSTGRES_HOST_PORT:-\}" 5434/);
    expect(script).toMatch(/resolve_host_port Redis "\$\{E2E_REDIS_HOST_PORT:-\}" 6381/);
    expect(script).toContain('export E2E_POSTGRES_HOST_PORT E2E_REDIS_HOST_PORT');
  });

  it('publishes the compose ports from the same variables', () => {
    expect(compose).toContain("'${E2E_POSTGRES_HOST_PORT:-5434}:5432'");
    expect(compose).toContain("'${E2E_REDIS_HOST_PORT:-6381}:6379'");
    expect(compose).not.toMatch(/'5434:5432'/);
    expect(compose).not.toMatch(/'6381:6379'/);
  });
});
