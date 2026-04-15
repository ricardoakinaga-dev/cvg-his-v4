import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { CashService } from '@cvg-his-v2/module-cash';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import {
  DatabaseFiscalRepository,
  FiscalService
} from '@cvg-his-v2/module-fiscal';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { QuotesService } from '@cvg-his-v2/module-quotes';
import type { FiscalDashboardSummary } from '@cvg-his-v2/shared-contracts';
import { getPool } from '@cvg-his-v2/shared-database';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import type { PixTransactionRepository } from '../pix-transaction-repository.js';

export interface AdministrativeReportsRoutesHandlers {
  billing: BillingService;
  encounterFinancial: EncounterFinancialService;
  pixTransactions: PixTransactionRepository;
  quotes: QuotesService;
  counterSales: CounterSalesService;
  cash: CashService;
  fiscal: FiscalService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

type FinancialReceivableRow = {
  readonly id: string;
  readonly encounterId: string;
  readonly installmentLabel: string;
  readonly dueAt: string | null;
  readonly amountOutstanding: number;
  readonly amountPaid: number;
  readonly patientName: string;
  readonly ownerName: string;
  readonly status: string;
};

type HighlightSeverity = 'info' | 'warning' | 'danger';

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function getScopedFiscalService(
  fiscal: FiscalService,
  accountId: AuthenticatedPrincipal['user']['accountId']
): FiscalService {
  try {
    getPool();
    return new FiscalService(new DatabaseFiscalRepository(), accountId as never);
  } catch {
    return fiscal;
  }
}

function parseDateFloor(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateCeil(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : `${value}T23:59:59.999Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(
  timestamp: string | null | undefined,
  dateFrom: Date | null,
  dateTo: Date | null
): boolean {
  if (!timestamp) {
    return false;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  if (dateFrom && parsed < dateFrom) {
    return false;
  }

  if (dateTo && parsed > dateTo) {
    return false;
  }

  return true;
}

function agingBucketFor(dueAt: string | null, now: Date): 'current' | 'overdue' {
  if (!dueAt) {
    return 'current';
  }

  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'current';
  }

  return parsed < now ? 'overdue' : 'current';
}

async function listOpenReceivables(
  encounterFinancial: EncounterFinancialService,
  accountId: string
): Promise<FinancialReceivableRow[]> {
  const data: FinancialReceivableRow[] = [];
  let page = 1;

  for (;;) {
    const result = await encounterFinancial.listReceivables({
      accountId: accountId as never,
      status: 'open',
      page,
      pageSize: 100
    });
    const rows = result.data as FinancialReceivableRow[];
    data.push(...rows);

    if (rows.length === 0 || data.length >= result.total) {
      break;
    }

    page += 1;
  }

  return data;
}

function buildHighlights(input: {
  receivablesOutstanding: number;
  overdueReceivables: number;
  pixAttentionCount: number;
  approvedQuotes: number;
  openRegisterBalance: number | null;
  fiscalSummary: FiscalDashboardSummary;
}) {
  const highlights: Array<{
    domain: 'financial' | 'commercial' | 'cash' | 'fiscal';
    severity: HighlightSeverity;
    title: string;
    message: string;
  }> = [];

  if (input.overdueReceivables > 0) {
    highlights.push({
      domain: 'financial',
      severity: 'warning',
      title: 'Recebíveis vencidos',
      message: `${input.overdueReceivables} recebível(is) aberto(s) já ultrapassaram o vencimento.`
    });
  }

  if (input.pixAttentionCount > 0) {
    highlights.push({
      domain: 'financial',
      severity: 'warning',
      title: 'PIX exigindo atenção',
      message: `${input.pixAttentionCount} transação(ões) PIX concluída(s) ainda não estão conciliadas integralmente.`
    });
  }

  if (input.approvedQuotes > 0) {
    highlights.push({
      domain: 'commercial',
      severity: 'info',
      title: 'Orçamentos aprovados aguardando conversão',
      message: `${input.approvedQuotes} orçamento(s) aprovado(s) ainda não viraram venda ou faturamento efetivo.`
    });
  }

  if (typeof input.openRegisterBalance === 'number' && input.openRegisterBalance < 0) {
    highlights.push({
      domain: 'cash',
      severity: 'danger',
      title: 'Caixa com saldo negativo',
      message: `O caixa aberto está com saldo corrente de ${input.openRegisterBalance.toFixed(2)}.`
    });
  }

  for (const alert of input.fiscalSummary.alerts.slice(0, 3)) {
    highlights.push({
      domain: 'fiscal',
      severity: alert.variant === 'warning' ? 'warning' : 'info',
      title: alert.title,
      message: alert.message
    });
  }

  if (highlights.length === 0 && input.receivablesOutstanding === 0) {
    highlights.push({
      domain: 'financial',
      severity: 'info',
      title: 'Sem pendências críticas',
      message: 'Os hubs administrativos não identificaram alertas imediatos nesta leitura.'
    });
  }

  return highlights;
}

export async function handleAdministrativeReportsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AdministrativeReportsRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/reports/administrative-hubs' || request.method !== 'GET') {
    return false;
  }

  const principal = handlers.requirePrincipal(request, 'billing.read');
  const url = new URL(request.url ?? pathname, 'http://localhost');
  const dateFrom = parseDateFloor(url.searchParams.get('dateFrom'));
  const dateTo = parseDateCeil(url.searchParams.get('dateTo'));
  const scopedFiscal = getScopedFiscalService(handlers.fiscal, principal.user.accountId);

  const [
    billingRecordsRaw,
    openReceivablesRaw,
    pixTransactionsRaw,
    quotesRaw,
    commercialDashboard,
    counterSalesRaw,
    openRegister,
    fiscalSummary
  ] = await Promise.all([
    Promise.resolve(handlers.billing.list()),
    listOpenReceivables(handlers.encounterFinancial, principal.user.accountId),
    handlers.pixTransactions.list({ accountId: principal.user.accountId }),
    Promise.resolve(handlers.quotes.list(principal.user.accountId as never)),
    handlers.counterSales.getCommercialDashboard(
      principal.user.accountId as never,
      url.searchParams.get('dateFrom') ?? undefined,
      url.searchParams.get('dateTo') ?? undefined
    ),
    Promise.resolve(handlers.counterSales.list(principal.user.accountId as never)),
    handlers.cash.findOpenRegister(principal.user.accountId as never),
    scopedFiscal.getDashboardSummary()
  ]);

  const billingRecords = billingRecordsRaw.filter(
    (record) =>
      record.accountId === principal.user.accountId
      && (!dateFrom && !dateTo
        ? true
        : isWithinRange(record.createdAt, dateFrom, dateTo)
        || isWithinRange(record.updatedAt, dateFrom, dateTo))
  );
  const openReceivables = openReceivablesRaw.filter(
    (row) => !dateFrom && !dateTo ? true : isWithinRange(row.dueAt ?? undefined, dateFrom, dateTo)
  );
  const pixTransactions = pixTransactionsRaw.filter((row) =>
    !dateFrom && !dateTo
      ? true
      : isWithinRange(row.completedAt ?? row.createdAt, dateFrom, dateTo)
  );
  const quotes = quotesRaw.filter((row) =>
    !dateFrom && !dateTo
      ? true
      : isWithinRange(row.convertedAt ?? row.createdAt, dateFrom, dateTo)
  );
  const counterSales = counterSalesRaw.filter((row) =>
    !dateFrom && !dateTo
      ? true
      : isWithinRange(row.closedAt ?? row.createdAt, dateFrom, dateTo)
  );

  const receivablesCurrent = openReceivables.filter(
    (row) => agingBucketFor(row.dueAt, new Date()) === 'current'
  );
  const receivablesOverdue = openReceivables.filter(
    (row) => agingBucketFor(row.dueAt, new Date()) === 'overdue'
  );

  const pixCompleted = pixTransactions.filter((row) => row.status === 'completed');
  const pixReconciled = pixCompleted.filter(
    (row) =>
      (row.billingSettlementStatus === 'applied'
        || row.billingSettlementStatus === 'not_applicable')
      && (row.cashReconciliationStatus === 'applied'
        || row.cashReconciliationStatus === 'skipped_no_open_register')
  );
  const pixAttention = pixCompleted.filter((row) => !pixReconciled.includes(row));

  const quoteApproved = quotes.filter((row) => row.status === 'approved');
  const quoteConverted = quotes.filter((row) => row.convertedToSaleId);
  const quotePipeline = quotes.filter((row) => row.status === 'draft' || row.status === 'approved');
  const recentRegisters = handlers.cash.listRegisters(principal.user.accountId as never, 5);
  const recentRegisterSummaries = await Promise.all(
    recentRegisters.map(async (register) => ({
      id: register.id,
      status: register.status,
      openedAt: register.openedAt,
      closedAt: register.closedAt,
      openingAmount: register.openingAmount,
      closingAmount: register.closingAmount,
      difference: register.difference,
      runningBalance: await handlers.cash.getCurrentBalance(register.id)
    }))
  );
  const openRegisterBalance =
    openRegister ? await handlers.cash.getCurrentBalance(openRegister.id) : null;
  const recentMovements = openRegister
    ? (await handlers.cash.getMovements(openRegister.id))
        .slice(-5)
        .reverse()
        .map((movement) => ({
          id: movement.id,
          movementType: movement.movementType,
          amount: movement.amount,
          runningBalance: movement.runningBalance,
          reference: movement.reference,
          createdAt: movement.createdAt
        }))
    : [];

  const payload = {
    generatedAt: new Date().toISOString(),
    filters: {
      dateFrom: url.searchParams.get('dateFrom'),
      dateTo: url.searchParams.get('dateTo')
    },
    executive: {
      outstandingReceivables: Math.round(
        openReceivables.reduce((sum, row) => sum + row.amountOutstanding, 0) * 100
      ) / 100,
      pixAttentionCount: pixAttention.length,
      quotePipelineAmount:
        Math.round(quotePipeline.reduce((sum, row) => sum + row.total, 0) * 100) / 100,
      commercialRevenue:
        Math.round(counterSales.filter((row) => row.status === 'closed').reduce((sum, row) => sum + row.total, 0) * 100) / 100,
      openCashBalance: openRegisterBalance,
      fiscalCoverageScore: Math.min(
        100,
        fiscalSummary.activeTaxes * 10
        + fiscalSummary.cfopCount
        + fiscalSummary.nfseLayouts * 8
      )
    },
    domains: {
      financial: {
        billing: {
          totalRecords: billingRecords.length,
          draftCount: billingRecords.filter((row) => row.status === 'draft').length,
          estimatedCount: billingRecords.filter((row) => row.status === 'estimated').length,
          openCount: billingRecords.filter((row) => row.status === 'open').length,
          settledCount: billingRecords.filter((row) => row.status === 'settled').length,
          grossAmount:
            Math.round(billingRecords.reduce((sum, row) => sum + row.subtotalAmount, 0) * 100)
            / 100
        },
        receivables: {
          openCount: openReceivables.length,
          currentCount: receivablesCurrent.length,
          overdueCount: receivablesOverdue.length,
          totalOutstanding:
            Math.round(openReceivables.reduce((sum, row) => sum + row.amountOutstanding, 0) * 100)
            / 100,
          currentAmount:
            Math.round(receivablesCurrent.reduce((sum, row) => sum + row.amountOutstanding, 0) * 100)
            / 100,
          overdueAmount:
            Math.round(receivablesOverdue.reduce((sum, row) => sum + row.amountOutstanding, 0) * 100)
            / 100,
          topOpenReceivables: openReceivables
            .slice()
            .sort((left, right) => right.amountOutstanding - left.amountOutstanding)
            .slice(0, 5)
            .map((row) => ({
              receivableId: row.id,
              encounterId: row.encounterId,
              installmentLabel: row.installmentLabel,
              patientName: row.patientName,
              ownerName: row.ownerName,
              dueAt: row.dueAt,
              amountOutstanding: row.amountOutstanding
            }))
        },
        pix: {
          totalTransactions: pixTransactions.length,
          completedCount: pixCompleted.length,
          pendingCount: pixTransactions.filter((row) => row.status === 'pending').length,
          expiredCount: pixTransactions.filter((row) => row.status === 'expired').length,
          cancelledCount: pixTransactions.filter((row) => row.status === 'cancelled').length,
          reconciledCount: pixReconciled.length,
          attentionRequiredCount: pixAttention.length,
          completedAmount:
            Math.round(pixCompleted.reduce((sum, row) => sum + row.amount, 0) * 100) / 100,
          byProvider: Object.entries(
            pixTransactions.reduce<Record<string, number>>((accumulator, row) => {
              accumulator[row.provider] = (accumulator[row.provider] ?? 0) + row.amount;
              return accumulator;
            }, {})
          )
            .map(([provider, amount]) => ({ provider, amount: Math.round(amount * 100) / 100 }))
            .sort((left, right) => right.amount - left.amount)
        }
      },
      commercial: {
        quotes: {
          issuedCount: quotes.length,
          approvedCount: quoteApproved.length,
          convertedCount: quoteConverted.length,
          rejectedCount: quotes.filter((row) => row.status === 'rejected').length,
          pipelineAmount:
            Math.round(quotePipeline.reduce((sum, row) => sum + row.total, 0) * 100) / 100,
          convertedAmount:
            Math.round(quoteConverted.reduce((sum, row) => sum + row.total, 0) * 100) / 100,
          recent: quotes.slice(0, 5).map((row) => ({
            id: row.id,
            number: row.number,
            status: row.status,
            total: row.total,
            convertedAt: row.convertedAt,
            createdAt: row.createdAt
          }))
        },
        counterSales: {
          totalSales: counterSales.length,
          openCount: counterSales.filter((row) => row.status === 'open').length,
          closedCount: counterSales.filter((row) => row.status === 'closed').length,
          cancelledCount: counterSales.filter((row) => row.status === 'cancelled').length,
          grossRevenue:
            Math.round(counterSales.filter((row) => row.status === 'closed').reduce((sum, row) => sum + row.total, 0) * 100)
            / 100,
          netRevenue:
            Math.round(counterSales.filter((row) => row.status === 'closed').reduce((sum, row) => sum + row.paidAmount, 0) * 100)
            / 100,
          avgTicket: commercialDashboard.avgTicket,
          byPaymentMethod: commercialDashboard.salesByPaymentMethod.slice(0, 5),
          topProducts: commercialDashboard.topProducts.slice(0, 5),
          topServices: commercialDashboard.topServices.slice(0, 5)
        }
      },
      cash: {
        hasOpenRegister: openRegister !== null,
        openRegister: openRegister
          ? {
              id: openRegister.id,
              openedAt: openRegister.openedAt,
              openingAmount: openRegister.openingAmount,
              status: openRegister.status,
              runningBalance: openRegisterBalance
            }
          : null,
        registerCount: recentRegisters.length,
        recentRegisters: recentRegisterSummaries,
        recentMovements,
        inflowAmount:
          Math.round(
            recentMovements
              .filter((movement) => movement.amount > 0)
              .reduce((sum, movement) => sum + movement.amount, 0)
            * 100
          ) / 100
      },
      fiscal: {
        ...fiscalSummary
      }
    },
    highlights: buildHighlights({
      receivablesOutstanding:
        Math.round(openReceivables.reduce((sum, row) => sum + row.amountOutstanding, 0) * 100)
        / 100,
      overdueReceivables: receivablesOverdue.length,
      pixAttentionCount: pixAttention.length,
      approvedQuotes: quoteApproved.length,
      openRegisterBalance,
      fiscalSummary
    })
  };

  appendAudit(handlers.audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'analytics',
    action: 'administrative_hub_read',
    entityType: 'administrative-report-hub',
    entityId: 'all-domains',
    payloadSummary: 'Administrative report hubs inspected',
    riskLevel: 'low',
    correlationId
  });

  return json(response, 200, payload);
}
