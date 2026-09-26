import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleAttachmentContentReadRoute } from './attachment-content-read-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
  }

  _read(): void {
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

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

const attachment = {
  id: 'attachment_read_1',
  accountId: 'account_read_1',
  fileName: 'clinical"\nrecord.txt',
  storageKey: 'local/account_read_1/record.txt',
  mimeType: 'text/plain',
  scanStatus: 'available'
};

function unusedHandlers() {
  return {
    attachments: {
      getById: async () => attachment,
      getFileContent: async () => Buffer.from('file')
    } as never,
    signedClaims: null,
    requirePrincipal: async () =>
      ({ user: { id: 'user_read_1', accountId: 'account_read_1' } }) as never,
    appendAudit: () => undefined,
    waitForAuditPersistence: async () => undefined
  };
}

test('attachment content read route handles only exact GET paths', async () => {
  const unmatched = [
    ['/attachments/attachment_read_1/content/extra', 'GET'],
    ['/attachments//content', 'GET'],
    ['/attachments/attachment_read_1/content', 'POST']
  ] as const;

  for (const [url, method] of unmatched) {
    const response = new MockResponse();
    const handled = await handleAttachmentContentReadRoute(
      url,
      new MockRequest(method, url) as never,
      response as never,
      'correlation-1',
      unusedHandlers()
    );
    assert.equal(handled, false, `${method} ${url} must remain unmatched`);
    assert.equal(response.bodyText(), '');
  }
});

test('authenticated attachment download preserves account, audit, and response behavior', async () => {
  const calls: string[] = [];
  const response = new MockResponse();
  const handled = await handleAttachmentContentReadRoute(
    '/attachments/attachment_read_1/content',
    new MockRequest('GET', '/attachments/attachment_read_1/content') as never,
    response as never,
    'correlation-1',
    {
      attachments: {
        getById: async (accountId: string, id: string) => {
          calls.push(`get:${accountId}:${id}`);
          return attachment;
        },
        getFileContent: async (accountId: string, storageKey: string) => {
          calls.push(`content:${accountId}:${storageKey}`);
          return Buffer.from('file');
        }
      } as never,
      signedClaims: null,
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return {
          user: { id: 'user_read_1', accountId: 'account_read_1' }
        } as never;
      },
      appendAudit: (...args) => calls.push(`audit:${args[0]}:${args[3]}:${args[8]}`),
      waitForAuditPersistence: async () => {
        calls.push('audit-persisted');
      }
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    'principal:attachments.read',
    'get:account_read_1:attachment_read_1',
    'content:account_read_1:local/account_read_1/record.txt',
    'audit:user_read_1:download:correlation-1',
    'audit-persisted'
  ]);
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyText(), 'file');
  assert.equal(response.headers.get('content-type'), 'text/plain');
  assert.equal(response.headers.get('content-length'), '4');
  assert.equal(
    response.headers.get('content-disposition'),
    'attachment; filename="clinical__record.txt"'
  );
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('signed attachment download skips principal auth and audits the signed actor', async () => {
  const calls: string[] = [];
  const response = new MockResponse();
  const handled = await handleAttachmentContentReadRoute(
    '/attachments/attachment_read_1/content',
    new MockRequest('GET', '/attachments/attachment_read_1/content') as never,
    response as never,
    'correlation-signed',
    {
      attachments: {
        getById: async (accountId: string) => {
          calls.push(`get:${accountId}`);
          return attachment;
        },
        getFileContent: async (accountId: string) => {
          calls.push(`content:${accountId}`);
          return Buffer.from('file');
        }
      } as never,
      signedClaims: {
        attachmentId: attachment.id,
        accountId: attachment.accountId,
        expiresAt: 1_800_000_000_000
      },
      requirePrincipal: async () => {
        calls.push('unexpected-principal');
        throw new Error('signed downloads must not require a session');
      },
      appendAudit: (...args) => calls.push(`audit:${args[0]}:${args[3]}:${args[8]}`),
      waitForAuditPersistence: async () => {
        calls.push('audit-persisted');
      }
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    'get:account_read_1',
    'content:account_read_1',
    'audit:signed-download:download_signed:correlation-signed',
    'audit-persisted'
  ]);
  assert.equal(response.statusCode, 200);
});

test('unavailable scan status fails before file retrieval and audit', async () => {
  const calls: string[] = [];
  const pendingAttachment = { ...attachment, scanStatus: 'pending' };

  await assert.rejects(
    handleAttachmentContentReadRoute(
      '/attachments/attachment_read_1/content',
      new MockRequest('GET', '/attachments/attachment_read_1/content') as never,
      new MockResponse() as never,
      'correlation-pending',
      {
        ...unusedHandlers(),
        attachments: {
          getById: async () => pendingAttachment,
          getFileContent: async () => {
            calls.push('content');
            return Buffer.from('file');
          }
        } as never,
        appendAudit: () => calls.push('audit')
      }
    ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'ATTACHMENT_NOT_AVAILABLE');
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.deepEqual((error as { details?: unknown }).details, { scanStatus: 'pending' });
      return true;
    }
  );
  assert.deepEqual(calls, []);
});

test('signed attachment ID mismatch is opaque not found before content access or audit', async () => {
  const calls: string[] = [];

  await assert.rejects(
    handleAttachmentContentReadRoute(
      '/attachments/attachment_read_1/content',
      new MockRequest('GET', '/attachments/attachment_read_1/content') as never,
      new MockResponse() as never,
      'correlation-mismatch',
      {
        ...unusedHandlers(),
        signedClaims: {
          attachmentId: 'attachment_other',
          accountId: attachment.accountId,
          expiresAt: 1_800_000_000_000
        },
        attachments: {
          getById: async () => {
            calls.push('get');
            return attachment;
          },
          getFileContent: async () => {
            calls.push('content');
            return Buffer.from('file');
          }
        } as never,
        appendAudit: () => calls.push('audit')
      }
    ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'NOT_FOUND');
      assert.deepEqual((error as { details?: unknown }).details, {
        attachmentId: 'attachment_read_1'
      });
      return true;
    }
  );
  assert.deepEqual(calls, ['get']);
});

test('missing stored content is not found and is not audited', async () => {
  const calls: string[] = [];

  await assert.rejects(
    handleAttachmentContentReadRoute(
      '/attachments/attachment_read_1/content',
      new MockRequest('GET', '/attachments/attachment_read_1/content') as never,
      new MockResponse() as never,
      'correlation-missing-content',
      {
        ...unusedHandlers(),
        attachments: {
          getById: async () => attachment,
          getFileContent: async () => {
            calls.push('content');
            return null;
          }
        } as never,
        appendAudit: () => calls.push('audit')
      }
    ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'NOT_FOUND');
      assert.deepEqual((error as { details?: unknown }).details, {
        attachmentId: 'attachment_read_1'
      });
      return true;
    }
  );
  assert.deepEqual(calls, ['content']);
});
