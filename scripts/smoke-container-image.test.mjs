import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildContainerRunArgs, resolveSmokeSpec } from './smoke-container-image.mjs';

test('defines isolated HTTP smoke endpoints for every deployable image', () => {
  assert.deepEqual(resolveSmokeSpec('api'), {
    containerPort: 3001,
    path: '/health',
    environment: {
      NODE_ENV: 'test',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true',
    },
    addHosts: [],
  });
  assert.equal(resolveSmokeSpec('worker').path, '/live');
  assert.equal(resolveSmokeSpec('spa').path, '/health');
  assert.throws(() => resolveSmokeSpec('unknown'), /Unsupported image kind/);
});

test('builds a non-privileged, ephemeral Docker invocation without secret values', () => {
  const args = buildContainerRunArgs('api', 'cvg-his-api:sha', 'cvg-smoke-api-123');
  assert.deepEqual(args.slice(0, 5), [
    'run',
    '-d',
    '--name',
    'cvg-smoke-api-123',
    '-p',
  ]);
  assert.ok(args.includes('127.0.0.1::3001'));
  assert.ok(args.includes('cvg-his-api:sha'));
  assert.doesNotMatch(args.join(' '), /PASSWORD|TOKEN|SECRET|API_KEY=/);
});
