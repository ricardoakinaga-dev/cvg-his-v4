import assert from 'node:assert/strict';
import test from 'node:test';

import { waitForPostgres } from './test-critical-bootstrap-lib.mjs';

const testConnectionString = 'test-connection-string';

test('waitForPostgres retries failed connections and closes every client', async () => {
  const events = [];
  let attempt = 0;

  const connected = await waitForPostgres({
    databaseUrl: testConnectionString,
    attempts: 3,
    intervalMs: 0,
    createClient: () => {
      const currentAttempt = ++attempt;
      return {
        async connect() {
          events.push(`connect:${currentAttempt}`);
          if (currentAttempt < 3) {
            throw new Error('not ready');
          }
        },
        async query(sql) {
          events.push(`query:${sql}`);
        },
        async end() {
          events.push(`end:${currentAttempt}`);
        },
      };
    },
  });

  assert.equal(connected, true);
  assert.deepEqual(events, [
    'connect:1',
    'end:1',
    'connect:2',
    'end:2',
    'connect:3',
    'query:SELECT 1',
    'end:3',
  ]);
});

test('waitForPostgres returns false after the configured attempts', async () => {
  let closedClients = 0;

  const connected = await waitForPostgres({
    databaseUrl: testConnectionString,
    attempts: 2,
    intervalMs: 0,
    createClient: () => ({
      async connect() {
        throw new Error('still unavailable');
      },
      async query() {
        throw new Error('query must not run');
      },
      async end() {
        closedClients += 1;
      },
    }),
  });

  assert.equal(connected, false);
  assert.equal(closedClients, 2);
});

test('waitForPostgres validates retry settings before connecting', async () => {
  await assert.rejects(
    waitForPostgres({
      databaseUrl: testConnectionString,
      attempts: 0,
      intervalMs: 0,
    }),
    /attempts must be a positive integer/,
  );
});
