import { apiRequest } from './api';
import type { HealthStatus } from '@cvg-his-v2/shared-types';

export interface SloStatus {
  readonly id: string;
  readonly name: string;
  readonly category: 'performance' | 'availability' | 'reliability';
  readonly currentValue: number;
  readonly target: number;
  readonly unit: string;
  readonly status: 'healthy' | 'alert' | 'critical';
  readonly errorBudgetPercent: number;
  readonly burnRate: number;
  readonly lastUpdated: string;
}

export interface SloReportResponse {
  readonly generatedAt: string;
  readonly snapshot: {
    readonly requestCount5m: number;
    readonly requestCount1h: number;
    readonly p95LatencyMs: number;
    readonly p99LatencyMs: number;
    readonly availabilityPercent: number;
    readonly errorRatePercent: number;
  };
  readonly report: {
    readonly overallStatus: 'healthy' | 'degraded' | 'critical';
    readonly errorBudgetExhausted: boolean;
    readonly slos: readonly SloStatus[];
  };
  readonly runbook: {
    readonly metrics: string;
    readonly readiness: string;
    readonly liveness: string;
  };
}

export const healthService = {
  async get(): Promise<HealthStatus> {
    return apiRequest<HealthStatus>('/health', { skipAuth: true });
  },

  async getSloReport(): Promise<SloReportResponse> {
    return apiRequest<SloReportResponse>('/slos', { skipAuth: true });
  }
};
