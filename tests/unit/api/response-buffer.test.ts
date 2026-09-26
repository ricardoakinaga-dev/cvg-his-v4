import type { ServerResponse } from 'node:http';

import { describe, expect, it } from 'vitest';

import { applyBufferedResponse, createBufferedResponse } from '../../../apps/api/src/helpers/response-buffer';

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
  return target;
}

describe('response buffer coverage', () => {
  it('counts optional writeHead headers and status message replay in Vitest coverage', () => {
    const target = createTarget();
    const buffered = createBufferedResponse(target);

    buffered.response.writeHead(204, 'No Content', { 'x-cache': 'hit' });
    buffered.response.statusMessage = 'Accepted';

    const snapshot = buffered.snapshot();
    expect(snapshot.statusMessage).toBe('Accepted');
    expect(snapshot.headers['x-cache']).toBe('hit');

    applyBufferedResponse(target, snapshot);
    expect(target.statusCode).toBe(204);
    expect(target.statusMessage).toBe('Accepted');
  });

  it('counts snapshots that omit an undefined status message', () => {
    const snapshot = createBufferedResponse(createTarget()).snapshot();

    expect(Object.hasOwn(snapshot, 'statusMessage')).toBe(false);
  });
});
