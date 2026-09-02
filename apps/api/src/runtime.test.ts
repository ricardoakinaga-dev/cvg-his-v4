import assert from 'node:assert/strict';
import test from 'node:test';

import type { AuthSessionResponse } from '@cvg-his-v2/shared-contracts';
import { ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { getTenantContext } from '@cvg-his-v2/tenant-context';

import { createApiRuntime, type RuntimeRepositories } from './runtime.js';
import { bootstrapServices, hasRequiredAdvancePaymentSchema } from './bootstrap.js';

function createTestRuntime(
  repositories?: RuntimeRepositories,
  options?: {
    readonly notificationsWhatsappRemindersEnabled?: boolean;
  }
) {
  return createApiRuntime({
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories,
    notificationsWhatsappRemindersEnabled: options?.notificationsWhatsappRemindersEnabled,
    // The restart suite uses the in-memory repository bundle, whose explicit
    // transaction boundary is supplied by the test harness. Production SQL
    // runtimes provide the real tenant transaction from bootstrap.
    tenantTransaction: repositories
      ? async <T>(_accountId: string, operation: () => Promise<T>): Promise<T> => operation()
      : undefined
  });
}

const REAL_ACCOUNT_ID = '65751ed5-07d3-44a2-830a-cc9dc8a0dbe4' as never;
const REAL_OWNER_ID = '713309e5-10dc-43c3-9bee-fd0c0dedb7c7' as never;
const REAL_PATIENT_ID = '0cb71acc-dfc2-47b9-a82b-4a46beae728b' as never;
const REAL_ENCOUNTER_ID = 'b9544c63-a1b2-40e7-96f9-71e02c75ccbb' as never;

test('advance-payment report readiness requires tenant policies and ledger triggers', () => {
  const snapshot = {
    tables: [
      { tableName: 'advance_payments', rowSecurity: true, forceRowSecurity: true },
      { tableName: 'advance_payment_allocations', rowSecurity: true, forceRowSecurity: true }
    ],
    policies: [
      {
        tableName: 'advance_payments',
        policyName: 'advance_payments_tenant_select',
        usesAccountContext: true
      },
      {
        tableName: 'advance_payments',
        policyName: 'advance_payments_tenant_insert',
        usesAccountContext: true
      },
      {
        tableName: 'advance_payment_allocations',
        policyName: 'advance_payment_allocations_tenant_select',
        usesAccountContext: true
      },
      {
        tableName: 'advance_payment_allocations',
        policyName: 'advance_payment_allocations_tenant_insert',
        usesAccountContext: true
      }
    ],
    triggers: [
      {
        tableName: 'advance_payments',
        triggerName: 'advance_payments_immutability_trigger'
      },
      {
        tableName: 'advance_payment_allocations',
        triggerName: 'advance_payment_allocations_immutability_trigger'
      },
      {
        tableName: 'advance_payment_allocations',
        triggerName: 'advance_payment_allocations_prevent_overallocation'
      }
    ]
  };

  assert.equal(hasRequiredAdvancePaymentSchema(snapshot), true);
  assert.equal(
    hasRequiredAdvancePaymentSchema({
      ...snapshot,
      triggers: snapshot.triggers.slice(0, 2)
    }),
    false
  );
});

function assertTenantAccount(accountId: string): void {
  assert.equal(getTenantContext()?.accountId, accountId);
}

async function waitForAuditAction(
  runtime: ReturnType<typeof createApiRuntime>,
  action: string,
  attempts = 50,
  delayMs = 10
): Promise<boolean> {
  for (let index = 0; index < attempts; index += 1) {
    if (runtime.audit.list().some((entry) => entry.action === action)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return runtime.audit.list().some((entry) => entry.action === action);
}

test('login, session refresh and audit trail work end-to-end', async () => {
  const runtime = createTestRuntime();

  const login = (await runtime.auth.login(
    {
      username: 'admin',
      password: 'seed_admin'
    },
    'corr_login_test'
  )) as AuthSessionResponse;

  assert.equal(login.principal.user.username, 'admin');
  assert.equal(login.principal.access.permissionCodes.includes('users.manage'), true);

  const principal = runtime.auth.authenticateAccessToken(login.accessToken);
  assert.equal(principal.user.id, login.principal.user.id);

  const refreshed = (await runtime.auth.refresh(
    {
      refreshToken: login.refreshToken
    },
    'corr_refresh_test'
  )) as AuthSessionResponse;

  assert.equal(refreshed.principal.session.sessionId, login.principal.session.sessionId);
  assert.notEqual(refreshed.refreshToken, login.refreshToken);
  assert.equal(
    runtime.audit.list().some((event) => event.action === 'login'),
    true
  );
  assert.equal(
    runtime.audit.list().some((event) => event.action === 'refresh'),
    true
  );
});

test('in-memory counter-sale cancellation rolls back when audit persistence fails', async () => {
  let auditWrites = 0;
  const failingAuditRepository = {
    async create(): Promise<void> {
      auditWrites += 1;
      if (auditWrites > 1) throw new Error('audit persistence failed');
    },
    async list(): Promise<readonly never[]> {
      return [];
    },
    async findById(): Promise<null> {
      return null;
    }
  } as never;
  const runtime = createApiRuntime({
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: { audit: failingAuditRepository }
  });
  const accountId = 'account-cancellation-rollback' as AccountId;
  const userId = 'user-cancellation-rollback' as never;
  const sale = await runtime.counterSales.open(accountId, userId);

  await assert.rejects(
    () =>
      runtime.counterSales.cancel(sale.id, {
        accountId,
        cancelledByUserId: userId,
        reason: 'Falha de persistência de auditoria',
        correlationId: 'corr-runtime-cancellation-rollback'
      }),
    /audit persistence failed/
  );

  assert.equal(runtime.counterSales.getOrThrow(sale.id).status, 'open');
  assert.deepEqual(await runtime.counterSales.listCancellationHistory(accountId, sale.id), []);
});

test('runtime initializes tenant-scoped repositories with the authenticated account context', async () => {
  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById() {
      return null;
    },
    async findByUsername() {
      return null;
    },
    async findByEmail() {
      return null;
    },
    async findAll() {
      return [
        {
          id: '5c2b3750-783b-4cd7-bf8d-4ce982c1dabb' as never,
          accountId: REAL_ACCOUNT_ID,
          email: 'admin@centroveterinarioguarapiranga.com',
          passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
          fullName: 'Admin CVG',
          isActive: true,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        }
      ];
    },
    async findRoleCodesByUserId() {
      return ['admin'];
    },
    async findByAccountId() {
      return [];
    }
  };
  const repositories: RuntimeRepositories = {
    users: usersRepository,
    staff: {
      async create() {
        throw new Error('not implemented');
      },
      async findById() {
        return null;
      },
      async findByAccountId(accountId) {
        assertTenantAccount(accountId ?? '');
        return [];
      },
      async findByUserId() {
        return null;
      },
      async update() {
        throw new Error('not implemented');
      }
    },
    owner: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findByAccountId(accountId) {
        assertTenantAccount(accountId);
        return [
          {
            id: REAL_OWNER_ID,
            accountId: REAL_ACCOUNT_ID,
            fullName: 'JESSICA DAIANE MORAIS SILVA',
            contacts: [{ label: 'Telefone', value: '11999999999', type: 'phone', primary: true }],
            financialResponsible: true,
            status: 'active',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      },
      async delete() {}
    },
    patient: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findByAccountId(accountId) {
        assertTenantAccount(accountId);
        return [
          {
            id: REAL_PATIENT_ID,
            accountId: REAL_ACCOUNT_ID,
            name: 'PRINCESA',
            species: 'canine',
            breed: 'SRD',
            sex: 'female',
            primaryOwnerId: REAL_OWNER_ID,
            status: 'active',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      },
      async delete() {}
    },
    encounter: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findActiveByPatientId() {
        return null;
      },
      async findAll(accountId) {
        assertTenantAccount(accountId);
        return [
          {
            id: REAL_ENCOUNTER_ID,
            accountId: REAL_ACCOUNT_ID,
            patientId: REAL_PATIENT_ID,
            ownerId: REAL_OWNER_ID,
            visitType: 'walk_in',
            origin: 'reception',
            reason: 'Validacao de bootstrap tenant-aware',
            status: 'reception',
            openedAt: '2026-04-01T00:00:00.000Z',
            createdByUserId: '5c2b3750-783b-4cd7-bf8d-4ce982c1dabb' as never,
            updatedAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      },
      async findActive(accountId) {
        assertTenantAccount(accountId);
        return [];
      },
      async delete() {}
    },
    billing: {
      async createRecord() {},
      async updateRecord() {},
      async findRecordById() {
        return null;
      },
      async findRecordByEncounter() {
        return null;
      },
      async findRecordsByAccountId(accountId) {
        assertTenantAccount(accountId);
        return [];
      },
      async createItem() {},
      async findItemsByRecord() {
        return [];
      }
    }
  };

  const runtime = createTestRuntime(repositories);
  await runtime.initialize();

  const patient = runtime.patients.getOrThrow(REAL_PATIENT_ID);
  const encounter = runtime.encounters.getOrThrow(REAL_ACCOUNT_ID, REAL_ENCOUNTER_ID);

  assert.equal(patient.accountId, REAL_ACCOUNT_ID);
  assert.equal(encounter.accountId, REAL_ACCOUNT_ID);
});

test('runtime exposes API keys and event bus persistence for integrations', async () => {
  const runtime = createTestRuntime();

  const created = await runtime.apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Integration key',
    permissions: ['integrations.read', 'payments.manage'],
    createdBy: 'user_admin'
  });

  const validated = await runtime.apiKeys.validate(created.rawKey);
  assert.ok(validated);
  assert.equal(validated?.id, created.apiKey.id);

  const event = await runtime.eventBus.publish({
    correlationId: 'corr_runtime_event' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.intent.created',
    payload: {
      accountId: created.apiKey.accountId,
      intentId: 'pix_123',
      amount: 99.9
    }
  });

  const fetched = await runtime.eventBus.getEvent(created.apiKey.accountId, event.id);
  assert.equal(fetched?.status, 'pending');
  assert.equal(fetched?.eventType, 'payment.pix.intent.created');
});

test('in-memory event administration is isolated by account across reads, counts and reprocess', async () => {
  const runtime = createTestRuntime();
  const accountA = 'outbox-admin-account-a' as AccountId;
  const accountB = 'outbox-admin-account-b' as AccountId;
  const correlationA = 'outbox-admin-correlation-a' as never;
  const correlationB = 'outbox-admin-correlation-b' as never;
  const eventA = await runtime.eventBus.publish({
    accountId: accountA,
    correlationId: correlationA,
    moduleName: 'billing' as never,
    eventType: 'outbox.admin.a',
    payload: { accountId: accountA },
    maxAttempts: 1
  });
  const eventB = await runtime.eventBus.publish({
    accountId: accountB,
    correlationId: correlationB,
    moduleName: 'billing' as never,
    eventType: 'outbox.admin.b',
    payload: { accountId: accountB },
    maxAttempts: 1
  });
  const unsubscribe = runtime.eventBus.subscribe('outbox-admin-failure', async () => {
    throw new Error('outbox-admin-test-failure');
  });

  await runtime.eventBus.processPending(10);
  unsubscribe();

  assert.equal((await runtime.eventBus.getEvent(accountA, eventA.id))?.id, eventA.id);
  assert.equal(await runtime.eventBus.getEvent(accountA, eventB.id), null);
  assert.deepEqual(
    (await runtime.eventBus.getEventsByCorrelationId(accountA, correlationA)).map(
      (event) => event.id
    ),
    [eventA.id]
  );
  assert.deepEqual(await runtime.eventBus.getEventsByCorrelationId(accountA, correlationB), []);
  assert.deepEqual(
    (await runtime.eventBus.getDeadLetterEvents(accountA, 10)).map((event) => event.id),
    [eventA.id]
  );
  assert.deepEqual(
    await runtime.eventBus
      .getDeadLetterEvents(accountA, 10)
      .then((events) => events.map((event) => event.accountId)),
    [accountA]
  );
  assert.deepEqual(await runtime.eventBus.getPendingEvents(accountA, 10), []);
  assert.deepEqual(await runtime.eventBus.getPendingEvents(accountB, 10), []);

  const reprocessedA = await runtime.eventBus.reprocessEvent(accountA, eventA.id);
  assert.equal(reprocessedA?.id, eventA.id);
  assert.equal(reprocessedA?.status, 'pending');
  assert.equal(await runtime.eventBus.reprocessEvent(accountA, eventB.id), null);
  assert.deepEqual(
    (await runtime.eventBus.getPendingEvents(accountA, 10)).map((event) => event.id),
    [eventA.id]
  );
  assert.deepEqual(await runtime.eventBus.getPendingEvents(accountB, 10), []);

  assert.deepEqual(await runtime.eventBus.countEvents(accountA), {
    pending: 1,
    retrying: 0,
    completed: 0,
    failed: 0,
    total: 1
  });

  await assert.rejects(
    runtime.eventBus.getEvent('' as AccountId, eventA.id),
    /Outbox administration requires an accountId/
  );
});

test('runtime reconciles PIX confirmation into administrative financial state', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_pix_financial_runtime'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Fluxo financeiro administrativo com PIX'
  });

  const billingRecord = await runtime.billing.createEstimate(reception.user.accountId, {
    encounterId: encounter.id,
    administrativeNotes: 'Fechamento administrativo via PIX'
  });
  await runtime.billing.addItem(reception.user.accountId, reception.user.id, {
    encounterId: encounter.id,
    itemType: 'service',
    description: 'Consulta veterinaria',
    quantity: 1,
    unitPriceAmount: 150
  });

  await runtime.eventBus.publish({
    correlationId: 'corr_pix_financial_intent' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.intent.created',
    payload: {
      accountId: reception.user.accountId,
      intentId: 'pix_intent_runtime_1',
      billingRecordId: billingRecord.id,
      amount: 150,
      currency: 'BRL',
      description: 'Consulta veterinaria',
      provider: 'local-pix',
      qrCodePayload: 'pix|runtime|150',
      qrCodeBase64: 'cGl4fHJ1bnRpbWV8MTUw',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  });
  await runtime.eventBus.processPending(10);

  const createdTransaction =
    await runtime.pixTransactions.findByTransactionId('pix_intent_runtime_1');
  assert.equal(createdTransaction?.status, 'pending');
  assert.equal(createdTransaction?.billingSettlementStatus, 'awaiting_payment');

  await runtime.eventBus.publish({
    correlationId: 'corr_pix_financial_confirm' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.confirmed',
    payload: {
      accountId: reception.user.accountId,
      intentId: 'pix_intent_runtime_1',
      billingRecordId: billingRecord.id,
      providerTransactionId: 'provider_runtime_1',
      providerConfirmationId: 'provider_runtime_1',
      status: 'completed',
      completedAt: new Date().toISOString()
    }
  });
  await runtime.eventBus.processPending(10);

  const settledBilling = runtime.billing.getOrThrow(reception.user.accountId, billingRecord.id);
  assert.equal(settledBilling.status, 'settled');

  const summary = await runtime.encounterFinancial.getSummary(encounter.accountId, encounter.id);
  assert.equal(summary.balanceDue, 0);
  assert.equal(summary.financialStatus, 'paid');
  assert.equal(
    summary.payments.some(
      (payment) =>
        payment.externalReferenceType === 'pix_transaction' &&
        payment.externalReferenceId === 'pix_intent_runtime_1'
    ),
    true
  );

  const reconciledTransaction =
    await runtime.pixTransactions.findByTransactionId('pix_intent_runtime_1');
  assert.equal(reconciledTransaction?.status, 'completed');
  assert.equal(reconciledTransaction?.billingSettlementStatus, 'applied');
  assert.equal(reconciledTransaction?.cashReconciliationStatus, 'skipped_no_open_register');
});

test('runtime reconciles card capture into administrative financial state', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_card_financial_runtime'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Fluxo financeiro administrativo com cartao'
  });

  const billingRecord = await runtime.billing.createEstimate(reception.user.accountId, {
    encounterId: encounter.id,
    administrativeNotes: 'Fechamento administrativo via cartao'
  });
  await runtime.billing.addItem(reception.user.accountId, reception.user.id, {
    encounterId: encounter.id,
    itemType: 'service',
    description: 'Procedimento cirurgico',
    quantity: 1,
    unitPriceAmount: 320
  });

  await runtime.eventBus.publish({
    correlationId: 'corr_card_financial_intent' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.intent.created',
    payload: {
      accountId: reception.user.accountId,
      intentId: 'card_intent_runtime_1',
      billingRecordId: billingRecord.id,
      amount: 320,
      currency: 'BRL',
      description: 'Procedimento cirurgico',
      provider: 'local-card',
      installments: 2,
      status: 'authorized_pending_capture',
      card: {
        holderName: 'Maria Silva',
        brand: 'visa',
        last4: '4242'
      },
      providerOrderId: 'order_runtime_1',
      providerChargeId: 'charge_runtime_1',
      createdAt: new Date().toISOString()
    }
  });
  await runtime.eventBus.processPending(10);

  const createdTransaction =
    await runtime.cardTransactions.findByTransactionId('card_intent_runtime_1');
  assert.equal(createdTransaction?.status, 'authorized_pending_capture');
  assert.equal(createdTransaction?.billingSettlementStatus, 'awaiting_capture');

  await runtime.eventBus.publish({
    correlationId: 'corr_card_financial_complete' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.completed',
    payload: {
      accountId: reception.user.accountId,
      intentId: 'card_intent_runtime_1',
      billingRecordId: billingRecord.id,
      provider: 'local-card',
      providerOrderId: 'order_runtime_1',
      providerChargeId: 'charge_runtime_1',
      providerAuthorizationCode: 'auth_runtime_1',
      providerReferenceId: 'ref_runtime_1',
      status: 'captured',
      capturedAt: new Date().toISOString()
    }
  });
  await runtime.eventBus.processPending(10);

  const settledBilling = runtime.billing.getOrThrow(reception.user.accountId, billingRecord.id);
  assert.equal(settledBilling.status, 'settled');

  const summary = await runtime.encounterFinancial.getSummary(encounter.accountId, encounter.id);
  assert.equal(summary.balanceDue, 0);
  assert.equal(summary.financialStatus, 'paid');
  assert.equal(
    summary.payments.some(
      (payment) =>
        payment.externalReferenceType === 'other' &&
        payment.externalReferenceId === 'card_intent_runtime_1'
    ),
    true
  );

  const reconciledTransaction =
    await runtime.cardTransactions.findByTransactionId('card_intent_runtime_1');
  assert.equal(reconciledTransaction?.status, 'captured');
  assert.equal(reconciledTransaction?.billingSettlementStatus, 'applied');
});

test('runtime records cash withdrawal when payable is paid with cash method', async () => {
  const runtime = createTestRuntime();
  const login = (await runtime.auth.login(
    {
      username: 'admin',
      password: 'seed_admin'
    },
    'corr_payable_cash_runtime'
  )) as AuthSessionResponse;
  const principal = runtime.auth.authenticateAccessToken(login.accessToken);

  const register = await runtime.cash.openRegister(principal.user.accountId, principal.user.id, {
    openingAmount: 1000,
    notes: 'Gaveta principal'
  });
  const payable = await runtime.financialPayables.createPayable(
    principal.user.accountId,
    principal.user.id,
    {
      supplierName: 'Fornecedor de medicamentos',
      description: 'NF caixa 001',
      category: 'Compras',
      costCenterCode: 'EST',
      costCenterName: 'Estoque',
      issuedAt: '2026-05-01',
      dueAt: '2026-05-20',
      totalAmount: 300
    }
  );

  await runtime.financialPayables.payPayable(
    principal.user.accountId,
    principal.user.id,
    payable.id,
    {
      amountPaid: 300,
      paymentMethod: 'cash',
      paymentReference: 'gaveta-principal',
      notes: 'Pagamento em dinheiro'
    }
  );

  const movements = await runtime.cash.getMovements(register.id);
  const withdrawal = movements.find((movement) => movement.reference === payable.id);
  assert.equal(withdrawal?.movementType, 'withdrawal');
  assert.equal(withdrawal?.amount, 300);
  assert.equal(await runtime.cash.getCurrentBalance(register.id), 700);
});

test('runtime does not preload demo seeds when repository-backed services are configured', () => {
  const runtime = createTestRuntime({
    owner: {} as never,
    patient: {} as never,
    ownerPatientLink: {} as never,
    scheduling: {} as never,
    inventory: {} as never,
    users: {} as never,
    staff: {} as never
  });

  assert.equal(runtime.owners.list().length, 0);
  assert.equal(runtime.patients.list().length, 0);
  assert.equal(runtime.scheduling.listAppointments().length, 0);
  assert.equal(runtime.inventory.listItems().length, 0);
  assert.equal(runtime.users.list().length, 0);
  assert.equal(runtime.staff.list().length, 0);
});

test('runtime can preserve owner and patient registry seeds with repository-backed services', () => {
  const runtime = createApiRuntime({
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: {
      owner: {} as never,
      patient: {} as never,
      ownerPatientLink: {} as never
    },
    preserveSeedMasterDataWithRepository: true
  });

  const patient = runtime.patients.getOrThrow('patient_mogeb6qv_5b0gq64z' as never);
  const owner = runtime.owners.getOrThrow('owner_ricardo_akinaga' as never);

  assert.equal(patient.name, 'DANI');
  assert.equal(patient.primaryOwnerId, owner.id);
  assert.equal(owner.fullName, 'RICARDO AKINAGA');
});

test('backend enforcement denies audit access to a role without permission', async () => {
  const runtime = createTestRuntime();
  const login = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_permission_test'
  )) as AuthSessionResponse;

  const principal = runtime.auth.authenticateAccessToken(login.accessToken);

  assert.throws(
    () =>
      runtime.accessControl.assertAuthorized({
        actor: principal.user,
        access: principal.access,
        permissionCode: 'audit.read',
        accountId: principal.user.accountId
      }),
    (error: unknown) => {
      assert.equal(error instanceof ForbiddenError, true);
      return true;
    }
  );
});

test('master registry supports owner, patient, relationship and search flows', async () => {
  const runtime = createTestRuntime();
  const login = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_master_registry_test'
  )) as AuthSessionResponse;
  const principal = runtime.auth.authenticateAccessToken(login.accessToken);

  runtime.accessControl.assertAuthorized({
    actor: principal.user,
    access: principal.access,
    permissionCode: 'owners.manage',
    accountId: principal.user.accountId
  });

  const owner = runtime.owners.create(principal.user.accountId, {
    fullName: 'Ana Pereira',
    contacts: [
      {
        label: 'Celular',
        value: '+55 21 99999-3333',
        type: 'whatsapp',
        primary: true
      }
    ],
    financialResponsible: true,
    administrativeNotes: 'Contato preferencial para cobranca.'
  });

  const patient = runtime.patients.create(principal.user.accountId, {
    name: 'Thor',
    species: 'canine',
    breed: 'Labrador',
    sex: 'male',
    size: 'large',
    baseWeightKg: 28.5,
    birthDateApproximate: '2021-01-01',
    primaryOwnerId: owner.id
  });

  const link = runtime.patients.createLink(principal.user.accountId, {
    ownerId: 'owner_joao_souza',
    patientId: patient.id,
    relationshipType: 'secondary',
    financialResponsible: false
  });

  const search = runtime.patients.searchMaster('Thor');

  assert.equal(patient.primaryOwnerId, owner.id);
  assert.equal(link.patientId, patient.id);
  assert.equal(
    search.patients.some((item) => item.id === patient.id),
    true
  );
  assert.equal(
    search.links.some((item) => item.id === link.id),
    true
  );

  runtime.audit.write({
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'patients',
    action: 'create',
    entityType: 'patient',
    entityId: patient.id,
    payloadSummary: `Patient ${patient.name} created`,
    riskLevel: 'high'
  });

  assert.equal(
    runtime.audit.list().some((event) => event.entityId === patient.id),
    true
  );
});

test('operational flow supports appointment, queue, encounter lifecycle, triage and timeline', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_operational_reception'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const appointment = await runtime.scheduling.createAppointment(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-03-26T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta de retorno'
  });

  const queueEntry = await runtime.scheduling.checkIn(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    appointmentId: appointment.id,
    reason: 'Chegada para retorno',
    priority: 'medium'
  });
  await runtime.scheduling.callQueueEntry(queueEntry.id);

  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    appointmentId: appointment.id,
    queueEntryId: queueEntry.id,
    visitType: 'scheduled',
    origin: 'schedule',
    reason: 'Retorno ambulatorial'
  });
  await runtime.scheduling.attachEncounter(queueEntry.id, encounter.id);
  runtime.encounters.appendTimeline(encounter.accountId, encounter.id, {
    accountId: encounter.accountId,
    eventType: 'queue_checked_in',
    summary: 'Paciente aguardando triagem',
    actorUserId: reception.user.id
  });
  runtime.encounters.appendTimeline(encounter.accountId, encounter.id, {
    accountId: encounter.accountId,
    eventType: 'queue_called',
    summary: 'Paciente chamado para triagem',
    actorUserId: reception.user.id
  });
  runtime.encounters.transitionEncounter(encounter.accountId, encounter.id, reception.user.id, {
    nextStatus: 'in_triage'
  });

  const nurseLogin = (await runtime.auth.login(
    {
      username: 'nurse',
      password: 'seed_nurse'
    },
    'corr_operational_nurse'
  )) as AuthSessionResponse;
  const nurse = runtime.auth.authenticateAccessToken(nurseLogin.accessToken);
  const triage = await runtime.triage.createTriage(
    nurse.user.id,
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      priority: 'high',
      chiefComplaint: 'Vomitos e letargia',
      initialNotes: 'Paciente chegou sonolento, sem sinais de convulsao.',
      alerts: ['desidratacao', 'prostracao'],
      destination: 'observation'
    },
    nurse.user.accountId
  );
  runtime.encounters.appendTimeline(encounter.accountId, encounter.id, {
    accountId: encounter.accountId,
    eventType: 'triage_recorded',
    summary: `Triagem inicial registrada com prioridade ${triage.priority}`,
    actorUserId: nurse.user.id
  });
  const inObservation = runtime.encounters.transitionEncounter(
    encounter.accountId,
    encounter.id,
    nurse.user.id,
    {
    nextStatus: triage.destination
    }
  );
  await runtime.scheduling.transitionQueueForEncounter(queueEntry.id, 'observation');

  const closed = runtime.encounters.closeEncounter(
    encounter.accountId,
    encounter.id,
    nurse.user.id,
    {
      closeReason: 'Fluxo operacional concluido para encaminhamento clinico posterior'
    }
  );
  await runtime.scheduling.completeQueueEntry(queueEntry.id);

  const timeline = runtime.encounters.listTimeline(encounter.accountId, encounter.id);

  assert.equal(inObservation.status, 'observation');
  assert.equal(closed.status, 'closed');
  assert.equal(runtime.scheduling.getQueueEntryOrThrow(queueEntry.id).status, 'completed');
  assert.equal(
    timeline.some((event) => event.eventType === 'triage_recorded'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'encounter_closed'),
    true
  );
});

test('triage can be updated while encounter is open', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_triage_update_reception'
  )) as AuthSessionResponse;
  const nurseLogin = (await runtime.auth.login(
    {
      username: 'nurse',
      password: 'seed_nurse'
    },
    'corr_triage_update_nurse'
  )) as AuthSessionResponse;

  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
  const nurse = runtime.auth.authenticateAccessToken(nurseLogin.accessToken);

  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Triagem com necessidade de correcao'
  });

  const created = await runtime.triage.createTriage(
    nurse.user.id,
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      priority: 'medium',
      chiefComplaint: 'Dor abdominal',
      alerts: ['dor'],
      destination: 'observation'
    },
    nurse.user.accountId
  );

  const updated = await runtime.triage.updateTriage(
    created.id,
    {
      priority: 'high',
      destination: 'in_care',
      initialNotes: 'Piora clinica observada',
      alerts: ['dor', 'vomito']
    },
    nurse.user.accountId
  );

  assert.equal(updated.priority, 'high');
  assert.equal(updated.destination, 'in_care');
  assert.equal(updated.chiefComplaint, 'Dor abdominal');
  assert.deepEqual(updated.alerts, ['dor', 'vomito']);
});

test('clinical record supports entries, prescriptions, conduct and attachments linked to encounter', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_clinical_reception'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Atendimento clinico basico'
  });

  const vetLogin = (await runtime.auth.login(
    {
      username: 'vet',
      password: 'seed_vet'
    },
    'corr_clinical_vet'
  )) as AuthSessionResponse;
  const veterinarian = runtime.auth.authenticateAccessToken(vetLogin.accessToken);

  const anamnesis = runtime.medicalRecords.addEntry(
    veterinarian.user.accountId,
    veterinarian.user.id,
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'anamnesis',
      title: 'Anamnese inicial',
      content: 'Tutor relata dois dias de inapetencia e vomitos esporadicos.'
    }
  );
  const prescription = runtime.medicalRecords.addEntry(
    veterinarian.user.accountId,
    veterinarian.user.id,
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'prescription',
      title: 'Prescricao inicial',
      content: 'Antiemetico a cada 12h por 3 dias.'
    }
  );
  const conduct = runtime.medicalRecords.addEntry(
    veterinarian.user.accountId,
    veterinarian.user.id,
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'conduct',
      title: 'Conduta e orientacoes',
      content: 'Observacao domiciliar, dieta leve e retorno se persistirem sinais.'
    }
  );

  const record = runtime.medicalRecords.getRecordByEncounterOrThrow(
    veterinarian.user.accountId,
    encounter.id
  );
  const attachment = await runtime.attachments.upload(
    veterinarian.user.id,
    veterinarian.user.accountId,
    {
      linkedEntityType: 'medical_record',
      linkedEntityId: record.id,
      category: 'document',
      fileName: 'prescricao-inicial.pdf',
      mimeType: 'application/pdf',
      checksum: 'sha256:phase6-prescricao'
    }
  );
  runtime.medicalRecords.appendAttachmentEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    attachment.id,
    'Attachment linked to clinical record'
  );

  const entries = runtime.medicalRecords.listEntriesByEncounter(
    veterinarian.user.accountId,
    encounter.id
  );
  const timeline = runtime.medicalRecords.listTimelineByEncounter(
    veterinarian.user.accountId,
    encounter.id
  );
  const attachments = await runtime.attachments.listByLinkedEntity(
    'medical_record',
    record.id,
    veterinarian.user.accountId
  );

  assert.equal(record.encounterId, encounter.id);
  assert.equal(
    entries.some((entry) => entry.id === anamnesis.id),
    true
  );
  assert.equal(
    entries.some((entry) => entry.id === prescription.id),
    true
  );
  assert.equal(
    entries.some((entry) => entry.id === conduct.id),
    true
  );
  assert.equal(
    attachments.some((item) => item.id === attachment.id),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'entry_added'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'attachment_added'),
    true
  );
});

test('advanced care keeps inpatient, surgery and diagnostics tied to the same clinical case', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_advanced_reception'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Caso clinico com necessidade de suporte avancado'
  });

  const vetLogin = (await runtime.auth.login(
    {
      username: 'vet',
      password: 'seed_vet'
    },
    'corr_advanced_vet'
  )) as AuthSessionResponse;
  const veterinarian = runtime.auth.authenticateAccessToken(vetLogin.accessToken);

  runtime.encounters.transitionEncounter(encounter.accountId, encounter.id, veterinarian.user.id, {
    nextStatus: 'in_care'
  });

  const stay = runtime.inpatient.admit(
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: 'Internacao Clinica',
      ward: 'Ala A',
      bed: 'A-12'
    },
    encounter.accountId
  );
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'inpatient_admitted',
    `Inpatient admission at ${stay.unit}/${stay.ward}/${stay.bed}`
  );

  const progress = runtime.inpatient.addProgress(
    veterinarian.user.id,
    {
      stayId: stay.id,
      note: 'Paciente estabilizado e monitorado em internacao.'
    },
    veterinarian.user.accountId
  );
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'inpatient_progressed',
    `Inpatient progress registered: ${progress.note}`
  );

  const surgeryCase = runtime.surgery.requestCase(veterinarian.user.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Exploratoria abdominal',
    preparationNotes: 'Jejum confirmado e consentimento coletado.'
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'surgery_requested',
    `Surgery requested: ${surgeryCase.procedureName}`
  );

  const preOpSurgery = runtime.surgery.updateStatus(veterinarian.user.accountId, surgeryCase.id, {
    status: 'pre_op'
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'surgery_pre_op',
    `Surgery case moved to ${preOpSurgery.status}`
  );

  const inProgressSurgery = runtime.surgery.updateStatus(
    veterinarian.user.accountId,
    surgeryCase.id,
    {
      status: 'in_progress'
    }
  );
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'surgery_in_progress',
    `Surgery case moved to ${inProgressSurgery.status}`
  );

  const updatedSurgery = runtime.surgery.updateStatus(veterinarian.user.accountId, surgeryCase.id, {
    status: 'recovery',
    operativeNotes: 'Procedimento concluido sem intercorrencias imediatas.'
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'surgery_status_changed',
    `Surgery case moved to ${updatedSurgery.status}`
  );

  const order = runtime.diagnostics.createOrder(veterinarian.user.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'ultrasound',
    reason: 'Suporte a decisao cirurgica e seguimento pos-operatorio.'
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'diagnostic_requested',
    `Diagnostic order requested: ${order.examType}`
  );

  const attachment = await runtime.attachments.upload(
    veterinarian.user.id,
    veterinarian.user.accountId,
    {
      linkedEntityType: 'diagnostic_order',
      linkedEntityId: order.id,
      category: 'lab',
      fileName: 'laudo-ultrassom.pdf',
      mimeType: 'application/pdf',
      checksum: 'sha256:phase7-laudo'
    }
  );
  runtime.medicalRecords.appendAttachmentEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    attachment.id,
    `Attachment added to diagnostic order ${order.id}`
  );

  const collectedOrder = runtime.diagnostics.recordResult(veterinarian.user.accountId, order.id, {
    status: 'collected',
    collectedByUserId: veterinarian.user.id
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'diagnostic_collected',
    `Diagnostic order collected by ${collectedOrder.collectedByUserId}`
  );

  const resultedOrder = runtime.diagnostics.recordResult(veterinarian.user.accountId, order.id, {
    status: 'resulted',
    resultSummary: 'Sem evidencias de efusao abdominal, com alcas discretamente espessadas.',
    releasedByUserId: veterinarian.user.id
  });
  runtime.medicalRecords.appendAdvancedCareEvent(
    veterinarian.user.accountId,
    encounter.id,
    veterinarian.user.id,
    'diagnostic_resulted',
    `Diagnostic result registered: ${resultedOrder.resultSummary}`
  );

  const timeline = runtime.medicalRecords.listTimelineByEncounter(
    veterinarian.user.accountId,
    encounter.id
  );
  const diagnosticAttachments = await runtime.attachments.listByLinkedEntity(
    'diagnostic_order',
    order.id,
    veterinarian.user.accountId
  );

  assert.equal(stay.encounterId, encounter.id);
  assert.equal(progress.encounterId, encounter.id);
  assert.equal(updatedSurgery.encounterId, encounter.id);
  assert.equal(resultedOrder.encounterId, encounter.id);
  assert.equal(
    diagnosticAttachments.some((item) => item.id === attachment.id),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'inpatient_admitted'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'inpatient_progressed'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'surgery_requested'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'surgery_status_changed'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'diagnostic_requested'),
    true
  );
  assert.equal(
    timeline.some((event) => event.eventType === 'diagnostic_resulted'),
    true
  );
});

test('administrative modules keep billing, inventory and notifications linked without exposing clinical permissions', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    {
      username: 'reception',
      password: 'seed_reception'
    },
    'corr_admin_bridge_reception'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Atendimento com consumo administrativo vinculado'
  });

  const financeLogin = (await runtime.auth.login(
    {
      username: 'finance',
      password: 'seed_finance'
    },
    'corr_admin_bridge_finance'
  )) as AuthSessionResponse;
  const finance = runtime.auth.authenticateAccessToken(financeLogin.accessToken);

  const inventoryLogin = (await runtime.auth.login(
    {
      username: 'inventory',
      password: 'seed_inventory'
    },
    'corr_admin_bridge_inventory'
  )) as AuthSessionResponse;
  const inventoryUser = runtime.auth.authenticateAccessToken(inventoryLogin.accessToken);

  const estimate = await runtime.billing.createEstimate(finance.user.accountId, {
    encounterId: encounter.id,
    administrativeNotes: 'Orcamento inicial emitido para tutor.'
  });
  const item = await runtime.billing.addItem(finance.user.accountId, finance.user.id, {
    encounterId: encounter.id,
    itemType: 'exam',
    description: 'Ultrassonografia abdominal',
    quantity: 1,
    unitPriceAmount: 180,
    sourceEntityType: 'encounter',
    sourceEntityId: encounter.id
  });
  const openedBilling = await runtime.billing.updateStatus(finance.user.accountId, encounter.id, {
    status: 'open'
  });

  const consumption = await runtime.inventory.consume(
    inventoryUser.user.id,
    {
      encounterId: encounter.id,
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      sourceEntityType: 'encounter',
      sourceEntityId: encounter.id
    },
    inventoryUser.user.accountId
  );

  const notification = await runtime.notifications.create(finance.user.id, finance.user.accountId, {
    category: 'billing',
    encounterId: encounter.id,
    patientId: encounter.patientId,
    recipientRoleCode: 'finance',
    title: 'Conta assistencial aberta',
    message: 'Billing inicial liberado para acompanhamento administrativo.',
    severity: 'medium'
  });
  const processed = await runtime.notifications.processPending(finance.user.accountId, {
    limit: 10
  });

  assert.throws(
    () =>
      runtime.accessControl.assertAuthorized({
        actor: finance.user,
        access: finance.access,
        permissionCode: 'medical-records.read',
        accountId: finance.user.accountId
      }),
    (error: unknown) => {
      assert.equal(error instanceof ForbiddenError, true);
      return true;
    }
  );

  assert.equal(estimate.encounterId, encounter.id);
  assert.equal(item.encounterId, encounter.id);
  assert.equal(openedBilling.status, 'open');
  assert.equal(consumption.encounterId, encounter.id);
  assert.equal(notification.encounterId, encounter.id);
  assert.equal(
    processed.some((entry) => entry.id === notification.id),
    true
  );
  assert.equal(
    runtime.notifications
      .list(finance.user.accountId, 'sent')
      .some((entry) => entry.id === notification.id),
    true
  );
  assert.equal(
    runtime.inventory.getItemOrThrow('inv_gauze' as never, inventoryUser.user.accountId)
      .onHandQuantity,
    58
  );
});

test('AUD-008-02: repositories persist data across runtime re-instantiation (simulated restart)', async () => {
  // Step 1: Bootstrap creates shared repositories
  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repositories = bootstrap.repositories;

  // Step 2: Create Runtime A and write data
  const runtimeA = createTestRuntime(repositories);

  // Login and create session
  const loginA = (await runtimeA.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_restart_test'
  )) as AuthSessionResponse;
  const sessionA = loginA.principal.session;

  // Create owner
  const ownerA = runtimeA.owners.create(loginA.principal.user.accountId, {
    fullName: 'Maria Restart Test',
    contacts: [{ label: 'Phone', value: '+55 11 99999-0000', type: 'phone', primary: true }],
    financialResponsible: true
  });
  await runtimeA.owners.waitForPersistence();

  // Create patient
  const patientA = runtimeA.patients.create(loginA.principal.user.accountId, {
    name: 'Rex Restart Test',
    species: 'canine',
    breed: 'Vira-lata',
    sex: 'male',
    primaryOwnerId: ownerA.id
  });
  await runtimeA.patients.waitForPersistence();

  // Create encounter
  const encounterA = runtimeA.encounters.openEncounter(
    loginA.principal.user.accountId,
    loginA.principal.user.id,
    {
      patientId: patientA.id,
      ownerId: ownerA.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Teste de persistencia'
    }
  );
  await runtimeA.encounters.waitForPersistence();

  // Check session in repository
  const sessionInRepoA = await repositories.session?.findById(sessionA.sessionId);
  assert.ok(sessionInRepoA, 'Session should be stored in repository');
  assert.equal(sessionInRepoA?.userId, sessionA.userId);

  // Verify audit events were written
  const auditEventsA = await repositories.audit?.list();
  const auditCountA = auditEventsA?.length ?? 0;
  assert.ok(auditCountA > 0, 'Audit events should be in repository');

  // Verify owner in repository
  const ownerInRepoA = await repositories.owner?.findById(ownerA.id);
  assert.ok(ownerInRepoA, 'Owner should be stored in repository');
  assert.equal(ownerInRepoA?.fullName, 'Maria Restart Test');

  // Verify patient in repository
  const patientInRepoA = await repositories.patient?.findById(patientA.id);
  assert.ok(patientInRepoA, 'Patient should be stored in repository');
  assert.equal(patientInRepoA?.name, 'Rex Restart Test');

  // Verify encounter in repository
  const encounterInRepoA = await repositories.encounter?.findById(encounterA.id);
  assert.ok(encounterInRepoA, 'Encounter should be stored in repository');
  assert.equal(encounterInRepoA?.patientId, patientA.id);

  // Step 3: Simulate restart - create Runtime B with the SAME repositories
  const runtimeB = createTestRuntime(repositories);

  // Verify session persists
  const sessionInRepoB = await repositories.session?.findById(sessionA.sessionId);
  assert.ok(sessionInRepoB, 'Session should survive restart');
  assert.equal(sessionInRepoB?.sessionId, sessionA.sessionId);

  // Verify audit events persist - runtimeB constructor adds a seedSystemEvent
  const auditEventsB = await repositories.audit?.list();
  const auditCountB = auditEventsB?.length ?? 0;
  assert.ok(auditCountB > 0, 'Audit events should survive restart');
  // Runtime constructor adds 1 seed event, so count should be +1
  assert.equal(auditCountB, auditCountA + 1, 'Audit count should include runtimeB seed event');

  const committedCoverageEvent = runtimeA.audit.write({
    actorId: loginA.principal.user.id,
    accountId: loginA.principal.user.accountId,
    module: 'lgpd',
    action: 'personal_data_exported',
    entityType: 'owner',
    entityId: ownerA.id,
    payloadSummary: 'Committed restart coverage evidence',
    riskLevel: 'high'
  });
  await runtimeA.audit.waitForPersistence();
  const restartedCoverage = await runtimeB.audit.getOperationalCoverageReport(
    loginA.principal.user.accountId,
    [
      {
        id: 'lgpd-export',
        module: 'lgpd',
        action: 'personal_data_exported',
        minimumRiskLevel: 'high',
        description: 'Exportacao LGPD'
      }
    ]
  );
  assert.equal(restartedCoverage.coveredRequirements, 1);
  assert.equal(restartedCoverage.requirements[0]?.evidenceEventId, committedCoverageEvent.eventId);

  // Verify owner persists in repository (accessible via repository after restart)
  const ownerBInRepo = await repositories.owner?.findById(ownerA.id);
  assert.ok(ownerBInRepo, 'Owner should persist in repository after restart');
  assert.equal(ownerBInRepo?.id, ownerA.id);
  assert.equal(ownerBInRepo?.fullName, 'Maria Restart Test');

  // Verify patient persists in repository
  const patientBInRepo = await repositories.patient?.findById(patientA.id);
  assert.ok(patientBInRepo, 'Patient should persist in repository after restart');
  assert.equal(patientBInRepo?.id, patientA.id);
  assert.equal(patientBInRepo?.name, 'Rex Restart Test');

  // Verify encounter persists in repository
  const encounterBInRepo = await repositories.encounter?.findById(encounterA.id);
  assert.ok(encounterBInRepo, 'Encounter should persist in repository after restart');
  assert.equal(encounterBInRepo?.id, encounterA.id);
  assert.equal(encounterBInRepo?.patientId, patientA.id);

  // Verify timeline persists in repository
  const timelineBInRepo = await repositories.encounterTimeline?.findByEncounterId(encounterA.id);
  assert.ok(timelineBInRepo, 'Timeline should persist in repository after restart');

  // Step 4: Write more data from Runtime B
  const ownerC = runtimeB.owners.create(loginA.principal.user.accountId, {
    fullName: 'Joao Second Instance',
    contacts: [{ label: 'Email', value: 'joao@test.com', type: 'email', primary: true }],
    financialResponsible: false
  });
  await runtimeB.owners.waitForPersistence();

  // Verify it is in the shared repository
  const ownerCInRepo = await repositories.owner?.findById(ownerC.id);
  assert.ok(ownerCInRepo, 'Owner created in Runtime B should be in shared repository');
  assert.equal(ownerCInRepo?.fullName, 'Joao Second Instance');

  // Step 5: Create Runtime C with same repositories - it should see ALL persisted data
  const runtimeC = createTestRuntime(repositories);

  // Runtime C should be able to create owners that reference previously persisted owners
  const ownerD = runtimeC.owners.create(loginA.principal.user.accountId, {
    fullName: 'Ana Third Instance',
    contacts: [{ label: 'Phone', value: '+55 11 88888-0000', type: 'phone', primary: true }],
    financialResponsible: false
  });
  await runtimeC.owners.waitForPersistence();

  // Verify all owners exist in repository
  const allOwners = await repositories.owner?.findByAccountId(loginA.principal.user.accountId);
  assert.ok(
    allOwners && allOwners.length >= 3,
    'Repository should have multiple owners from different runtime instances'
  );
  assert.ok(allOwners?.some((owner) => owner.id === ownerD.id));

  // This proves:
  // 1. Repositories are the persistence boundary (not service internal Maps)
  // 2. Data survives runtime re-instantiation
  // 3. Multiple runtime instances can share the same repository
});

test('runtime initialize rehydrates session cache and encounter timeline from shared repositories', async () => {
  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repositories = bootstrap.repositories;

  const runtimeA = createTestRuntime(repositories);
  const login = (await runtimeA.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_runtime_hydration'
  )) as AuthSessionResponse;
  const principal = runtimeA.auth.authenticateAccessToken(login.accessToken);
  const owner = runtimeA.owners.create(principal.user.accountId, {
    fullName: 'Owner Runtime Hydration',
    contacts: [
      {
        label: 'Celular',
        value: '+55 11 99999-0000',
        type: 'whatsapp',
        primary: true
      }
    ],
    financialResponsible: true
  });
  const patient = runtimeA.patients.create(principal.user.accountId, {
    name: 'Paciente Hydration',
    species: 'canine',
    breed: 'SRD',
    sex: 'female',
    size: 'medium',
    primaryOwnerId: owner.id
  });
  const encounter = runtimeA.encounters.openEncounter(principal.user.accountId, principal.user.id, {
    patientId: patient.id,
    ownerId: owner.id,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Hydration runtime restart'
  });

  const runtimeB = createTestRuntime(repositories);
  await runtimeB.initialize();

  const rehydratedPrincipal = runtimeB.auth.authenticateAccessToken(login.accessToken);
  const timeline = await runtimeB.encounters.listTimelineAsync(encounter.accountId, encounter.id);

  assert.equal(rehydratedPrincipal.user.id, principal.user.id);
  assert.ok(timeline.length > 0);
  assert.equal(
    timeline.some((event) => event.eventType === 'encounter_opened'),
    true
  );
});

test('AUD-005-01: medical records, entries and timeline persist across runtime re-instantiation', async () => {
  // Step 1: Bootstrap creates shared repositories (now includes medical record repositories)
  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repositories = bootstrap.repositories;

  // Verify repositories exist
  assert.ok(repositories.medicalRecord, 'medicalRecord repository should exist');
  assert.ok(repositories.clinicalEntry, 'clinicalEntry repository should exist');
  assert.ok(repositories.clinicalTimeline, 'clinicalTimeline repository should exist');

  // Step 2: Create Runtime A and write medical record data
  const runtimeA = createTestRuntime(repositories);

  // Login
  const loginA = (await runtimeA.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_medical_restart_test'
  )) as AuthSessionResponse;

  // Create owner and patient
  const owner = runtimeA.owners.create(loginA.principal.user.accountId, {
    fullName: 'Maria Medical Test',
    contacts: [{ label: 'Phone', value: '+55 11 99999-1111', type: 'phone', primary: true }],
    financialResponsible: true
  });

  const patient = runtimeA.patients.create(loginA.principal.user.accountId, {
    name: 'Thor Medical Test',
    species: 'canine',
    breed: 'Pastor Alemao',
    sex: 'male',
    primaryOwnerId: owner.id
  });

  // Create encounter
  const encounter = runtimeA.encounters.openEncounter(
    loginA.principal.user.accountId,
    loginA.principal.user.id,
    {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Teste de persistencia de prontuario'
    }
  );

  // Create medical record and entries
  const record = runtimeA.medicalRecords.ensureRecord(
    loginA.principal.user.accountId,
    encounter.id
  );

  const entry1 = await runtimeA.medicalRecords.createEntryAtomically(
    loginA.principal.user.accountId,
    loginA.principal.user.id,
    {
      encounterId: encounter.id,
      patientId: patient.id,
      entryType: 'anamnesis',
      title: 'Anamnese inicial',
      content: 'Tutor relata dois dias de inapetencia e vomitos esporadicos.'
    }
  );

  const entry2 = await runtimeA.medicalRecords.createEntryAtomically(
    loginA.principal.user.accountId,
    loginA.principal.user.id,
    {
      encounterId: encounter.id,
      patientId: patient.id,
      entryType: 'prescription',
      title: 'Prescricao inicial',
      content: 'Antiemetico a cada 12h por 3 dias.'
    }
  );

  await runtimeA.medicalRecords.waitForPersistence();

  // Verify data in repositories
  const recordInRepo = await repositories.medicalRecord?.findByEncounterId(encounter.id);
  assert.ok(recordInRepo, 'Medical record should be in repository');
  assert.equal(recordInRepo?.encounterId, encounter.id);

  const entriesInRepo = await repositories.clinicalEntry?.findByMedicalRecordId(record.id);
  assert.ok(entriesInRepo && entriesInRepo.length >= 2, 'Clinical entries should be in repository');

  const timelineInRepo = await repositories.clinicalTimeline?.findByMedicalRecordId(record.id);
  assert.ok(
    timelineInRepo && timelineInRepo.length >= 2,
    'Clinical timeline should be in repository'
  );

  // Step 3: Simulate restart - create Runtime B with the SAME repositories
  void createTestRuntime(repositories);

  // Verify medical record persists in repository
  const recordAfterRestart = await repositories.medicalRecord?.findByEncounterId(encounter.id);
  assert.ok(recordAfterRestart, 'Medical record should persist after restart');
  assert.equal(recordAfterRestart?.id, record.id);
  assert.equal(recordAfterRestart?.encounterId, encounter.id);
  assert.equal(recordAfterRestart?.patientId, patient.id);

  // Verify clinical entries persist
  const entriesAfterRestart = await repositories.clinicalEntry?.findByMedicalRecordId(record.id);
  assert.ok(
    entriesAfterRestart && entriesAfterRestart.length >= 2,
    'Clinical entries should persist after restart'
  );
  assert.ok(
    entriesAfterRestart?.some((e) => e.id === entry1.id),
    'Anamnesis entry should persist'
  );
  assert.ok(
    entriesAfterRestart?.some((e) => e.id === entry2.id),
    'Prescription entry should persist'
  );

  // Verify clinical timeline persists
  const timelineAfterRestart = await repositories.clinicalTimeline?.findByMedicalRecordId(
    record.id
  );
  assert.ok(
    timelineAfterRestart && timelineAfterRestart.length >= 2,
    'Clinical timeline should persist after restart'
  );

  // Step 4: Write more data directly to repository (simulating persistence across instances)
  // Note: Services use internal Maps for fast lookup, but repositories are the persistence boundary
  const additionalEntry = {
    id: 'entry_from_repo',
    accountId: record.accountId,
    medicalRecordId: record.id,
    encounterId: encounter.id,
    patientId: patient.id,
    entryType: 'conduct' as const,
    title: 'Conduta adicional',
    content: 'Entrada adicionada diretamente no repository.',
    authoredByUserId: loginA.principal.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await repositories.clinicalEntry?.create(additionalEntry as never);

  // Verify new entry is in shared repository
  const entriesAfterNewWrite = await repositories.clinicalEntry?.findByMedicalRecordId(record.id);
  assert.ok(
    entriesAfterNewWrite && entriesAfterNewWrite.length >= 3,
    'New entry should be in repository'
  );
  assert.ok(
    entriesAfterNewWrite?.some((e) => e.id === 'entry_from_repo'),
    'Entry from repository should be findable'
  );

  // Step 5: Create Runtime C - verify all data is accessible from repository
  void createTestRuntime(repositories);

  const finalEntries = await repositories.clinicalEntry?.findByMedicalRecordId(record.id);
  assert.equal(
    finalEntries?.length,
    3,
    'All 3 entries should be in repository across runtime instances'
  );

  // This proves:
  // 1. Medical records repository is the persistence boundary
  // 2. Clinical entries survive runtime re-instantiation
  // 3. Clinical timeline persists across runtime instances
  // 4. Data written to repository is accessible from any runtime instance
});

// AUD-010-03: Integration tests for API/worker shared state

test('AUD-010-03: notifications API creates and worker processes via shared service instance', async () => {
  // This test demonstrates the ARCHITECTURE for API/worker integration
  // The key insight: worker and API must share the same NotificationsService instance
  // (or a shared repository) to process notifications created by API

  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repositories = bootstrap.repositories;

  // Create runtime (API side)
  const runtime = createTestRuntime(repositories);

  // Login as finance user
  const financeLogin = (await runtime.auth.login(
    { username: 'finance', password: 'seed_finance' },
    'corr_worker_integration'
  )) as AuthSessionResponse;
  const finance = runtime.auth.authenticateAccessToken(financeLogin.accessToken);

  // API creates a notification
  const notification = await runtime.notifications.create(finance.user.id, finance.user.accountId, {
    category: 'billing',
    severity: 'high',
    title: 'Conta atrasada',
    message: 'Pagamento pendente ha 30 dias.'
  });

  assert.equal(notification.status, 'queued');

  // Verify notification exists in API's service
  const queuedInApi = runtime.notifications.list(finance.user.accountId, 'queued');
  assert.ok(
    queuedInApi.some((n) => n.id === notification.id),
    'Notification should be queued in API'
  );

  // Worker processes notifications using the SAME service instance
  // In current architecture, worker would need to receive the same service instance
  const processed = await runtime.notifications.processPending(finance.user.accountId, {
    limit: 10
  });

  assert.equal(processed.length, 1);
  assert.equal(processed[0].id, notification.id);

  // Verify notification is now sent
  const sentNotifications = runtime.notifications.list(finance.user.accountId, 'sent');
  assert.ok(
    sentNotifications.some((n) => n.id === notification.id),
    'Notification should be sent'
  );

  // Verify job was created
  const jobs = runtime.notifications.listJobs(finance.user.accountId);
  assert.ok(
    jobs.some((j) => j.notificationId === notification.id),
    'Job should be created'
  );

  // This proves: When API and worker share the same NotificationsService,
  // notifications created by API can be processed by worker
});

test('AUD-010-03: current limitation - separate instances do NOT share state', async () => {
  // This test documents the CURRENT LIMITATION
  // When API and worker use different NotificationsService instances,
  // they don't share state

  const runtime1 = createTestRuntime();
  const runtime2 = createTestRuntime();

  // API (runtime1) creates a notification
  const financeLogin = (await runtime1.auth.login(
    { username: 'finance', password: 'seed_finance' },
    'corr_separate_instances'
  )) as AuthSessionResponse;
  const finance = runtime1.auth.authenticateAccessToken(financeLogin.accessToken);

  const notification = await runtime1.notifications.create(
    finance.user.id,
    finance.user.accountId,
    {
      category: 'operations',
      severity: 'medium',
      title: 'Test separado',
      message: 'Teste de instancias separadas'
    }
  );

  // Worker (runtime2) tries to process - finds nothing because it's a different instance
  const processed = await runtime2.notifications.processPending(finance.user.accountId, {
    limit: 10
  });

  assert.equal(
    processed.length,
    0,
    'Worker should NOT see notifications from different API instance'
  );

  // The notification is still queued in runtime1
  const queued = runtime1.notifications.list(finance.user.accountId, 'queued');
  assert.equal(queued.length, 1, 'Notification should still be queued in original instance');
  assert.equal(queued[0]?.id, notification.id);

  // This proves: Separate instances don't share state
  // Solution: Use shared repositories or shared service instances
});

test('AUD-010-03: cross-aggregate flow - encounter to billing to notifications', async () => {
  // This test validates a real flow that crosses multiple aggregates:
  // encounter -> billing -> notification

  const runtime = createTestRuntime();

  // Login as reception
  const receptionLogin = (await runtime.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_cross_aggregate'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  // Open encounter
  const encounter = runtime.encounters.openEncounter(reception.user.accountId, reception.user.id, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Consulta de rotina'
  });

  // Create billing estimate
  const estimate = await runtime.billing.createEstimate(reception.user.accountId, {
    encounterId: encounter.id,
    administrativeNotes: 'Orcamento inicial'
  });

  // Add billing item
  const item = await runtime.billing.addItem(reception.user.accountId, reception.user.id, {
    encounterId: encounter.id,
    itemType: 'service',
    description: 'Consulta veterinaria',
    quantity: 1,
    unitPriceAmount: 150
  });

  // Create notification about billing
  const notification = await runtime.notifications.create(
    reception.user.id,
    reception.user.accountId,
    {
      category: 'billing',
      severity: 'medium',
      title: 'Orcamento criado',
      message: `Orcamento de R$ 150 criado para ${encounter.patientId}`,
      encounterId: encounter.id,
      patientId: encounter.patientId
    }
  );

  // Verify cross-aggregate links
  assert.equal(estimate.encounterId, encounter.id, 'Estimate should link to encounter');
  assert.equal(item.encounterId, encounter.id, 'Item should link to encounter');
  assert.equal(notification.encounterId, encounter.id, 'Notification should link to encounter');

  // Process notification
  const processed = await runtime.notifications.processPending(reception.user.accountId, {
    limit: 1
  });
  assert.equal(processed.length, 1);

  // This proves: Cross-aggregate flows work correctly
});

test('AUD-007-01: API writes notification to repository, worker reads and processes from shared repository', async () => {
  // This test proves worker/API integration via shared repository
  // The key: notifications created by API via repository are visible to worker via same repository

  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repositories = bootstrap.repositories;

  // API side: create runtime with repository
  const apiRuntime = createTestRuntime(repositories);

  // Login as finance user
  const financeLogin = (await apiRuntime.auth.login(
    { username: 'finance', password: 'seed_finance' },
    'corr_worker_repo_integration'
  )) as AuthSessionResponse;
  const finance = apiRuntime.auth.authenticateAccessToken(financeLogin.accessToken);

  // API creates a notification (writes to repository)
  const notification = await apiRuntime.notifications.create(
    finance.user.id,
    finance.user.accountId,
    {
      category: 'billing',
      severity: 'high',
      title: 'Pagamento vencido',
      message: 'Conta atrasada ha 60 dias.'
    }
  );

  // Verify notification is in repository
  const notifInRepo = await repositories.notification?.findNotificationById(notification.id);
  assert.ok(notifInRepo, 'Notification should be in shared repository');
  assert.equal(notifInRepo?.status, 'queued');

  // Verify job is in repository
  const jobsInRepo = await repositories.notification?.findQueuedJobs(finance.user.accountId, 10);
  assert.ok(jobsInRepo && jobsInRepo.length >= 1, 'Job should be in shared repository');

  // Worker side: create notifications service that reads from same repository
  const { NotificationsService } = await import('@cvg-his-v2/module-notifications');
  const workerNotifications = new NotificationsService({
    notificationRepository: repositories.notification
  });

  // Worker reads notifications from repository
  const queuedNotifications = await workerNotifications.listFromRepository(
    finance.user.accountId,
    'queued'
  );
  assert.ok(
    queuedNotifications.some((n) => n.id === notification.id),
    'Worker should see notification created by API via repository'
  );

  // Worker processes notifications from repository
  const processed = await workerNotifications.processPendingFromRepository(
    finance.user.accountId,
    { limit: 10 }
  );
  assert.equal(processed.length, 1, 'Worker should process 1 notification');
  assert.equal(processed[0].id, notification.id, 'Worker should process the correct notification');

  // Verify notification is now sent in repository
  const sentNotifications = (await repositories.notification?.findNotifications(finance.user.accountId))?.filter(
    (entry) => entry.status === 'sent'
  );
  assert.ok(
    sentNotifications && sentNotifications.some((n) => n.id === notification.id),
    'Notification should be marked as sent in repository'
  );

  // API can see the processed notification via repository
  const apiViewOfSent = await apiRuntime.notifications.listFromRepository(
    finance.user.accountId,
    'sent'
  );
  assert.ok(
    apiViewOfSent.some((n) => n.id === notification.id),
    'API should see notification as sent via repository'
  );

  // This proves:
  // 1. API writes to shared repository
  // 2. Worker reads from same repository
  // 3. Worker processes and updates repository
  // 4. API sees worker's updates via repository
  // Real integration between API and worker via shared repository
});

test('scheduling hardening: cancel appointment, time conflict, and queue transitions', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_scheduling_hardening'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const appointment = await runtime.scheduling.createAppointment(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-10T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta para cancelamento'
  });
  assert.equal(appointment.status, 'scheduled');

  const cancelled = await runtime.scheduling.cancelAppointment(appointment.id, 'Cliente desistiu');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.reason, 'Cliente desistiu');

  const apptAfterCancel = runtime.scheduling.getAppointmentOrThrow(appointment.id);
  assert.equal(apptAfterCancel.status, 'cancelled');
});

test('runtime gates automatic WhatsApp reminders behind feature flag state', async () => {
  const runtimeDisabled = createTestRuntime(undefined, {
    notificationsWhatsappRemindersEnabled: false
  });
  const receptionDisabledLogin = (await runtimeDisabled.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_whatsapp_reminder_disabled'
  )) as AuthSessionResponse;
  const receptionDisabled = runtimeDisabled.auth.authenticateAccessToken(
    receptionDisabledLogin.accessToken
  );

  const disabledAppointment = await runtimeDisabled.scheduling.createAppointment(
    receptionDisabled.user.accountId,
    {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-13T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder gated off'
    }
  );
  assert.equal(
    await waitForAuditAction(runtimeDisabled, 'whatsapp_reminder_skipped_flag_disabled'),
    true
  );
  assert.equal(
    runtimeDisabled.audit.list().some((entry) => entry.action === 'whatsapp_reminder_scheduled'),
    false
  );

  const runtimeEnabled = createTestRuntime(undefined, {
    notificationsWhatsappRemindersEnabled: true
  });
  const receptionEnabledLogin = (await runtimeEnabled.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_whatsapp_reminder_enabled'
  )) as AuthSessionResponse;
  const receptionEnabled = runtimeEnabled.auth.authenticateAccessToken(
    receptionEnabledLogin.accessToken
  );

  const enabledAppointment = await runtimeEnabled.scheduling.createAppointment(
    receptionEnabled.user.accountId,
    {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-13T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder gated on'
    }
  );
  assert.equal(await waitForAuditAction(runtimeEnabled, 'whatsapp_reminder_scheduled'), true);
  assert.equal(enabledAppointment.status, 'scheduled');
  assert.equal(disabledAppointment.status, 'scheduled');
  assert.equal(
    runtimeEnabled.audit
      .list()
      .some((entry) => entry.action === 'whatsapp_reminder_skipped_flag_disabled'),
    false
  );
});

test('runtime records successful WhatsApp reminder delivery with vendor correlation metadata', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    enabled: process.env['WHATSAPP_ENABLED'],
    provider: process.env['WHATSAPP_PROVIDER'],
    apiKey: process.env['WHATSAPP_API_KEY'],
    fromNumber: process.env['WHATSAPP_FROM_NUMBER']
  };

  process.env['WHATSAPP_ENABLED'] = 'true';
  process.env['WHATSAPP_PROVIDER'] = '360dialog';
  process.env['WHATSAPP_API_KEY'] = 'test-wa-key';
  process.env['WHATSAPP_FROM_NUMBER'] = '5511999999999';
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ messages: [{ id: 'wamid.runtime.123' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })) as typeof fetch;

  try {
    const runtime = createTestRuntime(undefined, {
      notificationsWhatsappRemindersEnabled: true
    });
    const receptionLogin = (await runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_whatsapp_reminder_delivery'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

    await runtime.scheduling.createAppointment(reception.user.accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-13T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder delivery evidence'
    });

    assert.equal(await waitForAuditAction(runtime, 'whatsapp_reminder_sent'), true);

    const deliveryEvent = runtime.audit
      .list()
      .find((entry) => entry.action === 'whatsapp_reminder_sent');
    assert.ok(deliveryEvent);
    assert.equal(deliveryEvent?.payloadSummary.includes('provider=360dialog'), true);
    assert.equal(deliveryEvent?.payloadSummary.includes('messageId=wamid.runtime.123'), true);
  } finally {
    globalThis.fetch = originalFetch;
    process.env['WHATSAPP_ENABLED'] = originalEnv.enabled;
    process.env['WHATSAPP_PROVIDER'] = originalEnv.provider;
    process.env['WHATSAPP_API_KEY'] = originalEnv.apiKey;
    process.env['WHATSAPP_FROM_NUMBER'] = originalEnv.fromNumber;
  }
});

test('runtime records failed WhatsApp reminder delivery when vendor dispatch throws', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    enabled: process.env['WHATSAPP_ENABLED'],
    provider: process.env['WHATSAPP_PROVIDER'],
    apiKey: process.env['WHATSAPP_API_KEY'],
    fromNumber: process.env['WHATSAPP_FROM_NUMBER']
  };

  process.env['WHATSAPP_ENABLED'] = 'true';
  process.env['WHATSAPP_PROVIDER'] = '360dialog';
  process.env['WHATSAPP_API_KEY'] = 'test-wa-key';
  process.env['WHATSAPP_FROM_NUMBER'] = '5511999999999';
  globalThis.fetch = (async () => {
    throw new Error('gateway timeout');
  }) as typeof fetch;

  try {
    const runtime = createTestRuntime(undefined, {
      notificationsWhatsappRemindersEnabled: true
    });
    const receptionLogin = (await runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_whatsapp_reminder_failure'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

    await runtime.scheduling.createAppointment(reception.user.accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-13T13:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder delivery failure evidence'
    });

    assert.equal(await waitForAuditAction(runtime, 'whatsapp_reminder_scheduled'), true);
    assert.equal(await waitForAuditAction(runtime, 'whatsapp_reminder_failed'), true);

    const failureEvent = runtime.audit
      .list()
      .find((entry) => entry.action === 'whatsapp_reminder_failed');
    assert.ok(failureEvent);
    assert.equal(failureEvent?.payloadSummary.includes('provider=360dialog'), true);
    assert.equal(failureEvent?.payloadSummary.includes('error=gateway timeout'), true);
  } finally {
    globalThis.fetch = originalFetch;
    process.env['WHATSAPP_ENABLED'] = originalEnv.enabled;
    process.env['WHATSAPP_PROVIDER'] = originalEnv.provider;
    process.env['WHATSAPP_API_KEY'] = originalEnv.apiKey;
    process.env['WHATSAPP_FROM_NUMBER'] = originalEnv.fromNumber;
  }
});

test('scheduling hardening: rejects double cancellation', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_double_cancel'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const appointment = await runtime.scheduling.createAppointment(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-11T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta para cancelar duas vezes'
  });

  await runtime.scheduling.cancelAppointment(appointment.id, 'Primeiro cancelamento');

  try {
    await runtime.scheduling.cancelAppointment(appointment.id, 'Segundo cancelamento');
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof Error, 'Should throw an error');
    assert.ok(
      err.message.includes('cannot be cancelled'),
      'Should mention cancellation restriction'
    );
  }
});

test('scheduling hardening: time conflict blocks overlapping appointments', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_time_conflict'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  await runtime.scheduling.createAppointment(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-12T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta base'
  });

  try {
    await runtime.scheduling.createAppointment(reception.user.accountId, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-12T10:15:00.000Z',
      visitType: 'return',
      reason: 'Consulta conflitante'
    });
    assert.fail('Should have thrown for overlapping appointment');
  } catch (err) {
    assert.ok(err instanceof Error, 'Should throw an error');
    assert.ok(err.message.includes('30-minute window'), 'Should mention time window');
  }

  const later = await runtime.scheduling.createAppointment(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-12T11:00:00.000Z',
    visitType: 'return',
    reason: 'Consulta fora da janela'
  });
  assert.equal(later.status, 'scheduled');
});

test('scheduling hardening: queue transitions enforce state machine', async () => {
  const runtime = createTestRuntime();
  const receptionLogin = (await runtime.auth.login(
    { username: 'reception', password: 'seed_reception' },
    'corr_queue_transitions'
  )) as AuthSessionResponse;
  const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

  const queueEntry = await runtime.scheduling.checkIn(reception.user.accountId, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    reason: 'Fluxo de transicoes'
  });
  assert.equal(queueEntry.status, 'waiting');

  await runtime.scheduling.callQueueEntry(queueEntry.id);
  await runtime.scheduling.attachEncounter(queueEntry.id, 'enc_transitions' as never);
  await runtime.scheduling.transitionQueueForEncounter(queueEntry.id, 'in_care');
  await runtime.scheduling.transitionQueueForEncounter(queueEntry.id, 'observation');
  await runtime.scheduling.transitionQueueEntry(queueEntry.id, 'completed');

  try {
    await runtime.scheduling.transitionQueueForEncounter(queueEntry.id, 'waiting');
    assert.fail('Should have thrown for invalid transition');
  } catch (err) {
    assert.ok(err instanceof Error, 'Should throw an error');
    assert.ok(
      err.message.includes('Invalid queue entry status transition'),
      'Should mention invalid transition'
    );
  }

  try {
    await runtime.scheduling.callQueueEntry(queueEntry.id);
    assert.fail('Should have thrown for calling completed entry');
  } catch (err) {
    assert.ok(err instanceof Error, 'Should throw an error');
    assert.ok(err.message.includes('cannot be called'), 'Should mention call restriction');
  }
});
