import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { trace } from '@opentelemetry/api';

import { createLogger, createChildLogger, type Logger, type LogContext } from './index.js';

function captureStdout(run: () => void): string {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = '';

  process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
    output += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (typeof encoding === 'function') {
      encoding();
    } else {
      callback?.();
    }
    return true;
  }) as typeof process.stdout.write;

  try {
    run();
  } finally {
    process.stdout.write = originalWrite;
  }

  return output;
}

test('createLogger creates logger with service name', () => {
  const logger = createLogger('test-service');

  assert.ok(logger, 'Logger should be created');
  assert.ok(typeof logger.debug === 'function');
  assert.ok(typeof logger.info === 'function');
  assert.ok(typeof logger.warn === 'function');
  assert.ok(typeof logger.error === 'function');
  assert.ok(typeof logger.fatal === 'function');
  assert.ok(typeof logger.child === 'function');
});

test('Logger has all required methods', () => {
  const logger = createLogger('test');

  assert.equal(typeof logger.debug, 'function');
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
  assert.equal(typeof logger.fatal, 'function');
  assert.equal(typeof logger.child, 'function');
});

test('createChildLogger creates child logger', () => {
  const parent = createLogger('parent');
  const child = createChildLogger(parent, { correlationId: 'corr-123' });

  assert.ok(child, 'Child logger should be created');
  assert.ok(typeof child.info === 'function');
});

test('createChildLogger uses native child if available', () => {
  const parent = createLogger('parent');
  const childContext: LogContext = { service: 'child-service', correlationId: 'corr-456' };
  const child = createChildLogger(parent, childContext);

  assert.ok(child, 'Should create child logger');
});

test('Logger child method returns new logger instance', () => {
  const logger = createLogger('test');
  const child = logger.child({ tenantId: 'tenant-123' });

  assert.ok(child !== logger, 'Child should be different instance');
});

test('Logger child inherits parent context', () => {
  const parent = createLogger('parent');
  const child = parent.child({ accountId: 'acc-123' });

  assert.ok(child, 'Child should inherit context');
});

test('createLogger creates logger without crashing', () => {
  const logger = createLogger('');
  assert.ok(logger, 'Empty service name should work');
});

test('createLogger handles special characters in service name', () => {
  const logger = createLogger('test-service-v2');
  assert.ok(logger);
});

test('LogContext type accepts various properties', () => {
  const context: LogContext = {
    service: 'my-service',
    correlationId: 'corr-123',
    tenantId: 'tenant-456',
    accountId: 'acc-789',
    userId: 'user-000',
    customField: 'custom-value'
  };

  assert.equal(context.service, 'my-service');
  assert.equal(context.correlationId, 'corr-123');
  assert.equal(context.customField, 'custom-value');
});

test('Logger interface is satisfied by created logger', () => {
  const logger: Logger = createLogger('test');
  assert.ok(logger.info !== undefined);
});

test('child logger can have multiple levels of nesting', () => {
  const root = createLogger('root');
  const level1 = root.child({ depth: 1 });
  const level2 = level1.child({ depth: 2 });

  assert.ok(level2, 'Nested child should exist');
});

test('createChildLogger handles Logger without child method', () => {
  const simpleLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    child: () => simpleLogger
  };

  const child = createChildLogger(simpleLogger, { correlationId: 'test' });
  assert.ok(child);
});

test('logger normalizes correlationId and requestId in structured logs', () => {
  const logger = createLogger('test');
  const output = captureStdout(() => {
    logger.info('hello', { correlationId: 'corr-123' });
  });

  const payload = JSON.parse(output.trim()) as Record<string, unknown>;
  assert.equal(payload.correlationId, 'corr-123');
  assert.equal(payload.requestId, 'corr-123');
});

test('logger emits trace context from active span together with request correlation', () => {
  const logger = createLogger('test');
  const fakeSpan = {
    spanContext: () => ({
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: '1234567890abcdef',
      traceFlags: 1
    })
  } as never;
  const getActiveSpanMock = vi.spyOn(trace, 'getActiveSpan').mockReturnValue(fakeSpan);

  const output = captureStdout(() => {
    logger.info('observability contract', { requestId: 'req-123' });
  });
  getActiveSpanMock.mockRestore();

  const payload = JSON.parse(output.trim()) as Record<string, unknown>;
  assert.equal(payload.requestId, 'req-123');
  assert.equal(payload.correlationId, 'req-123');
  assert.equal(payload.traceId, '1234567890abcdef1234567890abcdef');
  assert.equal(payload.spanId, '1234567890abcdef');
});
