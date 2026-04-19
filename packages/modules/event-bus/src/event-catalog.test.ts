import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVENT_CATALOG,
  PAYMENT_CARD_COMPLETED,
  PAYMENT_CARD_FAILED,
  PAYMENT_CARD_INTENT_CREATED,
  PAYMENT_PIX_COMPLETED,
  PAYMENT_PIX_FAILED,
  PAYMENT_PIX_INTENT_CREATED,
  isKnownEvent
} from './event-catalog.js';

test('payment events in catalog use the canonical dotted naming used by runtime publishers', () => {
  assert.equal(PAYMENT_PIX_INTENT_CREATED, 'payment.pix.intent.created');
  assert.equal(PAYMENT_PIX_COMPLETED, 'payment.pix.confirmed');
  assert.equal(PAYMENT_PIX_FAILED, 'payment.pix.failed');
  assert.equal(PAYMENT_CARD_INTENT_CREATED, 'payment.card.intent.created');
  assert.equal(PAYMENT_CARD_COMPLETED, 'payment.card.completed');
  assert.equal(PAYMENT_CARD_FAILED, 'payment.card.failed');

  assert.equal(isKnownEvent('payment.pix.intent.created'), true);
  assert.equal(isKnownEvent('payment.pix.confirmed'), true);
  assert.equal(isKnownEvent('payment.card.intent.created'), true);
  assert.equal(EVENT_CATALOG.includes('payment.card.intent.created'), true);
});
