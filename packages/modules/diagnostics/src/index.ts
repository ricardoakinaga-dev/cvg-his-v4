import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateDiagnosticOrderRequest,
  RecordDiagnosticResultRequest
} from '@cvg-his-v2/shared-contracts';
import { createHash } from 'node:crypto';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  ExamCatalogEntry
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { DEFAULT_EXAM_CATALOG } from './catalog.js';
import { DatabaseLaboratoryCatalogRepository } from './repositories/database-laboratory-catalog.repository.js';
import { DatabaseDiagnosticOrderRepository } from './repositories/database-diagnostics.repository.js';
import type { DiagnosticOrderRepository } from './repositories/database-diagnostics.repository.js';
import {
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService,
  type LaboratoryCatalogRepository
} from './laboratory.js';

export type { DiagnosticOrderRepository };
export { DatabaseDiagnosticOrderRepository };
export type { LaboratoryCatalogRepository };
export {
  DatabaseLaboratoryCatalogRepository,
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService
};

const VALID_DIAGNOSTIC_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['collected', 'cancelled'],
  collected: ['resulted', 'cancelled'],
  resulted: [],
  cancelled: []
};

export interface DiagnosticsServiceOptions {
  readonly diagnosticOrderRepository?: DiagnosticOrderRepository;
  readonly catalog?: readonly ExamCatalogEntry[];
}

export class DiagnosticsService {
  readonly #encounters: EncountersService;
  readonly #orders = new Map<DiagnosticOrderId, DiagnosticOrderSummary>();
  readonly #catalog: readonly ExamCatalogEntry[];
  readonly #repository?: DiagnosticOrderRepository;
  #pendingMutation: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: DiagnosticsServiceOptions) {
    this.#encounters = encounters;
    this.#catalog = options?.catalog ?? DEFAULT_EXAM_CATALOG;
    this.#repository = options?.diagnosticOrderRepository;
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_DIAGNOSTIC_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private enqueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.#pendingMutation.then(mutation);
    this.#pendingMutation = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private createResultSignatureHash(
    order: DiagnosticOrderSummary,
    payload: RecordDiagnosticResultRequest,
    resultedAt: string
  ): string {
    return createHash('sha256')
      .update(
        [
          order.id,
          order.accountId,
          payload.releasedByUserId,
          payload.signedByUserId ?? payload.releasedByUserId,
          payload.resultSummary ?? '',
          payload.resultAttachmentId ?? '',
          resultedAt
        ].join('|')
      )
      .digest('hex');
  }

  public listCatalog(): readonly ExamCatalogEntry[] {
    return this.#catalog;
  }

  public getCatalogEntry(catalogId: string): ExamCatalogEntry | undefined {
    return this.#catalog.find((entry) => entry.id === catalogId);
  }

  public async createOrder(
    payload: CreateDiagnosticOrderRequest,
    expectedAccountId?: AccountId
  ): Promise<DiagnosticOrderSummary> {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    if (expectedAccountId && encounter.accountId !== expectedAccountId) {
      throw new NotFoundError('Encounter not found', { encounterId: payload.encounterId });
    }
    if (payload.patientId !== encounter.patientId) {
      throw new Error('patientId must match the encounter patient');
    }

    if (payload.examCatalogId && !this.getCatalogEntry(payload.examCatalogId)) {
      throw new Error(`Unknown exam catalog entry '${payload.examCatalogId}'`);
    }

    const now = nowIso();
    const order: DiagnosticOrderSummary = {
      id: createCorrelationId('diag') as DiagnosticOrderId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: requireNonEmptyString(payload.examType, 'examType'),
      examCatalogId: payload.examCatalogId,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      status: 'requested',
      createdAt: now,
      updatedAt: now
    };
    return this.enqueueMutation(async () => {
      await this.#repository?.create(order);
      this.#orders.set(order.id, order);
      return order;
    });
  }

  public list(encounterId?: string): readonly DiagnosticOrderSummary[] {
    return Array.from(this.#orders.values()).filter(
      (order) => !encounterId || order.encounterId === encounterId
    );
  }

  public listByAccount(accountId: AccountId): readonly DiagnosticOrderSummary[] {
    return Array.from(this.#orders.values())
      .filter((order) => order.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) {
      return;
    }

    const orders = await this.#repository.findAll(accountId);
    for (const order of orders) {
      this.#orders.set(order.id, order);
    }
  }

  public getOrThrow(orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    const order = this.#orders.get(orderId);
    if (!order) {
      throw new NotFoundError('Diagnostic order not found', { orderId });
    }

    return order;
  }

  public async recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest,
    expectedAccountId?: AccountId
  ): Promise<DiagnosticOrderSummary> {
    return this.enqueueMutation(async () => {
      const current = this.getOrThrow(orderId);
      if (expectedAccountId && current.accountId !== expectedAccountId) {
        throw new NotFoundError('Diagnostic order not found', { orderId });
      }

      if (!this.isValidTransition(current.status, payload.status)) {
        throw new Error(
          `Invalid status transition from '${current.status}' to '${payload.status}'`
        );
      }

      if (payload.status === 'collected') {
        requireNonEmptyString(payload.collectedByUserId, 'collectedByUserId');
      }

      if (payload.status === 'resulted' && !payload.resultSummary && !payload.resultAttachmentId) {
        throw new Error('resultSummary or resultAttachmentId is required when status is resulted');
      }

      const now = nowIso();
      const releasedByUserId =
        payload.status === 'resulted'
          ? requireNonEmptyString(payload.releasedByUserId, 'releasedByUserId')
          : undefined;
      const signedByUserId =
        payload.status === 'resulted'
          ? requireNonEmptyString(payload.signedByUserId ?? releasedByUserId, 'signedByUserId')
          : undefined;
      const signatureHash =
        payload.status === 'resulted'
          ? (payload.signatureHash ??
            this.createResultSignatureHash(
              current,
              {
                ...payload,
                releasedByUserId,
                signedByUserId
              },
              now
            ))
          : undefined;
      const updated: DiagnosticOrderSummary = {
        ...current,
        status: payload.status,
        ...(payload.status === 'collected' && {
          collectedAt: now,
          collectedByUserId: requireNonEmptyString(payload.collectedByUserId, 'collectedByUserId')
        }),
        ...(payload.status === 'resulted' && {
          resultSummary: payload.resultSummary,
          resultAttachmentId: payload.resultAttachmentId,
          resultedAt: now,
          releasedByUserId,
          signedByUserId,
          signatureHash
        }),
        updatedAt: now
      };

      await this.#repository?.update(updated);
      this.#orders.set(orderId, updated);
      return updated;
    });
  }
}
