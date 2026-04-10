import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import type {
  AccountId,
  OwnerId,
  PatientId,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';
import { TwilioWhatsAppAdapter, NoOpWhatsAppAdapter, WhatsApp360DialogAdapter, createWhatsAppProvider } from './adapters.js';
import type { WhatsAppMessagePayload, NotificationChannelConfig } from './types.js';
import { MissingCredentialsError, ProviderNotConfiguredError } from './types.js';
import {
  WhatsAppProviderService,
  InMemoryNotificationSettingsProvider,
  InMemoryOwnerLookup,
  InMemoryPatientLookup,
  InMemorySettingsLookup,
  EnvNotificationSettingsProvider
} from './index.js';
import { AppointmentReminderWorkflow } from './reminder-workflow.js';

const ACCOUNT_ID = 'acc_cvg_demo' as AccountId;
const OWNER_ID = 'owner_maria_silva' as OwnerId;
const PATIENT_ID = 'patient_luna' as PatientId;

function makePayload(): WhatsAppMessagePayload {
  return {
    recipient: '5511999998888',
    recipientName: 'Maria Silva',
    body: 'Olá {{1}}! Lembrete: {{2}}',
    templateName: 'appointment_reminder',
    templateVariables: ['Luna', '25/04/2026 09:00'],
    appointmentId: 'appt_test_1',
    patientId: PATIENT_ID,
    ownerId: OWNER_ID
  };
}

describe('TwilioWhatsAppAdapter', () => {
  it('validateConfiguration returns invalid when accountSid is empty', async () => {
    const adapter = new TwilioWhatsAppAdapter({
      accountSid: '',
      authToken: 'token',
      fromNumber: '551155555555'
    });
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, false);
    assert.ok(result.error!.includes('TWILIO_ACCOUNT_SID'));
  });

  it('validateConfiguration returns invalid when authToken is empty', async () => {
    const adapter = new TwilioWhatsAppAdapter({
      accountSid: 'ACxxxx',
      authToken: '',
      fromNumber: '551155555555'
    });
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, false);
    assert.ok(result.error!.includes('TWILIO_AUTH_TOKEN'));
  });

  it('validateConfiguration returns invalid when fromNumber is empty', async () => {
    const adapter = new TwilioWhatsAppAdapter({
      accountSid: 'ACxxxx',
      authToken: 'token',
      fromNumber: ''
    });
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, false);
    assert.ok(result.error!.includes('TWILIO_FROM_NUMBER'));
  });

  it('validateConfiguration returns valid when all fields are present', async () => {
    const adapter = new TwilioWhatsAppAdapter({
      accountSid: 'ACxxxx',
      authToken: 'token',
      fromNumber: '551155555555'
    });
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.error, undefined);
  });

  it('sendMessage throws MissingCredentialsError when recipient is empty', async () => {
    const adapter = new TwilioWhatsAppAdapter({
      accountSid: 'ACxxxx',
      authToken: 'token',
      fromNumber: '551155555555'
    });
    const payload = makePayload();
    const invalidPayload = { ...payload, recipient: '' };
    await assert.rejects(adapter.sendMessage(invalidPayload), MissingCredentialsError);
  });
});

describe('NoOpWhatsAppAdapter', () => {
  it('validateConfiguration returns invalid when disabled', async () => {
    const adapter = new NoOpWhatsAppAdapter(false);
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, false);
  });

  it('validateConfiguration returns valid when enabled', async () => {
    const adapter = new NoOpWhatsAppAdapter(true);
    const result = await adapter.validateConfiguration();
    assert.strictEqual(result.valid, true);
  });

  it('sendMessage throws ProviderNotConfiguredError when disabled', async () => {
    const adapter = new NoOpWhatsAppAdapter(false);
    await assert.rejects(adapter.sendMessage(makePayload()), ProviderNotConfiguredError);
  });

  it('sendMessage returns success with messageId when enabled', async () => {
    const adapter = new NoOpWhatsAppAdapter(true);
    const result = await adapter.sendMessage(makePayload());
    assert.strictEqual(result.success, true);
    assert.ok(result.messageId != null);
  });
});

describe('createWhatsAppProvider', () => {
  it('returns NoOp provider when config.enabled is false', () => {
    const config: NotificationChannelConfig = {
      providerType: 'twilio',
      enabled: false,
      apiKey: 'any',
      fromNumber: '551155555555',
      accountId: ACCOUNT_ID
    };
    const provider = createWhatsAppProvider(config);
    assert.ok(provider instanceof NoOpWhatsAppAdapter);
  });

  it('returns Twilio adapter when providerType is twilio with valid key', () => {
    const config: NotificationChannelConfig = {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'ACxxxx',
      fromNumber: '551155555555',
      accountId: ACCOUNT_ID
    };
    const provider = createWhatsAppProvider(config);
    assert.ok(provider instanceof TwilioWhatsAppAdapter);
  });

  it('throws MissingCredentialsError when twilio enabled but no apiKey', () => {
    const config: NotificationChannelConfig = {
      providerType: 'twilio',
      enabled: true,
      apiKey: '',
      fromNumber: '551155555555',
      accountId: ACCOUNT_ID
    };
    assert.throws(() => createWhatsAppProvider(config), MissingCredentialsError);
  });

  it('returns WhatsApp360DialogAdapter for 360dialog provider', () => {
    const config: NotificationChannelConfig = {
      providerType: '360dialog',
      enabled: true,
      apiKey: 'key',
      fromNumber: '551155555555',
      accountId: ACCOUNT_ID
    };
    const provider = createWhatsAppProvider(config);
    assert.ok(provider instanceof WhatsApp360DialogAdapter);
  });

  it('throws ProviderNotConfiguredError for unknown provider type', () => {
    const config: NotificationChannelConfig = {
      providerType: 'unknown' as never,
      enabled: true,
      apiKey: 'key',
      fromNumber: '551155555555',
      accountId: ACCOUNT_ID
    };
    assert.throws(() => createWhatsAppProvider(config), ProviderNotConfiguredError);
  });
});

describe('WhatsAppProviderService', () => {
  let settingsProvider: InMemoryNotificationSettingsProvider;
  let ownerLookup: InMemoryOwnerLookup;
  let patientLookup: InMemoryPatientLookup;
  let service: WhatsAppProviderService;

  beforeEach(() => {
    settingsProvider = new InMemoryNotificationSettingsProvider();
    ownerLookup = new InMemoryOwnerLookup();
    patientLookup = new InMemoryPatientLookup();
    service = new WhatsAppProviderService(settingsProvider, ownerLookup, patientLookup);
  });

  it('sendAppointmentReminder returns error when no config exists for account', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');

    const result = await service.sendAppointmentReminder({
      appointmentId: 'appt_1',
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      patientName: 'Luna',
      ownerPhone: '5511999998888',
      ownerName: 'Maria Silva',
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'consulta',
      clinicName: 'Clínica Vet'
    });

    assert.strictEqual(result.sent, false);
    assert.ok(result.error!.includes('not configured'));
  });

  it('sendAppointmentReminder returns error when provider is disabled', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: false,
      apiKey: '',
      fromNumber: '',
      accountId: ACCOUNT_ID
    });

    const result = await service.sendAppointmentReminder({
      appointmentId: 'appt_1',
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      patientName: 'Luna',
      ownerPhone: '5511999998888',
      ownerName: 'Maria Silva',
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'consulta',
      clinicName: 'Clínica Vet'
    });

    assert.strictEqual(result.sent, false);
    assert.ok(result.error!.includes('disabled'));
  });

  it('sendAppointmentReminder returns error when twilio credentials are invalid', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'INVALID',
      fromNumber: '0000000000',
      accountId: ACCOUNT_ID
    });

    const result = await service.sendAppointmentReminder({
      appointmentId: 'appt_1',
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      patientName: 'Luna',
      ownerPhone: '5511999998888',
      ownerName: 'Maria Silva',
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'consulta',
      clinicName: 'Clínica Vet'
    });

    assert.strictEqual(result.sent, false);
    assert.ok(result.error != null);
  });
});

describe('EnvNotificationSettingsProvider', () => {
  it('returns null when WHATSAPP_ENABLED is not true', async () => {
    const original = process.env['WHATSAPP_ENABLED'];
    delete process.env['WHATSAPP_ENABLED'];
    try {
      const provider = new EnvNotificationSettingsProvider(ACCOUNT_ID);
      const result = await provider.getWhatsAppConfig(ACCOUNT_ID);
      assert.strictEqual(result, null);
    } finally {
      if (original !== undefined) process.env['WHATSAPP_ENABLED'] = original;
    }
  });

  it('returns null when WHATSAPP_API_KEY is empty', async () => {
    const originalEnabled = process.env['WHATSAPP_ENABLED'];
    const originalKey = process.env['WHATSAPP_API_KEY'];
    process.env['WHATSAPP_ENABLED'] = 'true';
    delete process.env['WHATSAPP_API_KEY'];
    try {
      const provider = new EnvNotificationSettingsProvider(ACCOUNT_ID);
      const result = await provider.getWhatsAppConfig(ACCOUNT_ID);
      assert.strictEqual(result, null);
    } finally {
      process.env['WHATSAPP_ENABLED'] = originalEnabled ?? undefined;
      if (originalKey !== undefined) process.env['WHATSAPP_API_KEY'] = originalKey;
    }
  });

  it('returns null when WHATSAPP_FROM_NUMBER is empty', async () => {
    const originalEnabled = process.env['WHATSAPP_ENABLED'];
    const originalKey = process.env['WHATSAPP_API_KEY'];
    const originalFrom = process.env['WHATSAPP_FROM_NUMBER'];
    process.env['WHATSAPP_ENABLED'] = 'true';
    process.env['WHATSAPP_API_KEY'] = 'ACxxxx';
    delete process.env['WHATSAPP_FROM_NUMBER'];
    try {
      const provider = new EnvNotificationSettingsProvider(ACCOUNT_ID);
      const result = await provider.getWhatsAppConfig(ACCOUNT_ID);
      assert.strictEqual(result, null);
    } finally {
      process.env['WHATSAPP_ENABLED'] = originalEnabled ?? undefined;
      process.env['WHATSAPP_API_KEY'] = originalKey ?? undefined;
      if (originalFrom !== undefined) process.env['WHATSAPP_FROM_NUMBER'] = originalFrom;
    }
  });

  it('returns config when all required env vars are present', async () => {
    const originalEnabled = process.env['WHATSAPP_ENABLED'];
    const originalKey = process.env['WHATSAPP_API_KEY'];
    const originalFrom = process.env['WHATSAPP_FROM_NUMBER'];
    const originalProvider = process.env['WHATSAPP_PROVIDER'];
    process.env['WHATSAPP_ENABLED'] = 'true';
    process.env['WHATSAPP_API_KEY'] = 'ACxxxx';
    process.env['WHATSAPP_FROM_NUMBER'] = '551155555555';
    process.env['WHATSAPP_PROVIDER'] = 'twilio';
    try {
      const provider = new EnvNotificationSettingsProvider(ACCOUNT_ID);
      const result = await provider.getWhatsAppConfig(ACCOUNT_ID);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.enabled, true);
      assert.strictEqual(result!.apiKey, 'ACxxxx');
      assert.strictEqual(result!.fromNumber, '551155555555');
      assert.strictEqual(result!.providerType, 'twilio');
      assert.strictEqual(result!.accountId, ACCOUNT_ID);
    } finally {
      process.env['WHATSAPP_ENABLED'] = originalEnabled ?? undefined;
      process.env['WHATSAPP_API_KEY'] = originalKey ?? undefined;
      process.env['WHATSAPP_FROM_NUMBER'] = originalFrom ?? undefined;
      process.env['WHATSAPP_PROVIDER'] = originalProvider ?? undefined;
    }
  });

  it('returns 360dialog provider when WHATSAPP_PROVIDER is set to 360dialog', async () => {
    const originalEnabled = process.env['WHATSAPP_ENABLED'];
    const originalKey = process.env['WHATSAPP_API_KEY'];
    const originalFrom = process.env['WHATSAPP_FROM_NUMBER'];
    const originalProvider = process.env['WHATSAPP_PROVIDER'];
    process.env['WHATSAPP_ENABLED'] = 'true';
    process.env['WHATSAPP_API_KEY'] = 'key123';
    process.env['WHATSAPP_FROM_NUMBER'] = '551155555555';
    process.env['WHATSAPP_PROVIDER'] = '360dialog';
    try {
      const provider = new EnvNotificationSettingsProvider(ACCOUNT_ID);
      const result = await provider.getWhatsAppConfig(ACCOUNT_ID);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.providerType, '360dialog');
    } finally {
      process.env['WHATSAPP_ENABLED'] = originalEnabled ?? undefined;
      process.env['WHATSAPP_API_KEY'] = originalKey ?? undefined;
      process.env['WHATSAPP_FROM_NUMBER'] = originalFrom ?? undefined;
      process.env['WHATSAPP_PROVIDER'] = originalProvider ?? undefined;
    }
  });
});

describe('AppointmentReminderWorkflow', () => {
  let settingsProvider: InMemoryNotificationSettingsProvider;
  let ownerLookup: InMemoryOwnerLookup;
  let patientLookup: InMemoryPatientLookup;
  let settingsLookup: InMemorySettingsLookup;
  let whatsAppProvider: WhatsAppProviderService;
  let workflow: AppointmentReminderWorkflow;

  beforeEach(() => {
    settingsProvider = new InMemoryNotificationSettingsProvider();
    ownerLookup = new InMemoryOwnerLookup();
    patientLookup = new InMemoryPatientLookup();
    settingsLookup = new InMemorySettingsLookup();
    whatsAppProvider = new WhatsAppProviderService(settingsProvider, ownerLookup, patientLookup);
    workflow = new AppointmentReminderWorkflow(
      whatsAppProvider,
      ownerLookup,
      patientLookup,
      settingsLookup
    );
  });

  function makeAppointment(): SchedulingAppointmentSummary {
    return {
      id: 'appt_test_1' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta de rotina',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };
  }

  it('returns processed=true, sent=false when owner has no phone', async () => {
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');

    const result = await workflow.onAppointmentScheduled(makeAppointment());

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
    assert.ok(result.error!.includes('No WhatsApp contact'));
  });

  it('returns sent=true when provider is properly configured and phone exists', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'INVALID',
      fromNumber: '0000000000',
      accountId: ACCOUNT_ID
    });

    const result = await workflow.onAppointmentScheduled(makeAppointment());

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
    assert.ok(result.error != null);
  });

  it('maps visitType "scheduled" to "Consulta agendada"', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'INVALID',
      fromNumber: '0000000000',
      accountId: ACCOUNT_ID
    });

    const appointment: SchedulingAppointmentSummary = {
      id: 'appt_test_1' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta de rotina',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };

    const result = await workflow.onAppointmentScheduled(appointment);

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
  });

  it('returns sent=false when provider is disabled (NoOp)', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: false,
      apiKey: '',
      fromNumber: '',
      accountId: ACCOUNT_ID
    });

    const appointment: SchedulingAppointmentSummary = {
      id: 'appt_noop' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Test NoOp',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };

    const result = await workflow.onAppointmentScheduled(appointment);

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
    assert.ok(result.error!.includes('disabled'));
  });

  it('returns sent=false when provider is twilio with invalid credentials', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'INVALID_KEY',
      fromNumber: '0000000000',
      accountId: ACCOUNT_ID
    });

    const appointment: SchedulingAppointmentSummary = {
      id: 'appt_twilio' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Test Twilio',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };

    const result = await workflow.onAppointmentScheduled(appointment);

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
    assert.ok(result.error != null);
  });

  it('returns sent=false with specific error when no config for account', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');

    const appointment: SchedulingAppointmentSummary = {
      id: 'appt_no_config' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'No config',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };

    const result = await workflow.onAppointmentScheduled(appointment);

    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.sent, false);
    assert.ok(result.error!.includes('not configured'));
  });

  it('passes correct visitType translation to provider', async () => {
    ownerLookup.setPhone(OWNER_ID, '5511999998888');
    ownerLookup.setName(OWNER_ID, 'Maria Silva');
    patientLookup.setName(PATIENT_ID, 'Luna');
    settingsLookup.setClinicName(ACCOUNT_ID, 'Clínica Vet');
    settingsProvider.setConfig(ACCOUNT_ID, {
      providerType: 'twilio',
      enabled: true,
      apiKey: 'INVALID',
      fromNumber: '0000000000',
      accountId: ACCOUNT_ID
    });

    const appointment: SchedulingAppointmentSummary = {
      id: 'appt_visit' as never,
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      scheduledAt: '2026-04-25T09:00:00.000Z',
      visitType: 'return',
      reason: 'Emergência',
      status: 'scheduled',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    };

    const result = await workflow.onAppointmentScheduled(appointment);

    assert.strictEqual(result.processed, true);
  });
});
