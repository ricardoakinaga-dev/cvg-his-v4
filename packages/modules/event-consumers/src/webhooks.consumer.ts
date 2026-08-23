/**
 * Webhooks domain event consumers — API runtime level.
 *
 * These handlers dispatch webhook deliveries when domain events occur.
 * They are invoked by EventBusService.processPending() during worker tick,
 * after events are marked as 'processing'.
 *
 * Structure:
 *   eventBus.processPending()
 *     → picks up pending events from outbox_events
 *     → for each event, calls all registered EventHandlers
 *     → WebhooksEventHandlers.handle() dispatches webhook delivery for relevant events
 *
 * Supported event types:
 *   - patient.created
 *   - appointment.scheduled
 *   - appointment.status_changed
 *   - encounter.created
 *   - encounter.status_changed
 *   - billing.record.created
 *   - billing.status_changed
 *   - notification.sent
 *
 * Registered via: eventBus.subscribe(webhooksHandlers.handlers)
 */
import type { WebhooksService } from '@cvg-his-v2/module-webhooks';
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';
import type { AccountId } from '@cvg-his-v2/shared-types';

export interface WebhooksConsumerOptions {
  readonly webhooks: WebhooksService;
}

interface WebhookDispatchContext {
  accountId: string;
  [key: string]: unknown;
}

/**
 * Webhooks domain event handler for the outbox event bus.
 * Dispatches webhook deliveries to registered endpoints when domain events occur.
 */
export class WebhooksEventHandlers {
  readonly name = 'webhooks';
  readonly #webhooks: WebhooksService;

  constructor(options: WebhooksConsumerOptions) {
    this.#webhooks = options.webhooks;
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

  async handle(event: OutboxEvent): Promise<void> {
    const ctx: WebhookDispatchContext = { ...event.payload, accountId: event.accountId };
    const enqueue = this.#webhooks.enqueue?.bind(this.#webhooks);
    const dispatch = enqueue ?? this.#webhooks.dispatch.bind(this.#webhooks);

    switch (event.eventType) {
      case 'patient.created':
        await dispatch(event.accountId as AccountId, 'patient.created', ctx);
        break;
      case 'appointment.scheduled':
        await dispatch(event.accountId as AccountId, 'appointment.scheduled', ctx);
        break;
      case 'appointment.status_changed':
        await dispatch(event.accountId as AccountId, 'appointment.status_changed', ctx);
        break;
      case 'encounter.created':
        await dispatch(event.accountId as AccountId, 'encounter.created', ctx);
        break;
      case 'encounter.status_changed':
        await dispatch(event.accountId as AccountId, 'encounter.status_changed', ctx);
        break;
      case 'billing.record.created':
        await dispatch(event.accountId as AccountId, 'billing.record.created', ctx);
        break;
      case 'billing.status_changed':
        await dispatch(event.accountId as AccountId, 'billing.status_changed', ctx);
        break;
      case 'notification.sent':
        await dispatch(event.accountId as AccountId, 'notification.sent', ctx);
        break;
      default:
        break;
    }
  }
}
