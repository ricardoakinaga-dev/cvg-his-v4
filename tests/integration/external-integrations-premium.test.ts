import { createHmac } from 'node:crypto';
import { Readable, Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { ApiKeysService } from '../../packages/modules/api-keys/src/index.ts';
import { AuditService } from '../../packages/modules/audit/src/index.ts';
import {
  DiagnosticsService,
  LaboratoryService
} from '../../packages/modules/diagnostics/src/index.ts';
import { EncountersService } from '../../packages/modules/encounters/src/index.ts';
import { OwnersService } from '../../packages/modules/owners/src/index.ts';
import { PatientsService } from '../../packages/modules/patients/src/index.ts';
import { SchedulingService } from '../../packages/modules/scheduling/src/index.ts';

import { createApiRuntime } from '../../apps/api/src/runtime.ts';
import { LocalEmailGateway } from '../../apps/api/src/email-gateway.ts';
import { InMemoryEmailDeliveryRepository } from '../../apps/api/src/email-delivery-repository.ts';
import { LocalGoogleCalendarGateway } from '../../apps/api/src/google-calendar-gateway.ts';
import { InMemoryGoogleCalendarSyncRepository } from '../../apps/api/src/google-calendar-sync-repository.ts';
import { InMemoryLaboratoryResultImportRepository } from '../../apps/api/src/laboratory-result-import-repository.ts';
import { HmacLaboratoryProviderSignatureVerifier } from '../../apps/api/src/laboratory-provider-ingress.ts';
import { createInMemoryRuntimeRepositories } from '../../apps/api/src/runtime-repositories.ts';
import { InMemorySmsDeliveryRepository } from '../../apps/api/src/sms-delivery-repository.ts';
import { LocalSmsGateway } from '../../apps/api/src/sms-gateway.ts';
import { handleEmailRoutes } from '../../apps/api/src/routes/email-routes.ts';
import { handleGoogleCalendarRoutes } from '../../apps/api/src/routes/google-calendar-routes.ts';
import { handleLaboratoryIntegrationRoutes } from '../../apps/api/src/routes/laboratory-integration-routes.ts';
import { handleSmsRoutes } from '../../apps/api/src/routes/sms-routes.ts';
import { handleWhatsAppRoutes } from '../../apps/api/src/routes/whatsapp-routes.ts';

class MockResponse extends Writable {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

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

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }
}

function createJsonRequest(
  method: string,
  url: string,
  rawKey: string,
  body?: unknown,
  additionalHeaders: Record<string, string> = {}
): Readable {
  return Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), {
    method,
    url,
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json',
      ...additionalHeaders
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
}

class DurableLaboratoryResultImportRepository extends InMemoryLaboratoryResultImportRepository {
  override readonly storage = 'durable' as const;
}

const LAB_PROVIDER_KEY_ID = 'lab-key-01';
const LAB_PROVIDER_SECRET = Buffer.alloc(32, 0x52);
const LAB_PROVIDER_NOW_SECONDS = Math.floor(Date.now() / 1_000);

function createSignedLaboratoryRequest(rawKey: string, payload: Record<string, string>): Readable {
  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const timestamp = String(LAB_PROVIDER_NOW_SECONDS);
  const signature = `v1=${createHmac('sha256', LAB_PROVIDER_SECRET)
    .update(Buffer.from(`v1.${timestamp}.`, 'ascii'))
    .update(rawBody)
    .digest('hex')}`;
  return Object.assign(Readable.from([rawBody]), {
    method: 'POST',
    url: '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json',
      'x-lab-provider-key-id': LAB_PROVIDER_KEY_ID,
      'x-lab-timestamp': timestamp,
      'x-lab-signature': signature
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
}

async function waitForAuditAction(
  audit: AuditService,
  action: string,
  attempts = 50,
  delayMs = 10
): Promise<boolean> {
  for (let index = 0; index < attempts; index += 1) {
    if (audit.list().some((entry) => entry.action === action)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return audit.list().some((entry) => entry.action === action);
}

describe('external integrations premium evidence', () => {
  it('tracks retry exhaustion for email and sms in operational reports', async () => {
    const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
    const key = await apiKeys.create({
      accountId: 'acc_cvg_demo' as never,
      name: 'integrations-premium',
      permissions: ['integrations.read', 'notifications.manage'],
      createdBy: 'user_admin'
    });
    const audit = new AuditService();

    const emailGateway = new LocalEmailGateway();
    const emailDeliveries = new InMemoryEmailDeliveryRepository();
    const sendEmailResponse = new MockResponse();
    await handleEmailRoutes(
      '/integrations/email/messages',
      createJsonRequest('POST', '/integrations/email/messages', key.rawKey, {
        to: 'fail@example.com',
        subject: 'Falha controlada',
        text: 'Email com falha e retry premium',
        maxRetries: 2
      }) as never,
      sendEmailResponse as never,
      'corr-int-email-1',
      {
        emailGateway,
        emailDeliveries,
        emailMode: 'mock',
        emailFrom: 'noreply@cvg-his.local',
        resendConfigured: false,
        apiKeys,
        audit
      }
    );
    const failedEmail = sendEmailResponse.bodyJson<{ messageId: string; retryCount: number }>();
    expect(failedEmail.retryCount).toBe(1);

    const retryEmailResponse = new MockResponse();
    await handleEmailRoutes(
      `/integrations/email/messages/${failedEmail.messageId}/retry`,
      createJsonRequest(
        'POST',
        `/integrations/email/messages/${failedEmail.messageId}/retry`,
        key.rawKey
      ) as never,
      retryEmailResponse as never,
      'corr-int-email-2',
      {
        emailGateway,
        emailDeliveries,
        emailMode: 'mock',
        emailFrom: 'noreply@cvg-his.local',
        resendConfigured: false,
        apiKeys,
        audit
      }
    );
    expect(retryEmailResponse.bodyJson<{ retryCount: number }>().retryCount).toBe(2);

    const emailReportResponse = new MockResponse();
    await handleEmailRoutes(
      '/integrations/email/messages/report',
      createJsonRequest('GET', '/integrations/email/messages/report', key.rawKey) as never,
      emailReportResponse as never,
      'corr-int-email-3',
      {
        emailGateway,
        emailDeliveries,
        emailMode: 'mock',
        emailFrom: 'noreply@cvg-his.local',
        resendConfigured: false,
        apiKeys,
        audit
      }
    );
    const emailReport = emailReportResponse.bodyJson<{
      summary: { failed: number };
      operational: { pendingRetries: number };
    }>();
    expect(emailReport.summary.failed).toBe(1);
    expect(emailReport.operational.pendingRetries).toBe(0);

    const smsGateway = new LocalSmsGateway();
    const smsDeliveries = new InMemorySmsDeliveryRepository();
    const sendSmsResponse = new MockResponse();
    await handleSmsRoutes(
      '/integrations/sms/messages',
      createJsonRequest('POST', '/integrations/sms/messages', key.rawKey, {
        to: '5511000000000',
        text: 'Falha controlada SMS',
        maxRetries: 2
      }) as never,
      sendSmsResponse as never,
      'corr-int-sms-1',
      {
        smsGateway,
        smsDeliveries,
        smsMode: 'mock',
        smsFrom: 'CVGHIS',
        smsConfigured: false,
        apiKeys,
        audit
      }
    );
    const failedSms = sendSmsResponse.bodyJson<{ messageId: string; retryCount: number }>();
    expect(failedSms.retryCount).toBe(1);

    const retrySmsResponse = new MockResponse();
    await handleSmsRoutes(
      `/integrations/sms/messages/${failedSms.messageId}/retry`,
      createJsonRequest(
        'POST',
        `/integrations/sms/messages/${failedSms.messageId}/retry`,
        key.rawKey
      ) as never,
      retrySmsResponse as never,
      'corr-int-sms-2',
      {
        smsGateway,
        smsDeliveries,
        smsMode: 'mock',
        smsFrom: 'CVGHIS',
        smsConfigured: false,
        apiKeys,
        audit
      }
    );
    expect(retrySmsResponse.bodyJson<{ retryCount: number }>().retryCount).toBe(2);

    const smsReportResponse = new MockResponse();
    await handleSmsRoutes(
      '/integrations/sms/messages/report',
      createJsonRequest('GET', '/integrations/sms/messages/report', key.rawKey) as never,
      smsReportResponse as never,
      'corr-int-sms-3',
      {
        smsGateway,
        smsDeliveries,
        smsMode: 'mock',
        smsFrom: 'CVGHIS',
        smsConfigured: false,
        apiKeys,
        audit
      }
    );
    const smsReport = smsReportResponse.bodyJson<{
      summary: { failed: number };
      operational: { pendingRetries: number };
    }>();
    expect(smsReport.summary.failed).toBe(1);
    expect(smsReport.operational.pendingRetries).toBe(0);
  });

  it('keeps google calendar sync idempotent per appointment in the operational report', async () => {
    const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
    const key = await apiKeys.create({
      accountId: 'acc_cvg_demo' as never,
      name: 'google-calendar-premium',
      permissions: ['integrations.read', 'notifications.manage'],
      createdBy: 'user_admin'
    });
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const scheduling = new SchedulingService(owners, patients);
    const appointment = await scheduling.createAppointment('acc_cvg_demo' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-22T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Sync premium'
    });
    const audit = new AuditService();
    const googleCalendarSyncs = new InMemoryGoogleCalendarSyncRepository();
    const gateway = new LocalGoogleCalendarGateway();

    for (const correlationId of ['corr-int-gcal-1', 'corr-int-gcal-2']) {
      const syncResponse = new MockResponse();
      const handled = await handleGoogleCalendarRoutes(
        `/integrations/google-calendar/appointments/${appointment.id}/sync`,
        createJsonRequest(
          'POST',
          `/integrations/google-calendar/appointments/${appointment.id}/sync`,
          key.rawKey
        ) as never,
        syncResponse as never,
        correlationId,
        {
          scheduling,
          googleCalendarGateway: gateway,
          googleCalendarSyncs,
          googleCalendarMode: 'mock',
          googleCalendarConfigured: false,
          apiKeys,
          audit
        }
      );
      expect(handled).toBe(true);
      expect(syncResponse.statusCode).toBe(200);
    }

    const reportResponse = new MockResponse();
    await handleGoogleCalendarRoutes(
      '/integrations/google-calendar/report',
      createJsonRequest('GET', '/integrations/google-calendar/report', key.rawKey) as never,
      reportResponse as never,
      'corr-int-gcal-3',
      {
        scheduling,
        googleCalendarGateway: gateway,
        googleCalendarSyncs,
        googleCalendarMode: 'mock',
        googleCalendarConfigured: false,
        apiKeys,
        audit
      }
    );
    const report = reportResponse.bodyJson<{
      summary: { total: number; synced: number };
      items: Array<{ appointmentId: string }>;
    }>();
    expect(report.summary.total).toBe(1);
    expect(report.summary.synced).toBe(1);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.appointmentId).toBe(appointment.id);
  });

  it('tracks WhatsApp vendor delivery, inbound confirmation and report coherence end-to-end', async () => {
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
      new Response(JSON.stringify({ messages: [{ id: 'wamid.integration.123' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })) as typeof fetch;

    try {
      const runtime = createApiRuntime({
        authSecret: 'test-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        notificationsWhatsappRemindersEnabled: true
      });
      const login = await runtime.auth.login(
        { username: 'reception', password: 'seed_reception' },
        'corr-int-wa-login'
      );
      const principal = runtime.auth.authenticateAccessToken(login.accessToken);

      const appointment = await runtime.scheduling.createAppointment(principal.user.accountId, {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        scheduledAt: '2026-04-22T15:00:00.000Z',
        visitType: 'scheduled',
        reason: 'WhatsApp premium'
      });
      expect(await waitForAuditAction(runtime.audit, 'whatsapp_reminder_sent')).toBe(true);

      const inboundResponse = new MockResponse();
      const inboundHandled = await handleWhatsAppRoutes(
        '/webhooks/whatsapp/inbound',
        createJsonRequest(
          'POST',
          '/webhooks/whatsapp/inbound',
          'unused',
          {
            MessageSid: 'wamid-inbound-1',
            From: 'whatsapp:+5511999999999',
            Body: 'CONFIRMAR',
            AppointmentId: appointment.id
          },
          { 'x-webhook-secret': 'test-webhook-secret' }
        ) as never,
        inboundResponse as never,
        'corr-int-wa-inbound',
        {
          scheduling: runtime.scheduling,
          audit: runtime.audit,
          notificationsWhatsappInboundActionsEnabled: true,
          inboundWebhookSecret: 'test-webhook-secret',
          requirePrincipal: () => principal
        }
      );

      expect(inboundHandled).toBe(true);
      expect(inboundResponse.statusCode).toBe(200);
      expect(inboundResponse.bodyText()).toBe('CONFIRMADO');

      const reportResponse = new MockResponse();
      await handleWhatsAppRoutes(
        `/whatsapp/appointments/${appointment.id}/report`,
        createJsonRequest(
          'GET',
          `/whatsapp/appointments/${appointment.id}/report`,
          'unused'
        ) as never,
        reportResponse as never,
        'corr-int-wa-report',
        {
          scheduling: runtime.scheduling,
          audit: runtime.audit,
          notificationsWhatsappInboundActionsEnabled: true,
          requirePrincipal: () => principal
        }
      );

      const report = reportResponse.bodyJson<{
        deliveryStatus: string;
        vendorProvider: string | null;
        vendorMessageId: string | null;
        correlationIds: string[];
        events: Array<{ action: string }>;
      }>();

      expect(report.deliveryStatus).toBe('confirmed');
      expect(report.vendorProvider).toBe('360dialog');
      expect(report.vendorMessageId).toBe('wamid.integration.123');
      expect(report.correlationIds).toContain('corr-int-wa-report');
      expect(report.correlationIds.length).toBeGreaterThanOrEqual(2);
      expect(report.events.some((event) => event.action === 'whatsapp_reminder_sent')).toBe(true);
      expect(report.events.some((event) => event.action === 'whatsapp_confirm')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      process.env['WHATSAPP_ENABLED'] = originalEnv.enabled;
      process.env['WHATSAPP_PROVIDER'] = originalEnv.provider;
      process.env['WHATSAPP_API_KEY'] = originalEnv.apiKey;
      process.env['WHATSAPP_FROM_NUMBER'] = originalEnv.fromNumber;
    }
  });

  it('surfaces Google Calendar sync failures in the operational report', async () => {
    const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
    const key = await apiKeys.create({
      accountId: 'acc_cvg_demo' as never,
      name: 'google-calendar-failure-premium',
      permissions: ['integrations.read', 'notifications.manage'],
      createdBy: 'user_admin'
    });
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const scheduling = new SchedulingService(owners, patients);
    const appointment = await scheduling.createAppointment('acc_cvg_demo' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-04-22T16:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Fail Google premium'
    });
    const audit = new AuditService();
    const googleCalendarSyncs = new InMemoryGoogleCalendarSyncRepository();
    const gateway = new LocalGoogleCalendarGateway();

    const syncResponse = new MockResponse();
    await handleGoogleCalendarRoutes(
      `/integrations/google-calendar/appointments/${appointment.id}/sync`,
      createJsonRequest(
        'POST',
        `/integrations/google-calendar/appointments/${appointment.id}/sync`,
        key.rawKey
      ) as never,
      syncResponse as never,
      'corr-int-gcal-fail-1',
      {
        scheduling,
        googleCalendarGateway: gateway,
        googleCalendarSyncs,
        googleCalendarMode: 'mock',
        googleCalendarConfigured: false,
        apiKeys,
        audit
      }
    );

    expect(syncResponse.statusCode).toBe(202);
    expect(syncResponse.bodyJson<{ status: string; lastError: string | null }>().status).toBe(
      'failed'
    );

    const reportResponse = new MockResponse();
    await handleGoogleCalendarRoutes(
      '/integrations/google-calendar/report',
      createJsonRequest('GET', '/integrations/google-calendar/report', key.rawKey) as never,
      reportResponse as never,
      'corr-int-gcal-fail-2',
      {
        scheduling,
        googleCalendarGateway: gateway,
        googleCalendarSyncs,
        googleCalendarMode: 'mock',
        googleCalendarConfigured: false,
        apiKeys,
        audit
      }
    );

    const report = reportResponse.bodyJson<{
      summary: { total: number; failed: number };
      items: Array<{ appointmentId: string; status: string; lastError: string | null }>;
    }>();
    expect(report.summary.total).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.items[0]?.appointmentId).toBe(appointment.id);
    expect(report.items[0]?.status).toBe('failed');
    expect(report.items[0]?.lastError).toContain('Simulated Google Calendar sync failure');
  });

  it('keeps equipment bridge imports idempotent by external result id', async () => {
    const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
    const key = await apiKeys.create({
      accountId: 'acc_cvg_demo' as never,
      name: 'equipment-premium',
      permissions: ['integrations.read', 'laboratory.results.write'],
      createdBy: 'user_admin'
    });
    const owners = new OwnersService();
    const patients = new PatientsService({ owners });
    const encounters = new EncountersService({ owners, patients });
    const diagnostics = new DiagnosticsService(encounters);
    const laboratory = new LaboratoryService(diagnostics);
    const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Equipment premium'
    });
    const order = laboratory.createOrder('acc_cvg_demo' as never, {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'HEM',
      reason: 'Importacao premium'
    });
    const audit = new AuditService();
    const imports = new DurableLaboratoryResultImportRepository();

    const payload = {
      externalResultId: 'ext-premium-1',
      schemaVersion: '1',
      provider: 'equipment-bridge',
      orderId: order.id,
      equipmentId: 'equip-1',
      resultSummary: 'Hemoglobina 7.2',
      observedAt: new Date(LAB_PROVIDER_NOW_SECONDS * 1_000).toISOString()
    };

    const firstImportResponse = new MockResponse();
    await handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      createSignedLaboratoryRequest(key.rawKey, payload) as never,
      firstImportResponse as never,
      'corr-int-lab-1',
      {
        laboratoryResultImports: imports,
        apiKeys,
        audit,
        nowSeconds: () => LAB_PROVIDER_NOW_SECONDS,
        laboratoryProviderSignatureVerifier: new HmacLaboratoryProviderSignatureVerifier(
          new Map([
            [LAB_PROVIDER_KEY_ID, { accountId: 'acc_cvg_demo', secret: LAB_PROVIDER_SECRET }]
          ])
        )
      }
    );
    expect(firstImportResponse.statusCode).toBe(202);
    expect(firstImportResponse.bodyJson<{ status: string }>().status).toBe('pending_human_review');
    expect(laboratory.getOrder('acc_cvg_demo' as never, order.id).status).toBe('requested');

    const secondImportResponse = new MockResponse();
    await handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      createSignedLaboratoryRequest(key.rawKey, payload) as never,
      secondImportResponse as never,
      'corr-int-lab-2',
      {
        laboratoryResultImports: imports,
        apiKeys,
        audit,
        nowSeconds: () => LAB_PROVIDER_NOW_SECONDS,
        laboratoryProviderSignatureVerifier: new HmacLaboratoryProviderSignatureVerifier(
          new Map([
            [LAB_PROVIDER_KEY_ID, { accountId: 'acc_cvg_demo', secret: LAB_PROVIDER_SECRET }]
          ])
        )
      }
    );
    expect(secondImportResponse.statusCode).toBe(200);
    expect(secondImportResponse.bodyJson<{ externalResultId: string }>().externalResultId).toBe(
      payload.externalResultId
    );

    const reportResponse = new MockResponse();
    await handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/report',
      createJsonRequest(
        'GET',
        '/integrations/laboratory/equipment-results/report',
        key.rawKey
      ) as never,
      reportResponse as never,
      'corr-int-lab-3',
      {
        laboratoryResultImports: imports,
        apiKeys,
        audit
      }
    );
    const report = reportResponse.bodyJson<{
      summary: { total: number; pendingHumanReview: number; imported: number };
    }>();
    expect(report.summary.total).toBe(1);
    expect(report.summary.pendingHumanReview).toBe(1);
    expect(report.summary.imported).toBe(0);
  });
});
