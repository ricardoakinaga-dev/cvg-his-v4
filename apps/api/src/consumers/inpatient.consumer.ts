/**
 * Inpatient domain event consumers — API runtime level.
 *
 * These handlers process inpatient events from the outbox event bus.
 *
 * Supported event types:
 *   - inpatient.admitted
 *   - inpatient.discharged
 *
 * Registered via: eventBus.subscribe(inpatientHandlers.handlers)
 */
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';
import { createLogger } from '@cvg-his-v2/shared-logging';

const logger = createLogger('inpatient-consumer');

export interface InpatientConsumerOptions {
  // Add dependencies as needed (e.g., notifications, webhooks)
}

/**
 * Inpatient domain event handler for the outbox event bus.
 * Currently handles logging and can be extended for notifications, etc.
 */
export class InpatientEventHandlers {
  readonly name = 'inpatient';
  readonly #options: InpatientConsumerOptions;

  constructor(options: InpatientConsumerOptions) {
    this.#options = options;
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
    switch (event.eventType) {
      case 'inpatient.admitted':
      case 'inpatient.discharged':
        // Placeholder for future logic (e.g., send notification).
        // The payload carries patient and owner data, so only non-identifying
        // references are logged — clinical detail belongs in the audit trail.
        logger.info('inpatient event received', {
          eventId: event.id,
          eventType: event.eventType,
          accountId: event.accountId,
          correlationId: event.correlationId
        });
        break;
      default:
        break;
    }
  }
}
