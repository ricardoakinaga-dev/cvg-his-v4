import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AttachmentDownloadClaims {
  readonly attachmentId: string;
  readonly accountId: string;
  readonly expiresAt: number;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64url');
}

export function createAttachmentDownloadToken(
  secret: string,
  claims: AttachmentDownloadClaims
): string {
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${signature(secret, payload)}`;
}

export function verifyAttachmentDownloadToken(
  secret: string,
  token: string,
  nowMs = Date.now()
): AttachmentDownloadClaims | null {
  const [payload, rawSignature] = token.split('.');
  if (!payload || !rawSignature) return null;
  const expected = signature(secret, payload);
  const actualBuffer = Buffer.from(rawSignature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const claims = JSON.parse(decode(payload)) as Partial<AttachmentDownloadClaims>;
    if (
      typeof claims.attachmentId !== 'string' ||
      typeof claims.accountId !== 'string' ||
      typeof claims.expiresAt !== 'number' ||
      !Number.isSafeInteger(claims.expiresAt) ||
      claims.expiresAt <= nowMs
    ) {
      return null;
    }
    return {
      attachmentId: claims.attachmentId,
      accountId: claims.accountId,
      expiresAt: claims.expiresAt
    };
  } catch {
    return null;
  }
}
