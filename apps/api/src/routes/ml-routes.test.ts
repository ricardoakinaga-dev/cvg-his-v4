import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AuditService } from '@cvg-his-v2/module-audit';
import { DiagnosticsService, LaboratoryService } from '@cvg-his-v2/module-diagnostics';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { DemandForecastingService, LabAnomalyDetectionService, OcrFiscalService } from '@cvg-his-v2/module-ml';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleMlRoutes } from './ml-routes.js';

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

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user_admin' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session_1' as never,
      userId: 'user_admin' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['fiscal.read', 'scheduling.read', 'diagnostics.read'],
      capabilities: []
    }
  };
}

function createRequest(method: string, url: string, body?: Record<string, unknown>) {
  if (!body) return { method, url } as never;
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

test('handleMlRoutes exposes OCR, demand forecasting and lab anomalies', async () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const scheduling = new SchedulingService(owners, patients);
  await scheduling.createAppointment('acc_cvg_demo' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-20T09:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta'
  });

  const encounters = new EncountersService({ owners, patients });
  const diagnostics = new DiagnosticsService(encounters);
  const laboratory = new LaboratoryService(diagnostics);
  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Anomaly scan'
  });
  const order = laboratory.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'HEM',
    reason: 'Monitoramento'
  });
  laboratory.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_user'
  });
  laboratory.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Leucocitos: 30'
  });

  const handlers = {
    scheduling,
    laboratory,
    ocrFiscal: new OcrFiscalService(),
    demandForecasting: new DemandForecastingService(),
    labAnomalyDetection: new LabAnomalyDetectionService(),
    audit: new AuditService(),
    requirePrincipal: () => principal()
  };

  const ocrResponse = new MockResponse();
  await handleMlRoutes(
    '/ml/ocr/fiscal-preview',
    createRequest('POST', '/ml/ocr/fiscal-preview', {
      rawText: 'NFS-e Numero: 12345 Valor Total: R$ 150,00 CNPJ Prestador: 12.345.678/0001-90'
    }),
    ocrResponse as never,
    'corr-ml-1',
    handlers
  );
  assert.equal(ocrResponse.statusCode, 200);
  const ocrPayload = ocrResponse.bodyJson<{ detectedType: string; totalAmount: number }>();
  assert.equal(ocrPayload.detectedType, 'nfse');
  assert.equal(ocrPayload.totalAmount, 150);

  const forecastResponse = new MockResponse();
  await handleMlRoutes(
    '/ml/forecasting/demand',
    createRequest('GET', '/ml/forecasting/demand?horizonDays=5'),
    forecastResponse as never,
    'corr-ml-2',
    handlers
  );
  const forecast = forecastResponse.bodyJson<{ days: Array<{ predictedAppointments: number }> }>();
  assert.equal(forecast.days.length, 5);
  assert.ok(forecast.days[0]?.predictedAppointments >= 1);

  const anomalyResponse = new MockResponse();
  await handleMlRoutes(
    '/ml/anomalies/laboratory-results',
    createRequest('GET', '/ml/anomalies/laboratory-results?examType=HEM'),
    anomalyResponse as never,
    'corr-ml-3',
    handlers
  );
  const anomalies = anomalyResponse.bodyJson<{ flaggedOrders: number; flags: Array<{ severity: string }> }>();
  assert.equal(anomalies.flaggedOrders, 1);
  assert.equal(anomalies.flags[0]?.severity, 'critical');
});

test('handleMlRoutes validates demand forecasting query params against API contract', async () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const scheduling = new SchedulingService(owners, patients);
  const encounters = new EncountersService({ owners, patients });
  const diagnostics = new DiagnosticsService(encounters);
  const laboratory = new LaboratoryService(diagnostics);

  const handlers = {
    scheduling,
    laboratory,
    ocrFiscal: new OcrFiscalService(),
    demandForecasting: new DemandForecastingService(),
    labAnomalyDetection: new LabAnomalyDetectionService(),
    audit: new AuditService(),
    requirePrincipal: () => principal()
  };

  const invalidHorizonResponse = new MockResponse();
  await handleMlRoutes(
    '/ml/forecasting/demand',
    createRequest('GET', '/ml/forecasting/demand?horizonDays=abc'),
    invalidHorizonResponse as never,
    'corr-ml-invalid-1',
    handlers
  );
  assert.equal(invalidHorizonResponse.statusCode, 400);
  assert.equal(
    invalidHorizonResponse.bodyJson<{ message: string }>().message,
    'horizonDays must be an integer between 3 and 30'
  );

  const invalidDateResponse = new MockResponse();
  await handleMlRoutes(
    '/ml/forecasting/demand',
    createRequest('GET', '/ml/forecasting/demand?horizonDays=7&referenceDate=not-a-date'),
    invalidDateResponse as never,
    'corr-ml-invalid-2',
    handlers
  );
  assert.equal(invalidDateResponse.statusCode, 400);
  assert.equal(
    invalidDateResponse.bodyJson<{ message: string }>().message,
    'referenceDate must be a valid ISO-8601 date-time'
  );
});
