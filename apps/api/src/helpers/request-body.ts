import type { IncomingMessage } from 'node:http';

import { ValidationError } from '@cvg-his-v2/shared-errors';

const bodyCache = new WeakMap<IncomingMessage, unknown>();
const emptyBodyCache = new WeakMap<IncomingMessage, boolean>();
const DEFAULT_MAX_BODY_BYTES = 1_048_576;

/**
 * Reads a JSON request body once and replays the parsed value to every route
 * layer that needs it. This is required by the HTTP-level tenant command
 * envelope, which must hash the command before the route mutates state.
 */
export async function readJsonBody(
  request: IncomingMessage,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES
): Promise<unknown> {
  if (bodyCache.has(request)) return bodyCache.get(request);
  if (emptyBodyCache.get(request) === true) {
    throw new ValidationError('Request body is required');
  }

  const chunks: Buffer[] = [];
  let sizeBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    sizeBytes += buffer.length;
    if (sizeBytes > maxBodyBytes) {
      throw new ValidationError('Request body is too large', { maxBodyBytes });
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    emptyBodyCache.set(request, true);
    throw new ValidationError('Request body is required');
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    const parsed = JSON.parse(raw) as unknown;
    bodyCache.set(request, parsed);
    return parsed;
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON', { cause: error as Error });
  }
}

/** Reads a JSON body, treating an empty body as an empty object for commands. */
export async function readJsonBodyOrEmpty(
  request: IncomingMessage,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES
): Promise<unknown> {
  if (bodyCache.has(request)) return bodyCache.get(request);
  if (emptyBodyCache.get(request) === true) return {};
  try {
    return await readJsonBody(request, maxBodyBytes);
  } catch (error) {
    if (error instanceof ValidationError && error.message === 'Request body is required') {
      return {};
    }
    throw error;
  }
}
