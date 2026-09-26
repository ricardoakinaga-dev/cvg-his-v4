import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, VALIDATION_REASON_PT_BR } from '@cvg-his-v2/shared-errors';

import { isPortugueseMessage, resolveApiErrorMessage } from '../api-error-messages';

describe('resolveApiErrorMessage', () => {
  it('uses the shared API catalog for known codes and validation reasons', () => {
    expect(
      resolveApiErrorMessage(400, {
        code: 'VALIDATION_ERROR',
        message: "Field 'encounterId' must be a valid UUID",
        details: { field: 'encounterId', reason: 'invalid_format' }
      })
    ).toBe(VALIDATION_REASON_PT_BR.invalid_format);
    expect(resolveApiErrorMessage(404, { code: 'NOT_FOUND', message: 'Patient not found' })).toBe(
      ERROR_CATALOG.NOT_FOUND!.ptBR
    );
    expect(
      resolveApiErrorMessage(409, { code: 'ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED', message: 'x' })
    ).toBe(ERROR_CATALOG.ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED!.ptBR);
  });

  it('never shows technical English text for codes outside the catalog', () => {
    expect(resolveApiErrorMessage(429, { code: 'SOMETHING_NEW', message: 'Too many requests' })).toMatch(
      /Muitas tentativas/
    );
    expect(resolveApiErrorMessage(502, null)).toMatch(/Não foi possível concluir/);
  });

  it('keeps an already-Portuguese message when the code is not catalogued', () => {
    expect(
      resolveApiErrorMessage(400, { code: 'SETUP_CUSTOM', message: 'A senha do administrador deve ter ao menos 12 caracteres.' })
    ).toBe('A senha do administrador deve ter ao menos 12 caracteres.');
  });

  it('detects Portuguese copy without matching English technical text', () => {
    expect(isPortugueseMessage('Informe a justificativa clínica')).toBe(true);
    expect(isPortugueseMessage('Invalid username or password')).toBe(false);
    expect(isPortugueseMessage('Owner not found')).toBe(false);
  });
});
