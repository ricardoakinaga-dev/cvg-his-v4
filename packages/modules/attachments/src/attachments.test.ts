import assert from 'node:assert/strict';
import test from 'node:test';

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
    }
  };
  const diagnostics = {
    getOrThrow(orderId: string) {
      assert.equal(orderId, order.id);
      return order;
    }
  };

  const service = new AttachmentsService(
    encounters as never,
    medicalRecords as never,
    diagnostics as never
  );

  return { service, encounter, record, order };
}

test('AttachmentsService uploads attachment linked to medical record', () => {
  const { service, record } = createService();

  const attachment = service.upload('user_admin' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'laudo.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-001'
  });

  assert.equal(attachment.linkedEntityType, 'medical_record');
  assert.equal(attachment.linkedEntityId, record.id);
  assert.equal(service.listByLinkedEntity('medical_record', record.id).length, 1);
});

test('AttachmentsService uploads attachment linked to diagnostic order', () => {
  const { service, order } = createService();

  const attachment = service.upload('user_admin' as never, {
    linkedEntityType: 'diagnostic_order',
    linkedEntityId: order.id,
    category: 'lab',
    fileName: 'resultado.txt',
    mimeType: 'text/plain',
    checksum: 'sha256-002'
  });

  assert.equal(attachment.accountId, order.accountId);
  assert.equal(service.listByLinkedEntity('diagnostic_order', order.id).length, 1);
});

test('AttachmentsService rejects invalid target type', () => {
  const { service } = createService();

  assert.throws(
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

test('AttachmentsService listByLinkedEntity filters attachments', () => {
  const { service, encounter, record } = createService();

  service.upload('user_admin' as never, {
    linkedEntityType: 'encounter',
    linkedEntityId: encounter.id,
    category: 'document',
    fileName: 'triagem.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-004'
  });
  service.upload('user_admin' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'evolucao.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-005'
  });

  assert.equal(service.listByLinkedEntity('encounter', encounter.id).length, 1);
  assert.equal(service.listByLinkedEntity('medical_record', record.id).length, 1);
});
