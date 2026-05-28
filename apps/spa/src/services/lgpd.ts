import { apiRequest } from './api';

export type ConsentPurpose = 'marketing' | 'analytics' | 'clinical' | 'financial' | 'operational' | 'notifications';
export type ConsentStatus = 'granted' | 'revoked' | 'expired';
export type SubjectType = 'owner' | 'patient' | 'user';
export type DsrStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';
export type DsrType = 'data_export' | 'data_deletion' | 'data_anonymization' | 'data_rectification' | 'data_access' | 'data_portability' | 'consent_revocation';

export interface ConsentRecord {
  id: string;
  accountId: string;
  subjectId: string;
  subjectType: SubjectType;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  origin: string;
  grantedBy: string | null;
  grantedAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface DsrRecord {
  id: string;
  accountId: string;
  subjectId: string;
  subjectType: SubjectType;
  requestType: DsrType;
  status: DsrStatus;
  requestedBy: string;
  requestedAt: string;
  completedBy: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  resultJson?: Record<string, unknown> | null;
  notes: string | null;
}

export interface ConsentStatusMap {
  [purpose: string]: boolean;
}

export interface LgpdService {
  getConsentStatus(subjectId: string, subjectType: SubjectType): Promise<ConsentStatusMap>;
  grantConsent(payload: {
    subjectId: string;
    subjectType: SubjectType;
    purpose: ConsentPurpose;
    origin?: string;
    expiresAt?: string;
  }): Promise<ConsentRecord>;
  revokeConsent(payload: {
    subjectId: string;
    subjectType: SubjectType;
    purpose: ConsentPurpose;
  }): Promise<ConsentRecord>;
  listDsrRequests(status?: DsrStatus): Promise<DsrRecord[]>;
  createDsrRequest(payload: {
    subjectId: string;
    subjectType: SubjectType;
    requestType: DsrType;
    notes?: string;
  }): Promise<DsrRecord>;
  completeDsrRequest(requestId: string, resultJson?: Record<string, unknown>): Promise<DsrRecord>;
  rejectDsrRequest(requestId: string, reason: string): Promise<DsrRecord>;
}

export const lgpdService: LgpdService = {
  async getConsentStatus(subjectId: string, subjectType: SubjectType): Promise<ConsentStatusMap> {
    const response = await apiRequest<{ active: ConsentStatusMap }>(
      `/lgpd/consent/status?subjectId=${encodeURIComponent(subjectId)}&subjectType=${encodeURIComponent(subjectType)}`
    );
    return response.active;
  },

  async grantConsent(payload: {
    subjectId: string;
    subjectType: SubjectType;
    purpose: ConsentPurpose;
    origin?: string;
    expiresAt?: string;
  }): Promise<ConsentRecord> {
    return apiRequest<ConsentRecord>('/lgpd/consent', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async revokeConsent(payload: {
    subjectId: string;
    subjectType: SubjectType;
    purpose: ConsentPurpose;
  }): Promise<ConsentRecord> {
    return apiRequest<ConsentRecord>('/lgpd/consent/revoke', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listDsrRequests(status?: DsrStatus): Promise<DsrRecord[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiRequest<{ requests: DsrRecord[] }>(`/lgpd/requests${params}`);
    return response.requests ?? [];
  },

  async createDsrRequest(payload: {
    subjectId: string;
    subjectType: SubjectType;
    requestType: DsrType;
    notes?: string;
  }): Promise<DsrRecord> {
    return apiRequest<DsrRecord>('/lgpd/requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async completeDsrRequest(requestId: string, resultJson?: Record<string, unknown>): Promise<DsrRecord> {
    return apiRequest<DsrRecord>('/lgpd/requests/complete', {
      method: 'POST',
      body: JSON.stringify({ requestId, resultJson })
    });
  },

  async rejectDsrRequest(requestId: string, reason: string): Promise<DsrRecord> {
    return apiRequest<DsrRecord>('/lgpd/requests/reject', {
      method: 'POST',
      body: JSON.stringify({ requestId, rejectionReason: reason })
    });
  }
};
