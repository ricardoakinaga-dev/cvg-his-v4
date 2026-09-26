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
  headers: Record<string, string | string[]> = {}
): IncomingMessage {
  const request = Readable.from(chunks) as IncomingMessage;
  Object.assign(request, { headers });
  return request;
}

function requestWithStickyListeners(): IncomingMessage {
  const request = new EventEmitter() as IncomingMessage;
  Object.assign(request, {
    headers: {},
    once: request.on.bind(request),
    removeListener: () => request
  });
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

  it('ignores malformed, array and unsafe content-length declarations', async () => {
    await expect(
      readRawRequestBody(requestFromChunks(['{}'], { 'content-length': ['2'] }), 65_536)
    ).resolves.toEqual(Buffer.from('{}'));
    await expect(
      readRawRequestBody(requestFromChunks(['{}'], { 'content-length': 'not-a-number' }), 65_536)
    ).resolves.toEqual(Buffer.from('{}'));
    await expect(
      readRawRequestBody(
        requestFromChunks(['{}'], { 'content-length': '999999999999999999999999' }),
        65_536
      )
    ).resolves.toEqual(Buffer.from('{}'));
  });

  it('wraps a stream conversion failure without leaking the original error type', async () => {
    const request = new EventEmitter() as IncomingMessage;
    Object.assign(request, { headers: {} });
    const pending = readRawRequestBody(request, 65_536);
    request.emit('data', Symbol('invalid-body-chunk'));
    await expect(pending).rejects.toMatchObject({
      name: 'RawRequestBodyStreamError',
      code: 'RAW_BODY_STREAM_ERROR'
    });
  });

  it('surfaces an aborted stream as a dedicated error', async () => {
    const request = new EventEmitter() as IncomingMessage;
    Object.assign(request, { headers: {} });
    const pending = readRawRequestBody(request, 65_536);
    request.emit('aborted');
    await expect(pending).rejects.toBeInstanceOf(RawRequestBodyAbortedError);
  });

  it('ignores late data, abort and end signals after the stream settles', async () => {
    const request = requestWithStickyListeners();
    const pending = readRawRequestBody(request, 65_536);

    request.emit('end');
    await expect(pending).resolves.toEqual(Buffer.alloc(0));

    request.emit('data', 'late');
    request.emit('aborted');
    request.emit('end');
  });
});
