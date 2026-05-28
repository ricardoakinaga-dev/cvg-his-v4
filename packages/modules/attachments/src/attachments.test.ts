import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'vitest';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { AttachmentsService } from './index.js';

function createService() {
  const encounter = {
    id: 'encounter_1',
    accountId: 'acc_test',
    patientId: 'patient_1'
  };
  const record = {
    id: 'record_1',
    accountId: 'acc_test'
  };
  const order = {
    id: 'diag_1',
    accountId: 'acc_test'
  };

  const encounters = {
    getOrThrow(encounterId: string) {
      assert.equal(encounterId, encounter.id);
      return encounter;
    }
  };
  const medicalRecords = {
    getRecordOrThrow(recordId: string) {
      assert.equal(recordId, record.id);
      return record;
    },
    async getRecordOrThrowAsync(recordId: string) {
      assert.equal(recordId, record.id);
      return record;
    }
  };
  const diagnostics = {
    getOrThrow(orderId: string) {
      assert.equal(orderId, order.id);
      return order;
    }
  };

  const service = new AttachmentsService({
    encounters: encounters as never,
    medicalRecords: medicalRecords as never,
    diagnostics: diagnostics as never
  });

  return { service, encounter, record, order };
}

test('AttachmentsService uploads attachment linked to medical record', async () => {
  const { service, record } = createService();

  const attachment = await service.upload('user_admin' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'laudo.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-001'
  });

  assert.equal(attachment.linkedEntityType, 'medical_record');
  assert.equal(attachment.linkedEntityId, record.id);
  const list = await service.listByLinkedEntity('medical_record', record.id);
  assert.equal(list.length, 1);
});

test('AttachmentsService uploads attachment linked to diagnostic order', async () => {
  const { service, order } = createService();

  const attachment = await service.upload('user_admin' as never, {
    linkedEntityType: 'diagnostic_order',
    linkedEntityId: order.id,
    category: 'lab',
    fileName: 'resultado.txt',
    mimeType: 'text/plain',
    checksum: 'sha256-002'
  });

  assert.equal(attachment.accountId, order.accountId);
  const list = await service.listByLinkedEntity('diagnostic_order', order.id);
  assert.equal(list.length, 1);
});

test('AttachmentsService rejects invalid target type', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.upload('user_admin' as never, {
        linkedEntityType: 'invalid' as never,
        linkedEntityId: 'entity_1',
        category: 'document',
        fileName: 'arquivo.pdf',
        mimeType: 'application/pdf',
        checksum: 'sha256-003'
      }),
    NotFoundError
  );
});

test('AttachmentsService listByLinkedEntity filters attachments', async () => {
  const { service, encounter, record } = createService();

  await service.upload('user_admin' as never, {
    linkedEntityType: 'encounter',
    linkedEntityId: encounter.id,
    category: 'document',
    fileName: 'triagem.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-004'
  });
  await service.upload('user_admin' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'evolucao.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-005'
  });

  const encounters = await service.listByLinkedEntity('encounter', encounter.id);
  const records = await service.listByLinkedEntity('medical_record', record.id);
  assert.equal(encounters.length, 1);
  assert.equal(records.length, 1);
});

test('AttachmentsService upload with file content computes real checksum', async () => {
  const { service, record } = createService();

  const fileContent = Buffer.from('test file content for integrity check');
  const expectedChecksum = createHash('sha256').update(fileContent).digest('hex');

  const attachment = await service.upload(
    'user_admin' as never,
    {
      linkedEntityType: 'medical_record',
      linkedEntityId: record.id,
      category: 'document',
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      checksum: expectedChecksum
    },
    fileContent
  );

  assert.equal(attachment.checksum, expectedChecksum);
  assert.equal(attachment.sizeBytes, fileContent.length);
  assert.ok(attachment.storageKey.startsWith('local/'));
});

test('AttachmentsService upload rejects mismatched checksum', async () => {
  const { service, record } = createService();

  const fileContent = Buffer.from('test file content');
  const wrongChecksum = 'sha256-wrong-checksum-value';

  await assert.rejects(
    () =>
      service.upload(
        'user_admin' as never,
        {
          linkedEntityType: 'medical_record',
          linkedEntityId: record.id,
          category: 'document',
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          checksum: wrongChecksum
        },
        fileContent
      ),
    { name: 'ValidationError' }
  );
});
