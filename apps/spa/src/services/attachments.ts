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

  async upload(payload: CreateAttachmentRequest): Promise<AttachmentSummary> {
    return apiRequest<AttachmentSummary>('/attachments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
