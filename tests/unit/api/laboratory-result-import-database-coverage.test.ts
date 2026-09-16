import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  withTenantQueryExplicit: vi.fn(),
  query: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQueryExplicit: mocks.withTenantQueryExplicit
}));

import {
  DatabaseLaboratoryResultImportRepository,
  type LaboratoryResultImportRecord
} from '../../../apps/api/src/laboratory-result-import-repository.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const baseRecord: LaboratoryResultImportRecord = {
  externalResultId: 'external-1',
  orderId: 'order-1',
  accountId,
  equipmentId: 'equipment-1',
  providerCode: 'equipment-bridge',
  schemaVersion: '1',
  signatureKeyId: 'lab-key-01',
  payloadFingerprint: 'a'.repeat(64),
  observedAt: '2026-09-16T10:00:00.000Z',
  status: 'pending_human_review',
  importedAt: '2026-09-16T10:01:00.000Z',
  resultSummary: 'Resultado'
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    account_id: accountId,
    external_result_id: baseRecord.externalResultId,
    order_id: baseRecord.orderId,
    equipment_id: baseRecord.equipmentId,
    provider_code: baseRecord.providerCode,
    schema_version: baseRecord.schemaVersion,
    signature_key_id: baseRecord.signatureKeyId,
    payload_fingerprint: baseRecord.payloadFingerprint,
    observed_at: new Date(baseRecord.observedAt),
    status: baseRecord.status,
    imported_at: baseRecord.importedAt,
    result_summary: baseRecord.resultSummary,
    failure_reason: null,
    attempt_count: 1,
    last_attempt_at: new Date(baseRecord.importedAt),
    ...overrides
  };
}

function createDatabase(selectRows: readonly unknown[] = [], limitedRows = selectRows) {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined)
  };
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined)
  };
  const where = vi.fn(() => {
    const result = Promise.resolve(selectRows) as Promise<readonly unknown[]> & {
      limit?: ReturnType<typeof vi.fn>;
    };
    result.limit = vi.fn().mockResolvedValue(limitedRows);
    return result;
  });
  const db = {
    $client: {},
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where })
    })
  };
  return { db, insertChain, updateChain, where };
}

function installTenantHarness(): void {
  mocks.withTenantQueryExplicit.mockImplementation(
    async (
      _pool: unknown,
      _account: string,
      callback: (client: { query: typeof mocks.query }) => unknown
    ) => callback({ query: mocks.query })
  );
}

beforeEach(() => {
  mocks.withTenantQueryExplicit.mockReset();
  mocks.query.mockReset();
});

describe('DatabaseLaboratoryResultImportRepository', () => {
  it('creates normalized durable rows with explicit defaults and conflict target', async () => {
    const harness = createDatabase();
    const repository = new DatabaseLaboratoryResultImportRepository(harness.db as never);
    await repository.create(baseRecord);

    expect(harness.insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      accountId,
      externalResultId: baseRecord.externalResultId,
      failureReason: null,
      attemptCount: 1,
      lastAttemptAt: new Date(baseRecord.importedAt)
    }));
    expect(harness.insertChain.onConflictDoNothing).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.any(Array)
    }));
  });

  it('creates missing updates, updates matching rows and rejects divergent updates', async () => {
    const missing = createDatabase([]);
    const missingRepository = new DatabaseLaboratoryResultImportRepository(missing.db as never);
    await missingRepository.update(baseRecord);
    expect(missing.insertChain.values).toHaveBeenCalled();

    const existing = createDatabase([row()]);
    const existingRepository = new DatabaseLaboratoryResultImportRepository(existing.db as never);
    await existingRepository.update({
      ...baseRecord,
      status: 'failed',
      failureReason: 'invalid result',
      attemptCount: 3,
      lastAttemptAt: '2026-09-16T12:00:00.000Z'
    });
    expect(existing.updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      failureReason: 'invalid result',
      attemptCount: 3,
      lastAttemptAt: new Date('2026-09-16T12:00:00.000Z')
    }));

    const conflict = createDatabase([row()]);
    const conflictRepository = new DatabaseLaboratoryResultImportRepository(conflict.db as never);
    await expect(conflictRepository.update({ ...baseRecord, resultSummary: 'different' })).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT',
      statusCode: 409
    });
  });

  it('persists a provider ingress and maps the durable returned row', async () => {
    installTenantHarness();
    mocks.query.mockResolvedValueOnce({ rows: [row({
      imported_at: '2026-09-16T10:02:00.000Z',
      failure_reason: 'needs review',
      attempt_count: 2
    })] });
    const repository = new DatabaseLaboratoryResultImportRepository({ $client: {} } as never);

    await expect(repository.recordProviderIngress(baseRecord)).resolves.toMatchObject({
      replayed: false,
      record: {
        externalResultId: baseRecord.externalResultId,
        importedAt: '2026-09-16T10:02:00.000Z',
        failureReason: 'needs review',
        attemptCount: 2
      }
    });
  });

  it('replays matching ingress, rejects divergence and exposes unavailable persistence', async () => {
    installTenantHarness();
    const repository = new DatabaseLaboratoryResultImportRepository({ $client: {} } as never);

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row()] });
    await expect(repository.recordProviderIngress(baseRecord)).resolves.toMatchObject({
      replayed: true,
      record: { externalResultId: baseRecord.externalResultId }
    });

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row({ order_id: 'other-order' })] });
    await expect(repository.recordProviderIngress(baseRecord)).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT',
      statusCode: 409
    });

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(repository.recordProviderIngress(baseRecord)).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_UNAVAILABLE',
      statusCode: 503
    });
  });

  it('returns mapped rows and handles empty lookup/list results', async () => {
    const snake = createDatabase([row({ failure_reason: '' })]);
    const snakeRepository = new DatabaseLaboratoryResultImportRepository(snake.db as never);
    await expect(snakeRepository.findByExternalResultId(baseRecord.externalResultId, accountId)).resolves.toMatchObject({
      providerCode: baseRecord.providerCode,
      observedAt: baseRecord.observedAt,
      failureReason: undefined,
      attemptCount: 1
    });
    await expect(snakeRepository.list(accountId)).resolves.toHaveLength(1);

    const empty = createDatabase([], []);
    const emptyRepository = new DatabaseLaboratoryResultImportRepository(empty.db as never);
    await expect(emptyRepository.findByExternalResultId('missing', accountId)).resolves.toBeNull();
    await expect(emptyRepository.list(accountId)).resolves.toEqual([]);
  });

  it('maps legacy camelCase rows with fallback defaults and date variants', async () => {
    const legacyRow = {
      accountId,
      externalResultId: 'legacy-external',
      orderId: 'legacy-order',
      equipmentId: 'legacy-equipment',
      providerCode: null,
      schemaVersion: null,
      signatureKeyId: null,
      payloadFingerprint: null,
      observedAt: null,
      importedAt: '2026-09-16T15:00:00.000Z',
      status: 'imported',
      resultSummary: 'Legacy result',
      failureReason: null,
      attemptCount: undefined,
      lastAttemptAt: undefined
    };
    const harness = createDatabase([legacyRow], [legacyRow]);
    const repository = new DatabaseLaboratoryResultImportRepository(harness.db as never);

    await expect(repository.findByExternalResultId('legacy-external', accountId)).resolves.toEqual({
      externalResultId: 'legacy-external',
      orderId: 'legacy-order',
      accountId,
      equipmentId: 'legacy-equipment',
      providerCode: 'equipment-bridge',
      schemaVersion: 'legacy',
      signatureKeyId: 'legacy',
      payloadFingerprint: '0'.repeat(64),
      observedAt: '2026-09-16T15:00:00.000Z',
      status: 'imported',
      importedAt: '2026-09-16T15:00:00.000Z',
      resultSummary: 'Legacy result',
      failureReason: undefined,
      attemptCount: undefined,
      lastAttemptAt: '1970-01-01T00:00:00.000Z'
    });
  });
});
