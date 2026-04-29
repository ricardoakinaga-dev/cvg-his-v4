export type FinancialReceivableStatus = 'open' | 'settled';

export interface FinancialReceivablePayment {
  id: string;
  receivableId: string;
  financialAccountId: string;
  encounterId: string;
  amountPaid: number;
  paidAt: string;
  paidByUserId: string | null;
  externalReferenceType: 'pix_transaction' | 'cash_movement' | 'billing_record' | 'other' | null;
  externalReferenceId: string | null;
  notes: string | null;
}

export interface FinancialReceivableListItem {
  id: string;
  encounterId: string;
  financialAccountId: string;
  installmentNumber: number;
  installmentLabel: string;
  dueAt: string | null;
  status: FinancialReceivableStatus;
  amountOriginal: number;
  amountPaid: number;
  amountOutstanding: number;
  issuedAt: string;
  settledAt: string | null;
  notes: string | null;
  payments: FinancialReceivablePayment[];
  encounterStatus: 'open' | 'closed';
  patientId: string;
  patientName: string;
  patientSpecies: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhoneMain: string | null;
  financialStatus: 'pending' | 'partial' | 'paid';
  totalAmount: number;
  lastClosedAt: string | null;
}

export interface FinancialReceivableListResponse {
  data: FinancialReceivableListItem[];
  page: number;
  pageSize: number;
  total: number;
  openCount: number;
  settledCount: number;
  totalOutstanding: number;
  totalSettled: number;
}

export interface FinancialReceivableListFilters {
  search?: string;
  status?: '' | FinancialReceivableStatus;
  page?: number;
  pageSize?: number;
}
