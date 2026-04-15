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

export interface InpatientConsumerOptions {
  // Add dependencies as needed (e.g., notifications, webhooks)
}

interface InpatientEventContext {
  accountId: string;
  [key: string]: unknown;
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
    const ctx = event.payload as InpatientEventContext;

    switch (event.eventType) {
      case 'inpatient.admitted':
        // Currently a placeholder for future logic (e.g., send notification)
        console.log('[InpatientEventHandlers] Patient admitted:', ctx);
        break;
      case 'inpatient.discharged':
        // Currently a placeholder for future logic (e.g., send notification)
        console.log('[InpatientEventHandlers] Patient discharged:', ctx);
        break;
      default:
        break;
    }
  }
}
