import { describe, expect, it } from 'vitest';
import { duplicateEntityId } from '../duplicateConflict';

function apiConflict(details: Record<string, unknown>, message = 'Possible duplicate record detected') {
  return Object.assign(new Error(message), {
    status: 409,
    body: { code: 'CONFLICT', message, details }
  });
}

describe('duplicateEntityId', () => {
  it('extracts the entity id from the explicit duplicate contract', () => {
    expect(duplicateEntityId(apiConflict({ ownerId: 'owner-existing' }), 'ownerId')).toBe('owner-existing');
  });

  it('supports localized duplicate messages', () => {
    expect(duplicateEntityId(apiConflict({ patientId: 'patient-existing' }, 'Possível duplicado'), 'patientId')).toBe('patient-existing');
  });

  it('does not turn another conflict into a duplicate action', () => {
    expect(duplicateEntityId(apiConflict({ ownerId: 'owner-existing' }, 'Cannot assign an inactive owner'), 'ownerId')).toBeUndefined();
    expect(duplicateEntityId(apiConflict({ ownerId: 'owner-existing' }), 'patientId')).toBeUndefined();
  });

  it('rejects malformed or non-409 responses', () => {
    expect(duplicateEntityId({ status: 500, body: { code: 'CONFLICT', details: { ownerId: 'owner-existing' } } }, 'ownerId')).toBeUndefined();
    expect(duplicateEntityId(apiConflict({ ownerId: '' }), 'ownerId')).toBeUndefined();
    expect(duplicateEntityId(apiConflict({}), 'ownerId')).toBeUndefined();
  });
});
