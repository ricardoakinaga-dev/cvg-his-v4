import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  // Owners
  createOwnerBodySchema,
  updateOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema,
  listOwnersResponseSchema,
  ownersContract,

  // Patients
  createPatientBodySchema,
  updatePatientBodySchema,
  patientIdParamSchema,
  listPatientsQuerySchema,
  patientResponseSchema,
  listPatientsResponseSchema,
  patientsContract,

  // Encounters
  createEncounterBodySchema,
  closeEncounterBodySchema,
  encounterIdParamSchema,
  listEncountersQuerySchema,
  encounterResponseSchema,
  listEncountersResponseSchema,
  encountersContract,

  // Billing
  encounterBillingContract,

  // Common
  apiContract,
  contractEndpoints
} from '../index.js';

/**
 * ==========================================
 * OWNERS CONTRACT TESTS
 * ==========================================
 */
describe('Owners Contract', () => {
  describe('POST /owners - create', () => {
    it('should validate a valid owner create body', () => {
      const validInput = {
        fullName: 'John Doe',
        document: '12345678900',
        email: 'john@example.com',
        phoneMain: '11999999999'
      };

      const result = createOwnerBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject owner without fullName', () => {
      const invalidInput = {
        email: 'john@example.com'
      };

      const result = createOwnerBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept minimal owner (only fullName)', () => {
      const minimalInput = {
        fullName: 'Jane Doe'
      };

      const result = createOwnerBodySchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidInput = {
        fullName: 'John Doe',
        email: 'not-an-email'
      };

      const result = createOwnerBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from fullName', () => {
      const input = {
        fullName: '  John Doe  '
      };

      const result = createOwnerBodySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('John Doe');
      }
    });
  });

  describe('PATCH /owners/:id - update', () => {
    it('should validate partial update', () => {
      const validInput = {
        email: 'newemail@example.com'
      };

      const result = updateOwnerBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      const emptyInput = {};

      const result = updateOwnerBodySchema.safeParse(emptyInput);
      expect(result.success).toBe(false);
    });
  });

  describe('GET /owners/:id - params', () => {
    it('should validate valid UUID', () => {
      const validParams = {
        id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = ownerIdParamSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidParams = {
        id: 'not-a-uuid'
      };

      const result = ownerIdParamSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('GET /owners - list query', () => {
    it('should apply default pagination values', () => {
      const emptyQuery = {};

      const result = listOwnersQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should validate custom pagination', () => {
      const customQuery = {
        page: '2',
        pageSize: '50',
        q: 'john'
      };

      const result = listOwnersQuerySchema.safeParse(customQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(50);
        expect(result.data.q).toBe('john');
      }
    });

    it('should reject pageSize > 100', () => {
      const invalidQuery = {
        pageSize: '200'
      };

      const result = listOwnersQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe('Owner response schema', () => {
    it('should validate a valid owner response', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        fullName: 'John Doe',
        document: '12345678900',
        email: 'john@example.com',
        phoneMain: '11999999999',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = ownerResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Contract definition', () => {
    it('should have all required endpoints', () => {
      expect(ownersContract.create).toBeDefined();
      expect(ownersContract.getById).toBeDefined();
      expect(ownersContract.list).toBeDefined();
      expect(ownersContract.update).toBeDefined();
      expect(ownersContract.getSummary).toBeDefined();
    });

    it('should have correct HTTP methods', () => {
      expect(ownersContract.create.method).toBe('POST');
      expect(ownersContract.getById.method).toBe('GET');
      expect(ownersContract.list.method).toBe('GET');
      expect(ownersContract.update.method).toBe('PATCH');
    });
  });
});

/**
 * ==========================================
 * PATIENTS CONTRACT TESTS
 * ==========================================
 */
describe('Patients Contract', () => {
  describe('POST /patients - create', () => {
    it('should validate a valid patient create body', () => {
      const validInput = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Rex',
        species: 'Dog',
        breed: 'German Shepherd',
        sex: 'male',
        birthDate: '2020-01-15',
        weightKg: 30.5
      };

      const result = createPatientBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject patient without required fields', () => {
      const invalidInput = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000'
        // missing name and species
      };

      const result = createPatientBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate alerts field', () => {
      const inputWithAlerts = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Max',
        species: 'Cat',
        alerts: {
          aggressive: true,
          allergies: ['chicken', 'beef'],
          anesthesia_risk: 'medium'
        }
      };

      const result = createPatientBodySchema.safeParse(inputWithAlerts);
      expect(result.success).toBe(true);
    });

    it('should reject invalid birthDate format', () => {
      const invalidInput = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Rex',
        species: 'Dog',
        birthDate: '15-01-2020' // wrong format
      };

      const result = createPatientBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative weight', () => {
      const invalidInput = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Rex',
        species: 'Dog',
        weightKg: -5
      };

      const result = createPatientBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('PATCH /patients/:id - update', () => {
    it('should validate partial update', () => {
      const validInput = {
        weightKg: 32.0
      };

      const result = updatePatientBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      const emptyInput = {};

      const result = updatePatientBodySchema.safeParse(emptyInput);
      expect(result.success).toBe(false);
    });
  });

  describe('GET /patients - list query', () => {
    it('should validate query with ownerId filter', () => {
      const query = {
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        species: 'Dog'
      };

      const result = listPatientsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe('Patient response schema', () => {
    it('should validate a valid patient response', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        ownerId: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Rex',
        species: 'Dog',
        breed: 'German Shepherd',
        alerts: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = patientResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Contract definition', () => {
    it('should have all required endpoints', () => {
      expect(patientsContract.create).toBeDefined();
      expect(patientsContract.getById).toBeDefined();
      expect(patientsContract.list).toBeDefined();
      expect(patientsContract.update).toBeDefined();
      expect(patientsContract.getSummary).toBeDefined();
    });
  });
});

/**
 * ==========================================
 * ENCOUNTERS CONTRACT TESTS
 * ==========================================
 */
describe('Encounters Contract', () => {
  describe('POST /encounters - create', () => {
    it('should validate a valid encounter create body', () => {
      const validInput = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Annual checkup'
      };

      const result = createEncounterBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate minimal encounter (only patientId)', () => {
      const minimalInput = {
        patientId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = createEncounterBodySchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject encounter without patientId', () => {
      const invalidInput = {
        reason: 'Checkup'
      };

      const result = createEncounterBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid patientId format', () => {
      const invalidInput = {
        patientId: 'not-a-uuid'
      };

      const result = createEncounterBodySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('POST /encounters/:id/close', () => {
    it('should validate close body with reason', () => {
      const validInput = {
        reason: 'Patient discharged'
      };

      const result = closeEncounterBodySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate empty close body', () => {
      const emptyInput = {};

      const result = closeEncounterBodySchema.safeParse(emptyInput);
      expect(result.success).toBe(true);
    });
  });

  describe('GET /encounters - list query', () => {
    it('should validate query with patientId filter', () => {
      const query = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        page: '1',
        pageSize: '10'
      };

      const result = listEncountersQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should apply default pagination', () => {
      const emptyQuery = {};

      const result = listEncountersQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });
  });

  describe('Encounter response schema', () => {
    it('should validate a valid encounter response', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        ownerId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'open',
        openedByUserId: '550e8400-e29b-41d4-a716-446655440004',
        openedAt: '2024-01-01T10:00:00Z',
        reason: 'Checkup',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const result = encounterResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate closed encounter', () => {
      const closedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        ownerId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'closed',
        openedByUserId: '550e8400-e29b-41d4-a716-446655440004',
        closedByUserId: '550e8400-e29b-41d4-a716-446655440005',
        openedAt: '2024-01-01T10:00:00Z',
        closedAt: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      const result = encounterResponseSchema.safeParse(closedResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Contract definition', () => {
    it('should have all required endpoints', () => {
      expect(encountersContract.create).toBeDefined();
      expect(encountersContract.getById).toBeDefined();
      expect(encountersContract.list).toBeDefined();
      expect(encountersContract.close).toBeDefined();
      expect(encountersContract.getTimeline).toBeDefined();
      expect(encounterBillingContract.getSummary).toBeDefined();
    });

    it('should have correct HTTP methods', () => {
      expect(encountersContract.create.method).toBe('POST');
      expect(encountersContract.getById.method).toBe('GET');
      expect(encountersContract.list.method).toBe('GET');
      expect(encountersContract.close.method).toBe('POST');
    });
  });
});

/**
 * ==========================================
 * API CONTRACT INTEGRATION TESTS
 * ==========================================
 */
describe('API Contract Integration', () => {
  it('should have all domains defined', () => {
    expect(apiContract.owners).toBeDefined();
    expect(apiContract.patients).toBeDefined();
    expect(apiContract.encounters).toBeDefined();
  });

  it('should have complete endpoint metadata', () => {
    expect(contractEndpoints.length).toBe(56);

    const availabilityEndpoints = contractEndpoints.filter(e => e.domain === 'availability');
    const typeConfigEndpoints = contractEndpoints.filter(e => e.domain === 'typeConfig');
    const appointmentEndpoints = contractEndpoints.filter(e => e.domain === 'appointments');
    const examOrderEndpoints = contractEndpoints.filter(e => e.domain === 'examOrders');
    const examResultEndpoints = contractEndpoints.filter(e => e.domain === 'examResults');
    const integrationEndpoints = contractEndpoints.filter(e => e.domain === 'integration');
    const ownersEndpoints = contractEndpoints.filter(e => e.domain === 'owners');
    const patientsEndpoints = contractEndpoints.filter(e => e.domain === 'patients');
    const encountersEndpoints = contractEndpoints.filter(e => e.domain === 'encounters');
    const encounterBillingEndpoints = contractEndpoints.filter(e => e.domain === 'encounterBilling');
    const encounterFinancialEndpoints = contractEndpoints.filter(e => e.domain === 'encounterFinancial');
    const productEndpoints = contractEndpoints.filter(e => e.domain === 'products');
    const serviceEndpoints = contractEndpoints.filter(e => e.domain === 'services');

    expect(availabilityEndpoints.length).toBe(5);
    expect(typeConfigEndpoints.length).toBe(5);
    expect(appointmentEndpoints.length).toBe(5);
    expect(examOrderEndpoints.length).toBe(4);
    expect(examResultEndpoints.length).toBe(4);
    expect(integrationEndpoints.length).toBe(3);
    expect(ownersEndpoints.length).toBe(5);
    expect(patientsEndpoints.length).toBe(5);
    expect(encountersEndpoints.length).toBe(5);
    expect(encounterBillingEndpoints.length).toBe(5);
    expect(encounterFinancialEndpoints.length).toBe(2);
    expect(productEndpoints.length).toBe(4);
    expect(serviceEndpoints.length).toBe(4);
  });

  it('should have consistent paths between contract and metadata', () => {
    for (const endpoint of contractEndpoints) {
      const contractEndpoint = apiContract[endpoint.domain as keyof typeof apiContract][endpoint.operation as keyof typeof apiContract.owners];
      expect(contractEndpoint.path).toBe(endpoint.path);
      expect(contractEndpoint.method).toBe(endpoint.method);
    }
  });
});

/**
 * ==========================================
 * CROSS-VALIDATION TESTS
 * ==========================================
 */
describe('Cross-Validation (his-api vs his-web)', () => {
  describe('Owner schemas consistency', () => {
    it('should have matching request/response field names', () => {
      // Fields that should exist in both create and response
      const sharedFields = ['fullName', 'document', 'email', 'phoneMain', 'phoneAlt', 'addressJson'];

      const createShape = createOwnerBodySchema.shape;
      const responseShape = ownerResponseSchema.shape;

      for (const field of sharedFields) {
        expect(createShape[field as keyof typeof createShape]).toBeDefined();
        expect(responseShape[field as keyof typeof responseShape]).toBeDefined();
      }
    });
  });

  describe('Patient schemas consistency', () => {
    it('should have matching request/response field names', () => {
      const sharedFields = ['ownerId', 'name', 'species', 'breed', 'sex', 'birthDate', 'weightKg', 'microchip', 'alerts'];

      const createShape = createPatientBodySchema.shape;
      const responseShape = patientResponseSchema.shape;

      for (const field of sharedFields) {
        expect(createShape[field as keyof typeof createShape]).toBeDefined();
        expect(responseShape[field as keyof typeof responseShape]).toBeDefined();
      }
    });
  });

  describe('Encounter schemas consistency', () => {
    it('should have matching request/response field names', () => {
      const sharedFields = ['patientId', 'reason'];

      const createShape = createEncounterBodySchema.shape;
      const responseShape = encounterResponseSchema.shape;

      for (const field of sharedFields) {
        expect(createShape[field as keyof typeof createShape]).toBeDefined();
        expect(responseShape[field as keyof typeof responseShape]).toBeDefined();
      }
    });
  });
});
