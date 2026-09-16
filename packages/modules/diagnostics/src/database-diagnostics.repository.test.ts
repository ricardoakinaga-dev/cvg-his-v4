import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => {
  const executeQueue: Array<{ rowCount: number; rows: readonly Record<string, unknown>[] }> = [];
  const orderRow = {
    id: 'order-1',
    account_id: 'account-1',
    encounter_id: 'encounter-1',
    patient_id: 'patient-1',
    exam_type: 'Hemograma',
    exam_catalog_id: null,
    reason: 'Rotina',
    status: 'requested',
    collected_at: null,
    collected_by_user_id: null,
    result_summary: null,
    result_values: JSON.stringify([
      {
        parameter: 'Hemoglobina',
        value: '13.2',
        unit: 'g/dL',
        reference: '8-18 g/dL',
        outOfRange: false
      }
    ]),
    result_attachment_id: null,
    resulted_at: null,
    released_by_user_id: null,
    signed_by_user_id: null,
    signature_hash: null,
    created_at: new Date('2026-09-16T10:00:00.000Z'),
    updated_at: new Date('2026-09-16T10:00:00.000Z')
  };
  const selectRow = {
    id: orderRow.id,
    accountId: orderRow.account_id,
    encounterId: orderRow.encounter_id,
    patientId: orderRow.patient_id,
    examType: orderRow.exam_type,
    examCatalogId: orderRow.exam_catalog_id,
    reason: orderRow.reason,
    status: orderRow.status,
    collectedAt: orderRow.collected_at,
    collectedByUserId: orderRow.collected_by_user_id,
    resultSummary: orderRow.result_summary,
    resultValues: orderRow.result_values,
    resultAttachmentId: orderRow.result_attachment_id,
    resultedAt: orderRow.resulted_at,
    releasedByUserId: orderRow.released_by_user_id,
    signedByUserId: orderRow.signed_by_user_id,
    signatureHash: orderRow.signature_hash,
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at
  };
  const workflowRow = {
    order_id: 'order-1',
    account_id: 'account-1',
    status: 'reported',
    legacy_status: 'resulted',
    collection_attempt: 2,
    collected_at: new Date('2026-09-16T10:01:00.000Z'),
    collected_by_user_id: 'collector-1',
    analysis_started_at: new Date('2026-09-16T10:02:00.000Z'),
    analysis_started_by_user_id: 'analyst-1',
    reported_at: new Date('2026-09-16T10:03:00.000Z'),
    reported_by_user_id: 'signer-1',
    delivered_at: null,
    delivered_by_user_id: null,
    delivery_channel: null,
    result_summary: 'Sem alterações',
    result_values: JSON.stringify([
      {
        parameter: 'Hemoglobina',
        value: '13.2',
        unit: 'g/dL',
        reference: '8-18 g/dL',
        outOfRange: false
      }
    ]),
    result_attachment_id: null,
    signed_by_user_id: 'signer-1',
    signature_hash: 'a'.repeat(64),
    recollection_reason: 'Amostra anterior insuficiente',
    cancellation_reason: null,
    created_at: new Date('2026-09-16T10:00:00.000Z'),
    updated_at: new Date('2026-09-16T10:03:00.000Z')
  };
  const eventRow = {
    id: 'event-1',
    order_id: 'order-1',
    event_type: 'reported',
    status: 'reported',
    attempt: 2,
    reason: 'Resultado liberado',
    actor_user_id: 'signer-1',
    occurred_at: new Date('2026-09-16T10:03:00.000Z')
  };
  const database = {
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => undefined) }))
    })),
    select: vi.fn(() => {
      const builder = {
        from: () => builder,
        where: () => builder,
        limit: () => builder,
        then: (
          resolve: (value: readonly Record<string, unknown>[]) => unknown,
          reject: (reason: unknown) => unknown
        ) => Promise.resolve([] as readonly Record<string, unknown>[]).then(resolve, reject)
      };
      return builder;
    }),
    execute: vi.fn(async () => executeQueue.shift() ?? { rowCount: 1, rows: [] })
  };

  return {
    accountId: 'account-1',
    otherAccountId: 'account-2',
    executeQueue,
    database,
    orderRow,
    selectRow,
    workflowRow,
    eventRow,
    requireAccountId: 'account-1'
  };
});

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return {
    ...actual,
    withTenantTransaction: vi.fn(async (_accountId: string, operation: (database: unknown) => Promise<unknown>) =>
      operation(mockState.database))
  };
});

vi.mock('@cvg-his-v2/tenant-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/tenant-context')>();
  return {
    ...actual,
    requireAccountId: vi.fn(() => mockState.requireAccountId)
  };
});

import type { AccountId, DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { DatabaseDiagnosticOrderRepository } from './repositories/database-diagnostics.repository.js';
import type { LaboratoryWorkflowState } from './laboratory-workflow.js';

const timestamp = '2026-09-16T10:00:00.000Z';
const accountId = mockState.accountId as AccountId;

const order: DiagnosticOrderSummary = {
  id: 'order-1' as never,
  accountId,
  encounterId: 'encounter-1' as never,
  patientId: 'patient-1' as never,
  examType: 'Hemograma',
  reason: 'Rotina',
  status: 'requested',
  createdAt: timestamp,
  updatedAt: timestamp
};

const workflow: LaboratoryWorkflowState = {
  orderId: order.id,
  accountId,
  status: 'reported',
  legacyStatus: 'resulted',
  collectionAttempt: 2,
  collectedAt: '2026-09-16T10:01:00.000Z',
  collectedByUserId: 'collector-1',
  analysisStartedAt: '2026-09-16T10:02:00.000Z',
  analysisStartedByUserId: 'analyst-1',
  reportedAt: '2026-09-16T10:03:00.000Z',
  reportedByUserId: 'signer-1',
  resultSummary: 'Sem alterações',
  resultValues: [
    {
      parameter: 'Hemoglobina',
      value: '13.2',
      unit: 'g/dL',
      reference: '8-18 g/dL',
      outOfRange: false
    }
  ],
  signedByUserId: 'signer-1',
  signatureHash: 'a'.repeat(64),
  recollectionReason: 'Amostra anterior insuficiente',
  history: [
    {
      id: 'event-1',
      eventType: 'reported',
      status: 'reported',
      attempt: 2,
      reason: 'Resultado liberado',
      actorUserId: 'signer-1',
      occurredAt: '2026-09-16T10:03:00.000Z'
    }
  ],
  createdAt: timestamp,
  updatedAt: '2026-09-16T10:03:00.000Z'
};

function queue(...results: Array<{ rowCount?: number; rows?: readonly Record<string, unknown>[] }>) {
  mockState.executeQueue.push(
    ...results.map((result) => ({ rowCount: result.rowCount ?? 1, rows: result.rows ?? [] }))
  );
}

beforeEach(() => {
  mockState.executeQueue.length = 0;
  mockState.requireAccountId = mockState.accountId;
  vi.clearAllMocks();
});

test('DatabaseDiagnosticOrderRepository covers tenant CRUD and typed row mapping', async () => {
  const repository = new DatabaseDiagnosticOrderRepository({} as never);

  await repository.create(order);
  await repository.update({
    ...order,
    status: 'resulted',
    collectedAt: '2026-09-16T10:01:00.000Z',
    collectedByUserId: 'collector-1',
    resultSummary: 'Sem alterações',
    resultedAt: '2026-09-16T10:03:00.000Z',
    resultValues: workflow.resultValues
  });

  mockState.database.select.mockImplementation(() => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (
        resolve: (value: readonly Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve([mockState.selectRow]).then(resolve, reject)
    };
    return builder;
  });
  expect(await repository.findById(order.id)).toMatchObject({
    id: order.id,
    resultValues: workflow.resultValues
  });
  expect(await repository.findByEncounterId(order.encounterId)).toHaveLength(1);
  expect(await repository.findAll(accountId)).toHaveLength(1);

  mockState.database.select.mockImplementation(() => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (
        resolve: (value: readonly Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve([] as readonly Record<string, unknown>[]).then(resolve, reject)
    };
    return builder;
  });
  expect(await repository.findById('missing' as never)).toBeNull();
  expect(await repository.findByEncounterId('missing' as never)).toEqual([]);

  mockState.database.select.mockImplementation(() => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (
        resolve: (value: readonly Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve([{
        ...mockState.selectRow,
        resultValues: null,
        examCatalogId: 'cat-1',
        collectedByUserId: 'collector-1'
      }]).then(resolve, reject)
    };
    return builder;
  });
  expect(await repository.findAll(accountId)).toMatchObject([{ examCatalogId: 'cat-1' }]);
});

test('DatabaseDiagnosticOrderRepository enforces tenant scope and signer authority', async () => {
  const repository = new DatabaseDiagnosticOrderRepository({} as never);

  mockState.requireAccountId = mockState.otherAccountId;
  await expect(repository.create(order)).rejects.toThrow(/tenant context/);
  await expect(repository.update(order)).rejects.toThrow(/tenant context/);
  await expect(repository.findAll(accountId)).rejects.toThrow(/tenant context/);
  await expect(repository.upsertLaboratoryWorkflow(workflow)).rejects.toThrow(/tenant context/);
  await expect(repository.findLaboratoryWorkflows(accountId)).rejects.toThrow(/tenant context/);

  mockState.requireAccountId = mockState.accountId;
  queue({ rows: [{ ok: 1 }] });
  expect(await repository.isEnabledLaboratorySigner(accountId, 'signer-1')).toBe(true);
  queue({ rows: [] });
  expect(await repository.isEnabledLaboratorySigner(accountId, 'inactive-signer')).toBe(false);
});

test('DatabaseDiagnosticOrderRepository hydrates workflows, replays idempotency and upserts history', async () => {
  const repository = new DatabaseDiagnosticOrderRepository({} as never);

  queue(
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] }
  );
  const workflows = await repository.findLaboratoryWorkflows(accountId);
  expect(workflows).toEqual([
    expect.objectContaining({
      orderId: 'order-1',
      legacyStatus: 'resulted',
      collectionAttempt: 2,
      history: [expect.objectContaining({ eventType: 'reported', actorUserId: 'signer-1' })]
    })
  ]);

  await repository.upsertLaboratoryWorkflow({ ...workflow, history: [] });
  expect(mockState.database.execute).toHaveBeenCalled();
  await repository.upsertLaboratoryWorkflow(workflow);

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] },
    { rows: [{ id: 'event-idempotent' }] }
  );
  const replay = await repository.findLaboratoryTransitionReplay({
    accountId,
    orderId: order.id,
    eventType: 'reported',
    idempotencyKey: 'report-1',
    requestFingerprint: 'fingerprint-1'
  });
  expect(replay).toMatchObject({ replayed: true, order: { id: order.id } });

  queue({ rows: [] });
  expect(await repository.findLaboratoryTransitionReplay({
    accountId,
    orderId: order.id,
    eventType: 'reported',
    idempotencyKey: 'missing',
    requestFingerprint: 'fingerprint-1'
  })).toBeNull();
});

test('DatabaseDiagnosticOrderRepository protects laboratory transitions with CAS and event requirements', async () => {
  const repository = new DatabaseDiagnosticOrderRepository({} as never);
  const nextOrder = { ...order, status: 'resulted' as const, updatedAt: '2026-09-16T10:04:00.000Z' };
  const nextWorkflow = { ...workflow, updatedAt: '2026-09-16T10:04:00.000Z' };
  const input = {
    accountId,
    expectedOrder: order,
    order: nextOrder,
    expectedWorkflow: workflow,
    workflow: nextWorkflow,
    eventType: 'reported' as const,
    requestFingerprint: 'fingerprint-1'
  };

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] },
    { rowCount: 1 },
    { rowCount: 1 },
    { rowCount: 1 }
  );
  await expect(repository.persistLaboratoryTransition(input)).resolves.toEqual({
    order: nextOrder,
    workflow: nextWorkflow,
    replayed: false
  });

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] },
    { rows: [{ id: 'already-recorded' }] }
  );
  await expect(repository.persistLaboratoryTransition({ ...input, idempotencyKey: 'retry-1' })).resolves.toMatchObject({
    replayed: true
  });

  queue({ rows: [] });
  await expect(repository.persistLaboratoryTransition(input)).rejects.toBeInstanceOf(NotFoundError);

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] }
  );
  await expect(repository.persistLaboratoryTransition({ ...input, workflow: { ...nextWorkflow, history: [] } })).rejects.toBeInstanceOf(ConflictError);

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] }
  );
  await expect(repository.persistLaboratoryTransition({
    ...input,
    expectedOrder: { ...order, updatedAt: '2026-09-16T09:00:00.000Z' }
  })).rejects.toBeInstanceOf(ConflictError);

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] },
    { rowCount: 0 }
  );
  await expect(repository.persistLaboratoryTransition(input)).rejects.toBeInstanceOf(ConflictError);

  queue(
    { rows: [mockState.orderRow] },
    { rows: [mockState.workflowRow] },
    { rows: [mockState.eventRow] },
    { rowCount: 1 },
    { rowCount: 0 }
  );
  await expect(repository.persistLaboratoryTransition(input)).rejects.toBeInstanceOf(ConflictError);
});

test('DatabaseDiagnosticOrderRepository fails closed on malformed persisted result values', async () => {
  const repository = new DatabaseDiagnosticOrderRepository({} as never);
  mockState.database.select.mockImplementation(() => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (
        resolve: (value: readonly Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown
      ) => Promise.resolve([{ ...mockState.selectRow, resultValues: '{invalid' }]).then(resolve, reject)
    };
    return builder;
  });
  await expect(repository.findById(order.id)).rejects.toThrow(/not valid JSON/);
});
