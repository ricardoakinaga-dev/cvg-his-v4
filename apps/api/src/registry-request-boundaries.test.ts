import assert from 'node:assert/strict';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  parseCreateOwnerPatientLinkRequest,
  parseCreateOwnerRequest,
  parseCreatePatientRequest,
  parseMergePatientRequest,
  parseUpdateOwnerPatientLinkRequest,
  parseUpdateOwnerRequest,
  parseUpdatePatientRequest
} from './registry-request-boundaries.js';

const CORRELATION_ID = 'corr-registry-boundary';

function validationOnField(error: unknown, field: string): boolean {
  if (!(error instanceof ValidationError) || !error.details || typeof error.details !== 'object') {
    return false;
  }
  return (error.details as { field?: unknown }).field === field;
}

const validOwner = {
  fullName: '  Maria Silva  ',
  contacts: [
    {
      label: 'Celular',
      value: ' 11999999999 ',
      type: 'phone',
      primary: true
    }
  ],
  financialResponsible: true
};

const validPatient = {
  name: ' Luna ',
  species: ' canine ',
  sex: 'female',
  primaryOwnerId: 'owner-1',
  baseWeightKg: 18.5
};

test('parses and normalizes the current owner wire contract', () => {
  const parsed = parseCreateOwnerRequest(
    {
      ...validOwner,
      address: { city: ' Sao Paulo ' },
      profile: { sex: 'female' },
      financialProfile: { availablePoints: 4 }
    },
    CORRELATION_ID
  );

  assert.equal(parsed.fullName, 'Maria Silva');
  assert.equal(parsed.contacts[0]?.value, '11999999999');
  assert.equal(parsed.address?.city, 'Sao Paulo');
  assert.equal(parsed.profile?.sex, 'female');
  assert.equal(parsed.financialProfile?.availablePoints, 4);
});

test('rejects malformed owner nested fields before the service boundary', () => {
  assert.throws(
    () => parseCreateOwnerRequest({ ...validOwner, contacts: [{ ...validOwner.contacts[0], type: 'sms' }] }, CORRELATION_ID),
    (error: unknown) => validationOnField(error, 'contacts[0].type')
  );
  assert.throws(
    () => parseCreateOwnerRequest({ ...validOwner, financialResponsible: 'yes' }, CORRELATION_ID),
    (error: unknown) => validationOnField(error, 'financialResponsible')
  );
});

test('rejects empty owner patches and accepts a validated partial patch', () => {
  assert.throws(
    () => parseUpdateOwnerRequest({}, CORRELATION_ID),
    (error: unknown) => validationOnField(error, 'body')
  );
  assert.deepEqual(parseUpdateOwnerRequest({ status: 'inactive' }, CORRELATION_ID), {
    status: 'inactive'
  });
});

test('parses patient requests and rejects invalid numeric or enum values', () => {
  const parsed = parseCreatePatientRequest(validPatient, CORRELATION_ID);
  assert.deepEqual(parsed, {
    name: 'Luna',
    species: 'canine',
    sex: 'female',
    primaryOwnerId: 'owner-1',
    baseWeightKg: 18.5
  });

  assert.throws(
    () => parseCreatePatientRequest({ ...validPatient, baseWeightKg: Number.NaN }, CORRELATION_ID),
    (error: unknown) => validationOnField(error, 'baseWeightKg')
  );
  assert.throws(
    () => parseUpdatePatientRequest({ status: 'archived' }, CORRELATION_ID),
    (error: unknown) => validationOnField(error, 'status')
  );
});

test('validates relationship and merge command payloads', () => {
  assert.deepEqual(
    parseCreateOwnerPatientLinkRequest(
      {
        ownerId: 'owner-1',
        patientId: 'patient-1',
        relationshipType: 'authorized',
        financialResponsible: false
      },
      CORRELATION_ID
    ),
    {
      ownerId: 'owner-1',
      patientId: 'patient-1',
      relationshipType: 'authorized',
      financialResponsible: false
    }
  );
  assert.throws(
    () => parseCreateOwnerPatientLinkRequest({ ...validOwner }, CORRELATION_ID),
    ValidationError
  );
  assert.deepEqual(
    parseUpdateOwnerPatientLinkRequest({ financialResponsible: true }, CORRELATION_ID),
    { financialResponsible: true }
  );
  assert.deepEqual(
    parseMergePatientRequest({ targetPatientId: 'patient-2', reason: 'Duplicate record' }, CORRELATION_ID),
    { targetPatientId: 'patient-2', reason: 'Duplicate record' }
  );
});
