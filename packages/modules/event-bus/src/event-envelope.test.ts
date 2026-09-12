import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { AccountId, CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import {
  assertEventEnvelopeMatches,
  buildEventEnvelopeMetadata,
  mergeEventEnvelopeMetadata,
  readEventEnvelopeMetadata
} from './event-envelope.js';

const accountId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as AccountId;
const correlationId = 'corr-envelope-1' as CorrelationId;
const sourceModule = 'clinical' as ModuleName;

test('builds a versioned envelope with a safe system actor by default', () => {
  const envelope = buildEventEnvelopeMetadata({
    eventId: 'evt-envelope-1',
    eventType: 'handover.ready',
    accountId,
    sourceModule,
    correlationId,
    occurredAt: '2026-09-12T14:00:00.000Z'
  });

  assert.deepEqual(envelope, {
    eventId: 'evt-envelope-1',
    eventType: 'handover.ready',
    schemaVersion: 1,
    occurredAt: '2026-09-12T14:00:00.000Z',
    accountId,
    sourceModule,
    actor: { type: 'system', id: 'event-bus' },
    correlationId,
    causationId: null
  });
});

test('rejects forged protected metadata before persisting an event', () => {
  const envelope = buildEventEnvelopeMetadata({
    eventId: 'evt-envelope-2',
    eventType: 'clinical_note.added',
    accountId,
    sourceModule,
    correlationId
  });

  assert.throws(
    () => mergeEventEnvelopeMetadata({ eventId: 'attacker-forged-id' }, envelope),
    /conflicts with the canonical event envelope/
  );
});

test('reads and verifies an envelope against the outbox event identity', () => {
  const envelope = buildEventEnvelopeMetadata({
    eventId: 'evt-envelope-3',
    eventType: 'handover.acknowledged',
    accountId,
    sourceModule,
    correlationId,
    actor: { type: 'user', id: 'user-1' },
    causationId: 'evt-envelope-2'
  });
  const payload = { accountId, _meta: envelope } as Record<string, unknown>;

  assert.deepEqual(readEventEnvelopeMetadata(payload), envelope);
  assert.deepEqual(
    assertEventEnvelopeMatches(payload, {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      accountId,
      sourceModule,
      correlationId
    }),
    envelope
  );
  assert.throws(
    () => assertEventEnvelopeMatches(payload, { ...envelope, eventId: 'wrong' }),
    /event envelope eventId does not match/
  );
});
