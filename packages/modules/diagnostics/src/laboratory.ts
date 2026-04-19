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
  CreateDiagnosticOrderRequest,
  RecordDiagnosticResultRequest
} from '@cvg-his-v2/shared-contracts';
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
  getOrThrow(orderId: DiagnosticOrderId): DiagnosticOrderSummary;
  recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary;
}

export interface LaboratoryCatalogRepository {
  ensureSeedData(accountId: AccountId): Promise<void>;
  listEquipment(accountId: AccountId): Promise<readonly LaboratoryEquipmentSummary[]>;
  listReportTypes(accountId: AccountId): Promise<readonly LaboratoryReportTypeSummary[]>;
  listReferenceValues(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly LaboratoryReferenceValueSummary[]>;
}

export interface LaboratoryServiceOptions {
  readonly catalogRepository?: LaboratoryCatalogRepository;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
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

  public async listReportTypes(
    accountId: AccountId
  ): Promise<readonly LaboratoryReportTypeSummary[]> {
    await this.ensureSeedData(accountId);
    return [...(this.#reportTypes.get(accountId) ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
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
    await this.hydrateCatalog(accountId);
    const items = encounterId
      ? this.#diagnostics.list(encounterId).filter((order) => order.accountId === accountId)
      : this.#diagnostics.listByAccount(accountId);

    return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public getOrder(accountId: AccountId, orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    const order = this.#diagnostics.getOrThrow(orderId);
    if (order.accountId !== accountId) {
      throw new Error('Diagnostic order does not belong to the current account');
    }

    return order;
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

  public recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest
  ): DiagnosticOrderSummary {
    return this.#diagnostics.recordResult(orderId, payload);
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
}
