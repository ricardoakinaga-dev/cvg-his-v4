import { describe, expect, it } from 'vitest';
import {
  assertEventEnvelopeMatches,
  buildEventEnvelopeMetadata,
  CURRENT_EVENT_SCHEMA_VERSION,
  mergeEventEnvelopeMetadata,
  readEventEnvelopeMetadata,
  type BuildEventEnvelopeInput
} from './event-envelope.js';
import type { AccountId, CorrelationId, ModuleName } from './index.js';

const baseInput = (): BuildEventEnvelopeInput => ({
  eventId: 'event-1',
  eventType: 'encounter.created',
  accountId: 'account-1' as AccountId,
  sourceModule: 'encounters' as ModuleName,
  correlationId: 'correlation-1' as CorrelationId
});

describe('event envelope runtime contract', () => {
  it('builds canonical defaults and accepts explicit actor/causation', () => {
    const metadata = buildEventEnvelopeMetadata({
      ...baseInput(),
      actor: { type: 'user', id: 'user-1' },
      causationId: 'command-1',
      schemaVersion: 2,
      occurredAt: '2026-09-22T10:00:00.000Z'
    });

    expect(metadata.schemaVersion).toBe(2);
    expect(metadata.actor).toEqual({ type: 'user', id: 'user-1' });
    expect(metadata.causationId).toBe('command-1');
    expect(metadata.occurredAt).toBe('2026-09-22T10:00:00.000Z');

    const defaults = buildEventEnvelopeMetadata(baseInput());
    expect(defaults.schemaVersion).toBe(CURRENT_EVENT_SCHEMA_VERSION);
    expect(defaults.actor).toEqual({ type: 'system', id: 'event-bus' });
    expect(defaults.causationId).toBeNull();
  });

  it('rejects malformed identity, schema, timestamp and actor values', () => {
    expect(() => buildEventEnvelopeMetadata({ ...baseInput(), eventType: 'Encounter Created' })).toThrow(
      /canonical naming convention/
    );
    expect(() => buildEventEnvelopeMetadata({ ...baseInput(), schemaVersion: 0 })).toThrow(
      /schema version/
    );
    expect(() => buildEventEnvelopeMetadata({ ...baseInput(), occurredAt: 'not-a-date' })).toThrow(
      /ISO-8601/
    );
    const invalidActorInput = {
      ...baseInput(),
      actor: { type: 'robot', id: 'r-1' } as unknown as NonNullable<BuildEventEnvelopeInput['actor']>
    };
    expect(() => buildEventEnvelopeMetadata(invalidActorInput)).toThrow(/actor type/);
  });

  it('protects canonical metadata during merge and reads it back from payloads', () => {
    const envelope = buildEventEnvelopeMetadata(baseInput());
    const merged = mergeEventEnvelopeMetadata({ payload: 'value' }, envelope);
    expect(merged).toMatchObject({ payload: 'value', eventId: 'event-1' });

    expect(() => mergeEventEnvelopeMetadata({ eventId: 'forged' }, envelope)).toThrow(
      /conflicts with the canonical event envelope/
    );

    const payload = { _meta: envelope };
    expect(readEventEnvelopeMetadata(payload)).toEqual(envelope);
    expect(
      assertEventEnvelopeMatches(payload, {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        accountId: envelope.accountId,
        sourceModule: envelope.sourceModule,
        correlationId: envelope.correlationId
      })
    ).toEqual(envelope);
    expect(() =>
      assertEventEnvelopeMatches(payload, {
        eventId: 'different',
        eventType: envelope.eventType,
        accountId: envelope.accountId,
        sourceModule: envelope.sourceModule,
        correlationId: envelope.correlationId
      })
    ).toThrow(/eventId does not match/);
  });
});
