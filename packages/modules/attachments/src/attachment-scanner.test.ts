import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { ClamAvAttachmentSecurityScanner } from './index.js';

describe('ClamAvAttachmentSecurityScanner', () => {
  const servers: ReturnType<typeof createServer>[] = [];
  const peers = new Set<Socket>();

  afterEach(async () => {
    for (const peer of peers) peer.destroy();
    peers.clear();
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

  it('uses ClamAV PING as a bounded, side-effect-free health probe', async () => {
    const server = createServer((socket) => {
      socket.once('data', (command) => {
        assert.equal(command.toString('ascii'), 'zPING\0');
        socket.end('PONG\0');
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
      timeoutMs: 200
    });

    await expect(scanner.healthCheck()).resolves.toEqual({
      healthy: true,
      provider: 'clamav',
      detail: 'ClamAV attachment scanner is reachable.'
    });
  });

  it('fails health closed when ClamAV does not answer before the deadline', async () => {
    const server = createServer((socket) => {
      // Outlive the client deadline, then close so test teardown cannot retain
      // an intentionally stalled peer connection.
      setTimeout(() => socket.destroy(), 100);
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
      timeoutMs: 20
    });

    const startedAt = Date.now();
    const health = await scanner.healthCheck();
    expect(health.healthy).toBe(false);
    expect(health.detail).not.toContain('127.0.0.1');
    expect(Date.now() - startedAt).toBeLessThan(500);
  });

  it('cancels a stalled health probe when the caller aborts', async () => {
    let observeConnection!: () => void;
    let observeClose!: () => void;
    const peerConnected = new Promise<void>((resolve) => {
      observeConnection = resolve;
    });
    const peerClosed = new Promise<void>((resolve) => {
      observeClose = resolve;
    });
    const server = createServer((socket) => {
      observeConnection();
      socket.once('close', observeClose);
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
      timeoutMs: 5_000
    });
    const controller = new AbortController();
    const health = scanner.healthCheck({ signal: controller.signal });
    await peerConnected;
    controller.abort();

    await expect(health).resolves.toMatchObject({ healthy: false });
    await peerClosed;
  });

  it('enforces one absolute deadline while waiting for the INSTREAM verdict', async () => {
    let observeConnection!: () => void;
    const peerConnected = new Promise<void>((resolve) => {
      observeConnection = resolve;
    });
    const server = createServer({ allowHalfOpen: true }, (socket) => {
      peers.add(socket);
      socket.once('close', () => peers.delete(socket));
      observeConnection();
      socket.on('data', () => undefined);
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
      timeoutMs: 50
    });
    const startedAt = Date.now();
    const scan = scanner.scan({
      fileName: 'never-finishes.pdf',
      mimeType: 'application/pdf',
      content: Buffer.alloc(2 * 1024 * 1024, 1)
    });
    await peerConnected;

    await expect(scan).rejects.toThrow('ClamAV scanner timed out');
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
