import { describe, expect, it } from 'vitest';

import {
  InMemoryCardTransactionRepository,
  type CardTransactionRecord
} from '../../../apps/api/src/card-transaction-repository.ts';
import {
  InMemoryEmailDeliveryRepository,
  type EmailDeliveryRecord
} from '../../../apps/api/src/email-delivery-repository.ts';
import {
  InMemoryPixTransactionRepository,
  type PixTransactionRecord
} from '../../../apps/api/src/pix-transaction-repository.ts';

function createCardRecord(overrides: Partial<CardTransactionRecord> = {}): CardTransactionRecord {
  return {
    transactionId: 'card_tx_1',
    provider: 'local-card',
    accountId: 'acc_runtime',
    billingRecordId: 'bill_1',
    amount: 150,
    currency: 'BRL',
    description: 'Consulta',
    installments: 1,
    status: 'pending',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    billingSettlementStatus: 'awaiting_capture',
    ...overrides
  };
}

function createEmailRecord(overrides: Partial<EmailDeliveryRecord> = {}): EmailDeliveryRecord {
  return {
    messageId: 'msg_1',
    accountId: 'acc_runtime',
    provider: 'local-email',
    to: 'owner@example.com',
    subject: 'Subject',
    text: 'Body',
    status: 'queued',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    retryCount: 0,
    maxRetries: 3,
    ...overrides
  };
}

function createPixRecord(overrides: Partial<PixTransactionRecord> = {}): PixTransactionRecord {
  return {
    transactionId: 'pix_tx_1',
    provider: 'local-pix',
    accountId: 'acc_runtime',
    billingRecordId: 'bill_1',
    amount: 200,
    currency: 'BRL',
    description: 'Internacao',
    qrCodePayload: 'qr-payload',
    qrCodeBase64: 'qr-base64',
    expiresAt: '2026-04-19T10:00:00.000Z',
    status: 'pending',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    billingSettlementStatus: 'awaiting_payment',
    cashReconciliationStatus: 'pending',
    ...overrides
  };
}

describe('runtime repositories coverage', () => {
  it('covers card transaction repository lifecycle, filters and null-safe updates', async () => {
    const repository = new InMemoryCardTransactionRepository();
    await repository.create(createCardRecord());
    await repository.create(
      createCardRecord({
        transactionId: 'card_tx_2',
        provider: 'pagarme-card',
        status: 'captured',
        createdAt: '2026-04-18T11:00:00.000Z',
        updatedAt: '2026-04-18T11:00:00.000Z',
        billingSettlementStatus: 'applied'
      })
    );

    const updatedStatus = await repository.updateStatus({
      transactionId: 'card_tx_1',
      status: 'authorized_pending_capture',
      providerOrderId: 'order_1',
      providerChargeId: 'charge_1',
      providerAuthorizationCode: 'auth_1',
      providerReferenceId: 'ref_1'
    });
    const updatedSettlement = await repository.updateBillingSettlement({
      transactionId: 'card_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-04-18T12:00:00.000Z'
    });

    expect(updatedStatus).toEqual(
      expect.objectContaining({
        status: 'authorized_pending_capture',
        providerOrderId: 'order_1',
        providerChargeId: 'charge_1'
      })
    );
    expect(updatedSettlement).toEqual(
      expect.objectContaining({
        billingSettlementStatus: 'applied',
        billingSettledAt: '2026-04-18T12:00:00.000Z'
      })
    );
    expect(await repository.findByTransactionId('missing')).toBeNull();
    expect(await repository.updateStatus({ transactionId: 'missing', status: 'failed' })).toBeNull();
    expect(await repository.updateBillingSettlement({
      transactionId: 'missing',
      billingSettlementStatus: 'failed'
    })).toBeNull();
    expect(await repository.list({ accountId: 'acc_runtime', provider: 'pagarme-card' })).toEqual([
      expect.objectContaining({ transactionId: 'card_tx_2' })
    ]);
    expect((await repository.list())[0]?.transactionId).toBe('card_tx_2');
  });

  it('covers email delivery repository lifecycle, updates and account filtering', async () => {
    const repository = new InMemoryEmailDeliveryRepository();
    await repository.create(createEmailRecord());
    await repository.create(
      createEmailRecord({
        messageId: 'msg_2',
        accountId: 'acc_other',
        createdAt: '2026-04-18T11:00:00.000Z',
        updatedAt: '2026-04-18T11:00:00.000Z'
      })
    );

    await repository.update(
      createEmailRecord({
        messageId: 'msg_1',
        status: 'failed',
        failureReason: 'SMTP timeout',
        retryCount: 1
      })
    );

    expect(await repository.findByMessageId('msg_1')).toEqual(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'SMTP timeout',
        retryCount: 1
      })
    );
    expect(await repository.findByMessageId('missing')).toBeNull();
    expect(await repository.list('acc_runtime')).toEqual([
      expect.objectContaining({ messageId: 'msg_1' })
    ]);
    expect((await repository.list())[0]?.messageId).toBe('msg_2');
  });

  it('covers pix transaction repository lifecycle, provider lookup, reconciliation and list filters', async () => {
    const repository = new InMemoryPixTransactionRepository();
    await repository.create(createPixRecord());
    await repository.create(
      createPixRecord({
        transactionId: 'pix_tx_2',
        provider: 'pagarme',
        status: 'completed',
        providerTransactionId: 'provider_tx_2',
        createdAt: '2026-04-18T11:00:00.000Z',
        updatedAt: '2026-04-18T11:00:00.000Z',
        billingSettlementStatus: 'applied',
        cashReconciliationStatus: 'applied'
      })
    );

    const updatedStatus = await repository.updateStatus({
      transactionId: 'pix_tx_1',
      status: 'completed',
      providerTransactionId: 'provider_tx_1',
      providerConfirmationId: 'confirmation_1',
      providerWebhookEventId: 'webhook_1',
      completedAt: '2026-04-18T12:00:00.000Z'
    });
    const updatedBilling = await repository.updateBillingSettlement({
      transactionId: 'pix_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-04-18T12:05:00.000Z'
    });
    const updatedCash = await repository.updateCashReconciliation({
      transactionId: 'pix_tx_1',
      cashReconciliationStatus: 'applied',
      cashReconciledAt: '2026-04-18T12:10:00.000Z',
      cashRegisterId: 'cash_1',
      cashMovementId: 'movement_1'
    });

    expect(updatedStatus).toEqual(
      expect.objectContaining({
        status: 'completed',
        providerTransactionId: 'provider_tx_1',
        providerConfirmationId: 'confirmation_1'
      })
    );
    expect(updatedBilling?.billingSettledAt).toBe('2026-04-18T12:05:00.000Z');
    expect(updatedCash).toEqual(
      expect.objectContaining({
        cashReconciliationStatus: 'applied',
        cashRegisterId: 'cash_1',
        cashMovementId: 'movement_1'
      })
    );
    expect(await repository.findByProviderTransactionId('pagarme', 'provider_tx_2')).toEqual(
      expect.objectContaining({ transactionId: 'pix_tx_2' })
    );
    expect(await repository.findByProviderTransactionId('pagarme', 'missing')).toBeNull();
    expect(await repository.updateStatus({ transactionId: 'missing', status: 'cancelled' })).toBeNull();
    expect(
      await repository.updateBillingSettlement({
        transactionId: 'missing',
        billingSettlementStatus: 'failed'
      })
    ).toBeNull();
    expect(
      await repository.updateCashReconciliation({
        transactionId: 'missing',
        cashReconciliationStatus: 'failed'
      })
    ).toBeNull();
    expect(await repository.list({ provider: 'pagarme', status: 'completed' })).toEqual([
      expect.objectContaining({ transactionId: 'pix_tx_2' })
    ]);
    expect((await repository.list())[0]?.transactionId).toBe('pix_tx_2');
  });
});
