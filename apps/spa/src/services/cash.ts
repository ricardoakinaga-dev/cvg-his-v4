import type {
  CashDrawerDashboardResponse,
  CashReconciliationResponse,
  CloseCashRegisterRequest,
  CreateCashMovementRequest,
  OpenCashRegisterRequest
} from '@cvg-his-v2/shared-contracts';
import { apiRequest } from './api';

export type CashDrawerDashboard = CashDrawerDashboardResponse;

interface CashMutationOptions {
  readonly idempotencyKey?: string;
}

const CASH_COMMAND_TIMEOUT_MS = 15_000;

function mutationOptions(options?: CashMutationOptions) {
  return options?.idempotencyKey
    ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
    : {};
}

export const cashService = {
  getDashboard() {
    return apiRequest<CashDrawerDashboard>('/cash-register/dashboard');
  },

  getReconciliation(registerId?: string) {
    const suffix = registerId ? `?registerId=${encodeURIComponent(registerId)}` : '';
    return apiRequest<CashReconciliationResponse>(`/cash-register/reconciliation${suffix}`);
  },

  openRegister(payload: OpenCashRegisterRequest, options?: CashMutationOptions) {
    return apiRequest('/cash-register/open', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: CASH_COMMAND_TIMEOUT_MS,
      ...mutationOptions(options)
    });
  },

  recordMovement(payload: CreateCashMovementRequest, options?: CashMutationOptions) {
    return apiRequest('/cash-register/movements', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: CASH_COMMAND_TIMEOUT_MS,
      ...mutationOptions(options)
    });
  },

  closeRegister(payload: CloseCashRegisterRequest, options?: CashMutationOptions) {
    return apiRequest('/cash-register/close', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: CASH_COMMAND_TIMEOUT_MS,
      ...mutationOptions(options)
    });
  }
};
