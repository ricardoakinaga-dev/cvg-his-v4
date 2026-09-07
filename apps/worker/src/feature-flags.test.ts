import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkerFeatureFlags } from './feature-flags.js';

test('createWorkerFeatureFlags normalizes env-enabled keys and exposes decisions', async () => {
  const snapshot = await createWorkerFeatureFlags({
    environment: 'staging',
    enabledKeys: [
      ' runtime.distributed_state.enabled ',
      'notifications.whatsapp.provider_enabled',
      'RUNTIME.DISTRIBUTED_STATE.ENABLED'
    ]
  });

  assert.equal(snapshot.providerName, 'env-bootstrap-with-rules');
  assert.deepEqual(snapshot.enabledKeys, [
    'notifications.whatsapp.provider_enabled',
    'runtime.distributed_state.enabled'
  ]);
  assert.equal(snapshot.runtimeDistributedStateEnabled, true);
  assert.equal(snapshot.notificationsWhatsappProviderEnabled, true);
  for (const decision of Object.values(snapshot.decisions)) {
    assert.equal(decision.enabled, true);
    assert.equal(decision.reason, 'bootstrap');
    assert.equal(decision.provider, snapshot.providerName);
  }
});

test('createWorkerFeatureFlags preserves disabled defaults for absent flags', async () => {
  const snapshot = await createWorkerFeatureFlags({ environment: 'test', enabledKeys: [] });
  assert.deepEqual(snapshot.enabledKeys, []);
  assert.equal(snapshot.runtimeDistributedStateEnabled, false);
  assert.equal(snapshot.notificationsWhatsappProviderEnabled, false);
  for (const decision of Object.values(snapshot.decisions)) {
    assert.equal(decision.enabled, false);
    assert.equal(decision.reason, 'default');
  }
});
