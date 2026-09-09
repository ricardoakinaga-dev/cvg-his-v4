import { apiRequest } from './api';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';

export interface CreateAttachmentRequest {
  linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order';
  linkedEntityId: string;
  category: 'image' | 'lab' | 'document' | 'prescription' | 'other';
  fileName: string;
  mimeType: string;
  checksum: string;
}

export interface AttachmentMutationOptions {
  readonly idempotencyKey?: string;
}

export interface AttachmentDownloadUrlResponse {
  readonly url?: unknown;
  readonly expiresAt?: unknown;
}

interface AttachmentListResponse {
  items: readonly AttachmentSummary[];
}

export const attachmentService = {
  async list(linkedEntityType: CreateAttachmentRequest['linkedEntityType'], linkedEntityId: string): Promise<AttachmentSummary[]> {
    const params =
      `?linkedEntityType=${encodeURIComponent(linkedEntityType)}` +
      `&linkedEntityId=${encodeURIComponent(linkedEntityId)}`;
    const response = await apiRequest<AttachmentListResponse>(`/attachments${params}`);
    return [...(response.items ?? [])];
  },

  async upload(
    payload: CreateAttachmentRequest,
    options?: AttachmentMutationOptions
  ): Promise<AttachmentSummary> {
    return apiRequest<AttachmentSummary>('/attachments', {
      method: 'POST',
      ...(options?.idempotencyKey
        ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
        : {}),
      body: JSON.stringify(payload)
    });
  },

  async getDownloadUrl(attachmentId: string): Promise<AttachmentDownloadUrlResponse> {
    return apiRequest<AttachmentDownloadUrlResponse>(
      `/attachments/${encodeURIComponent(attachmentId)}/download-url`,
      { method: 'POST' }
    );
  }
};
