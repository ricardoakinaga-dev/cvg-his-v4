import assert from 'node:assert/strict';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { readJsonBody } from './common.js';

function requestWithChunks(chunks: readonly Buffer[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    }
  } as never;
}

test('readJsonBody rejects payloads larger than the configured limit', async () => {
  await assert.rejects(
    () => readJsonBody(requestWithChunks([Buffer.alloc(600_000), Buffer.alloc(600_000)])),
    (error) => error instanceof ValidationError && error.message === 'Request body is too large'
  );
});
