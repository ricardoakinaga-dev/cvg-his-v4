import assert from 'node:assert/strict';
import { readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const { createServer } = await import(vitestRequire.resolve('vite'));
const root = resolve(import.meta.dirname, '..');
const schema = resolve(root, 'packages/db/src/schema');
const sources = readdirSync(schema).filter(
  (name) => name.endsWith('.ts') && !name.endsWith('.d.ts')
);

test('database schema contains canonical TypeScript rather than emitted source-level companions', () => {
  assert.ok(sources.length > 0);
  const generated = readdirSync(schema, { recursive: true }).filter((name) =>
    /\.(?:js|js\.map|d\.ts|d\.ts\.map)$/.test(name)
  );
  assert.deepEqual(generated, [], 'generated runtime/declarations belong in dist, not src/schema');
});

test('Vite resolves every schema NodeNext .js import to its TypeScript source without opening a database', async () => {
  const server = await createServer({
    root,
    configFile: false,
    envFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] }
  });
  try {
    for (const source of sources) {
      const result = await server.pluginContainer.resolveId(
        `./${source.slice(0, -3)}.js`,
        resolve(schema, '__resolution_probe__.ts'),
        { ssr: true }
      );
      assert.ok(result, source);
      assert.equal(realpathSync(result.id), realpathSync(resolve(schema, source)), source);
    }
  } finally {
    await server.close();
  }
});
