import { randomUUID } from 'node:crypto';
import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type { OutboxEvent, OutboxRepository } from './outbox.interface.js';

export type { OutboxEvent, OutboxRepository } from './outbox.interface.js';

export interface CreateOutboxEventInput {
  correlationId: CorrelationId;
  moduleName: ModuleName;
  eventType: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  scheduledAt?: string;
}

/**
 * Event handler function signature.
 * Subscribers to the EventBusService must conform to this interface.
 */
export type EventHandler = (event: OutboxEvent) => Promise<void>;

/**
 * Backoff strategy for retries.
 * Formula: min(baseMs * 2^attempt, maxMs)
 */
export interface BackoffOptions {
  readonly baseMs: number;
  readonly maxMs: number;
}

export const DEFAULT_BACKOFF: BackoffOptions = {
  baseMs: 1_000,   // 1 second
  maxMs: 60_000    // 1 minute
};

function computeBackoffDelay(attempt: number, opts: BackoffOptions): number {
  return Math.min(opts.baseMs * Math.pow(2, attempt), opts.maxMs);
}

export class DatabaseOutboxRepository implements OutboxRepository {
  async create(event: OutboxEvent): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO outbox_events (id, correlation_id, module_name, event_type, payload, status, attempts, max_attempts, scheduled_at, processed_at, error, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          event.id,
          event.correlationId,
          event.moduleName,
          event.eventType,
          JSON.stringify(event.payload),
          event.status,
          event.attempts,
          event.maxAttempts,
          new Date(event.scheduledAt),
          event.processedAt ? new Date(event.processedAt) : null,
          event.error,
          new Date(event.createdAt)
        ]
      );
    });
  }

  async update(event: OutboxEvent): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE outbox_events
         SET status = $2,
             attempts = $3,
             scheduled_at = $4,
             processed_at = $5,
             error = $6
         WHERE id = $1`,
        [
          event.id,
          event.status,
          event.attempts,
          new Date(event.scheduledAt),
          event.processedAt ? new Date(event.processedAt) : null,
          event.error
        ]
      );
    });
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM outbox_events WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findPending(limit: number): Promise<readonly OutboxEvent[]> {
    return withTenantQuery(getPool(), async (client) => {
      const now = new Date();
      const result = await client.query(
        `SELECT * FROM outbox_events
         WHERE status IN ('pending', 'retrying')
           AND attempts < max_attempts
           AND scheduled_at <= $1
         ORDER BY scheduled_at ASC
         LIMIT $2`,
        [now, limit]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findFailed(limit: number): Promise<readonly OutboxEvent[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM outbox_events
         WHERE status = 'failed'
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM outbox_events WHERE correlation_id = $1 ORDER BY created_at DESC',
        [correlationId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  private mapRow(row: Record<string, unknown>): OutboxEvent {
    return {
      id: row.id as string,
      correlationId: row.correlation_id as CorrelationId,
      moduleName: row.module_name as ModuleName,
      eventType: row.event_type as string,
      payload: JSON.parse(row.payload as string) as Record<string, unknown>,
      status: row.status as OutboxEvent['status'],
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      scheduledAt: new Date(row.scheduled_at as Date).toISOString(),
      processedAt: row.processed_at ? (row.processed_at as Date).toISOString() : null,
      error: (row.error as string) ?? null,
      createdAt: new Date(row.created_at as Date).toISOString()
    };
  }
}

export class EventBusService {
  readonly #repository: OutboxRepository;
  readonly #handlers: Set<EventHandler>;
  readonly #backoff: BackoffOptions;

  constructor(repository?: OutboxRepository, backoff?: BackoffOptions) {
    this.#repository = repository ?? new DatabaseOutboxRepository();
    this.#handlers = new Set();
    this.#backoff = backoff ?? DEFAULT_BACKOFF;
  }

  /**
   * Subscribe an event handler to be called when events are processed.
   * Handlers are called after an event is marked as 'completed'.
   */
  subscribe(handler: EventHandler): () => void {
    this.#handlers.add(handler);
    return () => this.#handlers.delete(handler);
  }

  async publish(input: CreateOutboxEventInput): Promise<OutboxEvent> {
    const event: OutboxEvent = {
      id: randomUUID(),
      correlationId: input.correlationId,
      moduleName: input.moduleName,
      eventType: input.eventType,
      payload: input.payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      scheduledAt: input.scheduledAt ?? nowIso(),
      processedAt: null,
      error: null,
      createdAt: nowIso()
    };

    await this.#repository.create(event);
    return event;
  }

  /**
   * Process up to `limit` pending events.
   * Events that fail are rescheduled with exponential backoff.
   * Events that exhaust all retry attempts are moved to DLQ (status='failed').
   */
  async processPending(limit = 10): Promise<readonly OutboxEvent[]> {
    const pending = await this.#repository.findPending(limit);
    const processed: OutboxEvent[] = [];

    if (pending.length > 0) {
      console.info(`[EventBus] Processing ${pending.length} pending event(s) with ${this.#handlers.size} handler(s) registered`);
    }

    for (const event of pending) {
      const updated: OutboxEvent = {
        ...event,
        status: 'processing'
      };
      await this.#repository.update(updated);

      console.info(
        `[EventBus] Dispatching event ${event.eventType} (${event.id}) to ${this.#handlers.size} handler(s) — attempt ${event.attempts + 1}/${event.maxAttempts}`
      );

      try {
        let handlerFailed = false;
        const handlerResults = await Promise.allSettled(
          Array.from(this.#handlers).map((handler) => handler(event))
        );
        for (const result of handlerResults) {
          if (result.status === 'rejected') {
            console.error(`[EventBus] Handler error for ${event.eventType} (${event.id}):`, result.reason);
            handlerFailed = true;
          }
        }

        if (handlerFailed) {
          const failedErrors = handlerResults
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => r.reason instanceof Error ? r.reason.message : String(r.reason));
          throw new Error(failedErrors.join('; '));
        }

        const completed: OutboxEvent = {
          ...updated,
          status: 'completed',
          processedAt: nowIso()
        };
        await this.#repository.update(completed);
        processed.push(completed);
        console.info(`[EventBus] Event ${event.eventType} (${event.id}) completed — ${this.#handlers.size} handler(s) succeeded`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const shouldRetry = event.attempts + 1 < event.maxAttempts;

        if (shouldRetry) {
          // Apply exponential backoff before the next retry
          const delayMs = computeBackoffDelay(event.attempts, this.#backoff);
          const scheduledAt = new Date(Date.now() + delayMs).toISOString();
          const retrying: OutboxEvent = {
            ...event,
            status: 'retrying',
            attempts: event.attempts + 1,
            error: errorMessage,
            scheduledAt
          };
          await this.#repository.update(retrying);
          console.warn(
            `[EventBus] ${event.eventType} (${event.id}) retry ${event.attempts + 1}/${event.maxAttempts} in ${delayMs}ms: ${errorMessage}`
          );
        } else {
          // Exhausted all attempts — move to DLQ
          const failed: OutboxEvent = {
            ...event,
            status: 'failed',
            attempts: event.maxAttempts,
            error: `[DLQ] All ${event.maxAttempts} attempts exhausted. Last error: ${errorMessage}`
          };
          await this.#repository.update(failed);
          console.error(
            `[EventBus] [DLQ] ${event.eventType} (${event.id}) moved to dead-letter queue after ${event.maxAttempts} attempts: ${errorMessage}`
          );
        }
      }
    }

    return processed;
  }

  /**
   * Retrieve dead-letter events for inspection/reprocessing.
   */
  async getDeadLetterEvents(limit = 100): Promise<readonly OutboxEvent[]> {
    return this.#repository.findFailed(limit);
  }

  async getEvent(id: string): Promise<OutboxEvent | null> {
    return this.#repository.findById(id);
  }

  async getEventsByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    return this.#repository.findByCorrelationId(correlationId);
  }

  /**
   * Reprocess a failed or retrying event by resetting it to pending status.
   * The event will be picked up by processPending() on next worker tick.
   */
  async reprocessEvent(eventId: string): Promise<OutboxEvent | null> {
    const event = await this.#repository.findById(eventId);
    if (!event) return null;
    const reprocessed: OutboxEvent = {
      ...event,
      status: 'pending',
      attempts: 0,
      error: null,
      scheduledAt: nowIso()
    };
    await this.#repository.update(reprocessed);
    return reprocessed;
  }

  /**
   * Return event count breakdown by status.
   * Useful for operational dashboards without fetching full event lists.
   */
  async countEvents(): Promise<{ pending: number; retrying: number; completed: number; failed: number; total: number }> {
    return withTenantQuery(getPool(), async (client) => {
      const countResult = await client.query(
        `SELECT status, COUNT(*) as count FROM outbox_events GROUP BY status`
      );
      const counts = { pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 };
      for (const row of countResult.rows as Record<string, unknown>[]) {
        const status = row.status as string;
        const cnt = Number(row.count) || 0;
        if (status === 'pending' || status === 'retrying' || status === 'completed' || status === 'failed') {
          (counts as Record<string, number>)[status] = cnt;
          counts.total += cnt;
        }
      }
      return counts;
    });
  }

  /**
   * Retrieve pending and retrying events for inspection (does not reprocess them).
   */
  async getPendingEvents(limit = 50): Promise<readonly OutboxEvent[]> {
    return this.#repository.findPending(limit);
  }
}
