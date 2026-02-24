import { api } from '@/lib/api/client';

// Types
export type InvoiceStatus = 'open' | 'paid' | 'partial' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface Invoice {
  id: string;
  accountId: string;
  encounterId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discount: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  notes: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  accountId: string;
  invoiceId: string;
  paymentNumber: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedByUserId: string;
  receivedAt: string;
  createdAt: string;
}

export interface BillingItemSummary {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  status: string;
}

export interface InvoiceWithDetails {
  invoice: Invoice;
  encounter?: {
    id: string;
    patientId: string;
    patientName: string;
    patientSpecies: string;
    ownerName: string;
  };
  payments: Payment[];
  billingItems: BillingItemSummary[];
}

export interface InvoiceListResponse {
  items: InvoiceWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CashReportResponse {
  date: string;
  totalReceived: string;
  paymentCount: number;
  byMethod: {
    method: PaymentMethod;
    count: number;
    total: string;
  }[];
  payments: Payment[];
}

// Invoice API functions

export async function listInvoices(params?: {
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<InvoiceListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.startDate) queryParams.startDate = params.startDate;
  if (params?.endDate) queryParams.endDate = params.endDate;
  if (params?.page) queryParams.page = params.page;
  if (params?.pageSize) queryParams.pageSize = params.pageSize;

  return api.get<InvoiceListResponse>('/billing/invoices', queryParams);
}

export async function getInvoice(invoiceId: string): Promise<InvoiceWithDetails> {
  return api.get<InvoiceWithDetails>(`/billing/invoices/${invoiceId}`);
}

export async function createInvoiceFromEncounter(encounterId: string, data?: {
  discount?: number;
  notes?: string;
}): Promise<{ id: string; invoiceNumber: string; total: string }> {
  return api.post<{ id: string; invoiceNumber: string; total: string }>(
    `/billing/invoices/from-encounter/${encounterId}`,
    data ?? {}
  );
}

export async function cancelInvoice(invoiceId: string, reason: string): Promise<{ id: string; status: string }> {
  return api.post<{ id: string; status: string }>(
    `/billing/invoices/${invoiceId}/cancel`,
    { reason }
  );
}

// Payment API functions

export async function listPayments(params?: {
  invoiceId?: string;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaymentListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.invoiceId) queryParams.invoiceId = params.invoiceId;
  if (params?.method) queryParams.method = params.method;
  if (params?.startDate) queryParams.startDate = params.startDate;
  if (params?.endDate) queryParams.endDate = params.endDate;
  if (params?.page) queryParams.page = params.page;
  if (params?.pageSize) queryParams.pageSize = params.pageSize;

  return api.get<PaymentListResponse>('/billing/invoices/payments', queryParams);
}

export async function createPayment(invoiceId: string, data: {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}): Promise<{ id: string; paymentNumber: string; amount: string }> {
  return api.post<{ id: string; paymentNumber: string; amount: string }>(
    `/billing/invoices/${invoiceId}/payments`,
    data
  );
}

// Cash Report API function

export async function getCashReport(date?: string): Promise<CashReportResponse> {
  const queryParams = date ? { date } : undefined;
  return api.get<CashReportResponse>('/billing/invoices/cash-report', queryParams);
}
