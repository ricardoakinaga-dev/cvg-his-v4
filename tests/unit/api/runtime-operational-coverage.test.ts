import { describe, expect, it } from 'vitest';

import { ConflictError } from '@cvg-his-v2/shared-errors';

import { createApiRuntime } from '../../../apps/api/src/runtime.ts';
import { createInMemoryRuntimeRepositories } from '../../../apps/api/src/runtime-repositories.ts';

const ACCOUNT_ID = 'acc_cvg_demo' as never;
const USER_ID = 'user_admin' as never;

function createRuntime() {
  return createApiRuntime({
    authSecret: 'test-secret-key-123456',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 3_600
  });
}

describe('runtime operational coverage', () => {
  it('closes counter sale without open register and skips cash movements', async () => {
    const runtime = createRuntime();
    const sku = runtime.inventory.listItems()[0]?.sku;

    expect(sku).toBeDefined();

    const sale = await runtime.counterSales.open(ACCOUNT_ID, USER_ID);
    await runtime.counterSales.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona runtime',
      codeSnapshot: sku,
      unitPrice: 10,
      quantity: 1
    });
    await runtime.counterSales.addPayment(sale.id, {
      method: 'cash',
      amount: 10,
      reference: 'CASH-RUNTIME-1'
    });

    const closed = await runtime.counterSales.close(sale.id, USER_ID);

    expect(closed.sale.status).toBe('closed');
    expect(closed.inventoryConsumptions).toHaveLength(1);
    expect(closed.cashMovements).toBeUndefined();
  });

  it('closes counter sale with open register and records mapped cash movements', async () => {
    const runtime = createRuntime();
    const sku = runtime.inventory.listItems()[0]?.sku;
    const register = await runtime.cash.openRegister(ACCOUNT_ID, USER_ID, {
      openingAmount: 100,
      notes: 'runtime'
    });

    const sale = await runtime.counterSales.open(ACCOUNT_ID, USER_ID);
    await runtime.counterSales.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona runtime',
      codeSnapshot: sku,
      unitPrice: 25,
      quantity: 1
    });
    await runtime.counterSales.addPayment(sale.id, {
      method: 'cash',
      amount: 20,
      reference: 'CASH-RUNTIME-2'
    });
    await runtime.counterSales.addPayment(sale.id, {
      method: 'credit_card',
      amount: 5,
      reference: 'CC-RUNTIME-IGNORED'
    });

    const closed = await runtime.counterSales.close(sale.id, USER_ID);

    expect(closed.sale.status).toBe('closed');
    expect(closed.cashMovements).toEqual([
      expect.objectContaining({
        cashRegisterId: register.id,
        movementType: 'payment',
        amount: 20,
        runningBalance: 120,
        reference: 'CASH-RUNTIME-2'
      })
    ]);
  });

  it('fails close when runtime inventory bridge cannot resolve the SKU', async () => {
    const runtime = createRuntime();
    const sale = await runtime.counterSales.open(ACCOUNT_ID, USER_ID);
    await runtime.counterSales.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Produto desconhecido',
      codeSnapshot: 'SKU-UNKNOWN',
      unitPrice: 15,
      quantity: 1
    });
    await runtime.counterSales.addPayment(sale.id, {
      method: 'pix',
      amount: 15,
      reference: 'PIX-UNKNOWN'
    });

    await expect(runtime.counterSales.close(sale.id, USER_ID)).rejects.toThrow(ConflictError);
    await expect(runtime.counterSales.close(sale.id, USER_ID)).rejects.toThrow(
      'Inventory item not found for code: SKU-UNKNOWN'
    );
  });

  it('applies card settlement when encounter financial payment uses external reference type other', async () => {
    const runtime = createRuntime();
    const encounter = runtime.encounters.openEncounter(ACCOUNT_ID, USER_ID, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Card settlement runtime'
    });

    const billingRecord = await runtime.billing.createEstimate(ACCOUNT_ID as never, {
      encounterId: encounter.id,
      administrativeNotes: 'Card settlement'
    });
    await runtime.billing.addItem(ACCOUNT_ID as never, USER_ID, {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 80
    });
    await runtime.cardTransactions.create({
      transactionId: 'card_runtime_1',
      provider: 'local-card',
      accountId: ACCOUNT_ID,
      billingRecordId: billingRecord.id,
      amount: 80,
      currency: 'BRL',
      description: 'Consulta',
      installments: 1,
      status: 'captured',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      billingSettlementStatus: 'pending_billing'
    });

    const summary = await runtime.encounterFinancial.recordPaymentForBillingRecord(
      ACCOUNT_ID,
      billingRecord.id,
      {
        amountPaid: 80,
        method: 'credit_card',
        paidAt: '2026-04-18T12:00:00.000Z',
        paidByUserId: USER_ID,
        externalReferenceType: 'other',
        externalReferenceId: 'card_runtime_1'
      }
    );

    expect(summary.financialStatus).toBe('paid');
    await expect(runtime.cardTransactions.findByTransactionId('card_runtime_1')).resolves.toEqual(
      expect.objectContaining({
        billingSettlementStatus: 'applied'
      })
    );
    await expect(
      runtime.cardTransactions.findByTransactionId('card_runtime_1')
    ).resolves.toMatchObject({
      billingSettledAt: expect.any(String)
    });
  });

  it('ignores unsupported external reference types when settling receivables', async () => {
    const runtime = createRuntime();
    const encounter = runtime.encounters.openEncounter(ACCOUNT_ID, USER_ID, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Unsupported reference'
    });

    const billingRecord = await runtime.billing.createEstimate(ACCOUNT_ID as never, {
      encounterId: encounter.id,
      administrativeNotes: 'Unsupported reference'
    });
    await runtime.billing.addItem(ACCOUNT_ID as never, USER_ID, {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 40
    });
    await runtime.cardTransactions.create({
      transactionId: 'card_runtime_unsupported',
      provider: 'local-card',
      accountId: ACCOUNT_ID,
      billingRecordId: billingRecord.id,
      amount: 40,
      currency: 'BRL',
      description: 'Consulta',
      installments: 1,
      status: 'captured',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      billingSettlementStatus: 'pending_billing'
    });

    await runtime.encounterFinancial.recordPaymentForBillingRecord(ACCOUNT_ID, billingRecord.id, {
      amountPaid: 40,
      method: 'cash',
      paidAt: '2026-04-18T13:00:00.000Z',
      paidByUserId: USER_ID,
      externalReferenceType: 'billing_record',
      externalReferenceId: 'card_runtime_unsupported'
    });

    await expect(
      runtime.cardTransactions.findByTransactionId('card_runtime_unsupported')
    ).resolves.toEqual(
      expect.objectContaining({
        billingSettlementStatus: 'pending_billing'
      })
    );
    const unchanged = await runtime.cardTransactions.findByTransactionId(
      'card_runtime_unsupported'
    );
    expect(unchanged).not.toHaveProperty('billingSettledAt');
  });

  it('skips transaction settlement updates when external reference id is missing', async () => {
    const runtime = createRuntime();
    const encounter = runtime.encounters.openEncounter(ACCOUNT_ID, USER_ID, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Missing external reference id'
    });

    const billingRecord = await runtime.billing.createEstimate(ACCOUNT_ID as never, {
      encounterId: encounter.id,
      administrativeNotes: 'Missing external reference id'
    });
    await runtime.billing.addItem(ACCOUNT_ID as never, USER_ID, {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 55
    });
    await runtime.cardTransactions.create({
      transactionId: 'card_runtime_missing_reference',
      provider: 'local-card',
      accountId: ACCOUNT_ID,
      billingRecordId: billingRecord.id,
      amount: 55,
      currency: 'BRL',
      description: 'Consulta',
      installments: 1,
      status: 'captured',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      billingSettlementStatus: 'pending_billing'
    });

    const summary = await runtime.encounterFinancial.recordPaymentForBillingRecord(
      ACCOUNT_ID,
      billingRecord.id,
      {
        amountPaid: 55,
        method: 'credit_card',
        paidAt: '2026-04-18T14:00:00.000Z',
        paidByUserId: USER_ID,
        externalReferenceType: 'other'
      }
    );

    expect(summary.financialStatus).toBe('paid');
    await expect(
      runtime.cardTransactions.findByTransactionId('card_runtime_missing_reference')
    ).resolves.toEqual(
      expect.objectContaining({
        billingSettlementStatus: 'pending_billing'
      })
    );
  });

  it('publishes notification.sent events when queued notifications are processed', async () => {
    const inMemoryRepos = createInMemoryRuntimeRepositories();
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: {
        outbox: inMemoryRepos.outbox
      }
    });

    const notification = await runtime.notifications.create(USER_ID, ACCOUNT_ID, {
      category: 'operations',
      severity: 'medium',
      title: 'Runtime notification event',
      message: 'Notification should publish an outbox event'
    });

    const processed = await runtime.notifications.processPending(ACCOUNT_ID, { limit: 10 });
    const pendingEvents = await inMemoryRepos.outbox.findPending(ACCOUNT_ID, 10);
    const sentEvent = pendingEvents.find((event) => event.eventType === 'notification.sent');

    expect(processed).toHaveLength(1);
    expect(processed[0]?.id).toBe(notification.id);
    expect(sentEvent).toEqual(
      expect.objectContaining({
        moduleName: 'notifications',
        eventType: 'notification.sent',
        payload: expect.objectContaining({
          id: notification.id,
          accountId: ACCOUNT_ID,
          title: 'Runtime notification event',
          channel: 'internal'
        })
      })
    );
  });

  it('initializes without scoped hydrations when no bootstrap account id can be resolved', async () => {
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: {
        users: {
          async findAll() {
            return [];
          },
          async findRoleCodesByUserId() {
            return [];
          },
          async create() {
            throw new Error('not implemented');
          },
          async update() {
            throw new Error('not implemented');
          },
          async findById() {
            return null;
          },
          async findByUsername() {
            return null;
          },
          async findByAccountId() {
            return [];
          }
        } as never,
        staff: {
          async findByAccountId() {
            return [];
          },
          async create() {
            throw new Error('not implemented');
          },
          async update() {
            throw new Error('not implemented');
          },
          async findById() {
            return null;
          },
          async findByUserId() {
            return null;
          }
        } as never,
        owner: {} as never,
        patient: {} as never,
        ownerPatientLink: {} as never
      }
    });

    await expect(runtime.initialize()).resolves.toBeUndefined();
    expect(runtime.users.list()).toEqual([]);
    expect(runtime.staff.list()).toEqual([]);
    expect(runtime.owners.list()).toEqual([]);
    expect(runtime.patients.list()).toEqual([]);
  });

  it('publishes appointment.status_changed when an appointment is cancelled', async () => {
    const inMemoryRepos = createInMemoryRuntimeRepositories();
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: {
        outbox: inMemoryRepos.outbox
      }
    });

    const appointment = await runtime.scheduling.createAppointment(ACCOUNT_ID, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Cobertura de status de agendamento'
    });

    await runtime.scheduling.cancelAppointment(appointment.id, 'Cliente desistiu');
    const pendingEvents = await inMemoryRepos.outbox.findPending(ACCOUNT_ID, 10);
    const statusChangedEvent = pendingEvents.find(
      (event) =>
        event.eventType === 'appointment.status_changed' &&
        (event.payload as { id?: string }).id === appointment.id
    );

    expect(statusChangedEvent).toEqual(
      expect.objectContaining({
        moduleName: 'scheduling',
        eventType: 'appointment.status_changed',
        payload: expect.objectContaining({
          id: appointment.id,
          accountId: ACCOUNT_ID,
          previousStatus: 'scheduled',
          newStatus: 'cancelled',
          reason: 'Cliente desistiu'
        })
      })
    );
  });

  it('publishes encounter.status_changed when the encounter moves to observation', async () => {
    const inMemoryRepos = createInMemoryRuntimeRepositories();
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: {
        outbox: inMemoryRepos.outbox
      }
    });

    const encounter = runtime.encounters.openEncounter(ACCOUNT_ID, USER_ID, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Cobertura de status de encounter'
    });

    runtime.encounters.transitionEncounter(ACCOUNT_ID, encounter.id, USER_ID, {
      nextStatus: 'in_triage'
    });
    const observed = runtime.encounters.transitionEncounter(ACCOUNT_ID, encounter.id, USER_ID, {
      nextStatus: 'observation'
    });
    await runtime.encounters.waitForPersistence();

    const pendingEvents = await inMemoryRepos.outbox.findPending(ACCOUNT_ID, 10);
    const statusChangedEvent = pendingEvents.find(
      (event) =>
        event.eventType === 'encounter.status_changed' &&
        (event.payload as { id?: string; newStatus?: string }).id === encounter.id &&
        (event.payload as { newStatus?: string }).newStatus === 'observation'
    );

    expect(observed.status).toBe('observation');
    expect(statusChangedEvent).toEqual(
      expect.objectContaining({
        moduleName: 'encounters',
        eventType: 'encounter.status_changed',
        payload: expect.objectContaining({
          id: encounter.id,
          accountId: ACCOUNT_ID,
          patientId: 'patient_luna',
          previousStatus: 'in_triage',
          newStatus: 'observation'
        })
      })
    );
  });

  it('publishes patient.created when a patient is registered at runtime', async () => {
    const inMemoryRepos = createInMemoryRuntimeRepositories();
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: {
        outbox: inMemoryRepos.outbox
      }
    });

    const patient = runtime.patients.create(ACCOUNT_ID, {
      name: 'Paciente Runtime Event',
      species: 'canine',
      breed: 'SRD',
      sex: 'male',
      size: 'medium',
      primaryOwnerId: 'owner_maria_silva'
    });
    await runtime.patients.waitForPersistence();

    const pendingEvents = await inMemoryRepos.outbox.findPending(ACCOUNT_ID, 10);
    const createdEvent = pendingEvents.find(
      (event) =>
        event.eventType === 'patient.created' &&
        (event.payload as { id?: string }).id === patient.id
    );

    expect(createdEvent).toEqual(
      expect.objectContaining({
        moduleName: 'patients',
        eventType: 'patient.created',
        payload: expect.objectContaining({
          id: patient.id,
          accountId: ACCOUNT_ID,
          name: 'Paciente Runtime Event',
          species: 'canine',
          primaryOwnerId: 'owner_maria_silva'
        })
      })
    );
  });
});
