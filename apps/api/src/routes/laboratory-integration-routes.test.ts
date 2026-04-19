import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { AuditService } from '@cvg-his-v2/module-audit';
import { DiagnosticsService, LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';

import { InMemoryLaboratoryResultImportRepository } from '../laboratory-result-import-repository.js';
import { createInMemoryRuntimeRepositories } from '../runtime-repositories.js';
import { handleLaboratoryIntegrationRoutes } from './laboratory-integration-routes.js';

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

function createRequest(rawKey: string, payload: Record<string, unknown> = {}, options: { method?: string; url?: string } = {}) {
  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json'
    },
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      if (Object.keys(payload).length > 0) {
        yield Buffer.from(JSON.stringify(payload));
      }
    }
  } as never;
}

test('handleLaboratoryIntegrationRoutes imports equipment result and exposes report', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Equipment key',
    permissions: ['integrations.read', 'notifications.manage'],
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
    reason: 'Lab bridge'
  });
  const order = laboratory.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'HEM',
    reason: 'Importacao'
  });
  const audit = new AuditService();
  const laboratoryResultImports = new InMemoryLaboratoryResultImportRepository();

  const importResponse = new MockResponse();
  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/imports',
    createRequest(created.rawKey, {
      externalResultId: 'ext_1',
      orderId: order.id,
      equipmentId: 'equip_1',
      resultSummary: 'Hemoglobina: 7.2'
    }),
    importResponse as never,
    'corr-lab-1',
    {
      laboratory,
      laboratoryResultImports,
      apiKeys,
      audit
    }
  );

  assert.equal(importResponse.statusCode, 201);
  const imported = importResponse.bodyJson<{ status: string; orderId: string }>();
  assert.equal(imported.status, 'imported');
  assert.equal(imported.orderId, order.id);

  const reportResponse = new MockResponse();
  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/report',
    createRequest(created.rawKey, {}, { method: 'GET', url: '/integrations/laboratory/equipment-results/report' }),
    reportResponse as never,
    'corr-lab-2',
    {
      laboratory,
      laboratoryResultImports,
      apiKeys,
      audit
    }
  );

  const report = reportResponse.bodyJson<{ summary: { total: number; imported: number } }>();
  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.imported, 1);
});
