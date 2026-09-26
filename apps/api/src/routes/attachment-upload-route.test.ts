import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleAttachmentUploadRoute } from './attachment-upload-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public bodyRead = false;
  readonly #body: Buffer;

  constructor(method: string, url: string, body?: unknown) {
    super();
    this.method = method;
    this.url = url;
    this.#body = body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
  }

  _read(): void {
    this.bodyRead = true;
    this.push(this.#body);
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }
}

const principal = {
  user: { id: 'user_upload_1', accountId: 'account_upload_1' }
};
const payload = {
  linkedEntityType: 'encounter',
  linkedEntityId: 'encounter_upload_1',
  fileName: 'record.txt',
  mimeType: 'text/plain',
  contentBase64: Buffer.from('file bytes').toString('base64')
};
const attachment = {
  id: 'attachment_upload_1',
  fileName: 'record.txt',
  accountId: 'account_upload_1'
};

const unusedMedicalRecords = {
  ensureRecord: () => undefined,
  appendAttachmentEvent: () => undefined,
  getRecordOrThrowAsync: async () => ({ id: 'record_1', encounterId: 'encounter_1' }),
  waitForPersistence: async () => undefined
};

function unusedHandlers() {
  return {
    attachments: { upload: async () => attachment } as never,
    diagnostics: {
      getOrThrow: () => ({ id: 'diagnostic_1', encounterId: 'encounter_1' })
    } as never,
    medicalRecords: unusedMedicalRecords as never,
    requirePrincipal: async () => principal as never,
    requireAttachmentTargetForAccount: async () => undefined,
    appendAudit: () => undefined
  };
}

test('attachment upload route handles only exact POST path', async () => {
  for (const [path, method] of [
    ['/attachments/extra', 'POST'],
    ['/attachments', 'GET']
  ] as const) {
    const request = new MockRequest(method, path, payload);
    const response = new MockResponse();
    let principalCalls = 0;
    const handled = await handleAttachmentUploadRoute(
      path,
      request as never,
      response as never,
      'correlation-upload',
      {
        ...unusedHandlers(),
        requirePrincipal: async () => {
          principalCalls += 1;
          return principal as never;
        }
      }
    );

    assert.equal(handled, false);
    assert.equal(principalCalls, 0);
    assert.equal(request.bodyRead, false);
    assert.equal(response.bodyText(), '');
  }
});

test('encounter upload preserves authorization, target validation, event, persistence, and audit order', async () => {
  const calls: string[] = [];
  const request = new MockRequest('POST', '/attachments', payload);
  const response = new MockResponse();
  const handled = await handleAttachmentUploadRoute(
    '/attachments',
    request as never,
    response as never,
    'correlation-upload',
    {
      attachments: {
        upload: async (
          actorId: string,
          accountId: string,
          requestPayload: unknown,
          content: Buffer
        ) => {
          calls.push(`upload:${actorId}:${accountId}`);
          assert.deepEqual(requestPayload, payload);
          assert.deepEqual(content, Buffer.from('file bytes'));
          return attachment;
        }
      } as never,
      diagnostics: unusedHandlers().diagnostics,
      medicalRecords: {
        ensureRecord: (accountId: string, encounterId: string) =>
          calls.push(`ensure:${accountId}:${encounterId}`),
        appendAttachmentEvent: (...args: unknown[]) =>
          calls.push(`event:${String(args[0])}:${String(args[1])}:${String(args[3])}`),
        getRecordOrThrowAsync: unusedMedicalRecords.getRecordOrThrowAsync,
        waitForPersistence: async () => calls.push('persisted')
      } as never,
      requirePrincipal: async (_request, permission) => {
        assert.equal(request.bodyRead, false, 'authorization must run before body parsing');
        calls.push(`principal:${permission}`);
        return principal as never;
      },
      requireAttachmentTargetForAccount: async (type, id, accountId) => {
        calls.push(`target:${type}:${id}:${accountId}`);
      },
      appendAudit: (...args) => calls.push(`audit:${args[0]}:${args[3]}:${args[8]}`)
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.bodyText()), attachment);
  assert.deepEqual(calls, [
    'principal:attachments.manage',
    'target:encounter:encounter_upload_1:account_upload_1',
    'upload:user_upload_1:account_upload_1',
    'ensure:account_upload_1:encounter_upload_1',
    'event:account_upload_1:encounter_upload_1:attachment_upload_1',
    'persisted',
    'audit:user_upload_1:upload:correlation-upload'
  ]);
});

test('medical record and diagnostic order uploads append events to their encounter', async () => {
  const linkedEntities = [
    {
      linkedEntityType: 'medical_record',
      linkedEntityId: 'record_upload_1',
      expected: 'medical-record-event:encounter_from_record:attachment_upload_1'
    },
    {
      linkedEntityType: 'diagnostic_order',
      linkedEntityId: 'diagnostic_upload_1',
      expected: 'diagnostic-event:encounter_from_order:attachment_upload_1'
    }
  ] as const;

  for (const linkedEntity of linkedEntities) {
    const calls: string[] = [];
    const requestPayload = {
      ...payload,
      linkedEntityType: linkedEntity.linkedEntityType,
      linkedEntityId: linkedEntity.linkedEntityId
    };
    const request = new MockRequest('POST', '/attachments', requestPayload);
    const handled = await handleAttachmentUploadRoute(
      '/attachments',
      request as never,
      new MockResponse() as never,
      'correlation-upload',
      {
        ...unusedHandlers(),
        attachments: { upload: async () => attachment } as never,
        diagnostics: {
          getOrThrow: () => ({
            id: linkedEntity.linkedEntityId,
            encounterId: 'encounter_from_order'
          })
        } as never,
        medicalRecords: {
          ensureRecord: () => undefined,
          waitForPersistence: async () => undefined,
          getRecordOrThrowAsync: async () => ({
            id: 'record_upload_1',
            encounterId: 'encounter_from_record'
          }),
          appendAttachmentEvent: (
            _accountId: string,
            encounterId: string,
            _actor: string,
            attachmentId: string
          ) => {
            calls.push(
              `${linkedEntity.linkedEntityType === 'medical_record' ? 'medical-record' : 'diagnostic'}-event:${encounterId}:${attachmentId}`
            );
          }
        } as never
      }
    );

    assert.equal(handled, true);
    assert.deepEqual(calls, [linkedEntity.expected]);
  }
});
