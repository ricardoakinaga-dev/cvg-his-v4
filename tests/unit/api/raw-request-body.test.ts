import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';

import {
  RawRequestBodyAbortedError,
  RawRequestBodyTooLargeError,
  readRawRequestBody
} from '../../../apps/api/src/helpers/raw-request-body';

function requestFromChunks(
  chunks: readonly (string | Buffer)[],
  headers: Record<string, string> = {}
): IncomingMessage {
  const request = Readable.from(chunks) as IncomingMessage;
  Object.assign(request, { headers });
  return request;
}

describe('raw request body reader', () => {
  it('preserves bytes across chunks and replays the same buffer for the same request', async () => {
    const request = requestFromChunks([Buffer.from([0xef]), Buffer.from([0xbb, 0xbf, 0x7b, 0x7d])]);

    const first = await readRawRequestBody(request, 65_536);
    const second = await readRawRequestBody(request, 65_536);

    expect(first).toEqual(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]));
    expect(second).toBe(first);
  });

  it('enforces the inclusive 65,536-byte limit while streaming', async () => {
    const accepted = requestFromChunks([Buffer.alloc(65_535), Buffer.from([0x7b])]);
    await expect(readRawRequestBody(accepted, 65_536)).resolves.toHaveLength(65_536);

    const rejected = requestFromChunks([Buffer.alloc(65_536), Buffer.from([0x7d])]);
    await expect(readRawRequestBody(rejected, 65_536)).rejects.toBeInstanceOf(RawRequestBodyTooLargeError);
  });

  it('does not trust an undersized content-length when the stream exceeds the limit', async () => {
    const request = requestFromChunks([Buffer.alloc(65_537)], { 'content-length': '1' });
    await expect(readRawRequestBody(request, 65_536)).rejects.toBeInstanceOf(RawRequestBodyTooLargeError);
  });

  it('rejects a declared content-length over the limit before parsing JSON', async () => {
    const request = requestFromChunks([], { 'content-length': '65537' });
    await expect(readRawRequestBody(request, 65_536)).rejects.toBeInstanceOf(RawRequestBodyTooLargeError);
  });

  it('surfaces an aborted stream as a dedicated error', async () => {
    const request = new EventEmitter() as IncomingMessage;
    Object.assign(request, { headers: {} });
    const pending = readRawRequestBody(request, 65_536);
    request.emit('aborted');
    await expect(pending).rejects.toBeInstanceOf(RawRequestBodyAbortedError);
  });
});
