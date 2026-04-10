import { randomUUID } from 'node:crypto';
import { getPool } from '@cvg-his-v2/shared-database';
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

export class DatabaseOutboxRepository implements OutboxRepository {
  async create(event: OutboxEvent): Promise<void> {
    const pool = getPool();
    await pool.query(
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
  }

  async update(event: OutboxEvent): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE outbox_events SET status = $2, attempts = $3, processed_at = $4, error = $5 WHERE id = $1`,
      [
        event.id,
        event.status,
        event.attempts,
        event.processedAt ? new Date(event.processedAt) : null,
        event.error
      ]
    );
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM outbox_events WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findPending(limit: number): Promise<readonly OutboxEvent[]> {
    const pool = getPool();
    const now = new Date();
    const result = await pool.query(
      `SELECT * FROM outbox_events
       WHERE status IN ('pending', 'retrying')
         AND attempts < max_attempts
         AND scheduled_at <= $1
       ORDER BY scheduled_at ASC
       LIMIT $2`,
      [now, limit]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM outbox_events WHERE correlation_id = $1 ORDER BY created_at DESC',
      [correlationId]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
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

  constructor(repository?: OutboxRepository) {
    this.#repository = repository ?? new DatabaseOutboxRepository();
    this.#handlers = new Set();
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

  async processPending(limit = 10): Promise<readonly OutboxEvent[]> {
    const pending = await this.#repository.findPending(limit);
    const processed: OutboxEvent[] = [];

    for (const event of pending) {
      const updated: OutboxEvent = {
        ...event,
        status: 'processing'
      };
      await this.#repository.update(updated);

      try {
        // Notify all subscribers before marking as completed
        await Promise.all(
          Array.from(this.#handlers).map((handler) =>
            handler(event).catch((err) => {
              console.error(`[EventBus] Handler error for ${event.eventType}:`, err);
            })
          )
        );

        const completed: OutboxEvent = {
          ...updated,
          status: 'completed',
          processedAt: nowIso()
        };
        await this.#repository.update(completed);
        processed.push(completed);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const shouldRetry = event.attempts + 1 < event.maxAttempts;

        const failed: OutboxEvent = {
          ...event,
          status: shouldRetry ? 'retrying' : 'failed',
          attempts: event.attempts + 1,
          error: errorMessage
        };
        await this.#repository.update(failed);
      }
    }

    return processed;
  }

  async getEvent(id: string): Promise<OutboxEvent | null> {
    return this.#repository.findById(id);
  }

  async getEventsByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    return this.#repository.findByCorrelationId(correlationId);
  }
}