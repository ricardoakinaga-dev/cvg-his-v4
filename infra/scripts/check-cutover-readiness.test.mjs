import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildChecks,
  findLatestForwardMigrationName
} from './check-cutover-readiness.mjs';

test('finds the latest forward migration and ignores rollback/seed files', () => {
  const latest = findLatestForwardMigrationName([
    '0000_initial.sql',
    '0068_discharges.sql',
    '0069_inventory_optimistic_concurrency.sql',
    '0069_inventory_optimistic_concurrency.revert.sql',
    '0069_inventory_optimistic_concurrency.seed.sql'
  ]);

  assert.equal(latest, '0069_inventory_optimistic_concurrency.sql');
});

test('fails the deploy documentation check when the document references a stale migration', () => {
  const checks = buildChecks(
    {
      readme: 'apps/spa frontend canonico pnpm deploy:check',
      install: 'build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa',
      directives: 'cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa',
      compose: 'cvg-his-v2-spa:',
      envExample: 'NODE_ENV=production CORS_ALLOWED_ORIGINS=https://his.example.com',
      caddy: 'reverse_proxy 127.0.0.1:3002 reverse_proxy 127.0.0.1:3003',
      deployDoc: 'pnpm deploy:check\n0012_audit_events_alignment.sql',
      cutoverChecklist: '3002 3003 cvg-his-v2-spa',
      policy: 'packages/db/src/migrate.ts packages/db/src/seed.ts packages/shared/database/src/migrations/001-016 deprecada'
    },
    '0069_inventory_optimistic_concurrency.sql'
  );

  const migrationCheck = checks.find(
    ({ label }) => label === 'doc vivo de deploy referencia o guardrail de deploy'
  );

  assert.equal(migrationCheck?.ok, false);
});
