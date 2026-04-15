import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AuditService } from '@cvg-his-v2/module-audit';
import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import { handleWhatsAppRoutes } from './whatsapp-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
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

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.#headers.get(name.toLowerCase());
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }
}

function createRequest(payload: Record<string, unknown>) {
  return {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(payload));
    }
  } as never;
}

function createAppointment(): SchedulingAppointmentSummary {
  const now = new Date().toISOString();
  return {
    id: 'appt-1' as never,
    accountId: 'acc-1' as never,
    patientId: 'patient-1' as never,
    ownerId: 'owner-1' as never,
    scheduledAt: '2026-04-15T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta',
    status: 'scheduled',
    createdAt: now,
    updatedAt: now
  };
}

test('handleWhatsAppRoutes skips inbound mutations when feature flag is disabled', async () => {
  const response = new MockResponse();
  const audit = new AuditService();
  let getAppointmentCalls = 0;
  let checkInCalls = 0;
  let cancelCalls = 0;

  const handled = await handleWhatsAppRoutes(
    '/webhooks/whatsapp/inbound',
    createRequest({
      MessageSid: 'msg-1',
      From: 'whatsapp:+5511999999999',
      Body: 'CONFIRMAR',
      AppointmentId: 'appt-1'
    }),
    response as never,
    'corr-wa-1',
    {
      scheduling: {
        getAppointmentOrThrow: () => {
          getAppointmentCalls += 1;
          return createAppointment();
        },
        checkIn: async () => {
          checkInCalls += 1;
        },
        cancelAppointment: async () => {
          cancelCalls += 1;
        }
      } as never,
      audit,
      notificationsWhatsappInboundActionsEnabled: false
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.getHeader('content-type'), 'text/plain');
  assert.equal(response.bodyText(), 'AUTOMACAO_DESABILITADA');
  assert.equal(getAppointmentCalls, 0);
  assert.equal(checkInCalls, 0);
  assert.equal(cancelCalls, 0);
  assert.equal(
    audit.list().some((entry) => entry.action === 'inbound_action_skipped_flag_disabled'),
    true
  );
});

test('handleWhatsAppRoutes confirms appointment when inbound actions are enabled', async () => {
  const response = new MockResponse();
  const audit = new AuditService();
  let checkInCalls = 0;

  const handled = await handleWhatsAppRoutes(
    '/webhooks/whatsapp/inbound',
    createRequest({
      MessageSid: 'msg-2',
      From: 'whatsapp:+5511999999999',
      Body: 'CONFIRMAR',
      AppointmentId: 'appt-1'
    }),
    response as never,
    'corr-wa-2',
    {
      scheduling: {
        getAppointmentOrThrow: () => createAppointment(),
        checkIn: async () => {
          checkInCalls += 1;
        },
        cancelAppointment: async () => {}
      } as never,
      audit,
      notificationsWhatsappInboundActionsEnabled: true
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyText(), 'CONFIRMADO');
  assert.equal(checkInCalls, 1);
  assert.equal(audit.list().some((entry) => entry.action === 'whatsapp_confirm'), true);
});
