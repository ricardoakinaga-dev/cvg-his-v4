/**
 * Billing domain event consumers — API runtime level.
 *
 * These handlers process billing-specific domain events from the outbox event bus.
 * PIX payment confirmation is handled by PaymentsEventHandlers in consumers/payments.consumer.ts.
 *
 * Structure:
 *   eventBus.processPending()
 *     → picks up pending events from outbox_events
 *     → for each event, calls all registered EventHandlers
 *     → BillingEventHandlers.handle() dispatches by eventType
 *       - billing.record.created
 *       - billing.status_changed
 *
 * Registered via: eventBus.subscribe(billingHandlers.handlers)
 */
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';

export interface BillingConsumerOptions {
  readonly billing: BillingService;
}

/**
 * Billing domain event handler for the outbox event bus.
 *
 * Supported event types:
 *   - billing.record.created → future use (e.g., accounts receivable sync)
 *   - billing.status_changed → future use (e.g., webhook dispatch, reconciliation)
 */
export class BillingEventHandlers {
  readonly #billing: BillingService;
  readonly name = 'billing';

  constructor(options: BillingConsumerOptions) {
    this.#billing = options.billing;
  }

  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'billing.record.created':
        await this.#handleBillingRecordCreated(event);
        break;
      case 'billing.status_changed':
        await this.#handleBillingStatusChanged(event);
        break;
      default:
        break;
    }
  }

  /**
   * Returns an EventHandler-compatible function for eventBus.subscribe().
   * Errors are logged and propagated to the event bus retry logic.
   */
  get handlers(): EventHandler {
    return async (event: OutboxEvent): Promise<void> => {
      await this.handle(event);
    };
  }

  async #handleBillingRecordCreated(event: OutboxEvent): Promise<void> {
    // Placeholder for future billing record creation effects
    // (e.g., accounts receivable sync, external accounting system notification)
    console.debug(`[BillingConsumer] billing.record.created event ${event.id} received`);
  }

  async #handleBillingStatusChanged(event: OutboxEvent): Promise<void> {
    // Placeholder for future billing status change effects
    // Note: webhook dispatch for billing.status_changed is handled by WebhooksEventHandlers
    console.debug(`[BillingConsumer] billing.status_changed event ${event.id} received`);
  }
}
