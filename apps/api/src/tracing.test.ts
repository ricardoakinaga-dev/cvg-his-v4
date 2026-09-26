import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ServerResponse } from 'node:http';
import test from 'node:test';

import {
  ROOT_CONTEXT,
  context as otelContext,
  trace as otelTrace,
  type Context,
  type ContextManager
} from '@opentelemetry/api';

import {
  extractTraceContext,
  injectTraceContext,
  sanitizeHttpTarget,
  tracingMiddleware,
  type TraceableIncomingMessage
} from './tracing.js';
import { attachHttpRequestTelemetry } from './http-request-telemetry.js';

/** The API package intentionally does not install a global context manager. */
class TestContextManager implements ContextManager {
  readonly #storage = new AsyncLocalStorage<Context>();

  active(): Context {
    return this.#storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this.#storage.run(context, () => fn.apply(thisArg, args));
  }

  bind<T>(_context: Context, target: T): T {
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this.#storage.disable();
    return this;
  }
}

otelContext.setGlobalContextManager(new TestContextManager());

function createRequest(headers: Record<string, string> = {}): TraceableIncomingMessage {
  return {
    method: 'GET',
    url: '/health',
    headers
  } as unknown as TraceableIncomingMessage;
}

function createResponse(): { response: ServerResponse; headers: Map<string, string> } {
  const headers = new Map<string, string>();
  const response = {
    setHeader(name: string, value: string): void {
      headers.set(name.toLowerCase(), value);
    }
  } as unknown as ServerResponse;
  return { response, headers };
}

test('tracing middleware creates the request span before dispatch and activates OTel context', async () => {
  const request = createRequest({
    traceparent: '00-11111111111111111111111111111111-2222222222222222-01'
  });
  const { response, headers } = createResponse();
  let dispatched = false;

  await tracingMiddleware(request, response, () => {
    dispatched = true;
    assert.ok(request.span);
    const activeSpanContext = otelTrace.getSpan(otelContext.active())?.spanContext();
    assert.ok(activeSpanContext);
    assert.equal(activeSpanContext?.traceId, request.span?.otelSpan?.spanContext().traceId);
  });

  assert.equal(dispatched, true);
  assert.ok(request.span);
  assert.equal(request.traceContext?.traceId, '11111111111111111111111111111111');
  assert.equal(headers.get('x-trace-id'), request.span.context.traceId);
  assert.equal(headers.get('tracestate'), 'cvg-api=1');
  assert.match(headers.get('traceparent') ?? '', /^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/);
  assert.equal(extractTraceContext(request)?.spanId, '2222222222222222');
});

test('telemetry target removes query credentials from span-safe HTTP targets', () => {
  assert.equal(
    sanitizeHttpTarget('/attachments/attachment-1/content?token=secret-token&download=1'),
    '/{resource}/:id'
  );
  assert.equal(sanitizeHttpTarget('/patients/patient-private-123?access_token=secret'), '/{resource}/:id');
  assert.equal(sanitizeHttpTarget(undefined), '/');

  const headers: Record<string, string> = {};
  injectTraceContext(headers, {
    traceId: '11111111111111111111111111111111',
    spanId: '2222222222222222',
    traceFlags: 1
  });
  assert.equal(headers.tracestate, 'cvg-api=1');
});

test('tracing middleware awaits async handlers and preserves handler errors', async () => {
  const request = createRequest();
  const { response } = createResponse();
  const events: string[] = [];

  await assert.rejects(
    tracingMiddleware(request, response, async () => {
      events.push('start');
      await Promise.resolve();
      events.push('end');
      throw new Error('handler failed');
    }),
    /handler failed/
  );

  assert.deepEqual(events, ['start', 'end']);
});

test('tracing span names omit dynamic resource IDs and query credentials', async () => {
  const request = createRequest();
  request.url = '/patients/patient-private-123?token=secret';
  const { response } = createResponse();

  await tracingMiddleware(request, response, () => undefined);

  assert.equal(request.span?.name, 'HTTP GET /{resource}/:id');
  assert.doesNotMatch(request.span?.name ?? '', /patient-private-123|secret/);
});

test('tracing span names bound unrecognized HTTP methods', async () => {
  const request = createRequest();
  request.method = 'PRIVATE-METHOD-TOKEN';
  const { response } = createResponse();

  await tracingMiddleware(request, response, () => undefined);

  assert.equal(request.span?.name, 'HTTP OTHER /health');
  assert.doesNotMatch(request.span?.name ?? '', /PRIVATE-METHOD-TOKEN/);
});

test('HTTP target telemetry uses the normalized route and omits raw path and query values', () => {
  const request = createRequest();
  request.url = '/patients/patient-private-123?token=secret';
  const finishListeners: Array<() => void> = [];
  const response = {
    statusCode: 200,
    once(_event: string, listener: () => void) {
      finishListeners.push(listener);
      return this;
    }
  } as unknown as ServerResponse;
  const attributes: Record<string, string | number> = {};
  const span = {
    context: { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), traceFlags: 0 },
    startTime: process.hrtime.bigint(),
    name: 'HTTP GET /{resource}/:id',
    status: 'ok' as const,
    attributes
  };

  attachHttpRequestTelemetry({
    request,
    response,
    startTime: process.hrtime.bigint(),
    correlationId: 'correlation-1',
    requestRoles: new WeakMap(),
    span,
    logger: { info() {} } as never
  });
  finishListeners[0]?.();

  assert.equal(attributes['http.target'], '/{resource}/:id');
  assert.doesNotMatch(String(attributes['http.target']), /patient-private-123|secret/);
});
