import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { MAX_JSON_BODY_BYTES, readJsonBody } from './common.js';

function requestFromChunks(chunks: readonly string[]): Parameters<typeof readJsonBody>[0] {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })() as never;
}

test('readJsonBody parses valid JSON across chunks', async () => {
  const body = await readJsonBody(requestFromChunks(['{"name":', '"CVG"}']));

  assert.deepEqual(body, { name: 'CVG' });
});

test('readJsonBody rejects payloads larger than the configured limit', async () => {
  const oversizedPayload = 'x'.repeat(MAX_JSON_BODY_BYTES + 1);

  await assert.rejects(
    () => readJsonBody(requestFromChunks([JSON.stringify({ oversizedPayload })])),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /maximum size/i);
      return true;
    }
  );
});
