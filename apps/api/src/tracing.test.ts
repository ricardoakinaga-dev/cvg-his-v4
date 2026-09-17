import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
    '/attachments/attachment-1/content'
  );
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
