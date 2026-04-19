import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { AuditService } from '@cvg-his-v2/module-audit';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { SchedulingService } from '@cvg-his-v2/module-scheduling';

import { LocalGoogleCalendarGateway } from '../google-calendar-gateway.js';
import { InMemoryGoogleCalendarSyncRepository } from '../google-calendar-sync-repository.js';
import { createInMemoryRuntimeRepositories } from '../runtime-repositories.js';
import { handleGoogleCalendarRoutes } from './google-calendar-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createRequest(rawKey: string, options: { method?: string; url?: string } = {}) {
  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/integrations/google-calendar/appointments/appt_1/sync',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json'
    },
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {}
  } as never;
}

test('handleGoogleCalendarRoutes syncs appointment and exposes report', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Calendar key',
    permissions: ['integrations.read', 'notifications.manage'],
    createdBy: 'user_admin'
  });
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const scheduling = new SchedulingService(owners, patients);
  const appointment = await scheduling.createAppointment('acc_cvg_demo' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-20T09:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta sincronizada'
  });
  const audit = new AuditService();
  const googleCalendarSyncs = new InMemoryGoogleCalendarSyncRepository();

  const syncResponse = new MockResponse();
  await handleGoogleCalendarRoutes(
    `/integrations/google-calendar/appointments/${appointment.id}/sync`,
    createRequest(created.rawKey, { url: `/integrations/google-calendar/appointments/${appointment.id}/sync` }),
    syncResponse as never,
    'corr-gcal-1',
    {
      scheduling,
      googleCalendarGateway: new LocalGoogleCalendarGateway(),
      googleCalendarSyncs,
      googleCalendarMode: 'mock',
      googleCalendarConfigured: false,
      apiKeys,
      audit
    }
  );

  assert.equal(syncResponse.statusCode, 200);
  const sync = syncResponse.bodyJson<{ status: string; externalEventId: string }>();
  assert.equal(sync.status, 'synced');
  assert.ok(sync.externalEventId.startsWith('gcal_'));

  const reportResponse = new MockResponse();
  await handleGoogleCalendarRoutes(
    '/integrations/google-calendar/report',
    createRequest(created.rawKey, { method: 'GET', url: '/integrations/google-calendar/report' }),
    reportResponse as never,
    'corr-gcal-2',
    {
      scheduling,
      googleCalendarGateway: new LocalGoogleCalendarGateway(),
      googleCalendarSyncs,
      googleCalendarMode: 'mock',
      googleCalendarConfigured: false,
      apiKeys,
      audit
    }
  );

  const report = reportResponse.bodyJson<{ summary: { total: number; synced: number } }>();
  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.synced, 1);
});
