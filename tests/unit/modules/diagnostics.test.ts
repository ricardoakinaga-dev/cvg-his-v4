import { describe, expect, it } from 'vitest';

import {
  DiagnosticsService,
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService
} from '@cvg-his-v2/module-diagnostics';

function createServices() {
  const encounters = new Map([
    [
      'encounter_1',
      {
        id: 'encounter_1',
        accountId: 'acc_test',
        patientId: 'patient_1'
      }
    ],
    [
      'encounter_2',
      {
        id: 'encounter_2',
        accountId: 'acc_test',
        patientId: 'patient_1'
      }
    ]
  ]);
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow(encounterId: string) {
        const encounter = encounters.get(encounterId);
        expect(encounter).toBeDefined();
        return encounter;
      }
    } as never
  );
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });

  return { diagnostics, laboratory, encounter: encounters.get('encounter_1')! };
}

describe('module-diagnostics / operational contract', () => {
  it('lists catalog, exposes resulted orders and keeps detail scoped by account', async () => {
    const { diagnostics, laboratory, encounter } = createServices();

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
      releasedByUserId: 'lab_1'
    });

    const [catalog, results, detail] = await Promise.all([
      Promise.resolve(laboratory.listCatalog()),
      laboratory.listResults('acc_test' as never, 'HEM'),
      Promise.resolve(laboratory.getOrder('acc_test' as never, order.id))
    ]);

    expect(catalog.some((item) => item.id === 'cat_001')).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(order.id);
    expect(detail.id).toBe(order.id);
  });

  it('rejects mismatched patient, missing collector and missing result evidence', async () => {
    const { diagnostics, encounter } = createServices();

    await expect(
      diagnostics.createOrder({
        encounterId: encounter.id,
        patientId: 'other_patient',
        examType: 'Hemograma',
        reason: 'Check-up'
      })
    ).rejects.toThrow('patientId must match the encounter patient');

    const order = await diagnostics.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Check-up'
    });

    await expect(
      diagnostics.recordResult(order.id, {
        status: 'collected'
      })
    ).rejects.toThrow('collectedByUserId');

    await diagnostics.recordResult(order.id, {
      status: 'collected',
      collectedByUserId: 'lab_1'
    });

    await expect(
      diagnostics.recordResult(order.id, {
        status: 'resulted'
      })
    ).rejects.toThrow('resultSummary or resultAttachmentId is required when status is resulted');
  });

  it('covers laboratory fallback catalogs and released-results filtering without repository wiring', async () => {
    const { diagnostics, encounter } = createServices();
    const laboratory = new LaboratoryService(diagnostics);

    const released = await diagnostics.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Bioquimico',
      reason: 'Seguimento'
    });
    await diagnostics.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Urinalise',
      reason: 'Triagem'
    });

    await diagnostics.recordResult(released.id, {
      status: 'collected',
      collectedByUserId: 'lab_2'
    });
    await diagnostics.recordResult(released.id, {
      status: 'resulted',
      resultSummary: 'Tudo normal',
      releasedByUserId: 'lab_2'
    });

    const [equipment, reportTypes, referenceValues, results] = await Promise.all([
      laboratory.listEquipment('acc_test' as never),
      laboratory.listReportTypes('acc_test' as never),
      laboratory.listReferenceValues('acc_test' as never, 'HEM'),
      laboratory.listResults('acc_test' as never)
    ]);

    expect(equipment.length).toBeGreaterThan(0);
    expect(reportTypes.length).toBeGreaterThan(0);
    expect(referenceValues.length).toBeGreaterThan(0);
    expect(referenceValues.every((item) => item.examType.toUpperCase().includes('HEM'))).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(released.id);
  });

  it('blocks cross-account order detail access and keeps proxy methods coherent', async () => {
    const { laboratory, encounter } = createServices();

    const created = await laboratory.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Citologia',
      reason: 'Controle'
    });

    const collected = await laboratory.recordResult(created.id, {
      status: 'collected',
      collectedByUserId: 'lab_3'
    });

    expect(collected.status).toBe('collected');
    expect(() => laboratory.getOrder('acc_other' as never, created.id)).toThrow(
      'Diagnostic order does not belong to the current account'
    );
  });

  it('hydrates catalog explicitly and delegates repository-backed catalog queries', async () => {
    const { diagnostics } = createServices();
    const calls: string[] = [];
    const laboratory = new LaboratoryService(diagnostics, {
      catalogRepository: {
        async ensureSeedData(accountId) {
          calls.push(`seed:${accountId}`);
        },
        async listEquipment(accountId) {
          calls.push(`equipment:${accountId}`);
          return [
            {
              id: 'eq_custom',
              name: 'Microscópio custom',
              status: 'inactive',
              integrationMode: 'manual'
            }
          ] as never;
        },
        async listReportTypes(accountId) {
          calls.push(`report:${accountId}`);
          return [{ id: 'rep_custom', name: 'Laudo custom', templateKey: 'lab.custom' }] as never;
        },
        async listReferenceValues(accountId, filterExam) {
          calls.push(`reference:${accountId}:${filterExam ?? ''}`);
          return [
            {
              id: 'ref_custom',
              examType: 'PCR',
              parameter: 'Proteína C',
              unit: 'mg/dL',
              species: 'canine',
              lowerBound: 1,
              upperBound: 5
            }
          ] as never;
        }
      }
    });

    await laboratory.hydrateCatalog('acc_test' as never);
    const [equipment, reportTypes, referenceValues] = await Promise.all([
      laboratory.listEquipment('acc_test' as never),
      laboratory.listReportTypes('acc_test' as never),
      laboratory.listReferenceValues('acc_test' as never, 'PCR')
    ]);

    expect(equipment[0]?.name).toBe('Microscópio custom');
    expect(reportTypes[0]?.name).toBe('Laudo custom');
    expect(referenceValues[0]?.examType).toBe('PCR');
    expect(calls.filter((entry) => entry === 'seed:acc_test')).toHaveLength(4);
    expect(calls).toContain('equipment:acc_test');
    expect(calls).toContain('report:acc_test');
    expect(calls).toContain('reference:acc_test:PCR');
  });

  it('filters orders by encounter and computes dashboard counts from real statuses', async () => {
    const { diagnostics, laboratory, encounter } = createServices();
    const secondEncounter = {
      id: 'encounter_2',
      accountId: 'acc_test',
      patientId: 'patient_1'
    };
    const secondOrder = await diagnostics.createOrder({
      encounterId: secondEncounter.id,
      patientId: secondEncounter.patientId,
      examType: 'Bioquímico',
      reason: 'Controle'
    });
    const collectedOrder = await diagnostics.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Urinalise',
      reason: 'Seguimento'
    });
    await diagnostics.recordResult(collectedOrder.id, {
      status: 'collected',
      collectedByUserId: 'lab_10'
    });
    await diagnostics.recordResult(secondOrder.id, {
      status: 'collected',
      collectedByUserId: 'lab_11'
    });
    await diagnostics.recordResult(secondOrder.id, {
      status: 'resulted',
      resultSummary: 'Liberado',
      releasedByUserId: 'lab_11'
    });

    const encounterOrders = await laboratory.listOrders('acc_test' as never, encounter.id);
    const dashboard = await laboratory.getDashboardSummary('acc_test' as never);

    expect(encounterOrders.every((order) => order.encounterId === encounter.id)).toBe(true);
    expect(dashboard.totalOrders).toBe(2);
    expect(dashboard.pendingResults).toBe(1);
    expect(dashboard.releasedResults).toBe(1);
  });
});
