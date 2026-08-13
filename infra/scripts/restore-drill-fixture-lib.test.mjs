import assert from 'node:assert/strict';
import test from 'node:test';

import { retryOperation } from './restore-drill-fixture-lib.mjs';

test('retryOperation retries transient failures and returns the successful result', () => {
  const attempts = [];
  const pauses = [];

  const result = retryOperation(
    (attempt) => {
      attempts.push(attempt);
      if (attempt < 3) throw new Error('database is restarting');
      return 'ready';
    },
    {
      attempts: 3,
      pause: (attempt) => pauses.push(attempt),
    },
  );

  assert.equal(result, 'ready');
  assert.deepEqual(attempts, [1, 2, 3]);
  assert.deepEqual(pauses, [1, 2]);
});

test('retryOperation rethrows the final failure after exhausting attempts', () => {
  const failure = new Error('still unavailable');

  assert.throws(
    () => retryOperation(() => { throw failure; }, { attempts: 2 }),
    (error) => error === failure,
  );
});

test('retryOperation validates its retry configuration', () => {
  assert.throws(
    () => retryOperation(() => 'unused', { attempts: 0 }),
    /attempts must be a positive integer/,
  );
});
