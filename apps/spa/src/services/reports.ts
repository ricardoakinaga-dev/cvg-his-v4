import { apiRequest } from './api';

export type ReportCategory = 'executive' | 'financial' | 'commercial' | 'clinical' | 'inventory' | 'staff';
export type ReportColumnType = 'string' | 'number' | 'currency' | 'date' | 'datetime' | 'status';
export type ReportExecutionStatus = 'completed';
export type ReportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';
export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportScheduleDeliveryStatus = 'sent' | 'failed';

export interface ReportColumn {
  readonly key: string;
  readonly label: string;
  readonly type: ReportColumnType;
}

export interface ReportDefinition {
  readonly id: string;
  readonly accountId: string | null;
  readonly title: string;
  readonly description: string;
  readonly category: ReportCategory;
  readonly requiredPermission: string;
  readonly supportedFormats: readonly ReportFormat[];
  readonly filterSchema: Record<string, 'string' | 'date' | 'boolean' | 'number'>;
  readonly columns: readonly ReportColumn[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportExecutionSummary {
  readonly id: string;
  readonly accountId: string;
  readonly reportId: string;
  readonly requestedByUserId: string;
  readonly status: ReportExecutionStatus;
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
  readonly accountId: string;
  readonly executionId: string;
  readonly format: ReportFormat;
  readonly filename: string;
  readonly contentType: string;
  readonly contentEncoding: 'utf8' | 'base64';
  readonly content: string;
  readonly exportedByUserId: string;
  readonly exportedAt: string;
}

export interface ReportScheduleSummary {
  readonly id: string;
  readonly accountId: string;
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
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportScheduleDeliverySummary {
  readonly id: string;
  readonly accountId: string;
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

export interface ReportScheduleDeliveryAlertSummary {
  readonly id: string;
  readonly accountId: string;
  readonly scheduleId: string;
  readonly reportId: string;
  readonly recipient: string;
  readonly failureCount: number;
  readonly lastFailureAt: string;
  readonly lastError: string;
  readonly severity: 'medium' | 'high';
}

export interface ExecuteReportPayload {
  readonly reportId: string;
  readonly filters?: Record<string, unknown>;
}

export interface CreateReportSchedulePayload extends ExecuteReportPayload {
  readonly name: string;
  readonly frequency: ReportScheduleFrequency;
  readonly format: ReportFormat;
  readonly recipients: readonly string[];
}

export interface UpdateReportSchedulePayload {
  readonly isActive: boolean;
}

interface ReportDefinitionListResponse {
  readonly items: readonly ReportDefinition[];
}

interface ReportExecutionListResponse {
  readonly items: readonly ReportExecutionSummary[];
}

interface ReportScheduleListResponse {
  readonly items: readonly ReportScheduleSummary[];
}

interface ReportScheduleDeliveryListResponse {
  readonly items: readonly ReportScheduleDeliverySummary[];
}

interface ReportScheduleDeliveryAlertListResponse {
  readonly items: readonly ReportScheduleDeliveryAlertSummary[];
}

export const reportsService = {
  async listCatalog(): Promise<ReportDefinition[]> {
    const response = await apiRequest<ReportDefinitionListResponse>('/reports/catalog');
    return [...(response.items ?? [])];
  },

  async listExecutions(): Promise<ReportExecutionSummary[]> {
    const response = await apiRequest<ReportExecutionListResponse>('/reports/executions');
    return [...(response.items ?? [])];
  },

  async execute(payload: ExecuteReportPayload): Promise<ReportExecutionDetail> {
    return apiRequest<ReportExecutionDetail>('/reports/executions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getExecution(executionId: string): Promise<ReportExecutionDetail> {
    return apiRequest<ReportExecutionDetail>(`/reports/executions/${encodeURIComponent(executionId)}`);
  },

  async exportExecution(executionId: string, format: ReportFormat): Promise<ReportExportSummary> {
    return apiRequest<ReportExportSummary>(`/reports/executions/${encodeURIComponent(executionId)}/export`, {
      method: 'POST',
      body: JSON.stringify({ format })
    });
  },

  async listSchedules(): Promise<ReportScheduleSummary[]> {
    const response = await apiRequest<ReportScheduleListResponse>('/reports/schedules');
    return [...(response.items ?? [])];
  },

  async createSchedule(payload: CreateReportSchedulePayload): Promise<ReportScheduleSummary> {
    return apiRequest<ReportScheduleSummary>('/reports/schedules', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSchedule(scheduleId: string, payload: UpdateReportSchedulePayload): Promise<ReportScheduleSummary> {
    return apiRequest<ReportScheduleSummary>(`/reports/schedules/${encodeURIComponent(scheduleId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listScheduleDeliveries(scheduleId: string): Promise<ReportScheduleDeliverySummary[]> {
    const response = await apiRequest<ReportScheduleDeliveryListResponse>(
      `/reports/schedules/${encodeURIComponent(scheduleId)}/deliveries`
    );
    return [...(response.items ?? [])];
  },

  async listScheduleDeliveryAlerts(scheduleId: string): Promise<ReportScheduleDeliveryAlertSummary[]> {
    const response = await apiRequest<ReportScheduleDeliveryAlertListResponse>(
      `/reports/schedules/${encodeURIComponent(scheduleId)}/delivery-alerts`
    );
    return [...(response.items ?? [])];
  },

  async retryScheduleDelivery(scheduleId: string, deliveryId: string): Promise<ReportScheduleDeliverySummary> {
    return apiRequest<ReportScheduleDeliverySummary>(
      `/reports/schedules/${encodeURIComponent(scheduleId)}/deliveries/${encodeURIComponent(deliveryId)}/retry`,
      { method: 'POST' }
    );
  }
};
