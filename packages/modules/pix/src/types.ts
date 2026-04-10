/**
 * PIX Module — Type Definitions
 *
 * Defines the core types for PIX payment integration.
 * Providers (Pagar.me, Stripe, GerenciaNet) must conform to PixProvider.
 */

import type { AccountId } from '@cvg-his-v2/shared-types';

// Re-export for convenience
export type { AccountId } from '@cvg-his-v2/shared-types';

// ---------------------------------------------------------------------------
// Domain Types
// ---------------------------------------------------------------------------

export type PixTransactionId = string & { readonly brand: unique symbol };
export type PixTransactionStatus = 'pending' | 'completed' | 'expired' | 'cancelled';

export interface PixTransaction {
  readonly id: PixTransactionId;
  readonly billingRecordId: string;
  readonly accountId: AccountId;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly pixKey: string;
  readonly qrCodeBase64?: string;
  readonly qrCodePayload: string; // EMV string
  readonly expiresAt: string; // ISO date
  readonly status: PixTransactionStatus;
  readonly provider: PixProviderName;
  readonly providerTransactionId?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
}

export type PixProviderName = 'pagarme' | 'stripe' | 'gerencianet' | 'mock';

// ---------------------------------------------------------------------------
// PixProvider Interface
// ---------------------------------------------------------------------------

/**
 * Abstract interface for PIX payment providers.
 * Each supported provider (Pagar.me, Stripe, etc.) implements this interface.
 */
export interface PixProvider {
  readonly name: PixProviderName;

  /**
   * Create a new PIX payment intent.
   * Returns the transaction with QR code data.
   */
  createIntent(input: CreatePixIntentInput): Promise<PixIntentResult>;

  /**
   * Check the current status of a PIX transaction.
   */
  getStatus(transactionId: PixTransactionId): Promise<PixStatusResult>;

  /**
   * Confirm a PIX payment (settlement notification from provider or external system).
   * Returns the updated transaction status after confirmation.
   */
  confirmPayment(transactionId: PixTransactionId, providerConfirmationId?: string): Promise<PixStatusResult>;

  /**
   * Cancel a pending PIX transaction before it expires.
   */
  cancelIntent?(transactionId: PixTransactionId): Promise<PixCancelResult>;
}

// ---------------------------------------------------------------------------
// Service Layer Types
// ---------------------------------------------------------------------------

export interface CreatePixIntentInput {
  readonly billingRecordId: string;
  readonly accountId: AccountId;
  readonly amount: number; // in cents
  readonly description: string;
  readonly expirationMinutes?: number; // defaults to provider default
}

export interface PixIntentResult {
  readonly transaction: PixTransaction;
  readonly qrCodeBase64: string; // base64-encoded QR code image
  readonly qrCodePayload: string; // EMV string for copia-e-colla
}

export interface PixStatusResult {
  readonly transactionId: PixTransactionId;
  readonly status: PixTransactionStatus;
  readonly providerTransactionId?: string;
  readonly completedAt?: string;
}

export interface PixConfirmResult {
  readonly transactionId: PixTransactionId;
  readonly confirmed: boolean;
  readonly providerConfirmationId?: string;
  readonly completedAt?: string;
}

export interface PixCancelResult {
  readonly transactionId: PixTransactionId;
  readonly cancelled: boolean;
  readonly reason?: string;
}

// ---------------------------------------------------------------------------
// PixService Options
// ---------------------------------------------------------------------------

export interface PixServiceOptions {
  readonly provider: PixProvider;
}
