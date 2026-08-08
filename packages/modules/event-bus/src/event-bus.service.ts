import { randomUUID } from 'node:crypto';
import {
  ROOT_CONTEXT,
  SpanStatusCode,
  context as otelContext,
  trace as otelTrace
} from '@opentelemetry/api';
import { getPool, type TenantUnitOfWork } from '@cvg-his-v2/shared-database';
import { getTenantContext, requireAccountId, withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type {
  ClaimPendingInput,
  OutboxClaim,
  OutboxEvent,
  OutboxRepository,
  RetryClaimInput
} from './outbox.interface.js';

export type { OutboxEvent, OutboxRepository } from './outbox.interface.js';

export interface CreateOutboxEventInput {
  accountId?: AccountId;
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

export interface ConsumerExecutionGuard {
  readonly durable?: boolean;
  executeOnce(
    event: OutboxEvent,
    consumerName: string,
    handler: () => Promise<void>
  ): Promise<boolean>;
}

export interface EventBusOptions {
  readonly workerId?: string;
  readonly leaseMs?: number;
  readonly consumerGuard?: ConsumerExecutionGuard;
}

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

const directConsumerGuard: ConsumerExecutionGuard = {
  durable: false,
  async executeOnce(_event, _consumerName, handler) {
    await handler();
    return true;
  }
};

export class TenantUnitOfWorkConsumerGuard implements ConsumerExecutionGuard {
  public readonly durable = true;

  public constructor(private readonly unitOfWork: TenantUnitOfWork) {}

  public async executeOnce(
    event: OutboxEvent,
    consumerName: string,
    handler: () => Promise<void>
  ): Promise<boolean> {
    const result = await this.unitOfWork.execute(
      {
        accountId: event.accountId,
        actorUserId: 'system:event-bus',
        correlationId: event.correlationId,
        operation: `event.consume.${consumerName}`,
        idempotencyKey: event.id
      },
      { eventId: event.id, eventType: event.eventType, consumerName },
      async (transaction) => {
        const claimed = await transaction.inbox.claim(consumerName, event.id);
        if (!claimed) return { processed: false };
        await handler();
        return { processed: true };
      }
    );
    return result.value.processed;
  }
}

function computeBackoffDelay(attempt: number, opts: BackoffOptions): number {
  return Math.min(opts.baseMs * Math.pow(2, attempt), opts.maxMs);
}

function normalizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length <= 4_000 ? message : `${message.slice(0, 3_997)}...`;
}

function parseOutboxPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    return JSON.parse(payload) as Record<string, unknown>;
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return {};
}

interface OutboxTraceMeta {
  readonly traceparent?: string;
  readonly sourceService?: string;
}

function readTraceMeta(event: OutboxEvent): OutboxTraceMeta {
  const meta = event.payload['_meta'];
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  const candidate = meta as Record<string, unknown>;
  return {
    traceparent: typeof candidate.traceparent === 'string' ? candidate.traceparent : undefined,
    sourceService: typeof candidate.sourceService === 'string' ? candidate.sourceService : undefined
  };
}

function parseTraceparent(traceparent?: string) {
  if (!traceparent) {
    return undefined;
  }

  const match = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/i.exec(traceparent.trim());
  if (!match) {
    return undefined;
  }

  return {
    traceId: match[1],
    spanId: match[2],
    traceFlags: parseInt(match[3], 16)
  };
}

async function withEventSpan<T>(event: OutboxEvent, fn: () => Promise<T>): Promise<T> {
  const tracer = otelTrace.getTracer('cvg-his-v2.event-bus');
  const traceMeta = readTraceMeta(event);
  const upstreamContext = parseTraceparent(traceMeta.traceparent);
  const parentContext = upstreamContext
    ? otelTrace.setSpanContext(ROOT_CONTEXT, {
        ...upstreamContext,
        isRemote: true
      })
    : ROOT_CONTEXT;

  return await tracer.startActiveSpan(
    `eventbus.process ${event.eventType}`,
    {
      attributes: {
        'eventbus.event_id': event.id,
        'eventbus.event_type': event.eventType,
        'eventbus.module_name': event.moduleName,
        'eventbus.correlation_id': event.correlationId,
        'eventbus.attempt': event.attempts,
        'eventbus.max_attempts': event.maxAttempts,
        'eventbus.source_service': traceMeta.sourceService ?? 'unknown',
        'eventbus.async_parent_present': upstreamContext ? 1 : 0
      }
    },
    parentContext,
    async (span) => {
      try {
        const result = await otelContext.with(otelTrace.setSpan(parentContext, span), fn);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

export class DatabaseOutboxRepository implements OutboxRepository {
  readonly deliveryGuarantees = 'durable' as const;

  async create(event: OutboxEvent): Promise<void> {
    if (!event.accountId) {
      throw new Error('Outbox event requires an accountId');
    }
    const accountId = requireAccountId();
    if (event.accountId !== accountId) {
      throw new Error('Outbox event account does not match tenant context');
    }
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO outbox_events (id, account_id, correlation_id, module_name, event_type, payload, status, attempts, max_attempts, scheduled_at, processed_at, error, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          event.id,
          event.accountId,
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
    const accountId = requireAccountId();
    if (event.accountId !== accountId) {
      throw new Error('Outbox event account does not match tenant context');
    }
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE outbox_events
         SET status = $2,
             attempts = $3,
             scheduled_at = $4,
             processed_at = $5,
             error = $6
         WHERE id = $1
           AND account_id = $7
           AND status <> 'processing'`,
        [
          event.id,
          event.status,
          event.attempts,
          new Date(event.scheduledAt),
          event.processedAt ? new Date(event.processedAt) : null,
          event.error,
          event.accountId
        ]
      );
      if (result.rowCount !== 1) {
        throw new Error('Outbox administrative update rejected or event not found');
      }
    });
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM outbox_events WHERE id = $1 AND account_id = $2',
        [id, accountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async claimPending(input: ClaimPendingInput): Promise<readonly OutboxClaim[]> {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 500) {
      throw new Error('Outbox claim limit must be an integer between 1 and 500');
    }
    if (!input.leaseOwner || input.leaseOwner.length > 160) {
      throw new Error('Outbox lease owner must contain 1 to 160 characters');
    }
    if (!Number.isInteger(input.leaseMs) || input.leaseMs < 1_000 || input.leaseMs > 900_000) {
      throw new Error('Outbox lease duration must be between 1000 and 900000 milliseconds');
    }
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE outbox_events
         SET status = 'failed',
             error = COALESCE(error || E'\n', '') || '[DLQ] Lease expired after final attempt',
             lease_owner = NULL,
             lease_token = NULL,
             lease_expires_at = NULL
         WHERE account_id = $1
           AND status = 'processing'
           AND lease_expires_at <= now()
           AND attempts >= max_attempts`,
        [accountId]
      );
      const result = await client.query(
        `WITH candidates AS (
           SELECT id
           FROM outbox_events
           WHERE account_id = $1
             AND (
               (status IN ('pending', 'retrying') AND scheduled_at <= now())
               OR (status = 'processing' AND lease_expires_at <= now())
             )
             AND attempts < max_attempts
           ORDER BY scheduled_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $2
         )
         UPDATE outbox_events AS event
         SET status = 'processing',
             attempts = event.attempts + 1,
             lease_owner = $3,
             lease_token = gen_random_uuid(),
             lease_version = event.lease_version + 1,
             lease_expires_at = now() + ($4::text || ' milliseconds')::interval,
             last_attempt_at = now(),
             error = NULL
         FROM candidates
         WHERE event.id = candidates.id
           AND event.account_id = $1
         RETURNING event.*`,
        [accountId, input.limit, input.leaseOwner, input.leaseMs]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapClaim(row));
    });
  }

  async renewClaim(claim: OutboxClaim, leaseMs: number): Promise<boolean> {
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 900_000) {
      throw new Error('Outbox lease duration must be between 1000 and 900000 milliseconds');
    }
    this.assertClaimAccount(claim);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE outbox_events
         SET lease_expires_at = now() + ($6::text || ' milliseconds')::interval
         WHERE id = $1
           AND account_id = $2
           AND status = 'processing'
           AND lease_owner = $3
           AND lease_token = $4::uuid
           AND lease_version = $5
           AND lease_expires_at > now()`,
        this.claimParameters(claim, leaseMs)
      );
      return result.rowCount === 1;
    });
  }

  async completeClaim(claim: OutboxClaim, processedAt: string): Promise<boolean> {
    return this.transitionClaim(
      claim,
      `status = 'completed', processed_at = $6, error = NULL`,
      [new Date(processedAt)]
    );
  }

  async retryClaim(claim: OutboxClaim, input: RetryClaimInput): Promise<boolean> {
    return this.transitionClaim(
      claim,
      `status = 'retrying', scheduled_at = $6, error = $7`,
      [new Date(input.scheduledAt), input.error]
    );
  }

  async failClaim(claim: OutboxClaim, error: string): Promise<boolean> {
    return this.transitionClaim(claim, `status = 'failed', error = $6`, [error]);
  }

  async reprocess(eventId: string): Promise<OutboxEvent | null> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE outbox_events
         SET status = 'pending',
             attempts = 0,
             scheduled_at = now(),
             processed_at = NULL,
             error = NULL,
             lease_owner = NULL,
             lease_token = NULL,
             lease_expires_at = NULL
         WHERE id = $1
           AND account_id = $2
           AND status IN ('failed', 'retrying')
         RETURNING *`,
        [eventId, accountId]
      );
      return result.rows[0] ? this.mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async peekPending(limit: number): Promise<readonly OutboxEvent[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT *
         FROM outbox_events
         WHERE account_id = $1
           AND status IN ('pending', 'retrying')
           AND attempts < max_attempts
           AND scheduled_at <= now()
         ORDER BY scheduled_at ASC
         LIMIT $2`,
        [accountId, limit]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findFailed(limit: number): Promise<readonly OutboxEvent[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM outbox_events
         WHERE account_id = $1
           AND status = 'failed'
         ORDER BY created_at DESC
         LIMIT $2`,
        [accountId, limit]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM outbox_events
         WHERE correlation_id = $1 AND account_id = $2
         ORDER BY created_at DESC`,
        [correlationId, accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  private mapRow(row: Record<string, unknown>): OutboxEvent {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      correlationId: row.correlation_id as CorrelationId,
      moduleName: row.module_name as ModuleName,
      eventType: row.event_type as string,
      payload: parseOutboxPayload(row.payload),
      status: row.status as OutboxEvent['status'],
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      scheduledAt: new Date(row.scheduled_at as Date).toISOString(),
      processedAt: row.processed_at ? (row.processed_at as Date).toISOString() : null,
      error: (row.error as string) ?? null,
      createdAt: new Date(row.created_at as Date).toISOString()
    };
  }

  private mapClaim(row: Record<string, unknown>): OutboxClaim {
    return {
      event: this.mapRow(row),
      leaseOwner: row.lease_owner as string,
      leaseToken: row.lease_token as string,
      leaseVersion: Number(row.lease_version),
      leaseExpiresAt: new Date(row.lease_expires_at as Date).toISOString()
    };
  }

  private claimParameters(claim: OutboxClaim, extra?: unknown): unknown[] {
    return [
      claim.event.id,
      claim.event.accountId,
      claim.leaseOwner,
      claim.leaseToken,
      claim.leaseVersion,
      extra
    ];
  }

  private assertClaimAccount(claim: OutboxClaim): void {
    if (claim.event.accountId !== requireAccountId()) {
      throw new Error('Outbox claim account does not match tenant context');
    }
  }

  private async transitionClaim(
    claim: OutboxClaim,
    setClause: string,
    values: readonly unknown[]
  ): Promise<boolean> {
    this.assertClaimAccount(claim);
    return withTenantQuery(getPool(), async (client) => {
      const parameters = [...this.claimParameters(claim).slice(0, 5), ...values];
      const result = await client.query(
        `UPDATE outbox_events
         SET ${setClause},
             lease_owner = NULL,
             lease_token = NULL,
             lease_expires_at = NULL
         WHERE id = $1
           AND account_id = $2
           AND status = 'processing'
           AND lease_owner = $3
           AND lease_token = $4::uuid
           AND lease_version = $5
           AND lease_expires_at > now()`,
        parameters
      );
      return result.rowCount === 1;
    });
  }
}

export class EventBusService {
  readonly #repository: OutboxRepository;
  readonly #handlers: Map<string, EventHandler>;
  readonly #backoff: BackoffOptions;
  readonly #workerId: string;
  readonly #leaseMs: number;
  readonly #consumerGuard: ConsumerExecutionGuard;
  readonly #requiresDurableGuard: boolean;

  constructor(
    repository?: OutboxRepository,
    backoff?: BackoffOptions,
    options: EventBusOptions = {}
  ) {
    this.#repository = repository ?? new DatabaseOutboxRepository();
    this.#handlers = new Map();
    this.#backoff = backoff ?? DEFAULT_BACKOFF;
    this.#workerId = options.workerId ?? `event-bus-${process.pid}-${randomUUID()}`;
    this.#leaseMs = options.leaseMs ?? 60_000;
    this.#consumerGuard = options.consumerGuard ?? directConsumerGuard;
    this.#requiresDurableGuard = this.#repository.deliveryGuarantees !== 'ephemeral';
  }

  /**
   * Subscribe an event handler to be called when events are processed.
   * Handlers are called after an event is marked as 'completed'.
   */
  subscribe(handler: EventHandler): () => void;
  subscribe(consumerName: string, handler: EventHandler): () => void;
  subscribe(nameOrHandler: string | EventHandler, maybeHandler?: EventHandler): () => void {
    const named = typeof nameOrHandler === 'string';
    if (!named && this.#consumerGuard.durable) {
      throw new Error('Durable event consumers require a stable consumer name');
    }
    const name = named ? nameOrHandler : `anonymous-${this.#handlers.size + 1}`;
    const handler = named ? maybeHandler : nameOrHandler;
    if (!handler) throw new Error('Event consumer handler is required');
    if (!name || name.length > 100) {
      throw new Error('Event consumer name must contain 1 to 100 characters');
    }
    if (this.#handlers.has(name)) throw new Error(`Event consumer '${name}' is already registered`);
    this.#handlers.set(name, handler);
    return () => this.#handlers.delete(name);
  }

  get consumerCount(): number {
    return this.#handlers.size;
  }

  get consumerNames(): readonly string[] {
    return [...this.#handlers.keys()];
  }

  get deliveryGuaranteesDurable(): boolean {
    return this.#consumerGuard.durable === true;
  }

  async publish(input: CreateOutboxEventInput): Promise<OutboxEvent> {
    const rawMeta = input.payload['_meta'];
    if (rawMeta !== undefined && (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta))) {
      throw new Error('Outbox payload _meta must be an object');
    }
    const payloadMeta = (rawMeta ?? {}) as Record<string, unknown>;
    const payloadAccountId =
      typeof input.payload.accountId === 'string'
        ? input.payload.accountId
        : typeof (input.payload._meta as Record<string, unknown> | undefined)?.accountId === 'string'
          ? ((input.payload._meta as Record<string, unknown>).accountId as string)
          : undefined;
    const accountId = input.accountId ?? getTenantContext()?.accountId ?? payloadAccountId;
    if (!accountId) throw new Error('Outbox event requires an accountId');
    if (payloadAccountId && payloadAccountId !== accountId) {
      throw new Error('Outbox payload account does not match event account');
    }
    const event: OutboxEvent = {
      id: randomUUID(),
      accountId: accountId as AccountId,
      correlationId: input.correlationId,
      moduleName: input.moduleName,
      eventType: input.eventType,
      payload: {
        ...input.payload,
        accountId,
        _meta: { ...payloadMeta, accountId }
      },
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
    if (this.#handlers.size === 0) {
      return [];
    }
    if (this.#requiresDurableGuard && !this.deliveryGuaranteesDurable) {
      throw new Error('Database outbox processing requires a durable consumer guard');
    }
    const processed: OutboxEvent[] = [];
    for (let claimIndex = 0; claimIndex < limit; claimIndex += 1) {
      const [claim] = await this.#repository.claimPending({
        limit: 1,
        leaseOwner: this.#workerId,
        leaseMs: this.#leaseMs
      });
      if (!claim) break;
      const event = claim.event;
      console.info(`[EventBus] Processing claimed event with ${this.#handlers.size} handler(s) registered`);
      await withEventSpan(event, async () => {
        console.info(
          `[EventBus] Dispatching event ${event.eventType} (${event.id}) correlation=${event.correlationId} to ${this.#handlers.size} handler(s) — attempt ${event.attempts}/${event.maxAttempts}`
        );

        try {
          const payloadAccountId = event.payload['accountId'];
          const rawMeta = event.payload['_meta'];
          if (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta)) {
            throw new Error('Outbox payload _meta must be an object with the claimed event account');
          }
          const metaAccountId = (rawMeta as Record<string, unknown>)['accountId'];
          if (
            payloadAccountId !== event.accountId ||
            metaAccountId !== event.accountId
          ) {
            throw new Error('Outbox payload account does not match claimed event account');
          }
          await this.#withLeaseHeartbeat(claim, async () => {
            for (const [consumerName, handler] of this.#handlers) {
              await this.#consumerGuard.executeOnce(
                event,
                consumerName,
                () => handler(event)
              );
            }
          });

          const completed: OutboxEvent = {
            ...event,
            status: 'completed',
            processedAt: nowIso()
          };
          const completedByOwner = await this.#repository.completeClaim(
            claim,
            completed.processedAt as string
          );
          if (!completedByOwner) {
            console.warn(`[EventBus] Lease lost before completion for event ${event.id}`);
            return;
          }
          processed.push(completed);
          console.info(
            `[EventBus] Event ${event.eventType} (${event.id}) correlation=${event.correlationId} completed — ${this.#handlers.size} handler(s) succeeded`
          );
        } catch (err) {
          const errorMessage = normalizeErrorMessage(err);
          const shouldRetry = event.attempts < event.maxAttempts;

          if (shouldRetry) {
            const delayMs = computeBackoffDelay(Math.max(0, event.attempts - 1), this.#backoff);
            const scheduledAt = new Date(Date.now() + delayMs).toISOString();
            const retried = await this.#repository.retryClaim(claim, {
              scheduledAt,
              error: errorMessage
            });
            if (!retried) {
              console.warn(`[EventBus] Lease lost before retry transition for event ${event.id}`);
              return;
            }
            console.warn(
              `[EventBus] ${event.eventType} (${event.id}) correlation=${event.correlationId} retry ${event.attempts}/${event.maxAttempts} in ${delayMs}ms: ${errorMessage}`
            );
          } else {
            const failed = await this.#repository.failClaim(
              claim,
              `[DLQ] All ${event.maxAttempts} attempts exhausted. Last error: ${errorMessage}`
            );
            if (!failed) {
              console.warn(`[EventBus] Lease lost before DLQ transition for event ${event.id}`);
              return;
            }
            console.error(
              `[EventBus] [DLQ] ${event.eventType} (${event.id}) correlation=${event.correlationId} moved to dead-letter queue after ${event.maxAttempts} attempts: ${errorMessage}`
            );
          }
        }
      });
    }

    return processed;
  }

  async #withLeaseHeartbeat<T>(claim: OutboxClaim, operation: () => Promise<T>): Promise<T> {
    const intervalMs = Math.max(250, Math.floor(this.#leaseMs / 3));
    let leaseLost = false;
    let heartbeatError: Error | null = null;
    let heartbeatInFlight: Promise<void> = Promise.resolve();
    const timer = setInterval(() => {
      heartbeatInFlight = heartbeatInFlight.then(async () => {
        if (!await this.#repository.renewClaim(claim, this.#leaseMs)) {
          leaseLost = true;
        }
      }).catch((error: unknown) => {
        heartbeatError = error instanceof Error ? error : new Error(String(error));
        leaseLost = true;
      });
    }, intervalMs);
    timer.unref?.();

    try {
      const result = await operation();
      await heartbeatInFlight;
      if (heartbeatError) throw heartbeatError;
      if (leaseLost) throw new Error('Outbox lease was lost while processing the event');
      return result;
    } finally {
      clearInterval(timer);
      await heartbeatInFlight;
    }
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
    return this.#repository.reprocess(eventId);
  }

  /**
   * Return event count breakdown by status.
   * Useful for operational dashboards without fetching full event lists.
   */
  async countEvents(): Promise<{ pending: number; retrying: number; completed: number; failed: number; total: number }> {
    const accountId = requireAccountId();
    return withTenantQuery(getPool(), async (client) => {
      const countResult = await client.query(
        `SELECT status, COUNT(*) as count
         FROM outbox_events
         WHERE account_id = $1
         GROUP BY status`,
        [accountId]
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
    return this.#repository.peekPending(limit);
  }
}
