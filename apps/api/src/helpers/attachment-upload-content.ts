import {
  MAX_ATTACHMENT_BASE64_LENGTH,
  MAX_ATTACHMENT_FILE_SIZE_BYTES
} from '@cvg-his-v2/shared-contracts';
import { PayloadTooLargeError, ValidationError } from '@cvg-his-v2/shared-errors';

export function decodeAttachmentContent(contentBase64: unknown): Buffer | undefined {
  if (contentBase64 === undefined) return undefined;
  if (typeof contentBase64 !== 'string') {
    throw new ValidationError('contentBase64 must be a base64 string', { field: 'contentBase64' });
  }
  const normalized = contentBase64.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_ATTACHMENT_BASE64_LENGTH ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  ) {
    if (normalized.length > MAX_ATTACHMENT_BASE64_LENGTH) {
      throw new PayloadTooLargeError('Attachment content exceeds the maximum allowed size', {
        maxBase64Length: MAX_ATTACHMENT_BASE64_LENGTH,
        maxFileSizeBytes: MAX_ATTACHMENT_FILE_SIZE_BYTES
      });
    }
    throw new ValidationError('contentBase64 is invalid', { field: 'contentBase64' });
  }
  const content = Buffer.from(normalized, 'base64');
  if (content.length > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    throw new PayloadTooLargeError('Attachment content exceeds the maximum allowed size', {
      maxBase64Length: MAX_ATTACHMENT_BASE64_LENGTH,
      maxFileSizeBytes: MAX_ATTACHMENT_FILE_SIZE_BYTES
    });
  }
  if (content.toString('base64') !== normalized) {
    throw new ValidationError('contentBase64 is invalid', {
      field: 'contentBase64'
    });
  }
  return content;
}
