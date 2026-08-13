/**
 * Common request/response helpers shared across route handlers.
 * Extracted from server.ts to reduce coupling and enable route extraction.
 */
import type { IncomingMessage } from 'node:http';
import { ValidationError } from '@cvg-his-v2/shared-errors';

export const MAX_JSON_BODY_BYTES = 1_000_000;

export interface FieldSpec {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  enum?: readonly string[];
}

/**
 * Read and parse JSON body from an incoming request.
 * Throws ValidationError if body is empty or malformed JSON.
 */
export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw new ValidationError(`Request body exceeds maximum size of ${MAX_JSON_BODY_BYTES} bytes`);
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new ValidationError('Request body is required');
  }

  const body = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON', { cause: error as Error });
  }
}

/**
 * Validate a request body against a field specification.
 * Throws ValidationError with field-level detail on failure.
 */
export function validateRequestBody(
  body: Record<string, unknown>,
  fields: Record<string, FieldSpec>,
  correlationId: string
): void {
  for (const [key, spec] of Object.entries(fields)) {
    const value = body[key];

    if (spec.required && (value === undefined || value === null)) {
      throw new ValidationError(`Field '${key}' is required`, { correlationId, field: key });
    }

    if (value === undefined || value === null) continue;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== spec.type) {
      throw new ValidationError(`Field '${key}' must be of type ${spec.type}`, {
        correlationId,
        field: key
      });
    }

    if (spec.type === 'string') {
      if (typeof value !== 'string') continue;
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        throw new ValidationError(`Field '${key}' must have at least ${spec.minLength} characters`, {
          correlationId,
          field: key
        });
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        throw new ValidationError(`Field '${key}' must have at most ${spec.maxLength} characters`, {
          correlationId,
          field: key
        });
      }
      if (spec.enum !== undefined && !spec.enum.includes(value)) {
        throw new ValidationError(`Field '${key}' must be one of: ${spec.enum.join(', ')}`, {
          correlationId,
          field: key
        });
      }
    }
  }
}
