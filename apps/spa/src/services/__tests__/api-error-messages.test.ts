import { describe, expect, it } from 'vitest';

import { isPortugueseMessage, resolveApiErrorMessage } from '../api-error-messages';

describe('resolveApiErrorMessage', () => {
  it('never shows technical English messages to the user', () => {
    expect(
      resolveApiErrorMessage(400, {
        code: 'VALIDATION_ERROR',
        message: "Field 'encounterId' must be a valid UUID"
      })
    ).toBe('Alguns dados informados são inválidos. Revise o formulário e tente novamente.');
    expect(resolveApiErrorMessage(404, { code: 'NOT_FOUND', message: 'Patient not found' })).toMatch(
      /não foi encontrado/
    );
  });

  it('keeps messages that are already Portuguese', () => {
    expect(
      resolveApiErrorMessage(409, {
        code: 'ALLERGY_ACKNOWLEDGEMENT_REQUIRED',
        message: 'O medicamento coincide com uma alergia registrada do paciente.'
      })
    ).toBe('O medicamento coincide com uma alergia registrada do paciente.');
  });

  it('uses the code catalog, then the HTTP status, then a generic message', () => {
    expect(resolveApiErrorMessage(409, { code: 'DSR_NOT_OPEN', message: 'DSR request is already completed' })).toBe(
      'Esta solicitação do titular já foi encerrada.'
    );
    expect(resolveApiErrorMessage(429, { code: 'SOMETHING_NEW' })).toMatch(/Muitas tentativas/);
    expect(resolveApiErrorMessage(502, null)).toMatch(/Não foi possível concluir/);
  });

  it('detects Portuguese copy without matching English technical text', () => {
    expect(isPortugueseMessage('Informe a justificativa clínica')).toBe(true);
    expect(isPortugueseMessage('Invalid username or password')).toBe(false);
    expect(isPortugueseMessage('Owner not found')).toBe(false);
  });
});
