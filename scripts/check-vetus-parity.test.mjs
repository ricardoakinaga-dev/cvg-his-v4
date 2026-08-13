import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const script = readFileSync(new URL('./check-vetus-parity.mjs', import.meta.url), 'utf8');

test('Vetus parity follows the extracted service routes instead of the former server monolith', () => {
  assert.match(script, /apps\/api\/src\/routes\/products-services-routes\.ts/);
  assert.doesNotMatch(script, /text\('apps\/api\/src\/server\.ts', \/pathname === '\\\/services'/);
});

test('Vetus parity verifies the extracted encounter and queue synchronization contracts', () => {
  assert.match(script, /apps\/api\/src\/routes\/encounters-routes\.ts/);
  assert.match(script, /apps\/api\/src\/routes\/encounter-queue-sync\.ts/);
  assert.match(script, /packages\/modules\/scheduling\/src\/scheduling\.test\.ts/);
});
