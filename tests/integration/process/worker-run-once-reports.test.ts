import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const runOncePath = resolve(ROOT, 'apps/worker/src/run-once.ts');
const tenantId = randomUUID();
const accountId = randomUUID();
const otherAccountId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();
const reportServiceUserId = randomUUID();
const otherReportServiceUserId = randomUUID();
const scheduleId = `report-run-once-${randomUUID()}`;
const deliveryScheduleId = `report-run-once-delivery-${randomUUID()}`;
const failedDeliveryScheduleId = `report-run-once-failed-${randomUUID()}`;
const sigkillDeliveryScheduleId = `report-run-once-sigkill-${randomUUID()}`;
const leaseDeliveryScheduleId = `report-run-once-lease-${randomUUID()}`;
const chequeScheduleId = `report-run-once-cheques-${randomUUID()}`;
const payableScheduleId = `report-run-once-payables-${randomUUID()}`;
const advancePaymentScheduleId = `report-run-once-advance-payments-${randomUUID()}`;
const fiscalServiceInvoiceScheduleId = `report-run-once-fiscal-service-invoices-${randomUUID()}`;
const deletedSalesScheduleId = `report-run-once-deleted-sales-${randomUUID()}`;
const otherDeletedSalesScheduleId = `report-run-once-other-deleted-sales-${randomUUID()}`;
const fiscalDocumentId = `nfse-run-once-${randomUUID()}`;
const unsupportedScheduleId = `report-run-once-unsupported-${randomUUID()}`;
const unknownScheduleId = `report-run-once-unknown-${randomUUID()}`;
const chequeSaleId = randomUUID();
const chequePaymentId = randomUUID();
const otherChequeScheduleId = `report-run-once-other-cheques-${randomUUID()}`;
const otherChequeSaleId = randomUUID();
const otherChequePaymentId = randomUUID();
const deletedSaleId = randomUUID();
const otherDeletedSaleId = randomUUID();
const advanceOwnerId = randomUUID();
const otherAdvanceOwnerId = randomUUID();
const wrongSearchAdvanceOwnerId = randomUUID();
const advancePaymentId = randomUUID();
const otherAdvancePaymentId = randomUUID();
const wrongStatusAdvancePaymentId = randomUUID();
const wrongSearchAdvancePaymentId = randomUUID();
const outsideDateAdvancePaymentId = randomUUID();
const advanceAllocationId = randomUUID();
const payableId = `payable-run-once-${randomUUID()}`;
const otherPayableId = `payable-run-once-other-${randomUUID()}`;
const wrongStatusPayableId = `payable-run-once-wrong-status-${randomUUID()}`;
const wrongSearchPayableId = `payable-run-once-wrong-search-${randomUUID()}`;
const outsideDatePayableId = `payable-run-once-outside-date-${randomUUID()}`;
const receivableScheduleId = `report-run-once-receivables-${randomUUID()}`;
const otherReceivableScheduleId = `report-run-once-other-receivables-${randomUUID()}`;
const overflowReceivableScheduleId = `report-run-once-overflow-receivables-${randomUUID()}`;
const fallbackReceivableScheduleId = `report-run-once-fallback-receivables-${randomUUID()}`;
const scheduledServicesScheduleId = `report-run-once-services-${randomUUID()}`;
const otherScheduledServicesScheduleId = `report-run-once-other-services-${randomUUID()}`;
const scheduledServiceId = randomUUID();
const otherScheduledServiceId = randomUUID();
const scheduledSuppliersScheduleId = `report-run-once-suppliers-${randomUUID()}`;
const otherScheduledSuppliersScheduleId = `report-run-once-other-suppliers-${randomUUID()}`;
const scheduledSupplierId = `DES-${randomUUID()}`;
const otherScheduledSupplierId = `DES-${randomUUID()}`;
const scheduledSupplierNoiseId = `DES-${randomUUID()}`;
const scheduledOwnersScheduleId = `report-run-once-owners-${randomUUID()}`;
const otherScheduledOwnersScheduleId = `report-run-once-other-owners-${randomUUID()}`;
const scheduledOwnerId = randomUUID();
const otherScheduledOwnerId = randomUUID();
const scheduledOwnerNoiseId = randomUUID();
const scheduledPatientsScheduleId = `report-run-once-patients-${randomUUID()}`;
const otherScheduledPatientsScheduleId = `report-run-once-other-patients-${randomUUID()}`;
const scheduledPatientId = randomUUID();
const otherScheduledPatientId = randomUUID();
const scheduledPatientNoiseId = randomUUID();
const scheduledCommissionsScheduleId = `report-run-once-commissions-${randomUUID()}`;
const otherScheduledCommissionsScheduleId = `report-run-once-other-commissions-${randomUUID()}`;
const scheduledCommissionCalculationId = `comm_calc_${randomUUID()}`;
const scheduledCommissionPaidCalculationId = `comm_calc_paid_${randomUUID()}`;
const otherScheduledCommissionCalculationId = `comm_calc_other_${randomUUID()}`;
const scheduledCommissionLineId = `comm_line_${randomUUID()}`;
const scheduledCommissionSecondLineId = `comm_line_${randomUUID()}`;
const scheduledCommissionPaidLineId = `comm_line_${randomUUID()}`;
const otherScheduledCommissionLineId = `comm_line_${randomUUID()}`;
const scheduledCommissionStaffId = randomUUID();
const otherScheduledCommissionStaffId = randomUUID();
const scheduledInventoryProductsScheduleId = `report-run-once-inventory-products-${randomUUID()}`;
const otherScheduledInventoryProductsScheduleId = `report-run-once-other-inventory-products-${randomUUID()}`;
const scheduledInventoryStockScheduleId = `report-run-once-inventory-stock-${randomUUID()}`;
const otherScheduledInventoryStockScheduleId = `report-run-once-other-inventory-stock-${randomUUID()}`;
const scheduledInventoryMovementsScheduleId = `report-run-once-inventory-movements-${randomUUID()}`;
const otherScheduledInventoryMovementsScheduleId = `report-run-once-other-inventory-movements-${randomUUID()}`;
const scheduledInventoryInvoicesScheduleId = `report-run-once-inventory-invoices-${randomUUID()}`;
const otherScheduledInventoryInvoicesScheduleId = `report-run-once-other-inventory-invoices-${randomUUID()}`;
const scheduledInventoryItemId = randomUUID();
const otherScheduledInventoryItemId = randomUUID();
const scheduledInventoryNoiseItemId = randomUUID();
const scheduledInventoryStockItemId = randomUUID();
const otherScheduledInventoryStockItemId = randomUUID();
const scheduledInventoryPurchaseId = `purchase-run-once-invoice-${randomUUID()}`;
const scheduledInventoryBlankInvoicePurchaseId = `purchase-run-once-blank-invoice-${randomUUID()}`;
const scheduledInventoryWrongStatusPurchaseId = `purchase-run-once-wrong-status-${randomUUID()}`;
const scheduledInventoryWrongSearchPurchaseId = `purchase-run-once-wrong-search-${randomUUID()}`;
const scheduledInventoryOutsideDatePurchaseId = `purchase-run-once-outside-date-${randomUUID()}`;
const scheduledInventoryBoundaryPurchaseId = `purchase-run-once-boundary-${randomUUID()}`;
const otherScheduledInventoryPurchaseId = `purchase-run-once-other-invoice-${randomUUID()}`;
const scheduledInventoryMovementLowerId = `movement-run-once-lower-${randomUUID()}`;
const scheduledInventoryMovementUpperId = `movement-run-once-upper-${randomUUID()}`;
const otherScheduledInventoryMovementId = `movement-run-once-other-${randomUUID()}`;
const receivableOwnerId = randomUUID();
const otherReceivableOwnerId = randomUUID();
const receivablePatientId = randomUUID();
const otherReceivablePatientId = randomUUID();
const receivableEncounterId = randomUUID();
const otherReceivableEncounterId = randomUUID();
const receivableFinancialAccountId = randomUUID();
const otherReceivableFinancialAccountId = randomUUID();
const receivableId = randomUUID();
const settledReceivableId = randomUUID();
const wrongSearchReceivableId = randomUUID();
const outsideDateReceivableId = randomUUID();
const fallbackReceivableId = randomUUID();
const otherReceivableId = randomUUID();
const receivablePaymentId = randomUUID();
const otherReceivablePaymentId = randomUUID();

async function runOnce(
  overrides: Readonly<Record<string, string>>,
  onSpawn?: (child: ChildProcess) => void
): Promise<{
  readonly result: { readonly code: number | null; readonly signal: NodeJS.Signals | null };
  readonly output: string;
}> {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', runOncePath], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB_URL,
      WORKER_ACCOUNT_ID: accountId,
      WORKER_REPORTS_USER_ID: reportServiceUserId,
      OTEL_ENABLED: 'false',
      ...overrides
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  onSpawn?.(child);

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  const result = await new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClose) => {
    child.once('close', (code, signal) => resolveClose({ code, signal }));
  });
  return { result, output };
}

describe('worker run-once scheduled reports boundary', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Run once reports tenant', 'active', now())`,
      [tenantId, `run-once-reports-${tenantId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Run once reports account', true)`,
      [accountId, tenantId, `run-once-reports-${accountId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Run once other reports account', true)`,
      [otherAccountId, tenantId, `run-once-reports-${otherAccountId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'run-once-test-hash', 'Run once reports operator')`,
      [userId, accountId, `run-once-${userId}`, `run-once-${userId}@example.test`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'run-once-test-hash', 'Run once other reports operator')`,
      [
        otherUserId,
        otherAccountId,
        `run-once-${otherUserId}`,
        `run-once-${otherUserId}@example.test`
      ]
    );
    await pool.query(
      `INSERT INTO users (
         id, account_id, username, email, password_hash, full_name,
         principal_kind, interactive_login_enabled
       ) VALUES ($1, $2, $3, $4, 'run-once-service-hash',
         'Run once report service', 'service', false),
         ($5, $6, $7, $8, 'run-once-service-hash',
         'Run once other report service', 'service', false)`,
      [
        reportServiceUserId,
        accountId,
        `run-once-report-service-${reportServiceUserId}`,
        `run-once-report-service-${reportServiceUserId}@example.test`,
        otherReportServiceUserId,
        otherAccountId,
        `run-once-report-service-${otherReportServiceUserId}`,
        `run-once-report-service-${otherReportServiceUserId}@example.test`
      ]
    );
    await pool.query(
      `INSERT INTO account_service_principals (account_id, purpose, user_id)
       VALUES ($1, 'report-execution', $2), ($3, 'report-execution', $4)`,
      [accountId, reportServiceUserId, otherAccountId, otherReportServiceUserId]
    );
    await pool.query(
      `INSERT INTO staff (id, account_id, employee_code, full_name)
       VALUES ($1, $2, 'COMM-A', 'Comissão Account A'),
              ($3, $4, 'COMM-B', 'Comissão Account B')`,
      [scheduledCommissionStaffId, accountId, otherScheduledCommissionStaffId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO commission_calculations (
         id, account_id, calculation_number, period_start, period_end, status,
         total_base_amount, total_commission_amount, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'COM-RUN-ONCE-A', '2026-05-01', '2026-05-28', 'reviewed',
          3000, 450, $3, '2026-05-29T09:00:00.000Z', '2026-05-29T09:00:00.000Z'),
         ($4, $2, 'COM-RUN-ONCE-A-PAID', '2026-04-01', '2026-04-30', 'cancelled',
          1000, 100, $3, '2026-04-30T09:00:00.000Z', '2026-04-30T09:00:00.000Z'),
         ($5, $6, 'COM-RUN-ONCE-B', '2026-05-01', '2026-05-28', 'reviewed',
          2500, 375, $7, '2026-05-29T08:00:00.000Z', '2026-05-29T08:00:00.000Z')`,
      [
        scheduledCommissionCalculationId,
        accountId,
        userId,
        scheduledCommissionPaidCalculationId,
        otherScheduledCommissionCalculationId,
        otherAccountId,
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO commission_lines (
         id, account_id, calculation_id, staff_id, staff_name, item_kind,
         source_type, source_id, source_description, base_amount, percentage,
         commission_amount, occurred_at
       ) VALUES
         ($1, $2, $3, $4, 'Comissão Account A', 'service', 'manual',
          'commission-source-a-1', 'Consulta A', 1500, 15, 225, '2026-05-10'),
         ($5, $2, $3, $4, 'Comissão Account A', 'service', 'manual',
          'commission-source-a-2', 'Retorno A', 1500, 15, 225, '2026-05-11'),
         ($6, $2, $7, $4, 'Comissão Account A', 'service', 'manual',
          'commission-source-a-paid', 'Pago A', 1000, 10, 100, '2026-04-10'),
         ($8, $9, $10, $11, 'Comissão Account B', 'service', 'manual',
          'commission-source-b-1', 'Consulta B', 2500, 15, 375, '2026-05-12')`,
      [
        scheduledCommissionLineId,
        accountId,
        scheduledCommissionCalculationId,
        scheduledCommissionStaffId,
        scheduledCommissionSecondLineId,
        scheduledCommissionPaidLineId,
        scheduledCommissionPaidCalculationId,
        otherScheduledCommissionLineId,
        otherAccountId,
        otherScheduledCommissionCalculationId,
        otherScheduledCommissionStaffId
      ]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $2, 'SKU-SURG-%-A', 'Surgical saline A', 'bottle', 12.50, 5.00, 4.20,
           '2026-05-31T23:59:59.999Z', '2026-06-01T00:00:00.000Z'),
         ($3, $4, 'SKU-SURG-B', 'Surgical saline B', 'bottle', 8.00, 3.00, 6.50,
           '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($5, $2, 'SKU-SURG-NOISE', 'Surgical saline outside window', 'bottle', 1.00, 2.00, 7.00,
           '2026-05-15T00:00:00.000Z', '2026-05-15T00:00:00.000Z')`,
      [
        scheduledInventoryItemId,
        accountId,
        otherScheduledInventoryItemId,
        otherAccountId,
        scheduledInventoryNoiseItemId
      ]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $2, 'SKU-STOCK-A', 'Low stock A', 'bottle', 1.25, 2.00, 4.56,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($3, $4, 'SKU-STOCK-B', 'Healthy stock B', 'bottle', 8.00, 3.00, 6.50,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z')`,
      [scheduledInventoryStockItemId, accountId, otherScheduledInventoryStockItemId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO inventory_purchases (
         id, account_id, supplier_name, invoice_number, status, total_amount, received_amount,
         payable_id, created_by_user_id, approved_by_user_id, created_at, updated_at, received_at
       ) VALUES
         ($1, $2, 'Fornecedor Alpha', 'NF-A-001', 'received', 125.50, 125.50,
           'payable-invoice-a', $3, $3, '2026-05-31T23:59:59.999Z', '2026-06-01T00:00:00.000Z',
           '2026-06-01T00:00:00.000Z'),
         ($4, $2, 'Fornecedor Alpha', '   ', 'received', 10.00, 0.00,
           NULL, $3, NULL, '2026-05-15T10:00:00.000Z', '2026-05-15T10:00:00.000Z', NULL),
         ($5, $2, 'Fornecedor Alpha', 'NF-A-002', 'approved', 90.00, 0.00,
           'payable-wrong-status', $3, NULL, '2026-05-20T10:00:00.000Z', '2026-05-20T10:00:00.000Z', NULL),
         ($6, $2, 'Fornecedor Other', 'NF-Z-001', 'received', 80.00, 80.00,
           'payable-wrong-search', $3, $3, '2026-05-21T10:00:00.000Z', '2026-05-21T10:00:00.000Z',
           '2026-05-21T10:00:00.000Z'),
         ($7, $2, 'Fornecedor Alpha', 'NF-A-003', 'received', 70.00, 70.00,
           'payable-outside-date', $3, $3, '2026-04-30T10:00:00.000Z', '2026-04-30T10:00:00.000Z',
           '2026-04-30T10:00:00.000Z'),
         ($8, $2, 'Fornecedor Alpha', 'NF-A-000', 'received', 60.00, 60.00,
           'payable-boundary', $3, $3, '2026-05-01T00:30:00.000Z', '2026-05-01T00:30:00.000Z',
           '2026-05-01T00:30:00.000Z')`,
      [
        scheduledInventoryPurchaseId,
        accountId,
        userId,
        scheduledInventoryBlankInvoicePurchaseId,
        scheduledInventoryWrongStatusPurchaseId,
        scheduledInventoryWrongSearchPurchaseId,
        scheduledInventoryOutsideDatePurchaseId,
        scheduledInventoryBoundaryPurchaseId
      ]
    );
    await pool.query(
      `INSERT INTO inventory_purchases (
         id, account_id, supplier_name, invoice_number, status, total_amount, received_amount,
         payable_id, created_by_user_id, approved_by_user_id, created_at, updated_at, received_at
       ) VALUES
         ($1, $2, 'Fornecedor Beta', 'NF-B-001', 'partially_received', 200.00, 80.00,
           'payable-invoice-b', $3, $3, '2026-05-15T12:00:00.000Z', '2026-05-16T12:00:00.000Z',
           '2026-05-16T12:00:00.000Z')`,
      [otherScheduledInventoryPurchaseId, otherAccountId, otherUserId]
    );
    await pool.query(
      `INSERT INTO counter_sales (
         id, account_id, number, status, subtotal, discount_amount, total,
         paid_amount, balance_due, opened_by_user_id, closed_by_user_id, closed_at,
         created_at, updated_at
       ) VALUES ($1, $2, $3, 'closed', 125.50, 0, 125.50, 125.50, 0, $4, $4, now(), now(), now())`,
      [chequeSaleId, accountId, `CHEQUE-${chequeSaleId.slice(0, 8)}`, userId]
    );
    await pool.query(
      `INSERT INTO counter_sale_payments (
         id, counter_sale_id, account_id, method, amount, installments, reference, notes, created_at
       ) VALUES ($1, $2, $3, 'check', 125.50, 2, 'CHK-RUN-ONCE', 'worker persisted cheque', now() - interval '1 minute')`,
      [chequePaymentId, chequeSaleId, accountId]
    );
    await pool.query(
      `INSERT INTO counter_sales (
         id, account_id, number, status, subtotal, discount_amount, total,
         paid_amount, balance_due, opened_by_user_id, closed_by_user_id, closed_at,
         created_at, updated_at
       ) VALUES ($1, $2, $3, 'closed', 275.75, 0, 275.75, 275.75, 0, $4, $4, now(), now(), now())`,
      [otherChequeSaleId, otherAccountId, `CHEQUE-${otherChequeSaleId.slice(0, 8)}`, otherUserId]
    );
    await pool.query(
      `INSERT INTO counter_sale_payments (
         id, counter_sale_id, account_id, method, amount, installments, reference, notes, created_at
       ) VALUES ($1, $2, $3, 'check', 275.75, 1, 'CHK-RUN-ONCE-OTHER', 'other worker persisted cheque', now() - interval '1 minute')`,
      [otherChequePaymentId, otherChequeSaleId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO counter_sales (
         id, account_id, number, status, subtotal, discount_amount, total,
         paid_amount, balance_due, notes, opened_by_user_id, closed_by_user_id,
         closed_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'cancelled', 100, 10, 90, 0, 90, $4, $5, NULL,
         NULL, '2026-05-15T10:00:00.000Z', '2026-05-15T11:00:00.000Z')`,
      [
        deletedSaleId,
        accountId,
        `CANCELLED-${deletedSaleId.slice(0, 8)}`,
        'cancelada account-a',
        userId
      ]
    );
    await pool.query(
      `INSERT INTO counter_sales (
         id, account_id, number, status, subtotal, discount_amount, total,
         paid_amount, balance_due, notes, opened_by_user_id, closed_by_user_id,
         closed_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'cancelled', 200, 20, 180, 0, 180, $4, $5, NULL,
         NULL, '2026-05-15T12:00:00.000Z', '2026-05-15T13:00:00.000Z')`,
      [
        otherDeletedSaleId,
        otherAccountId,
        `CANCELLED-${otherDeletedSaleId.slice(0, 8)}`,
        'cancelada account-b',
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, document)
       VALUES ($1, $2, 'Advance Owner', 'DOC-ADV-1')`,
      [advanceOwnerId, accountId]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, document)
       VALUES ($1, $2, 'Other Advance Owner', 'DOC-ADV-OTHER')`,
      [otherAdvanceOwnerId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, document)
       VALUES ($1, $2, 'Wrong Search Owner', 'DOC-ADV-NOMATCH')`,
      [wrongSearchAdvanceOwnerId, accountId]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $2, 'Receivable Owner A'), ($3, $4, 'Receivable Owner B')`,
      [receivableOwnerId, accountId, otherReceivableOwnerId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $2, $3, 'Receivable Patient A', 'Canino'),
              ($4, $5, $6, 'Receivable Patient B', 'Felino')`,
      [
        receivablePatientId,
        accountId,
        receivableOwnerId,
        otherReceivablePatientId,
        otherAccountId,
        otherReceivableOwnerId
      ]
    );
    await pool.query(
      `INSERT INTO patients (
         id, account_id, owner_id, name, species, breed, sex, microchip, alerts_json,
         created_at, updated_at
       ) VALUES
         ($1, $2, $3, 'Paciente Account A', 'canine', 'SRD', 'female', 'MC-A-001',
           '{"legacyVetusId":"VETUS-PATIENT-A","status":"active","notes":"private patient note A"}'::jsonb,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($4, $5, $6, 'Paciente Account B', 'feline', NULL, NULL, NULL,
           '{"status":"inactive","notes":"private patient note B"}'::jsonb,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($7, $2, $3, 'Paciente Fora da Janela', 'canine', 'SRD', 'male', 'MC-NOISE',
           '{"legacyVetusId":"VETUS-PATIENT-NOISE","status":"active"}'::jsonb,
           '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z')`,
      [
        scheduledPatientId,
        accountId,
        receivableOwnerId,
        otherScheduledPatientId,
        otherAccountId,
        otherReceivableOwnerId,
        scheduledPatientNoiseId
      ]
    );
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id,
         opened_at, reason, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'open', $5, '2026-05-01T08:00:00.000Z',
         'Receivable worker fixture', '2026-05-01T08:00:00.000Z', '2026-05-01T08:00:00.000Z'),
              ($6, $7, $8, $9, 'closed', $10, '2026-05-02T08:00:00.000Z',
         'Other receivable worker fixture', '2026-05-02T08:00:00.000Z', '2026-05-20T08:00:00.000Z')`,
      [
        receivableEncounterId,
        accountId,
        receivablePatientId,
        receivableOwnerId,
        userId,
        otherReceivableEncounterId,
        otherAccountId,
        otherReceivablePatientId,
        otherReceivableOwnerId,
        otherUserId
      ]
    );
    await pool.query(
      `UPDATE encounters
          SET closed_by_user_id = $1, closed_at = '2026-05-20T08:00:00.000Z'
        WHERE id = $2 AND account_id = $3`,
      [otherUserId, otherReceivableEncounterId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO encounter_financial_accounts (
         id, account_id, encounter_id, financial_status, subtotal_snapshot,
         discount_total_snapshot, total_snapshot, paid_amount, balance_due,
         notes, snapshot_json, created_at, updated_at
       ) VALUES ($1, $2, $3, 'partial', 1000, 0, 1000, 150, 850,
         'Receivable worker account A', '{}'::text, '2026-05-01T08:00:00.000Z', '2026-05-20T08:00:00.000Z'),
              ($4, $5, $6, 'paid', 80, 0, 80, 80, 0,
         'Receivable worker account B', '{}'::text, '2026-05-02T08:00:00.000Z', '2026-05-20T08:00:00.000Z')`,
      [
        receivableFinancialAccountId,
        accountId,
        receivableEncounterId,
        otherReceivableFinancialAccountId,
        otherAccountId,
        otherReceivableEncounterId
      ]
    );
    await pool.query(
      `INSERT INTO encounter_receivables (
         id, account_id, encounter_id, financial_account_id, installment_number,
         installment_label, due_at, status, amount_original, amount_paid,
         amount_outstanding, issued_at, settled_at, notes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 5, 'Fallback sem vencimento', NULL, 'open',
         10, 0, 10, '2026-05-25T00:00:00.000Z', NULL, 'fallback receivable',
         '2026-05-25T08:00:00.000Z', '2026-05-25T08:00:00.000Z')`,
      [fallbackReceivableId, accountId, receivableEncounterId, receivableFinancialAccountId]
    );
    await pool.query(
      `INSERT INTO encounter_receivables (
         id, account_id, encounter_id, financial_account_id, installment_number,
         installment_label, due_at, status, amount_original, amount_paid,
         amount_outstanding, issued_at, settled_at, notes, created_at, updated_at
       ) VALUES
         ($1, $2, $3, $4, 1, 'Consulta A', '2026-05-15T00:00:00.000Z', 'open',
           200, 50, 150, '2026-05-01T00:00:00.000Z', NULL, 'target receivable',
           '2026-05-01T08:00:00.000Z', '2026-05-20T08:00:00.000Z'),
         ($5, $2, $3, $4, 2, 'Consulta A liquidada', '2026-05-18T00:00:00.000Z', 'settled',
           100, 100, 0, '2026-05-01T00:00:00.000Z', '2026-05-19T00:00:00.000Z', 'wrong status receivable',
           '2026-05-01T08:00:00.000Z', '2026-05-20T08:00:00.000Z'),
         ($6, $2, $3, $4, 3, 'Outro paciente', '2026-05-20T00:00:00.000Z', 'open',
           300, 0, 300, '2026-05-01T00:00:00.000Z', NULL, 'wrong search receivable',
           '2026-05-01T08:00:00.000Z', '2026-05-20T08:00:00.000Z'),
         ($7, $2, $3, $4, 4, 'Consulta fora da janela', '2026-06-01T00:00:00.000Z', 'open',
           400, 0, 400, '2026-06-01T00:00:00.000Z', NULL, 'outside date receivable',
           '2026-06-01T08:00:00.000Z', '2026-06-01T08:00:00.000Z'),
         ($8, $9, $10, $11, 1, 'Consulta B', '2026-05-10T00:00:00.000Z', 'settled',
           80, 80, 0, '2026-05-02T00:00:00.000Z', '2026-05-18T00:00:00.000Z', 'other account receivable',
           '2026-05-02T08:00:00.000Z', '2026-05-20T08:00:00.000Z')`,
      [
        receivableId,
        accountId,
        receivableEncounterId,
        receivableFinancialAccountId,
        settledReceivableId,
        wrongSearchReceivableId,
        outsideDateReceivableId,
        otherReceivableId,
        otherAccountId,
        otherReceivableEncounterId,
        otherReceivableFinancialAccountId
      ]
    );
    await pool.query(
      `INSERT INTO encounter_receivable_payments (
         id, account_id, encounter_id, financial_account_id, receivable_id,
         amount_paid, paid_at, paid_by_user_id, notes, created_at
       ) VALUES
         ($1, $2, $3, $4, $5, 50, '2026-05-16T00:00:00.000Z', $6,
           'target payment', '2026-05-16T00:00:00.000Z'),
         ($7, $8, $9, $10, $11, 80, '2026-05-18T00:00:00.000Z', $12,
           'other account payment', '2026-05-18T00:00:00.000Z')`,
      [
        receivablePaymentId,
        accountId,
        receivableEncounterId,
        receivableFinancialAccountId,
        receivableId,
        userId,
        otherReceivablePaymentId,
        otherAccountId,
        otherReceivableEncounterId,
        otherReceivableFinancialAccountId,
        otherReceivableId,
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO encounter_receivables (
         account_id, encounter_id, financial_account_id, installment_number,
         installment_label, due_at, status, amount_original, amount_paid,
         amount_outstanding, issued_at, settled_at, notes, created_at, updated_at
       )
       SELECT $1, $2, $3, series,
              'Overflow ' || series, '2026-05-15T00:00:00.000Z', 'open',
              1, 0, 1, '2026-05-01T00:00:00.000Z', NULL,
              'overflow receivable fixture', '2026-05-01T08:00:00.000Z',
              '2026-05-01T08:00:00.000Z'
         FROM generate_series(100, 10100) AS series`,
      [accountId, receivableEncounterId, receivableFinancialAccountId]
    );
    await pool.query(
      `INSERT INTO advance_payments (
         id, account_id, owner_id, amount_cents, currency, source_type,
         source_id, notes, issued_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 10000, 'BRL', 'manual', 'advance-run-once-1',
         'advance worker fixture', '2026-05-15T00:00:00.000Z', $4, now())`,
      [advancePaymentId, accountId, advanceOwnerId, userId]
    );
    await pool.query(
      `INSERT INTO advance_payment_allocations (
         id, account_id, advance_payment_id, amount_cents, allocation_type,
         reference, notes, allocated_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 2500, 'compensation', 'ADV-ALLOC-1',
         'advance compensation fixture', '2026-05-16T00:00:00.000Z', $4, now())`,
      [advanceAllocationId, accountId, advancePaymentId, userId]
    );
    await pool.query(
      `INSERT INTO advance_payments (
         id, account_id, owner_id, amount_cents, currency, source_type,
         source_id, notes, issued_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 20000, 'BRL', 'manual', 'advance-run-once-other',
         'other account fixture', '2026-05-15T00:00:00.000Z', $4, now())`,
      [otherAdvancePaymentId, otherAccountId, otherAdvanceOwnerId, otherUserId]
    );
    await pool.query(
      `INSERT INTO advance_payments (
         id, account_id, owner_id, amount_cents, currency, source_type,
         source_id, notes, issued_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 6000, 'BRL', 'manual', 'advance-run-once-status',
         'wrong status fixture', '2026-05-15T00:00:00.000Z', $4, now())`,
      [wrongStatusAdvancePaymentId, accountId, advanceOwnerId, userId]
    );
    await pool.query(
      `INSERT INTO advance_payments (
         id, account_id, owner_id, amount_cents, currency, source_type,
         source_id, notes, issued_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 7000, 'BRL', 'manual', 'advance-run-once-search',
         'wrong search fixture', '2026-05-15T00:00:00.000Z', $4, now())`,
      [wrongSearchAdvancePaymentId, accountId, wrongSearchAdvanceOwnerId, userId]
    );
    await pool.query(
      `INSERT INTO advance_payments (
         id, account_id, owner_id, amount_cents, currency, source_type,
         source_id, notes, issued_at, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 8000, 'BRL', 'manual', 'advance-run-once-date',
         'outside date fixture', '2026-06-01T00:00:00.000Z', $4, now())`,
      [outsideDateAdvancePaymentId, accountId, advanceOwnerId, userId]
    );
    await pool.query(
      `INSERT INTO financial_payables (
         id, account_id, supplier_name, description, category,
         cost_center_code, cost_center_name, issued_at, due_at,
         total_amount, paid_amount, outstanding_amount, status, notes,
         payment_method, reconciliation_status, created_by_user_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'Distribuidora Run Once', 'Medicamentos de rotina', 'Farmácia',
         'CC-RUN', 'Clínica', '2026-05-01', '2026-05-15',
         1000.00, 250.00, 750.00, 'partial', 'payable worker fixture',
         'bank_transfer', 'pending', $3, now(), now())`,
      [payableId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO financial_payables (
         id, account_id, supplier_name, description, category,
         cost_center_code, cost_center_name, issued_at, due_at,
         total_amount, paid_amount, outstanding_amount, status, notes,
         payment_method, reconciliation_status, created_by_user_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'Outra Conta', 'Medicamentos que não pertencem ao relatório', 'Farmácia',
         'CC-OTHER', 'Outra clínica', '2026-05-01', '2026-05-15',
         2000.00, 0.00, 2000.00, 'open', 'foreign tenant fixture',
         'cash', 'not_required', $3, now(), now())`,
      [otherPayableId, otherAccountId, otherUserId]
    );
    await pool.query(
      `INSERT INTO financial_payables (
         id, account_id, supplier_name, description, category,
         cost_center_code, cost_center_name, issued_at, due_at,
         total_amount, paid_amount, outstanding_amount, status, notes,
         payment_method, reconciliation_status, created_by_user_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'Distribuidora Run Once', 'Medicamentos em status diferente', 'Farmácia',
         'CC-RUN', 'Clínica', '2026-05-01', '2026-05-15',
         600.00, 0.00, 600.00, 'open', 'must be excluded by status',
         'bank_transfer', 'pending', $3, now(), now())`,
      [wrongStatusPayableId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO financial_payables (
         id, account_id, supplier_name, description, category,
         cost_center_code, cost_center_name, issued_at, due_at,
         total_amount, paid_amount, outstanding_amount, status, notes,
         payment_method, reconciliation_status, created_by_user_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'Fornecedor administrativo', 'Material de escritório', 'Operações',
         'CC-RUN', 'Clínica', '2026-05-01', '2026-05-15',
         300.00, 0.00, 300.00, 'partial', 'must be excluded by search',
         'bank_transfer', 'pending', $3, now(), now())`,
      [wrongSearchPayableId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO financial_payables (
         id, account_id, supplier_name, description, category,
         cost_center_code, cost_center_name, issued_at, due_at,
         total_amount, paid_amount, outstanding_amount, status, notes,
         payment_method, reconciliation_status, created_by_user_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'Distribuidora Run Once', 'Medicamentos fora da janela', 'Farmácia',
         'CC-RUN', 'Clínica', '2026-06-01', '2026-06-01',
         400.00, 0.00, 400.00, 'partial', 'must be excluded by due date',
         'bank_transfer', 'pending', $3, now(), now())`,
      [outsideDatePayableId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO fiscal_nfse_documents (
         id, account_id, serie, numero, competencia, provider, municipality_code, api_url,
         environment, issuer, customer, services, subtotal, total_iss, total_pis,
         total_cofins, total_csll, total_irrf, total_inss, total_document, observations,
         status, authorization_code, verification_url, created_at, updated_at
       ) VALUES ($1, $2, '001', 9401, '2026-05-15', 'abrasf', '3550308',
         'https://municipal.example.test/nfse', 'homologacao',
         '{"name":"Run once clinic"}'::jsonb,
         '{"type":"cpf","document":"12345678909","name":"Cliente Worker NFS-e"}'::jsonb,
         '[{"description":"Consulta Worker NFS-e","codigoServico":"0407","cnae":"7500-1/00","quantity":1,"unitValue":180,"totalValue":180,"issRate":0.05,"issValue":9,"pisValue":0,"cofinsValue":0,"csllValue":0}]'::jsonb,
         180, 9, 0, 0, 0, 0, 0, 189, 'worker fiscal report fixture',
         'draft', NULL, NULL, now(), now())`,
      [fiscalDocumentId, accountId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, 'administrative-executive', 'Run once report', 'daily', 'csv',
         '{}'::jsonb, '[]'::jsonb, true, now() - interval '1 minute', $3, now(), now())`,
      [scheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report delivery', 'daily', 'csv',
         '{}'::jsonb, '["finance@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [deliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report failed delivery', 'daily', 'csv',
         '{}'::jsonb, '["retry@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [failedDeliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report SIGKILL', 'daily', 'csv',
         '{}'::jsonb, '["sigkill@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [sigkillDeliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report lease', 'daily', 'csv',
         '{}'::jsonb, '["lease@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [leaseDeliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-cheques', 'Run once report cheques', 'daily', 'csv',
         '{"dateFrom":"2020-01-01","dateTo":"2100-01-01"}'::jsonb, '[]'::jsonb,
         true, now() + interval '1 day', $3, now(), now())`,
      [chequeScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-cheques', 'Run once other report cheques', 'daily', 'csv',
         '{"dateFrom":"2020-01-01","dateTo":"2100-01-01"}'::jsonb, '[]'::jsonb,
         true, now() + interval '1 day', $3, now(), now())`,
      [otherChequeScheduleId, otherAccountId, otherUserId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-payables', 'Run once report payables', 'daily', 'json',
         '{"status":"partial","search":"medicamentos","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [payableScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-advance-payments', 'Run once report advance payments', 'daily', 'json',
         '{"status":"partially_compensated","search":"DOC-ADV-1","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [advancePaymentScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'fiscal-service-invoices', 'Run once NFS-e services', 'daily', 'json',
         '{"status":"draft","search":"Cliente Worker NFS-e","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [fiscalServiceInvoiceScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-receivables', 'Run once report receivables account A', 'daily', 'json',
         '{"status":"open","search":"target receivable","dateFrom":"2026-05-15","dateTo":"2026-05-15"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now()),
            ($4, $5, 'financial-receivables', 'Run once report receivables account B', 'daily', 'json',
         '{"status":"settled","search":"other account receivable","dateFrom":"2026-05-18","dateTo":"2026-05-18"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $6, now(), now())`,
      [
        receivableScheduleId,
        accountId,
        userId,
        otherReceivableScheduleId,
        otherAccountId,
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-receivables', 'Run once overflow receivables', 'daily', 'json',
         '{"status":"open","search":"overflow","dateFrom":"2026-05-15","dateTo":"2026-05-15"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [overflowReceivableScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-receivables', 'Run once fallback receivable', 'daily', 'json',
         '{"status":"open","search":"fallback","dateFrom":"2026-05-25","dateTo":"2026-05-25"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [fallbackReceivableScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'financial-unsupported', 'Run once unsupported report', 'daily', 'json',
         '{}'::jsonb, '["unsupported@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [unsupportedScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'unknown-report-id', 'Run once unknown report', 'daily', 'json',
         '{}'::jsonb, '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [unknownScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'commercial-deleted-sales', 'Run once cancelled sales account A', 'daily', 'json',
         '{"search":"  CANCELADA  ","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [deletedSalesScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'commercial-deleted-sales', 'Run once cancelled sales account B', 'daily', 'json',
         '{"search":"cancelada","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb,
         '[]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [otherDeletedSalesScheduleId, otherAccountId, otherUserId]
    );
  });

  afterAll(async () => {
    const accountIds = [accountId, otherAccountId];
    await pool.query(
      'ALTER TABLE advance_payment_allocations DISABLE TRIGGER advance_payment_allocations_immutability_trigger'
    );
    await pool.query(
      'ALTER TABLE advance_payments DISABLE TRIGGER advance_payments_immutability_trigger'
    );
    try {
      await pool.query(
        'DELETE FROM advance_payment_allocations WHERE account_id = ANY($1::uuid[])',
        [accountIds]
      );
      await pool.query('DELETE FROM advance_payments WHERE account_id = ANY($1::uuid[])', [
        accountIds
      ]);
    } finally {
      await pool.query(
        'ALTER TABLE advance_payments ENABLE TRIGGER advance_payments_immutability_trigger'
      );
      await pool.query(
        'ALTER TABLE advance_payment_allocations ENABLE TRIGGER advance_payment_allocations_immutability_trigger'
      );
    }
    await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [accountIds]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  });

  it('executes a due report schedule before the one-shot worker exits', async () => {
    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly executions: number;
      readonly last_execution_id: string | null;
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM report_executions WHERE account_id = $1 AND report_id = 'administrative-executive') AS executions,
         (SELECT requested_by_user_id::text
            FROM report_executions
           WHERE account_id = $1 AND report_id = 'administrative-executive'
           ORDER BY generated_at DESC
           LIMIT 1) AS requested_by_user_id,
         last_execution_id
         FROM report_schedules
        WHERE account_id = $1 AND id = $2`,
      [accountId, scheduleId]
    );

    expect(persisted.rows).toEqual([
      {
        executions: 1,
        requested_by_user_id: reportServiceUserId,
        last_execution_id: expect.any(String)
      }
    ]);
  }, 30_000);

  it('fails closed when the report actor is absent instead of using the account id', async () => {
    const { result, output } = await runOnce({
      WORKER_REPORTS_USER_ID: '',
      WORKER_INSTANCE_ID: `run-once-reports-missing-actor-${process.pid}`
    });

    expect(result, output).toMatchObject({ code: 1, signal: null });
    expect(output).toMatch(/WORKER_REPORTS_USER_ID is required/);
  }, 30_000);

  it('does not persist a report execution for an unknown explicit actor', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [chequeScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_REPORTS_USER_ID: randomUUID(),
      WORKER_INSTANCE_ID: `run-once-reports-unknown-actor-${process.pid}`
    });

    expect(result, output).toEqual({ code: 1, signal: null });
    expect(output).toMatch(/not mapped as an active report service principal/);
    const persisted = await pool.query<{
      readonly executions: number;
    }>(
      `SELECT
         COUNT(*)::int AS executions
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'financial-cheques'`,
      [accountId]
    );

    expect(persisted.rows).toEqual([{ executions: 0 }]);
  }, 30_000);

  it('does not persist a report execution for a service actor mapped to another account', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [chequeScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_REPORTS_USER_ID: otherReportServiceUserId,
      WORKER_INSTANCE_ID: `run-once-reports-foreign-actor-${process.pid}`
    });

    expect(result, output).toEqual({ code: 1, signal: null });
    expect(output).toMatch(/not mapped as an active report service principal/);
    const persisted = await pool.query<{ readonly executions: number }>(
      `SELECT COUNT(*)::int AS executions
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'financial-cheques'`,
      [accountId]
    );

    expect(persisted.rows).toEqual([{ executions: 0 }]);
  }, 30_000);

  it('delivers a scheduled report to a controlled local provider before exit', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [deliveryScheduleId, accountId]
    );
    let requestHeaders: IncomingHttpHeaders | undefined;
    let requestBody = '';
    const receiver = createServer((request, response) => {
      requestHeaders = request.headers;
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
      request.on('end', () => {
        requestBody = Buffer.concat(chunks).toString('utf8');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report receiver did not expose a port');
    }

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-delivery-${process.pid}`,
      RESEND_API_KEY: 're_worker_controlled_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    expect(requestHeaders?.['idempotency-key']).toMatch(/^rep_deliv_/);
    const body = JSON.parse(requestBody) as {
      readonly to: readonly string[];
      readonly attachments: readonly [{ readonly content: string }];
      readonly tags: readonly { readonly name: string; readonly value: string }[];
    };
    expect(body.to).toEqual(['finance@example.test']);
    expect(body.attachments[0]?.content).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(body.tags).toContainEqual({
      name: 'cvg-delivery-id',
      value: requestHeaders?.['idempotency-key']
    });

    const persisted = await pool.query<{
      readonly status: string;
      readonly recipient: string;
      readonly execution_id: string;
      readonly export_id: string;
      readonly exported_by_user_id: string;
    }>(
      `SELECT status, recipient, execution_id, export_id,
         (SELECT exported_by_user_id::text
            FROM report_exports
           WHERE account_id = $1
             AND id = (
               SELECT export_id
                 FROM report_schedule_deliveries
                WHERE account_id = $1 AND schedule_id = $2
                ORDER BY created_at DESC
                LIMIT 1
             )) AS exported_by_user_id
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, deliveryScheduleId]
    );
    expect(persisted.rows).toEqual([
      {
        status: 'sent',
        recipient: 'finance@example.test',
        execution_id: expect.any(String),
        export_id: expect.any(String),
        exported_by_user_id: reportServiceUserId
      }
    ]);

    const audit = await pool.query<{
      readonly action: string;
      readonly entity_type: string;
      readonly actor_user_id: string;
      readonly payload_summary: string;
    }>(
      `SELECT action, entity_type, actor_user_id::text,
         metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'report-schedule'
          AND entity_id = $2
          AND action IN ('report_schedule_executed', 'report_schedule_exported')
        ORDER BY action`,
      [accountId, deliveryScheduleId]
    );
    expect(audit.rows).toHaveLength(2);
    expect(audit.rows.map((row) => row.action)).toEqual([
      'report_schedule_executed',
      'report_schedule_exported'
    ]);
    expect(audit.rows.every((row) => row.entity_type === 'report-schedule')).toBe(true);
    expect(audit.rows.every((row) => row.actor_user_id === reportServiceUserId)).toBe(true);
    expect(audit.rows.every((row) => !row.payload_summary.includes('finance@example.test'))).toBe(
      true
    );
  }, 30_000);

  it('executes a scheduled cheque report from persisted tenant facts', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [chequeScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-cheques-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly last_execution_id: string | null;
    }>(
      `SELECT e.row_count, e.rows, s.last_execution_id
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, chequeScheduleId]
    );

    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      row_count: 1,
      last_execution_id: expect.any(String)
    });
    expect(persisted.rows[0]?.rows).toEqual([
      {
        paymentId: chequePaymentId,
        counterSaleId: chequeSaleId,
        saleNumber: expect.stringMatching(/^CHEQUE-/),
        saleStatus: 'closed',
        reference: 'CHK-RUN-ONCE',
        amount: 125.5,
        installments: 2,
        recordedAt: expect.any(String),
        notes: 'worker persisted cheque'
      }
    ]);
  }, 30_000);

  it('keeps concurrent scheduled cheque reports scoped to each worker account', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = ANY($1::text[])`,
      [[chequeScheduleId, otherChequeScheduleId]]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-cheques-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-cheques-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });

    const persisted = await pool.query<{
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
    }>(
      `SELECT s.account_id::text, e.row_count, e.rows
         FROM report_schedules s
         JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[chequeScheduleId, otherChequeScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toMatchObject({
      row_count: 1,
      rows: [
        expect.objectContaining({
          paymentId: chequePaymentId,
          counterSaleId: chequeSaleId,
          reference: 'CHK-RUN-ONCE'
        })
      ]
    });
    expect(executionsByAccount.get(otherAccountId)).toMatchObject({
      row_count: 1,
      rows: [
        expect.objectContaining({
          paymentId: otherChequePaymentId,
          counterSaleId: otherChequeSaleId,
          reference: 'CHK-RUN-ONCE-OTHER'
        })
      ]
    });

    const crossAccountRows = await pool.query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM report_executions
        WHERE report_id = 'financial-cheques'
          AND (
            (account_id = $1 AND rows::text LIKE $2)
            OR (account_id = $3 AND rows::text LIKE $4)
          )`,
      [accountId, `%${otherChequePaymentId}%`, otherAccountId, `%${chequePaymentId}%`]
    );
    expect(crossAccountRows.rows).toEqual([{ count: 0 }]);
  }, 30_000);

  it('executes concurrent scheduled cancelled-sales reports with persisted tenant isolation', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = ANY($1::text[])`,
      [[deletedSalesScheduleId, otherDeletedSalesScheduleId]]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-deleted-sales-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-deleted-sales-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });

    const persisted = await pool.query<{
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
    }>(
      `SELECT s.account_id::text, e.row_count, e.rows
         FROM report_schedules s
         JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[deletedSalesScheduleId, otherDeletedSalesScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toMatchObject({
      row_count: 1,
      rows: [
        {
          number: expect.stringMatching(/^CANCELLED-/),
          status: 'cancelled',
          ownerId: null,
          openedByUserId: userId,
          createdAt: '2026-05-15T10:00:00.000Z',
          updatedAt: '2026-05-15T11:00:00.000Z',
          total: 90,
          discountAmount: 10,
          paidAmount: 0,
          balanceDue: 90,
          notes: 'cancelada account-a'
        }
      ]
    });
    expect(executionsByAccount.get(otherAccountId)).toMatchObject({
      row_count: 1,
      rows: [
        {
          number: expect.stringMatching(/^CANCELLED-/),
          status: 'cancelled',
          ownerId: null,
          openedByUserId: otherUserId,
          createdAt: '2026-05-15T12:00:00.000Z',
          updatedAt: '2026-05-15T13:00:00.000Z',
          total: 180,
          discountAmount: 20,
          paidAmount: 0,
          balanceDue: 180,
          notes: 'cancelada account-b'
        }
      ]
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ notes: 'cancelada account-b' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ notes: 'cancelada account-a' })
    );
  }, 30_000);

  it('executes a scheduled payables report from the persisted tenant subledger', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [payableScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-payables-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly last_execution_id: string | null;
    }>(
      `SELECT e.row_count, e.rows, s.last_execution_id
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, payableScheduleId]
    );

    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      row_count: 1,
      last_execution_id: expect.any(String)
    });
    expect(persisted.rows[0]?.rows).toEqual([
      {
        supplierName: 'Distribuidora Run Once',
        description: 'Medicamentos de rotina',
        category: 'Farmácia',
        issuedAt: '2026-05-01',
        dueAt: '2026-05-15',
        totalAmount: 1000,
        paidAmount: 250,
        outstandingAmount: 750,
        status: 'partial',
        paymentMethod: 'bank_transfer',
        reconciliationStatus: 'pending'
      }
    ]);
    const foreignExecution = await pool.query<{ readonly executions: number }>(
      `SELECT COUNT(*)::int AS executions
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'financial-payables'`,
      [otherAccountId]
    );
    expect(foreignExecution.rows).toEqual([{ executions: 0 }]);
  }, 30_000);

  it('executes a scheduled advance-payment report from persisted allocation-derived facts', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [advancePaymentScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-advance-payments-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly last_execution_id: string | null;
    }>(
      `SELECT e.row_count, e.rows, s.last_execution_id
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, advancePaymentScheduleId]
    );

    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      row_count: 1,
      last_execution_id: expect.any(String)
    });
    expect(persisted.rows[0]?.rows).toEqual([
      {
        paymentId: advancePaymentId,
        ownerName: 'Advance Owner',
        documentId: 'DOC-ADV-1',
        issuedAt: '2026-05-15T00:00:00.000Z',
        originalAmount: 100,
        compensatedAmount: 25,
        balance: 75,
        origin: 'manual',
        status: 'partially_compensated',
        notes: 'advance worker fixture'
      }
    ]);
    const foreignExecution = await pool.query<{ readonly executions: number }>(
      `SELECT COUNT(*)::int AS executions
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'financial-advance-payments'`,
      [otherAccountId]
    );
    expect(foreignExecution.rows).toEqual([{ executions: 0 }]);
  }, 30_000);

  it('executes scheduled financial-receivables reports with exact filters and tenant isolation', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = ANY($1::text[])`,
      [[receivableScheduleId, otherReceivableScheduleId]]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-receivables-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-receivables-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Receivable (Patient|Owner) [AB]/);
    expect(otherAccountRun.output).not.toMatch(/Receivable (Patient|Owner) [AB]/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly last_execution_id: string | null;
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         s.last_execution_id, e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[receivableScheduleId, otherReceivableScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: receivableScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          patientName: 'Receivable Patient A',
          ownerName: 'Receivable Owner A',
          patientSpecies: 'Canino',
          encounterId: receivableEncounterId,
          installmentNumber: 1,
          installmentLabel: 'Consulta A',
          issuedAt: '2026-05-01T00:00:00.000Z',
          dueAt: '2026-05-15T00:00:00.000Z',
          settledAt: null,
          amountOriginal: 200,
          amountPaid: 50,
          amountOutstanding: 150,
          status: 'open',
          financialStatus: 'partial',
          encounterStatus: 'open',
          paymentCount: 1
        }
      ],
      last_execution_id: expect.any(String),
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherReceivableScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          patientName: 'Receivable Patient B',
          ownerName: 'Receivable Owner B',
          patientSpecies: 'Felino',
          encounterId: otherReceivableEncounterId,
          installmentNumber: 1,
          installmentLabel: 'Consulta B',
          issuedAt: '2026-05-02T00:00:00.000Z',
          dueAt: '2026-05-10T00:00:00.000Z',
          settledAt: '2026-05-18T00:00:00.000Z',
          amountOriginal: 80,
          amountPaid: 80,
          amountOutstanding: 0,
          status: 'settled',
          financialStatus: 'paid',
          encounterStatus: 'closed',
          paymentCount: 1
        }
      ],
      last_execution_id: expect.any(String),
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ patientName: 'Receivable Patient B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ patientName: 'Receivable Patient A' })
    );

    const audit = await pool.query<{
      readonly account_id: string;
      readonly action: string;
      readonly actor_user_id: string;
      readonly payload_summary: string;
    }>(
      `SELECT account_id::text, action, actor_user_id::text,
         metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[receivableScheduleId, otherReceivableScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(audit.rows.map((row) => row.account_id)).toEqual([accountId, otherAccountId].sort());
    expect(audit.rows.map((row) => row.actor_user_id).sort()).toEqual(
      [reportServiceUserId, otherReportServiceUserId].sort()
    );
    expect(audit.rows.every((row) => !row.payload_summary.includes('Receivable Patient'))).toBe(
      true
    );
  }, 30_000);

  it('uses issuedAt as the inclusive report-date fallback when an open receivable has no dueAt', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [fallbackReceivableScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-receivables-fallback-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
    }>(
      `SELECT e.row_count, e.rows
         FROM report_schedules s
         JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, fallbackReceivableScheduleId]
    );

    expect(persisted.rows).toEqual([
      {
        row_count: 1,
        rows: [
          {
            patientName: 'Receivable Patient A',
            ownerName: 'Receivable Owner A',
            patientSpecies: 'Canino',
            encounterId: receivableEncounterId,
            installmentNumber: 5,
            installmentLabel: 'Fallback sem vencimento',
            issuedAt: '2026-05-25T00:00:00.000Z',
            dueAt: null,
            settledAt: null,
            amountOriginal: 10,
            amountPaid: 0,
            amountOutstanding: 10,
            status: 'open',
            financialStatus: 'partial',
            encounterStatus: 'open',
            paymentCount: 0
          }
        ]
      }
    ]);
  }, 30_000);

  it('fails the scheduled report before execution when the real source exceeds 10,000 rows', async () => {
    const executionsBefore = await pool.query<{ readonly executions: number }>(
      `SELECT COUNT(*)::int AS executions
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'financial-receivables'`,
      [accountId]
    );
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [overflowReceivableScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-receivables-overflow-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 1, signal: null });
    const persisted = await pool.query<{
      readonly last_error: string | null;
      readonly last_execution_id: string | null;
      readonly executions: number;
      readonly exports: number;
      readonly deliveries: number;
    }>(
      `SELECT s.last_error, s.last_execution_id,
         (SELECT COUNT(*)::int FROM report_executions e
           WHERE e.account_id = s.account_id AND e.report_id = s.report_id) AS executions,
         (SELECT COUNT(*)::int FROM report_exports e
           WHERE e.account_id = s.account_id
             AND e.execution_id = s.last_execution_id) AS exports,
         (SELECT COUNT(*)::int FROM report_schedule_deliveries d
           WHERE d.account_id = s.account_id AND d.schedule_id = s.id) AS deliveries
         FROM report_schedules s
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, overflowReceivableScheduleId]
    );

    expect(persisted.rows).toEqual([
      {
        last_error:
          'Financial-receivables report exceeds the maximum exportable page; refine the filters',
        last_execution_id: null,
        executions: executionsBefore.rows[0]?.executions ?? -1,
        exports: 0,
        deliveries: 0
      }
    ]);
  }, 30_000);

  it('executes concurrent scheduled services reports with persisted tenant isolation', async () => {
    await pool.query(
      `INSERT INTO services (
         id, account_id, name, code, description, base_price, active, created_at, updated_at
       ) VALUES
         ($1, $2, 'Serviço Account A', 'SRV-A', 'Descrição Account A', 120.50, true,
           '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($3, $4, 'Serviço Account B', NULL, NULL, 80.00, false,
           '2026-05-02T00:00:00.000Z', '2026-05-02T00:00:00.000Z')`,
      [scheduledServiceId, accountId, otherScheduledServiceId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'registration-services', 'Run once services account A', 'daily', 'json',
           '{"dateFrom":"2026-05-01","dateTo":"2026-05-01"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'registration-services', 'Run once services account B', 'daily', 'json',
           '{"dateFrom":"2026-05-02","dateTo":"2026-05-02"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledServicesScheduleId,
        accountId,
        userId,
        otherScheduledServicesScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-services-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-services-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Serviço Account [AB]/);
    expect(otherAccountRun.output).not.toMatch(/Serviço Account [AB]/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledServicesScheduleId, otherScheduledServicesScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledServicesScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          code: 'SRV-A',
          name: 'Serviço Account A',
          description: 'Descrição Account A',
          basePrice: 120.5,
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledServicesScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          code: '',
          name: 'Serviço Account B',
          description: '',
          basePrice: 80,
          status: 'inactive',
          createdAt: '2026-05-02T00:00:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Serviço Account B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Serviço Account A' })
    );

    const audit = await pool.query<{
      readonly account_id: string;
      readonly action: string;
      readonly payload_summary: string;
    }>(
      `SELECT account_id::text, action,
         metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledServicesScheduleId, otherScheduledServicesScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(audit.rows.every((row) => !row.payload_summary.includes('Serviço Account'))).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled suppliers reports with persisted tenant isolation and filters', async () => {
    await pool.query(
      `INSERT INTO finance_cost_centers (
         account_id, code, name, kind, owner, description, created_at, updated_at
       ) VALUES
         ($1, 'CC-SUP-A', 'Centro fornecedor A', 'Operacional', 'Equipe A', 'Centro A',
           '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($2, 'CC-SUP-B', 'Centro fornecedor B', 'Operacional', 'Equipe B', 'Centro B',
           '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z')`,
      [accountId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO finance_expense_catalog_items (
         id, account_id, name, kind, category, cost_center_code, cost_center_name,
         description, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'Fornecedor Alpha', 'Operacional', 'Tecnologia', 'CC-SUP-A',
           'Centro fornecedor A', 'Descrição fornecedor Alpha', $3,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($4, $2, 'Outro item A', 'Operacional', 'Infraestrutura', 'CC-SUP-A',
           'Centro fornecedor A', 'Ruído que o filtro deve excluir', $3,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($5, $6, 'Fornecedor Beta', 'Administrativo', 'Tecnologia', 'CC-SUP-B',
           'Centro fornecedor B', 'Descrição fornecedor Beta', $7,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z')`,
      [
        scheduledSupplierId,
        accountId,
        userId,
        scheduledSupplierNoiseId,
        otherScheduledSupplierId,
        otherAccountId,
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'registration-suppliers', 'Run once suppliers account A', 'daily', 'json',
           '{"search":"fornecedor","category":"Tecnologia","costCenterCode":"CC-SUP-A","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'registration-suppliers', 'Run once suppliers account B', 'daily', 'json',
           '{"search":"fornecedor","category":"Tecnologia","costCenterCode":"CC-SUP-B","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledSuppliersScheduleId,
        accountId,
        userId,
        otherScheduledSuppliersScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-suppliers-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-suppliers-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Fornecedor (Alpha|Beta)/);
    expect(otherAccountRun.output).not.toMatch(/Fornecedor (Alpha|Beta)/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledSuppliersScheduleId, otherScheduledSuppliersScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledSuppliersScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          code: scheduledSupplierId,
          name: 'Fornecedor Alpha',
          kind: 'Operacional',
          category: 'Tecnologia',
          costCenterCode: 'CC-SUP-A',
          costCenterName: 'Centro fornecedor A',
          description: 'Descrição fornecedor Alpha',
          createdAt: '2026-05-15T23:30:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledSuppliersScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          code: otherScheduledSupplierId,
          name: 'Fornecedor Beta',
          kind: 'Administrativo',
          category: 'Tecnologia',
          costCenterCode: 'CC-SUP-B',
          costCenterName: 'Centro fornecedor B',
          description: 'Descrição fornecedor Beta',
          createdAt: '2026-05-15T23:30:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Fornecedor Beta' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Fornecedor Alpha' })
    );

    const audit = await pool.query<{
      readonly account_id: string;
      readonly action: string;
      readonly payload_summary: string;
    }>(
      `SELECT account_id::text, action,
         metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledSuppliersScheduleId, otherScheduledSuppliersScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Fornecedor') && !row.payload_summary.includes('Descrição')
      )
    ).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled owners reports with persisted tenant isolation and exact fields', async () => {
    await pool.query(
      `INSERT INTO owners (
         id, account_id, full_name, document, email, phone_main, phone_alt,
         address_json, created_at, updated_at
       ) VALUES
         ($1, $2, 'Tutor Account A', 'DOC-OWNER-A', 'owner-a@example.test',
           '+55 11 99999-0001', '+55 11 98888-0001',
           '{"version":2,"contacts":[{"label":"WhatsApp","value":"+55 11 99999-0001","type":"whatsapp","primary":true}],"address":{"city":"São Paulo"},"financialResponsible":true,"status":"active","administrativeNotes":"private owner note A"}'::jsonb,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($3, $4, 'Tutor Account B', 'DOC-OWNER-B', NULL,
           NULL, '+55 11 98888-0002',
           '{"version":2,"address":{"city":"Campinas"},"financialResponsible":false,"status":"inactive","administrativeNotes":"private owner note B"}'::jsonb,
           '2026-05-15T23:30:00.000Z', '2026-05-16T00:00:00.000Z'),
         ($5, $2, 'Owner Outside Window', 'DOC-OWNER-NOISE', 'noise@example.test',
           '+55 11 97777-0003', NULL,
           '{"version":2,"address":{"city":"São Paulo"},"financialResponsible":true,"status":"active"}'::jsonb,
           '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z')`,
      [scheduledOwnerId, accountId, otherScheduledOwnerId, otherAccountId, scheduledOwnerNoiseId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'registration-owners', 'Run once owners account A', 'daily', 'json',
           '{"dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'registration-owners', 'Run once owners account B', 'daily', 'json',
           '{"dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledOwnersScheduleId,
        accountId,
        userId,
        otherScheduledOwnersScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-owners-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-owners-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Tutor Account [AB]|DOC-OWNER-[AB]/);
    expect(otherAccountRun.output).not.toMatch(/Tutor Account [AB]|DOC-OWNER-[AB]/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledOwnersScheduleId, otherScheduledOwnersScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledOwnersScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          documentId: 'DOC-OWNER-A',
          fullName: 'Tutor Account A',
          primaryContact: 'WhatsApp: +55 11 99999-0001',
          city: 'São Paulo',
          financialResponsible: 'Sim',
          status: 'active',
          createdAt: '2026-05-15T23:30:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledOwnersScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          documentId: 'DOC-OWNER-B',
          fullName: 'Tutor Account B',
          primaryContact: 'Telefone 2: +55 11 98888-0002',
          city: 'Campinas',
          financialResponsible: 'Não',
          status: 'inactive',
          createdAt: '2026-05-15T23:30:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ fullName: 'Tutor Account B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ fullName: 'Tutor Account A' })
    );

    const audit = await pool.query<{
      readonly account_id: string;
      readonly action: string;
      readonly payload_summary: string;
    }>(
      `SELECT account_id::text, action,
         metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledOwnersScheduleId, otherScheduledOwnersScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Tutor Account') &&
          !row.payload_summary.includes('DOC-OWNER') &&
          !row.payload_summary.includes('São Paulo') &&
          !row.payload_summary.includes('Campinas')
      )
    ).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled patients reports with persisted tenant isolation and exact fields', async () => {
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'registration-patients', 'Run once patients account A', 'daily', 'json',
           '{"dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'registration-patients', 'Run once patients account B', 'daily', 'json',
           '{"dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledPatientsScheduleId,
        accountId,
        userId,
        otherScheduledPatientsScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-patients-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-patients-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Paciente Account [AB]|MC-A-001|MC-NOISE/);
    expect(otherAccountRun.output).not.toMatch(/Paciente Account [AB]|MC-A-001|MC-NOISE/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledPatientsScheduleId, otherScheduledPatientsScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledPatientsScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          code: 'VETUS-PATIENT-A',
          name: 'Paciente Account A',
          species: 'canine',
          breed: 'SRD',
          sex: 'female',
          microchip: 'MC-A-001',
          status: 'active',
          createdAt: '2026-05-15T23:30:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledPatientsScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          code: otherScheduledPatientId,
          name: 'Paciente Account B',
          species: 'feline',
          breed: '',
          sex: 'unknown',
          microchip: '',
          status: 'inactive',
          createdAt: '2026-05-15T23:30:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Paciente Account B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ name: 'Paciente Account A' })
    );

    const audit = await pool.query<{ readonly payload_summary: string }>(
      `SELECT metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledPatientsScheduleId, otherScheduledPatientsScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Paciente Account') &&
          !row.payload_summary.includes('MC-A-001') &&
          !row.payload_summary.includes('private patient note')
      )
    ).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled commission-calculations reports from persisted tenant facts', async () => {
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'commission-calculations', 'Run once commissions account A', 'weekly', 'json',
           '{"status":"reviewed","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'commission-calculations', 'Run once commissions account B', 'weekly', 'json',
           '{"status":"reviewed","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledCommissionsScheduleId,
        accountId,
        userId,
        otherScheduledCommissionsScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-commissions-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-commissions-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Comissão Account [AB]/);
    expect(otherAccountRun.output).not.toMatch(/Comissão Account [AB]/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledCommissionsScheduleId, otherScheduledCommissionsScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledCommissionsScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          number: 'COM-RUN-ONCE-A',
          period: '2026-05-01..2026-05-28',
          status: 'reviewed',
          totalBaseAmount: 3000,
          totalCommissionAmount: 450,
          lineCount: 2
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledCommissionsScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          number: 'COM-RUN-ONCE-B',
          period: '2026-05-01..2026-05-28',
          status: 'reviewed',
          totalBaseAmount: 2500,
          totalCommissionAmount: 375,
          lineCount: 1
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ number: 'COM-RUN-ONCE-B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ number: 'COM-RUN-ONCE-A' })
    );
  }, 30_000);

  it('executes concurrent scheduled inventory-products reports from persisted tenant facts', async () => {
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'inventory-products', 'Run once inventory products account A', 'weekly', 'json',
           '{"search":"SKU-SURG-%","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'inventory-products', 'Run once inventory products account B', 'weekly', 'json',
           '{"search":"surgical","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledInventoryProductsScheduleId,
        accountId,
        userId,
        otherScheduledInventoryProductsScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-products-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-products-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Surgical saline [AB]/);
    expect(otherAccountRun.output).not.toMatch(/Surgical saline [AB]/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledInventoryProductsScheduleId, otherScheduledInventoryProductsScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledInventoryProductsScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          sku: 'SKU-SURG-%-A',
          name: 'Surgical saline A',
          unit: 'bottle',
          onHandQuantity: 12.5,
          reorderLevel: 5,
          unitCostAmount: 4.2,
          createdAt: '2026-05-31T23:59:59.999Z',
          updatedAt: '2026-06-01T00:00:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledInventoryProductsScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          sku: 'SKU-SURG-B',
          name: 'Surgical saline B',
          unit: 'bottle',
          onHandQuantity: 8,
          reorderLevel: 3,
          unitCostAmount: 6.5,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ sku: 'SKU-SURG-B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ sku: 'SKU-SURG-A' })
    );

    const audit = await pool.query<{ readonly payload_summary: string }>(
      `SELECT metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledInventoryProductsScheduleId, otherScheduledInventoryProductsScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Surgical saline') &&
          !row.payload_summary.includes('SKU-SURG')
      )
    ).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled inventory-stock reports with current values and tenant isolation', async () => {
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'inventory-stock', 'Run once inventory stock account A', 'weekly', 'json',
           '{"search":"stock","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'inventory-stock', 'Run once inventory stock account B', 'weekly', 'json',
           '{"search":"stock","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledInventoryStockScheduleId,
        accountId,
        userId,
        otherScheduledInventoryStockScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-stock-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-stock-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Healthy stock B/);
    expect(otherAccountRun.output).not.toMatch(/Low stock A/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledInventoryStockScheduleId, otherScheduledInventoryStockScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledInventoryStockScheduleId,
      account_id: accountId,
      row_count: 1,
      rows: [
        {
          sku: 'SKU-STOCK-A',
          name: 'Low stock A',
          unit: 'bottle',
          onHandQuantity: 1.25,
          reorderLevel: 2,
          unitCostAmount: 4.56,
          stockValue: 5.7,
          reorderStatus: 'below_reorder_level',
          createdAt: '2026-05-15T23:30:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledInventoryStockScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          sku: 'SKU-STOCK-B',
          name: 'Healthy stock B',
          unit: 'bottle',
          onHandQuantity: 8,
          reorderLevel: 3,
          unitCostAmount: 6.5,
          stockValue: 52,
          reorderStatus: 'adequate',
          createdAt: '2026-05-15T23:30:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    const audit = await pool.query<{ readonly payload_summary: string }>(
      `SELECT metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledInventoryStockScheduleId, otherScheduledInventoryStockScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Low stock') &&
          !row.payload_summary.includes('Healthy stock') &&
          !row.payload_summary.includes('SKU-STOCK')
      )
    ).toBe(true);
  }, 30_000);

  it('executes concurrent scheduled inventory-invoices reports from persisted purchase headers', async () => {
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'inventory-invoices', 'Run once inventory invoices account A', 'weekly', 'json',
           '{"search":"NF-A","status":"received","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'inventory-invoices', 'Run once inventory invoices account B', 'weekly', 'json',
           '{"search":"NF-B","status":"partially_received","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledInventoryInvoicesScheduleId,
        accountId,
        userId,
        otherScheduledInventoryInvoicesScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-invoices-account-a-${process.pid}`,
        PGOPTIONS: '-c timezone=America/Sao_Paulo',
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-invoices-account-b-${process.pid}`,
        PGOPTIONS: '-c timezone=America/Sao_Paulo',
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Fornecedor Alpha|NF-A-001|purchase-run-once-invoice/);
    expect(otherAccountRun.output).not.toMatch(/Fornecedor Beta|NF-B-001|purchase-run-once-other/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledInventoryInvoicesScheduleId, otherScheduledInventoryInvoicesScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledInventoryInvoicesScheduleId,
      account_id: accountId,
      row_count: 2,
      rows: [
        {
          purchaseId: scheduledInventoryPurchaseId,
          invoiceNumber: 'NF-A-001',
          supplierName: 'Fornecedor Alpha',
          status: 'received',
          totalAmount: 125.5,
          receivedAmount: 125.5,
          payableId: 'payable-invoice-a',
          createdByUserId: userId,
          approvedByUserId: userId,
          createdAt: '2026-05-31T23:59:59.999Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
          receivedAt: '2026-06-01T00:00:00.000Z'
        },
        {
          purchaseId: scheduledInventoryBoundaryPurchaseId,
          invoiceNumber: 'NF-A-000',
          supplierName: 'Fornecedor Alpha',
          status: 'received',
          totalAmount: 60,
          receivedAmount: 60,
          payableId: 'payable-boundary',
          createdByUserId: userId,
          approvedByUserId: userId,
          createdAt: '2026-05-01T00:30:00.000Z',
          updatedAt: '2026-05-01T00:30:00.000Z',
          receivedAt: '2026-05-01T00:30:00.000Z'
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledInventoryInvoicesScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          purchaseId: otherScheduledInventoryPurchaseId,
          invoiceNumber: 'NF-B-001',
          supplierName: 'Fornecedor Beta',
          status: 'partially_received',
          totalAmount: 200,
          receivedAmount: 80,
          payableId: 'payable-invoice-b',
          createdByUserId: otherUserId,
          approvedByUserId: otherUserId,
          createdAt: '2026-05-15T12:00:00.000Z',
          updatedAt: '2026-05-16T12:00:00.000Z',
          receivedAt: '2026-05-16T12:00:00.000Z'
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ invoiceNumber: 'NF-B-001' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ invoiceNumber: 'NF-A-001' })
    );

    const audit = await pool.query<{ readonly payload_summary: string }>(
      `SELECT metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledInventoryInvoicesScheduleId, otherScheduledInventoryInvoicesScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Fornecedor') &&
          !row.payload_summary.includes('NF-A') &&
          !row.payload_summary.includes('NF-B') &&
          !row.payload_summary.includes('purchase-run-once')
      )
    ).toBe(true);
  }, 30_000);

  it('executes a scheduled NFS-e service-invoice report from persisted fiscal facts', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [fiscalServiceInvoiceScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-fiscal-service-invoices-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly last_execution_id: string | null;
    }>(
      `SELECT e.row_count, e.rows, s.last_execution_id
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, fiscalServiceInvoiceScheduleId]
    );

    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      row_count: 1,
      last_execution_id: expect.any(String)
    });
    expect(persisted.rows[0]?.rows).toEqual([
      {
        documentId: fiscalDocumentId,
        serie: '001',
        numero: 9401,
        competencia: '2026-05-15',
        status: 'draft',
        customerName: 'Cliente Worker NFS-e',
        customerDocument: '12345678909',
        provider: 'abrasf',
        serviceDescriptions: 'Consulta Worker NFS-e',
        serviceCodes: '0407',
        serviceQuantity: 1,
        serviceSubtotal: 180,
        totalIss: 9,
        totalPis: 0,
        totalCofins: 0,
        totalCsll: 0,
        totalIrrf: 0,
        totalInss: 0,
        totalDocument: 189,
        observations: 'worker fiscal report fixture',
        createdAt: expect.any(String),
        authorizationCode: ''
      }
    ]);
  }, 30_000);

  it('fails a scheduled report without a worker source instead of persisting an empty success', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [unsupportedScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-unsupported-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 1, signal: null });
    const persisted = await pool.query<{
      readonly last_error: string | null;
      readonly last_execution_id: string | null;
      readonly executions: number;
      readonly deliveries: number;
    }>(
      `SELECT s.last_error, s.last_execution_id,
         (SELECT COUNT(*)::int FROM report_executions e
           WHERE e.account_id = s.account_id AND e.report_id = s.report_id) AS executions,
         (SELECT COUNT(*)::int FROM report_schedule_deliveries d
           WHERE d.account_id = s.account_id AND d.schedule_id = s.id) AS deliveries
         FROM report_schedules s
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, unsupportedScheduleId]
    );

    expect(persisted.rows).toEqual([
      {
        last_error: 'Scheduled report source is not configured: financial-unsupported',
        last_execution_id: null,
        executions: 0,
        deliveries: 1
      }
    ]);
    const delivery = await pool.query<{
      readonly execution_id: string | null;
      readonly export_id: string | null;
      readonly recipient: string;
      readonly status: string;
      readonly error: string | null;
    }>(
      `SELECT execution_id, export_id, recipient, status, error
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, unsupportedScheduleId]
    );
    expect(delivery.rows).toEqual([
      {
        execution_id: null,
        export_id: null,
        recipient: 'unsupported@example.test',
        status: 'failed',
        error: 'Scheduled report source is not configured: financial-unsupported'
      }
    ]);
  }, 30_000);

  it('fails an unknown scheduled report id closed without persisting an execution', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [unknownScheduleId, accountId]
    );

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-unknown-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 1, signal: null });
    const persisted = await pool.query<{
      readonly last_error: string | null;
      readonly last_execution_id: string | null;
      readonly executions: number;
      readonly deliveries: number;
    }>(
      `SELECT s.last_error, s.last_execution_id,
         (SELECT COUNT(*)::int FROM report_executions e
           WHERE e.account_id = s.account_id AND e.report_id = s.report_id) AS executions,
         (SELECT COUNT(*)::int FROM report_schedule_deliveries d
           WHERE d.account_id = s.account_id AND d.schedule_id = s.id) AS deliveries
         FROM report_schedules s
        WHERE s.account_id = $1 AND s.id = $2`,
      [accountId, unknownScheduleId]
    );

    expect(persisted.rows).toEqual([
      {
        last_error: 'Scheduled report source is not configured: unknown-report-id',
        last_execution_id: null,
        executions: 0,
        deliveries: 0
      }
    ]);
  }, 30_000);

  it('reprocesses the same failed delivery from a second one-shot worker', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [failedDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        response.writeHead(requestCount === 1 ? 503 : 200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report retry receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_retry_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-failure-a-${process.pid}`
    });
    expect(first.result, first.output).toEqual({ code: 1, signal: null });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, failedDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const second = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-failure-b-${process.pid}`,
      WORKER_REPORTS_RETRY_FAILED: '1'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(second.result, second.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, failedDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);

  it('recovers a delivery after the first worker is SIGKILLed after provider acceptance', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [sigkillDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        if (requestCount === 1) {
          setTimeout(() => worker?.kill('SIGKILL'), 25);
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    let worker: ChildProcess | undefined;
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report SIGKILL receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_sigkill_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce(
      {
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-sigkill-a-${process.pid}`
      },
      (child) => {
        worker = child;
      }
    );
    expect(first.result, first.output).toEqual({ code: null, signal: 'SIGKILL' });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, sigkillDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const second = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-sigkill-b-${process.pid}`,
      WORKER_REPORTS_RETRY_FAILED: '1'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(second.result, second.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, sigkillDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);

  it('allows only one of two concurrent retry workers to claim a delivery', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [leaseDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        if (requestCount === 1) {
          response.writeHead(503, { 'content-type': 'application/json' });
          response.end('{}');
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        setTimeout(() => response.end('{}'), 200);
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report lease receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_lease_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-lease-seed-${process.pid}`
    });
    expect(first.result, first.output).toEqual({ code: 1, signal: null });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, leaseDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const [retryA, retryB] = await Promise.all([
      runOnce({
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-lease-a-${process.pid}`,
        WORKER_REPORTS_RETRY_FAILED: '1'
      }),
      runOnce({
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-lease-b-${process.pid}`,
        WORKER_REPORTS_RETRY_FAILED: '1'
      })
    ]);
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(retryA.result, retryA.output).toEqual({ code: 0, signal: null });
    expect(retryB.result, retryB.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, leaseDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);

  it('executes concurrent scheduled inventory-movements reports from the persisted ledger with tenant isolation', async () => {
    await pool.query(
      `INSERT INTO inventory_stock_movements (
         id, account_id, inventory_item_id, movement_type, quantity_delta,
         balance_before, balance_after, unit_cost_amount, reason, reference,
         recorded_by_user_id, created_at
       ) VALUES
         ($1, $2, $3, 'adjustment', 1.00, 0.00, 1.00, 4.20,
          'Entrada inicial A', NULL, $4, '2026-05-01T00:00:00.000Z'),
         ($5, $2, $3, 'consumption', -2.00, 3.00, 1.00, 4.20,
          'Consumo superior A', 'encounter-a', $4, '2026-05-31T23:59:59.999Z'),
         ($6, $7, $8, 'inbound', 3.00, 0.00, 3.00, 6.50,
          'Entrada B', 'purchase-b', $9, '2026-05-15T12:00:00.000Z')`,
      [
        scheduledInventoryMovementLowerId,
        accountId,
        scheduledInventoryItemId,
        userId,
        scheduledInventoryMovementUpperId,
        otherScheduledInventoryMovementId,
        otherAccountId,
        otherScheduledInventoryItemId,
        otherUserId
      ]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES
         ($1, $2, 'inventory-movements', 'Run once inventory movements account A', 'weekly', 'json',
           '{"search":"SKU-SURG-%","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $3, now(), now()),
         ($4, $5, 'inventory-movements', 'Run once inventory movements account B', 'weekly', 'json',
           '{"search":"surgical","dateFrom":"2026-05-01","dateTo":"2026-05-31"}'::jsonb, '[]'::jsonb,
           true, now() - interval '1 minute', $6, now(), now())`,
      [
        scheduledInventoryMovementsScheduleId,
        accountId,
        userId,
        otherScheduledInventoryMovementsScheduleId,
        otherAccountId,
        otherUserId
      ]
    );

    const [accountRun, otherAccountRun] = await Promise.all([
      runOnce({
        WORKER_ACCOUNT_ID: accountId,
        WORKER_REPORTS_USER_ID: reportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-movements-account-a-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      }),
      runOnce({
        WORKER_ACCOUNT_ID: otherAccountId,
        WORKER_REPORTS_USER_ID: otherReportServiceUserId,
        WORKER_INSTANCE_ID: `run-once-reports-inventory-movements-account-b-${process.pid}`,
        EMAIL_MOCK_MODE: 'true'
      })
    ]);

    expect(accountRun.result, accountRun.output).toEqual({ code: 0, signal: null });
    expect(otherAccountRun.result, otherAccountRun.output).toEqual({ code: 0, signal: null });
    expect(accountRun.output).not.toMatch(/Surgical saline [AB]|SKU-SURG/);
    expect(otherAccountRun.output).not.toMatch(/Surgical saline [AB]|SKU-SURG/);

    const persisted = await pool.query<{
      readonly schedule_id: string;
      readonly account_id: string;
      readonly row_count: number;
      readonly rows: readonly Record<string, unknown>[];
      readonly requested_by_user_id: string | null;
    }>(
      `SELECT s.id AS schedule_id, s.account_id::text, e.row_count, e.rows,
         e.requested_by_user_id::text
         FROM report_schedules s
         LEFT JOIN report_executions e
           ON e.account_id = s.account_id
          AND e.id = s.last_execution_id
        WHERE s.id = ANY($1::text[])
        ORDER BY s.account_id`,
      [[scheduledInventoryMovementsScheduleId, otherScheduledInventoryMovementsScheduleId]]
    );

    expect(persisted.rows).toHaveLength(2);
    const executionsByAccount = new Map(persisted.rows.map((row) => [row.account_id, row]));
    expect(executionsByAccount.get(accountId)).toEqual({
      schedule_id: scheduledInventoryMovementsScheduleId,
      account_id: accountId,
      row_count: 2,
      rows: [
        {
          movementId: scheduledInventoryMovementUpperId,
          occurredAt: '2026-05-31T23:59:59.999Z',
          movementType: 'consumption',
          sku: 'SKU-SURG-%-A',
          name: 'Surgical saline A',
          unit: 'bottle',
          quantityDelta: -2,
          balanceBefore: 3,
          balanceAfter: 1,
          unitCostAmount: 4.2,
          reason: 'Consumo superior A',
          reference: 'encounter-a',
          recordedByUserId: userId
        },
        {
          movementId: scheduledInventoryMovementLowerId,
          occurredAt: '2026-05-01T00:00:00.000Z',
          movementType: 'adjustment',
          sku: 'SKU-SURG-%-A',
          name: 'Surgical saline A',
          unit: 'bottle',
          quantityDelta: 1,
          balanceBefore: 0,
          balanceAfter: 1,
          unitCostAmount: 4.2,
          reason: 'Entrada inicial A',
          reference: '',
          recordedByUserId: userId
        }
      ],
      requested_by_user_id: reportServiceUserId
    });
    expect(executionsByAccount.get(otherAccountId)).toEqual({
      schedule_id: otherScheduledInventoryMovementsScheduleId,
      account_id: otherAccountId,
      row_count: 1,
      rows: [
        {
          movementId: otherScheduledInventoryMovementId,
          occurredAt: '2026-05-15T12:00:00.000Z',
          movementType: 'inbound',
          sku: 'SKU-SURG-B',
          name: 'Surgical saline B',
          unit: 'bottle',
          quantityDelta: 3,
          balanceBefore: 0,
          balanceAfter: 3,
          unitCostAmount: 6.5,
          reason: 'Entrada B',
          reference: 'purchase-b',
          recordedByUserId: otherUserId
        }
      ],
      requested_by_user_id: otherReportServiceUserId
    });

    expect(executionsByAccount.get(accountId)?.rows).not.toContainEqual(
      expect.objectContaining({ sku: 'SKU-SURG-B' })
    );
    expect(executionsByAccount.get(otherAccountId)?.rows).not.toContainEqual(
      expect.objectContaining({ sku: 'SKU-SURG-%-A' })
    );

    const audit = await pool.query<{ readonly payload_summary: string }>(
      `SELECT metadata->>'payloadSummary' AS payload_summary
         FROM audit_events
        WHERE entity_type = 'report-schedule'
          AND entity_id = ANY($1::text[])
          AND action = 'report_schedule_executed'
        ORDER BY account_id`,
      [[scheduledInventoryMovementsScheduleId, otherScheduledInventoryMovementsScheduleId]]
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.every(
        (row) =>
          !row.payload_summary.includes('Surgical saline') &&
          !row.payload_summary.includes('SKU-SURG') &&
          !row.payload_summary.includes('encounter-a')
      )
    ).toBe(true);
  }, 30_000);
});
