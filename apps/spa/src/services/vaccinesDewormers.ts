import { apiRequest } from './api';

export type PreventiveItemType = 'vaccine' | 'dewormer' | 'other';
export type PreventiveEventStatus = 'scheduled' | 'executed';

export interface PreventiveEventSummary {
  readonly id: string;
  readonly accountId: string;
  readonly patientId: string | null;
  readonly ownerId: string | null;
  readonly clientName: string;
  readonly animalName: string;
  readonly eventDate: string;
  readonly itemType: PreventiveItemType;
  readonly description: string;
  readonly status: PreventiveEventStatus;
  readonly observation: string | null;
  readonly executedAt: string | null;
  readonly executedObservation: string | null;
  readonly rescheduledFromId: string | null;
  readonly reminderEmailPreparedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface PreventiveEventListResponse {
  readonly items: readonly PreventiveEventSummary[];
}

export interface PreventiveEventListFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly client?: string;
  readonly animal?: string;
  readonly patientId?: string;
  readonly ownerId?: string;
  readonly includeExecuted?: boolean;
  readonly itemType?: PreventiveItemType | '';
}

export interface CreatePreventiveEventPayload {
  readonly clientName: string;
  readonly animalName: string;
  readonly patientId?: string | null;
  readonly ownerId?: string | null;
  readonly eventDate: string;
  readonly itemType: PreventiveItemType;
  readonly description: string;
  readonly observation?: string | null;
  readonly status?: PreventiveEventStatus;
}

export type UpdatePreventiveEventPayload = Partial<CreatePreventiveEventPayload>;

export interface ExecutePreventiveEventPayload {
  readonly observation?: string | null;
  readonly rescheduleTo?: string | null;
}

export interface ExecutePreventiveEventResponse {
  readonly event: PreventiveEventSummary;
  readonly rescheduledEvent: PreventiveEventSummary | null;
}

export interface PreventiveEmailResult {
  readonly preparedCount: number;
  readonly preparedAt: string;
}

export const preventiveItemTypeOptions: readonly { value: PreventiveItemType; label: string }[] = [
  { value: 'vaccine', label: 'Vacina' },
  { value: 'dewormer', label: 'Vermífugo' },
  { value: 'other', label: 'Outro' }
];

export const vaccinesDewormersService = {
  async list(filters?: PreventiveEventListFilters): Promise<PreventiveEventSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.set('dateTo', filters.dateTo);
    if (filters?.client) searchParams.set('client', filters.client);
    if (filters?.animal) searchParams.set('animal', filters.animal);
    if (filters?.patientId) searchParams.set('patientId', filters.patientId);
    if (filters?.ownerId) searchParams.set('ownerId', filters.ownerId);
    if (filters?.itemType) searchParams.set('itemType', filters.itemType);
    if (typeof filters?.includeExecuted === 'boolean') {
      searchParams.set('includeExecuted', filters.includeExecuted ? 'true' : 'false');
    }

    const params = searchParams.toString();
    const response = await apiRequest<PreventiveEventListResponse>(
      `/vaccines-dewormers${params ? `?${params}` : ''}`
    );
    return [...(response.items ?? [])];
  },

  async create(payload: CreatePreventiveEventPayload): Promise<PreventiveEventSummary> {
    return apiRequest<PreventiveEventSummary>('/vaccines-dewormers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(eventId: string, payload: UpdatePreventiveEventPayload): Promise<PreventiveEventSummary> {
    return apiRequest<PreventiveEventSummary>(`/vaccines-dewormers/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(eventId: string): Promise<void> {
    await apiRequest<void>(`/vaccines-dewormers/${eventId}`, {
      method: 'DELETE'
    });
  },

  async execute(
    eventId: string,
    payload: ExecutePreventiveEventPayload
  ): Promise<ExecutePreventiveEventResponse> {
    return apiRequest<ExecutePreventiveEventResponse>(`/vaccines-dewormers/${eventId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    return apiRequest<PreventiveEventSummary>(`/vaccines-dewormers/${eventId}/email`, {
      method: 'POST'
    });
  },

  async prepareBulkEmail(filters: PreventiveEventListFilters): Promise<PreventiveEmailResult> {
    return apiRequest<PreventiveEmailResult>('/vaccines-dewormers/reminders/email', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  }
};

export function preventiveItemTypeLabel(itemType: PreventiveItemType | string): string {
  return preventiveItemTypeOptions.find((option) => option.value === itemType)?.label ?? itemType;
}
