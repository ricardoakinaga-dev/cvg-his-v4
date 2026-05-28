import { apiRequest } from './api';

export type MarketingChannel = 'sms' | 'whatsapp' | 'email';
export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'running' | 'sent' | 'cancelled';
export type MarketingDeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped';
export type MarketingConsentPurpose = 'marketing' | 'transactional' | 'preventive';

export interface MarketingSegmentCriteria {
  readonly ownerGroups?: readonly string[];
  readonly patientSpecies?: readonly string[];
  readonly consentPurpose?: MarketingConsentPurpose;
  readonly tags?: readonly string[];
}

export interface MarketingSegmentSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly description?: string;
  readonly criteria: MarketingSegmentCriteria;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingTemplateSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly subject?: string;
  readonly body: string;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingCampaignSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly channel: MarketingChannel;
  readonly status: MarketingCampaignStatus;
  readonly segmentId: string;
  readonly templateId: string;
  readonly scheduledAt?: string;
  readonly scheduledByUserId?: string;
  readonly estimatedAudience: number;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MarketingAudienceContact {
  readonly type: MarketingChannel;
  readonly value: string;
}

export interface MarketingAudienceMember {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly ownerGroup?: string;
  readonly consentPurposes?: readonly MarketingConsentPurpose[];
  readonly patientId?: string;
  readonly patientName?: string;
  readonly patientSpecies?: string;
  readonly tags?: readonly string[];
  readonly contacts: readonly MarketingAudienceContact[];
}

export interface MarketingCampaignDeliverySummary {
  readonly id: string;
  readonly accountId: string;
  readonly campaignId: string;
  readonly ownerId: string;
  readonly patientId?: string;
  readonly channel: MarketingChannel;
  readonly recipient: string;
  readonly subject?: string;
  readonly body: string;
  readonly status: MarketingDeliveryStatus;
  readonly provider?: string;
  readonly providerMessageId?: string;
  readonly failureReason?: string;
  readonly attemptCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly failedAt?: string;
}

export interface MarketingCampaignDispatchResult {
  readonly campaign: MarketingCampaignSummary;
  readonly deliveries: readonly MarketingCampaignDeliverySummary[];
  readonly summary: {
    readonly total: number;
    readonly sent: number;
    readonly failed: number;
    readonly skipped: number;
  };
}

interface ListResponse<T> {
  readonly items: readonly T[];
}

export const marketingService = {
  async listSegments(): Promise<MarketingSegmentSummary[]> {
    const response = await apiRequest<ListResponse<MarketingSegmentSummary>>('/marketing/segments');
    return [...(response.items ?? [])];
  },

  async createSegment(payload: {
    readonly name: string;
    readonly description?: string;
    readonly criteria?: MarketingSegmentCriteria;
  }): Promise<MarketingSegmentSummary> {
    return apiRequest<MarketingSegmentSummary>('/marketing/segments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listTemplates(channel?: MarketingChannel): Promise<MarketingTemplateSummary[]> {
    const params = channel ? `?channel=${encodeURIComponent(channel)}` : '';
    const response = await apiRequest<ListResponse<MarketingTemplateSummary>>(`/marketing/templates${params}`);
    return [...(response.items ?? [])];
  },

  async createTemplate(payload: {
    readonly name: string;
    readonly channel: MarketingChannel;
    readonly subject?: string;
    readonly body: string;
  }): Promise<MarketingTemplateSummary> {
    return apiRequest<MarketingTemplateSummary>('/marketing/templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listCampaigns(status?: MarketingCampaignStatus): Promise<MarketingCampaignSummary[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiRequest<ListResponse<MarketingCampaignSummary>>(`/marketing/campaigns${params}`);
    return [...(response.items ?? [])];
  },

  async createCampaign(payload: {
    readonly name: string;
    readonly channel: MarketingChannel;
    readonly segmentId: string;
    readonly templateId: string;
    readonly scheduledAt?: string;
  }): Promise<MarketingCampaignSummary> {
    return apiRequest<MarketingCampaignSummary>('/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async scheduleCampaign(campaignId: string): Promise<MarketingCampaignSummary> {
    return apiRequest<MarketingCampaignSummary>(`/marketing/campaigns/${encodeURIComponent(campaignId)}/schedule`, {
      method: 'POST'
    });
  },

  async dispatchCampaign(
    campaignId: string,
    audience: readonly MarketingAudienceMember[]
  ): Promise<MarketingCampaignDispatchResult> {
    return apiRequest<MarketingCampaignDispatchResult>(`/marketing/campaigns/${encodeURIComponent(campaignId)}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ audience })
    });
  },

  async listCampaignDeliveries(campaignId: string): Promise<MarketingCampaignDeliverySummary[]> {
    const response = await apiRequest<ListResponse<MarketingCampaignDeliverySummary>>(
      `/marketing/campaigns/${encodeURIComponent(campaignId)}/deliveries`
    );
    return [...(response.items ?? [])];
  }
};
