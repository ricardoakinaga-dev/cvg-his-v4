import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAttachmentDownloadToken,
  verifyAttachmentDownloadToken
} from './attachment-download-token.js';

const claims = {
  attachmentId: 'attachment-1',
  accountId: 'account-1',
  expiresAt: 2_000
} as const;

test('attachment download token round-trips and preserves tenant binding', () => {
  const token = createAttachmentDownloadToken('test-secret', claims);

  assert.deepEqual(verifyAttachmentDownloadToken('test-secret', token, 1_000), claims);
  assert.equal(verifyAttachmentDownloadToken('wrong-secret', token, 1_000), null);
});

test('attachment download token rejects tampering and expiration', () => {
  const token = createAttachmentDownloadToken('test-secret', claims);
  const [payload, signature] = token.split('.');

  assert.equal(
    verifyAttachmentDownloadToken('test-secret', `${payload}x.${signature}`, 1_000),
    null
  );
  assert.equal(verifyAttachmentDownloadToken('test-secret', token, claims.expiresAt), null);
});
