import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_ATTACHMENT_JSON_BODY_BYTES } from '@cvg-his-v2/shared-contracts';
import { PayloadTooLargeError } from '@cvg-his-v2/shared-errors';

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
    (error) =>
      error instanceof PayloadTooLargeError &&
      error.statusCode === 413 &&
      error.code === 'PAYLOAD_TOO_LARGE'
  );
});

test('readJsonBody rejects a declared oversized body before consuming the stream', async () => {
  let consumed = false;
  const request = {
    headers: { 'content-length': '1200001' },
    [Symbol.asyncIterator]: async function* () {
      consumed = true;
      yield Buffer.alloc(1);
    }
  } as never;

  await assert.rejects(
    () => readJsonBody(request, 1_200_000),
    (error) => error instanceof PayloadTooLargeError && error.statusCode === 413
  );
  assert.equal(consumed, false);
});

test('readJsonBody rejects an unrepresentably large declared body before consuming the stream', async () => {
  let consumed = false;
  const request = {
    headers: { 'content-length': '999999999999999999999999' },
    [Symbol.asyncIterator]: async function* () {
      consumed = true;
      yield Buffer.alloc(1);
    }
  } as never;

  await assert.rejects(
    () => readJsonBody(request, 1_200_000),
    (error) => error instanceof PayloadTooLargeError && error.statusCode === 413
  );
  assert.equal(consumed, false);
});

test('readJsonBody permits the attachment body frontier and rejects one byte above it', async () => {
  const frontierRequest = {
    headers: { 'content-length': String(MAX_ATTACHMENT_JSON_BODY_BYTES) },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from('{}');
    }
  } as never;
  assert.deepEqual(
    await readJsonBody(frontierRequest, MAX_ATTACHMENT_JSON_BODY_BYTES),
    {}
  );

  const aboveFrontierRequest = {
    headers: { 'content-length': String(MAX_ATTACHMENT_JSON_BODY_BYTES + 1) },
    [Symbol.asyncIterator]: async function* () {
      throw new Error('must not consume an oversized request');
    }
  } as never;
  await assert.rejects(
    () => readJsonBody(aboveFrontierRequest, MAX_ATTACHMENT_JSON_BODY_BYTES),
    (error) => error instanceof PayloadTooLargeError && error.statusCode === 413
  );
});
