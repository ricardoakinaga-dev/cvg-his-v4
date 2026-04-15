import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkerFeatureFlags } from './feature-flags.js';

test('createWorkerFeatureFlags normalizes env-enabled keys and exposes decisions', () => {
  const snapshot = createWorkerFeatureFlags({
    environment: 'staging',
    enabledKeys: [
      ' runtime.distributed_state.enabled ',
      'notifications.whatsapp.provider_enabled',
      'RUNTIME.DISTRIBUTED_STATE.ENABLED'
    ]
  });

  assert.equal(snapshot.providerName, 'env-bootstrap');
  assert.deepEqual(snapshot.enabledKeys, [
    'notifications.whatsapp.provider_enabled',
    'runtime.distributed_state.enabled'
  ]);
  assert.equal(snapshot.runtimeDistributedStateEnabled, true);
  assert.equal(snapshot.notificationsWhatsappProviderEnabled, true);
});
