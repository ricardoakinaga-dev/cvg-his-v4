import { randomUUID } from 'node:crypto';

import { Client } from 'pg';

import type { CacheSyncBus, CacheSyncEntity, CacheSyncEvent, CacheSyncHandler } from '@cvg-his-v2/shared-types';

import { getDatabaseTransactionScope } from './transaction-scope.js';

export interface CacheSyncLogger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const silentLogger: CacheSyncLogger = { warn: () => undefined, error: () => undefined };

const CACHE_SYNC_ENTITIES: ReadonlySet<CacheSyncEntity> = new Set(['owner', 'patient', 'encounter']);
const DEFAULT_CHANNEL = 'cvg_cache_sync';
/** PostgreSQL rejects NOTIFY payloads above 8000 bytes; ours are far smaller. */
const MAX_PAYLOAD_BYTES = 7_000;

export interface PostgresCacheSyncBusOptions {
  readonly connectionString: string;
  readonly channel?: string;
  readonly originId?: string;
  readonly logger?: CacheSyncLogger;
  /** Milliseconds between reconnect attempts after the LISTEN connection drops. */
  readonly reconnectDelayMs?: number;
  /** Executes NOTIFY. Defaults to a dedicated client; runtimes may pass the shared pool. */
  readonly notify?: (channel: string, payload: string) => Promise<void>;
}

function parseEvent(raw: string | undefined): CacheSyncEvent | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const event = parsed as Record<string, unknown>;
  if (
    !CACHE_SYNC_ENTITIES.has(event.entity as CacheSyncEntity) ||
    typeof event.accountId !== 'string' ||
    typeof event.id !== 'string' ||
    (event.op !== 'upsert' && event.op !== 'delete') ||
    typeof event.origin !== 'string' ||
    typeof event.emittedAt !== 'string'
  ) {
    return null;
  }
  return event as unknown as CacheSyncEvent;
}

/**
 * Dispatches events to per-entity handlers, ignoring events published by the
 * same origin. Shared by the PostgreSQL and in-memory implementations.
 */
abstract class BaseCacheSyncBus implements CacheSyncBus {
  readonly originId: string;
  readonly #handlers = new Map<CacheSyncEntity, Set<CacheSyncHandler>>();
  protected readonly logger: CacheSyncLogger;

  protected constructor(originId?: string, logger?: CacheSyncLogger) {
    this.originId = originId ?? randomUUID();
    this.logger = logger ?? silentLogger;
  }

  abstract publish(event: Omit<CacheSyncEvent, 'origin' | 'emittedAt'>): Promise<void>;

  subscribe(entity: CacheSyncEntity, handler: CacheSyncHandler): () => void {
    const handlers = this.#handlers.get(entity) ?? new Set<CacheSyncHandler>();
    handlers.add(handler);
    this.#handlers.set(entity, handlers);
    return () => {
      handlers.delete(handler);
    };
  }

  protected stamp(event: Omit<CacheSyncEvent, 'origin' | 'emittedAt'>): CacheSyncEvent {
    return { ...event, origin: this.originId, emittedAt: new Date().toISOString() };
  }

  protected async dispatch(event: CacheSyncEvent): Promise<void> {
    if (event.origin === this.originId) return;
    const handlers = this.#handlers.get(event.entity);
    if (!handlers || handlers.size === 0) return;
    await Promise.all(
      Array.from(handlers, async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error('cache sync handler failed', {
            entity: event.entity,
            op: event.op,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })
    );
  }
}

/**
 * Cross-replica cache synchronization over PostgreSQL LISTEN/NOTIFY.
 *
 * One dedicated connection stays subscribed to the channel; NOTIFY payloads are
 * JSON `CacheSyncEvent`s. NOTIFY is transactional, so publishing after a commit
 * guarantees that a replica re-reading the row observes the committed state.
 */
export class PostgresCacheSyncBus extends BaseCacheSyncBus {
  readonly #connectionString: string;
  readonly #channel: string;
  readonly #reconnectDelayMs: number;
  readonly #notify?: (channel: string, payload: string) => Promise<void>;
  #listener: Client | null = null;
  #publisher: Client | null = null;
  #started = false;
  #stopped = false;
  #reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options: PostgresCacheSyncBusOptions) {
    super(options.originId, options.logger);
    this.#connectionString = options.connectionString;
    this.#channel = options.channel ?? DEFAULT_CHANNEL;
    this.#reconnectDelayMs = options.reconnectDelayMs ?? 1_000;
    this.#notify = options.notify;
  }

  get channel(): string {
    return this.#channel;
  }

  get listening(): boolean {
    return this.#listener !== null;
  }

  async start(): Promise<void> {
    if (this.#started) return;
    this.#started = true;
    this.#stopped = false;
    await this.#connectListener();
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    this.#started = false;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    const listener = this.#listener;
    this.#listener = null;
    if (listener) {
      listener.removeAllListeners('notification');
      listener.removeAllListeners('error');
      listener.removeAllListeners('end');
      await listener.end().catch(() => undefined);
    }
    const publisher = this.#publisher;
    this.#publisher = null;
    if (publisher) await publisher.end().catch(() => undefined);
  }

  async publish(event: Omit<CacheSyncEvent, 'origin' | 'emittedAt'>): Promise<void> {
    const payload = JSON.stringify(this.stamp(event));
    if (Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES) {
      throw new Error('cache sync payload exceeds the NOTIFY size limit');
    }
    if (this.#notify) {
      await this.#notify(this.#channel, payload);
      return;
    }
    // Inside a tenant transaction the NOTIFY rides on the transaction's own
    // connection: PostgreSQL delivers it only at COMMIT, so a replica that
    // re-reads the row on receipt always observes the committed state. A
    // rolled-back transaction never announces anything.
    const scope = getDatabaseTransactionScope();
    if (scope?.isActive()) {
      await scope.client.query('SELECT pg_notify($1, $2)', [this.#channel, payload]);
      return;
    }
    const publisher = await this.#publisherClient();
    await publisher.query('SELECT pg_notify($1, $2)', [this.#channel, payload]);
  }

  async #publisherClient(): Promise<Client> {
    if (this.#publisher) return this.#publisher;
    const client = new Client({ connectionString: this.#connectionString });
    await client.connect();
    client.on('error', () => {
      this.#publisher = null;
    });
    this.#publisher = client;
    return client;
  }

  async #connectListener(): Promise<void> {
    if (this.#stopped) return;
    const client = new Client({ connectionString: this.#connectionString });
    try {
      await client.connect();
      await client.query(`LISTEN "${this.#channel}"`);
    } catch (error) {
      await client.end().catch(() => undefined);
      this.logger.warn('cache sync listener connection failed; retrying', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.#scheduleReconnect();
      return;
    }
    client.on('notification', (message) => {
      const event = parseEvent(message.payload);
      if (!event) {
        this.logger.warn('ignoring malformed cache sync payload', { channel: message.channel });
        return;
      }
      void this.dispatch(event);
    });
    const onDrop = (error?: Error) => {
      if (this.#listener !== client) return;
      this.#listener = null;
      client.removeAllListeners('notification');
      void client.end().catch(() => undefined);
      if (this.#stopped) return;
      this.logger.warn('cache sync listener dropped; reconnecting', {
        error: error instanceof Error ? error.message : undefined
      });
      this.#scheduleReconnect();
    };
    client.on('error', onDrop);
    client.on('end', () => onDrop());
    this.#listener = client;
  }

  #scheduleReconnect(): void {
    if (this.#stopped || this.#reconnectTimer) return;
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      void this.#connectListener();
    }, this.#reconnectDelayMs);
    this.#reconnectTimer.unref?.();
  }
}

/**
 * In-process bus for tests: several service instances share one hub and see
 * each other's events exactly as separate replicas would through PostgreSQL.
 */
export class InMemoryCacheSyncHub {
  readonly #members = new Set<InMemoryCacheSyncBus>();
  readonly events: CacheSyncEvent[] = [];

  createBus(originId?: string): InMemoryCacheSyncBus {
    const bus = new InMemoryCacheSyncBus(this, originId);
    this.#members.add(bus);
    return bus;
  }

  async broadcast(event: CacheSyncEvent): Promise<void> {
    this.events.push(event);
    await Promise.all(Array.from(this.#members, (member) => member.receive(event)));
  }
}

export class InMemoryCacheSyncBus extends BaseCacheSyncBus {
  readonly #hub: InMemoryCacheSyncHub;

  constructor(hub: InMemoryCacheSyncHub, originId?: string) {
    super(originId);
    this.#hub = hub;
  }

  async publish(event: Omit<CacheSyncEvent, 'origin' | 'emittedAt'>): Promise<void> {
    await this.#hub.broadcast(this.stamp(event));
  }

  async receive(event: CacheSyncEvent): Promise<void> {
    await this.dispatch(event);
  }
}

export { parseEvent as parseCacheSyncEvent };
