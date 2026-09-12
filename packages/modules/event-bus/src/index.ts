// Repositories
export { DatabaseOutboxRepository } from './event-bus.service.js';
export type {
  ClaimPendingInput,
  OutboxClaim,
  OutboxEvent,
  OutboxEventCounts,
  OutboxRepository,
  RetryClaimInput
} from './outbox.interface.js';

// Services
export { EventBusService, TenantUnitOfWorkConsumerGuard } from './event-bus.service.js';
export type {
  BackoffOptions,
  ConsumerExecutionGuard,
  CreateOutboxEventInput,
  EventBusOptions,
  EventHandler
} from './event-bus.service.js';
export { DEFAULT_BACKOFF } from './event-bus.service.js';
export {
  assertEventEnvelopeMatches,
  buildEventEnvelopeMetadata,
  mergeEventEnvelopeMetadata,
  readEventEnvelopeMetadata,
  CURRENT_EVENT_SCHEMA_VERSION
} from './event-envelope.js';
export type {
  EventActor,
  EventActorType,
  EventEnvelopeMetadata,
  BuildEventEnvelopeInput
} from './event-envelope.js';
export * from './consumer-manifest.js';

// Event Catalog
export * from './event-catalog.js';
