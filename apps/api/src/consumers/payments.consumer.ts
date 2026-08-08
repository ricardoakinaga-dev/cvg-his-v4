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
import type {
  CardGatewayProviderName,
  CardTransactionRecord,
  CardTransactionRepository
} from '../card-transaction-repository.js';

export interface PaymentsConsumerOptions {
  readonly billing: BillingService;
  readonly encounterFinancial: EncounterFinancialService;
  readonly pixTransactions: PixTransactionRepository;
  readonly cardTransactions: CardTransactionRepository;
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
  readonly providerTransactionId?: string;
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

interface CardIntentCreatedPayload {
  readonly accountId: string;
  readonly intentId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: string;
  readonly provider: string;
  readonly status: string;
  readonly createdAt?: string;
  readonly description?: string;
  readonly installments?: number;
  readonly card?: {
    readonly holderName?: string;
    readonly brand?: string;
    readonly last4?: string;
  };
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
}

interface CardCompletedPayload {
  readonly accountId: string;
  readonly intentId: string;
  readonly billingRecordId?: string;
  readonly provider?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly status?: string;
  readonly capturedAt?: string;
  readonly completedAt?: string;
}

interface CardFailedPayload {
  readonly accountId: string;
  readonly intentId: string;
  readonly billingRecordId?: string;
  readonly provider?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly status?: string;
  readonly failureReason?: string;
  readonly failedAt?: string;
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
  readonly #cardTransactions: CardTransactionRepository;

  constructor(options: PaymentsConsumerOptions) {
    this.#billing = options.billing;
    this.#encounterFinancial = options.encounterFinancial;
    this.#pixTransactions = options.pixTransactions;
    this.#cardTransactions = options.cardTransactions;
  }

  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'payment.pix.intent.created':
        await this.#handlePixIntentCreated(event);
        break;
      case 'payment.pix.confirmed':
        await this.#handlePixConfirmed(event);
        break;
      case 'payment.card.intent.created':
        await this.#handleCardIntentCreated(event);
        break;
      case 'payment.card.completed':
        await this.#handleCardCompleted(event);
        break;
      case 'payment.card.failed':
        await this.#handleCardFailed(event);
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
        providerTransactionId: payload.providerTransactionId,
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
      const billingRecord = this.#billing.getOrThrow(
        payload.billingRecordId as BillingRecordId
      );
      if (
        effectiveTransaction.accountId !== payload.accountId ||
        effectiveTransaction.billingRecordId !== payload.billingRecordId ||
        billingRecord.accountId !== payload.accountId
      ) {
        throw new Error('PIX confirmation does not match the billing account');
      }
      if (
        effectiveTransaction.currency !== billingRecord.currency ||
        effectiveTransaction.amount !== billingRecord.subtotalAmount
      ) {
        throw new Error('PIX confirmation amount does not match the billing record');
      }
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

  async #handleCardIntentCreated(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as CardIntentCreatedPayload;
    const existing = await this.#cardTransactions.findByTransactionId(payload.intentId);
    if (existing) {
      return;
    }

    const createdAt = payload.createdAt ?? nowIso();
    const initialStatus = this.#normalizeCardStatus(payload.status);
    await this.#cardTransactions.create({
      transactionId: payload.intentId,
      provider: this.#normalizeCardProvider(payload.provider),
      accountId: payload.accountId,
      billingRecordId: payload.billingRecordId,
      amount: payload.amount,
      currency: payload.currency === 'BRL' ? 'BRL' : 'BRL',
      description: payload.description ?? `Card payment ${payload.intentId}`,
      installments: Math.max(1, payload.installments ?? 1),
      status: initialStatus,
      createdAt,
      updatedAt: createdAt,
      capturedAt: initialStatus === 'captured' ? createdAt : undefined,
      lastProviderSyncAt: createdAt,
      providerOrderId: payload.providerOrderId,
      providerChargeId: payload.providerChargeId,
      providerAuthorizationCode: payload.providerAuthorizationCode,
      providerReferenceId: payload.providerReferenceId,
      cardHolderName: payload.card?.holderName,
      cardBrand: payload.card?.brand,
      cardLast4: payload.card?.last4,
      billingSettlementStatus: payload.billingRecordId
        ? initialStatus === 'captured'
          ? 'pending_billing'
          : initialStatus === 'authorized_pending_capture'
            ? 'awaiting_capture'
            : 'failed'
        : 'not_applicable'
    });
  }

  async #handleCardCompleted(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as CardCompletedPayload;
    const completedAt = payload.capturedAt ?? payload.completedAt ?? nowIso();
    let transaction = await this.#cardTransactions.findByTransactionId(payload.intentId);

    if (!transaction) {
      await this.#cardTransactions.create({
        transactionId: payload.intentId,
        provider: this.#normalizeCardProvider(payload.provider ?? 'local-card'),
        accountId: payload.accountId,
        billingRecordId: payload.billingRecordId,
        amount: 0,
        currency: 'BRL',
        description: `Card payment ${payload.intentId}`,
        installments: 1,
        status: 'captured',
        createdAt: completedAt,
        updatedAt: completedAt,
        capturedAt: completedAt,
        lastProviderSyncAt: completedAt,
        providerOrderId: payload.providerOrderId,
        providerChargeId: payload.providerChargeId,
        providerAuthorizationCode: payload.providerAuthorizationCode,
        providerReferenceId: payload.providerReferenceId,
        billingSettlementStatus: payload.billingRecordId ? 'pending_billing' : 'not_applicable'
      });
      transaction = await this.#cardTransactions.findByTransactionId(payload.intentId);
    }

    const updatedTransaction = await this.#cardTransactions.updateStatus({
      transactionId: payload.intentId,
      status: 'captured',
      updatedAt: completedAt,
      capturedAt: completedAt,
      lastProviderSyncAt: completedAt,
      providerOrderId: payload.providerOrderId ?? transaction?.providerOrderId,
      providerChargeId: payload.providerChargeId ?? transaction?.providerChargeId,
      providerAuthorizationCode:
        payload.providerAuthorizationCode ?? transaction?.providerAuthorizationCode,
      providerReferenceId: payload.providerReferenceId ?? transaction?.providerReferenceId,
      billingSettlementStatus: payload.billingRecordId ? 'pending_billing' : 'not_applicable'
    });
    const effectiveTransaction = updatedTransaction ?? transaction;
    if (!effectiveTransaction) {
      return;
    }

    if (!payload.billingRecordId) {
      await this.#cardTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'not_applicable',
        updatedAt: completedAt
      });
      return;
    }

    if (effectiveTransaction.billingSettlementStatus === 'applied') {
      return;
    }

    try {
      await this.#billing.settleByRecordId(payload.billingRecordId as BillingRecordId);
      const hasReceivablePayment = await this.#hasReceivablePaymentLink(
        payload.billingRecordId,
        payload.intentId,
        'other'
      );
      if (!hasReceivablePayment && effectiveTransaction.amount > 0) {
        await this.#encounterFinancial.recordPaymentForBillingRecord(
          payload.billingRecordId as BillingRecordId,
          {
            amountPaid: effectiveTransaction.amount,
            notes: `Card capture confirmed for ${payload.intentId}`,
            externalReferenceType: 'other',
            externalReferenceId: payload.intentId
          }
        );
      }
      await this.#cardTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'applied',
        billingSettledAt: completedAt,
        updatedAt: completedAt,
        billingSettlementError: undefined
      });
    } catch (error) {
      await this.#cardTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'failed',
        updatedAt: completedAt,
        billingSettlementError: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async #handleCardFailed(event: OutboxEvent): Promise<void> {
    const payload = event.payload as unknown as CardFailedPayload;
    const failedAt = payload.failedAt ?? nowIso();
    const existing = await this.#cardTransactions.findByTransactionId(payload.intentId);
    if (!existing) {
      await this.#cardTransactions.create({
        transactionId: payload.intentId,
        provider: this.#normalizeCardProvider(payload.provider ?? 'local-card'),
        accountId: payload.accountId,
        billingRecordId: payload.billingRecordId,
        amount: 0,
        currency: 'BRL',
        description: `Card payment ${payload.intentId}`,
        installments: 1,
        status: 'failed',
        createdAt: failedAt,
        updatedAt: failedAt,
        lastProviderSyncAt: failedAt,
        providerOrderId: payload.providerOrderId,
        providerChargeId: payload.providerChargeId,
        providerAuthorizationCode: payload.providerAuthorizationCode,
        providerReferenceId: payload.providerReferenceId,
        failureReason: payload.failureReason,
        billingSettlementStatus: payload.billingRecordId ? 'failed' : 'not_applicable'
      });
      return;
    }

    await this.#cardTransactions.updateStatus({
      transactionId: payload.intentId,
      status: 'failed',
      updatedAt: failedAt,
      lastProviderSyncAt: failedAt,
      providerOrderId: payload.providerOrderId ?? existing.providerOrderId,
      providerChargeId: payload.providerChargeId ?? existing.providerChargeId,
      providerAuthorizationCode:
        payload.providerAuthorizationCode ?? existing.providerAuthorizationCode,
      providerReferenceId: payload.providerReferenceId ?? existing.providerReferenceId,
      failureReason: payload.failureReason,
      billingSettlementStatus: payload.billingRecordId ? 'failed' : 'not_applicable'
    });
    if (payload.billingRecordId) {
      await this.#cardTransactions.updateBillingSettlement({
        transactionId: payload.intentId,
        billingSettlementStatus: 'failed',
        updatedAt: failedAt,
        billingSettlementError: payload.failureReason
      });
    }
  }

  async #hasReceivablePaymentLink(
    billingRecordId: string,
    transactionId: string,
    externalReferenceType: 'pix_transaction' | 'other' = 'pix_transaction'
  ): Promise<boolean> {
    const billingRecord = this.#billing.getOrThrow(billingRecordId as BillingRecordId);
    const summary = await this.#encounterFinancial.getSummary(billingRecord.encounterId);
    return summary.payments.some(
      (payment) =>
        payment.externalReferenceType === externalReferenceType
        && payment.externalReferenceId === transactionId
    );
  }

  #normalizeProvider(provider: string): PixGatewayProviderName {
    if (provider === 'mock' || provider === 'pagarme' || provider === 'local-pix') {
      return provider;
    }
    return 'local-pix';
  }

  #normalizeCardProvider(provider: string): CardGatewayProviderName {
    if (provider === 'pagarme-card' || provider === 'local-card') {
      return provider;
    }
    return 'local-card';
  }

  #normalizeCardStatus(status: string): CardTransactionRecord['status'] {
    if (
      status === 'authorized_pending_capture'
      || status === 'captured'
      || status === 'not_authorized'
      || status === 'failed'
      || status === 'voided'
    ) {
      return status;
    }
    return 'pending';
  }
}
