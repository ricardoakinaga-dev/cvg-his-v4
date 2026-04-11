/**
 * PIX Payment Processor Job
 *
 * Processes pending PIX payment webhooks from the outbox and
 * reconciles payment status with the billing system.
 *
 * This job:
 * 1. Reads PIX webhook events from outbox_events
 * 2. Processes each event through the payment gateway
 * 3. Updates billing record status based on payment result
 * 4. Emits notification events on completion/failure
 */

import type { Logger } from '@cvg-his-v2/shared-logging';

export interface PixPaymentJobContext {
  readonly correlationId: string;
  readonly environment: string;
  readonly paymentGatewayUrl?: string;
}

export interface PixPaymentResult {
  readonly processedCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly pendingCount: number;
}

/**
 * PIX Payment processing constants.
 */
export const PIX_PAYMENT_CONFIG = {
  /** Max concurrent payment processing */
  MAX_CONCURRENT: 5,
  /** Timeout per payment webhook in ms */
  WEBHOOK_TIMEOUT_MS: 10_000,
  /** Max retry attempts per payment */
  MAX_RETRIES: 3,
  /** Supported PIX intent status transitions */
  VALID_STATUS_TRANSITIONS: {
    pending: ['processing', 'completed', 'failed', 'expired'],
    processing: ['completed', 'failed'],
    completed: [], // terminal
    failed: [],     // terminal
    expired: []     // terminal
  } as const
};
