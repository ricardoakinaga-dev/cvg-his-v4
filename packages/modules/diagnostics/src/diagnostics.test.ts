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
  const service = new DiagnosticsService(
    encounters as never,
    {
      laboratorySignerAuthority: {
        async isEnabledLaboratorySigner(_accountId: string, userId: string) {
          return userId !== 'disabled-signer';
        }
      }
    } as never
  );

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

test('DiagnosticsService durable create waits for persistence and does not publish a phantom order', async () => {
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
        async create() {
          throw new Error('diagnostic database unavailable');
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

  await assert.rejects(
    () =>
      service.createOrderAndPersist({
        encounterId: encounter.id,
        patientId: encounter.patientId,
        examType: 'xray',
        reason: 'Persistência obrigatória'
      }),
    /diagnostic database unavailable/
  );
  assert.equal(service.list(encounter.id).length, 0);
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
    resultSummary: 'Valores dentro da normalidade',
    releasedByUserId: 'vet_ana',
    signedByUserId: 'rt_laboratorio'
  });
  assert.equal(resulted.status, 'resulted');
  assert.equal(resulted.resultSummary, 'Valores dentro da normalidade');
  assert.equal(resulted.releasedByUserId, 'vet_ana');
  assert.equal(resulted.signedByUserId, 'vet_ana');
  assert.ok(resulted.signatureHash);
});

test('DiagnosticsService preserves validated structured laboratory result values', () => {
  const { service, encounter } = createService();

  const order = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Acompanhamento hepatico'
  });

  const resultValues = [
    {
      parameter: 'ALT',
      value: '92',
      unit: 'U/L',
      reference: '10-125 U/L',
      outOfRange: false
    },
    {
      parameter: 'Bilirrubina',
      value: '2.4',
      unit: 'mg/dL',
      reference: '0.1-0.8 mg/dL',
      outOfRange: true
    }
  ];

  service.recordResult(order.id, {
    status: 'collected',
    collectedByUserId: 'lab_joao'
  });
  const resulted = service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Bilirrubina acima da referencia',
    resultValues,
    releasedByUserId: 'vet_ana'
  });

  assert.deepEqual(resulted.resultValues, resultValues);
  assert.notEqual(resulted.resultValues, resultValues);
  assert.ok(Object.isFrozen(resulted.resultValues));
  assert.ok(Object.isFrozen(resulted.resultValues?.[0]));
  const invalidOrder = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Validacao de resultado'
  });
  service.recordResult(invalidOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab_joao'
  });
  assert.throws(() => {
    service.recordResult(invalidOrder.id, {
      status: 'resulted',
      resultValues: [{ parameter: 'ALT', value: '' }],
      releasedByUserId: 'vet_ana'
    });
  }, /value must contain/);
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
  service.recordResult(order.id, {
    status: 'resulted',
    resultSummary: 'Sem alteracoes',
    releasedByUserId: 'vet_ana'
  });

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

  const whitespaceOrder = service.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Resumo vazio'
  });
  service.recordResult(whitespaceOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab_1'
  });
  assert.throws(
    () => service.recordResult(whitespaceOrder.id, {
      status: 'resulted',
      resultSummary: '   ',
      releasedByUserId: 'vet_ana'
    }),
    /resultSummary or resultAttachmentId/
  );

  assert.throws(
    () =>
      service.recordResult(order.id, {
        status: 'resulted',
        resultSummary: 'Sem alteracoes'
      }),
    /releasedByUserId/
  );
});

test('LaboratoryService runs the canonical workflow through delivery with signed reporting', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);
  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Esteira completa'
  });

  const collected = await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'collected',
    collectedByUserId: 'collector-1'
  });
  assert.equal(collected.status, 'collected');
  assert.equal(collected.collectionAttempt, 1);

  const inAnalysis = await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'in_analysis',
    actorUserId: 'analyst-1'
  });
  assert.equal(inAnalysis.status, 'in_analysis');
  assert.equal(inAnalysis.analysisStartedByUserId, 'analyst-1');

  const reported = await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'reported',
    resultSummary: 'Sem alteracoes',
    actorUserId: 'rt-1',
    signedByUserId: 'attacker',
    signatureHash: 'forged'
  } as never);
  assert.equal(reported.status, 'reported');
  assert.equal(reported.reportedByUserId, 'rt-1');
  assert.equal(reported.signedByUserId, 'rt-1');
  assert.ok(reported.signatureHash);

  const delivered = await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'delivered',
    deliveredByUserId: 'user-1',
    deliveryChannel: 'portal'
  });
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.deliveredByUserId, 'user-1');
  assert.equal(delivered.deliveryChannel, 'portal');
  assert.ok(delivered.deliveredAt);
  assert.deepEqual(
    delivered.history.map((event) => event.eventType),
    ['collected', 'in_analysis', 'reported', 'delivered']
  );
});

test('LaboratoryService rejects an inactive signer even when the caller supplies only an actor id', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);
  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Assinatura sem autoridade'
  });

  await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'collected',
    collectedByUserId: 'collector-1'
  });
  await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'in_analysis',
    actorUserId: 'analyst-1'
  });

  await assert.rejects(
    () => laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
      status: 'reported',
      resultSummary: 'Resultado',
      actorUserId: 'disabled-signer'
    }),
    /active|enabled|professional|signat/i
  );
});

test('LaboratoryService replays an idempotent transition without duplicating history', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);
  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Retry de coleta'
  });

  const request = {
    status: 'collected',
    collectedByUserId: 'collector-1',
    idempotencyKey: 'lab-collect-retry-1'
  } as never;
  const first = await laboratory.transitionOrderAndPersistForAccount(
    'acc_test' as never,
    order.id,
    request
  );
  const replay = await laboratory.transitionOrderAndPersistForAccount(
    'acc_test' as never,
    order.id,
    request
  );

  assert.equal(replay.status, 'collected');
  assert.equal(replay.collectionAttempt, 1);
  assert.deepEqual(replay.history, first.history);
});

test('LaboratoryService delegates the order, workflow and history write as one persistence unit', async () => {
  let atomicCalls = 0;
  const repository = {
    async create() {},
    async update() {},
    async findById() {
      return null;
    },
    async findAll() {
      return [];
    },
    async findByEncounterId() {
      return [];
    },
    async upsertLaboratoryWorkflow() {},
    async isEnabledLaboratorySigner() {
      return true;
    },
    async persistLaboratoryTransition(input: {
      readonly order: unknown;
      readonly workflow: unknown;
    }) {
      atomicCalls += 1;
      return { order: input.order, workflow: input.workflow, replayed: false };
    }
  };
  const encounter = {
    id: 'encounter_atomic',
    accountId: 'acc_atomic',
    patientId: 'patient_atomic'
  };
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow() {
        return encounter;
      }
    } as never,
    { diagnosticOrderRepository: repository as never } as never
  );
  const laboratory = new LaboratoryService(diagnostics);
  const order = await diagnostics.createOrderAndPersistForAccount('acc_atomic' as never, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Persistencia atomica'
  });

  await laboratory.transitionOrderAndPersistForAccount('acc_atomic' as never, order.id, {
    status: 'collected',
    collectedByUserId: 'collector-atomic'
  });

  assert.equal(atomicCalls, 1);
});

test('LaboratoryService records a reasoned recollection as a new attempt and keeps history', async () => {
  const { service: diagnostics, encounter } = createService();
  const laboratory = new LaboratoryService(diagnostics);
  const order = diagnostics.createOrder({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Bioquimico',
    reason: 'Recoleta'
  });

  await laboratory.transitionOrderAndPersistForAccount('acc_test' as never, order.id, {
    status: 'collected',
    collectedByUserId: 'collector-1'
  });
  const recollected = await laboratory.recollectOrderAndPersistForAccount('acc_test' as never, order.id, {
    reason: 'Amostra hemolisada',
    collectedByUserId: 'collector-2'
  });

  assert.equal(recollected.status, 'collected');
  assert.equal(recollected.collectionAttempt, 2);
  assert.equal(recollected.recollectionReason, 'Amostra hemolisada');
  assert.equal(recollected.history.at(-1)?.eventType, 'recollected');
  assert.equal(recollected.history.at(-1)?.attempt, 2);
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
    resultSummary: 'Tudo normal',
    releasedByUserId: 'vet_ana'
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
