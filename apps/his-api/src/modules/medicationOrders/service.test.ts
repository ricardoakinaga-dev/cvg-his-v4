import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { MedicationOrdersRepo } from './repo.js';
import type { MedicationOrderRecord } from './types.js';
import { createMedicationOrdersService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function makeOrder(overrides: Partial<MedicationOrderRecord> = {}): MedicationOrderRecord {
  return {
    id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    encounterId: null,
    stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
    patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
    medicationName: 'ceftriaxona',
    doseValue: '25',
    doseUnit: 'mg/kg',
    route: 'IV',
    frequencyType: 'q12h',
    prescriptionText: null,
    durationValue: 3,
    durationUnit: 'days',
    startAt: new Date('2026-02-18T08:00:00.000Z'),
    endAt: null,
    status: 'active',
    stopReason: null,
    createdByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
    stoppedByUserId: null,
    createdAt: new Date('2026-02-18T08:00:00.000Z'),
    updatedAt: new Date('2026-02-18T08:00:00.000Z'),
    ...overrides
  };
}

function createRepoMock(): MedicationOrdersRepo {
  return {
    findPatientInAccount: vi.fn(async () => null),
    findStayInAccount: vi.fn(async () => null),
    findEncounterInAccount: vi.fn(async () => null),
    create: vi.fn(async () => makeOrder()),
    findById: vi.fn(async () => null),
    updateById: vi.fn(async () => null),
    stopById: vi.fn(async () => null),
    list: vi.fn(async () => ({
      data: [],
      page: 1,
      pageSize: 20,
      total: 0
    }))
  };
}

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
    actor: {
      accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
      userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
      role: 'vet',
      roles: ['vet'],
      permissions: []
    },
    ...overrides
  };
}

describe('medication orders service', () => {
  let repo: MedicationOrdersRepo;
  let appendAudit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = createRepoMock();
    appendAudit = vi.fn(async () => undefined);
  });

  it('cria order e registra auditoria', async () => {
    const created = makeOrder();
    vi.mocked(repo.findPatientInAccount).mockResolvedValue({ id: created.patientId });
    vi.mocked(repo.findStayInAccount).mockResolvedValue({ id: created.stayId!, patientId: created.patientId });
    vi.mocked(repo.create).mockResolvedValue(created);

    const service = createMedicationOrdersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.create({
      patientId: created.patientId,
      stayId: created.stayId!,
      medicationName: 'ceftriaxona',
      doseValue: 25,
      doseUnit: 'mg/kg',
      route: 'IV',
      frequencyType: 'q12h',
      startAt: '2026-02-18T08:00:00Z'
    });

    expect(result.kind).toBe('created');
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MedicationOrderCreated',
        entityType: 'medication_order'
      })
    );
  });

  it('rejeita criacao de order com 400 se paciente da internacao for diferente', async () => {
    const created = makeOrder();
    vi.mocked(repo.findPatientInAccount).mockResolvedValue({ id: created.patientId });
    vi.mocked(repo.findStayInAccount).mockResolvedValue({ id: created.stayId!, patientId: 'outro-paciente-123' });

    const service = createMedicationOrdersService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit }
    );

    const result = await service.create({
      patientId: created.patientId,
      stayId: created.stayId!,
      medicationName: 'ceftriaxona',
      doseValue: 25,
      doseUnit: 'mg/kg',
      route: 'IV',
      frequencyType: 'q12h',
      startAt: '2026-02-18T08:00:00Z'
    });

    expect(result.kind).toBe('patient_mismatch');
    if (result.kind === 'patient_mismatch') {
      expect(result.message).toBe('O paciente da internação não corresponde ao paciente selecionado.');
    }
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejeita criacao de order com 400 se paciente do atendimento for diferente', async () => {
    const created = makeOrder({ encounterId: 'encounter-123' });
    vi.mocked(repo.findPatientInAccount).mockResolvedValue({ id: created.patientId });
    // Same stay, but mismatched encounter
    vi.mocked(repo.findStayInAccount).mockResolvedValue({ id: created.stayId!, patientId: created.patientId });
    vi.mocked(repo.findEncounterInAccount).mockResolvedValue({ id: created.encounterId!, patientId: 'outro-paciente-123' });

    const service = createMedicationOrdersService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo, appendAudit }
    );

    const result = await service.create({
      patientId: created.patientId,
      stayId: created.stayId!,
      encounterId: created.encounterId!,
      medicationName: 'ceftriaxona',
      doseValue: 25,
      doseUnit: 'mg/kg',
      route: 'IV',
      frequencyType: 'q12h',
      startAt: '2026-02-18T08:00:00Z'
    });

    expect(result.kind).toBe('patient_mismatch');
    if (result.kind === 'patient_mismatch') {
      expect(result.message).toBe('O paciente do atendimento não corresponde ao paciente selecionado.');
    }
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('bloqueia update de order stopped com 409 no fluxo da rota', async () => {
    vi.mocked(repo.findById).mockResolvedValue(
      makeOrder({
        status: 'stopped',
        stopReason: 'finalizado'
      })
    );

    const service = createMedicationOrdersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.update('fdd8c156-b52d-4117-a5e1-73dd61474ef1', {
      doseValue: 20
    });

    expect(result.kind).toBe('order_stopped');
    expect(repo.updateById).not.toHaveBeenCalled();
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it('para order ativa e registra auditoria', async () => {
    const before = makeOrder({ status: 'active' });
    const after = makeOrder({
      status: 'stopped',
      stopReason: 'sem indicacao',
      stoppedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
      endAt: new Date('2026-02-18T10:00:00.000Z')
    });

    vi.mocked(repo.findById).mockResolvedValue(before);
    vi.mocked(repo.stopById).mockResolvedValue(after);

    const service = createMedicationOrdersService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      {
        repo,
        appendAudit
      }
    );

    const result = await service.stop('fdd8c156-b52d-4117-a5e1-73dd61474ef1', {
      stopReason: 'sem indicacao'
    });

    expect(result.kind).toBe('stopped');
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MedicationOrderStopped',
        entityType: 'medication_order',
        reason: 'sem indicacao'
      })
    );
  });
});
