/**
 * Auth helpers for API key and principal validation.
 * Extracted from server.ts to support route extraction.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthenticationError, ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { ApiKeySummary } from '@cvg-his-v2/shared-types';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';

function readHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()] ?? request.headers[name];
  return typeof value === 'string' ? value : undefined;
}

export interface RequireApiKeyResult {
  apiKey: ApiKeySummary;
}

/**
 * Validate API key from request headers and return the key summary.
 * Throws AuthenticationError if key is missing or invalid.
 * Throws ForbiddenError if key lacks required permission.
 */
export async function requireApiKey(
  request: IncomingMessage,
  permissionCode: string,
  apiKeys: ApiKeysService
): Promise<RequireApiKeyResult> {
  const apiKeyValue = readHeader(request, 'x-api-key') ?? readHeader(request, 'X-API-Key');
  if (!apiKeyValue) {
    throw new AuthenticationError('API key required');
  }

  const apiKey = await apiKeys.validate(apiKeyValue);
  if (!apiKey) {
    throw new AuthenticationError('Invalid API key');
  }

  if (!apiKey.permissions.includes(permissionCode)) {
    throw new ForbiddenError(`API key lacks required permission: ${permissionCode}`);
  }

  await apiKeys.updateLastUsed(apiKey.id);
  return { apiKey };
}

/**
 * Sanitize an API key by removing the keyHash field.
 */
export function sanitizeApiKey(apiKey: ApiKeySummary): Omit<ApiKeySummary, 'keyHash'> {
  const { keyHash: _keyHash, ...safe } = apiKey;
  return safe;
}
