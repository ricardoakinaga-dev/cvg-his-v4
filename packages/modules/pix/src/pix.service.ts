/**
 * PIX Service — Payment Intent Orchestration
 *
 * Provides a provider-agnostic interface for PIX payments.
 * Delegates to the configured PixProvider for actual payment processing.
 */

import { randomUUID } from 'node:crypto';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  AccountId,
  PixTransaction,
  PixTransactionId,
  PixTransactionStatus,
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixCancelResult,
  PixProvider
} from './types.js';

export { type PixTransaction, PixTransactionId, PixTransactionStatus, PixProvider };
export type {
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixCancelResult,
  PixConfirmResult
} from './types.js';

/**
 * Default expiration time for PIX transactions in minutes.
 */
const DEFAULT_EXPIRATION_MINUTES = 60;

/**
 * Creates a branded PixTransactionId from a raw string.
 */
function asPixTransactionId(id: string): PixTransactionId {
  return id as PixTransactionId;
}

export class PixService {
  readonly #provider: PixProvider;

  constructor(provider: PixProvider) {
    this.#provider = provider;
  }

  /**
   * Generate a new PIX payment intent.
   *
   * Flow:
   * 1. Call provider.createIntent() to get QR code data
   * 2. Return intent to caller (caller stores PixTransaction)
   *
   * @returns PixIntentResult with QR code and transaction reference
   */
  async createIntent(input: CreatePixIntentInput): Promise<PixIntentResult> {
    const intentInput: CreatePixIntentInput = {
      ...input,
      expirationMinutes: input.expirationMinutes ?? DEFAULT_EXPIRATION_MINUTES
    };

    return this.#provider.createIntent(intentInput);
  }

  /**
   * Check the status of a PIX transaction via the provider.
   */
  async getStatus(transactionId: PixTransactionId): Promise<PixStatusResult> {
    return this.#provider.getStatus(transactionId);
  }

  /**
   * Cancel a pending PIX transaction.
   * Only available if the provider supports cancellation.
   */
  async cancelIntent(transactionId: PixTransactionId): Promise<PixCancelResult> {
    if (!this.#provider.cancelIntent) {
      return {
        transactionId,
        cancelled: false,
        reason: `Provider ${this.#provider.name} does not support cancellation`
      };
    }
    return this.#provider.cancelIntent(transactionId);
  }

  /**
   * Confirm a PIX payment as settled.
   * Used when the payment provider sends a settlement notification.
   */
  async confirmPayment(transactionId: PixTransactionId, providerConfirmationId?: string): Promise<PixStatusResult> {
    return this.#provider.confirmPayment(transactionId, providerConfirmationId);
  }

  /**
   * Build a PixTransaction object from provider result.
   * Used by callers to store the transaction record.
   */
  buildTransaction(params: {
    billingRecordId: string;
    accountId: AccountId;
    amount: number;
    qrCodePayload: string;
    qrCodeBase64?: string;
    expiresAt: string;
    providerTransactionId?: string;
  }): PixTransaction {
    return {
      id: asPixTransactionId(`pix_${randomUUID().replace(/-/g, '').slice(0, 16)}`),
      billingRecordId: params.billingRecordId,
      accountId: params.accountId,
      amount: params.amount,
      currency: 'BRL',
      pixKey: '', // set by provider
      qrCodeBase64: params.qrCodeBase64,
      qrCodePayload: params.qrCodePayload,
      expiresAt: params.expiresAt,
      status: 'pending',
      provider: this.#provider.name,
      providerTransactionId: params.providerTransactionId,
      createdAt: nowIso()
    };
  }
}
