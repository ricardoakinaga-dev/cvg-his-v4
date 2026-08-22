import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

import { createScopedDatabaseClient, type DatabaseClient } from './client.js';
import {
  getDatabaseTransactionScope,
  runWithDatabaseTransactionScope
} from './transaction-scope.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface TenantUnitOfWorkExecutionContext {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
  readonly operation: string;
  readonly idempotencyKey: string;
}

export interface TransactionalOutboxInput {
  readonly id?: string;
  readonly moduleName: string;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly maxAttempts?: number;
  readonly scheduledAt?: Date;
}

export interface TransactionalAuditInput {
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly before?: Readonly<Record<string, unknown>>;
  readonly after?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

export interface TenantTransactionContext {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
  readonly client: PoolClient;
  readonly database: DatabaseClient;
  readonly outbox: {
    append(input: TransactionalOutboxInput): Promise<string>;
  };
  readonly inbox: {
    claim(consumerName: string, eventId: string): Promise<boolean>;
  };
  readonly audit: {
    append(input: TransactionalAuditInput): Promise<string>;
  };
}

const tenantTransactionStorage = new AsyncLocalStorage<TenantTransactionContext>();

export function getTenantTransactionContext(): TenantTransactionContext | undefined {
  return tenantTransactionStorage.getStore();
}

export interface TenantUnitOfWorkResult<T extends JsonValue> {
  readonly value: T;
  readonly replayed: boolean;
}

export interface TenantUnitOfWork {
  execute<T extends JsonValue>(
    context: TenantUnitOfWorkExecutionContext,
    requestPayload: JsonValue,
    command: (transaction: TenantTransactionContext) => Promise<T>
  ): Promise<TenantUnitOfWorkResult<T>>;
}

interface IdempotencyRow {
  readonly request_hash: string;
  readonly status: 'processing' | 'completed';
  readonly response_body: JsonValue | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 100_000;

export class IdempotencyConflictError extends Error {
  public readonly code = 'IDEMPOTENCY_CONFLICT';

  public constructor() {
    super('Idempotency key was already used with a different request');
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInProgressError extends Error {
  public readonly code = 'IDEMPOTENCY_IN_PROGRESS';

  public constructor() {
    super('Idempotent request is still processing');
    this.name = 'IdempotencyInProgressError';
  }
}

interface JsonTraversalState {
  nodes: number;
  readonly ancestors: WeakSet<object>;
}

function canonicalize(
  value: unknown,
  state: JsonTraversalState = { nodes: 0, ancestors: new WeakSet<object>() },
  depth = 0
): string {
  state.nodes += 1;
  if (state.nodes > MAX_JSON_NODES) throw new Error('JSON payload is too complex');
  if (depth > MAX_JSON_DEPTH) throw new Error('JSON payload exceeds maximum depth');
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('JSON payload numbers must be finite');
    }
    if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) {
      throw new Error('JSON payload contains an unsupported value');
    }
    return JSON.stringify(value);
  }
  if (state.ancestors.has(value)) throw new Error('JSON payload cannot contain circular references');
  state.ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new Error('JSON payload cannot contain sparse arrays');
    }
    const serialized = `[${value.map((item) => canonicalize(item, state, depth + 1)).join(',')}]`;
    state.ancestors.delete(value);
    return serialized;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error('JSON payload must contain only plain objects and arrays');
  }
  const record = value as Readonly<Record<string, unknown>>;
  const serialized = `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], state, depth + 1)}`)
    .join(',')}}`;
  state.ancestors.delete(value);
  return serialized;
}

export function hashIdempotencyPayload(payload: JsonValue): string {
  const canonicalPayload = canonicalize(payload);
  if (Buffer.byteLength(canonicalPayload, 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error('Idempotency request payload exceeds 1 MiB');
  }
  return createHash('sha256').update(canonicalPayload).digest('hex');
}

function assertExecutionContext(context: TenantUnitOfWorkExecutionContext): void {
  if (!UUID_PATTERN.test(context.accountId)) throw new Error('Tenant unit of work requires a valid account id');
  if (!context.actorUserId || context.actorUserId.length > 255) throw new Error('Tenant unit of work requires an actor user id');
  if (!context.correlationId || context.correlationId.length > 255) throw new Error('Tenant unit of work requires a correlation id');
  if (!context.operation || context.operation.length > 128) throw new Error('Idempotency operation must contain 1 to 128 characters');
  if (!context.idempotencyKey || context.idempotencyKey.length > 255) throw new Error('Idempotency key must contain 1 to 255 characters');
}

function assertName(value: string, label: string, maximum: number): void {
  if (!value || value.length > maximum) throw new Error(`${label} must contain 1 to ${maximum} characters`);
}

function createGuardedPoolClient(client: PoolClient, isActive: () => boolean): PoolClient {
  const blockedProperties = new Set<PropertyKey>(['connection', 'connect', 'end', 'release']);
  let guardedClient!: PoolClient;
  guardedClient = new Proxy(client, {
    get(target, property) {
      if (blockedProperties.has(property)) {
        throw new Error('Tenant transaction client lifecycle is managed by the unit of work');
      }
      const value = Reflect.get(target, property, target) as unknown;
      if (typeof value !== 'function') return value;
      return (...args: readonly unknown[]) => {
        if (!isActive()) throw new Error('Tenant transaction scope is no longer active');
        const result = Reflect.apply(value, target, args) as unknown;
        return result === target ? guardedClient : result;
      };
    }
  }) as PoolClient;
  return guardedClient;
}

async function beginTenantTransaction<T>(
  pool: Pool,
  accountId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const activeScope = getDatabaseTransactionScope();
  if (activeScope) {
    if (!activeScope.isActive()) throw new Error('Tenant transaction scope is no longer active');
    if (activeScope.pool !== pool) {
      throw new Error('Nested tenant unit of work cannot change database pool');
    }
    if (activeScope.accountId !== accountId) {
      throw new Error('Nested tenant unit of work cannot change account');
    }
    return operation(activeScope.client);
  }

  const client = await pool.connect();
  let transactionStarted = false;
  let commitAttempted = false;
  let scopeActive = true;
  let releaseError: Error | undefined;
  const guardedClient = createGuardedPoolClient(client, () => scopeActive);
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const verification = await client.query<{ matches: boolean }>(
      "SELECT current_setting('app.current_account_id', true) = $1 AS matches",
      [accountId]
    );
    if (verification.rows[0]?.matches !== true) {
      throw new Error('Failed to establish tenant database context');
    }
    const result = await runWithDatabaseTransactionScope(
      { accountId, pool, client: guardedClient, isActive: () => scopeActive },
      () => operation(guardedClient)
    );
    scopeActive = false;
    commitAttempted = true;
    await client.query('COMMIT');
    return result;
  } catch (error) {
    scopeActive = false;
    if (commitAttempted) {
      releaseError = error instanceof Error ? error : new Error(String(error));
    }
    if (transactionStarted) {
      await client.query('ROLLBACK').catch((rollbackError: unknown) => {
        releaseError = rollbackError instanceof Error
          ? rollbackError
          : new Error(String(rollbackError));
      });
    }
    throw error;
  } finally {
    scopeActive = false;
    client.release(releaseError);
  }
}

export async function runInTenantTransaction<T>(
  pool: Pool,
  accountId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!UUID_PATTERN.test(accountId)) throw new Error('Tenant transaction requires a valid account id');
  return beginTenantTransaction(pool, accountId, operation);
}

function createTransactionContext(
  client: PoolClient,
  context: TenantUnitOfWorkExecutionContext,
  isActive: () => boolean
): TenantTransactionContext {
  if (!isActive()) throw new Error('Tenant transaction scope is no longer active');
  return {
    accountId: context.accountId,
    actorUserId: context.actorUserId,
    correlationId: context.correlationId,
    client,
    database: createScopedDatabaseClient(client),
    outbox: {
      async append(input) {
        assertName(input.moduleName, 'Outbox module name', 100);
        assertName(input.eventType, 'Outbox event type', 100);
        const payloadAccountId = input.payload['accountId'];
        const rawMeta = input.payload['_meta'];
        if (rawMeta !== undefined && (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta))) {
          throw new Error('Outbox payload _meta must be an object');
        }
        const payloadMeta = (rawMeta ?? {}) as Readonly<Record<string, unknown>>;
        const metaAccountId = payloadMeta['accountId'];
        if (payloadAccountId !== undefined && payloadAccountId !== context.accountId) {
          throw new Error('Outbox payload account does not match transaction account');
        }
        if (metaAccountId !== undefined && metaAccountId !== context.accountId) {
          throw new Error('Outbox payload metadata account does not match transaction account');
        }
        const payload = canonicalize({
          ...input.payload,
          accountId: context.accountId,
          _meta: { ...payloadMeta, accountId: context.accountId }
        });
        if (Buffer.byteLength(payload, 'utf8') > MAX_REQUEST_BYTES) throw new Error('Outbox payload exceeds 1 MiB');
        const id = input.id ?? randomUUID();
        await client.query(
          `INSERT INTO outbox_events
             (id, account_id, correlation_id, module_name, event_type, payload, status,
              attempts, max_attempts, scheduled_at, processed_at, error, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending', 0, $7, $8, NULL, NULL, now())`,
          [
            id,
            context.accountId,
            context.correlationId,
            input.moduleName,
            input.eventType,
            payload,
            input.maxAttempts ?? 3,
            input.scheduledAt ?? new Date()
          ]
        );
        return id;
      }
    },
    inbox: {
      async claim(consumerName, eventId) {
        assertName(consumerName, 'Inbox consumer name', 128);
        assertName(eventId, 'Inbox event id', 255);
        const result = await client.query(
          `INSERT INTO inbox_events (account_id, consumer_name, event_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (account_id, consumer_name, event_id) DO NOTHING
           RETURNING id`,
          [context.accountId, consumerName, eventId]
        );
        return result.rowCount === 1;
      }
    },
    audit: {
      async append(input) {
        assertName(input.entityType, 'Audit entity type', 64);
        assertName(input.entityId, 'Audit entity id', 128);
        assertName(input.action, 'Audit action', 64);
        const id = randomUUID();
        await client.query(
          `INSERT INTO audit_events
             (id, account_id, actor_user_id, action, entity_type, entity_id, metadata,
              correlation_id, occurred_at, before_json, after_json, reason, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now(), $9::jsonb, $10::jsonb, $11, now())`,
          [
            id,
            context.accountId,
            context.actorUserId,
            input.action,
            input.entityType,
            input.entityId,
            JSON.stringify(input.metadata ?? null),
            context.correlationId,
            JSON.stringify(input.before ?? null),
            JSON.stringify(input.after ?? null),
            input.reason ?? null
          ]
        );
        return id;
      }
    }
  };
}

export function createTenantUnitOfWork(pool: Pool): TenantUnitOfWork {
  return {
    async execute<T extends JsonValue>(
      context: TenantUnitOfWorkExecutionContext,
      requestPayload: JsonValue,
      command: (transaction: TenantTransactionContext) => Promise<T>
    ): Promise<TenantUnitOfWorkResult<T>> {
      if (getDatabaseTransactionScope()) {
        throw new Error('Nested idempotent unit of work commands are not supported');
      }
      assertExecutionContext(context);
      const requestHash = hashIdempotencyPayload(requestPayload);
      return beginTenantTransaction<TenantUnitOfWorkResult<T>>(pool, context.accountId, async (client) => {
        const inserted = await client.query<IdempotencyRow>(
          `INSERT INTO idempotency_requests
             (account_id, operation, idempotency_key, request_hash, status)
           VALUES ($1, $2, $3, $4, 'processing')
           ON CONFLICT (account_id, operation, idempotency_key) DO NOTHING
           RETURNING request_hash, status, response_body`,
          [context.accountId, context.operation, context.idempotencyKey, requestHash]
        );

        let record = inserted.rows[0];
        if (!record) {
          const existing = await client.query<IdempotencyRow>(
            `SELECT request_hash, status, response_body
             FROM idempotency_requests
             WHERE account_id = $1 AND operation = $2 AND idempotency_key = $3
             FOR UPDATE`,
            [context.accountId, context.operation, context.idempotencyKey]
          );
          record = existing.rows[0];
        }
        if (!record) throw new Error('Idempotency record could not be acquired');
        if (record.request_hash !== requestHash) throw new IdempotencyConflictError();
        if (record.status === 'completed') {
          return { value: record.response_body as T, replayed: true };
        }
        if (inserted.rowCount !== 1) throw new IdempotencyInProgressError();

        const activeScope = getDatabaseTransactionScope();
        const transaction = createTransactionContext(
          client,
          context,
          () => activeScope?.isActive() === true
        );
        const value = await tenantTransactionStorage.run(
          transaction,
          () => command(transaction)
        );
        const serialized = canonicalize(value);
        if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_BYTES) {
          throw new Error('Idempotency response exceeds 256 KiB');
        }
        await client.query(
          `UPDATE idempotency_requests
           SET status = 'completed', response_body = $4::jsonb, completed_at = now()
           WHERE account_id = $1 AND operation = $2 AND idempotency_key = $3 AND status = 'processing'`,
          [context.accountId, context.operation, context.idempotencyKey, serialized]
        );
        return { value, replayed: false };
      });
    }
  };
}
