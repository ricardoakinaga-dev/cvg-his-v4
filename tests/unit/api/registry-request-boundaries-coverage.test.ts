import { describe, expect, it } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  parseCreateOwnerPatientLinkRequest,
  parseCreateOwnerRequest,
  parseCreatePatientRequest,
  parseMergePatientRequest,
  parseUpdateOwnerPatientLinkRequest,
  parseUpdateOwnerRequest,
  parseUpdatePatientRequest
} from '../../../apps/api/src/registry-request-boundaries.js';

const CORRELATION_ID = 'coverage-registry-boundaries';

const completeOwner = {
  fullName: '  Maria Silva  ',
  documentId: ' 123456789 ',
  contacts: [
    { label: 'Celular', value: ' 11999999999 ', type: 'phone', primary: true },
    { label: 'E-mail', value: ' maria@example.test ', type: 'email', primary: false },
    { label: 'WhatsApp', value: ' 5511999999999 ', type: 'whatsapp' }
  ],
  address: {
    zipCode: ' 01310-100 ',
    street: ' Avenida Paulista ',
    number: ' 1000 ',
    complement: ' Sala 10 ',
    state: ' SP ',
    city: ' Sao Paulo ',
    district: ' Bela Vista ',
    reference: ' Proximo ao MASP ',
    cityCode: ' 3550308 '
  },
  profile: {
    birthDate: ' 1980-01-02 ',
    sex: 'female',
    group: ' Premium ',
    receiveSms: true,
    personType: 'individual',
    rg: ' 12.345.678-9 '
  },
  financialProfile: {
    allowedDebtLimit: 1000,
    creditBalance: 250,
    availablePoints: 40,
    blockedPoints: 2
  },
  financialResponsible: true,
  administrativeNotes: ' Observacao ',
  legacyVetusId: ' vetus-1 ',
  originalCreatedAt: ' 2024-01-01T00:00:00.000Z ',
  status: 'active'
};

const completePatient = {
  name: ' Luna ',
  species: ' canine ',
  breed: ' Golden Retriever ',
  sex: 'female',
  size: 'large',
  birthDateApproximate: ' 2020-01 ',
  baseWeightKg: 18.5,
  primaryOwnerId: ' owner-1 ',
  isNeutered: true,
  microchip: ' chip-1 ',
  pedigreeNumber: ' pedigree-1 ',
  color: ' dourado ',
  chronicDisease: ' nenhuma ',
  allergy: ' nenhuma ',
  temperament: ' calmo ',
  generalNotes: ' Observacao ',
  legacyVetusId: ' vetus-patient-1 ',
  originalCreatedAt: ' 2024-01-01T00:00:00.000Z ',
  status: 'active'
};

function expectValidation(action: () => unknown, field?: string): void {
  expect(action).toThrow(ValidationError);
  if (field) {
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toMatchObject({
        correlationId: CORRELATION_ID,
        field
      });
    }
  }
}

describe('registry request boundary coverage', () => {
  it('normalizes every supported owner field and contact variant', () => {
    expect(parseCreateOwnerRequest(completeOwner, CORRELATION_ID)).toEqual({
      fullName: 'Maria Silva',
      documentId: '123456789',
      contacts: [
        { label: 'Celular', value: '11999999999', type: 'phone', primary: true },
        { label: 'E-mail', value: 'maria@example.test', type: 'email', primary: false },
        { label: 'WhatsApp', value: '5511999999999', type: 'whatsapp' }
      ],
      address: {
        zipCode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Sala 10',
        state: 'SP',
        city: 'Sao Paulo',
        district: 'Bela Vista',
        reference: 'Proximo ao MASP',
        cityCode: '3550308'
      },
      profile: {
        birthDate: '1980-01-02',
        sex: 'female',
        group: 'Premium',
        receiveSms: true,
        personType: 'individual',
        rg: '12.345.678-9'
      },
      financialProfile: {
        allowedDebtLimit: 1000,
        creditBalance: 250,
        availablePoints: 40,
        blockedPoints: 2
      },
      financialResponsible: true,
      administrativeNotes: 'Observacao',
      legacyVetusId: 'vetus-1',
      originalCreatedAt: '2024-01-01T00:00:00.000Z',
      status: 'active'
    });
  });

  it('accepts sparse optional objects and both boolean values', () => {
    const sparse = parseCreateOwnerRequest(
      {
        fullName: 'Ana',
        contacts: [{ label: 'Telefone', value: '11', type: 'phone', primary: false }],
        financialResponsible: false,
        address: {},
        profile: {},
        financialProfile: {}
      },
      CORRELATION_ID
    );

    expect(sparse).toEqual({
      fullName: 'Ana',
      contacts: [{ label: 'Telefone', value: '11', type: 'phone', primary: false }],
      address: {},
      profile: {},
      financialProfile: {},
      financialResponsible: false
    });
  });

  it('validates owner patches and rejects unsupported or malformed values', () => {
    expect(parseUpdateOwnerRequest({ status: 'inactive' }, CORRELATION_ID)).toEqual({
      status: 'inactive'
    });
    expect(parseUpdateOwnerRequest({ financialResponsible: true }, CORRELATION_ID)).toEqual({
      financialResponsible: true
    });

    expectValidation(() => parseUpdateOwnerRequest({}, CORRELATION_ID), 'body');
    expectValidation(() => parseUpdateOwnerRequest({ status: 'deleted' }, CORRELATION_ID), 'status');
    expectValidation(() => parseUpdateOwnerRequest({ contacts: [] }, CORRELATION_ID), 'contacts');
    expectValidation(
      () => parseUpdateOwnerRequest({ contacts: [{ label: 'x', value: 'y', type: 'sms' }] }, CORRELATION_ID),
      'contacts[0].type'
    );
    expectValidation(() => parseUpdateOwnerRequest({ address: null }, CORRELATION_ID), 'address');
    expectValidation(() => parseUpdateOwnerRequest({ profile: { receiveSms: 'yes' } }, CORRELATION_ID), 'profile.receiveSms');
    expectValidation(() => parseUpdateOwnerRequest({ financialProfile: { creditBalance: Infinity } }, CORRELATION_ID), 'financialProfile.creditBalance');
    expectValidation(() => parseUpdateOwnerRequest({ fullName: '   ' }, CORRELATION_ID), 'fullName');
  });

  it('requires owner creation fields and preserves correlation context', () => {
    expectValidation(() => parseCreateOwnerRequest({}, CORRELATION_ID), 'fullName');
    expectValidation(
      () => parseCreateOwnerRequest({ fullName: 'Ana' }, CORRELATION_ID),
      'contacts'
    );
    expectValidation(
      () => parseCreateOwnerRequest({ fullName: 'Ana', contacts: [], financialResponsible: true }, CORRELATION_ID),
      'contacts'
    );
    expectValidation(
      () => parseCreateOwnerRequest({ fullName: 'Ana', contacts: [{ label: 'x', value: 'y', type: 'phone' }] }, CORRELATION_ID),
      'financialResponsible'
    );
  });

  it('normalizes every patient field and accepts all supported enum values', () => {
    expect(parseCreatePatientRequest(completePatient, CORRELATION_ID)).toEqual({
      ...completePatient,
      name: 'Luna',
      species: 'canine',
      breed: 'Golden Retriever',
      birthDateApproximate: '2020-01',
      primaryOwnerId: 'owner-1',
      microchip: 'chip-1',
      pedigreeNumber: 'pedigree-1',
      color: 'dourado',
      chronicDisease: 'nenhuma',
      allergy: 'nenhuma',
      temperament: 'calmo',
      generalNotes: 'Observacao',
      legacyVetusId: 'vetus-patient-1',
      originalCreatedAt: '2024-01-01T00:00:00.000Z'
    });

    for (const sex of ['male', 'female', 'unknown'] as const) {
      expect(parseUpdatePatientRequest({ sex }, CORRELATION_ID)).toEqual({ sex });
    }
    for (const size of ['small', 'medium', 'large'] as const) {
      expect(parseUpdatePatientRequest({ size }, CORRELATION_ID)).toEqual({ size });
    }
    for (const status of ['active', 'inactive', 'deceased'] as const) {
      expect(parseUpdatePatientRequest({ status }, CORRELATION_ID)).toEqual({ status });
    }
  });

  it('validates patient required fields, patches, optional values and numbers', () => {
    expect(parseUpdatePatientRequest({ isNeutered: false, baseWeightKg: 0 }, CORRELATION_ID)).toEqual({
      isNeutered: false,
      baseWeightKg: 0
    });
    expectValidation(() => parseCreatePatientRequest({}, CORRELATION_ID), 'name');
    expectValidation(
      () => parseCreatePatientRequest({ name: 'Luna', species: 'canine' }, CORRELATION_ID),
      'primaryOwnerId'
    );
    expectValidation(
      () => parseCreatePatientRequest({ name: 'Luna', species: 'canine', primaryOwnerId: 'o' }, CORRELATION_ID),
      'sex'
    );
    expectValidation(() => parseUpdatePatientRequest({}, CORRELATION_ID), 'body');
    expectValidation(() => parseUpdatePatientRequest({ baseWeightKg: Number.NaN }, CORRELATION_ID), 'baseWeightKg');
    expectValidation(() => parseUpdatePatientRequest({ species: 4 }, CORRELATION_ID), 'species');
    expectValidation(() => parseUpdatePatientRequest({ sex: 'other' }, CORRELATION_ID), 'sex');
    expectValidation(() => parseUpdatePatientRequest({ size: 'giant' }, CORRELATION_ID), 'size');
    expectValidation(() => parseUpdatePatientRequest({ isNeutered: 'no' }, CORRELATION_ID), 'isNeutered');
    expectValidation(() => parseUpdatePatientRequest({ breed: '   ' }, CORRELATION_ID), 'breed');
  });

  it('validates links and patient merge commands', () => {
    expect(
      parseCreateOwnerPatientLinkRequest(
        {
          ownerId: ' owner-1 ',
          patientId: ' patient-1 ',
          relationshipType: 'spouse',
          financialResponsible: false
        },
        CORRELATION_ID
      )
    ).toEqual({
      ownerId: 'owner-1',
      patientId: 'patient-1',
      relationshipType: 'spouse',
      financialResponsible: false
    });
    expect(parseUpdateOwnerPatientLinkRequest({ financialResponsible: true }, CORRELATION_ID)).toEqual({
      financialResponsible: true
    });
    expect(parseMergePatientRequest({ targetPatientId: ' p2 ', reason: ' duplicate ' }, CORRELATION_ID)).toEqual({
      targetPatientId: 'p2',
      reason: 'duplicate'
    });

    for (const relationshipType of ['primary', 'secondary', 'financial', 'authorized', 'spouse'] as const) {
      expect(
        parseCreateOwnerPatientLinkRequest(
          { ownerId: 'o', patientId: 'p', relationshipType, financialResponsible: true },
          CORRELATION_ID
        ).relationshipType
      ).toBe(relationshipType);
    }
    expectValidation(() => parseCreateOwnerPatientLinkRequest({}, CORRELATION_ID), 'ownerId');
    expectValidation(
      () => parseCreateOwnerPatientLinkRequest({ ownerId: 'o', patientId: 'p', relationshipType: 'friend', financialResponsible: true }, CORRELATION_ID),
      'relationshipType'
    );
    expectValidation(() => parseUpdateOwnerPatientLinkRequest({}, CORRELATION_ID), 'body');
    expectValidation(() => parseUpdateOwnerPatientLinkRequest({ financialResponsible: 1 }, CORRELATION_ID), 'financialResponsible');
    expectValidation(() => parseMergePatientRequest({ targetPatientId: 'p' }, CORRELATION_ID), 'reason');
  });
});
