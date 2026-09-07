import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const { createServer } = await import(vitestRequire.resolve('vite'));

const root = resolve(import.meta.dirname, '..');

test('database connection has one source implementation and no stale emitted companions', () => {
  for (const suffix of ['js', 'js.map', 'd.ts', 'd.ts.map']) {
    const path = resolve(root, `packages/db/src/connection.${suffix}`);
    assert.equal(
      existsSync(path),
      false,
      `source-level generated artifact shadows TypeScript: ${path}`
    );
  }
  assert.equal(existsSync(resolve(root, 'packages/db/src/connection.ts')), true);
});

test('Vite resolves the NodeNext connection.js import to canonical TypeScript without evaluating the database', async () => {
  const server = await createServer({
    root,
    configFile: false,
    envFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] }
  });
  try {
    const result = await server.pluginContainer.resolveId(
      './connection.js',
      resolve(root, 'packages/db/src/index.ts'),
      { ssr: true }
    );
    assert.ok(result);
    assert.equal(
      realpathSync(result.id),
      realpathSync(resolve(root, 'packages/db/src/connection.ts'))
    );
  } finally {
    await server.close();
  }
});
