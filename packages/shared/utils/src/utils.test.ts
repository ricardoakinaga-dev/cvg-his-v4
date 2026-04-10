import assert from 'node:assert/strict';
import test from 'node:test';

import { nowIso, createCorrelationId, sleep } from './index.js';

test('nowIso returns ISO 8601 formatted date string', () => {
  const result = nowIso();

  assert.equal(typeof result, 'string');
  assert.ok(result.includes('T'), 'Should contain T separator');
  assert.ok(result.includes('Z'), 'Should end with Z for UTC');
  assert.ok(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(result), 'Should match ISO format');
});

test('nowIso returns current time', () => {
  const before = Date.now();
  const result = nowIso();
  const after = Date.now();

  const timestamp = new Date(result).getTime();
  assert.ok(timestamp >= before - 1000, 'Timestamp should be after before');
  assert.ok(timestamp <= after + 1000, 'Timestamp should be before after');
});

test('createCorrelationId generates unique IDs', () => {
  const id1 = createCorrelationId();
  const id2 = createCorrelationId();

  assert.notEqual(id1, id2, 'IDs should be unique');
  assert.ok(id1.length > 0);
  assert.ok(id2.length > 0);
});

test('createCorrelationId uses default prefix', () => {
  const id = createCorrelationId();

  assert.ok(id.startsWith('cvg_'), 'Should use default cvg prefix');
});

test('createCorrelationId uses custom prefix', () => {
  const id = createCorrelationId('worker');

  assert.ok(id.startsWith('worker_'), 'Should use custom prefix');
  assert.ok(id.includes('_'), 'Should contain separators');
});

test('createCorrelationId format includes timestamp', () => {
  const id = createCorrelationId('test');

  const parts = id.split('_');
  assert.ok(parts.length >= 3, 'Should have prefix_timestamp_random format');
  assert.ok(Number.isFinite(parseInt(parts[1], 36)), 'Middle part should be base36 timestamp');
});

test('sleep returns a promise', () => {
  const result = sleep(10);
  assert.ok(result instanceof Promise, 'Should return a Promise');
});

test('sleep resolves after specified time', async () => {
  const start = Date.now();
  await sleep(50);
  const elapsed = Date.now() - start;

  assert.ok(elapsed >= 45, `Should wait at least 45ms (allowing 5ms tolerance), got ${elapsed}ms`);
  assert.ok(elapsed < 150, `Should not wait too long, got ${elapsed}ms`);
});

test('sleep accepts zero milliseconds', async () => {
  const start = Date.now();
  await sleep(0);
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 50, 'Zero sleep should resolve quickly');
});

test('createCorrelationId produces parseable timestamp', () => {
  const id = createCorrelationId('test');
  const parts = id.split('_');
  const timestamp = parseInt(parts[1], 36);
  const nowMs = Date.now();

  assert.ok(timestamp <= nowMs + 1000, 'Timestamp should be close to current time');
  assert.ok(timestamp > nowMs - 60000, 'Timestamp should not be more than 1 minute in past');
});

test('multiple correlation IDs with same prefix are all valid', () => {
  const ids: string[] = [];

  for (let i = 0; i < 10; i++) {
    ids.push(createCorrelationId('batch'));
  }

  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 10, 'All IDs should be unique');
});

test('sleep can be used in sequence', async () => {
  await sleep(10);
  await sleep(10);
  await sleep(10);
});
