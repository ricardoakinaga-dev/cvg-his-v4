import { apiRequest } from './api';

export interface DemandForecastDay {
  readonly date: string;
  readonly predictedAppointments: number;
  readonly predictedMinutes: number;
  readonly peakVisitType: 'scheduled' | 'return' | 'walk_in' | 'mixed';
  readonly confidence: number;
}

export interface DemandForecastResponse {
  readonly generatedAt: string;
  readonly horizonDays: number;
  readonly baselineSampleSize: number;
  readonly days: readonly DemandForecastDay[];
}

export interface LabAnomalyFlag {
  readonly orderId: string;
  readonly examType: string;
  readonly parameter: string;
  readonly observedValue?: number;
  readonly unit?: string;
  readonly severity: 'warning' | 'critical';
  readonly classification: 'out_of_range' | 'keyword_match';
  readonly message: string;
}

export interface LabAnomalyResponse {
  readonly generatedAt: string;
  readonly totalAnalyzed: number;
  readonly flaggedOrders: number;
  readonly flags: readonly LabAnomalyFlag[];
}

export const mlService = {
  getDemandForecast(params: { horizonDays?: number; referenceDate?: string } = {}): Promise<DemandForecastResponse> {
    const search = new URLSearchParams();
    if (params.horizonDays !== undefined) {
      search.set('horizonDays', String(params.horizonDays));
    }
    if (params.referenceDate) {
      search.set('referenceDate', params.referenceDate);
    }
    const query = search.toString();
    return apiRequest<DemandForecastResponse>(`/ml/forecasting/demand${query ? `?${query}` : ''}`);
  },

  getLabAnomalies(params: { examType?: string } = {}): Promise<LabAnomalyResponse> {
    const search = new URLSearchParams();
    if (params.examType) {
      search.set('examType', params.examType);
    }
    const query = search.toString();
    return apiRequest<LabAnomalyResponse>(`/ml/anomalies/laboratory-results${query ? `?${query}` : ''}`);
  }
};
