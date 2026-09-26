import { describe, expect, it } from 'vitest';

import { MAX_ATTACHMENT_BASE64_LENGTH } from '@cvg-his-v2/shared-contracts';
import { PayloadTooLargeError, ValidationError } from '@cvg-his-v2/shared-errors';

import { decodeAttachmentContent } from '../../../apps/api/src/helpers/attachment-upload-content.ts';

describe('decodeAttachmentContent', () => {
  it('returns undefined when content is omitted', () => {
    expect(decodeAttachmentContent(undefined)).toBeUndefined();
  });

  it('decodes valid base64 content', () => {
    const buffer = decodeAttachmentContent(Buffer.from('hello').toString('base64'));
    expect(buffer?.toString('utf8')).toBe('hello');
  });

  it('rejects non-string content', () => {
    expect(() => decodeAttachmentContent(42)).toThrow(ValidationError);
    expect(() => decodeAttachmentContent({})).toThrow(ValidationError);
  });

  it('rejects empty or malformed base64', () => {
    expect(() => decodeAttachmentContent('')).toThrow(ValidationError);
    expect(() => decodeAttachmentContent('   ')).toThrow(ValidationError);
    expect(() => decodeAttachmentContent('abc')).toThrow(ValidationError);
    expect(() => decodeAttachmentContent('***')).toThrow(ValidationError);
  });

  it('rejects content longer than the base64 limit', () => {
    const oversized = 'A'.repeat(MAX_ATTACHMENT_BASE64_LENGTH + 4);
    expect(() => decodeAttachmentContent(oversized)).toThrow(PayloadTooLargeError);
  });

  it('rejects malformed base64 that fails the charset gate', () => {
    expect(() => decodeAttachmentContent('====')).toThrow(ValidationError);
  });
});
