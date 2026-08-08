/**
 * Common request/response helpers shared across route handlers.
 * Extracted from server.ts to reduce coupling and enable route extraction.
 */
import { ValidationError } from '@cvg-his-v2/shared-errors';

export { readJsonBody, readJsonBodyOrEmpty } from './request-body.js';

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
