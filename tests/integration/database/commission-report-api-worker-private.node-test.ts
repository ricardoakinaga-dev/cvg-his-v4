import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
// @ts-expect-error Private runtime helper is JavaScript.
import { withPrivatePostgres } from '../../../scripts/lib/private-postgres.mjs';
// @ts-expect-error Private migration helper is JavaScript.
import { preparePrivateApiDatabase } from '../../../scripts/lib/private-api-database.mjs';

// Optional private wrapper for the same regression selected by standard integration/critical runs.
test(
  'standard commission report regression on owned private PostgreSQL',
  { timeout: 180_000 },
  async () => {
    const result = await withPrivatePostgres({
      binDir: process.env.NATIVE_POSTGRES_BIN,
      shareDir: process.env.NATIVE_POSTGRES_SHARE,
      libraryDir: process.env.NATIVE_POSTGRES_LIB,
      run: async (context: {
        environment: Record<string, string>;
        directory: string;
        databaseUrl: string;
      }) => {
        await preparePrivateApiDatabase({ root: process.cwd(), ...context });
        const child = spawnSync(
          'pnpm',
          [
            'exec',
            'vitest',
            'run',
            'tests/integration/database/commission-report-api-worker-postgres.test.ts',
            '--config',
            'vitest.integration.config.ts',
            '--reporter=verbose'
          ],
          {
            cwd: process.cwd(),
            env: { PATH: process.env.PATH, ...context.environment },
            encoding: 'utf8',
            timeout: 120_000,
            maxBuffer: 8 * 1024 * 1024
          }
        );
        console.info(child.stdout);
        if (child.stderr) console.error(child.stderr);
        assert.equal(child.error, undefined);
        assert.equal(child.signal, null);
        assert.equal(child.status, 0);
        return { standardRegressionExitCode: child.status };
      }
    });
    assert.equal(result.evidence.stopped.code, 0);
    console.info(JSON.stringify(result));
  }
);
