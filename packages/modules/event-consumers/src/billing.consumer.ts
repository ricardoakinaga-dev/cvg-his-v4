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
import type { AccountId, BillingRecordId } from '@cvg-his-v2/shared-types';

export interface BillingConsumerOptions {
  readonly billing: BillingService;
}

interface BillingRecordCreatedPayload {
  readonly id?: string;
  readonly accountId?: string;
}

interface BillingStatusChangedPayload {
  readonly recordId?: string;
  readonly accountId?: string;
  readonly currency?: string;
}

/**
 * Billing domain event handler for the outbox event bus.
 *
 * Supported event types:
 *   - billing.record.created → rehydrates and validates the authoritative billing record
 *   - billing.status_changed → rehydrates and validates the authoritative billing record
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
    const payload = event.payload as unknown as BillingRecordCreatedPayload;
    await this.#assertAuthoritativeRecord(event, payload.id);
  }

  async #handleBillingStatusChanged(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as BillingStatusChangedPayload;
    const record = await this.#assertAuthoritativeRecord(event, payload.recordId);
    if (payload.currency !== undefined && payload.currency !== record.currency) {
      throw new Error('Billing status event currency does not match the authoritative record');
    }
  }

  async #assertAuthoritativeRecord(event: OutboxEvent, recordId: string | undefined) {
    if (!recordId) {
      throw new Error(`Billing event ${event.eventType} is missing record id`);
    }
    await this.#billing.hydrateFromDatabase(event.accountId as AccountId);
    const record = this.#billing.getOrThrow(
      event.accountId as AccountId,
      recordId as BillingRecordId
    );
    if (record.accountId !== event.accountId) {
      throw new Error('Billing event account does not match the authoritative record');
    }
    return record;
  }
}
