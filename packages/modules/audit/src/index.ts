import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface AuditCursor {
  readonly occurredAt: string;
  readonly eventId: AuditEventId;
}

export interface AuditListFilters {
  readonly module?: string;
  readonly entity?: string;
  readonly correlationId?: string;
  readonly query?: string;
  readonly entityTypes?: readonly string[];
}

export interface AuditListPageQuery {
  readonly accountId?: AccountId;
  readonly cursor?: AuditCursor;
  readonly filters?: AuditListFilters;
  readonly limit: number;
}

export interface AuditRepositoryPage {
  readonly items: readonly AuditEventSummary[];
  readonly hasMore: boolean;
}

export interface AuditListPage {
  readonly items: readonly AuditEventSummary[];
  readonly nextCursor?: string;
}

export interface AuditRepository {
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  listPage?(query: AuditListPageQuery): Promise<AuditRepositoryPage>;
  /** Full tenant snapshot used to repair the hot cache after rollback. */
  listForCacheRefresh?(accountId?: AccountId): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
}

export function encodeAuditCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeAuditCursor(value: string): AuditCursor {
  try {
    if (value.length === 0 || value.length > 1024) {
      throw new Error('invalid length');
    }
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      typeof (decoded as { occurredAt?: unknown }).occurredAt !== 'string' ||
      typeof (decoded as { eventId?: unknown }).eventId !== 'string'
    ) {
      throw new Error('invalid shape');
    }

    const cursor = decoded as AuditCursor;
    if (
      Number.isNaN(Date.parse(cursor.occurredAt)) ||
      cursor.eventId.length === 0 ||
      cursor.eventId.length > 128
    ) {
      throw new Error('invalid values');
    }

    return cursor;
  } catch {
    throw new Error('Invalid audit cursor');
  }
}

export function paginateAuditEvents(
  events: readonly AuditEventSummary[],
  query: AuditListPageQuery
): AuditRepositoryPage {
  const filters = query.filters;
  const filtered = events
    .filter((event) => !query.accountId || event.accountId === query.accountId)
    .filter((event) => matchesAuditFilters(event, filters))
    .filter((event) => !query.cursor || isAfterAuditCursor(event, query.cursor));
  const ordered = [...filtered].sort(compareAuditEvents);
  const limit = normalizeAuditPageLimit(query.limit);
  const page = ordered.slice(0, limit + 1);

  return {
    items: page.slice(0, limit),
    hasMore: page.length > limit
  };
}

export interface AuditWriteInput {
  readonly actorId: string;
  readonly accountId: AccountId;
  readonly module: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly correlationId?: string;
  readonly payloadSummary: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface OperationalAuditRequirement {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly entityType?: string;
  readonly minimumRiskLevel: 'low' | 'medium' | 'high';
  readonly description: string;
}

export interface OperationalAuditCoverageItem extends OperationalAuditRequirement {
  readonly covered: boolean;
  readonly evidenceEventId?: AuditEventId;
  readonly evidenceOccurredAt?: string;
}

export interface OperationalAuditCoverageReport {
  readonly generatedAt: string;
  readonly accountId?: AccountId;
  readonly totalEvents: number;
  readonly eventsByModule: Record<string, number>;
  readonly eventsByRiskLevel: Record<'low' | 'medium' | 'high', number>;
  readonly requirements: readonly OperationalAuditCoverageItem[];
  readonly coveredRequirements: number;
  readonly missingRequirements: number;
  readonly coveragePercent: number;
}

export interface AuditServiceOptions {
  readonly auditRepository?: AuditRepository;
}

export class AuditCoverageUnavailableError extends Error {
  public readonly code = 'AUDIT_COVERAGE_UNAVAILABLE';

  public constructor() {
    super('Operational audit coverage source unavailable');
    this.name = 'AuditCoverageUnavailableError';
  }
}

export const DEFAULT_OPERATIONAL_AUDIT_REQUIREMENTS: readonly OperationalAuditRequirement[] = [
  {
    id: 'auth-login-failed',
    module: 'auth',
    action: 'login_failed',
    entityType: 'user',
    minimumRiskLevel: 'high',
    description: 'Falhas de login precisam ser rastreadas por usuario e conta.'
  },
  {
    id: 'auth-session-revoked',
    module: 'auth',
    action: 'session_revoked',
    entityType: 'session',
    minimumRiskLevel: 'medium',
    description: 'Revogacao de sessao precisa ter trilha operacional.'
  },
  {
    id: 'access-matrix-read',
    module: 'access-control',
    action: 'module_permission_matrix_read',
    entityType: 'module-permission-matrix',
    minimumRiskLevel: 'medium',
    description: 'Leitura da matriz RBAC/ABAC precisa ser auditada.'
  },
  {
    id: 'lgpd-personal-export',
    module: 'lgpd',
    action: 'personal_data_exported',
    minimumRiskLevel: 'high',
    description: 'Exportacao de dados pessoais precisa ser auditada.'
  },
  {
    id: 'lgpd-dsr-completed',
    module: 'lgpd',
    action: 'dsr_completed',
    entityType: 'data_subject_request',
    minimumRiskLevel: 'high',
    description: 'Conclusao de DSR precisa ser auditada.'
  },
  {
    id: 'audit-read',
    module: 'audit',
    action: 'read',
    entityType: 'audit-event',
    minimumRiskLevel: 'high',
    description: 'Leitura do proprio log de auditoria precisa gerar evento.'
  },
  {
    id: 'inventory-adjustment',
    module: 'inventory',
    action: 'stock_adjustment_created',
    entityType: 'inventory-stock-movement',
    minimumRiskLevel: 'medium',
    description: 'Ajustes de estoque precisam ser rastreados no ledger.'
  },
  {
    id: 'laboratory-result-released',
    module: 'laboratory',
    action: 'result_released',
    entityType: 'diagnostic-order',
    minimumRiskLevel: 'high',
    description: 'Liberacao de resultado/laudo precisa ser auditada.'
  },
  {
    id: 'reports-delivery-alerts-read',
    module: 'reports',
    action: 'report_schedule_delivery_alerts_read',
    entityType: 'report-schedule-delivery-alert',
    minimumRiskLevel: 'high',
    description: 'Alertas recorrentes de entrega de relatorios precisam ser auditados.'
  }
];

export class AuditService {
  #events: AuditEventSummary[] = [];
  readonly #auditRepository?: AuditRepository;
  #persistenceQueue: Promise<void> = Promise.resolve();
  #persistenceError?: { readonly eventId: AuditEventId; readonly error: unknown };
  readonly #persistencePromises = new WeakMap<AuditEventSummary, Promise<void>>();

  public constructor(options: AuditServiceOptions = {}) {
    this.#auditRepository = options.auditRepository;
  }

  public write(input: AuditWriteInput): AuditEventSummary {
    const event: AuditEventSummary = {
      eventId: randomUUID() as AuditEventId,
      occurredAt: nowIso(),
      actorId: input.actorId,
      accountId: input.accountId,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      correlationId: input.correlationId ?? createCorrelationId('corr'),
      payloadSummary: input.payloadSummary,
      riskLevel: input.riskLevel
    };

    this.#events.unshift(event);

    // Persist to database if repository is available
    if (this.#auditRepository) {
      const persist = this.#persistenceQueue.then(async () => {
        await this.#auditRepository!.create(event);
      });
      this.#persistencePromises.set(event, persist);
      this.#persistenceQueue = persist.catch((error: unknown) => {
        this.#persistenceError = { eventId: event.eventId, error };
      });
      void this.#persistenceQueue;
    }

    return event;
  }

  public async waitForPersistence(): Promise<void> {
    await this.#persistenceQueue;
    if (this.#persistenceError !== undefined) {
      const { error } = this.#persistenceError;
      this.#persistenceError = undefined;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  public async writeAndWait(input: AuditWriteInput): Promise<AuditEventSummary> {
    const event = this.write(input);
    const persistence = this.#persistencePromises.get(event);
    if (!persistence) return event;

    try {
      await persistence;
    } catch (error) {
      // A synchronous audit write is part of the surrounding command
      // transaction. Do not leave a phantom event in the hot cache when the
      // database insert rolls back or rejects.
      this.removeFromCache(event.eventId);
      if (this.#persistenceError?.eventId === event.eventId) {
        this.#persistenceError = undefined;
      }
      throw error;
    }
    return event;
  }

  public list(): readonly AuditEventSummary[] {
    return [...this.#events];
  }

  public async listPage(query: AuditListPageQuery): Promise<AuditListPage> {
    const normalizedQuery = {
      ...query,
      limit: normalizeAuditPageLimit(query.limit)
    };
    const result = this.#auditRepository?.listPage
      ? await this.#auditRepository.listPage(normalizedQuery)
      : paginateAuditEvents(this.#events, normalizedQuery);
    const items = result.items.slice(0, normalizedQuery.limit);
    const lastItem = items.at(-1);
    const nextCursor =
      result.hasMore && lastItem
        ? encodeAuditCursor({ occurredAt: lastItem.occurredAt, eventId: lastItem.eventId })
        : undefined;

    return nextCursor ? { items, nextCursor } : { items };
  }

  public removeFromCache(eventId: AuditEventId): void {
    this.#events = this.#events.filter((event) => event.eventId !== eventId);
  }

  /**
   * Rebuilds the hot audit cache from committed repository rows.
   *
   * Route-level audit writes happen before the surrounding tenant command
   * commits. If that command rolls back, the database row disappears while
   * the in-process event would otherwise remain visible to readers. The
   * caller must invoke this after the transaction has released its client.
   */
  public async refreshFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#auditRepository) return;

    const committed = this.#auditRepository.listForCacheRefresh
      ? await this.#auditRepository.listForCacheRefresh(accountId)
      : await this.#auditRepository.list(accountId);
    const retained = accountId ? this.#events.filter((event) => event.accountId !== accountId) : [];
    this.#events = [...committed, ...retained].sort(
      (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    );
  }

  public async getOperationalCoverageReport(
    accountId?: AccountId,
    requirements: readonly OperationalAuditRequirement[] = DEFAULT_OPERATIONAL_AUDIT_REQUIREMENTS
  ): Promise<OperationalAuditCoverageReport> {
    const events = await this.readCoverageEvents(accountId);
    const riskRank = { low: 1, medium: 2, high: 3 } as const;
    const eventsByModule = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.module] = (acc[event.module] ?? 0) + 1;
      return acc;
    }, {});
    const eventsByRiskLevel = events.reduce<Record<'low' | 'medium' | 'high', number>>(
      (acc, event) => {
        acc[event.riskLevel] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    const coverageItems = requirements.map<OperationalAuditCoverageItem>((requirement) => {
      const evidence = events.find(
        (event) =>
          event.module === requirement.module &&
          event.action === requirement.action &&
          (!requirement.entityType || event.entityType === requirement.entityType) &&
          riskRank[event.riskLevel] >= riskRank[requirement.minimumRiskLevel]
      );

      return {
        ...requirement,
        covered: Boolean(evidence),
        evidenceEventId: evidence?.eventId,
        evidenceOccurredAt: evidence?.occurredAt
      };
    });

    const coveredRequirements = coverageItems.filter((item) => item.covered).length;
    const missingRequirements = coverageItems.length - coveredRequirements;

    return {
      generatedAt: nowIso(),
      accountId,
      totalEvents: events.length,
      eventsByModule,
      eventsByRiskLevel,
      requirements: coverageItems,
      coveredRequirements,
      missingRequirements,
      coveragePercent:
        coverageItems.length === 0
          ? 100
          : Math.round((coveredRequirements / coverageItems.length) * 10_000) / 100
    };
  }

  private async readCoverageEvents(accountId?: AccountId): Promise<readonly AuditEventSummary[]> {
    if (!this.#auditRepository) {
      return this.#events.filter((event) => !accountId || event.accountId === accountId);
    }

    if (!this.#auditRepository.listForCacheRefresh) {
      throw new AuditCoverageUnavailableError();
    }

    try {
      const events = await this.#auditRepository.listForCacheRefresh(accountId);
      if (!Array.isArray(events)) {
        throw new Error('Audit repository returned an invalid coverage snapshot');
      }
      return events
        .filter((event) => !accountId || event.accountId === accountId)
        .sort(compareAuditEvents);
    } catch (error) {
      if (error instanceof AuditCoverageUnavailableError) {
        throw error;
      }
      throw new AuditCoverageUnavailableError();
    }
  }

  public seedSystemEvent(summary: string): void {
    const event = this.write({
      actorId: 'system',
      accountId: 'acc_cvg_demo' as AccountId,
      module: 'audit',
      action: 'bootstrap',
      entityType: 'system',
      entityId: 'phase-3',
      payloadSummary: summary,
      riskLevel: 'low'
    });

    // The bootstrap marker predates tenant-scoped UUID accounts. Database
    // repositories may therefore reject its legacy identity under RLS. A
    // failed bootstrap marker must not poison the first real tenant command;
    // command-level audit writes remain synchronous and fail closed.
    const persistence = this.#persistencePromises.get(event);
    if (!persistence) return;
    void persistence.catch(() => {
      this.removeFromCache(event.eventId);
      if (this.#persistenceError?.eventId === event.eventId) {
        this.#persistenceError = undefined;
      }
    });
  }
}

function normalizeAuditPageLimit(value: number): number {
  return Math.max(1, Math.min(200, Math.trunc(Number.isFinite(value) ? value : 100)));
}

function matchesAuditFilters(event: AuditEventSummary, filters?: AuditListFilters): boolean {
  if (!filters) return true;

  const moduleFilter = filters.module?.toLowerCase() ?? '';
  const entityFilter = filters.entity?.toLowerCase() ?? '';
  const correlationFilter = filters.correlationId?.toLowerCase() ?? '';
  const queryFilter = filters.query?.toLowerCase() ?? '';
  const entityTypes = (filters.entityTypes ?? []).map((value) => value.toLowerCase());
  const searchable = [
    event.module,
    event.action,
    event.actorId,
    event.entityType,
    event.entityId,
    event.correlationId,
    event.payloadSummary
  ].map((value) => String(value ?? '').toLowerCase());

  return (
    (!moduleFilter || event.module.toLowerCase().includes(moduleFilter)) &&
    (!entityFilter ||
      [event.entityType, event.entityId, event.payloadSummary].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(entityFilter)
      )) &&
    (!correlationFilter || event.correlationId.toLowerCase().includes(correlationFilter)) &&
    (entityTypes.length === 0 || entityTypes.includes(event.entityType.toLowerCase())) &&
    (!queryFilter || searchable.some((value) => value.includes(queryFilter)))
  );
}

function isAfterAuditCursor(event: AuditEventSummary, cursor: AuditCursor): boolean {
  const eventTime = Date.parse(event.occurredAt);
  const cursorTime = Date.parse(cursor.occurredAt);
  return eventTime < cursorTime || (eventTime === cursorTime && event.eventId < cursor.eventId);
}

function compareAuditEvents(left: AuditEventSummary, right: AuditEventSummary): number {
  const timeDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
  if (timeDifference !== 0) return timeDifference;
  if (right.eventId === left.eventId) return 0;
  return right.eventId < left.eventId ? -1 : 1;
}

export { DatabaseAuditRepository } from './repositories/database-audit.repository.js';
