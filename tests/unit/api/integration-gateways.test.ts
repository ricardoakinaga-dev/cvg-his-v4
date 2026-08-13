import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import {
  IntegrationConfigurationError,
  createIntegrationGateways
} from '../../../apps/api/src/integration-gateways.js';
import { GoogleCalendarGatewayAdapter, LocalGoogleCalendarGateway } from '../../../apps/api/src/google-calendar-gateway.js';
import { LocalSmsGateway, TwilioSmsGatewayAdapter } from '../../../apps/api/src/sms-gateway.js';
import { InMemorySmsDeliveryRepository } from '../../../apps/api/src/sms-delivery-repository.js';

const baseOptions = {
  environment: 'test',
  emailFrom: 'clinic@example.com',
  smsFrom: 'CVGHIS'
} as const;

function appointment(overrides: Partial<SchedulingAppointmentSummary> = {}): SchedulingAppointmentSummary {
  return {
    id: 'appointment-1' as never,
    accountId: 'account-1' as never,
    patientId: 'patient-1' as never,
    ownerId: 'owner-1' as never,
    scheduledAt: '2026-08-12T14:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Consulta clínica',
    status: 'scheduled',
    createdAt: '2026-08-11T10:00:00.000Z',
    updatedAt: '2026-08-11T10:00:00.000Z',
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('integration gateway composition', () => {
  it('requires explicit mock modes for local providers', () => {
    const integrations = createIntegrationGateways({
      ...baseOptions,
      pixMockMode: true,
      emailMockMode: true,
      smsMockMode: true,
      googleCalendarMockMode: true
    });

    expect(integrations.paymentProvider).toBe('local-pix');
    expect(integrations.emailProvider).toBe('local-email');
    expect(integrations.smsProvider).toBe('local-sms');
    expect(integrations.googleCalendarProvider).toBe('local-google-calendar');
    expect(integrations.googleCalendarConfigured).toBe(false);
  });

  it('rejects incomplete production configuration and production mocks', () => {
    expect(() => createIntegrationGateways({ ...baseOptions, environment: 'production' }))
      .toThrow(IntegrationConfigurationError);

    expect(() => createIntegrationGateways({
      ...baseOptions,
      environment: 'staging',
      pixMockMode: true,
      emailMockMode: true,
      smsMockMode: true,
      googleCalendarMockMode: true
    })).toThrow(/production-like/);
  });

  it('selects real adapters when all provider credentials are present', () => {
    const integrations = createIntegrationGateways({
      environment: 'production',
      pagarmeApiKey: 'pagarme-key',
      pagarmePixKey: 'pix-key',
      resendApiKey: 'resend-key',
      smsApiKey: 'twilio-key',
      googleCalendarAccessToken: 'calendar-token',
      googleCalendarCalendarId: 'calendar-id'
    });

    expect(integrations.paymentProvider).toBe('pagarme');
    expect(integrations.emailProvider).toBe('resend');
    expect(integrations.smsProvider).toBe('twilio');
    expect(integrations.googleCalendarProvider).toBe('google-calendar');
    expect(integrations.googleCalendarConfigured).toBe(true);
  });
});

describe('Twilio SMS adapter', () => {
  it('maps success, provider errors and network errors', async () => {
    const gateway = new TwilioSmsGatewayAdapter({ apiKey: 'twilio-key', from: 'CVGHIS' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ sid: 'SM123' }, { status: 201 })
    ));
    await expect(gateway.send({ to: '+5511999999999', text: 'Consulta' })).resolves.toMatchObject({
      provider: 'twilio',
      status: 'sent',
      providerMessageId: 'SM123'
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 })));
    await expect(gateway.send({ to: '+5511999999999', text: 'Consulta' })).resolves.toMatchObject({
      provider: 'twilio',
      status: 'failed',
      failureReason: 'Twilio send failed with status 429'
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(gateway.send({ to: '+5511999999999', text: 'Consulta' })).resolves.toMatchObject({
      provider: 'twilio',
      status: 'failed',
      failureReason: 'network down'
    });
  });

  it('keeps deterministic local success and failure behavior', async () => {
    const gateway = new LocalSmsGateway();

    await expect(gateway.send({ to: '+5511999999999', text: 'Consulta' })).resolves.toMatchObject({
      provider: 'local-sms',
      status: 'sent'
    });
    await expect(gateway.send({ to: '+55000000000', text: 'Consulta' })).resolves.toMatchObject({
      provider: 'local-sms',
      status: 'failed',
      failureReason: 'Simulated local SMS failure'
    });
  });
});

describe('Google Calendar adapters', () => {
  it('maps local success, cancellation and failure', async () => {
    const gateway = new LocalGoogleCalendarGateway();

    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'synced'
    });
    await expect(gateway.syncAppointment(appointment({ status: 'cancelled' }))).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'cancelled'
    });
    await expect(gateway.syncAppointment(appointment({ reason: 'fail sync' }))).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'failed',
      failureReason: 'Simulated Google Calendar sync failure'
    });
  });

  it('maps remote success, cancellation and failures', async () => {
    const gateway = new GoogleCalendarGatewayAdapter({
      accessToken: 'calendar-token',
      calendarId: 'calendar-id'
    });

    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 'google-event-1' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'synced',
      externalEventId: 'google-event-1'
    });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/calendar/v3/calendars/calendar-id/events'), expect.objectContaining({ method: 'POST' }));

    fetchMock.mockResolvedValue(Response.json({}, { status: 200 }));
    await expect(gateway.syncAppointment(appointment({ status: 'cancelled' }))).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'cancelled',
      externalEventId: 'appt-appointment-1'
    });

    fetchMock.mockResolvedValue(new Response('provider error', { status: 503 }));
    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'failed',
      failureReason: 'Google Calendar sync failed with status 503'
    });

    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'failed',
      failureReason: 'network down'
    });
  });
});

describe('SMS delivery repository', () => {
  it('clones records, supports account filters and reports missing messages', async () => {
    const repository = new InMemorySmsDeliveryRepository();
    const record = {
      messageId: 'message-1',
      accountId: 'account-1',
      provider: 'twilio' as const,
      to: '+5511999999999',
      text: 'Consulta confirmada',
      status: 'queued' as const,
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z',
      retryCount: 0,
      maxRetries: 3
    };

    await repository.create(record);
    expect(await repository.findByMessageId('missing')).toBeNull();
    const stored = await repository.findByMessageId('message-1');
    expect(stored).toEqual(record);
    expect(stored).not.toBe(record);

    await repository.update({ ...record, status: 'sent', updatedAt: undefined } as never);
    expect((await repository.findByMessageId('message-1'))?.status).toBe('sent');
    expect(await repository.list()).toHaveLength(1);
    expect(await repository.list('account-1')).toHaveLength(1);
    expect(await repository.list('account-2')).toHaveLength(0);
  });
});
