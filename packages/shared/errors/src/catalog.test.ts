import { describe, expect, it } from 'vitest';

import {
  ERROR_CATALOG,
  VALIDATION_REASONS,
  VALIDATION_REASON_PT_BR,
  isKnownErrorCode,
  resolveUserMessage
} from './catalog.js';
import { ConflictError, NotFoundError, ValidationError, toErrorResponse } from './index.js';

const ENGLISH_MARKERS = [/\bmust\b/i, /\bfield\b/i, /\binvalid\b/i, /\bnot found\b/i, /\bunavailable\b/i];

describe('API error code catalog (R2-UX-01)', () => {
  it('lists every code with an HTTP status, a category and a Portuguese message', () => {
    const codes = Object.keys(ERROR_CATALOG);
    expect(codes.length).toBeGreaterThan(150);
    for (const code of codes) {
      const entry = ERROR_CATALOG[code];
      expect(code, code).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(entry.httpStatus, code).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus, code).toBeLessThan(600);
      expect(entry.ptBR.trim().length, code).toBeGreaterThan(10);
      for (const marker of ENGLISH_MARKERS) expect(entry.ptBR, `${code}: ${entry.ptBR}`).not.toMatch(marker);
    }
  });

  it('covers the codes produced by the shared error classes', () => {
    for (const error of [
      new ValidationError('x'),
      new NotFoundError(),
      new ConflictError(),
      { code: 'INTERNAL_ERROR' },
      { code: 'AUTHENTICATION_ERROR' },
      { code: 'FORBIDDEN' },
      { code: 'PAYLOAD_TOO_LARGE' }
    ]) {
      expect(isKnownErrorCode((error as { code: string }).code)).toBe(true);
      const catalogued = ERROR_CATALOG[(error as { code: string }).code];
      if ('statusCode' in error) expect(catalogued.httpStatus).toBe(error.statusCode);
    }
  });

  it('has a Portuguese message for every validation reason', () => {
    for (const reason of VALIDATION_REASONS) expect(VALIDATION_REASON_PT_BR[reason].length).toBeGreaterThan(5);
  });

  it('resolves user messages from code and validation reason, never from the English message', () => {
    const body = toErrorResponse(new ValidationError('Field email must be a non-empty string', { field: 'email', reason: 'required' }), 'corr').body;
    expect(resolveUserMessage(body)).toBe('Campo obrigatório.');
    expect(resolveUserMessage({ code: 'VALIDATION_ERROR' })).toBe(ERROR_CATALOG.VALIDATION_ERROR.ptBR);
    expect(resolveUserMessage({ code: 'SUBJECT_NOT_FOUND' })).toBe('Titular não encontrado nesta clínica.');
    expect(resolveUserMessage({ code: 'SOMETHING_NEW_AND_UNKNOWN' })).toBe(ERROR_CATALOG.INTERNAL_ERROR.ptBR);
    expect(resolveUserMessage({})).toBe(ERROR_CATALOG.INTERNAL_ERROR.ptBR);
  });
});
