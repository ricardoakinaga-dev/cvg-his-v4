import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { withPrivatePostgres } from './lib/private-postgres.mjs';
import { preparePrivateApiDatabase } from './lib/private-api-database.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('API preparation uses only its private context and is repeatable', { timeout: 300000 }, async () => {
  const result = await withPrivatePostgres({
    binDir: process.env.NATIVE_POSTGRES_BIN, shareDir: process.env.NATIVE_POSTGRES_SHARE, libraryDir: process.env.NATIVE_POSTGRES_LIB,
    run: async (context) => {
      const first = await preparePrivateApiDatabase({ root, ...context });
      const second = await preparePrivateApiDatabase({ root, ...context });
      assert.deepEqual(second.evidence.migrations, first.evidence.migrations);
      assert.ok(first.evidence.migrations.some((entry) => entry.migration_name === '0161_card_creation_attempts'));
      assert.equal(second.evidence.adminCount, 1);
      assert.equal(first.environment.DATABASE_URL, context.databaseUrl);
      assert.equal(first.environment.CVG_CRITICAL_PROCESS_RUNNER, '1');
      assert.equal(first.environment.MIGRATION_TARGET, undefined);
      assert.equal(first.environment.NODE_V8_COVERAGE, undefined);
      await assert.rejects(() => preparePrivateApiDatabase({ root, ...context, environment: { ...context.environment, DATABASE_URL_TEST: 'postgresql://localhost/existing' } }), /requires the private cluster/);
      return { migrations: first.evidence.migrations.length, steps: [...first.evidence.steps, ...second.evidence.steps] };
    }
  });
  assert.equal(result.evidence.stopped.code, 0);
  console.info(JSON.stringify(result));
});
