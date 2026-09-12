import type { AccountId, CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { EVENT_SCHEMA_VERSIONS } from './event-catalog.js';

/** The stable metadata contract carried by every outbox event. */
export const CURRENT_EVENT_SCHEMA_VERSION = 1;

export type EventActorType = 'user' | 'service' | 'system';

export interface EventActor {
  readonly type: EventActorType;
  readonly id: string;
}

export interface EventEnvelopeMetadata {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly occurredAt: string;
  readonly accountId: AccountId;
  readonly sourceModule: ModuleName;
  readonly actor: EventActor;
  readonly correlationId: CorrelationId;
  readonly causationId: string | null;
}

export interface BuildEventEnvelopeInput {
  readonly eventId: string;
  readonly eventType: string;
  readonly accountId: AccountId;
  readonly sourceModule: ModuleName;
  readonly correlationId: CorrelationId;
  readonly actor?: EventActor;
  readonly causationId?: string | null;
  readonly schemaVersion?: number;
  readonly occurredAt?: string;
}

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const IDENTIFIER_MAX_LENGTH = 255;

function assertNonEmptyIdentifier(value: unknown, name: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > IDENTIFIER_MAX_LENGTH
  ) {
    throw new Error(`${name} must contain 1 to ${IDENTIFIER_MAX_LENGTH} characters`);
  }
}

function assertIsoTimestamp(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be a valid ISO-8601 timestamp`);
  }
}

function assertActor(actor: unknown): asserts actor is EventActor {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
    throw new Error('Event actor must be an object');
  }
  const candidate = actor as Record<string, unknown>;
  if (candidate.type !== 'user' && candidate.type !== 'service' && candidate.type !== 'system') {
    throw new Error('Event actor type must be user, service or system');
  }
  assertNonEmptyIdentifier(candidate.id, 'Event actor id');
}

export function buildEventEnvelopeMetadata(input: BuildEventEnvelopeInput): EventEnvelopeMetadata {
  assertNonEmptyIdentifier(input.eventId, 'Event id');
  assertNonEmptyIdentifier(input.eventType, 'Event type');
  if (!EVENT_TYPE_PATTERN.test(input.eventType)) {
    throw new Error(
      `Event type '${input.eventType}' does not follow the canonical naming convention`
    );
  }
  assertNonEmptyIdentifier(input.accountId, 'Event account id');
  assertNonEmptyIdentifier(input.sourceModule, 'Event source module');
  assertNonEmptyIdentifier(input.correlationId, 'Event correlation id');

  const schemaVersion =
    input.schemaVersion ?? EVENT_SCHEMA_VERSIONS[input.eventType] ?? CURRENT_EVENT_SCHEMA_VERSION;
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 1000) {
    throw new Error('Event schema version must be an integer between 1 and 1000');
  }

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  assertIsoTimestamp(occurredAt, 'Event occurredAt');

  const actor = input.actor ?? { type: 'system', id: 'event-bus' };
  assertActor(actor);

  const causationId = input.causationId ?? null;
  if (causationId !== null) assertNonEmptyIdentifier(causationId, 'Event causation id');

  return {
    eventId: input.eventId,
    eventType: input.eventType,
    schemaVersion,
    occurredAt,
    accountId: input.accountId,
    sourceModule: input.sourceModule,
    actor,
    correlationId: input.correlationId,
    causationId
  };
}

const PROTECTED_METADATA_KEYS = [
  'eventId',
  'eventType',
  'schemaVersion',
  'occurredAt',
  'accountId',
  'sourceModule',
  'actor',
  'correlationId',
  'causationId'
] as const;

/**
 * Merges caller metadata without allowing a caller to forge envelope identity.
 */
export function mergeEventEnvelopeMetadata(
  metadata: Record<string, unknown>,
  envelope: EventEnvelopeMetadata
): Record<string, unknown> {
  for (const key of PROTECTED_METADATA_KEYS) {
    if (
      metadata[key] !== undefined &&
      JSON.stringify(metadata[key]) !== JSON.stringify(envelope[key])
    ) {
      throw new Error(`Outbox payload _meta.${key} conflicts with the canonical event envelope`);
    }
  }
  return { ...metadata, ...envelope };
}

export function readEventEnvelopeMetadata(payload: Record<string, unknown>): EventEnvelopeMetadata {
  const raw = payload['_meta'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Outbox payload _meta must be an object with the event envelope');
  }
  const candidate = raw as Record<string, unknown>;
  const actor = candidate.actor;
  assertActor(actor);
  const envelope = buildEventEnvelopeMetadata({
    eventId: candidate.eventId as string,
    eventType: candidate.eventType as string,
    schemaVersion: candidate.schemaVersion as number | undefined,
    occurredAt: candidate.occurredAt as string | undefined,
    accountId: candidate.accountId as AccountId,
    sourceModule: candidate.sourceModule as ModuleName,
    actor,
    correlationId: candidate.correlationId as CorrelationId,
    causationId: candidate.causationId as string | null
  });
  return envelope;
}

export function assertEventEnvelopeMatches(
  payload: Record<string, unknown>,
  expected: Omit<
    EventEnvelopeMetadata,
    'actor' | 'causationId' | 'schemaVersion' | 'occurredAt'
  > & {
    readonly schemaVersion?: number;
    readonly occurredAt?: string;
    readonly actor?: EventActor;
    readonly causationId?: string | null;
  }
): EventEnvelopeMetadata {
  const actual = readEventEnvelopeMetadata(payload);
  const required: Array<[string, unknown, unknown]> = [
    ['eventId', actual.eventId, expected.eventId],
    ['eventType', actual.eventType, expected.eventType],
    ['accountId', actual.accountId, expected.accountId],
    ['sourceModule', actual.sourceModule, expected.sourceModule],
    ['correlationId', actual.correlationId, expected.correlationId]
  ];
  for (const [name, actualValue, expectedValue] of required) {
    if (actualValue !== expectedValue)
      throw new Error(`Outbox event envelope ${name} does not match the claimed event`);
  }
  if (expected.schemaVersion !== undefined && actual.schemaVersion !== expected.schemaVersion) {
    throw new Error('Outbox event envelope schema version does not match the claimed event');
  }
  if (expected.occurredAt !== undefined && actual.occurredAt !== expected.occurredAt) {
    throw new Error('Outbox event envelope occurredAt does not match the claimed event');
  }
  if (
    expected.actor !== undefined &&
    JSON.stringify(actual.actor) !== JSON.stringify(expected.actor)
  ) {
    throw new Error('Outbox event envelope actor does not match the claimed event');
  }
  if (expected.causationId !== undefined && actual.causationId !== expected.causationId) {
    throw new Error('Outbox event envelope causationId does not match the claimed event');
  }
  return actual;
}
