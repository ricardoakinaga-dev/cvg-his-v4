import { describe, expect, it } from 'vitest';
import type { AuthSessionResponse } from '@cvg-his-v2/shared-contracts';

import { createApiRuntime } from '../../../apps/api/src/runtime.ts';

async function waitForAuditAction(
  runtime: ReturnType<typeof createApiRuntime>,
  action: string,
  attempts = 20
): Promise<boolean> {
  for (let index = 0; index < attempts; index += 1) {
    if (runtime.audit.list().some((entry) => entry.action === action)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return runtime.audit.list().some((entry) => entry.action === action);
}

describe('runtime', () => {
  it('builds and initializes the in-memory runtime graph', async () => {
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600
    });

    await runtime.initialize();

    expect(runtime.auth).toBeDefined();
    expect(runtime.audit).toBeDefined();
    expect(runtime.eventBus).toBeDefined();
    expect(runtime.users.list().length).toBeGreaterThan(0);
    expect(runtime.owners.list().length).toBeGreaterThan(0);
    expect(runtime.patients.list().length).toBeGreaterThan(0);
  });

  it('enables MFA service when an encryption key is provided', () => {
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      enableMfa: true,
      mfaEncryptionKey: '1234567890abcdef'
    });

    expect(runtime.auth).toBeDefined();
  });

  it('schedules or skips automatic WhatsApp reminders according to the runtime flag', async () => {
    const disabledRuntime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      notificationsWhatsappRemindersEnabled: false
    });
    const enabledRuntime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      notificationsWhatsappRemindersEnabled: true
    });

    await disabledRuntime.scheduling.createAppointment('acc_cvg_demo' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-18T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder disabled'
    });
    await enabledRuntime.scheduling.createAppointment('acc_cvg_demo' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-18T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reminder enabled'
    });

    await expect(
      waitForAuditAction(disabledRuntime, 'whatsapp_reminder_skipped_flag_disabled')
    ).resolves.toBe(true);
    await expect(waitForAuditAction(enabledRuntime, 'whatsapp_reminder_scheduled')).resolves.toBe(
      true
    );
  });

  it('reconciles PIX confirmations into the administrative financial summary', async () => {
    const runtime = createApiRuntime({
      authSecret: 'test-secret-key-123456',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600
    });
    const login = await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception'
      },
      'corr_pix_financial_runtime'
    );
    const principal = runtime.auth.authenticateAccessToken(
      (login as AuthSessionResponse).accessToken
    );

    const encounter = runtime.encounters.openEncounter(principal.user.accountId, principal.user.id, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Fluxo financeiro administrativo com PIX'
    });

    const billingRecord = await runtime.billing.createEstimate({
      encounterId: encounter.id,
      administrativeNotes: 'Fechamento administrativo via PIX'
    });
    await runtime.billing.addItem(principal.user.id, {
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
        accountId: principal.user.accountId,
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

    expect(await runtime.pixTransactions.findByTransactionId('pix_intent_runtime_1')).toEqual(
      expect.objectContaining({
        status: 'pending',
        billingSettlementStatus: 'awaiting_payment'
      })
    );

    await runtime.eventBus.publish({
      correlationId: 'corr_pix_financial_confirm' as never,
      moduleName: 'billing' as never,
      eventType: 'payment.pix.confirmed',
      payload: {
        accountId: principal.user.accountId,
        intentId: 'pix_intent_runtime_1',
        billingRecordId: billingRecord.id,
        providerTransactionId: 'provider_runtime_1',
        providerConfirmationId: 'provider_runtime_1',
        status: 'completed',
        completedAt: new Date().toISOString()
      }
    });
    await runtime.eventBus.processPending(10);

    await expect(runtime.encounterFinancial.getSummary(encounter.id)).resolves.toEqual(
      expect.objectContaining({
        balanceDue: 0,
        financialStatus: 'paid',
        payments: expect.arrayContaining([
          expect.objectContaining({
            externalReferenceType: 'pix_transaction',
            externalReferenceId: 'pix_intent_runtime_1'
          })
        ])
      })
    );
    expect(await runtime.pixTransactions.findByTransactionId('pix_intent_runtime_1')).toEqual(
      expect.objectContaining({
        status: 'completed',
        billingSettlementStatus: 'applied',
        cashReconciliationStatus: 'skipped_no_open_register'
      })
    );
  });
});
