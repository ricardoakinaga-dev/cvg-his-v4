import type {
  CashDrawerDashboardResponse,
  CashReconciliationResponse,
  CloseCashRegisterRequest,
  CreateCashMovementRequest,
  OpenCashRegisterRequest
} from '@cvg-his-v2/shared-contracts';
import { apiRequest } from './api';

export type CashDrawerDashboard = CashDrawerDashboardResponse;

export const cashService = {
  getDashboard() {
    return apiRequest<CashDrawerDashboard>('/cash-register/dashboard');
  },

  getReconciliation(registerId?: string) {
    const suffix = registerId ? `?registerId=${encodeURIComponent(registerId)}` : '';
    return apiRequest<CashReconciliationResponse>(`/cash-register/reconciliation${suffix}`);
  },

  openRegister(payload: OpenCashRegisterRequest) {
    return apiRequest('/cash-register/open', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  recordMovement(payload: CreateCashMovementRequest) {
    return apiRequest('/cash-register/movements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  closeRegister(payload: CloseCashRegisterRequest) {
    return apiRequest('/cash-register/close', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
