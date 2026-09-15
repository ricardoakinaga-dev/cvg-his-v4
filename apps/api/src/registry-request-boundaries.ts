import type {
  CreateOwnerPatientLinkRequest,
  CreateOwnerRequest,
  CreatePatientRequest,
  MergePatientRequest,
  UpdateOwnerPatientLinkRequest,
  UpdateOwnerRequest,
  UpdatePatientRequest
} from '@cvg-his-v2/shared-contracts';
import { ValidationError } from '@cvg-his-v2/shared-errors';

type JsonObject = Record<string, unknown>;

const OWNER_STATUSES = ['active', 'inactive'] as const;
const PATIENT_STATUSES = ['active', 'inactive', 'deceased'] as const;
const PATIENT_SEXES = ['male', 'female', 'unknown'] as const;
const PATIENT_SIZES = ['small', 'medium', 'large'] as const;
const CONTACT_TYPES = ['phone', 'email', 'whatsapp'] as const;
const RELATIONSHIP_TYPES = ['primary', 'secondary', 'financial', 'authorized', 'spouse'] as const;

function fail(field: string, message: string, correlationId: string): never {
  throw new ValidationError(message, { correlationId, field });
}

function object(value: unknown, field: string, correlationId: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail(field, `${field} must be an object`, correlationId);
  }
  return value as JsonObject;
}

function requiredString(value: unknown, field: string, correlationId: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(field, `${field} must be a non-empty string`, correlationId);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, correlationId: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, field, correlationId);
}

function optionalBoolean(value: unknown, field: string, correlationId: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') return fail(field, `${field} must be a boolean`, correlationId);
  return value;
}

function requiredBoolean(value: unknown, field: string, correlationId: string): boolean {
  const result = optionalBoolean(value, field, correlationId);
  if (result === undefined) return fail(field, `${field} is required`, correlationId);
  return result;
}

function optionalFiniteNumber(value: unknown, field: string, correlationId: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(field, `${field} must be a finite number`, correlationId);
  }
  return value;
}

function optionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  correlationId: string
): T | undefined {
  if (value === undefined) return undefined;
  const resolved = requiredString(value, field, correlationId) as T;
  if (!allowed.includes(resolved)) {
    return fail(field, `${field} must be one of: ${allowed.join(', ')}`, correlationId);
  }
  return resolved;
}

function requiredEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  correlationId: string
): T {
  const resolved = optionalEnum(value, field, allowed, correlationId);
  if (resolved === undefined) return fail(field, `${field} is required`, correlationId);
  return resolved;
}

function optionalObject(value: unknown, field: string, correlationId: string): JsonObject | undefined {
  if (value === undefined) return undefined;
  return object(value, field, correlationId);
}

function requirePatchField(body: JsonObject, fields: readonly string[], correlationId: string): void {
  if (!fields.some((field) => body[field] !== undefined)) {
    fail('body', 'At least one supported field is required', correlationId);
  }
}

function parseContact(value: unknown, index: number, correlationId: string) {
  const contact = object(value, `contacts[${index}]`, correlationId);
  const type = requiredEnum(contact.type, `contacts[${index}].type`, CONTACT_TYPES, correlationId);
  const primary = optionalBoolean(contact.primary, `contacts[${index}].primary`, correlationId);
  return {
    label: requiredString(contact.label, `contacts[${index}].label`, correlationId),
    value: requiredString(contact.value, `contacts[${index}].value`, correlationId),
    type,
    ...(primary === undefined ? {} : { primary })
  };
}

function parseContacts(value: unknown, correlationId: string) {
  if (!Array.isArray(value) || value.length === 0) {
    fail('contacts', 'contacts must contain at least one item', correlationId);
  }
  return value.map((contact, index) => parseContact(contact, index, correlationId));
}

function parseAddress(value: unknown, correlationId: string): CreateOwnerRequest['address'] {
  const address = optionalObject(value, 'address', correlationId);
  if (!address) return undefined;
  return {
    ...(optionalString(address.zipCode, 'address.zipCode', correlationId) === undefined
      ? {}
      : { zipCode: optionalString(address.zipCode, 'address.zipCode', correlationId) }),
    ...(optionalString(address.street, 'address.street', correlationId) === undefined
      ? {}
      : { street: optionalString(address.street, 'address.street', correlationId) }),
    ...(optionalString(address.number, 'address.number', correlationId) === undefined
      ? {}
      : { number: optionalString(address.number, 'address.number', correlationId) }),
    ...(optionalString(address.complement, 'address.complement', correlationId) === undefined
      ? {}
      : { complement: optionalString(address.complement, 'address.complement', correlationId) }),
    ...(optionalString(address.state, 'address.state', correlationId) === undefined
      ? {}
      : { state: optionalString(address.state, 'address.state', correlationId) }),
    ...(optionalString(address.city, 'address.city', correlationId) === undefined
      ? {}
      : { city: optionalString(address.city, 'address.city', correlationId) }),
    ...(optionalString(address.district, 'address.district', correlationId) === undefined
      ? {}
      : { district: optionalString(address.district, 'address.district', correlationId) }),
    ...(optionalString(address.reference, 'address.reference', correlationId) === undefined
      ? {}
      : { reference: optionalString(address.reference, 'address.reference', correlationId) }),
    ...(optionalString(address.cityCode, 'address.cityCode', correlationId) === undefined
      ? {}
      : { cityCode: optionalString(address.cityCode, 'address.cityCode', correlationId) })
  };
}

function parseProfile(value: unknown, correlationId: string): CreateOwnerRequest['profile'] {
  const profile = optionalObject(value, 'profile', correlationId);
  if (!profile) return undefined;
  return {
    ...(optionalString(profile.birthDate, 'profile.birthDate', correlationId) === undefined
      ? {}
      : { birthDate: optionalString(profile.birthDate, 'profile.birthDate', correlationId) }),
    ...(optionalEnum(profile.sex, 'profile.sex', ['female', 'male', 'other', 'unknown'], correlationId) === undefined
      ? {}
      : { sex: optionalEnum(profile.sex, 'profile.sex', ['female', 'male', 'other', 'unknown'], correlationId) }),
    ...(optionalString(profile.group, 'profile.group', correlationId) === undefined
      ? {}
      : { group: optionalString(profile.group, 'profile.group', correlationId) }),
    ...(optionalBoolean(profile.receiveSms, 'profile.receiveSms', correlationId) === undefined
      ? {}
      : { receiveSms: optionalBoolean(profile.receiveSms, 'profile.receiveSms', correlationId) }),
    ...(optionalEnum(profile.personType, 'profile.personType', ['individual', 'company'], correlationId) === undefined
      ? {}
      : { personType: optionalEnum(profile.personType, 'profile.personType', ['individual', 'company'], correlationId) }),
    ...(optionalString(profile.rg, 'profile.rg', correlationId) === undefined
      ? {}
      : { rg: optionalString(profile.rg, 'profile.rg', correlationId) })
  };
}

function parseFinancialProfile(
  value: unknown,
  correlationId: string
): CreateOwnerRequest['financialProfile'] {
  const profile = optionalObject(value, 'financialProfile', correlationId);
  if (!profile) return undefined;
  return {
    ...(optionalFiniteNumber(profile.allowedDebtLimit, 'financialProfile.allowedDebtLimit', correlationId) === undefined
      ? {}
      : { allowedDebtLimit: optionalFiniteNumber(profile.allowedDebtLimit, 'financialProfile.allowedDebtLimit', correlationId) }),
    ...(optionalFiniteNumber(profile.creditBalance, 'financialProfile.creditBalance', correlationId) === undefined
      ? {}
      : { creditBalance: optionalFiniteNumber(profile.creditBalance, 'financialProfile.creditBalance', correlationId) }),
    ...(optionalFiniteNumber(profile.availablePoints, 'financialProfile.availablePoints', correlationId) === undefined
      ? {}
      : { availablePoints: optionalFiniteNumber(profile.availablePoints, 'financialProfile.availablePoints', correlationId) }),
    ...(optionalFiniteNumber(profile.blockedPoints, 'financialProfile.blockedPoints', correlationId) === undefined
      ? {}
      : { blockedPoints: optionalFiniteNumber(profile.blockedPoints, 'financialProfile.blockedPoints', correlationId) })
  };
}

const OWNER_PATCH_FIELDS = [
  'fullName',
  'documentId',
  'contacts',
  'address',
  'profile',
  'financialProfile',
  'financialResponsible',
  'administrativeNotes',
  'legacyVetusId',
  'originalCreatedAt',
  'status'
] as const;

const PATIENT_PATCH_FIELDS = [
  'name',
  'species',
  'breed',
  'sex',
  'size',
  'birthDateApproximate',
  'baseWeightKg',
  'primaryOwnerId',
  'isNeutered',
  'microchip',
  'pedigreeNumber',
  'color',
  'chronicDisease',
  'allergy',
  'temperament',
  'generalNotes',
  'legacyVetusId',
  'originalCreatedAt',
  'status'
] as const;

function parseOwnerFields(body: JsonObject, correlationId: string) {
  const contacts = body.contacts === undefined ? undefined : parseContacts(body.contacts, correlationId);
  const financialResponsible = optionalBoolean(body.financialResponsible, 'financialResponsible', correlationId);
  return {
    ...(body.fullName === undefined ? {} : { fullName: requiredString(body.fullName, 'fullName', correlationId) }),
    ...(body.documentId === undefined ? {} : { documentId: optionalString(body.documentId, 'documentId', correlationId) }),
    ...(contacts === undefined ? {} : { contacts }),
    ...(body.address === undefined ? {} : { address: parseAddress(body.address, correlationId) }),
    ...(body.profile === undefined ? {} : { profile: parseProfile(body.profile, correlationId) }),
    ...(body.financialProfile === undefined ? {} : { financialProfile: parseFinancialProfile(body.financialProfile, correlationId) }),
    ...(financialResponsible === undefined ? {} : { financialResponsible }),
    ...(body.administrativeNotes === undefined ? {} : { administrativeNotes: optionalString(body.administrativeNotes, 'administrativeNotes', correlationId) }),
    ...(body.legacyVetusId === undefined ? {} : { legacyVetusId: optionalString(body.legacyVetusId, 'legacyVetusId', correlationId) }),
    ...(body.originalCreatedAt === undefined ? {} : { originalCreatedAt: optionalString(body.originalCreatedAt, 'originalCreatedAt', correlationId) }),
    ...(body.status === undefined ? {} : { status: optionalEnum(body.status, 'status', OWNER_STATUSES, correlationId) })
  };
}

export function parseCreateOwnerRequest(value: unknown, correlationId: string): CreateOwnerRequest {
  const body = object(value, 'body', correlationId);
  const parsed = parseOwnerFields(body, correlationId);
  requiredString(parsed.fullName, 'fullName', correlationId);
  if (!parsed.contacts) fail('contacts', 'contacts is required', correlationId);
  requiredBoolean(parsed.financialResponsible, 'financialResponsible', correlationId);
  return parsed as CreateOwnerRequest;
}

export function parseUpdateOwnerRequest(value: unknown, correlationId: string): UpdateOwnerRequest {
  const body = object(value, 'body', correlationId);
  requirePatchField(body, OWNER_PATCH_FIELDS, correlationId);
  return parseOwnerFields(body, correlationId) as UpdateOwnerRequest;
}

function parsePatientFields(body: JsonObject, correlationId: string) {
  const baseWeightKg = optionalFiniteNumber(body.baseWeightKg, 'baseWeightKg', correlationId);
  return {
    ...(body.name === undefined ? {} : { name: requiredString(body.name, 'name', correlationId) }),
    ...(body.species === undefined ? {} : { species: requiredString(body.species, 'species', correlationId) }),
    ...(body.breed === undefined ? {} : { breed: optionalString(body.breed, 'breed', correlationId) }),
    ...(body.sex === undefined ? {} : { sex: optionalEnum(body.sex, 'sex', PATIENT_SEXES, correlationId) }),
    ...(body.size === undefined ? {} : { size: optionalEnum(body.size, 'size', PATIENT_SIZES, correlationId) }),
    ...(body.birthDateApproximate === undefined ? {} : { birthDateApproximate: optionalString(body.birthDateApproximate, 'birthDateApproximate', correlationId) }),
    ...(baseWeightKg === undefined ? {} : { baseWeightKg }),
    ...(body.primaryOwnerId === undefined ? {} : { primaryOwnerId: requiredString(body.primaryOwnerId, 'primaryOwnerId', correlationId) }),
    ...(body.isNeutered === undefined ? {} : { isNeutered: optionalBoolean(body.isNeutered, 'isNeutered', correlationId) }),
    ...(body.microchip === undefined ? {} : { microchip: optionalString(body.microchip, 'microchip', correlationId) }),
    ...(body.pedigreeNumber === undefined ? {} : { pedigreeNumber: optionalString(body.pedigreeNumber, 'pedigreeNumber', correlationId) }),
    ...(body.color === undefined ? {} : { color: optionalString(body.color, 'color', correlationId) }),
    ...(body.chronicDisease === undefined ? {} : { chronicDisease: optionalString(body.chronicDisease, 'chronicDisease', correlationId) }),
    ...(body.allergy === undefined ? {} : { allergy: optionalString(body.allergy, 'allergy', correlationId) }),
    ...(body.temperament === undefined ? {} : { temperament: optionalString(body.temperament, 'temperament', correlationId) }),
    ...(body.generalNotes === undefined ? {} : { generalNotes: optionalString(body.generalNotes, 'generalNotes', correlationId) }),
    ...(body.legacyVetusId === undefined ? {} : { legacyVetusId: optionalString(body.legacyVetusId, 'legacyVetusId', correlationId) }),
    ...(body.originalCreatedAt === undefined ? {} : { originalCreatedAt: optionalString(body.originalCreatedAt, 'originalCreatedAt', correlationId) }),
    ...(body.status === undefined ? {} : { status: optionalEnum(body.status, 'status', PATIENT_STATUSES, correlationId) })
  };
}

export function parseCreatePatientRequest(value: unknown, correlationId: string): CreatePatientRequest {
  const body = object(value, 'body', correlationId);
  const parsed = parsePatientFields(body, correlationId);
  requiredString(parsed.name, 'name', correlationId);
  requiredString(parsed.species, 'species', correlationId);
  requiredString(parsed.primaryOwnerId, 'primaryOwnerId', correlationId);
  if (!parsed.sex) fail('sex', 'sex is required', correlationId);
  return parsed as CreatePatientRequest;
}

export function parseUpdatePatientRequest(value: unknown, correlationId: string): UpdatePatientRequest {
  const body = object(value, 'body', correlationId);
  requirePatchField(body, PATIENT_PATCH_FIELDS, correlationId);
  return parsePatientFields(body, correlationId) as UpdatePatientRequest;
}

export function parseCreateOwnerPatientLinkRequest(
  value: unknown,
  correlationId: string
): CreateOwnerPatientLinkRequest {
  const body = object(value, 'body', correlationId);
  return {
    ownerId: requiredString(body.ownerId, 'ownerId', correlationId),
    patientId: requiredString(body.patientId, 'patientId', correlationId),
    relationshipType: requiredEnum(
      body.relationshipType,
      'relationshipType',
      RELATIONSHIP_TYPES,
      correlationId
    ) as CreateOwnerPatientLinkRequest['relationshipType'],
    financialResponsible: requiredBoolean(body.financialResponsible, 'financialResponsible', correlationId)
  };
}

export function parseUpdateOwnerPatientLinkRequest(
  value: unknown,
  correlationId: string
): UpdateOwnerPatientLinkRequest {
  const body = object(value, 'body', correlationId);
  requirePatchField(body, ['financialResponsible'], correlationId);
  return {
    financialResponsible: requiredBoolean(body.financialResponsible, 'financialResponsible', correlationId)
  };
}

export function parseMergePatientRequest(value: unknown, correlationId: string): MergePatientRequest {
  const body = object(value, 'body', correlationId);
  return {
    targetPatientId: requiredString(body.targetPatientId, 'targetPatientId', correlationId),
    reason: requiredString(body.reason, 'reason', correlationId)
  };
}
