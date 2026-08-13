import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IntegrationConfigurationError,
  createIntegrationGateways
} from './integration-gateways.js';
import { TwilioSmsGatewayAdapter } from './sms-gateway.js';
import { GoogleCalendarGatewayAdapter } from './google-calendar-gateway.js';

const baseOptions = {
  environment: 'test',
  emailFrom: 'clinic@example.com',
  smsFrom: 'CVGHIS'
} as const;

test('creates local adapters only when every mock mode is explicit', () => {
  const integrations = createIntegrationGateways({
    ...baseOptions,
    pixMockMode: true,
    emailMockMode: true,
    smsMockMode: true,
    googleCalendarMockMode: true
  });

  assert.equal(integrations.paymentGateway.paymentProviders.pix, 'local-pix');
  assert.equal(integrations.emailGateway.providerName, 'local-email');
  assert.equal(integrations.smsGateway.providerName, 'local-sms');
  assert.equal(integrations.googleCalendarGateway.providerName, 'local-google-calendar');
});

test('rejects missing production provider credentials instead of falling back locally', () => {
  assert.throws(
    () => createIntegrationGateways({ ...baseOptions, environment: 'production' }),
    (error: unknown) =>
      error instanceof IntegrationConfigurationError
      && error.message.includes('PAGARME_API_KEY')
      && error.message.includes('RESEND_API_KEY')
      && error.message.includes('SMS_API_KEY')
      && error.message.includes('GOOGLE_CALENDAR_ACCESS_TOKEN')
  );
});

test('rejects explicitly requested local adapters in production-like environments', () => {
  assert.throws(
    () => createIntegrationGateways({
      ...baseOptions,
      environment: 'staging',
      pixMockMode: true,
      emailMockMode: true,
      smsMockMode: true,
      googleCalendarMockMode: true
    }),
    (error: unknown) =>
      error instanceof IntegrationConfigurationError
      && error.message.includes('mock')
      && error.message.includes('production-like')
  );
});

test('creates real adapters when all production credentials are present', () => {
  const integrations = createIntegrationGateways({
    ...baseOptions,
    environment: 'production',
    pagarmeApiKey: 'pagarme-test-key',
    pagarmePixKey: 'pix-key',
    resendApiKey: 'resend-test-key',
    smsApiKey: 'twilio-test-key',
    googleCalendarAccessToken: 'google-token',
    googleCalendarCalendarId: 'calendar-id'
  });

  assert.equal(integrations.paymentGateway.paymentProviders.pix, 'pagarme');
  assert.equal(integrations.emailGateway.providerName, 'resend');
  assert.equal(integrations.smsGateway.providerName, 'twilio');
  assert.equal(integrations.googleCalendarGateway.providerName, 'google-calendar');
});

test('Twilio adapter sends a provider request and maps its message id', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return Response.json({ sid: 'SM123' }, { status: 201 });
  }) as typeof fetch;

  try {
    const result = await new TwilioSmsGatewayAdapter({
      apiKey: 'twilio-key',
      from: 'CVGHIS'
    }).send({ to: '+5511999999999', text: 'Consulta confirmada' });

    assert.equal(result.provider, 'twilio');
    assert.equal(result.status, 'sent');
    assert.equal(result.providerMessageId, 'SM123');
    assert.deepEqual(calls, ['https://api.twilio.com/2010-04-01/Accounts/messages.json']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Google Calendar adapter maps a successful provider event', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return Response.json({ id: 'google-event-1' }, { status: 200 });
  }) as typeof fetch;

  try {
    const result = await new GoogleCalendarGatewayAdapter({
      accessToken: 'calendar-token',
      calendarId: 'clinic-calendar'
    }).syncAppointment({
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
      updatedAt: '2026-08-11T10:00:00.000Z'
    });

    assert.equal(result.provider, 'google-calendar');
    assert.equal(result.status, 'synced');
    assert.equal(result.externalEventId, 'google-event-1');
    assert.equal(calls.length, 1);
    assert.match(calls[0] ?? '', /googleapis\.com\/calendar/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
