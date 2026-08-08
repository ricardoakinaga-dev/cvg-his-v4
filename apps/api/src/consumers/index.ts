/**
 * Consumer registry for the API runtime.
 *
 * Provides a centralized, typed way to register all domain event consumers
 * with the EventBusService.
 *
 * Usage:
 *   import { ConsumerRegistry } from './consumers/index.js';
 *   const registry = new ConsumerRegistry();
 *   registry.add('payments', new PaymentsEventHandlers({ billing }));
 *   registry.add('webhooks', new WebhooksEventHandlers({ webhooks }));
 *   registry.registerAll(eventBus);
 *
 * Adding a new consumer (onboarding):
 *   1. Create a new file: consumers/<domain>.consumer.ts
 *   2. Implement DomainConsumer: export class XxxEventHandlers { name = 'xxx'; handlers: EventHandler; handle(event) {...} }
 *   3. Add to registry: registry.add('xxx', new XxxEventHandlers(...))
 *   4. Done — registerAll() handles subscription
 *
 * Consumer ordering:
 *   The order in which consumers are added via add() determines subscription order.
 *   Current order: payments → billing → webhooks
 *   If a new consumer needs to run before/bafter another, adjust the add() call order.
 *
 * Error handling contract:
 *   - Handlers should propagate errors (do not swallow exceptions silently).
 *   - Errors thrown in handlers are caught by EventBusService.processPending() retry logic.
 */
import type { EventBusService, EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';

/**
 * Minimal contract that every domain consumer must expose.
 * All consumers registered with the ConsumerRegistry conform to this interface.
 *
 * Contract:
 *   - `name` — unique identifier for this consumer (used in logs, diagnostics, and duplicate detection)
 *   - `handlers` — the EventHandler function passed to eventBus.subscribe()
 *
 * The EventHandler function receives every processed OutboxEvent.
 * The handler should inspect event.eventType and dispatch to domain logic accordingly.
 * Unknown event types should be silently ignored (no-op default case).
 *
 * Example handler skeleton:
 *   async handle(event: OutboxEvent): Promise<void> {
 *     switch (event.eventType) {
 *       case 'domain.event.a': await this.#doA(event); break;
 *       case 'domain.event.b': await this.#doB(event); break;
 *       default: break; // unknown events: ignore
 *     }
 *   }
 */
export interface DomainConsumer {
  /** Human-readable name used in logs, diagnostics, and duplicate detection. */
  readonly name: string;

  /** EventHandler function to be passed to eventBus.subscribe(). */
  readonly handlers: EventHandler;
}

/**
 * Factory type for a consumer class that exposes `name`, `handlers`, and `handle()`.
 * Used by createEventConsumer() to build a DomainConsumer from a handler method.
 */
export interface EventConsumerClass {
  readonly name: string;
  readonly handlers: EventHandler;
  handle(event: OutboxEvent): Promise<void>;
}

/**
 * Create a DomainConsumer from a consumer class instance.
 *
 * This factory bridges the gap between a class with a `handle()` method
 * and the `DomainConsumer` interface expected by ConsumerRegistry.
 *
 * Usage:
 *   const consumer = createEventConsumer('payments', paymentsInstance);
 */
export function createEventConsumer<T extends EventConsumerClass>(
  name: string,
  instance: T
): DomainConsumer {
  return {
    name,
    handlers: async (event: OutboxEvent) => instance.handle(event)
  };
}

/**
 * Internal entry stored in the registry.
 * Combines the consumer with its subscription order.
 */
interface RegisteredConsumer {
  readonly name: string;
  readonly consumer: DomainConsumer;
}

/**
 * ConsumerRegistry — central registry for all domain event consumers.
 *
 * Responsibilities:
 *  - Collect consumers by domain name
 *  - Enforce ordering (via add() call order)
 *  - Prevent duplicate registrations
 *  - Register all consumers with EventBusService in a single call
 *
 * Example:
 *   const registry = new ConsumerRegistry();
 *   registry.add('payments', paymentsHandlers);
 *   registry.add('billing', billingHandlers);
 *   registry.add('webhooks', webhooksHandlers);
 *   registry.registerAll(eventBus);
 */
export class ConsumerRegistry {
  readonly #consumers: RegisteredConsumer[] = [];

  /**
   * Register a domain consumer.
   * @param name - unique identifier for this consumer (used in logs)
   * @param consumer - the DomainConsumer instance
   * @throws if a consumer with the same name is already registered
   */
  add(name: string, consumer: DomainConsumer): void {
    if (this.#consumers.some((c) => c.name === name)) {
      throw new Error(
        `[ConsumerRegistry] Consumer '${name}' is already registered. ` +
          `Use a unique name per consumer.`
      );
    }
    this.#consumers.push({ name, consumer });
  }

  /**
   * Register all collected consumers with the EventBusService.
   * Consumers are registered in the order they were added via add().
   * Logs the registration for operational visibility.
   */
  registerAll(eventBus: EventBusService): void {
    for (const { name, consumer } of this.#consumers) {
      eventBus.subscribe(name, consumer.handlers);
    }

    console.info(
      `[ConsumerRegistry] Registered ${this.#consumers.length} domain consumer(s): ` +
        this.#consumers.map((c) => c.name).join(', ')
    );
  }

  /**
   * Return the list of registered consumer names.
   * Useful for diagnostics and testing.
   */
  get names(): readonly string[] {
    return this.#consumers.map((c) => c.name);
  }

  /**
   * Return the number of registered consumers.
   */
  get size(): number {
    return this.#consumers.length;
  }
}
