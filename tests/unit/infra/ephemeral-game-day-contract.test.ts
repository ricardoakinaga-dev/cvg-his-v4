import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/ephemeral-game-day.yml'), 'utf8');
const runner = readFileSync(resolve(root, 'infra/scripts/run-ephemeral-game-day.mjs'), 'utf8');

describe('ephemeral game-day contract', () => {
  it('runs periodically against disposable PostgreSQL and Redis from an exact main SHA', () => {
    expect(workflow).toContain("cron: '0 13 1 */3 *'");
    expect(workflow).toContain('POSTGRES_DB: cvg_his_v2_game_day');
    expect(workflow).toContain('image: redis:7-alpine');
    expect(workflow).toContain('git merge-base --is-ancestor "${REQUESTED_SHA}" origin/main');
    expect(workflow).toContain('NODE_ENV: test');
    expect(workflow).toContain("API_DISABLE_INCOMPATIBLE_DB_REPOS: '0'");
    expect(workflow).toContain('GAME_DAY_CONFIRMATION: EPHEMERAL-TEST-ONLY');
    expect(workflow).toContain('retention-days: 90');
  });

  it('refuses accidental remote execution and always cleans active experiments', () => {
    expect(runner).toContain("confirmation !== 'EPHEMERAL-TEST-ONLY'");
    expect(runner).toContain('!loopback && !allowRemote');
    expect(runner).toContain('ensureNoActiveExperiments(token)');
    expect(runner).toContain("rateLimiterMode !== 'fail-closed'");
    expect(runner).toContain("persistenceMode !== 'unavailable'");
    expect(runner).toContain('workerReady !== false');
  });

  it('covers every runbook fault family and emits machine-readable evidence', () => {
    for (const id of [
      'api-latency',
      'network-latency',
      'redis-failure',
      'worker-failure',
      'provider-failure',
      'database-failure'
    ]) {
      expect(runner).toContain(`id: '${id}'`);
    }
    expect(runner).toContain("'game-day-report.json'");
    expect(workflow).toContain('path: |\n            artifacts/game-day/');
  });
});
