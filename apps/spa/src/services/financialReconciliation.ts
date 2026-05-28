import { apiRequest } from './api';
import type { FinancialPayableRecord, FinancialPayableReconciliationResponse } from './financialPayables';

export type ReconciliationDomain = 'pix' | 'card' | 'payable';
export type ReconciliationState = 'reconciled' | 'pending' | 'attention_required' | 'not_required' | string;

export interface PixReconciliationRow {
  readonly transactionId: string;
  readonly provider: string;
  readonly status: string;
  readonly amount: number;
  readonly description: string;
  readonly billingRecordId: string | null;
  readonly ownerName: string | null;
  readonly patientName: string | null;
  readonly reconciliationState: ReconciliationState;
  readonly cashReconciliationStatus: string;
  readonly billingSettlementStatus: string;
}

export interface PixReconciliationResponse {
  readonly data: readonly PixReconciliationRow[];
  readonly total: number;
  readonly completedCount: number;
  readonly reconciledCount: number;
  readonly attentionCount: number;
  readonly pendingCount: number;
}

export interface CardReconciliationRow {
  readonly transactionId: string;
  readonly provider: string;
  readonly status: string;
  readonly amount: number;
  readonly description: string;
  readonly billingRecordId: string | null;
  readonly ownerName: string | null;
  readonly patientName: string | null;
  readonly cardHolderName: string | null;
  readonly reconciliationState: ReconciliationState;
  readonly billingSettlementStatus: string;
}

export interface CardReconciliationResponse {
  readonly data: readonly CardReconciliationRow[];
  readonly total: number;
  readonly capturedCount: number;
  readonly awaitingCaptureCount: number;
  readonly attentionCount: number;
  readonly pendingCount: number;
  readonly reconciledCount: number;
}

export interface FinancialReconciliationFilters {
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface UnifiedReconciliationRow {
  readonly id: string;
  readonly domain: ReconciliationDomain;
  readonly origin: string;
  readonly description: string;
  readonly counterparty: string;
  readonly amount: number;
  readonly status: string;
  readonly reconciliationState: ReconciliationState;
  readonly reference: string;
  readonly nextAction: string;
}

export interface UnifiedFinancialReconciliation {
  readonly rows: readonly UnifiedReconciliationRow[];
  readonly totals: {
    readonly totalAmount: number;
    readonly reconciledAmount: number;
    readonly pendingAmount: number;
    readonly attentionAmount: number;
    readonly totalCount: number;
    readonly reconciledCount: number;
    readonly pendingCount: number;
    readonly attentionCount: number;
  };
}

export const financialReconciliationService = {
  async getUnified(filters: FinancialReconciliationFilters = {}): Promise<UnifiedFinancialReconciliation> {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const query = params.toString();
    const suffix = query ? `?${query}` : '';

    const [pix, cards, payables] = await Promise.all([
      apiRequest<PixReconciliationResponse>(`/financial/reconciliation${suffix}`),
      apiRequest<CardReconciliationResponse>(`/financial/reconciliation/cards${suffix}`),
      apiRequest<FinancialPayableReconciliationResponse>(`/financial/reconciliation/payables${suffix}`)
    ]);

    const rows = [
      ...pix.data.map(mapPixRow),
      ...cards.data.map(mapCardRow),
      ...payables.data.map(mapPayableRow)
    ];

    return {
      rows,
      totals: summarize(rows)
    };
  }
};

function mapPixRow(row: PixReconciliationRow): UnifiedReconciliationRow {
  return {
    id: row.transactionId,
    domain: 'pix',
    origin: `PIX · ${row.provider}`,
    description: row.description || row.transactionId,
    counterparty: [row.ownerName, row.patientName].filter(Boolean).join(' · ') || 'Cliente não vinculado',
    amount: row.amount,
    status: row.status,
    reconciliationState: row.reconciliationState,
    reference: row.billingRecordId ?? row.transactionId,
    nextAction: row.reconciliationState === 'reconciled' ? 'Monitorar' : 'Conferir PIX'
  };
}

function mapCardRow(row: CardReconciliationRow): UnifiedReconciliationRow {
  return {
    id: row.transactionId,
    domain: 'card',
    origin: `Cartão · ${row.provider}`,
    description: row.description || row.transactionId,
    counterparty: [row.ownerName ?? row.cardHolderName, row.patientName].filter(Boolean).join(' · ') || 'Cliente não vinculado',
    amount: row.amount,
    status: row.status,
    reconciliationState: row.reconciliationState,
    reference: row.billingRecordId ?? row.transactionId,
    nextAction: row.reconciliationState === 'reconciled' ? 'Monitorar repasse' : 'Conferir cartão'
  };
}

function mapPayableRow(row: FinancialPayableRecord): UnifiedReconciliationRow {
  return {
    id: row.id,
    domain: 'payable',
    origin: `Pagável · ${row.paymentMethod ?? 'não informado'}`,
    description: row.description,
    counterparty: row.supplierName,
    amount: row.paidAmount,
    status: row.status,
    reconciliationState: row.reconciliationStatus,
    reference: row.reconciliationReference ?? row.paymentReference ?? row.id,
    nextAction: row.reconciliationStatus === 'reconciled' ? 'Monitorar baixa' : 'Conciliar pagável'
  };
}

function summarize(rows: readonly UnifiedReconciliationRow[]): UnifiedFinancialReconciliation['totals'] {
  const reconciled = rows.filter((row) => row.reconciliationState === 'reconciled');
  const attention = rows.filter((row) => row.reconciliationState === 'attention_required');
  const pending = rows.filter((row) => row.reconciliationState === 'pending');
  return {
    totalAmount: round(rows.reduce((sum, row) => sum + row.amount, 0)),
    reconciledAmount: round(reconciled.reduce((sum, row) => sum + row.amount, 0)),
    pendingAmount: round(pending.reduce((sum, row) => sum + row.amount, 0)),
    attentionAmount: round(attention.reduce((sum, row) => sum + row.amount, 0)),
    totalCount: rows.length,
    reconciledCount: reconciled.length,
    pendingCount: pending.length,
    attentionCount: attention.length
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
