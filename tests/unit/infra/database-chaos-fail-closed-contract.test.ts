import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const runbook = readFileSync(
  resolve(root, 'packages/chaos/src/runbooks/database-failure-runbook.md'),
  'utf8'
);
const gameDay = readFileSync(resolve(root, 'docs/game-day/README.md'), 'utf8');
const openApi = readFileSync(resolve(root, 'apps/api/src/openapi.yaml'), 'utf8');
const alerts = readFileSync(resolve(root, 'infra/observability/prometheus-alerts.yml'), 'utf8');
const observability = readFileSync(resolve(root, 'infra/observability/README.md'), 'utf8');

describe('database chaos fail-closed documentation contract', () => {
  it('documents unavailable persistence and containment without destructive fallback', () => {
    expect(runbook).toContain('persistenceMode=unavailable');
    expect(runbook).toMatch(/must not accept clinical\s+or financial writes/);
    expect(runbook).not.toMatch(/switch(?:es)? to in-memory fallback mode/i);
    expect(runbook).not.toMatch(/writes made during in-memory mode will be lost/i);
    expect(runbook).not.toMatch(/Data Loss Risk/i);
  });

  it('keeps the game-day database experiment fail-closed', () => {
    const databaseSection =
      gameDay.split('## Experiment 5: Database Failure')[1]?.split('## Experiment 6:')[0] ?? '';

    expect(databaseSection).toContain('unavailable');
    expect(databaseSection).toContain('readiness');
    expect(databaseSection).not.toMatch(/switch(?:es)? to in-memory/i);
    expect(databaseSection).not.toMatch(/will be lost|may be lost|data loss/i);
  });

  it('publishes unavailable in the health persistence-mode enum', () => {
    expect(openApi).toContain("$ref: '#/components/schemas/HealthSummaryResponse'");
    const summarySchema =
      openApi.split('    HealthSummaryResponse:')[1]?.split('    HealthResponse:')[0] ?? '';
    expect(summarySchema).toContain('enum: [in-memory, database, unavailable, not-initialized]');
    const healthSchema =
      openApi.split('    HealthResponse:')[1]?.split('    LivenessResponse:')[0] ?? '';

    expect(healthSchema).toContain('enum: [in-memory, database, unavailable, not-initialized]');
  });

  it('keeps unavailable persistence alerting critical and free of loss claims', () => {
    expect(alerts).toContain('CVG_HIS_API_DatabasePersistenceUnavailable');
    expect(alerts).toContain('app_persistence_mode{mode="unavailable"} == 1');
    expect(alerts).toContain('rejeita mutações duráveis');
    expect(alerts).not.toContain('Dados serão perdidos em restart');
    expect(observability).toContain('CVG_HIS_API_DatabasePersistenceUnavailable');
    expect(observability).toContain('Liveness-only probe');
  });
});
