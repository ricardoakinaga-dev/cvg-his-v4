import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  withTenantQuery: vi.fn(),
  query: vi.fn()
}));

vi.mock('@cvg-his-v2/shared-database', () => ({ getPool: mocks.getPool }));
vi.mock('@cvg-his-v2/tenant-context', () => ({ withTenantQuery: mocks.withTenantQuery }));

import { DatabaseEncounterCashReceiptReversalRepository } from '../../../apps/api/src/encounter-cash-receipt-reversal-repository.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const encounterId = '33333333-3333-4333-8333-333333333333';
const receiptId = '44444444-4444-4444-8444-444444444444';
const billingRecordId = '55555555-5555-4555-8555-555555555555';
const financialAccountId = '66666666-6666-4666-8666-666666666666';
const receivableId = '77777777-7777-4777-8777-777777777777';
const paymentId = '88888888-8888-4888-8888-888888888888';
const originalRegisterId = '99999999-9999-4999-8999-999999999999';
const originalMovementId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalJournalId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reversalId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const input = {
  accountId,
  encounterId,
  receiptId,
  actorUserId,
  reason: 'Correção de recebimento'
};

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: receiptId,
    account_id: accountId,
    encounter_id: encounterId,
    billing_record_id: billingRecordId,
    financial_account_id: financialAccountId,
    receivable_id: receivableId,
    receivable_payment_id: paymentId,
    cash_register_id: originalRegisterId,
    cash_movement_id: originalMovementId,
    journal_entry_id: originalJournalId,
    received_by_user_id: actorUserId,
    amount: '125.50',
    currency: 'BRL',
    received_at: '2026-09-16T10:00:00.000Z',
    ...overrides
  };
}

const billing = {
  id: billingRecordId,
  status: 'settled',
  subtotal_amount: '125.50',
  currency: 'BRL',
  active_payment_attempt_id: null
};

const financial = {
  id: financialAccountId,
  financial_status: 'paid',
  total_snapshot: '125.50',
  paid_amount: '125.50',
  balance_due: '0.00'
};

const receivable = {
  id: receivableId,
  status: 'settled',
  amount_original: '125.50',
  amount_paid: '125.50',
  amount_outstanding: '0.00'
};

const payment = {
  id: paymentId,
  amount_paid: '125.50',
  paid_by_user_id: actorUserId,
  external_reference_type: 'cash_movement',
  external_reference_id: originalMovementId
};

const originalRegister = {
  id: originalRegisterId,
  status: 'open',
  opening_amount: '0.00',
  opened_at: '2026-09-16T08:00:00.000Z',
  closed_at: null
};

const reversalRegister = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  status: 'open',
  opening_amount: '200.00',
  opened_at: '2026-09-16T08:00:00.000Z',
  closed_at: null
};

const originalMovement = {
  id: originalMovementId,
  cash_register_id: originalRegisterId,
  movement_type: 'payment',
  amount: '125.50',
  created_by_user_id: actorUserId
};

const originalJournal = {
  id: originalJournalId,
  source_type: 'encounter_cash_receipt',
  source_id: receiptId,
  created_by_user_id: actorUserId
};

const balancedJournalLines = [
  { account_code: '1.1.01-caixa', debit: '125.50', credit: '0.00' },
  { account_code: '3.1.01-receita-clinica', debit: '0.00', credit: '125.50' }
];

function reversalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: reversalId,
    account_id: accountId,
    receipt_id: receiptId,
    encounter_id: encounterId,
    billing_record_id: billingRecordId,
    financial_account_id: financialAccountId,
    receivable_id: receivableId,
    receivable_payment_id: paymentId,
    original_cash_register_id: originalRegisterId,
    reversal_cash_register_id: reversalRegister.id,
    original_cash_movement_id: originalMovementId,
    reversal_cash_movement_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    original_journal_entry_id: originalJournalId,
    reversal_journal_entry_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    amount: '125.50',
    reason: input.reason,
    reversed_by_user_id: actorUserId,
    reversed_at: '2026-09-16T11:00:00.000Z',
    ...overrides
  };
}

function transaction() {
  return {
    accountId,
    actorUserId,
    client: { query: mocks.query },
    audit: { append: vi.fn().mockResolvedValue(undefined) },
    outbox: { append: vi.fn().mockResolvedValue(undefined) }
  };
}

interface QueryFixtures {
  source?: readonly unknown[];
  existingReversal?: readonly unknown[];
  billing?: readonly unknown[];
  encounter?: readonly unknown[];
  financial?: readonly unknown[];
  receivable?: readonly unknown[];
  payment?: readonly unknown[];
  originalRegister?: readonly unknown[];
  originalMovement?: readonly unknown[];
  originalJournal?: readonly unknown[];
  journalLines?: readonly unknown[];
  reversalRegister?: readonly unknown[];
  latestBalance?: readonly unknown[];
  persisted?: readonly unknown[];
  lookup?: readonly unknown[];
}

function installQueryFixtures(fixtures: QueryFixtures = {}): void {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM encounter_cash_receipts')) return { rows: fixtures.source ?? [sourceRow()] };
    if (sql.includes('FROM encounter_cash_receipt_reversals')) {
      return { rows: fixtures.existingReversal ?? [] };
    }
    if (sql.includes('FROM billing_records')) return { rows: fixtures.billing ?? [billing] };
    if (sql.includes('FROM encounters')) return { rows: fixtures.encounter ?? [{ status: 'closed' }] };
    if (sql.includes('FROM encounter_financial_accounts')) {
      return { rows: fixtures.financial ?? [financial] };
    }
    if (sql.includes('FROM encounter_receivables')) return { rows: fixtures.receivable ?? [receivable] };
    if (sql.includes('FROM encounter_receivable_payments')) return { rows: fixtures.payment ?? [payment] };
    if (sql.includes('FROM cash_registers') && sql.includes("status = 'open'")) {
      return { rows: fixtures.reversalRegister ?? [reversalRegister] };
    }
    if (sql.includes('FROM cash_registers')) {
      return { rows: fixtures.originalRegister ?? [originalRegister] };
    }
    if (sql.includes('SELECT running_balance')) {
      return { rows: fixtures.latestBalance ?? [{ running_balance: '200.00' }] };
    }
    if (sql.includes('FROM cash_movements')) {
      return { rows: fixtures.originalMovement ?? [originalMovement] };
    }
    if (sql.includes('FROM financial_journal_entries')) {
      return { rows: fixtures.originalJournal ?? [originalJournal] };
    }
    if (sql.includes('FROM financial_journal_lines')) {
      return { rows: fixtures.journalLines ?? balancedJournalLines };
    }
    if (sql.includes('INSERT INTO encounter_cash_receipt_reversals')) {
      return { rows: fixtures.persisted ?? [reversalRow()] };
    }
    return { rows: [] };
  });
}

function installLookupHarness(): void {
  mocks.withTenantQuery.mockImplementation(
    async (_pool: unknown, callback: (client: { query: typeof mocks.query }) => unknown) =>
      callback({ query: mocks.query })
  );
}

async function expectReverseFailure(fixtures: QueryFixtures, code: string): Promise<void> {
  installQueryFixtures(fixtures);
  const repository = new DatabaseEncounterCashReceiptReversalRepository();
  const statusCode = code === 'CASH_RECEIPT_NOT_FOUND' || code === 'BILLING_RECORD_NOT_FOUND'
    ? 404
    : code === 'CASH_RECEIPT_REVERSAL_PERSISTENCE_FAILED'
      ? 500
      : 409;
  await expect(repository.reverse(transaction() as never, input)).rejects.toMatchObject({
    code,
    statusCode
  });
}

beforeEach(() => {
  mocks.getPool.mockReset();
  mocks.withTenantQuery.mockReset();
  mocks.query.mockReset();
  mocks.getPool.mockReturnValue({});
});

describe('DatabaseEncounterCashReceiptReversalRepository', () => {
  it('reverses a fully proven cash receipt and appends audit/outbox records', async () => {
    installQueryFixtures();
    const tx = transaction();
    const repository = new DatabaseEncounterCashReceiptReversalRepository();

    await expect(repository.reverse(tx as never, input)).resolves.toMatchObject({
      id: reversalId,
      accountId,
      receiptId,
      amount: 125.5,
      currency: 'BRL',
      reversalCashRegisterId: reversalRegister.id,
      reversedAt: '2026-09-16T11:00:00.000Z'
    });
    expect(tx.audit.append).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'encounter_cash_receipt_reversal',
      action: 'cash_receipt_reversed'
    }));
    expect(tx.outbox.append).toHaveBeenCalledWith(expect.objectContaining({
      moduleName: 'financial',
      eventType: 'encounter.cash-receipt.reversed'
    }));
    expect(mocks.query).toHaveBeenCalledTimes(20);
  });

  it('fails closed on transaction context, receipt ownership and existing reversal', async () => {
    const repository = new DatabaseEncounterCashReceiptReversalRepository();
    await expect(
      repository.reverse({ ...transaction(), accountId: '99999999-9999-4999-8999-999999999999' } as never, input)
    ).rejects.toMatchObject({ code: 'CASH_RECEIPT_REVERSAL_CONTEXT_MISMATCH', statusCode: 403 });
    expect(mocks.query).not.toHaveBeenCalled();

    await expectReverseFailure({ source: [] }, 'CASH_RECEIPT_NOT_FOUND');
    await expectReverseFailure({ source: [sourceRow({ encounter_id: 'other-encounter' })] }, 'CASH_RECEIPT_NOT_FOUND');
    await expectReverseFailure({ existingReversal: [reversalRow()] }, 'CASH_RECEIPT_ALREADY_REVERSED');
  });

  it.each([
    ['status', { status: 'open' }],
    ['currency', { currency: 'USD' }],
    ['amount', { subtotal_amount: '120.00' }],
    ['active attempt', { active_payment_attempt_id: 'active-attempt' }]
  ])('rejects a billing proof with an invalid %s', async (_label, billingOverride) => {
    await expectReverseFailure({ billing: [{ ...billing, ...billingOverride }] }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it('rejects missing billing and encounters that are not closed', async () => {
    await expectReverseFailure({ billing: [] }, 'BILLING_RECORD_NOT_FOUND');
    await expectReverseFailure({ encounter: [] }, 'CASH_RECEIPT_REVERSAL_ENCOUNTER_NOT_CLOSED');
    await expectReverseFailure({ encounter: [{ status: 'open' }] }, 'CASH_RECEIPT_REVERSAL_ENCOUNTER_NOT_CLOSED');
  });

  it.each([
    ['missing financial account', []],
    ['status', [{ ...financial, financial_status: 'pending' }]],
    ['total', [{ ...financial, total_snapshot: '120.00' }]],
    ['paid', [{ ...financial, paid_amount: '120.00' }]],
    ['balance', [{ ...financial, balance_due: '1.00' }]]
  ])('rejects a financial proof with an invalid %s', async (_label, rows) => {
    await expectReverseFailure({ financial: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['missing receivable', []],
    ['status', [{ ...receivable, status: 'open' }]],
    ['original amount', [{ ...receivable, amount_original: '120.00' }]],
    ['paid amount', [{ ...receivable, amount_paid: '120.00' }]],
    ['outstanding amount', [{ ...receivable, amount_outstanding: '1.00' }]]
  ])('rejects a receivable proof with an invalid %s', async (_label, rows) => {
    await expectReverseFailure({ receivable: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['missing payment', []],
    ['amount', [{ ...payment, amount_paid: '120.00' }]],
    ['payer', [{ ...payment, paid_by_user_id: null }]],
    ['reference type', [{ ...payment, external_reference_type: 'pix' }]],
    ['reference id', [{ ...payment, external_reference_id: 'other-movement' }]]
  ])('rejects a payment proof with an invalid %s', async (_label, rows) => {
    await expectReverseFailure({ payment: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['missing register', []],
    ['opened after receipt', [{ ...originalRegister, opened_at: '2026-09-16T11:00:00.000Z' }]],
    ['closed without timestamp', [{ ...originalRegister, status: 'closed', closed_at: null }]],
    ['closed before receipt', [{ ...originalRegister, status: 'closed', closed_at: '2026-09-16T09:00:00.000Z' }]],
    ['open with close timestamp', [{ ...originalRegister, closed_at: '2026-09-16T12:00:00.000Z' }]],
    ['unknown status', [{ ...originalRegister, status: 'reconciled' }]]
  ])('rejects an inconsistent original cash register: %s', async (_label, rows) => {
    await expectReverseFailure({ originalRegister: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['missing movement', []],
    ['type', [{ ...originalMovement, movement_type: 'withdrawal' }]],
    ['amount', [{ ...originalMovement, amount: '120.00' }]],
    ['creator', [{ ...originalMovement, created_by_user_id: null }]]
  ])('rejects an inconsistent original cash movement: %s', async (_label, rows) => {
    await expectReverseFailure({ originalMovement: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['missing journal', []],
    ['type', [{ ...originalJournal, source_type: 'other' }]],
    ['source id', [{ ...originalJournal, source_id: 'other-receipt' }]],
    ['creator', [{ ...originalJournal, created_by_user_id: null }]]
  ])('rejects an inconsistent original journal entry: %s', async (_label, rows) => {
    await expectReverseFailure({ originalJournal: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it.each([
    ['too few lines', []],
    ['unbalanced debit', [{ account_code: '1.1.01-caixa', debit: '120.00', credit: '0.00' }, ...balancedJournalLines.slice(1)]],
    ['unbalanced credit', [{ ...balancedJournalLines[0]!, debit: '125.50' }, { account_code: '3.1.01-receita-clinica', debit: '0.00', credit: '120.00' }]],
    ['cash debit', [
      { account_code: '1.1.01-caixa', debit: '100.00', credit: '0.00' },
      { account_code: 'other', debit: '25.50', credit: '0.00' },
      { account_code: '3.1.01-receita-clinica', debit: '0.00', credit: '125.50' }
    ]],
    ['revenue credit', [
      { account_code: '1.1.01-caixa', debit: '125.50', credit: '0.00' },
      { account_code: 'other', debit: '0.00', credit: '25.50' },
      { account_code: '3.1.01-receita-clinica', debit: '0.00', credit: '100.00' }
    ]]
  ])('rejects an invalid original journal line proof: %s', async (_label, rows) => {
    await expectReverseFailure({ journalLines: rows }, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');
  });

  it('requires an open reversal register, sufficient balance and persistence', async () => {
    await expectReverseFailure({ reversalRegister: [] }, 'CASH_RECEIPT_REVERSAL_REGISTER_NOT_OPEN');
    await expectReverseFailure({ latestBalance: [{ running_balance: '100.00' }] }, 'CASH_RECEIPT_REVERSAL_INSUFFICIENT_BALANCE');
    await expectReverseFailure({ persisted: [] }, 'CASH_RECEIPT_REVERSAL_PERSISTENCE_FAILED');
  });

  it('finds and maps a reversal through the tenant query wrapper, including an empty result', async () => {
    installLookupHarness();
    const repository = new DatabaseEncounterCashReceiptReversalRepository();
    mocks.query.mockResolvedValueOnce({ rows: [reversalRow()] });
    await expect(repository.findByReceipt(accountId, receiptId)).resolves.toMatchObject({
      id: reversalId,
      amount: 125.5,
      currency: 'BRL',
      reversedAt: '2026-09-16T11:00:00.000Z'
    });
    mocks.query.mockResolvedValueOnce({ rows: [] });
    await expect(repository.findByReceipt(accountId, receiptId)).resolves.toBeNull();
  });
});
