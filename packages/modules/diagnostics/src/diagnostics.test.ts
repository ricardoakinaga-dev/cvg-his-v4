import assert from 'node:assert/strict';
import { test } from 'vitest';

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

test('DiagnosticsService createOrder creates requested diagnostic order', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Suspeita de fratura'
  });

  assert.equal(order.encounterId, encounter.id);
  assert.equal(order.status, 'requested');
  assert.equal(service.list(encounter.id).length, 1);
});

test('DiagnosticsService recordResult updates status and summary', async () => {
  const { service, encounter } = createService();
  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'blood_panel',
    reason: 'Check-up'
  });

  const collected = await service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'enf_joao'
  });
  assert.equal(collected.status, 'collected');

  const updated = await service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Hemograma sem alteracoes',
    releasedByUserId: 'vet_ana'
  });

  assert.equal(updated.status, 'resulted');
  assert.equal(updated.resultSummary, 'Hemograma sem alteracoes');
  assert.equal(updated.releasedByUserId, 'vet_ana');
  assert.equal(updated.signedByUserId, 'vet_ana');
  assert.ok(updated.resultedAt);
  assert.ok(updated.signatureHash);
});

test('DiagnosticsService getOrThrow rejects unknown order', () => {
  const { service } = createService();

  assert.throws(() => service.getOrThrow('diag_missing' as never), NotFoundError);
});

test('DiagnosticsService list filters by encounter', async () => {
  const { service, encounter } = createService();
  await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'ultrasound',
    reason: 'Abdome'
  });

  assert.equal(service.list().length, 1);
  assert.equal(service.list(encounter.id).length, 1);
});

test('DiagnosticsService recordResult follows valid lifecycle', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'blood_panel',
    reason: 'Check-up'
  });

  const collected = await service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'enf_joao'
  });
  assert.equal(collected.status, 'collected');
  assert.equal(collected.collectedByUserId, 'enf_joao');
  assert.ok(collected.collectedAt);

  const resulted = await service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Valores dentro da normalidade',
    releasedByUserId: 'vet_ana',
    signedByUserId: 'rt_laboratorio'
  });
  assert.equal(resulted.status, 'resulted');
  assert.equal(resulted.resultSummary, 'Valores dentro da normalidade');
  assert.equal(resulted.releasedByUserId, 'vet_ana');
  assert.equal(resulted.signedByUserId, 'rt_laboratorio');
  assert.ok(resulted.signatureHash);
});

test('DiagnosticsService recordResult blocks invalid transitions', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Tosse'
  });

  await service.recordResult(order.id, { status: 'collected', collectedByUserId: 'enf_joao' });
  await service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Sem alteracoes',
    releasedByUserId: 'vet_ana'
  });

  await assert.rejects(
    () => service.recordResult(order.id, { status: 'requested' } as never),
    /Invalid status transition/
  );
});

test('DiagnosticsService recordResult allows cancellation', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'xray',
    reason: 'Tosse'
  });

  const cancelled = await service.recordResult(order.id, { status: 'cancelled' });
  assert.equal(cancelled.status, 'cancelled');
});

test('DiagnosticsService listCatalog returns default catalog', () => {
  const { service } = createService();

  const catalog = service.listCatalog();
  assert.ok(catalog.length >= 6);
  assert.equal(catalog[0].code, 'HEM');
});

test('DiagnosticsService createOrder links catalog entry', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
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

test('DiagnosticsService createOrder rejects patient mismatch and unknown catalog', async () => {
  const { service, encounter } = createService();

  await assert.rejects(
    () =>
      service.createOrder({
        encounterId: encounter.id,
        patientId: 'patient_other',
        examType: 'Hemograma',
        reason: 'Check-up'
      }),
    /patientId must match/
  );

  await assert.rejects(
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

test('DiagnosticsService rejects cross-account order creation before persistence', async () => {
  const { service, encounter } = createService();

  await assert.rejects(
    () =>
      service.createOrder(
        {
          encounterId: encounter.id,
          patientId: encounter.patientId,
          examType: 'Hemograma',
          reason: 'Tentativa entre contas'
        },
        'acc_other' as never
      ),
    NotFoundError
  );
  assert.equal(service.list().length, 0);
});

test('DiagnosticsService rejects cross-account result mutation without changing state', async () => {
  const { service, encounter } = createService();
  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Isolamento por conta'
  });

  await assert.rejects(
    () =>
      service.recordResult(
        order.id,
        { status: 'collected', collectedByUserId: 'lab_other' },
        'acc_other' as never
      ),
    NotFoundError
  );
  assert.equal(service.getOrThrow(order.id).status, 'requested');
});

test('DiagnosticsService recordResult requires collector and clinical evidence when resulting', async () => {
  const { service, encounter } = createService();

  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  await assert.rejects(
    () => service.recordResult(order.id, { status: 'collected' }),
    /collectedByUserId/
  );

  await service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });

  await assert.rejects(
    () => service.recordResult(order.id, { status: 'resulted' }),
    /resultSummary or resultAttachmentId/
  );

  await assert.rejects(
    () =>
      service.recordResult(order.id, {
        status: 'resulted',
        resultSummary: 'Sem alteracoes'
      }),
    /releasedByUserId/
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

test('DiagnosticsService createOrder propagates repository failure without publishing the order', async () => {
  const { encounter } = createService();
  let createAttempts = 0;
  const service = new DiagnosticsService(
    {
      getOrThrow() {
        return encounter;
      }
    } as never,
    {
      diagnosticOrderRepository: {
        async create() {
          createAttempts += 1;
          if (createAttempts === 1) {
            throw new Error('diagnostic order create failed');
          }
        },
        async update() {},
        async findById() {
          return null;
        },
        async findAll() {
          return [];
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );

  await assert.rejects(async () => {
    await service.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Hemograma',
      reason: 'Persistencia obrigatoria'
    });
  }, /diagnostic order create failed/);
  assert.equal(service.listByAccount('acc_test' as never).length, 0);

  const persisted = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Fila deve se recuperar'
  });

  assert.equal(createAttempts, 2);
  assert.equal(service.listByAccount('acc_test' as never)[0].id, persisted.id);
});

test('DiagnosticsService recordResult propagates update failure and preserves prior state', async () => {
  const { encounter } = createService();
  const service = new DiagnosticsService(
    {
      getOrThrow() {
        return encounter;
      }
    } as never,
    {
      diagnosticOrderRepository: {
        async create() {},
        async update() {
          throw new Error('diagnostic order update failed');
        },
        async findById() {
          return null;
        },
        async findAll() {
          return [];
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );
  const order = await service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Estado anterior deve ser preservado'
  });

  await assert.rejects(async () => {
    await service.recordResult(order.id, {
      status: 'collected',
      collectedByUserId: 'lab_1'
    });
  }, /diagnostic order update failed/);

  const unchanged = service.getOrThrow(order.id);
  assert.equal(unchanged.status, 'requested');
  assert.equal(unchanged.collectedAt, undefined);
  assert.equal(unchanged.collectedByUserId, undefined);
});

test('LaboratoryService serves backend-first catalog and dashboard summary', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  await diagnostics.createOrder({
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

test('LaboratoryService creates and updates laboratory report types in the catalog repository', async () => {
  const { service: diagnostics } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  const created = await laboratory.createReportType('acc_test' as never, {
    name: 'Citologia',
    code: 'CITO',
    category: 'Laboratorial',
    description: 'Modelo de laudo citologico',
    active: true
  });

  const updated = await laboratory.updateReportType('acc_test' as never, created.id, {
    description: 'Modelo revisado de laudo citologico',
    active: false
  });
  const detail = await laboratory.getReportType('acc_test' as never, created.id);

  assert.equal(created.code, 'CITO');
  assert.equal(updated.active, false);
  assert.equal(detail.description, 'Modelo revisado de laudo citologico');
});

test('LaboratoryService creates and updates laboratory reference values in the catalog repository', async () => {
  const { service: diagnostics } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  const created = await laboratory.createReferenceValue('acc_test' as never, {
    parameter: 'Plaquetas',
    examType: 'HEM',
    minValue: 200,
    maxValue: 500,
    unit: 'mil/uL'
  });

  const updated = await laboratory.updateReferenceValue('acc_test' as never, created.id, {
    maxValue: 550
  });
  const detail = await laboratory.getReferenceValue('acc_test' as never, created.id);
  const hemogramValues = await laboratory.listReferenceValues('acc_test' as never, 'HEM');

  assert.equal(created.parameter, 'Plaquetas');
  assert.equal(updated.maxValue, 550);
  assert.equal(detail.unit, 'mil/uL');
  assert.ok(hemogramValues.some((item) => item.id === created.id));
});

test('LaboratoryService exposes resulted orders and order detail scoped by account', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  const order = await diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  await diagnostics.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });
  await diagnostics.recordResult(order.id, {
    status: 'resulted',
    resultAttachmentId: 'att_1',
    releasedByUserId: 'vet_ana'
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
  assert.equal(
    referenceValues.every((item) => item.examType.toUpperCase().includes('HEM')),
    true
  );
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
      async getReportType() {
        throw new Error('relation "laboratory_report_types" does not exist');
      },
      async createReportType() {
        throw new Error('relation "laboratory_report_types" does not exist');
      },
      async updateReportType() {
        throw new Error('relation "laboratory_report_types" does not exist');
      },
      async listReferenceValues() {
        throw new Error('relation "laboratory_reference_values" does not exist');
      },
      async getReferenceValue() {
        throw new Error('relation "laboratory_reference_values" does not exist');
      },
      async createReferenceValue() {
        throw new Error('relation "laboratory_reference_values" does not exist');
      },
      async updateReferenceValue() {
        throw new Error('relation "laboratory_reference_values" does not exist');
      }
    }
  });

  const order = await diagnostics.createOrder({
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

  const openOrder = await diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Urinalise',
    reason: 'Triagem'
  });
  const releasedOrder = await diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Seguimento'
  });

  await diagnostics.recordResult(releasedOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });
  await diagnostics.recordResult(releasedOrder.id, {
    status: 'resulted',
    resultSummary: 'Tudo normal',
    releasedByUserId: 'vet_ana'
  });

  const results = await laboratory.listResults('acc_test' as never);

  assert.equal(
    results.some((item) => item.id === releasedOrder.id),
    true
  );
  assert.equal(
    results.some((item) => item.id === openOrder.id),
    false
  );
});

test('LaboratoryService getOrder blocks access to another account and proxy methods stay coherent', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);

  const created = await laboratory.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Citologia',
    reason: 'Controle'
  });
  const collected = await laboratory.recordResult(created.id, {
    status: 'collected',
    collectedByUserId: 'lab_2'
  });

  assert.equal(collected.status, 'collected');
  assert.throws(
    () => laboratory.getOrder('acc_other' as never, created.id),
    /does not belong to the current account/
  );
});
