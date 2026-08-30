import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import { runWithDatabaseTransactionScope } from '../../packages/shared/database/src/transaction-scope';

import {
  createAttachmentDownloadToken,
  verifyAttachmentDownloadToken
} from '../../apps/api/src/helpers/attachment-download-token';
import {
  applyBufferedResponse,
  createBufferedResponse
} from '../../apps/api/src/helpers/response-buffer';
import { createTenantCommandRunner } from '../../apps/api/src/helpers/tenant-command';
import { readJsonBody, readJsonBodyOrEmpty } from '../../apps/api/src/helpers/request-body';

function request(headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { headers } as IncomingMessage;
}

function readableRequest(chunks: readonly (string | Buffer)[]): IncomingMessage {
  return Readable.from(chunks) as unknown as IncomingMessage;
}

describe('HTTP command helper boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buffers and replays the complete HTTP response envelope', () => {
    const targetHeaders = new Map<string, string | number | readonly string[]>();
    const target = {
      statusCode: 200,
      statusMessage: undefined as string | undefined,
      getHeaders: () => Object.fromEntries(targetHeaders),
      setHeader(name: string, value: string | number | readonly string[]) {
        targetHeaders.set(name.toLowerCase(), value);
        return target;
      },
      end: vi.fn(),
      endedBody: undefined as Buffer | undefined
    } as unknown as ServerResponse;
    target.setHeader('content-type', 'application/json');

    const buffered = createBufferedResponse(target);
    expect(buffered.response.statusCode).toBe(200);
    expect(buffered.response.statusMessage).toBeUndefined();
    buffered.response.statusCode = 201;
    buffered.response.statusMessage = 'Created';
    buffered.response.setHeader('X-Trace', 'trace-1');
    buffered.response.writeHead(202, { 'X-Mode': 'async' });
    buffered.response.write('part-');
    buffered.response.end(Buffer.from('complete'), () => undefined);
    buffered.response.end('tail', 'utf8', () => undefined);
    buffered.response.write(undefined as never);
    buffered.response.end(null as never);
    expect(buffered.response.headersSent).toBe(true);
    expect(buffered.response.writableEnded).toBe(true);
    expect(buffered.response.getHeader('x-mode')).toBe('async');
    expect(buffered.response.getHeaders()).toMatchObject({ 'content-type': 'application/json' });
    expect(buffered.response.getHeaderNames()).toContain('x-mode');
    expect(buffered.response.hasHeader('x-trace')).toBe(true);
    buffered.response.removeHeader('x-trace');
    expect(buffered.response.hasHeader('x-trace')).toBe(false);
    buffered.response.flushHeaders();
    expect((buffered.response as unknown as { constructor: unknown }).constructor).toBeDefined();

    const snapshot = buffered.snapshot();
    expect(snapshot.statusCode).toBe(202);
    expect(snapshot.statusMessage).toBe('Created');
    expect(Buffer.from(snapshot.bodyBase64, 'base64').toString()).toBe('part-completetail');
    expect(snapshot.headers['x-mode']).toBe('async');

    applyBufferedResponse(target, snapshot);
    expect(target.statusCode).toBe(202);
    expect(target.statusMessage).toBe('Created');
    expect(target.end).toHaveBeenCalledWith(Buffer.from('part-completetail'));
  });

  it('handles response mocks without getHeaders and writeHead status messages', () => {
    const target = {
      statusCode: 200,
      statusMessage: undefined as string | undefined,
      setHeader: vi.fn(),
      end: vi.fn()
    } as unknown as ServerResponse;
    const buffered = createBufferedResponse(target);
    buffered.response.writeHead(203);
    buffered.response.statusMessage = null as never;
    buffered.response.writeHead(204, 'No Content', { 'X-Test': 'yes' });
    buffered.response.end('');
    expect(buffered.snapshot()).toMatchObject({
      statusCode: 204,
      statusMessage: 'No Content',
      headers: { 'x-test': 'yes' }
    });
  });

  it('validates signed attachment claims and malformed tokens', () => {
    const claims = {
      attachmentId: 'attachment-1',
      accountId: 'account-1',
      expiresAt: 2_000
    } as const;
    const token = createAttachmentDownloadToken('secret', claims);
    expect(verifyAttachmentDownloadToken('secret', token, 1_000)).toEqual(claims);
    expect(verifyAttachmentDownloadToken('wrong', token, 1_000)).toBeNull();
    expect(verifyAttachmentDownloadToken('secret', 'malformed', 1_000)).toBeNull();
    expect(verifyAttachmentDownloadToken('secret', `${token}x`, 1_000)).toBeNull();
    expect(verifyAttachmentDownloadToken('secret', token, 2_000)).toBeNull();

    const invalidPayload = Buffer.from(JSON.stringify({ expiresAt: 'never' }), 'utf8').toString(
      'base64url'
    );
    const invalidSignature = createHmac('sha256', 'secret')
      .update(invalidPayload, 'utf8')
      .digest('base64url');
    expect(
      verifyAttachmentDownloadToken('secret', `${invalidPayload}.${invalidSignature}`, 1_000)
    ).toBeNull();

    const invalidJson = Buffer.from('{not-json', 'utf8').toString('base64url');
    const invalidJsonSignature = createHmac('sha256', 'secret')
      .update(invalidJson, 'utf8')
      .digest('base64url');
    expect(
      verifyAttachmentDownloadToken('secret', `${invalidJson}.${invalidJsonSignature}`, 1_000)
    ).toBeNull();
  });

  it('runs commands directly without nested UoW and normalizes undefined responses', async () => {
    const command = vi.fn(async () => undefined);
    const runner = createTenantCommandRunner({
      environment: 'development',
      unitOfWork: {
        execute: vi.fn(async (_context, _payload, callback) => ({
          value: await callback({} as never),
          replayed: false
        }))
      }
    });

    const directResult = await runner({
      request: request({ 'idempotency-key': [' key-1 '] }),
      accountId: '00000000-0000-0000-0000-000000000001',
      actorUserId: 'actor-1',
      correlationId: 'correlation-1',
      operation: 'test.command',
      payload: {},
      command
    });
    expect(directResult).toBeNull();

    const scope = {
      accountId: '00000000-0000-0000-0000-000000000001',
      pool: {} as never,
      client: {} as never,
      isActive: () => true
    };
    const nestedCommand = vi.fn(async () => 'nested');
    const nestedResult = await runWithDatabaseTransactionScope(scope, () =>
      runner({
        request: request({ 'idempotency-key': 'key-2' }),
        accountId: scope.accountId,
        actorUserId: 'actor-1',
        correlationId: 'correlation-2',
        operation: 'test.nested',
        payload: {},
        command: nestedCommand
      })
    );
    expect(nestedResult).toBe('nested');
    expect(nestedCommand).toHaveBeenCalledOnce();
  });

  it('runs authorization before idempotency lookup and command execution', async () => {
    const phases: string[] = [];
    const runner = createTenantCommandRunner({
      environment: 'production',
      unitOfWork: {
        async execute(_context, _payload, command, beforeIdempotency) {
          phases.push('transaction-started');
          await beforeIdempotency?.({} as never);
          phases.push('idempotency-lookup');
          const value = await command({} as never);
          return { value, replayed: false };
        }
      }
    });

    await runner({
      request: request({ 'idempotency-key': 'request-authorized' }),
      accountId: '00000000-0000-0000-0000-000000000001',
      actorUserId: '00000000-0000-0000-0000-000000000002',
      correlationId: 'corr-authorized',
      operation: 'encounter.cash-receipt.reverse',
      payload: {},
      beforeIdempotency: async () => {
        phases.push('authorization');
      },
      command: async () => {
        phases.push('command');
        return 'committed';
      }
    });

    expect(phases).toEqual([
      'transaction-started',
      'authorization',
      'idempotency-lookup',
      'command'
    ]);
  });

  it('requires idempotency keys in production and allows non-UoW development commands', async () => {
    const productionRunner = createTenantCommandRunner({
      environment: 'production',
      unitOfWork: { execute: vi.fn() } as never
    });
    await expect(
      productionRunner({
        request: request(),
        accountId: '00000000-0000-0000-0000-000000000001',
        actorUserId: 'actor-1',
        correlationId: 'correlation-3',
        operation: 'test.command',
        payload: {},
        command: async () => 'never'
      })
    ).rejects.toBeInstanceOf(ValidationError);

    const command = vi.fn(async () => 'development');
    const developmentRunner = createTenantCommandRunner({ environment: 'development' });
    await expect(
      developmentRunner({
        request: request(),
        accountId: 'account-1',
        actorUserId: 'actor-1',
        correlationId: 'correlation-4',
        operation: 'test.command',
        payload: {},
        command
      })
    ).resolves.toBe('development');
    expect(command).toHaveBeenCalledOnce();
  });

  it('reads and caches JSON bodies, supports empty commands and rejects invalid input', async () => {
    const bodyRequest = readableRequest(['{"name":"', 'patient"}']);
    await expect(readJsonBody(bodyRequest)).resolves.toEqual({ name: 'patient' });
    await expect(readJsonBody(bodyRequest)).resolves.toEqual({ name: 'patient' });
    await expect(readJsonBodyOrEmpty(bodyRequest)).resolves.toEqual({ name: 'patient' });

    await expect(readJsonBody(readableRequest([Buffer.from('{"binary":true}')]))).resolves.toEqual({
      binary: true
    });

    await expect(readJsonBodyOrEmpty(readableRequest([]))).resolves.toEqual({});
    await expect(readJsonBody(readableRequest(['not-json']))).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(readJsonBodyOrEmpty(readableRequest(['not-json']))).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(readJsonBody(readableRequest(['12345']), 2)).rejects.toBeInstanceOf(
      ValidationError
    );

    const empty = readableRequest([]);
    await expect(readJsonBody(empty)).rejects.toBeInstanceOf(ValidationError);
    await expect(readJsonBody(empty)).rejects.toBeInstanceOf(ValidationError);
    await expect(readJsonBodyOrEmpty(empty)).resolves.toEqual({});
  });
});
