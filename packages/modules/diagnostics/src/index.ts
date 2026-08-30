import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateDiagnosticOrderRequest,
  RecordDiagnosticResultRequest
} from '@cvg-his-v2/shared-contracts';
import { createHash } from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError
} from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  ExamCatalogEntry,
  LaboratoryResultValue
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { DEFAULT_EXAM_CATALOG } from './catalog.js';
import { normalizeLaboratoryResultValues } from './laboratory-result-values.js';
import { DatabaseLaboratoryCatalogRepository } from './repositories/database-laboratory-catalog.repository.js';
import { DatabaseDiagnosticOrderRepository } from './repositories/database-diagnostics.repository.js';
import type {
  DiagnosticOrderRepository,
  LaboratoryTransitionPersistenceInput,
  LaboratoryTransitionReplayInput
} from './repositories/database-diagnostics.repository.js';
import {
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService,
  type LaboratoryCatalogRepository
} from './laboratory.js';
import type {
  LaboratoryOrderSummary,
  LaboratoryRecollectionRequest,
  LaboratorySignerAuthority,
  LaboratoryWorkflowEvent,
  LaboratoryWorkflowPersistenceResult,
  LaboratoryWorkflowState,
  LaboratoryWorkflowTransitionRequest
} from './laboratory-workflow.js';
import { createLaboratoryWorkflowEventId } from './laboratory-workflow.js';

export {
  LABORATORY_LIFECYCLE_STATUSES,
  type LaboratoryLifecycleStatus,
  type LegacyLaboratoryStatus,
  type LaboratoryOrderSummary,
  type LaboratoryRecollectionRequest,
  type LaboratorySignerAuthority,
  type LaboratoryWorkflowEvent,
  type LaboratoryWorkflowPersistenceResult,
  type LaboratoryWorkflowState,
  type LaboratoryWorkflowTransitionRequest
} from './laboratory-workflow.js';

export type { DiagnosticOrderRepository };
export { DatabaseDiagnosticOrderRepository };
export { normalizeLaboratoryResultValues };
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

const VALID_LABORATORY_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['collected', 'cancelled'],
  collected: ['in_analysis', 'cancelled'],
  in_analysis: ['reported', 'cancelled'],
  reported: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

export interface DiagnosticsServiceOptions {
  readonly diagnosticOrderRepository?: DiagnosticOrderRepository;
  readonly catalog?: readonly ExamCatalogEntry[];
  readonly laboratorySignerAuthority?: LaboratorySignerAuthority;
}

interface LaboratoryIdempotencyRecord {
  readonly fingerprint: string;
  readonly result: LaboratoryWorkflowPersistenceResult;
}

export class DiagnosticsService {
  readonly #encounters: EncountersService;
  readonly #orders = new Map<DiagnosticOrderId, DiagnosticOrderSummary>();
  readonly #catalog: readonly ExamCatalogEntry[];
  readonly #repository?: DiagnosticOrderRepository;
  readonly #laboratorySignerAuthority?: LaboratorySignerAuthority;
  readonly #laboratoryWorkflows = new Map<DiagnosticOrderId, LaboratoryWorkflowState>();
  readonly #laboratoryLocks = new Map<DiagnosticOrderId, Promise<void>>();
  readonly #laboratoryIdempotency = new Map<string, LaboratoryIdempotencyRecord>();
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: DiagnosticsServiceOptions) {
    this.#encounters = encounters;
    this.#catalog = options?.catalog ?? DEFAULT_EXAM_CATALOG;
    this.#repository = options?.diagnosticOrderRepository;
    this.#laboratorySignerAuthority =
      options?.laboratorySignerAuthority ??
      (options?.diagnosticOrderRepository?.isEnabledLaboratorySigner
        ? (options.diagnosticOrderRepository as LaboratorySignerAuthority)
        : undefined);
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_DIAGNOSTIC_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private async persistOrder(order: DiagnosticOrderSummary): Promise<void> {
    const repo = this.#repository;
    if (repo) {
      const operation = this.#pendingPersist.then(async () => {
        const existing = await repo.findById(order.id);
        if (existing) {
          await repo.update(order);
        } else {
          await repo.create(order);
        }
      });
      this.#pendingPersist = operation.catch(() => undefined);
      await operation;
    }
  }

  private async updateOrder(order: DiagnosticOrderSummary): Promise<void> {
    await this.persistOrder(order);
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
          payload.releasedByUserId,
          payload.resultSummary ?? '',
          JSON.stringify(payload.resultValues ?? []),
          payload.resultAttachmentId ?? '',
          resultedAt
        ].join('|')
      )
      .digest('hex');
  }

  private createLaboratorySignatureHash(
    order: DiagnosticOrderSummary,
    resultSummary: string | undefined,
    resultValues: readonly LaboratoryResultValue[] | undefined,
    resultAttachmentId: string | undefined,
    reportedByUserId: string,
    signedByUserId: string,
    reportedAt: string
  ): string {
    return createHash('sha256')
      .update(
        [
          order.id,
          order.accountId,
          reportedByUserId,
          signedByUserId,
          resultSummary ?? '',
          JSON.stringify(resultValues ?? []),
          resultAttachmentId ?? '',
          reportedAt
        ].join('|')
      )
      .digest('hex');
  }

  private createInitialLaboratoryWorkflow(order: DiagnosticOrderSummary): LaboratoryWorkflowState {
    return {
      orderId: order.id,
      accountId: order.accountId,
      status: 'requested',
      collectionAttempt: 0,
      history: [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  private deriveLaboratoryWorkflow(order: DiagnosticOrderSummary): LaboratoryWorkflowState {
    const status =
      order.status === 'resulted'
        ? 'reported'
        : (order.status as LaboratoryWorkflowState['status']);
    return {
      orderId: order.id,
      accountId: order.accountId,
      status,
      legacyStatus: order.status === 'resulted' ? 'resulted' : undefined,
      collectionAttempt: order.status === 'requested' ? 0 : 1,
      collectedAt: order.collectedAt,
      collectedByUserId: order.collectedByUserId,
      reportedAt: order.status === 'resulted' ? order.resultedAt : undefined,
      reportedByUserId: order.status === 'resulted' ? order.releasedByUserId : undefined,
      resultSummary: order.resultSummary,
      resultValues: order.resultValues,
      resultAttachmentId: order.resultAttachmentId,
      signedByUserId: order.signedByUserId,
      signatureHash: order.signatureHash,
      history: [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  private getLaboratoryWorkflow(order: DiagnosticOrderSummary): LaboratoryWorkflowState {
    return this.#laboratoryWorkflows.get(order.id) ?? this.deriveLaboratoryWorkflow(order);
  }

  private toLaboratoryOrderSummary(
    order: DiagnosticOrderSummary,
    workflow: LaboratoryWorkflowState
  ): LaboratoryOrderSummary {
    return {
      ...order,
      status: workflow.status,
      legacyStatus: workflow.legacyStatus,
      collectionAttempt: workflow.collectionAttempt,
      collectedAt: workflow.collectedAt,
      collectedByUserId: workflow.collectedByUserId,
      analysisStartedAt: workflow.analysisStartedAt,
      analysisStartedByUserId: workflow.analysisStartedByUserId,
      reportedAt: workflow.reportedAt,
      reportedByUserId: workflow.reportedByUserId,
      deliveredAt: workflow.deliveredAt,
      deliveredByUserId: workflow.deliveredByUserId,
      deliveryChannel: workflow.deliveryChannel,
      resultSummary: workflow.resultSummary,
      resultValues: workflow.resultValues,
      resultAttachmentId: workflow.resultAttachmentId,
      signedByUserId: workflow.signedByUserId,
      signatureHash: workflow.signatureHash,
      recollectionReason: workflow.recollectionReason,
      cancellationReason: workflow.cancellationReason,
      history: [...workflow.history],
      workflowVersion: 2
    };
  }

  private appendLaboratoryEvent(
    workflow: LaboratoryWorkflowState,
    eventType: LaboratoryWorkflowEvent['eventType'],
    status: LaboratoryWorkflowState['status'],
    attempt: number,
    occurredAt: string,
    actorUserId?: string,
    reason?: string,
    idempotencyKey?: string,
    requestFingerprint?: string
  ): LaboratoryWorkflowState {
    const event: LaboratoryWorkflowEvent = {
      id:
        idempotencyKey && requestFingerprint
          ? createLaboratoryWorkflowEventId(
              workflow.accountId,
              workflow.orderId,
              eventType,
              idempotencyKey,
              requestFingerprint
            )
          : createCorrelationId('lab-event'),
      eventType,
      status,
      attempt,
      actorUserId,
      reason,
      occurredAt
    };
    return {
      ...workflow,
      history: [...workflow.history, event],
      updatedAt: occurredAt
    };
  }

  private normalizeLaboratoryIdempotencyKey(key: string | undefined): string | undefined {
    if (key === undefined) return undefined;
    const normalized = key.trim();
    if (!normalized || normalized.length > 255 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
      throw new ValidationError('idempotencyKey must contain 1 to 255 printable characters');
    }
    return normalized;
  }

  private getLaboratoryIdempotencyKey(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
    const value = (payload as Record<string, unknown>).idempotencyKey;
    return this.normalizeLaboratoryIdempotencyKey(typeof value === 'string' ? value : undefined);
  }

  private fingerprintLaboratoryPayload(payload: unknown): string {
    const canonicalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map((item) => canonicalize(item));
      if (!value || typeof value !== 'object') return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .filter((key) => record[key] !== undefined)
          .sort()
          .map((key) => [key, canonicalize(record[key])])
      );
    };
    return createHash('sha256')
      .update(JSON.stringify(canonicalize(payload)))
      .digest('hex');
  }

  private laboratoryIdempotencyCacheKey(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    idempotencyKey: string
  ): string {
    return `${accountId}:${orderId}:${idempotencyKey}`;
  }

  private laboratoryEventType(
    payload: LaboratoryWorkflowTransitionRequest | RecordDiagnosticResultRequest
  ): LaboratoryWorkflowEvent['eventType'] {
    return payload.status === 'resulted' ? 'reported' : payload.status;
  }

  private async assertEnabledLaboratorySigner(accountId: AccountId, userId: string): Promise<void> {
    const authority = this.#laboratorySignerAuthority;
    if (
      !authority?.isEnabledLaboratorySigner ||
      !(await authority.isEnabledLaboratorySigner(accountId, userId))
    ) {
      throw new ForbiddenError('Laboratory result requires an enabled professional/staff signer');
    }
  }

  private async persistLaboratoryWorkflow(workflow: LaboratoryWorkflowState): Promise<void> {
    if (this.#repository?.upsertLaboratoryWorkflow) {
      await this.#repository.upsertLaboratoryWorkflow(workflow);
    }
    this.#laboratoryWorkflows.set(workflow.orderId, workflow);
  }

  public listCatalog(): readonly ExamCatalogEntry[] {
    return this.#catalog;
  }

  public getCatalogEntry(catalogId: string): ExamCatalogEntry | undefined {
    return this.#catalog.find((entry) => entry.id === catalogId);
  }

  private getEncounterForAccount(accountId: AccountId, encounterId: string) {
    const encounter = this.#encounters.getOrThrow(encounterId as never);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    return encounter;
  }

  private buildOrder(
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ): DiagnosticOrderSummary {
    const encounter = this.getEncounterForAccount(accountId, payload.encounterId);
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
    return order;
  }

  private requireSynchronousPersistenceMode(): void {
    if (this.#repository) {
      throw new Error(
        'Database-backed diagnostics require createOrderAndPersist or recordResultAndPersist'
      );
    }
  }

  public createOrder(
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ): DiagnosticOrderSummary {
    this.requireSynchronousPersistenceMode();
    const order = this.buildOrder(accountId, payload);
    this.#orders.set(order.id, order);
    this.#laboratoryWorkflows.set(order.id, this.createInitialLaboratoryWorkflow(order));
    return order;
  }

  public async createOrderAndPersist(
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ): Promise<DiagnosticOrderSummary> {
    const order = this.buildOrder(accountId, payload);
    await this.persistOrder(order);
    await this.persistLaboratoryWorkflow(this.createInitialLaboratoryWorkflow(order));
    this.#orders.set(order.id, order);
    return order;
  }

  public async createOrderAndPersistForAccount(
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ): Promise<DiagnosticOrderSummary> {
    return this.createOrderAndPersist(accountId, payload);
  }

  public list(accountId: AccountId, encounterId?: string): readonly DiagnosticOrderSummary[] {
    return Array.from(this.#orders.values()).filter(
      (order) =>
        order.accountId === accountId && (!encounterId || order.encounterId === encounterId)
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
    const workflows = await this.#repository.findLaboratoryWorkflows?.(accountId);
    for (const workflow of workflows ?? []) {
      this.#laboratoryWorkflows.set(workflow.orderId, workflow);
    }
  }

  public listLaboratoryOrders(accountId: AccountId): readonly LaboratoryOrderSummary[] {
    return Array.from(this.#orders.values())
      .filter((order) => order.accountId === accountId)
      .map((order) => this.toLaboratoryOrderSummary(order, this.getLaboratoryWorkflow(order)))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public getLaboratoryOrderOrThrow(
    accountId: AccountId,
    orderId: DiagnosticOrderId
  ): LaboratoryOrderSummary {
    const order = this.#orders.get(orderId);
    if (!order || order.accountId !== accountId) {
      throw new NotFoundError('Laboratory order not found', { orderId });
    }
    return this.toLaboratoryOrderSummary(order, this.getLaboratoryWorkflow(order));
  }

  private getOrderOrThrow(orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    const order = this.#orders.get(orderId);
    if (!order) {
      throw new NotFoundError('Diagnostic order not found', { orderId });
    }

    return order;
  }

  private getOrderForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId
  ): DiagnosticOrderSummary {
    const order = this.getOrderOrThrow(orderId);
    if (order.accountId !== accountId) {
      throw new NotFoundError('Diagnostic order not found', { orderId });
    }
    return order;
  }

  public getOrThrow(accountId: AccountId, orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    return this.getOrderForAccount(accountId, orderId);
  }

  private buildResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary {
    const current = this.getOrderOrThrow(orderId);

    if (!this.isValidTransition(current.status, payload.status)) {
      throw new Error(`Invalid status transition from '${current.status}' to '${payload.status}'`);
    }

    if (payload.status === 'collected') {
      requireNonEmptyString(payload.collectedByUserId, 'collectedByUserId');
    }

    const resultSummary =
      payload.status === 'resulted' ? payload.resultSummary?.trim() || undefined : undefined;
    const resultAttachmentId =
      payload.status === 'resulted' ? payload.resultAttachmentId?.trim() || undefined : undefined;
    const resultValues =
      payload.status === 'resulted'
        ? normalizeLaboratoryResultValues(payload.resultValues)
        : undefined;
    if (
      payload.status === 'resulted' &&
      !resultSummary &&
      !resultAttachmentId &&
      !resultValues?.length
    ) {
      throw new Error(
        'resultSummary or resultAttachmentId or resultValues is required when status is resulted'
      );
    }

    const now = nowIso();
    const releasedByUserId =
      payload.status === 'resulted'
        ? requireNonEmptyString(payload.releasedByUserId, 'releasedByUserId')
        : undefined;
    const signedByUserId = payload.status === 'resulted' ? releasedByUserId : undefined;
    const signatureHash =
      payload.status === 'resulted'
        ? this.createResultSignatureHash(
            current,
            {
              ...payload,
              resultSummary,
              resultValues,
              resultAttachmentId,
              releasedByUserId,
              signedByUserId
            },
            now
          )
        : undefined;
    const updated: DiagnosticOrderSummary = {
      ...current,
      status: payload.status,
      ...(payload.status === 'collected' && {
        collectedAt: now,
        collectedByUserId: requireNonEmptyString(payload.collectedByUserId, 'collectedByUserId')
      }),
      ...(payload.status === 'resulted' && {
        resultSummary,
        resultValues,
        resultAttachmentId,
        resultedAt: now,
        releasedByUserId,
        signedByUserId,
        signatureHash
      }),
      updatedAt: now
    };
    return updated;
  }

  private synchronizeLegacyLaboratoryWorkflow(
    order: DiagnosticOrderSummary,
    payload: RecordDiagnosticResultRequest
  ): LaboratoryWorkflowState {
    const current = this.getLaboratoryWorkflow(order);
    const nextStatus: LaboratoryWorkflowState['status'] =
      order.status === 'resulted' ? 'reported' : order.status;
    const shouldAppendEvent = current.status !== nextStatus;
    const updated = {
      ...current,
      status: nextStatus,
      legacyStatus: order.status === 'resulted' ? 'resulted' : undefined,
      collectionAttempt: order.status === 'requested' ? 0 : Math.max(current.collectionAttempt, 1),
      collectedAt: order.collectedAt,
      collectedByUserId: order.collectedByUserId,
      reportedAt: order.status === 'resulted' ? order.resultedAt : current.reportedAt,
      reportedByUserId:
        order.status === 'resulted' ? order.releasedByUserId : current.reportedByUserId,
      resultSummary: order.resultSummary,
      resultValues: order.resultValues,
      resultAttachmentId: order.resultAttachmentId,
      signedByUserId: order.signedByUserId,
      signatureHash: order.signatureHash,
      updatedAt: order.updatedAt
    } satisfies LaboratoryWorkflowState;
    const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
    const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
    const withEvent = shouldAppendEvent
      ? this.appendLaboratoryEvent(
          updated,
          nextStatus,
          nextStatus,
          updated.collectionAttempt,
          order.updatedAt,
          payload.status === 'collected'
            ? payload.collectedByUserId
            : payload.status === 'resulted'
              ? payload.releasedByUserId
              : undefined,
          undefined,
          idempotencyKey,
          requestFingerprint
        )
      : updated;
    return withEvent;
  }

  private buildLaboratoryTransition(
    orderId: DiagnosticOrderId,
    payload: LaboratoryWorkflowTransitionRequest
  ): { readonly order: DiagnosticOrderSummary; readonly workflow: LaboratoryWorkflowState } {
    const currentOrder = this.getOrderOrThrow(orderId);
    const currentWorkflow = this.getLaboratoryWorkflow(currentOrder);
    const allowed = VALID_LABORATORY_TRANSITIONS[currentWorkflow.status] ?? [];
    if (!allowed.includes(payload.status)) {
      throw new Error(
        `Invalid laboratory status transition from '${currentWorkflow.status}' to '${payload.status}'`
      );
    }

    const now = nowIso();
    const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
    const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
    if (payload.status === 'collected') {
      const collectedByUserId = requireNonEmptyString(
        payload.collectedByUserId,
        'collectedByUserId'
      );
      const workflow = this.appendLaboratoryEvent(
        {
          ...currentWorkflow,
          status: 'collected',
          legacyStatus: undefined,
          collectionAttempt: Math.max(currentWorkflow.collectionAttempt, 0) + 1,
          collectedAt: now,
          collectedByUserId,
          updatedAt: now
        },
        'collected',
        'collected',
        Math.max(currentWorkflow.collectionAttempt, 0) + 1,
        now,
        collectedByUserId,
        undefined,
        idempotencyKey,
        requestFingerprint
      );
      return {
        order: {
          ...currentOrder,
          status: 'collected',
          collectedAt: now,
          collectedByUserId,
          updatedAt: now
        },
        workflow
      };
    }

    if (payload.status === 'in_analysis') {
      const actorUserId = requireNonEmptyString(payload.actorUserId, 'actorUserId');
      const workflow = this.appendLaboratoryEvent(
        {
          ...currentWorkflow,
          status: 'in_analysis',
          analysisStartedAt: now,
          analysisStartedByUserId: actorUserId,
          updatedAt: now
        },
        'in_analysis',
        'in_analysis',
        currentWorkflow.collectionAttempt,
        now,
        actorUserId,
        undefined,
        idempotencyKey,
        requestFingerprint
      );
      return {
        order: { ...currentOrder, status: 'collected', updatedAt: now },
        workflow
      };
    }

    if (payload.status === 'reported') {
      const resultSummary = payload.resultSummary?.trim();
      const resultAttachmentId = payload.resultAttachmentId?.trim();
      const resultValues = normalizeLaboratoryResultValues(payload.resultValues);
      if (!resultSummary && !resultAttachmentId && !resultValues?.length) {
        throw new Error(
          'resultSummary or resultAttachmentId or resultValues is required when status is reported'
        );
      }
      const actorUserId = requireNonEmptyString(payload.actorUserId, 'actorUserId');
      const signatureHash = this.createLaboratorySignatureHash(
        currentOrder,
        resultSummary,
        resultValues,
        resultAttachmentId,
        actorUserId,
        actorUserId,
        now
      );
      const workflow = this.appendLaboratoryEvent(
        {
          ...currentWorkflow,
          status: 'reported',
          legacyStatus: undefined,
          reportedAt: now,
          reportedByUserId: actorUserId,
          resultSummary,
          resultValues,
          resultAttachmentId,
          signedByUserId: actorUserId,
          signatureHash,
          updatedAt: now
        },
        'reported',
        'reported',
        currentWorkflow.collectionAttempt,
        now,
        actorUserId,
        undefined,
        idempotencyKey,
        requestFingerprint
      );
      return {
        order: {
          ...currentOrder,
          status: 'resulted',
          resultSummary,
          resultValues,
          resultAttachmentId,
          resultedAt: now,
          releasedByUserId: actorUserId,
          signedByUserId: actorUserId,
          signatureHash,
          updatedAt: now
        },
        workflow
      };
    }

    if (payload.status === 'delivered') {
      const deliveredByUserId = requireNonEmptyString(
        payload.deliveredByUserId,
        'deliveredByUserId'
      );
      const deliveryChannel = requireNonEmptyString(payload.deliveryChannel, 'deliveryChannel');
      if (deliveryChannel.length > 80) {
        throw new Error('deliveryChannel must be at most 80 characters');
      }
      const deliveredAt = payload.deliveredAt ? new Date(payload.deliveredAt) : new Date(now);
      if (Number.isNaN(deliveredAt.getTime())) {
        throw new Error('deliveredAt must be a valid date');
      }
      const deliveredAtIso = deliveredAt.toISOString();
      const workflow = this.appendLaboratoryEvent(
        {
          ...currentWorkflow,
          status: 'delivered',
          deliveredAt: deliveredAtIso,
          deliveredByUserId,
          deliveryChannel,
          updatedAt: now
        },
        'delivered',
        'delivered',
        currentWorkflow.collectionAttempt,
        now,
        deliveredByUserId,
        undefined,
        idempotencyKey,
        requestFingerprint
      );
      return {
        order: { ...currentOrder, status: 'resulted', updatedAt: now },
        workflow
      };
    }

    const cancelledByUserId = requireNonEmptyString(payload.cancelledByUserId, 'cancelledByUserId');
    const workflow = this.appendLaboratoryEvent(
      {
        ...currentWorkflow,
        status: 'cancelled',
        cancellationReason: payload.cancellationReason?.trim() || undefined,
        updatedAt: now
      },
      'cancelled',
      'cancelled',
      currentWorkflow.collectionAttempt,
      now,
      cancelledByUserId,
      payload.cancellationReason?.trim(),
      idempotencyKey,
      requestFingerprint
    );
    return {
      order: { ...currentOrder, status: 'cancelled', updatedAt: now },
      workflow
    };
  }

  private buildLaboratoryRecollection(
    orderId: DiagnosticOrderId,
    payload: LaboratoryRecollectionRequest
  ): { readonly order: DiagnosticOrderSummary; readonly workflow: LaboratoryWorkflowState } {
    const currentOrder = this.getOrderOrThrow(orderId);
    const currentWorkflow = this.getLaboratoryWorkflow(currentOrder);
    if (!['collected', 'in_analysis', 'reported', 'delivered'].includes(currentWorkflow.status)) {
      throw new Error(`Laboratory order cannot be recollected from '${currentWorkflow.status}'`);
    }
    const reason = requireNonEmptyString(payload.reason, 'reason');
    const collectedByUserId = requireNonEmptyString(payload.collectedByUserId, 'collectedByUserId');
    const now = nowIso();
    const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
    const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
    const collectionAttempt = currentWorkflow.collectionAttempt + 1;
    const workflow = this.appendLaboratoryEvent(
      {
        ...currentWorkflow,
        status: 'collected',
        legacyStatus: undefined,
        collectionAttempt,
        collectedAt: now,
        collectedByUserId,
        analysisStartedAt: undefined,
        analysisStartedByUserId: undefined,
        reportedAt: undefined,
        reportedByUserId: undefined,
        deliveredAt: undefined,
        deliveredByUserId: undefined,
        deliveryChannel: undefined,
        resultSummary: undefined,
        resultValues: undefined,
        resultAttachmentId: undefined,
        signedByUserId: undefined,
        signatureHash: undefined,
        recollectionReason: reason,
        updatedAt: now
      },
      'recollected',
      'collected',
      collectionAttempt,
      now,
      collectedByUserId,
      reason,
      idempotencyKey,
      requestFingerprint
    );
    return {
      order: {
        ...currentOrder,
        status: 'collected',
        collectedAt: now,
        collectedByUserId,
        resultSummary: undefined,
        resultValues: undefined,
        resultAttachmentId: undefined,
        resultedAt: undefined,
        releasedByUserId: undefined,
        signedByUserId: undefined,
        signatureHash: undefined,
        updatedAt: now
      },
      workflow
    };
  }

  private async withLaboratoryOrderLock<T>(
    orderId: DiagnosticOrderId,
    operation: () => Promise<T>
  ): Promise<T> {
    const previous = this.#laboratoryLocks.get(orderId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.#laboratoryLocks.set(orderId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.#laboratoryLocks.get(orderId) === queued) {
        this.#laboratoryLocks.delete(orderId);
      }
    }
  }

  private async findLaboratoryReplay(
    input: LaboratoryTransitionReplayInput
  ): Promise<LaboratoryWorkflowPersistenceResult | null> {
    if (!this.#repository?.findLaboratoryTransitionReplay) return null;
    return this.#repository.findLaboratoryTransitionReplay(input);
  }

  private async persistLaboratoryTransition(
    input: LaboratoryTransitionPersistenceInput
  ): Promise<LaboratoryWorkflowPersistenceResult> {
    if (this.#repository?.persistLaboratoryTransition) {
      return this.#repository.persistLaboratoryTransition(input);
    }
    if (this.#repository) {
      throw new Error('Database-backed laboratory transitions require atomic persistence');
    }
    return {
      order: input.order,
      workflow: input.workflow,
      replayed: false
    };
  }

  private applyLaboratoryPersistenceResult(
    result: LaboratoryWorkflowPersistenceResult,
    cacheKey?: string,
    fingerprint?: string
  ): LaboratoryOrderSummary {
    this.#orders.set(result.order.id, result.order);
    this.#laboratoryWorkflows.set(result.workflow.orderId, result.workflow);
    if (cacheKey && fingerprint) {
      this.#laboratoryIdempotency.set(cacheKey, { fingerprint, result });
    }
    return this.toLaboratoryOrderSummary(result.order, result.workflow);
  }

  private getCachedLaboratoryResult(
    cacheKey: string | undefined,
    fingerprint: string
  ): LaboratoryWorkflowPersistenceResult | null {
    if (!cacheKey) return null;
    const cached = this.#laboratoryIdempotency.get(cacheKey);
    if (!cached) return null;
    if (cached.fingerprint !== fingerprint) {
      throw new ConflictError('Idempotency key was already used with a different request');
    }
    return cached.result;
  }

  public async transitionLaboratoryOrderAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryWorkflowTransitionRequest
  ): Promise<LaboratoryOrderSummary> {
    return this.withLaboratoryOrderLock(orderId, async () => {
      const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
      const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
      const cacheKey = idempotencyKey
        ? this.laboratoryIdempotencyCacheKey(accountId, orderId, idempotencyKey)
        : undefined;
      const cached = this.getCachedLaboratoryResult(cacheKey, requestFingerprint);
      if (cached) {
        return this.applyLaboratoryPersistenceResult(cached, cacheKey, requestFingerprint);
      }

      const replay = idempotencyKey
        ? await this.findLaboratoryReplay({
            accountId,
            orderId,
            eventType: this.laboratoryEventType(payload),
            idempotencyKey,
            requestFingerprint
          })
        : null;
      if (replay) {
        return this.applyLaboratoryPersistenceResult(replay, cacheKey, requestFingerprint);
      }

      const currentOrder = this.#orders.get(orderId);
      if (!currentOrder || currentOrder.accountId !== accountId) {
        throw new NotFoundError('Laboratory order not found', { orderId });
      }
      if (payload.status === 'reported') {
        const actorUserId = requireNonEmptyString(payload.actorUserId, 'actorUserId');
        await this.assertEnabledLaboratorySigner(accountId, actorUserId);
      }
      const currentWorkflow = this.getLaboratoryWorkflow(currentOrder);
      const updated = this.buildLaboratoryTransition(orderId, payload);
      const persisted = await this.persistLaboratoryTransition({
        accountId,
        expectedOrder: currentOrder,
        order: updated.order,
        expectedWorkflow: currentWorkflow,
        workflow: updated.workflow,
        eventType: this.laboratoryEventType(payload),
        idempotencyKey,
        requestFingerprint
      });
      return this.applyLaboratoryPersistenceResult(persisted, cacheKey, requestFingerprint);
    });
  }

  public async recollectLaboratoryOrderAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryRecollectionRequest
  ): Promise<LaboratoryOrderSummary> {
    return this.withLaboratoryOrderLock(orderId, async () => {
      const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
      const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
      const cacheKey = idempotencyKey
        ? this.laboratoryIdempotencyCacheKey(accountId, orderId, idempotencyKey)
        : undefined;
      const cached = this.getCachedLaboratoryResult(cacheKey, requestFingerprint);
      if (cached) {
        return this.applyLaboratoryPersistenceResult(cached, cacheKey, requestFingerprint);
      }

      const replay = idempotencyKey
        ? await this.findLaboratoryReplay({
            accountId,
            orderId,
            eventType: 'recollected',
            idempotencyKey,
            requestFingerprint
          })
        : null;
      if (replay) {
        return this.applyLaboratoryPersistenceResult(replay, cacheKey, requestFingerprint);
      }

      const currentOrder = this.#orders.get(orderId);
      if (!currentOrder || currentOrder.accountId !== accountId) {
        throw new NotFoundError('Laboratory order not found', { orderId });
      }
      const currentWorkflow = this.getLaboratoryWorkflow(currentOrder);
      const updated = this.buildLaboratoryRecollection(orderId, payload);
      const persisted = await this.persistLaboratoryTransition({
        accountId,
        expectedOrder: currentOrder,
        order: updated.order,
        expectedWorkflow: currentWorkflow,
        workflow: updated.workflow,
        eventType: 'recollected',
        idempotencyKey,
        requestFingerprint
      });
      return this.applyLaboratoryPersistenceResult(persisted, cacheKey, requestFingerprint);
    });
  }

  public recordResult(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary {
    this.requireSynchronousPersistenceMode();
    this.getOrderForAccount(accountId, orderId);
    const updated = this.buildResult(orderId, payload);
    const workflow = this.synchronizeLegacyLaboratoryWorkflow(updated, payload);
    this.#orders.set(orderId, updated);
    this.#laboratoryWorkflows.set(orderId, workflow);
    return updated;
  }

  public async recordResultAndPersist(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): Promise<DiagnosticOrderSummary> {
    return this.recordResultAndPersistForAccount(accountId, orderId, payload);
  }

  public async recordResultAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): Promise<DiagnosticOrderSummary> {
    return this.withLaboratoryOrderLock(orderId, async () => {
      const idempotencyKey = this.getLaboratoryIdempotencyKey(payload);
      const requestFingerprint = this.fingerprintLaboratoryPayload(payload);
      const cacheKey = idempotencyKey
        ? this.laboratoryIdempotencyCacheKey(accountId, orderId, idempotencyKey)
        : undefined;
      const cached = this.getCachedLaboratoryResult(cacheKey, requestFingerprint);
      if (cached) {
        this.applyLaboratoryPersistenceResult(cached, cacheKey, requestFingerprint);
        return cached.order;
      }

      const replay = idempotencyKey
        ? await this.findLaboratoryReplay({
            accountId,
            orderId,
            eventType: 'reported',
            idempotencyKey,
            requestFingerprint
          })
        : null;
      if (replay) {
        this.applyLaboratoryPersistenceResult(replay, cacheKey, requestFingerprint);
        return replay.order;
      }

      const currentOrder = this.#orders.get(orderId);
      if (!currentOrder || currentOrder.accountId !== accountId) {
        throw new NotFoundError('Diagnostic order not found', { orderId });
      }
      if (payload.status === 'resulted') {
        const signer = requireNonEmptyString(payload.releasedByUserId, 'releasedByUserId');
        await this.assertEnabledLaboratorySigner(accountId, signer);
      }
      const currentWorkflow = this.getLaboratoryWorkflow(currentOrder);
      const updated = this.buildResult(orderId, payload);
      const workflow = this.synchronizeLegacyLaboratoryWorkflow(updated, payload);
      const persisted = await this.persistLaboratoryTransition({
        accountId,
        expectedOrder: currentOrder,
        order: updated,
        expectedWorkflow: currentWorkflow,
        workflow,
        eventType: this.laboratoryEventType(payload),
        idempotencyKey,
        requestFingerprint
      });
      this.applyLaboratoryPersistenceResult(persisted, cacheKey, requestFingerprint);
      return persisted.order;
    });
  }
}
