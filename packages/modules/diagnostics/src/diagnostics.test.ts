import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { DiagnosticsService } from './index.js';

function createService() {
  const encounter = {
    id: 'encounter_1',
    accountId: 'acc_test',
    patientId: 'patient_1'
  };
  const encounters = {
    getOrThrow(encounterId: string) {
      assert.equal(encounterId, encounter.id);
      return encounter;
    }
  };
  const service = new DiagnosticsService(encounters as never);

  return { service, encounter };
}

test('DiagnosticsService createOrder creates requested diagnostic order', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Suspeita de fratura'
  });

  assert.equal(order.encounterId, encounter.id);
  assert.equal(order.status, 'requested');
  assert.equal(service.list(encounter.id).length, 1);
});

test('DiagnosticsService recordResult updates status and summary', () => {
  const { service, encounter } = createService();
  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'blood_panel',
    reason: 'Check-up'
  });

  const collected = service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'enf_joao'
  });
  assert.equal(collected.status, 'collected');

  const updated = service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Hemograma sem alteracoes'
  });

  assert.equal(updated.status, 'resulted');
  assert.equal(updated.resultSummary, 'Hemograma sem alteracoes');
});

test('DiagnosticsService getOrThrow rejects unknown order', () => {
  const { service } = createService();

  assert.throws(() => service.getOrThrow('diag_missing' as never), NotFoundError);
});

test('DiagnosticsService list filters by encounter', () => {
  const { service, encounter } = createService();
  service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'ultrasound',
    reason: 'Abdome'
  });

  assert.equal(service.list().length, 1);
  assert.equal(service.list(encounter.id).length, 1);
});

test('DiagnosticsService recordResult follows valid lifecycle', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'blood_panel',
    reason: 'Check-up'
  });

  const collected = service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'enf_joao'
  });
  assert.equal(collected.status, 'collected');
  assert.equal(collected.collectedByUserId, 'enf_joao');
  assert.ok(collected.collectedAt);

  const resulted = service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Valores dentro da normalidade'
  });
  assert.equal(resulted.status, 'resulted');
  assert.equal(resulted.resultSummary, 'Valores dentro da normalidade');
});

test('DiagnosticsService recordResult blocks invalid transitions', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Tosse'
  });

  service.recordResult(order.id, { status: 'collected', collectedByUserId: 'enf_joao' });
  service.recordResult(order.id, { status: 'resulted', resultSummary: 'Sem alteracoes' });

  assert.throws(
    () => service.recordResult(order.id, { status: 'requested' } as never),
    /Invalid status transition/
  );
});

test('DiagnosticsService recordResult allows cancellation', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Tosse'
  });

  const cancelled = service.recordResult(order.id, { status: 'cancelled' });
  assert.equal(cancelled.status, 'cancelled');
});

test('DiagnosticsService listCatalog returns default catalog', () => {
  const { service } = createService();

  const catalog = service.listCatalog();
  assert.ok(catalog.length >= 6);
  assert.equal(catalog[0].code, 'HEM');
});

test('DiagnosticsService createOrder links catalog entry', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  assert.equal(order.examCatalogId, 'cat_001');
  const catalogEntry = service.getCatalogEntry('cat_001');
  assert.equal(catalogEntry?.name, 'Hemograma');
});
