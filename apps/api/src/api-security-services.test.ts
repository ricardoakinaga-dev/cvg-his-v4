import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApiSecurityServices,
  OIDC_STATE_TTL_MS,
  WEBAUTHN_CHALLENGE_TTL_MS
} from './api-security-services.js';

test('creates isolated API security services with explicit runtime state mode', () => {
  const services = createApiSecurityServices({
    authSecret: 'test-auth-secret',
    runtimeDistributedStateEnabled: false
  });

  assert.ok(services.abacEngine);
  assert.ok(services.featureFlagRepository);
  assert.ok(services.webauthnService);
  assert.equal(services.webauthnChallenges.size, 0);
  assert.equal(services.oidcConfig, null);
  assert.equal(services.oidcStateTtlMs, OIDC_STATE_TTL_MS);
  assert.equal(services.webauthnChallengeTtlMs, WEBAUTHN_CHALLENGE_TTL_MS);
});
