import { Readable, Writable } from 'node:stream';
import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkflowTaskService } from '@cvg-his-v2/module-workflows';
import { ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleWorkflowTaskRoutes } from './workflow-task-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  readonly #body: Buffer;
  #sent = false;

  constructor(input: { method: string; url: string; body?: unknown; headers?: Record<string, string> }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = { ...(input.headers ?? {}) };
    this.#body = input.body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(input.body));
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }
    this.#sent = true;
    if (this.#body.length > 0) this.push(this.#body);
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
    return this;
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function principal(accountId = '11111111-1111-4111-8111-111111111111'): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: '22222222-2222-4222-8222-222222222222' as never,
      accountId: accountId as never,
      username: 'operator',
      email: 'operator@example.test',
      displayName: 'Operator',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {} as never,
    access: { roleCodes: ['admin'], permissionCodes: [], capabilities: [] }
  };
}

function handlers(service: WorkflowTaskService, accountId?: string, permissions?: string[]) {
  const auditEntries: string[] = [];
  return {
    audit: {
      write: (entry: { readonly action: string }) => {
        auditEntries.push(entry.action);
        return { correlationId: 'audit-correlation' };
      },
      writeAndWait: async (entry: { readonly action: string }) => {
        auditEntries.push(entry.action);
        return { correlationId: 'audit-correlation' };
      }
    } as never,
    workflowTasks: service,
    requirePrincipal: (_request: unknown, permissionCode: string) => {
      assert.equal(permissions?.includes(permissionCode) ?? true, true);
      return principal(accountId);
    },
    auditEntries
  };
}

test('workflow task routes expose a bounded public projection and lifecycle commands', async () => {
  const service = new WorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  const routeHandlers = handlers(service);
  const createResponse = new MockResponse();
  await handleWorkflowTaskRoutes(
    '/workflow-tasks',
    new MockRequest({
      method: 'POST',
      url: '/workflow-tasks',
      headers: { 'idempotency-key': 'http-task-1' },
      body: {
        taskType: 'clinical.follow_up',
        title: 'Revisar retorno',
        dueAt: '2026-09-09T09:00:00.000Z'
      }
    }) as never,
    createResponse as never,
    'corr-http-create',
    routeHandlers
  );
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; fingerprint?: string; leaseToken?: string }>();
  assert.ok(created.id);
  assert.equal(created.fingerprint, undefined);
  assert.equal(created.leaseToken, undefined);

  const listResponse = new MockResponse();
  await handleWorkflowTaskRoutes(
    '/workflow-tasks',
    new MockRequest({ method: 'GET', url: '/workflow-tasks?limit=10' }) as never,
    listResponse as never,
    'corr-http-list',
    routeHandlers
  );
  assert.equal(listResponse.bodyJson<{ count: number }>().count, 1);

  const acknowledgeResponse = new MockResponse();
  await handleWorkflowTaskRoutes(
    `/workflow-tasks/${created.id}/acknowledge`,
    new MockRequest({ method: 'POST', url: `/workflow-tasks/${created.id}/acknowledge` }) as never,
    acknowledgeResponse as never,
    'corr-http-ack',
    routeHandlers
  );
  assert.equal(acknowledgeResponse.bodyJson<{ status: string }>().status, 'acknowledged');

  const completeResponse = new MockResponse();
  await handleWorkflowTaskRoutes(
    `/workflow-tasks/${created.id}/complete`,
    new MockRequest({ method: 'POST', url: `/workflow-tasks/${created.id}/complete` }) as never,
    completeResponse as never,
    'corr-http-complete',
    routeHandlers
  );
  assert.equal(completeResponse.bodyJson<{ status: string }>().status, 'completed');
  assert.deepEqual(routeHandlers.auditEntries, ['create_task', 'list_tasks', 'acknowledge_task', 'complete_task']);
});

test('workflow task route permissions distinguish replay from normal task management', async () => {
  const service = new WorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  const task = await service.create('11111111-1111-4111-8111-111111111111' as never, '22222222-2222-4222-8222-222222222222' as never, {
    taskType: 'clinical.follow_up',
    title: 'DLQ task',
    executionMode: 'worker',
    dueAt: '2026-09-09T09:00:00.000Z',
    idempotencyKey: 'dlq-1',
    maxAttempts: 1
  });
  const claim = (await service.claimDue({
    accountId: task.accountId,
    workerId: 'worker-test',
    correlationId: 'corr-worker' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1000
  }))[0]!;
  await service.failClaim(claim, 'permanent failure');

  const beforeDeniedReplay = await service.getOrThrow(task.accountId, task.id);
  const eventsBeforeDeniedReplay = await service.events(task.accountId, task.id);
  assert.equal(beforeDeniedReplay.status, 'dlq');
  const deniedHandlers = handlers(service);
  const permissionChecks: string[] = [];
  deniedHandlers.requirePrincipal = (_request: unknown, permissionCode: string) => {
    permissionChecks.push(permissionCode);
    // Normal task operators may read/manage tasks, but cannot authorize replay.
    if (!['workflow-tasks.read', 'workflow-tasks.manage'].includes(permissionCode)) {
      throw new ForbiddenError('Replay permission is required');
    }
    return principal();
  };
  await assert.rejects(
    handleWorkflowTaskRoutes(
      `/workflow-tasks/${task.id}/replay`,
      new MockRequest({ method: 'POST', url: `/workflow-tasks/${task.id}/replay` }) as never,
      new MockResponse() as never,
      'corr-http-replay-denied',
      deniedHandlers
    ),
    ForbiddenError
  );
  assert.deepEqual(permissionChecks, ['workflow-tasks.replay']);
  assert.deepEqual(await service.getOrThrow(task.accountId, task.id), beforeDeniedReplay);
  assert.deepEqual(await service.events(task.accountId, task.id), eventsBeforeDeniedReplay);
  assert.deepEqual(deniedHandlers.auditEntries, []);

  const response = new MockResponse();
  const routeHandlers = handlers(service, undefined, ['workflow-tasks.replay']);
  await handleWorkflowTaskRoutes(
    `/workflow-tasks/${task.id}/replay`,
    new MockRequest({ method: 'POST', url: `/workflow-tasks/${task.id}/replay` }) as never,
    response as never,
    'corr-http-replay',
    routeHandlers
  );
  assert.equal(response.bodyJson<{ status: string }>().status, 'pending');
  assert.deepEqual(routeHandlers.auditEntries, ['replay_task']);
  assert.deepEqual(
    (await service.events(task.accountId, task.id)).map((event) => event.eventType),
    ['created', 'claimed', 'dead_lettered', 'replayed']
  );
});
