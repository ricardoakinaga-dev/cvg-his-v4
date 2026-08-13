import { randomUUID } from 'node:crypto';

import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface AuditRepository {
  readonly tenantScoped?: boolean;
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
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

interface PendingAuditWrites {
  readonly writes: Set<Promise<void>>;
  readonly errors: unknown[];
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
  readonly #events: AuditEventSummary[] = [];
  readonly #auditRepository?: AuditRepository;
  readonly #pendingWritesByCorrelationId = new Map<string, PendingAuditWrites>();

  public constructor(options: AuditServiceOptions = {}) {
    this.#auditRepository = options.auditRepository;
  }

  public write(input: AuditWriteInput): AuditEventSummary {
    return this.#record(input, true);
  }

  public async writeDurable(input: AuditWriteInput): Promise<AuditEventSummary> {
    const event = this.#createEvent(input);
    if (this.#auditRepository) {
      await this.#auditRepository.create(event);
    }
    this.#events.unshift(event);
    return event;
  }

  public async flushPendingWrites(correlationId: string): Promise<void> {
    const pending = this.#pendingWritesByCorrelationId.get(correlationId);
    if (!pending) {
      return;
    }

    while (pending.writes.size > 0) {
      await Promise.all(pending.writes);
    }
    this.#pendingWritesByCorrelationId.delete(correlationId);

    if (pending.errors.length === 1) {
      throw pending.errors[0];
    }
    if (pending.errors.length > 1) {
      throw new AggregateError(
        pending.errors,
        `Failed to persist ${pending.errors.length} audit events for request ${correlationId}`
      );
    }
  }

  #record(input: AuditWriteInput, persist: boolean): AuditEventSummary {
    const event = this.#createEvent(input);

    this.#events.unshift(event);

    if (persist && this.#auditRepository) {
      this.#enqueuePersistence(event);
    }

    return event;
  }

  #enqueuePersistence(event: AuditEventSummary): void {
    if (!this.#auditRepository) {
      return;
    }

    const pending = this.#pendingWritesByCorrelationId.get(event.correlationId) ?? {
      writes: new Set<Promise<void>>(),
      errors: []
    };
    this.#pendingWritesByCorrelationId.set(event.correlationId, pending);

    const trackedWrite = this.#auditRepository
      .create(event)
      .then(
        () => undefined,
        (error: unknown) => {
          pending.errors.push(error);
        }
      )
      .finally(() => {
        pending.writes.delete(trackedWrite);
        if (pending.writes.size === 0 && pending.errors.length === 0) {
          this.#pendingWritesByCorrelationId.delete(event.correlationId);
        }
      });
    pending.writes.add(trackedWrite);
  }

  #createEvent(input: AuditWriteInput): AuditEventSummary {
    return {
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
  }

  public list(): readonly AuditEventSummary[] {
    return [...this.#events];
  }

  public getOperationalCoverageReport(
    accountId?: AccountId,
    requirements: readonly OperationalAuditRequirement[] = DEFAULT_OPERATIONAL_AUDIT_REQUIREMENTS
  ): OperationalAuditCoverageReport {
    const events = this.list().filter((event) => !accountId || event.accountId === accountId);
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

  public seedSystemEvent(summary: string): void {
    this.#record(
      {
        actorId: 'system',
        accountId: 'acc_cvg_demo' as AccountId,
        module: 'audit',
        action: 'bootstrap',
        entityType: 'system',
        entityId: 'phase-3',
        payloadSummary: summary,
        riskLevel: 'low'
      },
      this.#auditRepository?.tenantScoped !== true
    );
  }
}

export { DatabaseAuditRepository } from './repositories/database-audit.repository.js';
