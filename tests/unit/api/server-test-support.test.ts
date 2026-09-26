import { describe, expect, it } from 'vitest';

import { MockResponse } from '../../../apps/api/src/server-test-support.ts';

describe('MockResponse test double', () => {
  it('captures status, headers and body text/json', async () => {
    const response = new MockResponse();
    response.writeHead(201, { 'Content-Type': 'application/json', 'X-Test': 'yes' });
    response.write('{"ok":');
    response.end('true}');

    await response.waitForEnd();
    expect(response.statusCode).toBe(201);
    expect(response.getHeader('content-type')).toBe('application/json');
    expect(response.getHeader('X-Test')).toBe('yes');
    expect(response.bodyText()).toBe('{"ok":true}');
    expect(response.bodyJson<{ ok: boolean }>()).toEqual({ ok: true });
  });

  it('supports end() with a callback and empty bodies', async () => {
    const response = new MockResponse();
    let called = false;
    response.end(() => {
      called = true;
    });
    await response.waitForEnd();
    expect(called).toBe(true);
    expect(response.bodyText()).toBe('');
    expect(response.statusCode).toBe(200);
  });

  it('supports writeHead without headers and string chunks', async () => {
    const response = new MockResponse();
    response.writeHead(204);
    response.end('no-content');
    await response.waitForEnd();
    expect(response.statusCode).toBe(204);
    expect(response.bodyText()).toBe('no-content');
  });
});
