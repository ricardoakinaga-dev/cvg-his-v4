// Repositories
export { DatabaseOutboxRepository } from './event-bus.service.js';
export type {
  ClaimPendingInput,
  OutboxClaim,
  OutboxEvent,
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
export * from './consumer-manifest.js';

// Event Catalog
export * from './event-catalog.js';
