import { createHash } from 'node:crypto';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { cancellationReportDefinitions } from './cancellation-report-definitions.js';
import { renderReportExport } from './report-renderers.js';
import { nextRunAt } from './report-schedule-time.js';

export { DatabaseReportRepository } from './report-database-repository.js';

export {
  getReportCatalogContract,
  reportCatalogContractById,
  reportCatalogContracts,
  type ReportCatalogContract,
  type ReportCatalogDateSemantics,
  type ReportCatalogImplementationStatus
} from './report-catalog-contract.js';

export type ReportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';
export type ReportContentEncoding = 'utf8' | 'base64';
export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportColumnType = 'string' | 'number' | 'currency' | 'date' | 'datetime' | 'status';
export type ReportScheduleDeliveryStatus = 'sent' | 'failed';

export interface ReportColumn {
  readonly key: string;
  readonly label: string;
  readonly type: ReportColumnType;
}

export interface ReportDefinition {
  readonly id: string;
  readonly accountId: AccountId | null;
  readonly title: string;
  readonly description: string;
  readonly category:
    | 'executive'
    | 'financial'
    | 'commercial'
    | 'clinical'
    | 'inventory'
    | 'staff'
    | 'registrations';
  readonly requiredPermission: string;
  readonly supportedFormats: readonly ReportFormat[];
  readonly filterSchema: Record<string, 'string' | 'date' | 'boolean' | 'number'>;
  readonly columns: readonly ReportColumn[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportExecutionSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly reportId: string;
  readonly requestedByUserId: UserId;
  readonly status: 'completed';
  readonly filters: Record<string, unknown>;
  readonly rowCount: number;
  readonly generatedAt: string;
  readonly expiresAt: string;
}

export interface ReportExecutionDetail extends ReportExecutionSummary {
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly Record<string, unknown>[];
}

export interface ReportExportSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly executionId: string;
  readonly format: ReportFormat;
  readonly filename: string;
  readonly contentType: string;
  readonly contentEncoding: ReportContentEncoding;
  readonly content: string;
  readonly exportedByUserId: UserId;
  readonly exportedAt: string;
}

export interface ReportScheduleSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly reportId: string;
  readonly name: string;
  readonly frequency: ReportScheduleFrequency;
  readonly format: ReportFormat;
  readonly filters: Record<string, unknown>;
  readonly recipients: readonly string[];
  readonly isActive: boolean;
  readonly nextRunAt: string;
  readonly lastRunAt: string | null;
  readonly lastExecutionId: string | null;
  readonly lastError: string | null;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportScheduleClaim {
  readonly schedule: ReportScheduleSummary;
  readonly claimToken: string;
  readonly claimUntil: string;
  readonly claimWorkerId: string;
}

export interface ReportScheduleClaimCapability {
  readonly scheduleId: string;
  readonly claimToken: string;
}

export interface ReportScheduleDeliverySummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly scheduleId: string;
  readonly executionId: string | null;
  readonly exportId: string | null;
  readonly recipient: string;
  readonly status: ReportScheduleDeliveryStatus;
  readonly format: ReportFormat;
  readonly deliveredAt: string;
  readonly error: string | null;
  readonly createdAt: string;
}

export interface ReportScheduleDeliveryClaim {
  readonly delivery: ReportScheduleDeliverySummary;
  readonly claimToken: string;
  readonly claimUntil: string;
  readonly claimWorkerId: string;
}

export interface ReportScheduleDeliveryAlertSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly scheduleId: string;
  readonly reportId: string;
  readonly recipient: string;
  readonly failureCount: number;
  readonly lastFailureAt: string;
  readonly lastError: string;
  readonly severity: 'medium' | 'high';
}

export interface ExecuteReportInput {
  readonly reportId: string;
  readonly executionId?: string;
  readonly filters?: Record<string, unknown>;
  readonly rows: readonly Record<string, unknown>[];
}

export interface CreateReportScheduleInput {
  readonly reportId: string;
  readonly name: string;
  readonly frequency: ReportScheduleFrequency;
  readonly format?: ReportFormat;
  readonly filters?: Record<string, unknown>;
  readonly recipients?: readonly string[];
  readonly isActive?: boolean;
}

export interface RecordReportScheduleExecutionInput {
  readonly claimToken: string;
  readonly executionId?: string;
  readonly ranAt?: string;
  readonly error?: string | null;
}

export interface RecordReportScheduleDeliveriesInput {
  readonly executionId?: string | null;
  readonly exportId?: string | null;
  readonly recipients: readonly string[];
  readonly status: ReportScheduleDeliveryStatus;
  readonly format: ReportFormat;
  readonly deliveredAt?: string;
  readonly error?: string | null;
  readonly scheduleClaimToken?: string;
}

export interface ReportRepository {
  saveExecution(execution: ReportExecutionDetail): Promise<void>;
  saveExport(exported: ReportExportSummary): Promise<void>;
  readonly saveExecutionForScheduleClaim?: (
    execution: ReportExecutionDetail,
    scheduleId: string,
    scheduleClaimToken: string
  ) => Promise<boolean>;
  readonly saveExportForScheduleClaim?: (
    exported: ReportExportSummary,
    scheduleId: string,
    scheduleClaimToken: string
  ) => Promise<boolean>;
  saveSchedule(schedule: ReportScheduleSummary): Promise<void>;
  saveDelivery(delivery: ReportScheduleDeliverySummary): Promise<void>;
  readonly saveDeliveryForScheduleClaim?: (
    delivery: ReportScheduleDeliverySummary,
    scheduleClaimToken: string
  ) => Promise<boolean>;
  findExecutions(accountId: AccountId): Promise<readonly ReportExecutionDetail[]>;
  findExports(accountId: AccountId): Promise<readonly ReportExportSummary[]>;
  findSchedules(accountId: AccountId): Promise<readonly ReportScheduleSummary[]>;
  findDeliveries(accountId: AccountId): Promise<readonly ReportScheduleDeliverySummary[]>;
  readonly claimDueSchedules?: (
    accountId: AccountId,
    asOf: string,
    workerId: string,
    leaseMs?: number
  ) => Promise<readonly ReportScheduleSummary[]>;
  readonly claimDueSchedulesWithLease?: (
    accountId: AccountId,
    asOf: string,
    workerId: string,
    leaseMs?: number
  ) => Promise<readonly ReportScheduleClaim[]>;
  readonly saveClaimedSchedule?: (
    schedule: ReportScheduleSummary,
    claimToken: string
  ) => Promise<boolean>;
  readonly claimFailedDeliveries?: (
    accountId: AccountId,
    asOf: string,
    workerId: string,
    limit?: number,
    leaseMs?: number
  ) => Promise<readonly ReportScheduleDeliveryClaim[]>;
  readonly saveClaimedDelivery?: (
    delivery: ReportScheduleDeliverySummary,
    claimToken: string
  ) => Promise<boolean>;
}

export interface ReportsServiceOptions {
  readonly repository?: ReportRepository;
  readonly deliveryProvider?: ReportDeliveryProvider;
}

export interface ReportDeliveryProvider {
  deliver(input: {
    readonly accountId: AccountId;
    readonly scheduleId: string;
    readonly executionId: string;
    /** Stable delivery identity used by an adapter to deduplicate retries. */
    readonly deliveryId: string;
    readonly idempotencyKey: string;
    readonly recipient: string;
    readonly exported: ReportExportSummary;
  }): Promise<void>;
}

export class ReportScheduleLeaseLostError extends ValidationError {
  public readonly scheduleId: string;

  public constructor(scheduleId: string) {
    super('Report schedule lease was lost', { scheduleId });
    this.name = 'ReportScheduleLeaseLostError';
    this.scheduleId = scheduleId;
  }
}

const createdAt = '2026-05-28T00:00:00.000Z';

function seedDefinitions(): readonly ReportDefinition[] {
  return [
    {
      id: 'administrative-executive',
      accountId: null,
      title: 'Hub Executivo Administrativo',
      description: 'Indicadores executivos de financeiro, comercial, caixa e fiscal.',
      category: 'executive',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'domain', label: 'Domínio', type: 'string' },
        { key: 'metric', label: 'Indicador', type: 'string' },
        { key: 'value', label: 'Valor', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'commission-calculations',
      accountId: null,
      title: 'Fechamentos de Comissão',
      description: 'Fechamentos de comissão por período, status, base e valor calculado.',
      category: 'staff',
      requiredPermission: 'staff.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { status: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'number', label: 'Número', type: 'string' },
        { key: 'period', label: 'Período', type: 'string' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'totalBaseAmount', label: 'Base', type: 'currency' },
        { key: 'totalCommissionAmount', label: 'Comissão', type: 'currency' },
        { key: 'lineCount', label: 'Linhas', type: 'number' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'scheduling-appointments',
      accountId: null,
      title: 'Agendamentos',
      description:
        'Agendamentos persistidos por período, situação e contexto operacional da agenda.',
      category: 'clinical',
      requiredPermission: 'scheduling.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        search: 'string',
        status: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'appointmentId', label: 'Agendamento', type: 'string' },
        { key: 'scheduledAt', label: 'Data agendada', type: 'datetime' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'reason', label: 'Motivo', type: 'string' },
        { key: 'patientId', label: 'Paciente', type: 'string' },
        { key: 'ownerId', label: 'Tutor', type: 'string' },
        { key: 'practitionerStaffId', label: 'Profissional', type: 'string' },
        { key: 'serviceId', label: 'Serviço', type: 'string' },
        { key: 'unit', label: 'Unidade', type: 'string' },
        { key: 'specialty', label: 'Especialidade', type: 'string' },
        { key: 'resourceLabel', label: 'Recurso', type: 'string' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' },
        { key: 'updatedAt', label: 'Atualização', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'scheduling-professional-care',
      accountId: null,
      title: 'Atendimento por Profissional',
      description:
        'Agendamentos persistidos agregados por profissional, situação operacional e serviços distintos.',
      category: 'staff',
      requiredPermission: 'staff.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'professional', label: 'Profissional', type: 'string' },
        { key: 'scheduled', label: 'Agendamentos', type: 'number' },
        { key: 'completed', label: 'Executados', type: 'number' },
        { key: 'checkedIn', label: 'Check-in', type: 'number' },
        { key: 'cancelled', label: 'Cancelados', type: 'number' },
        { key: 'services', label: 'Serviços distintos', type: 'number' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'financial-payables',
      accountId: null,
      title: 'Contas a Pagar e Contas Pagas',
      description:
        'Títulos do subledger financeiro com situação, vencimento, pagamento e reconciliação.',
      category: 'financial',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        status: 'string',
        search: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'supplierName', label: 'Fornecedor', type: 'string' },
        { key: 'description', label: 'Descrição', type: 'string' },
        { key: 'category', label: 'Categoria', type: 'string' },
        { key: 'issuedAt', label: 'Emissão', type: 'date' },
        { key: 'dueAt', label: 'Vencimento', type: 'date' },
        { key: 'totalAmount', label: 'Total', type: 'currency' },
        { key: 'paidAmount', label: 'Pago', type: 'currency' },
        { key: 'outstandingAmount', label: 'A Pagar', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'paymentMethod', label: 'Método', type: 'string' },
        { key: 'reconciliationStatus', label: 'Reconciliação', type: 'status' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'financial-receivables',
      accountId: null,
      title: 'Contas a Receber e Contas Recebidas',
      description:
        'Recebíveis do subledger financeiro com vencimento, liquidação, paciente e tutor.',
      category: 'financial',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        status: 'string',
        search: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'patientName', label: 'Paciente', type: 'string' },
        { key: 'ownerName', label: 'Nome do tutor', type: 'string' },
        { key: 'patientSpecies', label: 'Espécie', type: 'string' },
        { key: 'encounterId', label: 'Atendimento', type: 'string' },
        { key: 'installmentNumber', label: 'Parcela', type: 'number' },
        { key: 'installmentLabel', label: 'Descrição da parcela', type: 'string' },
        { key: 'issuedAt', label: 'Emissão', type: 'date' },
        { key: 'dueAt', label: 'Vencimento', type: 'date' },
        { key: 'settledAt', label: 'Liquidação', type: 'date' },
        { key: 'amountOriginal', label: 'Original', type: 'currency' },
        { key: 'amountPaid', label: 'Recebido', type: 'currency' },
        { key: 'amountOutstanding', label: 'Saldo', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'financialStatus', label: 'Status financeiro', type: 'status' },
        { key: 'encounterStatus', label: 'Atendimento', type: 'status' },
        { key: 'paymentCount', label: 'Pagamentos', type: 'number' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'financial-cheques',
      accountId: null,
      title: 'Cheques',
      description:
        'Pagamentos persistidos com método cheque, vinculados à comanda e sem inferência de lifecycle.',
      category: 'financial',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'paymentId', label: 'Pagamento', type: 'string' },
        { key: 'saleNumber', label: 'Comanda', type: 'string' },
        { key: 'saleStatus', label: 'Status da comanda', type: 'status' },
        { key: 'counterSaleId', label: 'ID da comanda', type: 'string' },
        { key: 'reference', label: 'Referência', type: 'string' },
        { key: 'amount', label: 'Valor', type: 'currency' },
        { key: 'installments', label: 'Parcelas', type: 'number' },
        { key: 'recordedAt', label: 'Registrado em', type: 'datetime' },
        { key: 'notes', label: 'Observações', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'fiscal-service-invoices',
      accountId: null,
      title: 'NF de Serviços Prestados',
      description:
        'Documentos NFS-e persistidos por competência, com cliente, serviços, impostos, total e status atual.',
      category: 'financial',
      requiredPermission: 'fiscal.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        search: 'string',
        status: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'documentId', label: 'Documento', type: 'string' },
        { key: 'serie', label: 'Série', type: 'string' },
        { key: 'numero', label: 'Número', type: 'number' },
        { key: 'competencia', label: 'Competência', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'customerName', label: 'Cliente', type: 'string' },
        { key: 'customerDocument', label: 'Documento do cliente', type: 'string' },
        { key: 'provider', label: 'Provider fiscal', type: 'string' },
        { key: 'serviceDescriptions', label: 'Serviços', type: 'string' },
        { key: 'serviceCodes', label: 'Códigos de serviço', type: 'string' },
        { key: 'serviceQuantity', label: 'Quantidade', type: 'number' },
        { key: 'serviceSubtotal', label: 'Subtotal dos serviços', type: 'currency' },
        { key: 'totalIss', label: 'ISS', type: 'currency' },
        { key: 'totalPis', label: 'PIS', type: 'currency' },
        { key: 'totalCofins', label: 'COFINS', type: 'currency' },
        { key: 'totalCsll', label: 'CSLL', type: 'currency' },
        { key: 'totalIrrf', label: 'IRRF', type: 'currency' },
        { key: 'totalInss', label: 'INSS', type: 'currency' },
        { key: 'totalDocument', label: 'Total do documento', type: 'currency' },
        { key: 'observations', label: 'Observações', type: 'string' },
        { key: 'createdAt', label: 'Criado em', type: 'datetime' },
        { key: 'authorizationCode', label: 'Autorização', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'financial-advance-payments',
      accountId: null,
      title: 'Pagamento Antecipado',
      description:
        'Créditos antecipados persistidos por cliente com compensação agregada a partir do subledger.',
      category: 'financial',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', status: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'paymentId', label: 'Pagamento', type: 'string' },
        { key: 'ownerName', label: 'Tutor', type: 'string' },
        { key: 'documentId', label: 'Documento', type: 'string' },
        { key: 'issuedAt', label: 'Emitido em', type: 'datetime' },
        { key: 'originalAmount', label: 'Original', type: 'currency' },
        { key: 'compensatedAmount', label: 'Compensado', type: 'currency' },
        { key: 'balance', label: 'Saldo', type: 'currency' },
        { key: 'origin', label: 'Origem', type: 'string' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'notes', label: 'Observações', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    ...cancellationReportDefinitions(createdAt),
    {
      id: 'inventory-products',
      accountId: null,
      title: 'Relatório de Produtos',
      description:
        'Produtos persistidos no estoque com saldo atual, mínimo, custo unitário e datas de cadastro/atualização.',
      category: 'inventory',
      requiredPermission: 'inventory.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'sku', label: 'Código', type: 'string' },
        { key: 'name', label: 'Produto', type: 'string' },
        { key: 'unit', label: 'Unidade', type: 'string' },
        { key: 'onHandQuantity', label: 'Saldo', type: 'number' },
        { key: 'reorderLevel', label: 'Mínimo', type: 'number' },
        { key: 'unitCostAmount', label: 'Custo unitário', type: 'currency' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' },
        { key: 'updatedAt', label: 'Atualização', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'inventory-invoices',
      accountId: null,
      title: 'Entradas de compras com referência de NF',
      description:
        'Compras de estoque persistidas com referência de NF informada, fornecedor e ciclo de recebimento; não é um livro fiscal.',
      category: 'inventory',
      requiredPermission: 'inventory.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        search: 'string',
        status: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'purchaseId', label: 'Compra', type: 'string' },
        { key: 'invoiceNumber', label: 'Referência NF', type: 'string' },
        { key: 'supplierName', label: 'Fornecedor informado', type: 'string' },
        { key: 'status', label: 'Status da compra', type: 'status' },
        { key: 'totalAmount', label: 'Valor comprado', type: 'currency' },
        { key: 'receivedAmount', label: 'Valor recebido', type: 'currency' },
        { key: 'payableId', label: 'Conta a pagar', type: 'string' },
        { key: 'createdByUserId', label: 'Criado por', type: 'string' },
        { key: 'approvedByUserId', label: 'Aprovado por', type: 'string' },
        { key: 'createdAt', label: 'Criado em', type: 'datetime' },
        { key: 'updatedAt', label: 'Atualizado em', type: 'datetime' },
        { key: 'receivedAt', label: 'Recebido em', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'inventory-stock',
      accountId: null,
      title: 'Estoque',
      description:
        'Posição atual do estoque persistido com saldo, custo corrente, valor operacional e sinal de reposição.',
      category: 'inventory',
      requiredPermission: 'inventory.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'sku', label: 'Código', type: 'string' },
        { key: 'name', label: 'Produto', type: 'string' },
        { key: 'unit', label: 'Unidade', type: 'string' },
        { key: 'onHandQuantity', label: 'Saldo', type: 'number' },
        { key: 'reorderLevel', label: 'Mínimo', type: 'number' },
        { key: 'unitCostAmount', label: 'Custo unitário', type: 'currency' },
        { key: 'stockValue', label: 'Valor estoque', type: 'currency' },
        { key: 'reorderStatus', label: 'Situação de reposição', type: 'status' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' },
        { key: 'updatedAt', label: 'Atualização', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'inventory-movements',
      accountId: null,
      title: 'Movimentações no Estoque',
      description:
        'Ledger persistido de movimentações de estoque com saldo antes/depois, custo e referência operacional.',
      category: 'inventory',
      requiredPermission: 'inventory.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { search: 'string', dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'movementId', label: 'Movimento', type: 'string' },
        { key: 'occurredAt', label: 'Data', type: 'datetime' },
        { key: 'movementType', label: 'Tipo', type: 'status' },
        { key: 'sku', label: 'Código', type: 'string' },
        { key: 'name', label: 'Produto', type: 'string' },
        { key: 'unit', label: 'Unidade', type: 'string' },
        { key: 'quantityDelta', label: 'Variação', type: 'number' },
        { key: 'balanceBefore', label: 'Saldo anterior', type: 'number' },
        { key: 'balanceAfter', label: 'Saldo posterior', type: 'number' },
        { key: 'unitCostAmount', label: 'Custo unitário', type: 'currency' },
        { key: 'reason', label: 'Motivo', type: 'string' },
        { key: 'reference', label: 'Referência', type: 'string' },
        { key: 'recordedByUserId', label: 'Usuário', type: 'string' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'registration-owners',
      accountId: null,
      title: 'Clientes',
      description:
        'Cadastro persistido de clientes com contato principal, responsabilidade financeira e situação.',
      category: 'registrations',
      requiredPermission: 'owners.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'documentId', label: 'Documento', type: 'string' },
        { key: 'fullName', label: 'Cliente', type: 'string' },
        { key: 'primaryContact', label: 'Contato principal', type: 'string' },
        { key: 'city', label: 'Cidade', type: 'string' },
        { key: 'financialResponsible', label: 'Responsável financeiro', type: 'status' },
        { key: 'status', label: 'Situação', type: 'status' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'registration-patients',
      accountId: null,
      title: 'Animais',
      description:
        'Cadastro persistido de animais com identificação, espécie, situação e data de cadastro.',
      category: 'registrations',
      requiredPermission: 'patients.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'code', label: 'Código', type: 'string' },
        { key: 'name', label: 'Animal', type: 'string' },
        { key: 'species', label: 'Espécie', type: 'string' },
        { key: 'breed', label: 'Raça', type: 'string' },
        { key: 'sex', label: 'Sexo', type: 'string' },
        { key: 'microchip', label: 'Microchip', type: 'string' },
        { key: 'status', label: 'Situação', type: 'status' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'registration-services',
      accountId: null,
      title: 'Serviços',
      description: 'Cadastro persistido de serviços com código, descrição, preço base e situação.',
      category: 'registrations',
      requiredPermission: 'service.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: { dateFrom: 'date', dateTo: 'date' },
      columns: [
        { key: 'code', label: 'Código', type: 'string' },
        { key: 'name', label: 'Serviço', type: 'string' },
        { key: 'description', label: 'Descrição', type: 'string' },
        { key: 'basePrice', label: 'Preço base', type: 'currency' },
        { key: 'status', label: 'Situação', type: 'status' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'registration-suppliers',
      accountId: null,
      title: 'Fornecedores e Despesas',
      description:
        'Catálogo persistido de fornecedores e despesas com categoria, centro de custo e descrição.',
      category: 'registrations',
      requiredPermission: 'billing.read',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf'],
      filterSchema: {
        search: 'string',
        category: 'string',
        costCenterCode: 'string',
        dateFrom: 'date',
        dateTo: 'date'
      },
      columns: [
        { key: 'code', label: 'Código', type: 'string' },
        { key: 'name', label: 'Nome', type: 'string' },
        { key: 'kind', label: 'Tipo', type: 'string' },
        { key: 'category', label: 'Categoria', type: 'string' },
        { key: 'costCenterCode', label: 'Código do centro de custo', type: 'string' },
        { key: 'costCenterName', label: 'Nome do centro de custo', type: 'string' },
        { key: 'description', label: 'Descrição', type: 'string' },
        { key: 'createdAt', label: 'Cadastro', type: 'datetime' },
        { key: 'updatedAt', label: 'Atualização', type: 'datetime' }
      ],
      createdAt,
      updatedAt: createdAt
    }
  ];
}

function isReportDefinitionList(
  value: ReportsServiceOptions | readonly ReportDefinition[] | undefined
): value is readonly ReportDefinition[] {
  return Array.isArray(value);
}

export class ReportsService {
  readonly #repository?: ReportRepository;
  readonly #deliveryProvider?: ReportDeliveryProvider;
  readonly #definitions = new Map<string, ReportDefinition>();
  readonly #executions = new Map<string, ReportExecutionDetail>();
  readonly #exports = new Map<string, ReportExportSummary>();
  readonly #schedules = new Map<string, ReportScheduleSummary>();
  readonly #deliveries = new Map<string, ReportScheduleDeliverySummary>();
  readonly #deliveryClaims = new Map<
    string,
    { readonly claimToken: string; readonly claimUntil: string; readonly claimWorkerId: string }
  >();
  readonly #retryOperations = new Map<string, Promise<ReportScheduleDeliverySummary>>();
  readonly #scheduleClaims = new Map<
    string,
    { readonly claimToken: string; readonly claimWorkerId: string; readonly claimUntil: number }
  >();

  public constructor(options?: ReportsServiceOptions | readonly ReportDefinition[]) {
    if (isReportDefinitionList(options)) {
      for (const definition of options) {
        this.#definitions.set(definition.id, definition);
      }
      return;
    }

    this.#repository = options?.repository;
    this.#deliveryProvider = options?.deliveryProvider;
    const definitions = seedDefinitions();
    for (const definition of definitions) {
      this.#definitions.set(definition.id, definition);
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [executions, exports, schedules, deliveries] = await Promise.all([
      this.#repository.findExecutions(accountId),
      this.#repository.findExports(accountId),
      this.#repository.findSchedules(accountId),
      this.#repository.findDeliveries(accountId)
    ]);
    for (const execution of executions) this.#executions.set(execution.id, execution);
    for (const exported of exports) this.#exports.set(exported.id, exported);
    for (const schedule of schedules) this.#schedules.set(schedule.id, schedule);
    for (const delivery of deliveries) this.#deliveries.set(delivery.id, delivery);
  }

  public listDefinitions(accountId: AccountId): readonly ReportDefinition[] {
    return [...this.#definitions.values()]
      .filter((definition) => definition.accountId === null || definition.accountId === accountId)
      .sort(
        (left, right) =>
          left.category.localeCompare(right.category) || left.title.localeCompare(right.title)
      );
  }

  public getDefinition(accountId: AccountId, reportId: string): ReportDefinition {
    const definition = this.#definitions.get(reportId);
    if (!definition || (definition.accountId !== null && definition.accountId !== accountId)) {
      throw new NotFoundError('Report definition not found', { reportId });
    }
    return definition;
  }

  public async execute(
    accountId: AccountId,
    requestedByUserId: UserId,
    input: ExecuteReportInput
  ): Promise<ReportExecutionDetail> {
    return this.executeReport(accountId, requestedByUserId, input);
  }

  public async executeScheduled(
    accountId: AccountId,
    requestedByUserId: UserId,
    input: ExecuteReportInput,
    scheduleClaim: ReportScheduleClaimCapability
  ): Promise<ReportExecutionDetail> {
    const { schedule, claimToken } = this.requireScheduleClaim(accountId, scheduleClaim);
    if (schedule.reportId !== input.reportId) {
      throw new ValidationError('Scheduled report definition does not match its schedule', {
        scheduleId: schedule.id,
        reportId: input.reportId
      });
    }
    return this.executeReport(accountId, requestedByUserId, input, {
      scheduleId: schedule.id,
      claimToken
    });
  }

  private async executeReport(
    accountId: AccountId,
    requestedByUserId: UserId,
    input: ExecuteReportInput,
    scheduleClaim?: ReportScheduleClaimCapability
  ): Promise<ReportExecutionDetail> {
    const definition = this.getDefinition(accountId, input.reportId);
    const filters = normalizeFilters(input.filters ?? {});
    const rows = input.rows.map((row) => normalizeRow(definition, row));
    const generatedAt = nowIso();
    const execution: ReportExecutionDetail = {
      id: input.executionId?.trim() || createCorrelationId('rep_exec'),
      accountId,
      reportId: definition.id,
      requestedByUserId,
      status: 'completed',
      filters,
      rowCount: rows.length,
      generatedAt,
      expiresAt: addDaysIso(generatedAt, 7),
      columns: definition.columns,
      rows
    };
    await this.persistExecution(execution, scheduleClaim);
    return execution;
  }

  private async persistExecution(
    execution: ReportExecutionDetail,
    scheduleClaim?: ReportScheduleClaimCapability
  ): Promise<void> {
    if (scheduleClaim) {
      if (this.#repository) {
        if (!this.#repository.saveExecutionForScheduleClaim) {
          throw new ValidationError(
            'Scheduled report execution requires a fenced repository implementation'
          );
        }
        const saved = await this.#repository.saveExecutionForScheduleClaim(
          execution,
          scheduleClaim.scheduleId,
          scheduleClaim.claimToken
        );
        if (!saved) throw new ReportScheduleLeaseLostError(scheduleClaim.scheduleId);
      } else {
        this.assertScheduleClaim(scheduleClaim.scheduleId, scheduleClaim.claimToken);
      }
    } else {
      await this.#repository?.saveExecution(execution);
    }
    this.#executions.set(execution.id, execution);
  }

  public listExecutions(accountId: AccountId): readonly ReportExecutionSummary[] {
    return [...this.#executions.values()]
      .filter((execution) => execution.accountId === accountId)
      .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
      .map(({ columns: _columns, rows: _rows, ...summary }) => summary);
  }

  public getExecution(accountId: AccountId, executionId: string): ReportExecutionDetail {
    const execution = this.#executions.get(executionId);
    if (!execution || execution.accountId !== accountId) {
      throw new NotFoundError('Report execution not found', { executionId });
    }
    return execution;
  }

  public async exportExecution(
    accountId: AccountId,
    exportedByUserId: UserId,
    executionId: string,
    format: ReportFormat
  ): Promise<ReportExportSummary> {
    return this.exportReport(accountId, exportedByUserId, executionId, format);
  }

  public async exportScheduled(
    accountId: AccountId,
    exportedByUserId: UserId,
    executionId: string,
    format: ReportFormat,
    scheduleClaim: ReportScheduleClaimCapability
  ): Promise<ReportExportSummary> {
    const { schedule, claimToken } = this.requireScheduleClaim(accountId, scheduleClaim);
    const execution = this.getExecution(accountId, executionId);
    if (execution.reportId !== schedule.reportId || format !== schedule.format) {
      throw new ValidationError('Scheduled report export does not match its schedule', {
        scheduleId: schedule.id,
        executionId,
        format
      });
    }
    return this.exportReport(accountId, exportedByUserId, executionId, format, {
      scheduleId: schedule.id,
      claimToken
    });
  }

  private async exportReport(
    accountId: AccountId,
    exportedByUserId: UserId,
    executionId: string,
    format: ReportFormat,
    scheduleClaim?: ReportScheduleClaimCapability
  ): Promise<ReportExportSummary> {
    const execution = this.getExecution(accountId, executionId);
    const definition = this.getDefinition(accountId, execution.reportId);
    if (!definition.supportedFormats.includes(format)) {
      throw new ValidationError('Report format is not supported', {
        reportId: definition.id,
        format
      });
    }
    const exportId = stableReportId('rep_exp', accountId, executionId, format);
    // Interactive retries reuse the persisted artifact. Scheduled takeover is
    // different: its fenced claim explicitly refreshes the deterministic
    // artifact after a new execution snapshot has been committed.
    const existing = this.#exports.get(exportId);
    if (!scheduleClaim && existing && existing.accountId === accountId) return existing;
    const exportedAt = nowIso();
    const filename = `${definition.id}-${execution.id}.${format}`;
    const artifact = renderReportExport(execution, format);
    const result: ReportExportSummary = {
      id: exportId,
      accountId,
      executionId,
      format,
      filename,
      contentType: artifact.contentType,
      contentEncoding: artifact.contentEncoding,
      content: artifact.content,
      exportedByUserId,
      exportedAt
    };
    await this.persistExport(result, scheduleClaim);
    return result;
  }

  private async persistExport(
    exported: ReportExportSummary,
    scheduleClaim?: ReportScheduleClaimCapability
  ): Promise<void> {
    if (scheduleClaim) {
      if (this.#repository) {
        if (!this.#repository.saveExportForScheduleClaim) {
          throw new ValidationError(
            'Scheduled report export requires a fenced repository implementation'
          );
        }
        const saved = await this.#repository.saveExportForScheduleClaim(
          exported,
          scheduleClaim.scheduleId,
          scheduleClaim.claimToken
        );
        if (!saved) throw new ReportScheduleLeaseLostError(scheduleClaim.scheduleId);
      } else {
        this.assertScheduleClaim(scheduleClaim.scheduleId, scheduleClaim.claimToken);
      }
    } else {
      await this.#repository?.saveExport(exported);
    }
    this.#exports.set(exported.id, exported);
  }

  public getExport(accountId: AccountId, exportId: string): ReportExportSummary {
    const exported = this.#exports.get(exportId);
    if (!exported || exported.accountId !== accountId) {
      throw new NotFoundError('Report export not found', { exportId });
    }
    return exported;
  }

  public getExportForExecution(
    accountId: AccountId,
    executionId: string,
    format: ReportFormat
  ): ReportExportSummary {
    this.getExecution(accountId, executionId);
    return this.getExport(accountId, stableReportId('rep_exp', accountId, executionId, format));
  }

  public async createSchedule(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateReportScheduleInput
  ): Promise<ReportScheduleSummary> {
    const definition = this.getDefinition(accountId, input.reportId);
    const frequency = normalizeFrequency(input.frequency);
    const format = input.format ?? 'csv';
    if (!definition.supportedFormats.includes(format)) {
      throw new ValidationError('Report format is not supported', {
        reportId: definition.id,
        format
      });
    }
    const now = nowIso();
    const schedule: ReportScheduleSummary = {
      id: createCorrelationId('rep_sched'),
      accountId,
      reportId: definition.id,
      name: requireTrimmed(input.name, 'name'),
      frequency,
      format,
      filters: normalizeFilters(input.filters ?? {}),
      recipients: normalizeRecipients(input.recipients ?? []),
      isActive: input.isActive ?? true,
      nextRunAt: nextRunAt(now, frequency),
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId,
      createdAt: now,
      updatedAt: now
    };
    this.#schedules.set(schedule.id, schedule);
    await this.#repository?.saveSchedule(schedule);
    return schedule;
  }

  public listSchedules(accountId: AccountId): readonly ReportScheduleSummary[] {
    return [...this.#schedules.values()]
      .filter((schedule) => schedule.accountId === accountId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  public listDueSchedules(accountId: AccountId, asOf = nowIso()): readonly ReportScheduleSummary[] {
    const asOfTime = new Date(asOf).getTime();
    if (Number.isNaN(asOfTime)) {
      throw new ValidationError('asOf must be a valid ISO date', { asOf });
    }

    return this.listSchedules(accountId)
      .filter((schedule) => schedule.isActive && new Date(schedule.nextRunAt).getTime() <= asOfTime)
      .sort((left, right) => left.nextRunAt.localeCompare(right.nextRunAt));
  }

  /**
   * Compatibility view for callers that only need schedule summaries.
   * Callers that finalize a claim must use claimDueSchedulesWithLease to retain the token.
   */
  public async claimDueSchedules(
    accountId: AccountId,
    asOf = nowIso(),
    workerId = 'reports-worker',
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleSummary[]> {
    if (this.#repository?.claimDueSchedules && !this.#repository.claimDueSchedulesWithLease) {
      const claimed = await this.#repository.claimDueSchedules(accountId, asOf, workerId, leaseMs);
      for (const schedule of claimed) this.#schedules.set(schedule.id, schedule);
      return claimed;
    }
    const claimed = await this.claimDueSchedulesWithLease(accountId, asOf, workerId, leaseMs);
    return claimed.map(({ schedule }) => schedule);
  }

  public async claimDueSchedulesWithLease(
    accountId: AccountId,
    asOf = nowIso(),
    workerId = 'reports-worker',
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleClaim[]> {
    const asOfTime = new Date(asOf).getTime();
    if (Number.isNaN(asOfTime)) {
      throw new ValidationError('asOf must be a valid ISO date', { asOf });
    }
    if (!workerId.trim() || !Number.isFinite(leaseMs) || leaseMs <= 0) {
      throw new ValidationError('workerId and leaseMs are required for report schedule claims');
    }

    if (this.#repository) {
      if (!this.#repository.claimDueSchedulesWithLease || !this.#repository.saveClaimedSchedule) {
        throw new ValidationError(
          'Report schedule claims require a fenced repository implementation'
        );
      }
      const claimed = await this.#repository.claimDueSchedulesWithLease(
        accountId,
        asOf,
        workerId.trim(),
        leaseMs
      );
      for (const claim of claimed) {
        this.#schedules.set(claim.schedule.id, claim.schedule);
        this.#scheduleClaims.set(claim.schedule.id, {
          claimToken: claim.claimToken,
          claimUntil: new Date(claim.claimUntil).getTime(),
          claimWorkerId: claim.claimWorkerId
        });
      }
      return claimed;
    }

    const claimStartedAt = Date.now();
    const claimUntil = new Date(claimStartedAt + leaseMs).toISOString();
    const claimed: ReportScheduleClaim[] = [];
    for (const schedule of this.listDueSchedules(accountId, asOf)) {
      const existing = this.#scheduleClaims.get(schedule.id);
      if (existing && existing.claimUntil > claimStartedAt) continue;
      const claim = {
        schedule,
        claimToken: createCorrelationId('rep_sched_claim'),
        claimUntil,
        claimWorkerId: workerId.trim()
      };
      this.#scheduleClaims.set(schedule.id, {
        claimToken: claim.claimToken,
        claimUntil: claimStartedAt + leaseMs,
        claimWorkerId: claim.claimWorkerId
      });
      claimed.push(claim);
    }
    return claimed;
  }

  public async claimFailedScheduleDeliveries(
    accountId: AccountId,
    workerId: string,
    asOf = nowIso(),
    limit = 25,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleDeliveryClaim[]> {
    const asOfTime = new Date(asOf).getTime();
    if (Number.isNaN(asOfTime)) {
      throw new ValidationError('asOf must be a valid ISO date', { asOf });
    }
    if (!workerId.trim() || !Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('workerId and limit are required for report delivery claims');
    }
    if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
      throw new ValidationError('leaseMs is required for report delivery claims');
    }

    const normalizedLimit = Math.floor(limit);
    const normalizedLeaseMs = Math.floor(leaseMs);
    if (this.#repository?.claimFailedDeliveries) {
      const claimed = await this.#repository.claimFailedDeliveries(
        accountId,
        asOf,
        workerId.trim(),
        normalizedLimit,
        normalizedLeaseMs
      );
      for (const claim of claimed) {
        this.#deliveries.set(claim.delivery.id, claim.delivery);
        this.#deliveryClaims.set(claim.delivery.id, {
          claimToken: claim.claimToken,
          claimUntil: claim.claimUntil,
          claimWorkerId: claim.claimWorkerId
        });
      }
      return claimed;
    }

    const claimUntil = new Date(asOfTime + normalizedLeaseMs).toISOString();
    const claimed: ReportScheduleDeliveryClaim[] = [];
    for (const delivery of this.listScheduleDeliveries(accountId)) {
      if (delivery.status !== 'failed' || claimed.length >= normalizedLimit) continue;
      const existing = this.#deliveryClaims.get(delivery.id);
      if (existing && new Date(existing.claimUntil).getTime() > asOfTime) continue;
      const claim = {
        delivery,
        claimToken: createCorrelationId('rep_deliv_claim'),
        claimUntil,
        claimWorkerId: workerId.trim()
      };
      this.#deliveryClaims.set(delivery.id, {
        claimToken: claim.claimToken,
        claimUntil: claim.claimUntil,
        claimWorkerId: claim.claimWorkerId
      });
      claimed.push(claim);
    }
    return claimed;
  }

  public async recordScheduleExecution(
    accountId: AccountId,
    scheduleId: string,
    input: RecordReportScheduleExecutionInput
  ): Promise<ReportScheduleSummary> {
    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new NotFoundError('Report schedule not found', { scheduleId });
    }
    const claimToken = typeof input.claimToken === 'string' ? input.claimToken.trim() : '';
    if (!claimToken) throw new ReportScheduleLeaseLostError(scheduleId);

    const ranAt = input.ranAt ?? nowIso();
    const updated: ReportScheduleSummary = {
      ...schedule,
      nextRunAt: nextRunAt(schedule.nextRunAt, schedule.frequency, schedule.createdAt),
      lastRunAt: ranAt,
      lastExecutionId: input.executionId ?? schedule.lastExecutionId,
      lastError: input.error ?? null,
      updatedAt: ranAt
    };

    if (this.#repository) {
      if (!this.#repository.saveClaimedSchedule) {
        throw new ValidationError(
          'Report schedule execution requires a fenced repository implementation'
        );
      }
      const saved = await this.#repository.saveClaimedSchedule(updated, claimToken);
      if (!saved) throw new ReportScheduleLeaseLostError(scheduleId);
    } else {
      this.assertScheduleClaim(scheduleId, claimToken);
    }

    this.#schedules.set(updated.id, updated);
    this.#scheduleClaims.delete(updated.id);
    return updated;
  }

  public async recordScheduleDeliveries(
    accountId: AccountId,
    scheduleId: string,
    input: RecordReportScheduleDeliveriesInput
  ): Promise<readonly ReportScheduleDeliverySummary[]> {
    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new NotFoundError('Report schedule not found', { scheduleId });
    }
    const scheduleClaimToken =
      typeof input.scheduleClaimToken === 'string' ? input.scheduleClaimToken.trim() : '';
    if (input.scheduleClaimToken !== undefined && !scheduleClaimToken) {
      throw new ReportScheduleLeaseLostError(scheduleId);
    }
    if (scheduleClaimToken) this.assertScheduleClaim(scheduleId, scheduleClaimToken);

    const deliveredAt = input.deliveredAt ?? nowIso();
    const recipients = normalizeRecipients(input.recipients);
    const deliveryExecutionKey = `${input.executionId ?? 'none'}:${deliveredAt}`;
    const deliveries = recipients.map((recipient) => ({
      id: stableReportId('rep_deliv', accountId, schedule.id, deliveryExecutionKey, recipient),
      accountId,
      scheduleId: schedule.id,
      executionId: input.executionId ?? null,
      exportId: input.exportId ?? null,
      recipient,
      status: normalizeDeliveryStatus(input.status),
      format: parseFormat(input.format),
      deliveredAt,
      error: input.error ?? null,
      createdAt: deliveredAt
    }));

    for (const delivery of deliveries) {
      await this.persistDelivery(delivery, undefined, scheduleClaimToken || undefined);
    }

    return deliveries;
  }

  public listScheduleDeliveries(
    accountId: AccountId,
    scheduleId?: string
  ): readonly ReportScheduleDeliverySummary[] {
    return [...this.#deliveries.values()]
      .filter(
        (delivery) =>
          delivery.accountId === accountId && (!scheduleId || delivery.scheduleId === scheduleId)
      )
      .sort((left, right) => right.deliveredAt.localeCompare(left.deliveredAt));
  }

  public listScheduleDeliveryAlerts(
    accountId: AccountId,
    scheduleId?: string,
    minimumFailures = 2
  ): readonly ReportScheduleDeliveryAlertSummary[] {
    const threshold = Math.max(2, Math.floor(minimumFailures));
    const byRecipient = new Map<
      string,
      {
        accountId: AccountId;
        scheduleId: string;
        reportId: string;
        recipient: string;
        failureCount: number;
        lastFailureAt: string;
        lastError: string;
      }
    >();

    for (const delivery of this.listScheduleDeliveries(accountId, scheduleId)) {
      if (delivery.status !== 'failed') continue;
      const schedule = this.#schedules.get(delivery.scheduleId);
      if (!schedule || schedule.accountId !== accountId) continue;

      const key = `${delivery.scheduleId}:${delivery.recipient}`;
      const current = byRecipient.get(key);
      if (!current) {
        byRecipient.set(key, {
          accountId,
          scheduleId: delivery.scheduleId,
          reportId: schedule.reportId,
          recipient: delivery.recipient,
          failureCount: 1,
          lastFailureAt: delivery.deliveredAt,
          lastError: delivery.error ?? 'Sem erro registrado'
        });
        continue;
      }

      const isMoreRecent = delivery.deliveredAt > current.lastFailureAt;
      byRecipient.set(key, {
        ...current,
        failureCount: current.failureCount + 1,
        lastFailureAt: isMoreRecent ? delivery.deliveredAt : current.lastFailureAt,
        lastError: isMoreRecent ? (delivery.error ?? 'Sem erro registrado') : current.lastError
      });
    }

    return [...byRecipient.values()]
      .filter((alert) => alert.failureCount >= threshold)
      .map((alert) => ({
        id: `${alert.scheduleId}:${alert.recipient}`,
        accountId: alert.accountId,
        scheduleId: alert.scheduleId,
        reportId: alert.reportId,
        recipient: alert.recipient,
        failureCount: alert.failureCount,
        lastFailureAt: alert.lastFailureAt,
        lastError: alert.lastError,
        severity: (alert.failureCount >= 2
          ? 'high'
          : 'medium') as ReportScheduleDeliveryAlertSummary['severity']
      }))
      .sort(
        (left, right) =>
          right.failureCount - left.failureCount ||
          right.lastFailureAt.localeCompare(left.lastFailureAt) ||
          left.recipient.localeCompare(right.recipient)
      );
  }

  public async deliverExport(
    accountId: AccountId,
    scheduleId: string,
    executionId: string,
    exported: ReportExportSummary,
    recipients: readonly string[],
    deliveredAt?: string,
    existingDeliveryId?: string,
    claimToken?: string,
    scheduleClaimToken?: string
  ): Promise<{
    readonly deliveries: readonly ReportScheduleDeliverySummary[];
    readonly failures: readonly { readonly recipient: string; readonly error: string }[];
  }> {
    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new NotFoundError('Report schedule not found', { scheduleId });
    }
    if (exported.accountId !== accountId || exported.executionId !== executionId) {
      throw new ValidationError('Report export does not belong to the scheduled execution', {
        scheduleId,
        executionId,
        exportId: exported.id
      });
    }
    const normalizedRecipients = normalizeRecipients(recipients);
    const existingDelivery = existingDeliveryId
      ? this.#deliveries.get(existingDeliveryId)
      : undefined;
    if (
      existingDeliveryId &&
      (!existingDelivery ||
        existingDelivery.accountId !== accountId ||
        existingDelivery.scheduleId !== scheduleId ||
        normalizedRecipients.length !== 1 ||
        existingDelivery.recipient !== normalizedRecipients[0])
    ) {
      throw new NotFoundError('Report schedule delivery not found', {
        deliveryId: existingDeliveryId
      });
    }
    const normalizedScheduleClaimToken =
      typeof scheduleClaimToken === 'string' ? scheduleClaimToken.trim() : '';
    if (scheduleClaimToken !== undefined && !normalizedScheduleClaimToken) {
      throw new ReportScheduleLeaseLostError(scheduleId);
    }
    if (claimToken && normalizedScheduleClaimToken) {
      throw new ValidationError('Report delivery cannot combine schedule and retry claim tokens');
    }
    if (claimToken) this.assertDeliveryClaim(existingDeliveryId ?? '', claimToken);
    if (normalizedScheduleClaimToken) {
      this.assertScheduleClaim(scheduleId, normalizedScheduleClaimToken);
    }

    const deliveries: ReportScheduleDeliverySummary[] = [];
    const failures: Array<{ readonly recipient: string; readonly error: string }> = [];
    for (const recipient of normalizedRecipients) {
      const attemptAt = deliveredAt ?? nowIso();
      const delivery = existingDelivery ?? {
        id: stableReportId('rep_deliv', accountId, schedule.id, executionId, recipient),
        accountId,
        scheduleId: schedule.id,
        executionId,
        exportId: exported.id,
        recipient,
        status: 'failed' as const,
        format: exported.format,
        deliveredAt: attemptAt,
        error: null,
        createdAt: attemptAt
      };
      if (!existingDelivery) {
        // Record the stable delivery identity before leaving the database
        // boundary. If the process dies while the provider request is in
        // flight, the next worker can discover and retry this row safely.
        await this.persistDelivery(delivery, undefined, normalizedScheduleClaimToken || undefined);
      }
      let providerFailed = false;
      let providerError: string | null = null;
      try {
        if (normalizedScheduleClaimToken) {
          this.assertScheduleClaim(scheduleId, normalizedScheduleClaimToken);
        }
        if (!this.#deliveryProvider) {
          throw new Error('No report delivery provider is configured');
        }
        await this.#deliveryProvider.deliver({
          accountId,
          scheduleId,
          executionId,
          deliveryId: delivery.id,
          idempotencyKey: delivery.id,
          recipient,
          exported
        });
      } catch (error) {
        providerFailed = true;
        providerError = error instanceof Error ? error.message : String(error);
      }

      if (providerFailed) {
        const failureMessage = providerError ?? 'Report delivery provider failed';
        const failed = {
          ...delivery,
          executionId,
          exportId: exported.id,
          status: 'failed' as const,
          format: exported.format,
          deliveredAt: attemptAt,
          error: failureMessage
        };
        await this.persistDelivery(failed, claimToken, normalizedScheduleClaimToken || undefined);
        deliveries.push(failed);
        failures.push({ recipient, error: failureMessage });
        continue;
      }

      const sent = {
        ...delivery,
        executionId,
        exportId: exported.id,
        status: 'sent' as const,
        format: exported.format,
        deliveredAt: attemptAt,
        error: null
      };
      await this.persistDelivery(sent, claimToken, normalizedScheduleClaimToken || undefined);
      deliveries.push(sent);
    }
    return { deliveries, failures };
  }

  public async retryScheduleDelivery(
    accountId: AccountId,
    retriedByUserId: UserId,
    scheduleId: string,
    deliveryId: string,
    claimToken?: string
  ): Promise<ReportScheduleDeliverySummary> {
    const operationKey = `${accountId}:${deliveryId}`;
    const inFlight = this.#retryOperations.get(operationKey);
    if (inFlight) return inFlight;

    const operation = this.retryScheduleDeliveryOnce(
      accountId,
      retriedByUserId,
      scheduleId,
      deliveryId,
      claimToken
    );
    this.#retryOperations.set(operationKey, operation);
    try {
      return await operation;
    } finally {
      if (this.#retryOperations.get(operationKey) === operation) {
        this.#retryOperations.delete(operationKey);
      }
    }
  }

  private async retryScheduleDeliveryOnce(
    accountId: AccountId,
    retriedByUserId: UserId,
    scheduleId: string,
    deliveryId: string,
    claimToken?: string
  ): Promise<ReportScheduleDeliverySummary> {
    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new NotFoundError('Report schedule not found', { scheduleId });
    }

    const delivery = this.#deliveries.get(deliveryId);
    if (!delivery || delivery.accountId !== accountId || delivery.scheduleId !== scheduleId) {
      throw new NotFoundError('Report schedule delivery not found', { deliveryId });
    }
    if (delivery.status !== 'failed') {
      throw new ValidationError('Only failed report deliveries can be retried', {
        deliveryId,
        status: delivery.status
      });
    }
    if (claimToken) this.assertDeliveryClaim(delivery.id, claimToken);
    if (!delivery.executionId) {
      throw new ValidationError('Report delivery retry requires an execution id', { deliveryId });
    }

    const exported = delivery.exportId
      ? this.getExport(accountId, delivery.exportId)
      : await this.exportExecution(
          accountId,
          retriedByUserId,
          delivery.executionId,
          delivery.format
        );
    if (exported.format !== delivery.format) {
      throw new ValidationError(
        'Report delivery artifact format does not match the failed delivery',
        {
          deliveryId,
          exportId: exported.id,
          expectedFormat: delivery.format,
          actualFormat: exported.format
        }
      );
    }
    const retry = await this.deliverExport(
      accountId,
      scheduleId,
      delivery.executionId,
      exported,
      [delivery.recipient],
      undefined,
      delivery.id,
      claimToken
    );
    const retried = retry.deliveries.at(-1);
    if (!retried || retried.status !== 'sent') {
      throw new ValidationError('Report delivery retry did not create a delivery record', {
        deliveryId
      });
    }
    return retried;
  }

  private async persistDelivery(
    delivery: ReportScheduleDeliverySummary,
    claimToken?: string,
    scheduleClaimToken?: string
  ): Promise<void> {
    if (claimToken && scheduleClaimToken) {
      throw new ValidationError('Report delivery cannot combine schedule and retry claim tokens');
    }
    if (scheduleClaimToken) {
      if (this.#repository) {
        if (!this.#repository.saveDeliveryForScheduleClaim) {
          throw new ValidationError(
            'Scheduled report delivery requires a fenced repository implementation'
          );
        }
        const saved = await this.#repository.saveDeliveryForScheduleClaim(
          delivery,
          scheduleClaimToken
        );
        if (!saved) throw new ReportScheduleLeaseLostError(delivery.scheduleId);
      } else {
        this.assertScheduleClaim(delivery.scheduleId, scheduleClaimToken);
      }
    } else if (claimToken) {
      if (this.#repository?.saveClaimedDelivery) {
        const saved = await this.#repository.saveClaimedDelivery(delivery, claimToken);
        if (!saved) {
          throw new ValidationError('Report delivery retry lease was lost', {
            deliveryId: delivery.id
          });
        }
      } else {
        this.assertDeliveryClaim(delivery.id, claimToken);
      }
      this.#deliveryClaims.delete(delivery.id);
    } else {
      await this.#repository?.saveDelivery(delivery);
    }
    this.#deliveries.set(delivery.id, delivery);
  }

  private assertDeliveryClaim(deliveryId: string, claimToken: string): void {
    const claim = this.#deliveryClaims.get(deliveryId);
    if (
      !claim ||
      claim.claimToken !== claimToken ||
      new Date(claim.claimUntil).getTime() <= Date.now()
    ) {
      throw new ValidationError('Report delivery retry lease was lost', { deliveryId });
    }
  }

  private requireScheduleClaim(
    accountId: AccountId,
    capability: ReportScheduleClaimCapability
  ): { readonly schedule: ReportScheduleSummary; readonly claimToken: string } {
    const scheduleId =
      typeof capability?.scheduleId === 'string' ? capability.scheduleId.trim() : '';
    const claimToken =
      typeof capability?.claimToken === 'string' ? capability.claimToken.trim() : '';
    if (!scheduleId || !claimToken) throw new ReportScheduleLeaseLostError(scheduleId);

    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new ReportScheduleLeaseLostError(scheduleId);
    }
    this.assertScheduleClaim(schedule.id, claimToken);
    return { schedule, claimToken };
  }

  private assertScheduleClaim(scheduleId: string, claimToken: string): void {
    const claim = this.#scheduleClaims.get(scheduleId);
    if (!claim || claim.claimToken !== claimToken || claim.claimUntil <= Date.now()) {
      throw new ReportScheduleLeaseLostError(scheduleId);
    }
  }

  public async setScheduleActive(
    accountId: AccountId,
    scheduleId: string,
    isActive: boolean
  ): Promise<ReportScheduleSummary> {
    const schedule = this.#schedules.get(scheduleId);
    if (!schedule || schedule.accountId !== accountId) {
      throw new NotFoundError('Report schedule not found', { scheduleId });
    }

    const updated: ReportScheduleSummary = {
      ...schedule,
      isActive,
      updatedAt: nowIso()
    };
    this.#schedules.set(updated.id, updated);
    this.#scheduleClaims.delete(updated.id);
    await this.#repository?.saveSchedule(updated);
    return updated;
  }
}


function stableReportId(prefix: string, ...parts: readonly unknown[]): string {
  const digest = createHash('sha256')
    .update(parts.map((part) => String(part)).join('\u001f'))
    .digest('hex')
    .slice(0, 40);
  return `${prefix}_${digest}`;
}

function normalizeRow(
  definition: ReportDefinition,
  row: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const column of definition.columns) {
    normalized[column.key] = row[column.key] ?? null;
  }
  return normalized;
}

function normalizeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function normalizeFrequency(value: ReportScheduleFrequency): ReportScheduleFrequency {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
  throw new ValidationError('frequency must be daily, weekly or monthly', { value });
}

function normalizeDeliveryStatus(
  value: ReportScheduleDeliveryStatus
): ReportScheduleDeliveryStatus {
  if (value === 'sent' || value === 'failed') return value;
  throw new ValidationError('delivery status must be sent or failed', { value });
}

function parseFormat(value: ReportFormat): ReportFormat {
  if (value === 'json' || value === 'csv' || value === 'xlsx' || value === 'pdf') return value;
  throw new ValidationError('format must be json, csv, xlsx or pdf', { value });
}

function normalizeRecipients(recipients: readonly string[]): readonly string[] {
  return recipients.map((recipient) => recipient.trim()).filter(Boolean);
}

function requireTrimmed(value: string | null | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ValidationError(`${field} is required`, { field });
  return normalized;
}

function addDaysIso(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
