import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

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
  readonly category: 'executive' | 'financial' | 'commercial' | 'clinical' | 'inventory' | 'staff';
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
}

export interface ReportRepository {
  saveExecution(execution: ReportExecutionDetail): Promise<void>;
  saveExport(exported: ReportExportSummary): Promise<void>;
  saveSchedule(schedule: ReportScheduleSummary): Promise<void>;
  saveDelivery(delivery: ReportScheduleDeliverySummary): Promise<void>;
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
    { readonly workerId: string; readonly claimUntil: number }
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
    this.#executions.set(execution.id, execution);
    await this.#repository?.saveExecution(execution);
    return execution;
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
    const execution = this.getExecution(accountId, executionId);
    const definition = this.getDefinition(accountId, execution.reportId);
    if (!definition.supportedFormats.includes(format)) {
      throw new ValidationError('Report format is not supported', {
        reportId: definition.id,
        format
      });
    }
    const exportedAt = nowIso();
    const filename = `${definition.id}-${execution.id}.${format}`;
    const artifact = renderExport(execution, format);
    const result: ReportExportSummary = {
      id: stableReportId('rep_exp', accountId, executionId, format),
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
    this.#exports.set(result.id, result);
    await this.#repository?.saveExport(result);
    return result;
  }

  public getExport(accountId: AccountId, exportId: string): ReportExportSummary {
    const exported = this.#exports.get(exportId);
    if (!exported || exported.accountId !== accountId) {
      throw new NotFoundError('Report export not found', { exportId });
    }
    return exported;
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

  public async claimDueSchedules(
    accountId: AccountId,
    asOf = nowIso(),
    workerId = 'reports-worker',
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleSummary[]> {
    const asOfTime = new Date(asOf).getTime();
    if (Number.isNaN(asOfTime)) {
      throw new ValidationError('asOf must be a valid ISO date', { asOf });
    }
    if (!workerId.trim() || !Number.isFinite(leaseMs) || leaseMs <= 0) {
      throw new ValidationError('workerId and leaseMs are required for report schedule claims');
    }

    if (this.#repository?.claimDueSchedules) {
      const claimed = await this.#repository.claimDueSchedules(
        accountId,
        asOf,
        workerId.trim(),
        leaseMs
      );
      for (const schedule of claimed) this.#schedules.set(schedule.id, schedule);
      return claimed;
    }

    const claimUntil = asOfTime + leaseMs;
    const claimed: ReportScheduleSummary[] = [];
    for (const schedule of this.listDueSchedules(accountId, asOf)) {
      const existing = this.#scheduleClaims.get(schedule.id);
      if (existing && existing.claimUntil > asOfTime) continue;
      this.#scheduleClaims.set(schedule.id, { workerId: workerId.trim(), claimUntil });
      claimed.push(schedule);
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

    const ranAt = input.ranAt ?? nowIso();
    const updated: ReportScheduleSummary = {
      ...schedule,
      nextRunAt: nextRunAt(schedule.nextRunAt, schedule.frequency),
      lastRunAt: ranAt,
      lastExecutionId: input.executionId ?? schedule.lastExecutionId,
      lastError: input.error ?? null,
      updatedAt: ranAt
    };
    this.#schedules.set(updated.id, updated);
    this.#scheduleClaims.delete(updated.id);
    await this.#repository?.saveSchedule(updated);
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
      await this.persistDelivery(delivery);
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
    claimToken?: string
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
    if (claimToken) this.assertDeliveryClaim(existingDeliveryId ?? '', claimToken);

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
        await this.persistDelivery(delivery);
      }
      let providerFailed = false;
      let providerError: string | null = null;
      try {
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
        await this.persistDelivery(failed, claimToken);
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
      await this.persistDelivery(sent, claimToken);
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
    claimToken?: string
  ): Promise<void> {
    if (claimToken) {
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

/* v8 ignore start -- SQL repository adapter covered by integration tests. */
export class DatabaseReportRepository implements ReportRepository {
  async saveExecution(execution: ReportExecutionDetail): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_executions (
          id, account_id, report_id, requested_by_user_id, status, filters, row_count,
          generated_at, expires_at, columns, rows
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11::jsonb)
        ON CONFLICT (account_id, id) DO NOTHING`,
        executionParams(execution)
      );
    });
  }

  async saveExport(exported: ReportExportSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_exports (
          id, account_id, execution_id, format, filename, content_type, content,
          content_encoding, exported_by_user_id, exported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $8, $7, $9, $10)
        ON CONFLICT (account_id, id) DO NOTHING`,
        exportParams(exported)
      );
    });
  }

  async saveSchedule(schedule: ReportScheduleSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_schedules (
          id, account_id, report_id, name, frequency, format, filters, recipients,
          is_active, next_run_at, last_run_at, last_execution_id, last_error,
          created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          frequency = EXCLUDED.frequency,
          format = EXCLUDED.format,
          filters = EXCLUDED.filters,
          recipients = EXCLUDED.recipients,
          is_active = EXCLUDED.is_active,
          next_run_at = EXCLUDED.next_run_at,
          last_run_at = EXCLUDED.last_run_at,
          last_execution_id = EXCLUDED.last_execution_id,
          last_error = EXCLUDED.last_error,
          claim_token = NULL,
          claim_until = NULL,
          claim_worker_id = NULL,
          updated_at = EXCLUDED.updated_at`,
        scheduleParams(schedule)
      );
    });
  }

  async saveDelivery(delivery: ReportScheduleDeliverySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_schedule_deliveries (
          id, account_id, schedule_id, execution_id, export_id, recipient, status, format,
          delivered_at, error, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          execution_id = EXCLUDED.execution_id,
          export_id = EXCLUDED.export_id,
          recipient = EXCLUDED.recipient,
          status = EXCLUDED.status,
          format = EXCLUDED.format,
          delivered_at = EXCLUDED.delivered_at,
          error = EXCLUDED.error
        WHERE report_schedule_deliveries.account_id = EXCLUDED.account_id`,
        deliveryParams(delivery)
      );
    });
  }

  async saveClaimedDelivery(
    delivery: ReportScheduleDeliverySummary,
    claimToken: string
  ): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE report_schedule_deliveries
            SET execution_id = $3,
                export_id = $4,
                recipient = $5,
                status = $6,
                format = $7,
                delivered_at = $8,
                error = $9,
                claim_token = NULL,
                claim_until = NULL,
                claim_worker_id = NULL
          WHERE account_id = $1
            AND id = $2
            AND claim_token = $10`,
        [
          delivery.accountId,
          delivery.id,
          delivery.executionId,
          delivery.exportId,
          delivery.recipient,
          delivery.status,
          delivery.format,
          new Date(delivery.deliveredAt),
          delivery.error,
          claimToken
        ]
      );
      return result.rowCount === 1;
    });
  }

  async claimFailedDeliveries(
    accountId: AccountId,
    asOf: string,
    workerId: string,
    limit = 25,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleDeliveryClaim[]> {
    if (!workerId.trim() || !Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('workerId and limit are required for report delivery claims');
    }
    if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
      throw new ValidationError('leaseMs is required for report delivery claims');
    }
    const normalizedLimit = Math.floor(limit);
    const normalizedLeaseMs = Math.floor(leaseMs);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT id
             FROM report_schedule_deliveries
            WHERE account_id = $1
              AND status = 'failed'
              AND (claim_until IS NULL OR claim_until <= $2::timestamptz)
            ORDER BY delivered_at ASC, id ASC
            LIMIT $4
            FOR UPDATE SKIP LOCKED
         )
         UPDATE report_schedule_deliveries AS deliveries
            SET claim_token = $3 || ':' || deliveries.id,
                claim_until = CURRENT_TIMESTAMP + ($5 * INTERVAL '1 millisecond'),
                claim_worker_id = $6
           FROM candidates
          WHERE deliveries.account_id = $1
            AND deliveries.id = candidates.id
         RETURNING deliveries.*`,
        [
          accountId,
          asOf,
          createCorrelationId('rep_deliv_claim'),
          normalizedLimit,
          normalizedLeaseMs,
          workerId.trim()
        ]
      );
      return result.rows.map(mapDeliveryClaim);
    });
  }

  async claimDueSchedules(
    accountId: AccountId,
    asOf: string,
    workerId: string,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH due AS (
           SELECT id
             FROM report_schedules
            WHERE account_id = $1
              AND is_active = TRUE
              AND next_run_at <= $2
              AND (claim_until IS NULL OR claim_until <= CURRENT_TIMESTAMP)
            ORDER BY next_run_at ASC, id ASC
            LIMIT 25
            FOR UPDATE SKIP LOCKED
         )
         UPDATE report_schedules AS schedules
            SET claim_token = $3,
                claim_until = CURRENT_TIMESTAMP + ($4 * INTERVAL '1 millisecond'),
                claim_worker_id = $5,
                updated_at = CURRENT_TIMESTAMP
           FROM due
          WHERE schedules.account_id = $1 AND schedules.id = due.id
         RETURNING schedules.*`,
        [accountId, asOf, createCorrelationId('rep_claim'), leaseMs, workerId]
      );
      return result.rows.map(mapSchedule);
    });
  }

  async findExecutions(accountId: AccountId): Promise<readonly ReportExecutionDetail[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_executions WHERE account_id = $1 ORDER BY generated_at DESC',
        [accountId]
      );
      return result.rows.map(mapExecution);
    });
  }

  async findExports(accountId: AccountId): Promise<readonly ReportExportSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_exports WHERE account_id = $1 ORDER BY exported_at DESC',
        [accountId]
      );
      return result.rows.map(mapExport);
    });
  }

  async findSchedules(accountId: AccountId): Promise<readonly ReportScheduleSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_schedules WHERE account_id = $1 ORDER BY name ASC',
        [accountId]
      );
      return result.rows.map(mapSchedule);
    });
  }

  async findDeliveries(accountId: AccountId): Promise<readonly ReportScheduleDeliverySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_schedule_deliveries WHERE account_id = $1 ORDER BY delivered_at DESC',
        [accountId]
      );
      return result.rows.map(mapDelivery);
    });
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

function nextRunAt(value: string, frequency: ReportScheduleFrequency): string {
  const date = new Date(value);
  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === 'monthly') date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonRecordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

function jsonColumnArray(value: unknown): readonly ReportColumn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    )
    .map((item) => ({
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      type: item.type as ReportColumnType
    }))
    .filter((column) => column.key && column.label);
}

function jsonStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function executionParams(execution: ReportExecutionDetail): unknown[] {
  return [
    execution.id,
    execution.accountId,
    execution.reportId,
    execution.requestedByUserId,
    execution.status,
    JSON.stringify(execution.filters),
    execution.rowCount,
    new Date(execution.generatedAt),
    new Date(execution.expiresAt),
    JSON.stringify(execution.columns),
    JSON.stringify(execution.rows)
  ];
}

function exportParams(exported: ReportExportSummary): unknown[] {
  return [
    exported.id,
    exported.accountId,
    exported.executionId,
    exported.format,
    exported.filename,
    exported.contentType,
    exported.contentEncoding,
    exported.content,
    exported.exportedByUserId,
    new Date(exported.exportedAt)
  ];
}

function scheduleParams(schedule: ReportScheduleSummary): unknown[] {
  return [
    schedule.id,
    schedule.accountId,
    schedule.reportId,
    schedule.name,
    schedule.frequency,
    schedule.format,
    JSON.stringify(schedule.filters),
    JSON.stringify(schedule.recipients),
    schedule.isActive,
    new Date(schedule.nextRunAt),
    schedule.lastRunAt ? new Date(schedule.lastRunAt) : null,
    schedule.lastExecutionId,
    schedule.lastError,
    schedule.createdByUserId,
    new Date(schedule.createdAt),
    new Date(schedule.updatedAt)
  ];
}

function deliveryParams(delivery: ReportScheduleDeliverySummary): unknown[] {
  return [
    delivery.id,
    delivery.accountId,
    delivery.scheduleId,
    delivery.executionId,
    delivery.exportId,
    delivery.recipient,
    delivery.status,
    delivery.format,
    new Date(delivery.deliveredAt),
    delivery.error,
    new Date(delivery.createdAt)
  ];
}

function mapExecution(row: Record<string, unknown>): ReportExecutionDetail {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    reportId: row.report_id as string,
    requestedByUserId: row.requested_by_user_id as UserId,
    status: row.status as 'completed',
    filters: jsonRecord(row.filters),
    rowCount: Number(row.row_count),
    generatedAt: dateIso(row.generated_at),
    expiresAt: dateIso(row.expires_at),
    columns: jsonColumnArray(row.columns),
    rows: jsonRecordArray(row.rows)
  };
}

function mapExport(row: Record<string, unknown>): ReportExportSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    executionId: row.execution_id as string,
    format: row.format as ReportFormat,
    filename: row.filename as string,
    contentType: row.content_type as string,
    contentEncoding: (row.content_encoding as ReportContentEncoding | undefined) ?? 'utf8',
    content: row.content as string,
    exportedByUserId: row.exported_by_user_id as UserId,
    exportedAt: dateIso(row.exported_at)
  };
}

function mapDelivery(row: Record<string, unknown>): ReportScheduleDeliverySummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    scheduleId: row.schedule_id as string,
    executionId: typeof row.execution_id === 'string' ? row.execution_id : null,
    exportId: typeof row.export_id === 'string' ? row.export_id : null,
    recipient: row.recipient as string,
    status: row.status as ReportScheduleDeliveryStatus,
    format: row.format as ReportFormat,
    deliveredAt: dateIso(row.delivered_at),
    error: typeof row.error === 'string' ? row.error : null,
    createdAt: dateIso(row.created_at)
  };
}

function mapDeliveryClaim(row: Record<string, unknown>): ReportScheduleDeliveryClaim {
  return {
    delivery: mapDelivery(row),
    claimToken: String(row.claim_token),
    claimUntil: dateIso(row.claim_until),
    claimWorkerId: String(row.claim_worker_id)
  };
}

function mapSchedule(row: Record<string, unknown>): ReportScheduleSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    reportId: row.report_id as string,
    name: row.name as string,
    frequency: row.frequency as ReportScheduleFrequency,
    format: row.format as ReportFormat,
    filters: jsonRecord(row.filters),
    recipients: jsonStringArray(row.recipients),
    isActive: Boolean(row.is_active),
    nextRunAt: row.next_run_at
      ? dateIso(row.next_run_at)
      : nextRunAt(dateIso(row.created_at), row.frequency as ReportScheduleFrequency),
    lastRunAt: row.last_run_at ? dateIso(row.last_run_at) : null,
    lastExecutionId: typeof row.last_execution_id === 'string' ? row.last_execution_id : null,
    lastError: typeof row.last_error === 'string' ? row.last_error : null,
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}
/* v8 ignore stop */

function toCsv(columns: readonly ReportColumn[], rows: readonly Record<string, unknown>[]): string {
  const header = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(','));
  return [header, ...body].join('\n');
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

interface RenderedReportExport {
  readonly contentType: string;
  readonly contentEncoding: ReportContentEncoding;
  readonly content: string;
}

function renderExport(
  execution: ReportExecutionDetail,
  format: ReportFormat
): RenderedReportExport {
  if (format === 'csv') {
    return {
      contentType: 'text/csv; charset=utf-8',
      contentEncoding: 'utf8',
      content: `\uFEFF${toCsv(execution.columns, execution.rows)}`
    };
  }

  if (format === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      contentEncoding: 'utf8',
      content: JSON.stringify(execution, null, 2)
    };
  }

  if (format === 'xlsx') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentEncoding: 'base64',
      content: createXlsx(execution).toString('base64')
    };
  }

  return {
    contentType: 'application/pdf',
    contentEncoding: 'base64',
    content: createPdf(execution).toString('base64')
  };
}

function createXlsx(execution: ReportExecutionDetail): Buffer {
  const rows = [
    execution.columns.map((column) => column.label),
    ...execution.rows.map((row) => execution.columns.map((column) => row[column.key]))
  ];
  const worksheetRows = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => xlsxCell(value, rowIndex + 1, columnIndex + 1));
      return `<row r="${rowIndex + 1}">${cells.join('')}</row>`;
    })
    .join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const packageRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return createZip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: packageRelationships },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelationships },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
    { name: 'xl/styles.xml', content: styles }
  ]);
}

function xlsxCell(value: unknown, row: number, column: number): string {
  const reference = `${xlsxColumnName(column)}${row}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value === null || value === undefined ? '' : String(value))}</t></is></c>`;
}

function xlsxColumnName(column: number): string {
  let current = column;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function createPdf(execution: ReportExecutionDetail): Buffer {
  const lines = [
    `Relatorio: ${execution.reportId}`,
    `Gerado em: ${execution.generatedAt}`,
    execution.columns.map((column) => column.label).join(' | '),
    ...execution.rows.map((row) =>
      execution.columns.map((column) => String(row[column.key] ?? '')).join(' | ')
    )
  ];
  const stream = [
    'BT',
    '/F1 10 Tf',
    '40 780 Td',
    ...lines
      .slice(0, 48)
      .map((line, index) => `${index === 0 ? '' : '0 -14 Td '}${pdfText(line.slice(0, 180))} Tj`),
    'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
  ];
  const header = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const buffers = [Buffer.from(header, 'binary')];
  const offsets: number[] = [0];
  let offset = buffers[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(offset);
    const object = Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, 'utf8');
    buffers.push(object);
    offset += object.length;
  }
  const xrefOffset = offset;
  const xref = [`xref`, `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let index = 1; index < offsets.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, '0')} 00000 n `);
  }
  xref.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref`,
    String(xrefOffset),
    '%%EOF'
  );
  buffers.push(Buffer.from(`${xref.join('\n')}\n`, 'utf8'));
  return Buffer.concat(buffers);
}

function pdfText(value: string): string {
  return `(${value
    .replace(/\\/g, '\\\\')
    .replace(/[()]/g, '\\$&')
    .replace(/[\r\n]/g, ' ')})`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ZipEntry {
  readonly name: string;
  readonly content: string;
}

function createZip(entries: readonly ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const uncompressed = Buffer.from(entry.content, 'utf8');
    const compressed = deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }
  const local = Buffer.concat(localParts);
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([local, central, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
