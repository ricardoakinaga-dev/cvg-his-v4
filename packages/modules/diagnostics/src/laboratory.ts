import type {
  AccountId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  ExamCatalogEntry,
  LaboratoryDashboardSummary,
  LaboratoryEquipmentSummary,
  LaboratoryReferenceValueSummary,
  LaboratoryReportTypeSummary
} from '@cvg-his-v2/shared-types';
import type {
  CreateLaboratoryEquipmentRequest,
  CreateLaboratoryReferenceValueRequest,
  CreateLaboratoryReportTypeRequest,
  CreateDiagnosticOrderRequest,
  RecordDiagnosticResultRequest,
  UpdateLaboratoryEquipmentRequest,
  UpdateLaboratoryReferenceValueRequest,
  UpdateLaboratoryReportTypeRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  LaboratoryLifecycleStatus,
  LaboratoryOrderSummary,
  LaboratoryRecollectionRequest,
  LaboratoryWorkflowTransitionRequest
} from './laboratory-workflow.js';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_LABORATORY_EQUIPMENT,
  DEFAULT_LABORATORY_REFERENCE_VALUES,
  DEFAULT_LABORATORY_REPORT_TYPES
} from './catalog.js';

interface DiagnosticsOrdersGateway {
  list(encounterId?: string): readonly DiagnosticOrderSummary[];
  listByAccount(accountId: AccountId): readonly DiagnosticOrderSummary[];
  listCatalog(): readonly ExamCatalogEntry[];
  createOrder(payload: CreateDiagnosticOrderRequest): DiagnosticOrderSummary;
  createOrderAndPersist?: (
    payload: CreateDiagnosticOrderRequest
  ) => Promise<DiagnosticOrderSummary>;
  createOrderAndPersistForAccount?: (
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ) => Promise<DiagnosticOrderSummary>;
  getOrThrow(orderId: DiagnosticOrderId): DiagnosticOrderSummary;
  recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary;
  recordResultAndPersist?: (
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ) => Promise<DiagnosticOrderSummary>;
  recordResultAndPersistForAccount?: (
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ) => Promise<DiagnosticOrderSummary>;
  listLaboratoryOrders?: (accountId: AccountId) => readonly LaboratoryOrderSummary[];
  getLaboratoryOrderOrThrow?: (
    accountId: AccountId,
    orderId: DiagnosticOrderId
  ) => LaboratoryOrderSummary;
  transitionLaboratoryOrderAndPersistForAccount?: (
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryWorkflowTransitionRequest
  ) => Promise<LaboratoryOrderSummary>;
  recollectLaboratoryOrderAndPersistForAccount?: (
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryRecollectionRequest
  ) => Promise<LaboratoryOrderSummary>;
}

export interface LaboratoryCatalogRepository {
  ensureSeedData(accountId: AccountId): Promise<void>;
  listEquipment(accountId: AccountId): Promise<readonly LaboratoryEquipmentSummary[]>;
  getEquipment(accountId: AccountId, equipmentId: string): Promise<LaboratoryEquipmentSummary | undefined>;
  createEquipment(
    accountId: AccountId,
    payload: CreateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary>;
  updateEquipment(
    accountId: AccountId,
    equipmentId: string,
    payload: UpdateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary>;
  listReportTypes(accountId: AccountId): Promise<readonly LaboratoryReportTypeSummary[]>;
  getReportType(accountId: AccountId, reportTypeId: string): Promise<LaboratoryReportTypeSummary | undefined>;
  createReportType(
    accountId: AccountId,
    payload: CreateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary>;
  updateReportType(
    accountId: AccountId,
    reportTypeId: string,
    payload: UpdateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary>;
  listReferenceValues(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly LaboratoryReferenceValueSummary[]>;
  getReferenceValue(accountId: AccountId, referenceValueId: string): Promise<LaboratoryReferenceValueSummary | undefined>;
  createReferenceValue(
    accountId: AccountId,
    payload: CreateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary>;
  updateReferenceValue(
    accountId: AccountId,
    referenceValueId: string,
    payload: UpdateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary>;
}

export interface LaboratoryServiceOptions {
  readonly catalogRepository?: LaboratoryCatalogRepository;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

function toCanonicalLaboratoryStatus(
  status: DiagnosticOrderSummary['status']
): LaboratoryLifecycleStatus {
  switch (status) {
    case 'requested':
    case 'collected':
    case 'cancelled':
      return status;
    case 'resulted':
      return 'reported';
  }
}

export class InMemoryLaboratoryCatalogRepository implements LaboratoryCatalogRepository {
  readonly #equipment = new Map<AccountId, readonly LaboratoryEquipmentSummary[]>();
  readonly #reportTypes = new Map<AccountId, readonly LaboratoryReportTypeSummary[]>();
  readonly #referenceValues = new Map<AccountId, readonly LaboratoryReferenceValueSummary[]>();

  public async ensureSeedData(accountId: AccountId): Promise<void> {
    if (!this.#equipment.has(accountId)) {
      this.#equipment.set(accountId, [...DEFAULT_LABORATORY_EQUIPMENT]);
    }

    if (!this.#reportTypes.has(accountId)) {
      this.#reportTypes.set(accountId, [...DEFAULT_LABORATORY_REPORT_TYPES]);
    }

    if (!this.#referenceValues.has(accountId)) {
      this.#referenceValues.set(accountId, [...DEFAULT_LABORATORY_REFERENCE_VALUES]);
    }
  }

  public async listEquipment(accountId: AccountId): Promise<readonly LaboratoryEquipmentSummary[]> {
    await this.ensureSeedData(accountId);
    return [...(this.#equipment.get(accountId) ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  public async getEquipment(
    accountId: AccountId,
    equipmentId: string
  ): Promise<LaboratoryEquipmentSummary | undefined> {
    await this.ensureSeedData(accountId);
    return (this.#equipment.get(accountId) ?? []).find((item) => item.id === equipmentId);
  }

  public async createEquipment(
    accountId: AccountId,
    payload: CreateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    await this.ensureSeedData(accountId);
    const equipment: LaboratoryEquipmentSummary = {
      id: `lab-eq-${randomUUID()}`,
      name: payload.name,
      type: payload.type,
      serialNumber: payload.serialNumber,
      status: payload.status ?? 'active',
      lastCalibrationAt: new Date(payload.lastCalibrationAt).toISOString()
    };
    const current = this.#equipment.get(accountId) ?? [];
    this.#equipment.set(accountId, [...current, equipment]);
    return equipment;
  }

  public async updateEquipment(
    accountId: AccountId,
    equipmentId: string,
    payload: UpdateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    await this.ensureSeedData(accountId);
    const current = [...(this.#equipment.get(accountId) ?? [])];
    const index = current.findIndex((item) => item.id === equipmentId);
    if (index < 0) {
      throw new Error('Laboratory equipment not found');
    }
    const existing = current[index];
    const updated: LaboratoryEquipmentSummary = {
      ...existing,
      name: payload.name ?? existing.name,
      type: payload.type ?? existing.type,
      serialNumber: payload.serialNumber ?? existing.serialNumber,
      status: payload.status ?? existing.status,
      lastCalibrationAt: payload.lastCalibrationAt
        ? new Date(payload.lastCalibrationAt).toISOString()
        : existing.lastCalibrationAt
    };
    current[index] = updated;
    this.#equipment.set(accountId, current);
    return updated;
  }

  public async listReportTypes(
    accountId: AccountId
  ): Promise<readonly LaboratoryReportTypeSummary[]> {
    await this.ensureSeedData(accountId);
    return [...(this.#reportTypes.get(accountId) ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  public async getReportType(
    accountId: AccountId,
    reportTypeId: string
  ): Promise<LaboratoryReportTypeSummary | undefined> {
    await this.ensureSeedData(accountId);
    return (this.#reportTypes.get(accountId) ?? []).find((item) => item.id === reportTypeId);
  }

  public async createReportType(
    accountId: AccountId,
    payload: CreateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    await this.ensureSeedData(accountId);
    const reportType: LaboratoryReportTypeSummary = {
      id: `lab-report-type-${randomUUID()}`,
      name: payload.name,
      code: payload.code,
      category: payload.category,
      description: payload.description,
      active: payload.active ?? true
    };
    const current = this.#reportTypes.get(accountId) ?? [];
    this.#reportTypes.set(accountId, [...current, reportType]);
    return reportType;
  }

  public async updateReportType(
    accountId: AccountId,
    reportTypeId: string,
    payload: UpdateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    await this.ensureSeedData(accountId);
    const current = [...(this.#reportTypes.get(accountId) ?? [])];
    const index = current.findIndex((item) => item.id === reportTypeId);
    if (index < 0) {
      throw new Error('Laboratory report type not found');
    }
    const existing = current[index];
    const updated: LaboratoryReportTypeSummary = {
      ...existing,
      name: payload.name ?? existing.name,
      code: payload.code ?? existing.code,
      category: payload.category ?? existing.category,
      description: payload.description ?? existing.description,
      active: payload.active ?? existing.active
    };
    current[index] = updated;
    this.#reportTypes.set(accountId, current);
    return updated;
  }

  public async listReferenceValues(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly LaboratoryReferenceValueSummary[]> {
    await this.ensureSeedData(accountId);
    const normalizedFilter = normalizeText(filterExam);
    return [...(this.#referenceValues.get(accountId) ?? [])]
      .filter((item) => !normalizedFilter || normalizeText(item.examType).includes(normalizedFilter))
      .sort((left, right) => left.parameter.localeCompare(right.parameter));
  }

  public async getReferenceValue(
    accountId: AccountId,
    referenceValueId: string
  ): Promise<LaboratoryReferenceValueSummary | undefined> {
    await this.ensureSeedData(accountId);
    return (this.#referenceValues.get(accountId) ?? []).find((item) => item.id === referenceValueId);
  }

  public async createReferenceValue(
    accountId: AccountId,
    payload: CreateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    await this.ensureSeedData(accountId);
    const referenceValue: LaboratoryReferenceValueSummary = {
      id: `lab-ref-${randomUUID()}`,
      parameter: payload.parameter,
      examType: payload.examType,
      minValue: payload.minValue,
      maxValue: payload.maxValue,
      unit: payload.unit
    };
    const current = this.#referenceValues.get(accountId) ?? [];
    this.#referenceValues.set(accountId, [...current, referenceValue]);
    return referenceValue;
  }

  public async updateReferenceValue(
    accountId: AccountId,
    referenceValueId: string,
    payload: UpdateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    await this.ensureSeedData(accountId);
    const current = [...(this.#referenceValues.get(accountId) ?? [])];
    const index = current.findIndex((item) => item.id === referenceValueId);
    if (index < 0) {
      throw new Error('Laboratory reference value not found');
    }
    const existing = current[index];
    const updated: LaboratoryReferenceValueSummary = {
      ...existing,
      parameter: payload.parameter ?? existing.parameter,
      examType: payload.examType ?? existing.examType,
      minValue: payload.minValue ?? existing.minValue,
      maxValue: payload.maxValue ?? existing.maxValue,
      unit: payload.unit ?? existing.unit
    };
    if (updated.minValue > updated.maxValue) {
      throw new Error('Laboratory reference value minimum cannot be greater than maximum');
    }
    current[index] = updated;
    this.#referenceValues.set(accountId, current);
    return updated;
  }
}

export class LaboratoryService {
  readonly #diagnostics: DiagnosticsOrdersGateway;
  readonly #catalogRepository?: LaboratoryCatalogRepository;

  public constructor(diagnostics: DiagnosticsOrdersGateway, options?: LaboratoryServiceOptions) {
    this.#diagnostics = diagnostics;
    this.#catalogRepository = options?.catalogRepository;
  }

  public async hydrateCatalog(accountId: AccountId): Promise<void> {
    await this.#catalogRepository?.ensureSeedData(accountId);
  }

  public async listOrders(
    accountId: AccountId,
    encounterId?: string
  ): Promise<readonly DiagnosticOrderSummary[]> {
    const items = encounterId
      ? this.#diagnostics.list(encounterId).filter((order) => order.accountId === accountId)
      : this.#diagnostics.listByAccount(accountId);

    return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async listWorkflowOrders(
    accountId: AccountId,
    encounterId?: string
  ): Promise<readonly LaboratoryOrderSummary[]> {
    const items = this.#diagnostics.listLaboratoryOrders
      ? this.#diagnostics.listLaboratoryOrders(accountId)
      : (await this.listOrders(accountId)).map((order): LaboratoryOrderSummary => ({
        ...order,
        status: toCanonicalLaboratoryStatus(order.status),
        legacyStatus: order.status === 'resulted' ? 'resulted' : undefined,
        collectionAttempt: order.status === 'requested' ? 0 : 1,
        history: [],
        workflowVersion: 2 as const
      }));
    return [...items]
      .filter((order) => !encounterId || order.encounterId === encounterId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public getOrder(accountId: AccountId, orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    const order = this.#diagnostics.getOrThrow(orderId);
    if (order.accountId !== accountId) {
      throw new Error('Diagnostic order does not belong to the current account');
    }

    return order;
  }

  public getWorkflowOrder(accountId: AccountId, orderId: DiagnosticOrderId): LaboratoryOrderSummary {
    if (this.#diagnostics.getLaboratoryOrderOrThrow) {
      return this.#diagnostics.getLaboratoryOrderOrThrow(accountId, orderId);
    }
    const order = this.getOrder(accountId, orderId);
    return {
      ...order,
      status: toCanonicalLaboratoryStatus(order.status),
      legacyStatus: order.status === 'resulted' ? 'resulted' : undefined,
      collectionAttempt: order.status === 'requested' ? 0 : 1,
      history: [],
      workflowVersion: 2
    };
  }

  public async listResults(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly DiagnosticOrderSummary[]> {
    const normalizedFilter = normalizeText(filterExam);
    const items = await this.listOrders(accountId);
    return items.filter((order) => {
      if (order.status !== 'resulted' && !order.resultSummary && !order.resultAttachmentId) {
        return false;
      }

      return (
        !normalizedFilter ||
        normalizeText(order.examType).includes(normalizedFilter) ||
        normalizeText(order.examCatalogId).includes(normalizedFilter)
      );
    });
  }

  public listCatalog(): readonly ExamCatalogEntry[] {
    return [...this.#diagnostics.listCatalog()].sort((left, right) => left.name.localeCompare(right.name));
  }

  public createOrder(payload: CreateDiagnosticOrderRequest): DiagnosticOrderSummary {
    return this.#diagnostics.createOrder(payload);
  }

  public async createOrderAndPersist(
    payload: CreateDiagnosticOrderRequest
  ): Promise<DiagnosticOrderSummary> {
    if (this.#diagnostics.createOrderAndPersist) {
      return this.#diagnostics.createOrderAndPersist(payload);
    }

    return this.#diagnostics.createOrder(payload);
  }

  public async createOrderAndPersistForAccount(
    accountId: AccountId,
    payload: CreateDiagnosticOrderRequest
  ): Promise<DiagnosticOrderSummary> {
    if (this.#diagnostics.createOrderAndPersistForAccount) {
      return this.#diagnostics.createOrderAndPersistForAccount(accountId, payload);
    }
    const order = await this.createOrderAndPersist(payload);
    if (order.accountId !== accountId) {
      throw new Error('Diagnostic order does not belong to the current account');
    }
    return order;
  }

  public recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary {
    return this.#diagnostics.recordResult(orderId, payload);
  }

  public async recordResultAndPersist(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): Promise<DiagnosticOrderSummary> {
    if (this.#diagnostics.recordResultAndPersist) {
      return this.#diagnostics.recordResultAndPersist(orderId, payload);
    }

    return this.#diagnostics.recordResult(orderId, payload);
  }

  public async recordResultAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): Promise<DiagnosticOrderSummary> {
    if (this.#diagnostics.recordResultAndPersistForAccount) {
      return this.#diagnostics.recordResultAndPersistForAccount(accountId, orderId, payload);
    }
    const order = this.getOrder(accountId, orderId);
    return this.recordResultAndPersist(order.id, payload);
  }

  public async transitionOrderAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryWorkflowTransitionRequest
  ): Promise<LaboratoryOrderSummary> {
    if (this.#diagnostics.transitionLaboratoryOrderAndPersistForAccount) {
      return this.#diagnostics.transitionLaboratoryOrderAndPersistForAccount(accountId, orderId, payload);
    }
    throw new Error('Canonical laboratory workflow persistence is not configured');
  }

  public async recollectOrderAndPersistForAccount(
    accountId: AccountId,
    orderId: DiagnosticOrderId,
    payload: LaboratoryRecollectionRequest
  ): Promise<LaboratoryOrderSummary> {
    if (this.#diagnostics.recollectLaboratoryOrderAndPersistForAccount) {
      return this.#diagnostics.recollectLaboratoryOrderAndPersistForAccount(accountId, orderId, payload);
    }
    throw new Error('Canonical laboratory workflow persistence is not configured');
  }

  public async getDashboardSummary(accountId: AccountId): Promise<LaboratoryDashboardSummary> {
    const [orders, equipment] = await Promise.all([
      this.listOrders(accountId),
      this.listEquipment(accountId)
    ]);

    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === 'requested').length,
      pendingResults: orders.filter((order) => order.status === 'collected').length,
      releasedResults: orders.filter((order) => order.status === 'resulted').length,
      equipmentActive: equipment.filter((item) => item.status === 'active').length
    };
  }

  public async listEquipment(
    accountId: AccountId
  ): Promise<readonly LaboratoryEquipmentSummary[]> {
    if (!this.#catalogRepository) {
      return [...DEFAULT_LABORATORY_EQUIPMENT].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.listEquipment(accountId);
  }

  public async getEquipment(
    accountId: AccountId,
    equipmentId: string
  ): Promise<LaboratoryEquipmentSummary> {
    if (!this.#catalogRepository) {
      const equipment = DEFAULT_LABORATORY_EQUIPMENT.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('Laboratory equipment not found');
      return equipment;
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    const equipment = await this.#catalogRepository.getEquipment(accountId, equipmentId);
    if (!equipment) {
      throw new Error('Laboratory equipment not found');
    }
    return equipment;
  }

  public async createEquipment(
    accountId: AccountId,
    payload: CreateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory equipment persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.createEquipment(accountId, payload);
  }

  public async updateEquipment(
    accountId: AccountId,
    equipmentId: string,
    payload: UpdateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory equipment persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.updateEquipment(accountId, equipmentId, payload);
  }

  public async listReportTypes(
    accountId: AccountId
  ): Promise<readonly LaboratoryReportTypeSummary[]> {
    if (!this.#catalogRepository) {
      return [...DEFAULT_LABORATORY_REPORT_TYPES].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.listReportTypes(accountId);
  }

  public async getReportType(
    accountId: AccountId,
    reportTypeId: string
  ): Promise<LaboratoryReportTypeSummary> {
    if (!this.#catalogRepository) {
      const reportType = DEFAULT_LABORATORY_REPORT_TYPES.find((item) => item.id === reportTypeId);
      if (!reportType) throw new Error('Laboratory report type not found');
      return reportType;
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    const reportType = await this.#catalogRepository.getReportType(accountId, reportTypeId);
    if (!reportType) {
      throw new Error('Laboratory report type not found');
    }
    return reportType;
  }

  public async createReportType(
    accountId: AccountId,
    payload: CreateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory report type persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.createReportType(accountId, payload);
  }

  public async updateReportType(
    accountId: AccountId,
    reportTypeId: string,
    payload: UpdateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory report type persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.updateReportType(accountId, reportTypeId, payload);
  }

  public async listReferenceValues(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly LaboratoryReferenceValueSummary[]> {
    if (!this.#catalogRepository) {
      const normalizedFilter = normalizeText(filterExam);
      return [...DEFAULT_LABORATORY_REFERENCE_VALUES]
        .filter((item) => !normalizedFilter || normalizeText(item.examType).includes(normalizedFilter))
        .sort((left, right) => left.parameter.localeCompare(right.parameter));
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.listReferenceValues(accountId, filterExam);
  }

  public async getReferenceValue(
    accountId: AccountId,
    referenceValueId: string
  ): Promise<LaboratoryReferenceValueSummary> {
    if (!this.#catalogRepository) {
      const referenceValue = DEFAULT_LABORATORY_REFERENCE_VALUES.find((item) => item.id === referenceValueId);
      if (!referenceValue) throw new Error('Laboratory reference value not found');
      return referenceValue;
    }

    await this.#catalogRepository.ensureSeedData(accountId);
    const referenceValue = await this.#catalogRepository.getReferenceValue(accountId, referenceValueId);
    if (!referenceValue) {
      throw new Error('Laboratory reference value not found');
    }
    return referenceValue;
  }

  public async createReferenceValue(
    accountId: AccountId,
    payload: CreateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory reference value persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.createReferenceValue(accountId, payload);
  }

  public async updateReferenceValue(
    accountId: AccountId,
    referenceValueId: string,
    payload: UpdateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    if (!this.#catalogRepository) {
      throw new Error('Laboratory reference value persistence is not configured');
    }
    await this.#catalogRepository.ensureSeedData(accountId);
    return this.#catalogRepository.updateReferenceValue(accountId, referenceValueId, payload);
  }
}
