/**
 * Mock PIX Adapter — for testing and development
 *
 * Implements PixProvider with in-memory state.
 * Does NOT make real API calls.
 *
 * Use for:
 * - Unit tests
 * - Local development without provider credentials
 * - CI environments
 */

import { randomUUID } from 'node:crypto';
import type {
  PixProvider,
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixConfirmResult,
  PixCancelResult,
  PixTransactionId,
  PixTransactionStatus
} from '../types.js';
import { nowIso } from '@cvg-his-v2/shared-utils';

interface MockTransaction {
  readonly id: string;
  readonly billingRecordId: string;
  readonly accountId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly status: PixTransactionStatus;
  readonly providerTransactionId: string;
  readonly createdAt: string;
}

export class MockPixAdapter implements PixProvider {
  readonly name = 'mock' as const;
  readonly #transactions: Map<string, MockTransaction> = new Map();

  async createIntent(input: CreatePixIntentInput): Promise<PixIntentResult> {
    const providerTransactionId = `mock_pix_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const id = `pix_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const expiresAt = new Date(Date.now() + (input.expirationMinutes ?? 60) * 60 * 1000).toISOString();

    const mockTx: MockTransaction = {
      id,
      billingRecordId: input.billingRecordId,
      accountId: input.accountId,
      amount: input.amount,
      currency: 'BRL',
      status: 'pending',
      providerTransactionId,
      createdAt: nowIso()
    };
    this.#transactions.set(providerTransactionId, mockTx);

    // Generate a mock QR code (base64 of a minimal PNG is just random bytes here)
    const mockQrBase64 = `data:image/png;base64,${Buffer.from(`MOCK_QR_${providerTransactionId}`).toString('base64')}`;
    const mockQrPayload = `00020126580014br.gov.bcb.pix0136${providerTransactionId}520400005303986540${input.amount.toString().padStart(12, '0')}5802BR59250000`;

    return {
      transaction: {
        id: id as PixTransactionId,
        billingRecordId: input.billingRecordId,
        accountId: input.accountId,
        amount: input.amount,
        currency: 'BRL',
        pixKey: 'mock@pix.cvg.com',
        qrCodeBase64: mockQrBase64,
        qrCodePayload: mockQrPayload,
        expiresAt,
        status: 'pending',
        provider: 'mock',
        providerTransactionId,
        createdAt: nowIso()
      },
      qrCodeBase64: mockQrBase64,
      qrCodePayload: mockQrPayload
    };
  }

  async getStatus(transactionId: PixTransactionId): Promise<PixStatusResult> {
    const tx = Array.from(this.#transactions.values()).find(
      (t) => t.id === transactionId || t.providerTransactionId === transactionId
    );
    return {
      transactionId,
      status: tx?.status ?? 'pending',
      providerTransactionId: tx?.providerTransactionId
    };
  }

  async confirmPayment(transactionId: PixTransactionId, providerConfirmationId?: string): Promise<PixStatusResult> {
    const tx = Array.from(this.#transactions.values()).find(
      (t) => t.id === transactionId || t.providerTransactionId === transactionId
    );
    if (!tx) {
      return { transactionId, status: 'pending' };
    }
    if (tx.status !== 'pending') {
      return { transactionId, status: tx.status, completedAt: tx.status === 'completed' ? tx.createdAt : undefined };
    }
    // Simulate confirmation: update in-memory state
    const completedAt = nowIso();
    const confirmedTx: MockTransaction = { ...tx, status: 'completed' };
    this.#transactions.set(tx.providerTransactionId, confirmedTx);
    this.#transactions.set(tx.id, confirmedTx); // also by id
    return {
      transactionId,
      status: 'completed',
      providerTransactionId: providerConfirmationId ?? tx.providerTransactionId,
      completedAt
    };
  }

  async cancelIntent(transactionId: PixTransactionId): Promise<PixCancelResult> {
    const tx = Array.from(this.#transactions.values()).find(
      (t) => t.id === transactionId || t.providerTransactionId === transactionId
    );
    if (!tx) {
      return { transactionId, cancelled: false, reason: 'Transaction not found' };
    }
    if (tx.status !== 'pending') {
      return { transactionId, cancelled: false, reason: `Cannot cancel transaction with status: ${tx.status}` };
    }
    return { transactionId, cancelled: true };
  }
}
