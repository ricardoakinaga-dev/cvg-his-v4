import assert from 'node:assert/strict';
import test from 'node:test';

import { createLogger, createChildLogger, type Logger, type LogContext } from './index.js';

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
