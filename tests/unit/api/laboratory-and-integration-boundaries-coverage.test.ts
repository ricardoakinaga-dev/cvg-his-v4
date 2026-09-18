import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  HmacLaboratoryProviderSignatureVerifier,
  LABORATORY_PROVIDER_MAX_AGE_SECONDS,
  LaboratoryProviderPayloadValidationError,
  RejectingLaboratoryProviderSignatureVerifier,
  fingerprintLaboratoryProviderPayload,
  parseLaboratoryProviderPayload,
  type LaboratoryProviderPayload
} from '../../../apps/api/src/laboratory-provider-ingress.js';
import { parseLaboratoryProviderKeyring } from '../../../apps/api/src/laboratory-provider-keyring.js';
import {
  GoogleCalendarGatewayAdapter,
  LocalGoogleCalendarGateway
} from '../../../apps/api/src/google-calendar-gateway.js';
import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const KEY_ID = 'lab-key-01';
const SECRET = Buffer.alloc(32, 0x42);
const NOW_SECONDS = 1_756_400_000;

function laboratoryPayload(overrides: Partial<LaboratoryProviderPayload> = {}): LaboratoryProviderPayload {
  return {
    schemaVersion: '1',
    provider: 'equipment-bridge',
    externalResultId: 'external-result-001',
    orderId: 'order-001',
    equipmentId: 'equipment-001',
    resultSummary: 'Hemoglobina: 7.2',
    observedAt: '2026-08-29T03:33:20.000Z',
    ...overrides
  };
}

function sign(timestamp: string, rawBody: Buffer, secret = SECRET): string {
  return `v1=${createHmac('sha256', secret)
    .update(Buffer.from(`v1.${timestamp}.`, 'ascii'))
    .update(rawBody)
    .digest('hex')}`;
}

function appointment(overrides: Partial<SchedulingAppointmentSummary> = {}): SchedulingAppointmentSummary {
  return {
    id: 'appt_1' as never,
    accountId: 'account_1' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    scheduledAt: '2026-09-16T12:00:00.000Z',
    durationMinutes: 45,
    visitType: 'scheduled',
    reason: 'Consulta de rotina',
    status: 'scheduled',
    createdAt: '2026-09-16T10:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
    ...overrides
  };
}

describe('laboratory provider payload and signature boundaries', () => {
  it('parses the exact wire contract and fingerprints semantic content', () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        resultSummary: 'Hemoglobina: 7.2',
        observedAt: '2026-08-29T03:33:20.000Z',
        equipmentId: 'equipment-001',
        externalResultId: 'external-result-001',
        provider: 'equipment-bridge',
        orderId: 'order-001',
        schemaVersion: '1'
      })
    );
    const parsed = parseLaboratoryProviderPayload(rawBody);

    expect(parsed).toEqual(laboratoryPayload());
    expect(fingerprintLaboratoryProviderPayload(parsed)).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintLaboratoryProviderPayload(parsed)).toBe(
      fingerprintLaboratoryProviderPayload(laboratoryPayload())
    );
  });

  it('accepts insignificant whitespace but rejects malformed JSON shapes', () => {
    const raw = JSON.stringify(laboratoryPayload());
    expect(parseLaboratoryProviderPayload(Buffer.from(` \n\t${raw}\r\n`))).toEqual(laboratoryPayload());

    const cases: Buffer[] = [
      Buffer.from(''),
      Buffer.from('{}'),
      Buffer.from('[]'),
      Buffer.from('{"schemaVersion":"1"'),
      Buffer.from('{"schemaVersion":1}'),
      Buffer.from('{"schemaVersion":"1","schemaVersion":"1","provider":"equipment-bridge","externalResultId":"external-result-001","orderId":"order-001","equipmentId":"equipment-001","resultSummary":"ok","observedAt":"2026-08-29T03:33:20.000Z"}'),
      Buffer.from(JSON.stringify({ ...laboratoryPayload(), unexpected: 'field' })),
      Buffer.from(JSON.stringify({ ...laboratoryPayload(), equipmentId: 42 })),
      Buffer.from(JSON.stringify({ ...laboratoryPayload(), observedAt: '2026-08-29T00:33:20Z' })),
      Buffer.from(`\u00a0${raw}`),
      Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from(raw)]),
      Buffer.from([0xc3, 0x28])
    ];

    for (const value of cases) {
      expect(() => parseLaboratoryProviderPayload(value)).toThrow(
        LaboratoryProviderPayloadValidationError
      );
    }
  });

  it('rejects invalid field lengths, whitespace, null bytes and contract versions', () => {
    const invalidValues: Array<Partial<LaboratoryProviderPayload>> = [
      { schemaVersion: '2' },
      { provider: 'other' },
      { externalResultId: 'x' },
      { orderId: 'x' },
      { equipmentId: 'x' },
      { resultSummary: '' },
      { resultSummary: 'x'.repeat(4_001) },
      { externalResultId: ' x' },
      { orderId: 'x ' },
      { equipmentId: 'x\u0000y' },
      { observedAt: '2026-02-30T03:33:20.000Z' }
    ];

    for (const overrides of invalidValues) {
      expect(() => parseLaboratoryProviderPayload(Buffer.from(JSON.stringify(laboratoryPayload(overrides))))).toThrow(
        LaboratoryProviderPayloadValidationError
      );
    }
  });

  it('verifies fresh account-bound HMAC signatures over the exact raw body', async () => {
    const verifier = new HmacLaboratoryProviderSignatureVerifier(
      new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]])
    );
    const rawBody = Buffer.from(JSON.stringify(laboratoryPayload()));
    const timestamp = String(NOW_SECONDS);

    await expect(
      verifier.verify({
        keyId: KEY_ID,
        timestamp,
        signature: sign(timestamp, rawBody),
        rawBody,
        nowSeconds: NOW_SECONDS
      })
    ).resolves.toEqual({ accountId: ACCOUNT_ID, keyId: KEY_ID, timestamp: NOW_SECONDS });

    await expect(
      verifier.verify({
        keyId: KEY_ID,
        timestamp,
        signature: sign(timestamp, Buffer.from(`${rawBody.toString('utf8')} `)),
        rawBody,
        nowSeconds: NOW_SECONDS
      })
    ).resolves.toBeNull();
    await expect(
      verifier.verify({
        keyId: KEY_ID,
        timestamp: String(NOW_SECONDS - LABORATORY_PROVIDER_MAX_AGE_SECONDS - 1),
        signature: sign(String(NOW_SECONDS - LABORATORY_PROVIDER_MAX_AGE_SECONDS - 1), rawBody),
        rawBody,
        nowSeconds: NOW_SECONDS
      })
    ).resolves.toBeNull();
    await expect(
      verifier.verify({
        keyId: 'unknown-key',
        timestamp,
        signature: sign(timestamp, rawBody),
        rawBody,
        nowSeconds: NOW_SECONDS
      })
    ).resolves.toBeNull();
  });

  it('fails closed for malformed signatures, timestamps, bodies, secrets and age configuration', async () => {
    const rawBody = Buffer.from(JSON.stringify(laboratoryPayload()));
    const verifier = new HmacLaboratoryProviderSignatureVerifier(
      new Map([
        [KEY_ID, { accountId: ACCOUNT_ID, secret: Buffer.alloc(31, 0x42) }],
        ['lab-key-02', { accountId: OTHER_ACCOUNT_ID, secret: SECRET }]
      ])
    );

    const invalidInputs = [
      { keyId: KEY_ID, timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody, nowSeconds: NOW_SECONDS },
      { keyId: 'bad key', timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody, nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: 'not-a-timestamp', signature: 'v1=not-a-digest', rawBody, nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: 'bad', rawBody, nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: 'v1=00', rawBody, nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody: 'not-buffer', nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody: Buffer.alloc(65_537), nowSeconds: NOW_SECONDS },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody, nowSeconds: Number.NaN },
      { keyId: 'lab-key-02', timestamp: String(NOW_SECONDS), signature: sign(String(NOW_SECONDS), rawBody), rawBody, nowSeconds: Number.MAX_VALUE }
    ] as const;

    for (const input of invalidInputs) {
      await expect(verifier.verify(input as never)).resolves.toBeNull();
    }

    await expect(new RejectingLaboratoryProviderSignatureVerifier().verify({
      keyId: KEY_ID,
      timestamp: String(NOW_SECONDS),
      signature: sign(String(NOW_SECONDS), rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    })).resolves.toBeNull();
  });
});

describe('laboratory provider keyring', () => {
  it('parses canonical account-bound secrets and returns immutable entries', () => {
    const secretBase64 = SECRET.toString('base64');
    const keyring = parseLaboratoryProviderKeyring(
      JSON.stringify({ [KEY_ID]: { accountId: ACCOUNT_ID, secretBase64 } })
    );
    const key = keyring.get(KEY_ID);

    expect(key).toEqual({ accountId: ACCOUNT_ID, secret: SECRET });
    expect(Object.isFrozen(key)).toBe(true);
    expect(parseLaboratoryProviderKeyring(undefined)).toEqual(new Map());
    expect(parseLaboratoryProviderKeyring('')).toEqual(new Map());
  });

  it('rejects malformed JSON, entries, UUIDs, secrets and unexpected properties', () => {
    const secretBase64 = SECRET.toString('base64');
    const malformed = [
      '{',
      '[]',
      '{}',
      JSON.stringify({ 'bad key': { accountId: ACCOUNT_ID, secretBase64 } }),
      JSON.stringify({ [KEY_ID]: [] }),
      JSON.stringify({ [KEY_ID]: { accountId: ACCOUNT_ID } }),
      JSON.stringify({ [KEY_ID]: { accountId: 'not-a-uuid', secretBase64 } }),
      JSON.stringify({ [KEY_ID]: { accountId: ACCOUNT_ID, secretBase64: 'not-base64' } }),
      JSON.stringify({ [KEY_ID]: { accountId: ACCOUNT_ID, secretBase64: Buffer.alloc(31).toString('base64') } }),
      JSON.stringify({ [KEY_ID]: { accountId: ACCOUNT_ID, secretBase64, extra: true } })
    ];

    for (const value of malformed) {
      expect(() => parseLaboratoryProviderKeyring(value)).toThrow(/LABORATORY_PROVIDER_KEYRING_JSON/);
    }
  });
});

describe('Google Calendar gateways', () => {
  it('uses a thirty-minute duration when omitted and handles non-Error transport rejection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'remote-default-duration' }), { status: 200 }))
      .mockRejectedValueOnce('transport unavailable');
    vi.stubGlobal('fetch', fetchMock);
    try {
      const gateway = new GoogleCalendarGatewayAdapter({ accessToken: 'token', calendarId: 'calendar' });
      const input = appointment({ durationMinutes: undefined });
      await expect(gateway.syncAppointment(input)).resolves.toMatchObject({
        status: 'synced',
        externalEventId: 'remote-default-duration'
      });
      const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(body.start.dateTime).toBe(input.scheduledAt);
      expect(body.end.dateTime).toBe(new Date(Date.parse(input.scheduledAt) + 30 * 60_000).toISOString());

      await expect(gateway.syncAppointment(input)).resolves.toMatchObject({
        status: 'failed',
        failureReason: 'Google Calendar request failed before response'
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('handles local synced, cancelled and simulated failure appointments', async () => {
    const gateway = new LocalGoogleCalendarGateway();

    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'synced',
      externalEventId: 'gcal_appt_1'
    });
    await expect(gateway.syncAppointment(appointment({ status: 'cancelled' }))).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'cancelled',
      externalEventId: 'gcal_appt_1'
    });
    await expect(gateway.syncAppointment(appointment({ reason: 'Failure simulation' }))).resolves.toMatchObject({
      provider: 'local-google-calendar',
      status: 'failed',
      failureReason: 'Simulated Google Calendar sync failure'
    });
  });

  it('sends create and cancellation requests with encoded calendar identifiers', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'remote-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new GoogleCalendarGatewayAdapter({
      accessToken: 'access-token',
      calendarId: 'clinic calendar/1'
    });

    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'synced',
      externalEventId: 'remote-1'
    });
    await expect(gateway.syncAppointment(appointment({ status: 'cancelled' }))).resolves.toMatchObject({
      provider: 'google-calendar',
      status: 'cancelled',
      externalEventId: 'appt-appt_1'
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('clinic%20calendar%2F1'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer access-token' })
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/events/appt-appt_1'), expect.objectContaining({
      method: 'PATCH'
    }));
    vi.unstubAllGlobals();
  });

  it('reports network, HTTP and fallback-payload failures without throwing', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new GoogleCalendarGatewayAdapter({ accessToken: 'token', calendarId: 'calendar' });

    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      status: 'failed',
      failureReason: 'network down'
    });
    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      status: 'failed',
      failureReason: 'Google Calendar sync failed with status 503'
    });
    await expect(gateway.syncAppointment(appointment())).resolves.toMatchObject({
      status: 'synced',
      externalEventId: 'appt-appt_1'
    });
    vi.unstubAllGlobals();
  });
});
