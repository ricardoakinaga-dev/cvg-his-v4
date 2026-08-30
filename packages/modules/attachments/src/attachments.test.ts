import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'vitest';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { AttachmentsService, LocalAttachmentSecurityScanner } from './index.js';

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
    getOrThrow(_accountId: string, orderId: string) {
      assert.equal(orderId, order.id);
      return order;
    }
  };

  const service = new AttachmentsService({
    encounters: encounters as never,
    medicalRecords: medicalRecords as never,
    diagnostics: diagnostics as never
  });

  return { service, encounter, record, order, encounters, medicalRecords, diagnostics };
}

test('AttachmentsService uploads attachment linked to medical record', async () => {
  const { service, record } = createService();

  const attachment = await service.upload('user_admin' as never, 'acc_test' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'laudo.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-001'
  });

  assert.equal(attachment.linkedEntityType, 'medical_record');
  assert.equal(attachment.linkedEntityId, record.id);
  assert.equal((await service.getById(attachment.id))?.id, attachment.id);
  assert.equal(await service.getFileContent(attachment.storageKey), null);
  const list = await service.listByLinkedEntity('medical_record', record.id);
  assert.equal(list.length, 1);
});

test('AttachmentsService uploads attachment linked to diagnostic order', async () => {
  const { service, order } = createService();

  const attachment = await service.upload('user_admin' as never, 'acc_test' as never, {
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

test('AttachmentsService requires account scope for diagnostic links', async () => {
  const calls: unknown[][] = [];
  const order = { id: 'diag_1', accountId: 'acc_test' };
  const service = new AttachmentsService({
    encounters: { getOrThrow: () => ({ accountId: 'acc_test' }) } as never,
    medicalRecords: { getRecordOrThrowAsync: async () => ({ accountId: 'acc_test' }) } as never,
    diagnostics: {
      getOrThrow(...args: unknown[]) {
        calls.push(args);
        if (args[0] !== 'acc_test') {
          throw new NotFoundError('Diagnostic order not found');
        }
        return order;
      }
    } as never
  });
  const uploadWithAccount = service.upload.bind(service) as unknown as (
    actorUserId: never,
    accountId: never,
    payload: Parameters<AttachmentsService['upload']>[2]
  ) => Promise<Awaited<ReturnType<AttachmentsService['upload']>>>;
  const payload = {
    linkedEntityType: 'diagnostic_order' as const,
    linkedEntityId: order.id,
    category: 'lab',
    fileName: 'resultado.txt',
    mimeType: 'text/plain',
    checksum: 'sha256-account-boundary'
  } as const;

  const attachment = await uploadWithAccount('user_admin' as never, 'acc_test' as never, payload);
  assert.equal(attachment.accountId, 'acc_test');
  assert.equal(
    calls.every(([accountId]) => accountId === 'acc_test'),
    true
  );
  await assert.rejects(
    () => uploadWithAccount('user_admin' as never, 'acc_other' as never, payload),
    NotFoundError
  );
});

test('AttachmentsService rejects invalid target type', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.upload('user_admin' as never, 'acc_test' as never, {
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

  await service.upload('user_admin' as never, 'acc_test' as never, {
    linkedEntityType: 'encounter',
    linkedEntityId: encounter.id,
    category: 'document',
    fileName: 'triagem.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256-004'
  });
  await service.upload('user_admin' as never, 'acc_test' as never, {
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

  const fileContent = Buffer.from('%PDF-1.7\nclinical attachment test');
  const expectedChecksum = createHash('sha256').update(fileContent).digest('hex');

  const attachment = await service.upload(
    'user_admin' as never,
    'acc_test' as never,
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

  const fileContent = Buffer.from('%PDF-1.7\nclinical attachment test');
  const wrongChecksum = 'sha256-wrong-checksum-value';

  await assert.rejects(
    () =>
      service.upload(
        'user_admin' as never,
        'acc_test' as never,
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

test('AttachmentsService rejects content flagged by the security scanner', async () => {
  const { record } = createService();
  const service = new AttachmentsService({
    encounters: { getOrThrow: () => ({ accountId: 'acc_test' }) } as never,
    medicalRecords: { getRecordOrThrowAsync: async () => record } as never,
    diagnostics: { getOrThrow: () => ({ accountId: 'acc_test' }) } as never,
    scanner: {
      async scan() {
        return { status: 'rejected', provider: 'test-av', reason: 'infected' } as const;
      }
    }
  });

  await assert.rejects(
    () =>
      service.upload(
        'user_admin' as never,
        'acc_test' as never,
        {
          linkedEntityType: 'medical_record',
          linkedEntityId: record.id,
          category: 'document',
          fileName: 'blocked.pdf',
          mimeType: 'application/pdf',
          checksum: createHash('sha256').update('%PDF-1.7\nblocked').digest('hex'),
          contentBase64: Buffer.from('%PDF-1.7\nblocked').toString('base64')
        },
        Buffer.from('%PDF-1.7\nblocked')
      ),
    /security scanner/
  );
});

test('AttachmentsService quarantines metadata-only uploads and marks binary uploads available', async () => {
  const { service, record } = createService();
  const metadataOnly = await service.upload('user_admin' as never, 'acc_test' as never, {
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'document',
    fileName: 'pending.pdf',
    mimeType: 'application/pdf',
    checksum: 'pending'
  });
  assert.equal(metadataOnly.scanStatus, 'quarantined');

  const content = Buffer.from('%PDF-1.7\nclean');
  const binary = await service.upload(
    'user_admin' as never,
    'acc_test' as never,
    {
      linkedEntityType: 'medical_record',
      linkedEntityId: record.id,
      category: 'document',
      fileName: 'clean.pdf',
      mimeType: 'application/pdf',
      checksum: createHash('sha256').update(content).digest('hex')
    },
    content
  );
  assert.equal(binary.scanStatus, 'available');
  assert.equal(binary.scanProvider, 'local-heuristic');
});

test('AttachmentsService does not expose an attachment when persistence fails', async () => {
  const { encounter, record, order } = createService();
  const service = new AttachmentsService({
    encounters: { getOrThrow: () => encounter } as never,
    medicalRecords: { getRecordOrThrowAsync: async () => record } as never,
    diagnostics: { getOrThrow: () => order } as never,
    repository: {
      async create() {
        throw new Error('database unavailable');
      },
      async findById() {
        return null;
      },
      async findByLinkedEntity() {
        return [];
      },
      async deleteById() {
        return false;
      }
    }
  });

  await assert.rejects(
    () =>
      service.upload('user_admin' as never, 'acc_test' as never, {
        linkedEntityType: 'encounter',
        linkedEntityId: encounter.id,
        category: 'document',
        fileName: 'failure.pdf',
        mimeType: 'application/pdf',
        checksum: 'checksum'
      }),
    /database unavailable/
  );
  assert.deepEqual(await service.listByLinkedEntity('encounter', encounter.id), []);
});

test('LocalAttachmentSecurityScanner rejects malware and active content', async () => {
  const scanner = new LocalAttachmentSecurityScanner();

  await expectRejectedScannerVerdict(
    scanner,
    Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
    'application/pdf',
    'malware-test-signature-detected'
  );
  await expectRejectedScannerVerdict(
    scanner,
    Buffer.from('<script>alert(1)</script>'),
    'text/plain',
    'active-content-detected'
  );
  assert.deepEqual(
    await scanner.scan({
      fileName: 'notes.txt',
      mimeType: 'text/plain',
      content: Buffer.from('clinical notes')
    }),
    { status: 'available', provider: 'local-heuristic' }
  );
  assert.deepEqual(
    await scanner.scan({
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('%PDF-1.7')
    }),
    { status: 'available', provider: 'local-heuristic' }
  );
});

async function expectRejectedScannerVerdict(
  scanner: LocalAttachmentSecurityScanner,
  content: Buffer,
  mimeType: string,
  reason: string
): Promise<void> {
  assert.deepEqual(await scanner.scan({ fileName: 'scanner-test.bin', mimeType, content }), {
    status: 'rejected',
    provider: 'local-heuristic',
    reason
  });
}

test('AttachmentsService validates file metadata and known content signatures', async () => {
  const { service, record } = createService();
  const invalidNames = [
    '.',
    '..',
    '../escape.pdf',
    'nested/file.pdf',
    'nested\\file.pdf',
    'a\0b.pdf'
  ];
  for (const fileName of invalidNames) {
    await assert.rejects(
      () =>
        service.upload('user_admin' as never, 'acc_test' as never, {
          linkedEntityType: 'medical_record',
          linkedEntityId: record.id,
          category: 'document',
          fileName,
          mimeType: 'text/plain',
          checksum: 'metadata'
        }),
      { name: 'ValidationError' }
    );
  }
  await assert.rejects(
    () =>
      service.upload('user_admin' as never, 'acc_test' as never, {
        linkedEntityType: 'medical_record',
        linkedEntityId: record.id,
        category: 'document',
        fileName: 'a'.repeat(256),
        mimeType: 'text/plain',
        checksum: 'metadata'
      }),
    { name: 'ValidationError' }
  );
  for (const mimeType of [
    'text/html',
    'application/xhtml+xml',
    'application/javascript',
    'text/javascript',
    'application/x-shockwave-flash'
  ]) {
    await assert.rejects(
      () =>
        service.upload('user_admin' as never, 'acc_test' as never, {
          linkedEntityType: 'medical_record',
          linkedEntityId: record.id,
          category: 'document',
          fileName: 'blocked.txt',
          mimeType,
          checksum: 'metadata'
        }),
      { name: 'ValidationError' }
    );
  }

  const signatures = [
    { mimeType: 'image/png', content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]) },
    { mimeType: 'image/jpeg', content: Buffer.from([255, 216, 255, 0]) },
    { mimeType: 'image/gif', content: Buffer.from('GIF89a') },
    { mimeType: 'image/webp', content: Buffer.from('RIFF0000WEBP') }
  ] as const;
  for (const [index, signature] of signatures.entries()) {
    const checksum = createHash('sha256').update(signature.content).digest('hex');
    const attachment = await service.upload(
      'user_admin' as never,
      'acc_test' as never,
      {
        linkedEntityType: 'medical_record',
        linkedEntityId: record.id,
        category: 'document',
        fileName: `signature-${index}.bin`,
        mimeType: signature.mimeType,
        checksum
      },
      signature.content
    );
    assert.equal(attachment.mimeType, signature.mimeType);
  }
  for (const [index, signature] of signatures.entries()) {
    await assert.rejects(
      () =>
        service.upload(
          'user_admin' as never,
          'acc_test' as never,
          {
            linkedEntityType: 'medical_record',
            linkedEntityId: record.id,
            category: 'document',
            fileName: `invalid-signature-${index}.bin`,
            mimeType: signature.mimeType,
            checksum: 'invalid'
          },
          Buffer.from('not-a-known-signature')
        ),
      /does not match/
    );
  }
});

test('AttachmentsService supports durable storage, reads and cleanup on persistence failure', async () => {
  const { encounter, record, diagnostics, encounters, medicalRecords } = createService();
  const content = Buffer.from('%PDF-1.7\ndurable attachment');
  const checksum = createHash('sha256').update(content).digest('hex');
  const stored = new Map<string, Buffer>();
  let deleteCalls = 0;
  const fileStorage = {
    async store() {
      stored.set('tenant/attachment.pdf', content);
      return { storageKey: 'tenant/attachment.pdf', checksum, sizeBytes: content.length };
    },
    async retrieve(storageKey: string) {
      return stored.get(storageKey) ?? null;
    },
    async delete(storageKey: string) {
      deleteCalls += 1;
      stored.delete(storageKey);
      return true;
    },
    async exists(storageKey: string) {
      return stored.has(storageKey);
    }
  };
  const repository = {
    async create() {},
    async findById() {
      return null;
    },
    async findByLinkedEntity() {
      return [];
    },
    async deleteById() {
      return false;
    }
  };
  const service = new AttachmentsService({
    encounters: encounters as never,
    medicalRecords: medicalRecords as never,
    diagnostics: diagnostics as never,
    fileStorage: fileStorage as never,
    repository: repository as never
  });
  const attachment = await service.upload(
    'user_admin' as never,
    'acc_test' as never,
    {
      linkedEntityType: 'medical_record',
      linkedEntityId: record.id,
      category: 'document',
      fileName: 'attachment.pdf',
      mimeType: 'application/pdf',
      checksum
    },
    content
  );
  assert.deepEqual(await service.getFileContent(attachment.storageKey), content);
  assert.equal(await service.getById(attachment.id), null);

  const failingService = new AttachmentsService({
    encounters: encounters as never,
    medicalRecords: medicalRecords as never,
    diagnostics: diagnostics as never,
    fileStorage: fileStorage as never,
    repository: {
      async create() {
        throw new Error('attachment database unavailable');
      },
      async findById() {
        return null;
      },
      async findByLinkedEntity() {
        return [];
      },
      async deleteById() {
        return false;
      }
    } as never
  });
  await assert.rejects(
    () =>
      failingService.upload(
        'user_admin' as never,
        'acc_test' as never,
        {
          linkedEntityType: 'encounter',
          linkedEntityId: encounter.id,
          category: 'document',
          fileName: 'failed.pdf',
          mimeType: 'application/pdf',
          checksum
        },
        content
      ),
    /attachment database unavailable/
  );
  assert.equal(deleteCalls, 1);
});

test('AttachmentsService rejects foreign targets and invalid upload limits before publication', async () => {
  const foreignTargetService = new AttachmentsService({
    encounters: { getOrThrow: () => ({ accountId: 'acc_other' }) } as never,
    medicalRecords: { getRecordOrThrowAsync: async () => ({ accountId: 'acc_other' }) } as never,
    diagnostics: { getOrThrow: () => ({ accountId: 'acc_other' }) } as never
  });
  await assert.rejects(
    () =>
      foreignTargetService.upload('user_admin' as never, 'acc_test' as never, {
        linkedEntityType: 'encounter',
        linkedEntityId: 'encounter_foreign',
        category: 'document',
        fileName: 'foreign.pdf',
        mimeType: 'application/pdf',
        checksum: 'foreign'
      }),
    NotFoundError
  );

  const { encounter, record, diagnostics, encounters, medicalRecords } = createService();
  const dependencies = {
    encounters: encounters as never,
    medicalRecords: medicalRecords as never,
    diagnostics: diagnostics as never
  };
  await assert.rejects(
    () =>
      new AttachmentsService({ ...dependencies, maxFileSizeBytes: 0 }).upload(
        'user_admin' as never,
        'acc_test' as never,
        {
          linkedEntityType: 'encounter',
          linkedEntityId: encounter.id,
          category: 'document',
          fileName: 'invalid-limit.pdf',
          mimeType: 'application/pdf',
          checksum: 'limit'
        }
      ),
    /upload limit is invalid/
  );
  await assert.rejects(
    () =>
      new AttachmentsService({ ...dependencies, maxFileSizeBytes: 1.5 as never }).upload(
        'user_admin' as never,
        'acc_test' as never,
        {
          linkedEntityType: 'medical_record',
          linkedEntityId: record.id,
          category: 'document',
          fileName: 'invalid-limit.pdf',
          mimeType: 'application/pdf',
          checksum: 'limit'
        }
      ),
    /upload limit is invalid/
  );
  await assert.rejects(
    () =>
      new AttachmentsService({ ...dependencies, maxFileSizeBytes: 1 }).upload(
        'user_admin' as never,
        'acc_test' as never,
        {
          linkedEntityType: 'encounter',
          linkedEntityId: encounter.id,
          category: 'document',
          fileName: 'too-large.pdf',
          mimeType: 'application/pdf',
          checksum: 'large'
        },
        Buffer.from('%PDF')
      ),
    /maximum allowed size/
  );
});
