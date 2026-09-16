import { describe, expect, it } from 'vitest';

import {
  InMemoryLaboratoryResultImportRepository,
  type LaboratoryResultImportRecord
} from '../../../apps/api/src/laboratory-result-import-repository.js';

const baseRecord: LaboratoryResultImportRecord = {
  externalResultId: 'external-1',
  orderId: 'order-1',
  accountId: 'account-a',
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

describe('InMemoryLaboratoryResultImportRepository', () => {
  it('normalizes, clones, filters and sorts durable-contract records', async () => {
    const repository = new InMemoryLaboratoryResultImportRepository();
    await repository.create(baseRecord);
    await repository.create({
      ...baseRecord,
      externalResultId: 'external-2',
      importedAt: '2026-09-16T11:01:00.000Z',
      accountId: 'account-a'
    });
    await repository.create({ ...baseRecord, externalResultId: 'external-b', accountId: 'account-b' });

    const found = await repository.findByExternalResultId('external-1', 'account-a');
    expect(found).toMatchObject({ attemptCount: 1, lastAttemptAt: baseRecord.importedAt });
    expect(found).not.toBe(baseRecord);
    expect(await repository.findByExternalResultId('missing', 'account-a')).toBeNull();
    expect((await repository.list('account-a')).map(item => item.externalResultId)).toEqual([
      'external-2',
      'external-1'
    ]);
    expect(await repository.list('missing-account')).toEqual([]);

    const changed = { ...found!, status: 'imported' as const, attemptCount: 3, lastAttemptAt: '2026-09-16T12:00:00.000Z' };
    await repository.update(changed);
    expect(await repository.findByExternalResultId('external-1', 'account-a')).toMatchObject(changed);

    const returned = await repository.findByExternalResultId('external-1', 'account-a');
    (returned as { status: string }).status = 'failed';
    expect((await repository.findByExternalResultId('external-1', 'account-a'))!.status).toBe('imported');
  });

  it('is idempotent for identical payloads and rejects conflicting payloads', async () => {
    const repository = new InMemoryLaboratoryResultImportRepository();
    await repository.create(baseRecord);
    await expect(repository.create(baseRecord)).resolves.toBeUndefined();
    await expect(repository.update({ ...baseRecord, status: 'imported' })).resolves.toBeUndefined();
    await expect(repository.create({ ...baseRecord, resultSummary: 'different' })).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT',
      statusCode: 409
    });
    await expect(repository.update({ ...baseRecord, observedAt: '2026-09-16T10:02:00.000Z' })).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT'
    });
    await expect(repository.update({ ...baseRecord, externalResultId: 'new-external' })).resolves.toBeUndefined();
  });

  it('records provider ingress once, replays identical deliveries and rejects divergence', async () => {
    const repository = new InMemoryLaboratoryResultImportRepository();
    const first = await repository.recordProviderIngress(baseRecord);
    expect(first.replayed).toBe(false);
    expect(first.record.attemptCount).toBe(1);

    const replay = await repository.recordProviderIngress({ ...baseRecord, status: 'imported' });
    expect(replay.replayed).toBe(true);
    expect(replay.record.status).toBe('pending_human_review');
    expect(replay.record).not.toBe(first.record);
    await expect(repository.recordProviderIngress({ ...baseRecord, orderId: 'other-order' })).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT'
    });
  });
});
