import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerResponse } from 'node:http';

import { applyBufferedResponse, createBufferedResponse } from './response-buffer.js';

function createTarget() {
  const headers = new Map<string, string | number | readonly string[]>();
  const target = {
    statusCode: 200,
    statusMessage: undefined as string | undefined,
    getHeaders: () => Object.fromEntries(headers),
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), value);
      return target;
    },
    end(body?: Buffer) {
      target.endedBody = body;
      return target;
    },
    endedBody: undefined as Buffer | undefined
  } as unknown as ServerResponse & { endedBody?: Buffer };
  target.setHeader('content-type', 'application/json');
  return target;
}

test('response buffer captures and replays status, headers and body', () => {
  const target = createTarget();
  const buffered = createBufferedResponse(target);

  buffered.response.statusCode = 201;
  buffered.response.setHeader('x-operation', 'created');
  buffered.response.end('{"ok":true}');

  const snapshot = buffered.snapshot();
  assert.equal(snapshot.statusCode, 201);
  assert.equal(snapshot.headers['x-operation'], 'created');
  assert.equal(Buffer.from(snapshot.bodyBase64, 'base64').toString(), '{"ok":true}');
  assert.equal(target.endedBody, undefined);

  applyBufferedResponse(target, snapshot);
  assert.equal(target.statusCode, 201);
  const endedBody = (target as unknown as { endedBody?: Buffer }).endedBody;
  assert.ok(endedBody);
  assert.deepEqual(endedBody, Buffer.from('{"ok":true}'));
});
