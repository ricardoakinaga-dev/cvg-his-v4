import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryLaboratoryResultImportRepository,
  type LaboratoryResultImportRecord
} from './laboratory-result-import-repository.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

function record(overrides: Partial<LaboratoryResultImportRecord> = {}): LaboratoryResultImportRecord {
  return {
    externalResultId: 'external-result-001',
    orderId: 'order-001',
    accountId: ACCOUNT_ID,
    equipmentId: 'equipment-001',
    providerCode: 'equipment-bridge',
    schemaVersion: '1',
    signatureKeyId: 'lab-key-01',
    payloadFingerprint: 'a'.repeat(64),
    observedAt: '2026-08-29T03:33:20.000Z',
    status: 'pending_human_review',
    importedAt: '2026-08-29T03:33:21.000Z',
    resultSummary: 'Hemoglobina: 7.2',
    attemptCount: 1,
    lastAttemptAt: '2026-08-29T03:33:21.000Z',
    ...overrides
  };
}

test('provider ingress persistence is immutable, atomic and replay-aware in memory', async () => {
  const repository = new InMemoryLaboratoryResultImportRepository();
  const first = record();
  const [created, replayed] = await Promise.all([
    repository.recordProviderIngress(first),
    repository.recordProviderIngress(first)
  ]);

  assert.equal(repository.storage, 'ephemeral');
  assert.equal([created.replayed, replayed.replayed].filter(Boolean).length, 1);
  assert.deepEqual(created.record, replayed.record);
  assert.equal((await repository.list(ACCOUNT_ID)).length, 1);

  const returned = await repository.findByExternalResultId(first.externalResultId, ACCOUNT_ID);
  assert.ok(returned);
  const mutable = returned as { resultSummary: string };
  mutable.resultSummary = 'tampered';
  assert.equal(
    (await repository.findByExternalResultId(first.externalResultId, ACCOUNT_ID))?.resultSummary,
    first.resultSummary
  );
});

test('provider ingress persistence rejects a changed fingerprint without overwriting the row', async () => {
  const repository = new InMemoryLaboratoryResultImportRepository();
  const first = record();
  await repository.recordProviderIngress(first);

  await assert.rejects(
    repository.recordProviderIngress(record({ payloadFingerprint: 'b'.repeat(64) })),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 409 && error.code === 'LABORATORY_PROVIDER_INGRESS_CONFLICT'
  );
  assert.deepEqual(await repository.findByExternalResultId(first.externalResultId, ACCOUNT_ID), first);
});

test('provider ingress workflow updates cannot rewrite immutable provider facts', async () => {
  const repository = new InMemoryLaboratoryResultImportRepository();
  const first = record();
  await repository.recordProviderIngress(first);

  await assert.rejects(
    repository.update(record({ orderId: 'different-order-001' })),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 409 && error.code === 'LABORATORY_PROVIDER_INGRESS_CONFLICT'
  );
  await repository.update(record({ status: 'failed', failureReason: 'human-review-pending' }));
  const updated = await repository.findByExternalResultId(first.externalResultId, ACCOUNT_ID);
  assert.ok(updated);
  assert.equal(updated.orderId, first.orderId);
  assert.equal(updated.status, 'failed');
  assert.equal(updated.failureReason, 'human-review-pending');
});

test('provider ingress persistence isolates the same external id by account', async () => {
  const repository = new InMemoryLaboratoryResultImportRepository();
  await repository.recordProviderIngress(record());
  const other = await repository.recordProviderIngress(
    record({
      accountId: '22222222-2222-4222-8222-222222222222',
      payloadFingerprint: 'b'.repeat(64)
    })
  );

  assert.equal(other.replayed, false);
  assert.equal((await repository.list(ACCOUNT_ID)).length, 1);
  assert.equal((await repository.list('22222222-2222-4222-8222-222222222222')).length, 1);
});
