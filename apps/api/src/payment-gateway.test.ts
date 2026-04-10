import assert from 'node:assert/strict';
import test from 'node:test';

import { LocalPixPaymentGateway } from './payment-gateway.js';

test('LocalPixPaymentGateway creates a deterministic PIX intent shape', async () => {
  const gateway = new LocalPixPaymentGateway();

  const intent = await gateway.createPixIntent({
    accountId: 'acc_cvg_demo',
    billingRecordId: 'bill_42',
    amount: 123.45,
    description: 'Consulta de retorno',
    expirationMinutes: 15
  });

  assert.equal(intent.provider, 'local-pix');
  assert.equal(intent.status, 'pending');
  assert.equal(intent.currency, 'BRL');
  assert.ok(intent.qrCodePayload.includes('bill_42'));
  assert.ok(intent.qrCodeBase64.length > 0);
  assert.ok(intent.expiresAt.length > 0);
});
