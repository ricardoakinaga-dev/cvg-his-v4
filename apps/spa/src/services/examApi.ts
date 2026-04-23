import { apiRequest } from './api';
import type {
  ExamOrderListResponse,
  ExamOrderRecord,
  ExamResultListResponse,
  ExamResultRecord
} from '@/types/examApi';

export const examApiService = {
  async listOrders(encounterId?: string): Promise<ExamOrderRecord[]> {
    const query = encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : '';
    const response = await apiRequest<ExamOrderListResponse>(`/exam-orders${query}`);
    return response.items ?? [];
  },

  async createOrder(payload: {
    encounterId: string;
    patientId: string;
    examName: string;
    examCode?: string;
    notes?: string;
  }): Promise<ExamOrderRecord> {
    return apiRequest<ExamOrderRecord>('/exam-orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listResults(category?: string): Promise<ExamResultRecord[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await apiRequest<ExamResultListResponse>(`/exam-results${query}`);
    return response.items ?? [];
  },

  async updateResult(
    id: string,
    payload: { status: 'draft' | 'released' | 'cancelled'; findings?: string; interpretation?: string }
  ): Promise<ExamResultRecord> {
    return apiRequest<ExamResultRecord>(`/exam-results/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
