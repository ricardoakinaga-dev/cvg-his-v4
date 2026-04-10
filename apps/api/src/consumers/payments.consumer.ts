/**
 * Payments domain event consumers — API runtime level.
 *
 * These handlers dispatch webhook deliveries and coordinate billing settlement
 * when PIX payment events occur.
 *
 * Structure:
 *   eventBus.processPending()
 *     → picks up pending events from outbox_events
 *     → for each event, calls all registered EventHandlers
 *     → PaymentsEventHandlers.handle() dispatches by eventType
 *       - payment.pix.intent.created → audit log
 *       - payment.pix.confirmed → billing.settleByRecordId()
 *
 * Registered via: eventBus.subscribe(paymentsHandlers.handlers)
 */
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { BillingRecordId } from '@cvg-his-v2/shared-types';
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';

export interface PaymentsConsumerOptions {
  readonly billing: BillingService;
}

interface PixIntentCreatedPayload {
  accountId: string;
  intentId: string;
  billingRecordId?: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  expiresAt: string;
}

interface PixConfirmedPayload {
  accountId: string;
  intentId: string;
  billingRecordId?: string;
  providerConfirmationId?: string;
  status: string;
  completedAt: string;
}

/**
 * Payments domain event handler for the outbox event bus.
 *
 * Supported event types:
 *   - payment.pix.intent.created → audit log (PIX intent recorded)
 *   - payment.pix.confirmed → settle associated billing record via BillingService
 */
export class PaymentsEventHandlers {
  readonly name = 'payments';
  readonly #billing: BillingService;

  constructor(options: PaymentsConsumerOptions) {
    this.#billing = options.billing;
  }

  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'payment.pix.intent.created':
        await this.#handlePixIntentCreated(event);
        break;
      case 'payment.pix.confirmed':
        await this.#handlePixConfirmed(event);
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

  async #handlePixIntentCreated(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as PixIntentCreatedPayload;
    console.info(
      `[PaymentsConsumer] PIX intent created: ${payload.intentId} for account ${payload.accountId}` +
        (payload.billingRecordId ? ` (billingRecordId: ${payload.billingRecordId})` : '') +
        ` — amount: ${payload.amount} ${payload.currency}`
    );
  }

  async #handlePixConfirmed(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as PixConfirmedPayload;

    if (!payload.billingRecordId) {
      console.warn(
        `[PaymentsConsumer] payment.pix.confirmed event ${event.id} has no billingRecordId — skipping billing settlement`
      );
      return;
    }

    await this.#billing.settleByRecordId(payload.billingRecordId as BillingRecordId);
    console.info(
      `[PaymentsConsumer] Settled billing record ${payload.billingRecordId} after PIX confirmation (event ${event.id})`
    );
  }
}
