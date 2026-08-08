import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { ClamAvAttachmentSecurityScanner } from './index.js';

describe('ClamAvAttachmentSecurityScanner', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            if (!server.listening) {
              resolve();
              return;
            }
            server.close(() => resolve());
          })
      )
    );
  });

  it('speaks the INSTREAM protocol and preserves clean/infected verdicts', async () => {
    const server = createServer((socket) => {
      const chunks: Buffer[] = [];
      socket.on('data', (chunk) => chunks.push(chunk));
      socket.on('end', () => {
        const request = Buffer.concat(chunks);
        assert.equal(request.subarray(0, 10).toString('ascii'), 'zINSTREAM\0');
        const verdict = request.includes(Buffer.from('infected'))
          ? 'stream: Eicar-Test-Signature FOUND\n'
          : 'stream: OK\n';
        socket.end(verdict);
      });
    });
    servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const scanner = new ClamAvAttachmentSecurityScanner({
      host: '127.0.0.1',
      port: address.port,
      timeoutMs: 1_000
    });
    const clean = await scanner.scan({
      fileName: 'clean.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('%PDF-1.7 clean')
    });
    const infected = await scanner.scan({
      fileName: 'infected.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('%PDF-1.7 infected')
    });

    expect(clean).toEqual({ status: 'available', provider: 'clamav' });
    expect(infected).toMatchObject({
      status: 'rejected',
      provider: 'clamav'
    });
    expect(infected.reason).toContain('FOUND');
  });
});
