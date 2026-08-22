import { describe, expect, it } from 'vitest';

import {
  closeEncounterFinancialBodySchema,
  createEncounterCashReceiptBodySchema,
  encounterCashReceiptResponseSchema,
  encounterFinancialContract
} from '../encounterFinancial.js';

const UUIDS = {
  receipt: '00000000-0000-4000-8000-000000000001',
  account: '00000000-0000-4000-8000-000000000002',
  encounter: '00000000-0000-4000-8000-000000000003',
  billing: 'bill_000000000004',
  financial: '00000000-0000-4000-8000-000000000005',
  receivable: '00000000-0000-4000-8000-000000000006',
  payment: '00000000-0000-4000-8000-000000000007',
  register: '00000000-0000-4000-8000-000000000008',
  movement: '00000000-0000-4000-8000-000000000009',
  journal: '00000000-0000-4000-8000-000000000010',
  user: '00000000-0000-4000-8000-000000000011'
} as const;

describe('Encounter financial contract', () => {
  it('rejects the disabled paidAmount shortcut during financial close', () => {
    expect(closeEncounterFinancialBodySchema.safeParse({ paidAmount: 100 }).success).toBe(false);
    expect(closeEncounterFinancialBodySchema.safeParse({ notes: 'Conferido' }).success).toBe(true);
  });

  it('validates strict, cent-accurate cash receipt input', () => {
    expect(
      createEncounterCashReceiptBodySchema.safeParse({
        cashRegisterId: UUIDS.register,
        expectedAmount: 1.15,
        notes: 'Recebido na recepção'
      }).success
    ).toBe(true);
    expect(
      createEncounterCashReceiptBodySchema.safeParse({
        cashRegisterId: UUIDS.register,
        expectedAmount: 100.001
      }).success
    ).toBe(false);
    expect(
      createEncounterCashReceiptBodySchema.safeParse({
        cashRegisterId: UUIDS.register,
        expectedAmount: '100.00'
      }).success
    ).toBe(false);
    expect(
      createEncounterCashReceiptBodySchema.safeParse({
        cashRegisterId: UUIDS.register,
        expectedAmount: 100,
        paidAmount: 100
      }).success
    ).toBe(false);
  });

  it('validates the durable cash receipt response', () => {
    const parsed = encounterCashReceiptResponseSchema.safeParse({
      id: UUIDS.receipt,
      accountId: UUIDS.account,
      encounterId: UUIDS.encounter,
      billingRecordId: UUIDS.billing,
      financialAccountId: UUIDS.financial,
      receivableId: UUIDS.receivable,
      receivablePaymentId: UUIDS.payment,
      cashRegisterId: UUIDS.register,
      cashMovementId: UUIDS.movement,
      journalEntryId: UUIDS.journal,
      amount: 100.25,
      currency: 'BRL',
      receivedAt: '2026-08-22T12:00:00.000Z',
      receivedByUserId: UUIDS.user,
      notes: 'Recebido na recepção'
    });

    expect(parsed.success).toBe(true);
  });

  it('publishes cash receipt creation/read and no legacy manual settlement', () => {
    expect(encounterFinancialContract.createCashReceipt.path).toBe(
      '/encounters/:encounterId/cash-receipts'
    );
    expect(encounterFinancialContract.createCashReceipt.responses[201]).toBe(
      encounterCashReceiptResponseSchema
    );
    expect(encounterFinancialContract.getCashReceipt.method).toBe('GET');
    expect(encounterFinancialContract.getCashReceiptForEncounter.path).toBe(
      '/encounters/:encounterId/cash-receipts'
    );
    expect('settleReceivable' in encounterFinancialContract).toBe(false);
  });
});
