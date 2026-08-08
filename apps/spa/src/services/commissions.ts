import { apiRequest } from './api';

export type CommissionRuleScope = 'global' | 'department' | 'job_title' | 'staff';
export type CommissionItemKind = 'service' | 'product' | 'procedure' | 'exam' | 'other';
export type CommissionCalculationStatus = 'draft' | 'reviewed' | 'paid' | 'cancelled';
export type CommissionSourceType = 'billing_item' | 'counter_sale_item' | 'package_consumption' | 'manual';
export type CommissionPaymentMethod = 'cash' | 'bank_transfer' | 'pix' | 'card' | 'cheque' | 'other';

export interface CommissionRuleSummary {
  readonly id: string;
  readonly accountId: string;
  readonly description: string;
  readonly scope: CommissionRuleScope;
  readonly staffId: string | null;
  readonly department: string | null;
  readonly jobTitle: string | null;
  readonly itemKind: CommissionItemKind | 'any';
  readonly percentage: number;
  readonly isActive: boolean;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCommissionRulePayload {
  readonly description: string;
  readonly scope?: CommissionRuleScope;
  readonly staffId?: string | null;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly itemKind?: CommissionItemKind | 'any';
  readonly percentage: number;
  readonly isActive?: boolean;
}

export interface CommissionSourceLinePayload {
  readonly staffId: string;
  readonly staffName: string;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly itemKind: CommissionItemKind;
  readonly sourceType: CommissionSourceType;
  readonly sourceId: string;
  readonly sourceDescription: string;
  readonly baseAmount: number;
  readonly occurredAt: string;
}

export interface CommissionLineSummary extends CommissionSourceLinePayload {
  readonly id: string;
  readonly accountId: string;
  readonly calculationId: string;
  readonly ruleId: string | null;
  readonly percentage: number;
  readonly commissionAmount: number;
}

export interface CommissionCalculationDetail {
  readonly id: string;
  readonly accountId: string;
  readonly number: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: CommissionCalculationStatus;
  readonly totalBaseAmount: number;
  readonly totalCommissionAmount: number;
  readonly createdByUserId: string;
  readonly reviewedByUserId: string | null;
  readonly paidByUserId: string | null;
  readonly cancelledByUserId: string | null;
  readonly payableId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly paidAt: string | null;
  readonly cancelledAt: string | null;
  readonly notes: string | null;
  readonly lines: readonly CommissionLineSummary[];
}

export interface CalculateCommissionsPayload {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly lines: readonly CommissionSourceLinePayload[];
  readonly notes?: string | null;
}

interface CommissionRuleListResponse {
  readonly items: readonly CommissionRuleSummary[];
}

interface CommissionCalculationListResponse {
  readonly items: readonly CommissionCalculationDetail[];
}

export const commissionService = {
  async listRules(active?: boolean): Promise<CommissionRuleSummary[]> {
    const suffix = active === undefined ? '' : `?active=${active ? 'true' : 'false'}`;
    const response = await apiRequest<CommissionRuleListResponse>(`/commission-rules${suffix}`);
    return [...(response.items ?? [])];
  },

  async createRule(payload: CreateCommissionRulePayload): Promise<CommissionRuleSummary> {
    return apiRequest<CommissionRuleSummary>('/commission-rules', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listCalculations(): Promise<CommissionCalculationDetail[]> {
    const response = await apiRequest<CommissionCalculationListResponse>('/commission-calculations');
    return [...(response.items ?? [])];
  },

  async calculate(payload: CalculateCommissionsPayload): Promise<CommissionCalculationDetail> {
    return apiRequest<CommissionCalculationDetail>('/commission-calculations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async review(calculationId: string): Promise<CommissionCalculationDetail> {
    return apiRequest<CommissionCalculationDetail>(`/commission-calculations/${encodeURIComponent(calculationId)}/review`, {
      method: 'POST'
    });
  },

  async pay(
    calculationId: string,
    payload: { readonly paymentMethod: CommissionPaymentMethod; readonly paymentReference?: string | null }
  ): Promise<CommissionCalculationDetail> {
    return apiRequest<CommissionCalculationDetail>(`/commission-calculations/${encodeURIComponent(calculationId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async cancel(calculationId: string): Promise<CommissionCalculationDetail> {
    return apiRequest<CommissionCalculationDetail>(`/commission-calculations/${encodeURIComponent(calculationId)}/cancel`, {
      method: 'POST'
    });
  }
};
