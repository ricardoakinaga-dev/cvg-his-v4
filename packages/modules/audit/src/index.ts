import { randomUUID } from 'node:crypto';

import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface AuditRepository {
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
      this.#auditRepository.create(event).catch((err) => {
        console.error('Failed to persist audit event to database:', err);
      });
    }

    return event;
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
    this.write({
      actorId: 'system',
      accountId: 'acc_cvg_demo' as AccountId,
      module: 'audit',
      action: 'bootstrap',
      entityType: 'system',
      entityId: 'phase-3',
      payloadSummary: summary,
      riskLevel: 'low'
    });
  }
}

export { DatabaseAuditRepository } from './repositories/database-audit.repository.js';
