import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const apiEntrypoint = readFileSync(resolve(root, 'apps/api/src/index.ts'), 'utf8');
const workerEntrypoint = readFileSync(resolve(root, 'apps/worker/src/index.ts'), 'utf8');
const composeStack = readFileSync(resolve(root, 'docker-compose.v2.yml'), 'utf8');
const testComposeStack = readFileSync(resolve(root, 'docker-compose.test.yml'), 'utf8');

describe('canonical runtime lifecycle contract', () => {
  it('declares the API readiness healthcheck on the Compose service that dependents await', () => {
    const compose = YAML.parse(composeStack) as {
      readonly services?: Record<string, { readonly healthcheck?: { readonly test?: unknown } }>;
    };
    expect(compose.services?.['cvg-his-v2-api']?.healthcheck?.test).toEqual([
      'CMD-SHELL',
      'curl -fsS http://127.0.0.1:3001/ready >/dev/null || exit 1'
    ]);
  });

  it('budgets PostgreSQL shared memory for the concurrent DB-heavy test harness', () => {
    const compose = YAML.parse(testComposeStack) as {
      readonly services?: Record<string, { readonly shm_size?: string }>;
    };
    expect(compose.services?.['postgres-test']?.shm_size).toBe('1gb');
  });

  it('routes API signals through the service shutdown path', () => {
    expect(apiEntrypoint).toContain('shutdownServices');
    expect(apiEntrypoint).not.toMatch(/process\.exit\(/);
    expect(apiEntrypoint).toContain("process.on('SIGTERM'");
  });

  it('routes worker signals through the worker shutdown path', () => {
    expect(workerEntrypoint).toContain('shutdownWorkerServices');
    expect(workerEntrypoint).not.toMatch(/process\.exit\(/);
    expect(workerEntrypoint).toContain("process.on('SIGTERM'");
  });
});
