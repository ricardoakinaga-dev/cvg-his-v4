import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleAdministrativeReportsRoutes } from './administrative-reports-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
    return this;
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['finance'],
      permissionCodes: ['billing.read'],
      capabilities: []
    }
  };
}

test('handleAdministrativeReportsRoutes ignores unrelated routes', async () => {
  const response = new MockResponse();
  const handled = await handleAdministrativeReportsRoutes(
    '/owners',
    { method: 'GET', url: '/owners' } as never,
    response as never,
    'corr-admin-report-0',
    {} as never
  );

  assert.equal(handled, false);
});

test('handleAdministrativeReportsRoutes returns aggregated administrative hubs', async () => {
  const response = new MockResponse();
  const now = '2026-04-15T12:00:00.000Z';

  const handled = await handleAdministrativeReportsRoutes(
    '/reports/administrative-hubs',
    {
      method: 'GET',
      url: '/reports/administrative-hubs?dateFrom=2026-04-01&dateTo=2026-04-30'
    } as never,
    response as never,
    'corr-admin-report-1',
    {
      billing: {
        listAuthoritative: async () => [
          {
            id: 'bill-1',
            accountId: 'acc-1',
            status: 'open',
            subtotalAmount: 200,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'bill-2',
            accountId: 'acc-1',
            status: 'settled',
            subtotalAmount: 150,
            createdAt: now,
            updatedAt: now
          }
        ]
      } as never,
      encounterFinancial: {
        async listReceivables() {
          return {
            data: [
              {
                id: 'rec-1',
                encounterId: 'enc-1',
                installmentLabel: 'Parcela 1/2',
                dueAt: '2026-04-10T00:00:00.000Z',
                amountOutstanding: 80,
                amountPaid: 20,
                patientName: 'Luna',
                ownerName: 'Maria',
                status: 'open'
              }
            ],
            total: 1
          };
        }
      } as never,
      pixTransactions: {
        async list() {
          return [
            {
              transactionId: 'pix-1',
              provider: 'local-pix',
              status: 'completed',
              amount: 120,
              createdAt: now,
              completedAt: now,
              billingSettlementStatus: 'applied',
              cashReconciliationStatus: 'skipped_no_open_register'
            }
          ];
        }
      } as never,
      quotes: {
        list: () => [
          {
            id: 'quote-1',
            accountId: 'acc-1',
            number: 'Q-1',
            status: 'approved',
            total: 300,
            convertedToSaleId: null,
            convertedAt: null,
            createdAt: now
          },
          {
            id: 'quote-2',
            accountId: 'acc-1',
            number: 'Q-2',
            status: 'draft',
            total: 180,
            convertedToSaleId: null,
            convertedAt: null,
            createdAt: now
          }
        ]
      } as never,
      counterSales: {
        list: () => [
          {
            id: 'sale-1',
            accountId: 'acc-1',
            status: 'closed',
            total: 220,
            paidAmount: 220,
            createdAt: now,
            closedAt: now
          },
          {
            id: 'sale-2',
            accountId: 'acc-1',
            status: 'open',
            total: 90,
            paidAmount: 0,
            createdAt: now,
            closedAt: null
          }
        ],
        async getCommercialDashboard() {
          return {
            openSales: 1,
            closedToday: 1,
            grossRevenueToday: 220,
            netRevenueToday: 220,
            avgTicket: 220,
            salesByPaymentMethod: [{ method: 'pix', total: 220 }],
            topProducts: [{ name: 'Vacina', quantity: 2, revenue: 140 }],
            topServices: [{ name: 'Consulta', quantity: 1, revenue: 80 }],
            quotesIssued: 2,
            quotesConverted: 0,
            lowStockAlerts: []
          };
        }
      } as never,
      cash: {
        async findOpenRegister() {
          return {
            id: 'cash-1',
            openedAt: now,
            openingAmount: 100,
            status: 'open'
          };
        },
        listRegisters() {
          return [
            {
              id: 'cash-1',
              openedAt: now,
              closedAt: null,
              openingAmount: 100,
              closingAmount: null,
              difference: null,
              status: 'open'
            }
          ];
        },
        async getCurrentBalance() {
          return 320;
        },
        async getMovements() {
          return [
            {
              id: 'mov-1',
              movementType: 'payment',
              amount: 220,
              runningBalance: 320,
              reference: 'PIX-1',
              createdAt: now
            }
          ];
        }
      } as never,
      fiscal: {
        async getDashboardSummary() {
          return {
            activeTaxes: 4,
            cfopCount: 12,
            nfseLayouts: 2,
            icmsRules: 6,
            pisCofinsRules: 4,
            ncmEntries: 9,
            readOnly: false,
            backendScope: 'parametrizacao',
            pendingScopes: [],
            alerts: []
          };
        }
      } as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    executive: { outstandingReceivables: number; quotePipelineAmount: number };
    domains: {
      financial: { billing: { totalRecords: number }; receivables: { overdueCount: number } };
      commercial: { counterSales: { grossRevenue: number } };
      cash: { hasOpenRegister: boolean };
      fiscal: { activeTaxes: number };
    };
    highlights: Array<{ title: string }>;
  }>();

  assert.equal(payload.executive.outstandingReceivables, 80);
  assert.equal(payload.executive.quotePipelineAmount, 480);
  assert.equal(payload.domains.financial.billing.totalRecords, 2);
  assert.equal(payload.domains.financial.receivables.overdueCount, 1);
  assert.equal(payload.domains.commercial.counterSales.grossRevenue, 220);
  assert.equal(payload.domains.cash.hasOpenRegister, true);
  assert.equal(payload.domains.fiscal.activeTaxes, 4);
  assert.ok(payload.highlights.length >= 1);
});
