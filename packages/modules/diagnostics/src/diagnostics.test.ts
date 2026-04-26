import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import {
  DiagnosticsService,
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService
} from './index.js';

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

test('DiagnosticsService createOrder rejects patient mismatch and unknown catalog', () => {
  const { service, encounter } = createService();

  assert.throws(
    () =>
      service.createOrder({
        encounterId: encounter.id,
        patientId: 'patient_other',
        examType: 'Hemograma',
        reason: 'Check-up'
      }),
    /patientId must match/
  );

  assert.throws(
    () =>
      service.createOrder({
        encounterId: encounter.id,
        patientId: encounter.patientId,
        examType: 'Hemograma',
        examCatalogId: 'cat_missing',
        reason: 'Check-up'
      }),
    /Unknown exam catalog entry/
  );
});

test('DiagnosticsService recordResult requires collector and clinical evidence when resulting', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  assert.throws(
    () => service.recordResult(order.id, { status: 'collected' }),
    /collectedByUserId/
  );

  service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });

  assert.throws(
    () => service.recordResult(order.id, { status: 'resulted' }),
    /resultSummary or resultAttachmentId/
  );
});

test('DiagnosticsService hydrateFromDatabase loads persisted orders by account', async () => {
  const { encounter } = createService();
  const service = new DiagnosticsService(
    {
      getOrThrow(encounterId: string) {
        assert.equal(encounterId, encounter.id);
        return encounter;
      }
    } as never,
    {
      diagnosticOrderRepository: {
        async create() {},
        async update() {},
        async findById() {
          return null;
        },
        async findAll() {
          return [
            {
              id: 'diag_repo_1' as never,
              accountId: 'acc_test' as never,
              encounterId: encounter.id as never,
              patientId: encounter.patientId as never,
              examType: 'ultrasound',
              reason: 'Persisted order',
              status: 'requested',
              createdAt: '2026-04-12T10:00:00.000Z',
              updatedAt: '2026-04-12T10:00:00.000Z'
            }
          ];
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );

  await service.hydrateFromDatabase('acc_test' as never);

  assert.equal(service.listByAccount('acc_test' as never).length, 1);
  assert.equal(service.listByAccount('acc_test' as never)[0].id, 'diag_repo_1');
});

test('LaboratoryService serves backend-first catalog and dashboard summary', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  const [reportTypes, equipment, summary] = await Promise.all([
    laboratory.listReportTypes('acc_test' as never),
    laboratory.listEquipment('acc_test' as never),
    laboratory.getDashboardSummary('acc_test' as never)
  ]);

  assert.ok(reportTypes.length >= 6);
  assert.ok(equipment.length >= 4);
  assert.equal(summary.totalOrders, 1);
  assert.ok(summary.equipmentActive >= 1);
});

test('LaboratoryService creates and updates laboratory equipment in the catalog repository', async () => {
  const { service: diagnostics } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  const created = await laboratory.createEquipment('acc_test' as never, {
    name: 'Analisador Bioquimico Teste',
    type: 'Bioquimica',
    serialNumber: 'BIO-TEST-001',
    status: 'active',
    lastCalibrationAt: '2026-04-25T00:00:00.000Z'
  });

  const updated = await laboratory.updateEquipment('acc_test' as never, created.id, {
    status: 'maintenance',
    lastCalibrationAt: '2026-04-26T00:00:00.000Z'
  });
  const detail = await laboratory.getEquipment('acc_test' as never, created.id);

  assert.equal(created.name, 'Analisador Bioquimico Teste');
  assert.equal(updated.status, 'maintenance');
  assert.equal(detail.lastCalibrationAt, '2026-04-26T00:00:00.000Z');
});

test('LaboratoryService exposes resulted orders and order detail scoped by account', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  diagnostics.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });
  diagnostics.recordResult(order.id, {
    status: 'resulted',
    resultAttachmentId: 'att_1'
  });

  const [results, detail, catalog] = await Promise.all([
    laboratory.listResults('acc_test' as never, 'HEM'),
    Promise.resolve(laboratory.getOrder('acc_test' as never, order.id)),
    Promise.resolve(laboratory.listCatalog())
  ]);

  assert.equal(results.length, 1);
  assert.equal(results[0].id, order.id);
  assert.equal(detail.id, order.id);
  assert.ok(catalog.some((item) => item.id === 'cat_001'));
});

test('LaboratoryService falls back to default catalogs when repository is not configured', async () => {
  const { service: diagnostics } = createService();
  const laboratory = new LaboratoryService(diagnostics);

  const [equipment, reportTypes, referenceValues] = await Promise.all([
    laboratory.listEquipment('acc_test' as never),
    laboratory.listReportTypes('acc_test' as never),
    laboratory.listReferenceValues('acc_test' as never, 'HEM')
  ]);

  assert.ok(equipment.length >= 1);
  assert.ok(reportTypes.length >= 1);
  assert.ok(referenceValues.length >= 1);
  assert.equal(referenceValues.every((item) => item.examType.toUpperCase().includes('HEM')), true);
});

test('LaboratoryService keeps order listing available when catalog repository is unavailable', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: {
      async ensureSeedData() {
        throw new Error('relation "laboratory_report_types" does not exist');
      },
      async listEquipment() {
        throw new Error('relation "laboratory_equipment" does not exist');
      },
      async getEquipment() {
        throw new Error('relation "laboratory_equipment" does not exist');
      },
      async createEquipment() {
        throw new Error('relation "laboratory_equipment" does not exist');
      },
      async updateEquipment() {
        throw new Error('relation "laboratory_equipment" does not exist');
      },
      async listReportTypes() {
        throw new Error('relation "laboratory_report_types" does not exist');
      },
      async listReferenceValues() {
        throw new Error('relation "laboratory_reference_values" does not exist');
      }
    }
  });

  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Backlog de coleta'
  });

  const orders = await laboratory.listOrders('acc_test' as never);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, order.id);
});

test('LaboratoryService listResults filters only released or evidenced orders', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);

  const openOrder = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Urinalise',
    reason: 'Triagem'
  });
  const releasedOrder = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Seguimento'
  });

  diagnostics.recordResult(releasedOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });
  diagnostics.recordResult(releasedOrder.id, {
    status: 'resulted',
    resultSummary: 'Tudo normal'
  });

  const results = await laboratory.listResults('acc_test' as never);

  assert.equal(results.some((item) => item.id === releasedOrder.id), true);
  assert.equal(results.some((item) => item.id === openOrder.id), false);
});

test('LaboratoryService getOrder blocks access to another account and proxy methods stay coherent', () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);

  const created = laboratory.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Citologia',
    reason: 'Controle'
  });
  const collected = laboratory.recordResult(created.id, {
    status: 'collected',
    collectedByUserId: 'lab_2'
  });

  assert.equal(collected.status, 'collected');
  assert.throws(
    () => laboratory.getOrder('acc_other' as never, created.id),
    /does not belong to the current account/
  );
});
