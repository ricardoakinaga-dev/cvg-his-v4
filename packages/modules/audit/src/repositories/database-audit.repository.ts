import { and, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { auditEvents } from '@cvg-his-v2/shared-database';
import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import type {
  AuditListPageQuery,
  AuditRepository as AuditServiceRepository,
  AuditRepositoryPage
} from '../index.js';

export interface AuditRepository extends AuditServiceRepository {}

export class DatabaseAuditRepository implements AuditRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: AuditEventSummary): Promise<void> {
    const actorUserId = normalizeUuid(event.actorId);
    const accountId = normalizeUuid(event.accountId);

    await this.#db.insert(auditEvents).values({
      id: event.eventId,
      accountId,
      actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: {
        module: event.module,
        payloadSummary: event.payloadSummary,
        riskLevel: event.riskLevel,
        ...(accountId ? {} : { legacyAccountId: event.accountId }),
        ...(actorUserId ? {} : { legacyActorId: event.actorId })
      },
      correlationId: event.correlationId,
      occurredAt: new Date(event.occurredAt),
      createdAt: new Date(event.occurredAt)
    });
  }

  public async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const rows = await this.#db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.occurredAt))
      .limit(Math.max(limit * 5, limit));

    const summaries = rows.map((row) => mapAuditRow(row));
    const filtered = accountId
      ? summaries.filter((event) => event.accountId === accountId)
      : summaries;
    return filtered.slice(0, limit);
  }

  public async listPage(query: AuditListPageQuery): Promise<AuditRepositoryPage> {
    const limit = Math.max(1, Math.min(200, Math.trunc(query.limit)));
    const conditions = [];
    const filters = query.filters;

    if (query.accountId) {
      conditions.push(
        or(
          eq(auditEvents.accountId, query.accountId),
          and(
            isNull(auditEvents.accountId),
            sql`${auditEvents.metadata}->>'legacyAccountId' = ${query.accountId}`
          )
        )
      );
    }

    if (query.cursor) {
      const occurredAt = new Date(query.cursor.occurredAt);
      conditions.push(
        or(
          lt(auditEvents.occurredAt, occurredAt),
          and(eq(auditEvents.occurredAt, occurredAt), lt(auditEvents.id, query.cursor.eventId))
        )
      );
    }

    if (filters?.module) {
      const pattern = `%${filters.module.toLowerCase()}%`;
      conditions.push(
        sql`lower(coalesce(${auditEvents.metadata}->>'module', split_part(${auditEvents.action}, '_', 1))) like ${pattern}`
      );
    }

    if (filters?.entity) {
      const pattern = `%${filters.entity.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(auditEvents.entityType, pattern),
          ilike(auditEvents.entityId, pattern),
          sql`lower(coalesce(${auditEvents.metadata}->>'payloadSummary', '')) like ${pattern}`
        )
      );
    }

    if (filters?.correlationId) {
      conditions.push(ilike(auditEvents.correlationId, `%${filters.correlationId.toLowerCase()}%`));
    }

    const entityTypes = (filters?.entityTypes ?? [])
      .map((value) => value.toLowerCase())
      .filter(Boolean);
    if (entityTypes.length > 0) {
      conditions.push(
        or(
          ...entityTypes.map((entityType) => sql`lower(${auditEvents.entityType}) = ${entityType}`)
        )
      );
    }

    if (filters?.query) {
      const pattern = `%${filters.query.toLowerCase()}%`;
      conditions.push(
        or(
          sql`lower(coalesce(${auditEvents.metadata}->>'module', '')) like ${pattern}`,
          ilike(auditEvents.action, pattern),
          sql`lower(coalesce(${auditEvents.actorUserId}::text, ${auditEvents.metadata}->>'legacyActorId', '')) like ${pattern}`,
          ilike(auditEvents.entityType, pattern),
          ilike(auditEvents.entityId, pattern),
          ilike(auditEvents.correlationId, pattern),
          sql`lower(coalesce(${auditEvents.metadata}->>'payloadSummary', '')) like ${pattern}`
        )
      );
    }

    const baseQuery = this.#db.select().from(auditEvents);
    const filteredQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
    const rows = await filteredQuery
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(limit + 1);

    return {
      items: rows.slice(0, limit).map((row) => mapAuditRow(row)),
      hasMore: rows.length > limit
    };
  }

  public async listForCacheRefresh(accountId?: AccountId): Promise<readonly AuditEventSummary[]> {
    const rows = accountId
      ? await this.#db
          .select()
          .from(auditEvents)
          .where(
            or(
              eq(auditEvents.accountId, accountId),
              and(
                isNull(auditEvents.accountId),
                sql`${auditEvents.metadata}->>'legacyAccountId' = ${accountId}`
              )
            )
          )
          .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      : await this.#db
          .select()
          .from(auditEvents)
          .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id));
    const summaries = rows.map((row) => mapAuditRow(row));
    return accountId ? summaries.filter((event) => event.accountId === accountId) : summaries;
  }

  public async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    const result = await this.#db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return mapAuditRow(result[0]);
  }
}

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return isUuid(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapAuditRow(row: Record<string, unknown>): AuditEventSummary {
  const metadata = asRecord(row.metadata);
  const storedAccountId = typeof row.accountId === 'string' ? row.accountId : null;
  const storedActorId = typeof row.actorUserId === 'string' ? row.actorUserId : null;
  const legacyAccountId =
    typeof metadata?.legacyAccountId === 'string' ? metadata.legacyAccountId : null;
  const legacyActorId = typeof metadata?.legacyActorId === 'string' ? metadata.legacyActorId : null;
  const module = typeof metadata?.module === 'string' ? metadata.module : null;

  return {
    eventId: row.id as AuditEventId,
    occurredAt: new Date(row.occurredAt as string | Date).toISOString(),
    actorId: storedActorId ?? legacyActorId ?? 'system',
    accountId: (storedAccountId ?? legacyAccountId ?? 'unknown') as AccountId,
    module:
      module ??
      (typeof row.action === 'string' ? (row.action.split('_')[0] ?? 'unknown') : 'unknown'),
    action: (row.action as string | null) ?? 'unknown',
    entityType: (row.entityType as string | null) ?? 'unknown',
    entityId: (row.entityId as string | null) ?? 'unknown',
    correlationId: (row.correlationId as string | null) ?? '',
    payloadSummary: (metadata?.payloadSummary as string | undefined) ?? '',
    riskLevel: (metadata?.riskLevel as 'low' | 'medium' | 'high' | undefined) ?? 'low'
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}
