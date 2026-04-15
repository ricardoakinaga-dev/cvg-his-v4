/**
 * Payments domain event consumers — API runtime level.
 *
 * These handlers dispatch webhook deliveries and coordinate billing settlement
 * when PIX payment events occur.
 *
 * Structure:
 *   eventBus.processPending()
 *     → picks up pending events from outbox_events
 *     → for each event, calls all registered EventHandlers
 *     → PaymentsEventHandlers.handle() dispatches by eventType
 *       - payment.pix.intent.created → audit log
 *       - payment.pix.confirmed → billing.settleByRecordId()
 *
 * Registered via: eventBus.subscribe(paymentsHandlers.handlers)
 */
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { BillingRecordId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';
import type {
  PixGatewayProviderName,
  PixTransactionRecord,
  PixTransactionRepository
} from '../pix-transaction-repository.js';

export interface PaymentsConsumerOptions {
  readonly billing: BillingService;
  readonly encounterFinancial: EncounterFinancialService;
  readonly pixTransactions: PixTransactionRepository;
}

interface PixIntentCreatedPayload {
  readonly accountId: string;
  readonly intentId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: string;
  readonly provider: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly createdAt?: string;
  readonly description?: string;
  readonly qrCodePayload?: string;
  readonly qrCodeBase64?: string;
}

interface PixConfirmedPayload {
  readonly accountId: string;
  readonly intentId: string;
  readonly billingRecordId?: string;
  readonly providerTransactionId?: string;
  readonly providerConfirmationId?: string;
  readonly status?: string;
  readonly completedAt?: string;
  readonly confirmedAt?: string;
}

/**
 * Payments domain event handler for the outbox event bus.
 *
 * Supported event types:
 *   - payment.pix.intent.created → audit log (PIX intent recorded)
 *   - payment.pix.confirmed → settle associated billing record via BillingService
 */
export class PaymentsEventHandlers {
  readonly name = 'payments';
  readonly #billing: BillingService;
  readonly #encounterFinancial: EncounterFinancialService;
  readonly #pixTransactions: PixTransactionRepository;

  constructor(options: PaymentsConsumerOptions) {
    this.#billing = options.billing;
    this.#encounterFinancial = options.encounterFinancial;
    this.#pixTransactions = options.pixTransactions;
  }

  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'payment.pix.intent.created':
        await this.#handlePixIntentCreated(event);
        break;
      case 'payment.pix.confirmed':
        await this.#handlePixConfirmed(event);
        break;
      default:
        break;
    }
  }

  /**
   * Returns an EventHandler-compatible function for eventBus.subscribe().
   * Errors are logged and propagated to the event bus retry logic.
   */
  get handlers(): EventHandler {
    return async (event: OutboxEvent): Promise<void> => {
      await this.handle(event);
    };
  }

  async #handlePixIntentCreated(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as PixIntentCreatedPayload;
    const existing = await this.#pixTransactions.findByTransactionId(payload.intentId);
    if (!existing) {
      const createdAt = payload.createdAt ?? nowIso();
      const initialStatus: PixTransactionRecord['status'] =
        payload.status === 'completed' ? 'completed' : 'pending';
      await this.#pixTransactions.create({
        transactionId: payload.intentId,
        provider: this.#normalizeProvider(payload.provider),
        accountId: payload.accountId,
        billingRecordId: payload.billingRecordId,
        amount: payload.amount,
        currency: payload.currency === 'BRL' ? 'BRL' : 'BRL',
        description: payload.description ?? `PIX payment ${payload.intentId}`,
        qrCodePayload: payload.qrCodePayload ?? '',
        qrCodeBase64: payload.qrCodeBase64 ?? '',
        expiresAt: payload.expiresAt,
        status: initialStatus,
        createdAt,
        updatedAt: createdAt,
        billingSettlementStatus: payload.billingRecordId
          ? initialStatus === 'completed'
            ? 'pending_billing'
            : 'awaiting_payment'
          : 'not_applicable',
        cashReconciliationStatus: 'pending'
      });
    }

    console.info(
      `[PaymentsConsumer] PIX intent created: ${payload.intentId} for account ${payload.accountId}` +
        (payload.billingRecordId ? ` (billingRecordId: ${payload.billingRecordId})` : '') +
        ` — amount: ${payload.amount} ${payload.currency}`
    );
  }

  async #handlePixConfirmed(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as PixConfirmedPayload;
    const completedAt = payload.completedAt ?? payload.confirmedAt ?? nowIso();
    let transaction = await this.#pixTransactions.findByTransactionId(payload.intentId);

    if (!transaction) {
      const createdAt = event.createdAt ?? completedAt;
      await this.#pixTransactions.create({
        transactionId: payload.intentId,
        provider: 'local-pix',
        accountId: payload.accountId,
        billingRecordId: payload.billingRecordId,
        amount: 0,
        currency: 'BRL',
        description: `PIX payment ${payload.intentId}`,
        qrCodePayload: '',
        qrCodeBase64: '',
        expiresAt: completedAt,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
        billingSettlementStatus: payload.billingRecordId ? 'pending_billing' : 'not_applicable',
        cashReconciliationStatus: 'pending'
      });
      transaction = await this.#pixTransactions.findByTransactionId(payload.intentId);
    }

    const updatedTransaction = await this.#pixTransactions.updateStatus({
      transactionId: payload.intentId,
      status: 'completed',
      updatedAt: completedAt,
      providerTransactionId: payload.providerTransactionId ?? transaction?.providerTransactionId,
      providerConfirmationId: payload.providerConfirmationId ?? payload.providerTransactionId,
      completedAt,
      lastProviderSyncAt: completedAt,
      billingSettlementStatus: payload.billingRecordId ? 'pending_billing' : 'not_applicable'
    });

    const effectiveTransaction = updatedTransaction ?? transaction;
    if (!effectiveTransaction) {
      return;
    }

    if (!payload.billingRecordId) {
      await this.#pixTransactions.updateCashReconciliation({
        transactionId: payload.intentId,
        cashReconciliationStatus: 'skipped_no_open_register',
        cashReconciledAt: completedAt,
        updatedAt: completedAt
      });
      console.warn(
        `[PaymentsConsumer] payment.pix.confirmed event ${event.id} has no billingRecordId — skipping billing settlement`
      );
      return;
    }

    if (effectiveTransaction.billingSettlementStatus === 'applied') {
      await this.#pixTransactions.updateCashReconciliation({
        transactionId: payload.intentId,
        cashReconciliationStatus: 'skipped_no_open_register',
        cashReconciledAt: completedAt,
        updatedAt: completedAt
      });
      return;
    }

    try {
      await this.#billing.settleByRecordId(payload.billingRecordId as BillingRecordId);

      const hasReceivablePayment = await this.#hasReceivablePaymentLink(
        payload.billingRecordId,
        payload.intentId
      );
      if (!hasReceivablePayment && effectiveTransaction.amount > 0) {
        await this.#encounterFinancial.recordPaymentForBillingRecord(
          payload.billingRecordId as BillingRecordId,
          {
            amountPaid: effectiveTransaction.amount,
            notes: `PIX confirmed for ${payload.intentId}`,
            externalReferenceType: 'pix_transaction',
            externalReferenceId: payload.intentId
          }
        );
      }

      await this.#pixTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'applied',
        billingSettledAt: completedAt,
        updatedAt: completedAt,
        billingSettlementError: undefined
      });
      await this.#pixTransactions.updateCashReconciliation({
        transactionId: payload.intentId,
        cashReconciliationStatus: 'skipped_no_open_register',
        cashReconciledAt: completedAt,
        updatedAt: completedAt,
        cashReconciliationError: undefined
      });
    } catch (error) {
      await this.#pixTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'failed',
        updatedAt: completedAt,
        billingSettlementError: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    console.info(
      `[PaymentsConsumer] Settled billing record ${payload.billingRecordId} after PIX confirmation (event ${event.id})`
    );
  }

  async #hasReceivablePaymentLink(
    billingRecordId: string,
    transactionId: string
  ): Promise<boolean> {
    const billingRecord = this.#billing.getOrThrow(billingRecordId as BillingRecordId);
    const summary = await this.#encounterFinancial.getSummary(billingRecord.encounterId);
    return summary.payments.some(
      (payment) =>
        payment.externalReferenceType === 'pix_transaction'
        && payment.externalReferenceId === transactionId
    );
  }

  #normalizeProvider(provider: string): PixGatewayProviderName {
    if (provider === 'mock' || provider === 'pagarme' || provider === 'local-pix') {
      return provider;
    }
    return 'local-pix';
  }
}
