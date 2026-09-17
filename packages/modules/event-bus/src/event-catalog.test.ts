import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  assertEventCatalogIntegrity,
  EVENT_CATALOG,
  EVENT_SCHEMA_VERSIONS,
  EVENTS_BY_DOMAIN,
  INVENTORY_CONSUMPTION_CREATED,
  PAYMENT_CARD_COMPLETED,
  PAYMENT_CARD_FAILED,
  PAYMENT_CARD_INTENT_CREATED,
  PAYMENT_PIX_COMPLETED,
  PAYMENT_PIX_FAILED,
  PAYMENT_PIX_INTENT_CREATED,
  isKnownEvent,
  findEventCatalogIntegrityViolations
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
  assert.equal(INVENTORY_CONSUMPTION_CREATED, 'inventory.consumption.created');
  assert.equal(isKnownEvent(INVENTORY_CONSUMPTION_CREATED), true);
});

test('event catalog is unique, domain-owned and schema-versioned', () => {
  assert.deepEqual(findEventCatalogIntegrityViolations(), []);
  assert.doesNotThrow(() => assertEventCatalogIntegrity());
  assert.equal(Object.keys(EVENT_SCHEMA_VERSIONS).length, EVENT_CATALOG.length);
  assert.equal(Object.values(EVENTS_BY_DOMAIN).flat().length, EVENT_CATALOG.length);
});
