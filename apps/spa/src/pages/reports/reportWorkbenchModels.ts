import type { FinancialPayableRecord } from '@/services/financialPayables';
import type { FinancialReceivableListItem } from '@/types/financialReceivables';

export type ReportKey =
  | 'audit-appointments'
  | 'cash-drawer'
  | 'cash-flow'
  | 'dre'
  | 'packages'
  | 'accounts-receivable'
  | 'received-accounts'
  | 'accounts-payable'
  | 'paid-accounts'
  | 'cheques'
  | 'advance-payments'
  | 'sales-counter-sales'
  | 'produced-items'
  | 'production'
  | 'appointments'
  | 'professional-care'
  | 'service-invoices'
  | 'register-services'
  | 'register-owners'
  | 'register-patients'
  | 'register-suppliers'
  | 'deleted-sales-counter-sales'
  | 'inventory-stock'
  | 'inventory-movements'
  | 'inventory-invoices'
  | 'inventory-products';

export interface ChequeReportRow extends Record<string, unknown> {
  readonly paymentId: string;
  readonly counterSaleId: string;
  readonly saleNumber: string;
  readonly saleStatus: string;
  readonly reference: string | null;
  readonly amount: number;
  readonly installments: number;
  readonly recordedAt: string;
  readonly notes: string | null;
}

export interface AdvancePaymentReportRow extends Record<string, unknown> {
  readonly paymentId: string;
  readonly ownerName: string;
  readonly documentId: string;
  readonly issuedAt: string;
  readonly originalAmount: number;
  readonly compensatedAmount: number;
  readonly balance: number;
  readonly origin: string;
  readonly status: 'available' | 'partially_compensated' | 'compensated';
  readonly notes: string;
}

export interface SupplierReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryProductReportRow extends Record<string, unknown> {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryStockReportRow extends Record<string, unknown> {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly stockValue: number;
  readonly reorderStatus: 'below_reorder_level' | 'adequate';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryMovementReportRow extends Record<string, unknown> {
  readonly movementId: string;
  readonly occurredAt: string;
  readonly movementType: 'adjustment' | 'inbound' | 'outbound' | 'transfer' | 'consumption';
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly quantityDelta: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly unitCostAmount: number;
  readonly reason: string;
  readonly reference: string;
  readonly recordedByUserId: string;
}

export interface InventoryPurchaseReportRow extends Record<string, unknown> {
  readonly purchaseId: string;
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly status: 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  readonly totalAmount: number;
  readonly receivedAmount: number;
  readonly payableId: string | null;
  readonly createdByUserId: string;
  readonly approvedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly receivedAt: string | null;
}

export interface ServiceInvoiceReportRow extends Record<string, unknown> {
  readonly documentId: string;
  readonly serie: string;
  readonly numero: number;
  readonly competencia: string;
  readonly status: 'draft' | 'issued' | 'cancelled' | 'error';
  readonly customerName: string;
  readonly customerDocument: string;
  readonly provider: string;
  readonly serviceDescriptions: string;
  readonly serviceCodes: string;
  readonly serviceQuantity: number;
  readonly serviceSubtotal: number;
  readonly totalIss: number;
  readonly totalPis: number;
  readonly totalCofins: number;
  readonly totalCsll: number;
  readonly totalIrrf: number;
  readonly totalInss: number;
  readonly totalDocument: number;
  readonly observations: string;
  readonly createdAt: string;
  readonly authorizationCode: string;
}

export interface AppointmentReportRow extends Record<string, unknown> {
  readonly appointmentId: string;
  readonly scheduledAt: string;
  readonly status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  readonly reason: string;
  readonly patientId: string;
  readonly ownerId: string;
  readonly practitionerStaffId: string | null;
  readonly serviceId: string | null;
  readonly unit: string | null;
  readonly specialty: string | null;
  readonly resourceLabel: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProfessionalCareReportRow extends Record<string, unknown> {
  readonly professional: string;
  readonly scheduled: number;
  readonly completed: number;
  readonly checkedIn: number;
  readonly cancelled: number;
  readonly services: number;
}

export interface RegisterServicesReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly basePrice: number;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
}

export interface RegisterOwnersReportRow extends Record<string, unknown> {
  readonly documentId: string;
  readonly fullName: string;
  readonly primaryContact: string;
  readonly city: string;
  readonly financialResponsible: 'Sim' | 'Não';
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
}

export interface RegisterPatientsReportRow extends Record<string, unknown> {
  readonly code: string;
  readonly name: string;
  readonly species: string;
  readonly breed: string;
  readonly sex: 'male' | 'female' | 'unknown';
  readonly microchip: string;
  readonly status: 'active' | 'inactive' | 'deceased';
  readonly createdAt: string;
}

export interface FinancialPayableReportRow extends Record<string, unknown> {
  readonly id: string;
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly status: FinancialPayableRecord['status'];
  readonly paymentMethod: FinancialPayableRecord['paymentMethod'];
  readonly reconciliationStatus: FinancialPayableRecord['reconciliationStatus'];
}

export interface FinancialReceivableReportRow extends Record<string, unknown> {
  readonly id: string;
  readonly patientName: string;
  readonly ownerName: string;
  readonly patientSpecies: string | null;
  readonly encounterId: string;
  readonly installmentNumber: number;
  readonly installmentLabel: string;
  readonly issuedAt: string;
  readonly dueAt: string | null;
  readonly settledAt: string | null;
  readonly amountOriginal: number;
  readonly amountPaid: number;
  readonly amountOutstanding: number;
  readonly status: 'open' | 'settled';
  readonly financialStatus: FinancialReceivableListItem['financialStatus'];
  readonly encounterStatus: FinancialReceivableListItem['encounterStatus'];
  readonly paymentCount: number;
}

export type FinancialPayableServerRow = {
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly status: FinancialPayableRecord['status'];
  readonly paymentMethod: FinancialPayableRecord['paymentMethod'];
  readonly reconciliationStatus: FinancialPayableRecord['reconciliationStatus'];
} & Record<string, unknown>;

export type FinancialReceivableServerRow = {
  readonly patientName: string;
  readonly ownerName: string;
  readonly patientSpecies: string | null;
  readonly encounterId: string;
  readonly installmentNumber: number;
  readonly installmentLabel: string;
  readonly issuedAt: string;
  readonly dueAt: string | null;
  readonly settledAt: string | null;
  readonly amountOriginal: number;
  readonly amountPaid: number;
  readonly amountOutstanding: number;
  readonly status: 'open' | 'settled';
  readonly financialStatus: FinancialReceivableListItem['financialStatus'];
  readonly encounterStatus: FinancialReceivableListItem['encounterStatus'];
  readonly paymentCount: number;
} & Record<string, unknown>;
