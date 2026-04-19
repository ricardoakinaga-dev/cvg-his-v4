import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type {
  PixTransactionRecord,
  PixTransactionRepository
} from '../pix-transaction-repository.js';
import type {
  CardTransactionRecord,
  CardTransactionRepository
} from '../card-transaction-repository.js';

export interface FinancialRoutesHandlers {
  encounterFinancial: EncounterFinancialService;
  billing: BillingService;
  audit: AuditService;
  pixTransactions: PixTransactionRepository;
  cardTransactions: CardTransactionRepository;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function normalizePage(value: string | null, fallback: number): number {
  const parsed = Number(value ?? String(fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

type AgingBucketId = 'current' | '1_30' | '31_60' | '61_90' | '91_plus';

function deriveAgingBucket(dueAt: string | null, now: Date): AgingBucketId {
  if (!dueAt) {
    return 'current';
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return 'current';
  }

  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDue = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate()
  );
  const daysPastDue = Math.floor((utcNow - utcDue) / (24 * 60 * 60 * 1000));

  if (daysPastDue <= 0) {
    return 'current';
  }
  if (daysPastDue <= 30) {
    return '1_30';
  }
  if (daysPastDue <= 60) {
    return '31_60';
  }
  if (daysPastDue <= 90) {
    return '61_90';
  }
  return '91_plus';
}

async function buildReceivablesAgingReport(
  handlers: FinancialRoutesHandlers,
  params: {
    readonly accountId: string;
    readonly search?: string;
    readonly now?: Date;
  }
) {
  const data: Array<{
    readonly receivableId: string;
    readonly encounterId: string;
    readonly installmentLabel: string;
    readonly dueAt: string | null;
    readonly amountOutstanding: number;
    readonly patientName: string;
    readonly ownerName: string;
    readonly bucket: AgingBucketId;
    readonly financialStatus: string;
  }> = [];
  let page = 1;

  for (;;) {
    const result = await handlers.encounterFinancial.listReceivables({
      accountId: params.accountId as never,
      status: 'open',
      search: params.search,
      page,
      pageSize: 100
    });
    const rows = result.data as Array<{
      readonly id: string;
      readonly encounterId: string;
      readonly installmentLabel: string;
      readonly dueAt: string | null;
      readonly amountOutstanding: number;
      readonly patientName: string;
      readonly ownerName: string;
      readonly financialStatus: string;
    }>;
    const now = params.now ?? new Date();

    data.push(
      ...rows.map((row) => ({
        receivableId: row.id,
        encounterId: row.encounterId,
        installmentLabel: row.installmentLabel,
        dueAt: row.dueAt,
        amountOutstanding: row.amountOutstanding,
        patientName: row.patientName,
        ownerName: row.ownerName,
        bucket: deriveAgingBucket(row.dueAt, now),
        financialStatus: row.financialStatus
      }))
    );

    if (data.length >= result.total || rows.length === 0) {
      break;
    }

    page += 1;
  }

  const bucketLabels: Record<AgingBucketId, string> = {
    current: 'A vencer',
    '1_30': '1-30 dias',
    '31_60': '31-60 dias',
    '61_90': '61-90 dias',
    '91_plus': '91+ dias'
  };
  const buckets = (['current', '1_30', '31_60', '61_90', '91_plus'] as const).map((bucket) => {
    const items = data.filter((row) => row.bucket === bucket);
    const amount = items.reduce((sum, row) => sum + row.amountOutstanding, 0);
    return {
      bucket,
      label: bucketLabels[bucket],
      count: items.length,
      amount
    };
  });
  const totalOpenAmount = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const currentAmount = buckets.find((bucket) => bucket.bucket === 'current')?.amount ?? 0;
  const overdueAmount = totalOpenAmount - currentAmount;

  return {
    generatedAt: (params.now ?? new Date()).toISOString(),
    totalOpenCount: data.length,
    totalOpenAmount,
    currentAmount,
    overdueAmount,
    buckets,
    data: data.sort((left, right) => {
      const leftDueAt = left.dueAt ?? '9999-12-31T00:00:00.000Z';
      const rightDueAt = right.dueAt ?? '9999-12-31T00:00:00.000Z';
      return leftDueAt.localeCompare(rightDueAt);
    })
  };
}

function deriveReconciliationState(
  transaction: PixTransactionRecord,
  hasReceivableLink: boolean
): 'pending' | 'attention_required' | 'reconciled' {
  if (transaction.status !== 'completed') {
    return 'pending';
  }

  const billingApplied =
    transaction.billingSettlementStatus === 'applied'
    || transaction.billingSettlementStatus === 'not_applicable';
  const cashApplied =
    transaction.cashReconciliationStatus === 'applied'
    || transaction.cashReconciliationStatus === 'skipped_no_open_register';
  const receivableApplied = !transaction.billingRecordId || hasReceivableLink;

  if (billingApplied && cashApplied && receivableApplied) {
    return 'reconciled';
  }

  return 'attention_required';
}

async function listReconciliationRows(
  handlers: FinancialRoutesHandlers,
  params: {
    readonly accountId: string;
    readonly status?: PixTransactionRecord['status'];
    readonly provider?: PixTransactionRecord['provider'];
    readonly search?: string;
    readonly page?: number;
    readonly pageSize?: number;
  }
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
  const search = params.search?.trim().toLowerCase();
  const transactions = await handlers.pixTransactions.list({
    accountId: params.accountId,
    status: params.status,
    provider: params.provider
  });

  const billingCache = new Map<string, ReturnType<BillingService['getOrThrow']> | null>();
  const summaryCache = new Map<string, Awaited<ReturnType<EncounterFinancialService['getSummary']>> | null>();

  async function getBillingRecord(recordId: string) {
    if (!billingCache.has(recordId)) {
        try {
        billingCache.set(recordId, handlers.billing.getOrThrow(recordId as never));
      } catch {
        billingCache.set(recordId, null);
      }
    }
    return billingCache.get(recordId) ?? null;
  }

  async function getFinancialSummary(encounterId: string) {
    if (!summaryCache.has(encounterId)) {
      try {
        summaryCache.set(encounterId, await handlers.encounterFinancial.getSummary(encounterId as never));
      } catch {
        summaryCache.set(encounterId, null);
      }
    }
    return summaryCache.get(encounterId) ?? null;
  }

  const data = [];
  for (const transaction of transactions) {
    const billingRecord = transaction.billingRecordId
      ? await getBillingRecord(transaction.billingRecordId)
      : null;
    const financialSummary = billingRecord
      ? await getFinancialSummary(billingRecord.encounterId)
      : null;
    const matchingTokens = [transaction.providerTransactionId, transaction.transactionId].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
    const matchedPayments = financialSummary
      ? financialSummary.payments.filter(
          (payment) =>
            payment.externalReferenceType === 'pix_transaction'
            && payment.externalReferenceId === transaction.transactionId
        )
      : [];
    const fallbackPayments =
      matchedPayments.length === 0 && financialSummary
        ? financialSummary.payments.filter((payment) =>
            matchingTokens.some((token) => (payment.notes ?? '').includes(token))
          )
        : [];
    const effectivePayments = matchedPayments.length > 0 ? matchedPayments : fallbackPayments;
    const receivableIds = Array.from(new Set(effectivePayments.map((payment) => payment.receivableId)));
    const matchedReceivables = financialSummary
      ? financialSummary.receivables.filter((receivable) => receivableIds.includes(receivable.id))
      : [];
    const reconciliationState = deriveReconciliationState(transaction, effectivePayments.length > 0);

    const row = {
      transactionId: transaction.transactionId,
      provider: transaction.provider,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      expiresAt: transaction.expiresAt,
      completedAt: transaction.completedAt ?? null,
      providerTransactionId: transaction.providerTransactionId ?? null,
      providerConfirmationId: transaction.providerConfirmationId ?? null,
      providerWebhookEventId: transaction.providerWebhookEventId ?? null,
      billingRecordId: transaction.billingRecordId ?? null,
      billingSettlementStatus: transaction.billingSettlementStatus,
      billingSettledAt: transaction.billingSettledAt ?? null,
      billingSettlementError: transaction.billingSettlementError ?? null,
      cashReconciliationStatus: transaction.cashReconciliationStatus,
      cashReconciledAt: transaction.cashReconciledAt ?? null,
      cashReconciliationError: transaction.cashReconciliationError ?? null,
      cashRegisterId: transaction.cashRegisterId ?? null,
      cashMovementId: transaction.cashMovementId ?? null,
      encounterId: billingRecord?.encounterId ?? null,
      encounterStatus: financialSummary?.encounterStatus ?? null,
      financialStatus: financialSummary?.financialStatus ?? null,
      patientId: financialSummary?.patientId ?? null,
      patientName: financialSummary?.patientName ?? null,
      ownerId: financialSummary?.ownerId ?? null,
      ownerName: financialSummary?.ownerName ?? null,
      receivableIds,
      receivableLabels: matchedReceivables.map((receivable) => receivable.installmentLabel),
      receivableStatuses: matchedReceivables.map((receivable) => receivable.status),
      receivablePaymentIds: effectivePayments.map((payment) => payment.id),
      receivablePaidAmount: effectivePayments.reduce((sum, payment) => sum + payment.amountPaid, 0),
      reconciliationState
    };

    const haystack = [
      row.transactionId,
      row.providerTransactionId ?? '',
      row.billingRecordId ?? '',
      row.cashMovementId ?? '',
      row.patientName ?? '',
      row.ownerName ?? '',
      row.receivableIds.join(' ')
    ]
      .join(' ')
      .toLowerCase();

    if (search && !haystack.includes(search)) {
      continue;
    }

    data.push({
      ...row
    });
  }

  const total = data.length;
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  const completedCount = data.filter((item) => item.status === 'completed').length;
  const reconciledCount = data.filter((item) => item.reconciliationState === 'reconciled').length;
  const attentionCount = data.filter(
    (item) => item.reconciliationState === 'attention_required'
  ).length;
  const pendingCount = data.filter((item) => item.reconciliationState === 'pending').length;

  return {
    data: paged,
    page,
    pageSize,
    total,
    completedCount,
    reconciledCount,
    attentionCount,
    pendingCount
  };
}

async function listCardReconciliationRows(
  handlers: FinancialRoutesHandlers,
  params: {
    readonly accountId: string;
    readonly status?: CardTransactionRecord['status'];
    readonly provider?: CardTransactionRecord['provider'];
    readonly search?: string;
    readonly page?: number;
    readonly pageSize?: number;
  }
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
  const search = params.search?.trim().toLowerCase();
  const transactions = await handlers.cardTransactions.list({
    accountId: params.accountId,
    status: params.status,
    provider: params.provider
  });

  const billingCache = new Map<string, ReturnType<BillingService['getOrThrow']> | null>();
  const summaryCache = new Map<string, Awaited<ReturnType<EncounterFinancialService['getSummary']>> | null>();

  async function getBillingRecord(recordId: string) {
    if (!billingCache.has(recordId)) {
      try {
        billingCache.set(recordId, handlers.billing.getOrThrow(recordId as never));
      } catch {
        billingCache.set(recordId, null);
      }
    }
    return billingCache.get(recordId) ?? null;
  }

  async function getFinancialSummary(encounterId: string) {
    if (!summaryCache.has(encounterId)) {
      try {
        summaryCache.set(
          encounterId,
          await handlers.encounterFinancial.getSummary(encounterId as never)
        );
      } catch {
        summaryCache.set(encounterId, null);
      }
    }
    return summaryCache.get(encounterId) ?? null;
  }

  const data = [];
  for (const transaction of transactions) {
    const billingRecord = transaction.billingRecordId
      ? await getBillingRecord(transaction.billingRecordId)
      : null;
    const financialSummary = billingRecord
      ? await getFinancialSummary(billingRecord.encounterId)
      : null;
    const matchedPayments = financialSummary
      ? financialSummary.payments.filter(
          (payment) =>
            payment.externalReferenceType === 'other'
            && payment.externalReferenceId === transaction.transactionId
        )
      : [];
    const receivableIds = Array.from(new Set(matchedPayments.map((payment) => payment.receivableId)));
    const matchedReceivables = financialSummary
      ? financialSummary.receivables.filter((receivable) => receivableIds.includes(receivable.id))
      : [];
    const reconciliationState =
      transaction.status === 'captured'
      && (transaction.billingSettlementStatus === 'applied'
        || transaction.billingSettlementStatus === 'not_applicable')
        ? 'reconciled'
        : transaction.status === 'captured'
          ? 'attention_required'
          : 'pending';

    const row = {
      transactionId: transaction.transactionId,
      provider: transaction.provider,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      installments: transaction.installments,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      capturedAt: transaction.capturedAt ?? null,
      providerOrderId: transaction.providerOrderId ?? null,
      providerChargeId: transaction.providerChargeId ?? null,
      providerAuthorizationCode: transaction.providerAuthorizationCode ?? null,
      providerReferenceId: transaction.providerReferenceId ?? null,
      billingRecordId: transaction.billingRecordId ?? null,
      billingSettlementStatus: transaction.billingSettlementStatus,
      billingSettledAt: transaction.billingSettledAt ?? null,
      billingSettlementError: transaction.billingSettlementError ?? null,
      failureReason: transaction.failureReason ?? null,
      encounterId: billingRecord?.encounterId ?? null,
      encounterStatus: financialSummary?.encounterStatus ?? null,
      financialStatus: financialSummary?.financialStatus ?? null,
      patientId: financialSummary?.patientId ?? null,
      patientName: financialSummary?.patientName ?? null,
      ownerId: financialSummary?.ownerId ?? null,
      ownerName: financialSummary?.ownerName ?? null,
      cardHolderName: transaction.cardHolderName ?? null,
      cardBrand: transaction.cardBrand ?? null,
      cardLast4: transaction.cardLast4 ?? null,
      receivableIds,
      receivableLabels: matchedReceivables.map((receivable) => receivable.installmentLabel),
      receivableStatuses: matchedReceivables.map((receivable) => receivable.status),
      receivablePaymentIds: matchedPayments.map((payment) => payment.id),
      receivablePaidAmount: matchedPayments.reduce((sum, payment) => sum + payment.amountPaid, 0),
      reconciliationState
    };

    const haystack = [
      row.transactionId,
      row.providerOrderId ?? '',
      row.providerChargeId ?? '',
      row.billingRecordId ?? '',
      row.patientName ?? '',
      row.ownerName ?? '',
      row.cardHolderName ?? '',
      row.cardBrand ?? '',
      row.cardLast4 ?? ''
    ]
      .join(' ')
      .toLowerCase();
    if (search && !haystack.includes(search)) {
      continue;
    }

    data.push(row);
  }

  const total = data.length;
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  return {
    data: paged,
    page,
    pageSize,
    total,
    capturedCount: data.filter((item) => item.status === 'captured').length,
    awaitingCaptureCount: data.filter((item) => item.status === 'authorized_pending_capture').length,
    attentionCount: data.filter((item) => item.reconciliationState === 'attention_required').length,
    pendingCount: data.filter((item) => item.reconciliationState === 'pending').length,
    reconciledCount: data.filter((item) => item.reconciliationState === 'reconciled').length
  };
}

export async function handleFinancialRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: FinancialRoutesHandlers
): Promise<boolean> {
  const isFinancialPath =
    pathname === '/financial/receivables'
    || pathname === '/financial/aging'
    || pathname === '/financial/reconciliation'
    || pathname === '/financial/reconciliation/cards'
    || pathname.startsWith('/encounters/')
    || pathname.startsWith('/financial/receivables/');
  if (!isFinancialPath) {
    return false;
  }

  const { encounterFinancial, audit, requirePrincipal } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (
    pathname.startsWith('/encounters/')
    && pathname.endsWith('/financial-summary')
    && request.method === 'GET'
  ) {
    const principal = requirePrincipal(request, 'billing.read');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    const summary = await encounterFinancial.getSummary(encounterId as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'financial_summary',
      entityType: 'encounter-financial-account',
      entityId: encounterId,
      payloadSummary: `Financial summary retrieved for encounter ${encounterId}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, summary);
  }

  if (
    pathname.startsWith('/encounters/')
    && pathname.endsWith('/financial-close')
    && request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'billing.manage');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const summary = await encounterFinancial.closeEncounterFinancial(
      encounterId as never,
      principal.user.id as never,
      {
        paidAmount:
          typeof payload.paidAmount === 'number' && Number.isFinite(payload.paidAmount)
            ? payload.paidAmount
            : undefined,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
        installments: Array.isArray(payload.installments)
          ? payload.installments
              .filter(
                (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
              )
              .map((item) => ({
                label: typeof item.label === 'string' ? item.label : undefined,
                amount: Number(item.amount),
                dueAt: typeof item.dueAt === 'string' ? item.dueAt : null,
                notes: typeof item.notes === 'string' ? item.notes : null
              }))
          : undefined
      }
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'financial_close',
      entityType: 'encounter-financial-account',
      entityId: encounterId,
      payloadSummary: `Financial close executed for encounter ${encounterId}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, summary);
  }

  if (pathname === '/financial/receivables' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const status = url.searchParams.get('status');
    const encounterId = url.searchParams.get('encounterId');
    const search = url.searchParams.get('search');
    const result = await encounterFinancial.listReceivables({
      accountId: principal.user.accountId as never,
      status: status === 'open' || status === 'settled' ? status : undefined,
      encounterId: encounterId ? (encounterId as never) : undefined,
      search: search ?? undefined,
      page: normalizePage(url.searchParams.get('page'), 1),
      pageSize: normalizePage(url.searchParams.get('pageSize'), 20)
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_receivables',
      entityType: 'encounter-receivable',
      entityId: encounterId ?? 'all',
      payloadSummary: 'Encounter receivables listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, result);
  }

  if (pathname === '/financial/aging' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const search = url.searchParams.get('search');
    const result = await buildReceivablesAgingReport(handlers, {
      accountId: principal.user.accountId,
      search: search ?? undefined
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'financial_aging_report',
      entityType: 'encounter-receivable',
      entityId: 'all',
      payloadSummary: 'Financial aging report listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, result);
  }

  if (pathname === '/financial/reconciliation' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const status = url.searchParams.get('status');
    const provider = url.searchParams.get('provider');
    const search = url.searchParams.get('search');
    const result = await listReconciliationRows(handlers, {
      accountId: principal.user.accountId,
      status:
        status === 'pending'
        || status === 'completed'
        || status === 'expired'
        || status === 'cancelled'
          ? status
          : undefined,
      provider:
        provider === 'local-pix' || provider === 'mock' || provider === 'pagarme'
          ? provider
          : undefined,
      search: search ?? undefined,
      page: normalizePage(url.searchParams.get('page'), 1),
      pageSize: normalizePage(url.searchParams.get('pageSize'), 20)
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_financial_reconciliation',
      entityType: 'pix-transaction',
      entityId: 'all',
      payloadSummary: 'Financial reconciliation view listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, result);
  }

  if (pathname === '/financial/reconciliation/cards' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
    const status = url.searchParams.get('status');
    const provider = url.searchParams.get('provider');
    const search = url.searchParams.get('search');
    const result = await listCardReconciliationRows(handlers, {
      accountId: principal.user.accountId,
      status:
        status === 'pending'
        || status === 'authorized_pending_capture'
        || status === 'captured'
        || status === 'not_authorized'
        || status === 'failed'
        || status === 'voided'
          ? status
          : undefined,
      provider:
        provider === 'local-card' || provider === 'pagarme-card'
          ? provider
          : undefined,
      search: search ?? undefined,
      page: normalizePage(url.searchParams.get('page'), 1),
      pageSize: normalizePage(url.searchParams.get('pageSize'), 20)
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_card_reconciliation',
      entityType: 'card-transaction',
      entityId: 'all',
      payloadSummary: 'Card reconciliation view listed',
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, result);
  }

  if (
    pathname.startsWith('/financial/receivables/')
    && pathname.endsWith('/settle')
    && request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'billing.manage');
    const receivableId = requireNonEmptyString(pathname.split('/')[3], 'receivableId');
    const payload = (await readJsonBody(request)) as Record<string, unknown>;
    const settled = await encounterFinancial.settleReceivable(receivableId, {
      amountPaid: Number(payload.amountPaid),
      notes: typeof payload.notes === 'string' ? payload.notes : null,
      paidByUserId: principal.user.id as never
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'settle_receivable',
      entityType: 'encounter-receivable',
      entityId: receivableId,
      payloadSummary: `Encounter receivable ${receivableId} settled`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, settled);
  }

  return false;
}
