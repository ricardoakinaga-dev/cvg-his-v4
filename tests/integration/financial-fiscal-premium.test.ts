import { Readable, Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { ApiKeysService } from '../../packages/modules/api-keys/src/index.ts';
import { AuditService } from '../../packages/modules/audit/src/index.ts';
import {
  EncounterFinancialService,
  InMemoryEncounterFinancialRepository
} from '../../packages/modules/financial/src/index.ts';
import { FiscalService } from '../../packages/modules/fiscal/src/index.ts';

import { handleFinancialRoutes } from '../../apps/api/src/routes/financial-routes.ts';
import { handleFiscalRoutes } from '../../apps/api/src/routes/fiscal-routes.ts';
import { handlePaymentsRoutes } from '../../apps/api/src/routes/payments-routes.ts';
import { LocalPixPaymentGateway } from '../../apps/api/src/payment-gateway.ts';
import { createApiRuntime } from '../../apps/api/src/runtime.ts';
import { createInMemoryRuntimeRepositories } from '../../apps/api/src/runtime-repositories.ts';

function createFinancialService(repository = new InMemoryEncounterFinancialRepository()) {
  const encounter = {
    id: 'enc_1' as never,
    accountId: 'acc_cvg_demo' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    status: 'in_care' as const
  };
  const billingRecord = {
    id: 'bill_1' as never,
    encounterId: encounter.id,
    accountId: encounter.accountId,
    patientId: encounter.patientId,
    ownerId: encounter.ownerId,
    status: 'estimated' as const,
    subtotalAmount: 190,
    currency: 'BRL' as const,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const billingItems = [
    {
      id: 'bill_item_1' as never,
      billingRecordId: billingRecord.id,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      itemType: 'service' as const,
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 120,
      totalAmount: 120,
      createdByUserId: 'user_finance' as never,
      createdAt: '2026-04-13T00:00:00.000Z'
    },
    {
      id: 'bill_item_2' as never,
      billingRecordId: billingRecord.id,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      itemType: 'exam' as const,
      description: 'Hemograma',
      quantity: 1,
      unitPriceAmount: 70,
      totalAmount: 70,
      createdByUserId: 'user_finance' as never,
      createdAt: '2026-04-13T00:05:00.000Z'
    }
  ];

  const service = new EncounterFinancialService(
    {
      getOrThrow(_accountId: string, encounterId: string) {
        expect(encounterId).toBe(encounter.id);
        return encounter;
      }
    } as never,
    {
      async getByEncounterOrThrow(_accountId: string, encounterId: string) {
        expect(encounterId).toBe(encounter.id);
        return billingRecord;
      },
      async listItems(_accountId: string, encounterId: string) {
        expect(encounterId).toBe(encounter.id);
        return billingItems;
      },
      getOrThrow(_accountId: string, recordId: string) {
        expect(recordId).toBe(billingRecord.id);
        return billingRecord;
      }
    } as never,
    {
      getOrThrow(patientId: string) {
        expect(patientId).toBe(encounter.patientId);
        return {
          id: patientId,
          accountId: encounter.accountId,
          name: 'Luna',
          species: 'canine'
        };
      }
    } as never,
    {
      getOrThrow(ownerId: string) {
        expect(ownerId).toBe(encounter.ownerId);
        return {
          id: ownerId,
          accountId: encounter.accountId,
          fullName: 'Maria Silva',
          contacts: []
        };
      }
    } as never,
    { repository }
  );

  return { service, encounter, billingRecord };
}

class MockResponse extends Writable {
  statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly headers = new Map<string, string>();

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
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

function createFiscalPrincipal() {
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
      permissionCodes: ['fiscal.read', 'fiscal.manage'],
      capabilities: []
    }
  };
}

function createFiscalRequest(method: string, url: string, body?: unknown): Readable {
  return Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), {
    method,
    url
  });
}

function createApiKeyRequest(
  method: string,
  url: string,
  rawKey: string,
  body?: unknown
): Readable {
  return Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), {
    method,
    url,
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json'
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
}

describe('financial and fiscal premium evidence', () => {
  it('keeps financial close, receivable aging and billing settlement coherent', async () => {
    const { service, encounter, billingRecord } = createFinancialService();

    const partiallyPaid = await service.closeEncounterFinancial(
      encounter.accountId,
      encounter.id,
      'user_finance' as never,
      {
        paidAmount: 120,
        notes: 'Fechamento premium',
        installments: [
          { label: 'Entrada', amount: 100, dueAt: '2026-04-14T00:00:00.000Z' },
          { label: 'Saldo', amount: 90, dueAt: '2026-04-20T00:00:00.000Z' }
        ]
      }
    );

    expect(partiallyPaid.financialClosed).toBe(true);
    expect(partiallyPaid.financialStatus).toBe('partial');
    expect(partiallyPaid.balanceDue).toBe(70);
    expect(partiallyPaid.receivables).toHaveLength(2);
    expect(partiallyPaid.receivables.filter((item) => item.status === 'open')).toHaveLength(1);

    const aging = await service.listReceivables({
      accountId: 'acc_cvg_demo' as never,
      status: 'open',
      page: 1,
      pageSize: 10
    });
    expect(aging.total).toBe(1);
    expect(aging.totalOutstanding).toBe(70);
    expect(aging.openCount).toBe(1);

    const settled = await service.recordPaymentForBillingRecord(
      encounter.accountId,
      billingRecord.id,
      {
        amountPaid: 70,
        paidByUserId: 'user_finance' as never,
        externalReferenceType: 'billing_record',
        externalReferenceId: billingRecord.id
      }
    );

    expect(settled.financialStatus).toBe('paid');
    expect(settled.balanceDue).toBe(0);
    expect(settled.receivables.every((item) => item.status === 'settled')).toBe(true);
  });

  it('keeps card intent, capture failure and reconciliation reports coherent end-to-end', async () => {
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800
    });
    const login = await runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr-card-premium-login'
    );
    const principal = runtime.auth.authenticateAccessToken(login.accessToken);
    const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
    const apiKey = await apiKeys.create({
      accountId: principal.user.accountId,
      name: 'cards-premium',
      permissions: ['payments.manage', 'billing.read'],
      createdBy: principal.user.id
    });
    const paymentGateway = new LocalPixPaymentGateway();

    const encounter = runtime.encounters.openEncounter(
      principal.user.accountId,
      principal.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Card premium'
      }
    );
    const billingRecord = await runtime.billing.createEstimate(principal.user.accountId, {
      encounterId: encounter.id,
      administrativeNotes: 'Cartao premium'
    });
    await runtime.billing.addItem(principal.user.accountId, principal.user.id, {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Procedimento premium',
      quantity: 1,
      unitPriceAmount: 320
    });

    const createIntentResponse = new MockResponse();
    await handlePaymentsRoutes(
      '/payments/cards/intents',
      createApiKeyRequest('POST', '/payments/cards/intents', apiKey.rawKey, {
        billingRecordId: billingRecord.id,
        amount: 320,
        description: 'Procedimento premium',
        cardHolderName: 'Maria Silva',
        brand: 'visa',
        last4: '4242',
        installments: 2,
        capture: false,
        customerName: 'Maria Silva',
        customerEmail: 'maria@example.com'
      }) as never,
      createIntentResponse as never,
      'corr-card-premium-intent',
      {
        eventBus: runtime.eventBus,
        paymentGateway,
        apiKeys,
        audit: runtime.audit,
        billing: runtime.billing,
        cardTransactions: runtime.cardTransactions
      }
    );
    expect(createIntentResponse.statusCode).toBe(201);
    const createdIntent = createIntentResponse.bodyJson<{ id: string; status: string }>();
    expect(createdIntent.status).toBe('authorized_pending_capture');
    await runtime.eventBus.processPending(10);

    const captureResponse = new MockResponse();
    await handlePaymentsRoutes(
      `/payments/cards/intents/${createdIntent.id}/capture`,
      createApiKeyRequest(
        'POST',
        `/payments/cards/intents/${createdIntent.id}/capture`,
        apiKey.rawKey
      ) as never,
      captureResponse as never,
      'corr-card-premium-capture',
      {
        eventBus: runtime.eventBus,
        paymentGateway,
        apiKeys,
        audit: runtime.audit,
        billing: runtime.billing,
        cardTransactions: runtime.cardTransactions
      }
    );
    expect(captureResponse.statusCode).toBe(200);
    await runtime.eventBus.processPending(10);

    await runtime.cardTransactions.create({
      transactionId: 'card_missing',
      provider: 'local-card',
      accountId: principal.user.accountId,
      amount: 25,
      currency: 'BRL',
      description: 'Intent persistido sem estado no gateway',
      installments: 1,
      status: 'authorized_pending_capture',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      billingSettlementStatus: 'not_applicable'
    });

    const failedCaptureResponse = new MockResponse();
    await handlePaymentsRoutes(
      '/payments/cards/intents/card_missing/capture',
      createApiKeyRequest(
        'POST',
        '/payments/cards/intents/card_missing/capture',
        apiKey.rawKey
      ) as never,
      failedCaptureResponse as never,
      'corr-card-premium-failure',
      {
        eventBus: runtime.eventBus,
        paymentGateway,
        apiKeys,
        audit: runtime.audit,
        billing: runtime.billing,
        cardTransactions: runtime.cardTransactions
      }
    );
    expect(failedCaptureResponse.statusCode).toBe(409);
    await runtime.eventBus.processPending(10);

    const paymentsReportResponse = new MockResponse();
    await handlePaymentsRoutes(
      '/payments/cards/report',
      createApiKeyRequest('GET', '/payments/cards/report', apiKey.rawKey) as never,
      paymentsReportResponse as never,
      'corr-card-premium-report',
      {
        eventBus: runtime.eventBus,
        paymentGateway,
        apiKeys,
        audit: runtime.audit,
        cardTransactions: runtime.cardTransactions
      }
    );
    const paymentsReport = paymentsReportResponse.bodyJson<{
      summary: { total: number; captured: number; failed: number };
    }>();
    expect(paymentsReport.summary.total).toBe(2);
    expect(paymentsReport.summary.captured).toBe(1);
    expect(paymentsReport.summary.failed).toBe(1);

    const reconciliationResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/reconciliation/cards',
      createFiscalRequest('GET', '/financial/reconciliation/cards') as never,
      reconciliationResponse as never,
      'corr-card-premium-reconciliation',
      {
        encounterFinancial: runtime.encounterFinancial,
        billing: runtime.billing,
        audit: runtime.audit,
        pixTransactions: runtime.pixTransactions,
        cardTransactions: runtime.cardTransactions,
        requirePrincipal: () => principal
      }
    );
    const reconciliation = reconciliationResponse.bodyJson<{
      total: number;
      reconciledCount: number;
      pendingCount: number;
      data: Array<{
        transactionId: string;
        reconciliationState: string;
        financialStatus: string | null;
      }>;
    }>();
    expect(reconciliation.total).toBe(2);
    expect(reconciliation.reconciledCount).toBe(1);
    expect(reconciliation.pendingCount).toBe(1);
    expect(
      reconciliation.data.some(
        (row) => row.transactionId === createdIntent.id && row.reconciliationState === 'reconciled'
      )
    ).toBe(true);
    expect(runtime.billing.getOrThrow(principal.user.accountId, billingRecord.id).status).toBe(
      'settled'
    );
    expect(runtime.audit.list().some((entry) => entry.action === 'card_capture')).toBe(true);
    expect(runtime.audit.list().some((entry) => entry.action === 'card_capture_failed')).toBe(true);
    expect(runtime.audit.list().some((entry) => entry.action === 'list_card_reconciliation')).toBe(
      true
    );
  });

  it('keeps the fiscal document lifecycle queryable after issue and cancel', async () => {
    const fiscal = new FiscalService(undefined, undefined, { allowNfseSimulation: true });

    const createResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/nfse/documents',
      createFiscalRequest('POST', '/fiscal/nfse/documents', {
        competencia: '2026-04-22',
        serie: '001',
        numero: 2001,
        provider: 'abrasf',
        customer: {
          type: 'cnpj',
          document: '12345678000199',
          name: 'Clinica Teste S/A',
          email: 'finance@fiscal.test',
          phone: '+55 11 99999-0000'
        },
        services: [
          {
            description: 'Servico veterinario premium',
            codigoServico: '0407',
            cnae: '7500-1/00',
            quantity: 1,
            unitValue: 120,
            totalValue: 120,
            issRate: 0.05,
            issValue: 6,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0,
            irrfValue: 0,
            inssValue: 0
          }
        ]
      }) as never,
      createResponse as never,
      'corr-fiscal-premium-1',
      {
        fiscal,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    const created = createResponse.bodyJson<{ id: string; status: string }>();
    expect(createResponse.statusCode).toBe(201);
    expect(created.status).toBe('draft');

    const issueResponse = new MockResponse();
    await handleFiscalRoutes(
      `/fiscal/nfse/documents/${created.id}/issue`,
      createFiscalRequest('POST', `/fiscal/nfse/documents/${created.id}/issue`) as never,
      issueResponse as never,
      'corr-fiscal-premium-2',
      {
        fiscal,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    expect(issueResponse.bodyJson<{ status: string }>().status).toBe('issued');

    const cancelResponse = new MockResponse();
    await handleFiscalRoutes(
      `/fiscal/nfse/documents/${created.id}/cancel`,
      createFiscalRequest('POST', `/fiscal/nfse/documents/${created.id}/cancel`, {
        reason: 'Cancelamento premium'
      }) as never,
      cancelResponse as never,
      'corr-fiscal-premium-3',
      {
        fiscal,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    expect(cancelResponse.bodyJson<{ status: string }>().status).toBe('cancelled');

    const listResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/nfse/documents',
      createFiscalRequest('GET', '/fiscal/nfse/documents?status=cancelled') as never,
      listResponse as never,
      'corr-fiscal-premium-4',
      {
        fiscal,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );

    const listed = listResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>();
    expect(listed.items.some((item) => item.id === created.id && item.status === 'cancelled')).toBe(
      true
    );
  });

  it('keeps fiscal preview and NFS-e layout backoffice queryable in the premium flow', async () => {
    const fiscal = new FiscalService();
    const audit = new AuditService();

    const previewResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/tax-preview',
      createFiscalRequest('GET', '/fiscal/tax-preview') as never,
      previewResponse as never,
      'corr-fiscal-premium-preview',
      {
        fiscal,
        audit,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    const preview = previewResponse.bodyJson<{
      mercadoria: { totalTaxValue: number };
      servico: { totalTaxValue: number };
    }>();
    expect(preview.mercadoria.totalTaxValue).toBeGreaterThan(0);
    expect(preview.servico.totalTaxValue).toBeGreaterThan(0);

    const createLayoutResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/nfse',
      createFiscalRequest('POST', '/fiscal/nfse', {
        city: 'Santo Andre',
        state: 'SP',
        municipalityCode: '3547809',
        provider: 'Abrasf',
        version: 'v2026.2',
        active: true,
        environment: 'homologacao',
        serviceCode: '0407',
        serviceFocus: 'Backoffice premium'
      }) as never,
      createLayoutResponse as never,
      'corr-fiscal-premium-layout-create',
      {
        fiscal,
        audit,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    expect(createLayoutResponse.statusCode).toBe(201);
    const createdLayout = createLayoutResponse.bodyJson<{
      id: string;
      city: string;
      active: boolean;
    }>();
    expect(createdLayout.city).toBe('Santo Andre');
    expect(createdLayout.active).toBe(true);

    const patchLayoutResponse = new MockResponse();
    await handleFiscalRoutes(
      `/fiscal/nfse/${createdLayout.id}`,
      createFiscalRequest('PATCH', `/fiscal/nfse/${createdLayout.id}`, {
        version: 'v2026.3',
        serviceFocus: 'Backoffice premium fechado'
      }) as never,
      patchLayoutResponse as never,
      'corr-fiscal-premium-layout-patch',
      {
        fiscal,
        audit,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    expect(patchLayoutResponse.statusCode).toBe(200);
    expect(
      patchLayoutResponse.bodyJson<{ version: string; serviceFocus: string }>().serviceFocus
    ).toBe('Backoffice premium fechado');

    const listLayoutsResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/nfse',
      createFiscalRequest('GET', '/fiscal/nfse?state=SP&active=true') as never,
      listLayoutsResponse as never,
      'corr-fiscal-premium-layout-list',
      {
        fiscal,
        audit,
        requirePrincipal: () => createFiscalPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    const layouts = listLayoutsResponse.bodyJson<{
      items: Array<{ id: string; state: string; active: boolean }>;
    }>();
    expect(layouts.items.some((item) => item.id === createdLayout.id && item.state === 'SP')).toBe(
      true
    );
    expect(audit.list().some((entry) => entry.action === 'create')).toBe(true);
    expect(audit.list().some((entry) => entry.action === 'update')).toBe(true);
  });
});
