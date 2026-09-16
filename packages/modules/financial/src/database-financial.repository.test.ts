import { beforeEach, expect, test, vi } from 'vitest';

import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository
} from './repositories/database-financial.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(),
  withTenantTransaction: vi.fn(async (_accountId: string, operation: () => Promise<unknown>) => operation())
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) => fn(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };

const accountRow = {
  id: 'financial-account-1',
  account_id: accountId,
  encounter_id: 'encounter-1',
  financial_status: 'open',
  subtotal_snapshot: '100.00',
  discount_total_snapshot: '5.00',
  total_snapshot: '95.00',
  paid_amount: '20.00',
  balance_due: '75.00',
  closed_by_user_id: null,
  closed_at: null,
  notes: null,
  snapshot_json: '{}',
  created_at: timestamp,
  updated_at: timestamp
};

const receivableRow = {
  id: 'receivable-1',
  account_id: accountId,
  encounter_id: 'encounter-1',
  financial_account_id: 'financial-account-1',
  installment_number: '1',
  installment_label: '1/1',
  due_at: timestamp,
  status: 'open',
  amount_original: '95.00',
  amount_paid: '20.00',
  amount_outstanding: '75.00',
  issued_at: timestamp,
  settled_at: null,
  notes: null,
  created_at: timestamp,
  updated_at: timestamp
};

const paymentRow = {
  id: 'payment-1',
  account_id: accountId,
  encounter_id: 'encounter-1',
  financial_account_id: 'financial-account-1',
  receivable_id: 'receivable-1',
  amount_paid: '20.00',
  paid_at: timestamp,
  paid_by_user_id: null,
  external_reference_type: null,
  external_reference_id: null,
  notes: null,
  created_at: timestamp
};

const payableRow = {
  id: 'payable-1',
  account_id: accountId,
  supplier_name: 'Supplier',
  description: 'Supplies',
  category: 'materials',
  cost_center_code: 'CC-1',
  cost_center_name: 'Clinic',
  issued_at: '2026-09-01',
  due_at: '2026-09-30',
  total_amount: '50.00',
  paid_amount: '0.00',
  outstanding_amount: '50.00',
  status: 'open',
  source_expense_id: null,
  notes: null,
  payment_method: null,
  payment_reference: null,
  reconciliation_status: null,
  reconciliation_reference: null,
  created_by_user_id: 'user-1',
  paid_by_user_id: null,
  cancelled_by_user_id: null,
  reconciled_by_user_id: null,
  created_at: timestamp,
  updated_at: timestamp,
  paid_at: null,
  cancelled_at: null,
  reconciled_at: null
};

const receivable = {
  id: 'receivable-1',
  accountId: accountId as never,
  encounterId: 'encounter-1' as never,
  financialAccountId: 'financial-account-1',
  installmentNumber: 1,
  installmentLabel: '1/1',
  dueAt: timestamp.toISOString(),
  status: 'open' as const,
  amountOriginal: 95,
  amountPaid: 20,
  amountOutstanding: 75,
  issuedAt: timestamp.toISOString(),
  settledAt: undefined,
  notes: null,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const payable = {
  id: 'payable-1',
  accountId: accountId as never,
  supplierName: 'Supplier',
  description: 'Supplies',
  category: 'materials',
  costCenterCode: 'CC-1',
  costCenterName: 'Clinic',
  issuedAt: '2026-09-01',
  dueAt: '2026-09-30',
  totalAmount: 50,
  paidAmount: 0,
  outstandingAmount: 50,
  status: 'open' as const,
  sourceExpenseId: null,
  notes: null,
  paymentMethod: null,
  paymentReference: null,
  reconciliationStatus: 'not_required' as const,
  reconciliationReference: null,
  createdByUserId: 'user-1' as never,
  paidByUserId: null,
  cancelledByUserId: null,
  reconciledByUserId: null,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString(),
  paidAt: null,
  cancelledAt: null,
  reconciledAt: null
};

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQuery).mockImplementation(async (client, fn) => fn(client as never));
  vi.mocked(withTenantTransaction).mockImplementation(async (_accountId, operation) => operation());
  query.mockResolvedValue({ rows: [], rowCount: 1 });
});

test('DatabaseEncounterFinancialRepository covers account, receivable and payment persistence paths', async () => {
  const repository = new DatabaseEncounterFinancialRepository();
  await expect(repository.withTransaction(accountId as never, async () => 'ok')).resolves.toBe('ok');
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findFinancialAccountByEncounter('missing' as never)).toBeNull();
  query.mockResolvedValueOnce({ rows: [accountRow] });
  expect(await repository.findFinancialAccountByEncounter('encounter-1' as never)).toMatchObject({
    id: accountRow.id,
    closedAt: null,
    notes: null
  });
  query.mockResolvedValueOnce({ rows: [accountRow] });
  expect(await repository.findFinancialAccountByEncounterForUpdate('encounter-1' as never)).toMatchObject({ id: accountRow.id });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findFinancialAccountByEncounterForUpdate('missing' as never)).toBeNull();
  await repository.upsertFinancialAccount({
    id: accountRow.id,
    accountId: accountId as never,
    encounterId: 'encounter-1' as never,
    financialStatus: 'closed',
    subtotalSnapshot: 100,
    discountTotalSnapshot: 5,
    totalSnapshot: 95,
    paidAmount: 95,
    balanceDue: 0,
    closedByUserId: 'user-1' as never,
    closedAt: timestamp.toISOString(),
    notes: 'closed',
    snapshotJson: '{}',
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  } as never);

  query.mockResolvedValueOnce({ rows: [receivableRow] });
  expect(await repository.listReceivablesByFinancialAccount('financial-account-1')).toMatchObject([{ amountOutstanding: 75, dueAt: timestamp.toISOString() }]);
  await repository.replaceReceivables('financial-account-1', [receivable, { ...receivable, id: 'receivable-2', dueAt: undefined, settledAt: timestamp.toISOString() }]);
  await repository.replaceReceivables('financial-account-1', []);
  await repository.updateReceivable({ ...receivable, dueAt: timestamp.toISOString(), settledAt: timestamp.toISOString() });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findReceivableById('missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [receivableRow] });
  expect(await repository.findReceivableById('receivable-1')).toMatchObject({ notes: null });
  query.mockResolvedValueOnce({ rows: [receivableRow] });
  expect(await repository.findReceivableByIdForUpdate('receivable-1')).toMatchObject({ id: 'receivable-1' });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findReceivableByIdForUpdate('missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [paymentRow] });
  expect(await repository.listPaymentsByFinancialAccount('financial-account-1')).toMatchObject([{ amountPaid: 20, paidByUserId: null }]);
  query.mockResolvedValueOnce({ rows: [{ exists: true }] });
  await expect(repository.hasReversedCashReceiptForFinancialAccount('financial-account-1')).resolves.toBe(true);
  query.mockResolvedValueOnce({ rows: [] });
  await expect(repository.hasReversedCashReceiptForFinancialAccount('financial-account-1')).resolves.toBe(false);
  await repository.createPayment({
    id: 'payment-1', accountId: accountId as never, encounterId: 'encounter-1' as never,
    financialAccountId: 'financial-account-1', receivableId: 'receivable-1', amountPaid: 20,
    paidAt: timestamp.toISOString(), paidByUserId: null, externalReferenceType: null,
    externalReferenceId: null, notes: null, createdAt: timestamp.toISOString()
  });
  query.mockResolvedValueOnce({ rows: [receivableRow] });
  expect(await repository.listReceivables({
    accountId: accountId as never,
    status: 'open',
    encounterId: 'encounter-1' as never,
    dueFrom: '2026-01-01',
    dueTo: '2026-12-31'
  })).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.listReceivables()).toEqual([]);
});

test('DatabaseFinancialPayablesRepository covers CRUD, filters and nullable reconciliation fields', async () => {
  const repository = new DatabaseFinancialPayablesRepository();
  await expect(repository.withTransaction(accountId as never, async () => 'ok')).resolves.toBe('ok');
  await repository.savePayable(payable);
  await repository.savePayable({
    ...payable,
    paidAt: timestamp.toISOString(),
    cancelledAt: timestamp.toISOString(),
    reconciledAt: timestamp.toISOString()
  });
  await repository.updatePayable(payable);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findPayableById('missing')).toBeNull();
  query.mockResolvedValueOnce({ rows: [payableRow] });
  expect(await repository.findPayableById('payable-1')).toMatchObject({
    id: 'payable-1',
    reconciliationStatus: 'not_required',
    paidAt: null,
    notes: null
  });
  query.mockResolvedValueOnce({ rows: [payableRow] });
  expect(await repository.findPayableByIdForUpdate('payable-1')).toMatchObject({ id: 'payable-1' });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findPayableByIdForUpdate('missing')).toBeNull();
  query.mockResolvedValueOnce({
    rows: [
      {
        ...payableRow,
        paid_at: timestamp,
        cancelled_at: timestamp,
        reconciled_at: timestamp,
        source_expense_id: 'expense-1',
        notes: 'reconciled',
        payment_method: 'bank_transfer',
        payment_reference: 'bank-1',
        reconciliation_status: 'reconciled',
        reconciliation_reference: 'rec-1',
        paid_by_user_id: 'user-2',
        cancelled_by_user_id: 'user-3',
        reconciled_by_user_id: 'user-4'
      }
    ]
  });
  expect(await repository.findPayableById('payable-rich')).toMatchObject({
    paidAt: timestamp.toISOString(),
    cancelledAt: timestamp.toISOString(),
    reconciledAt: timestamp.toISOString(),
    paymentMethod: 'bank_transfer',
    reconciliationStatus: 'reconciled'
  });
  query.mockResolvedValueOnce({ rows: [payableRow] });
  expect(await repository.listPayables({ accountId: accountId as never, status: 'open' })).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.listPayables()).toEqual([]);
});
