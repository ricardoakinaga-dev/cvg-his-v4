import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { handleInventoryProductGroupsRoutes } from '../../../apps/api/src/routes/inventory-product-groups-routes';
import { handleAgendaConfigRoutes } from '../../../apps/api/src/routes/agenda-config-routes';
import { normalizeLaboratoryResultValues } from '../../../packages/modules/diagnostics/src/laboratory-result-values';
import { handleLaboratoryRoutes } from '../../../apps/api/src/routes/laboratory-routes';
import { handleMarketingRoutes } from '../../../apps/api/src/routes/marketing-routes';

const document = parse(readFileSync(resolve('apps/api/src/openapi.yaml'), 'utf8'));
type Schema = {
  $ref?: string;
  type?: string;
  nullable?: boolean;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
};
// Tests the schema vocabulary exercised by these real handler fixtures; unknown vocabulary is not used to waive failures.
function conforms(schema: Schema, value: unknown): boolean {
  if (value === null && schema.nullable) return true;
  if (schema.$ref)
    return conforms(document.components.schemas[schema.$ref.split('/').at(-1)!], value);
  if (schema.allOf && !schema.allOf.every((part) => conforms(part, value))) return false;
  if (schema.oneOf && schema.oneOf.filter((part) => conforms(part, value)).length !== 1)
    return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const object = value as Record<string, unknown>;
    if ((schema.required ?? []).some((name) => !(name in object))) return false;
    return Object.entries(schema.properties ?? {}).every(
      ([name, child]) => !(name in object) || conforms(child, object[name])
    );
  }
  if (schema.type === 'array')
    return (
      Array.isArray(value) &&
      (schema.maxItems === undefined || value.length <= schema.maxItems) &&
      value.every((entry) => conforms(schema.items!, entry))
    );
  if (schema.type === 'string') {
    return (
      typeof value === 'string' &&
      (schema.minLength === undefined || value.length >= schema.minLength) &&
      (schema.maxLength === undefined || value.length <= schema.maxLength) &&
      (!schema.pattern || new RegExp(schema.pattern).test(value))
    );
  }
  if (schema.type === 'integer' || schema.type === 'number')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (schema.type !== 'integer' || Number.isInteger(value)) &&
      (schema.minimum === undefined || value >= schema.minimum) &&
      (schema.maximum === undefined || value <= schema.maximum)
    );
  if (schema.type) return typeof value === schema.type;
  return Boolean(schema.allOf || schema.oneOf);
}
function responseSchema(path: string, method: string, status: number): Schema {
  return document.paths[path][method].responses[String(status)].content['application/json'].schema;
}
function mockResponse() {
  return {
    statusCode: 0,
    raw: '',
    setHeader() {},
    end(body = '') {
      this.raw = body;
    }
  };
}
function request(method: string, url: string, body?: unknown) {
  return Object.assign(
    Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]),
    { method, url }
  );
}
const accountId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const principal = { user: { id: '33333333-3333-4333-8333-333333333333', accountId } };
const audit = { write() {} };

describe('documented frontend operations agree with actual handler envelopes', () => {
  it('documents actual deliver/recollect handler envelopes and mandatory idempotency', async () => {
    for (const action of ['deliver', 'recollect']) {
      const path = `/laboratory/orders/order-1/${action}`;
      const documented = `/laboratory/orders/{orderId}/${action}`;
      const payload =
        action === 'deliver' ? { deliveryChannel: 'email' } : { reason: 'new sample' };
      const order = {
        id: 'order-1',
        accountId,
        encounterId: 'enc-1',
        patientId: 'patient-1',
        examType: 'HEM',
        reason: 'check',
        status: action === 'deliver' ? 'delivered' : 'collected',
        collectionAttempt: 1,
        workflowVersion: 2,
        history: [],
        createdAt: '2026-09-05T10:00:00Z',
        updatedAt: '2026-09-05T10:00:00Z'
      };
      const handlers = {
        audit,
        requirePrincipal: () => principal,
        laboratory: {
          transitionOrderAndPersistForAccount: async () => order,
          recollectOrderAndPersistForAccount: async () => order
        }
      };
      const response = mockResponse();
      await expect(
        handleLaboratoryRoutes(
          path,
          request('POST', path, payload) as never,
          response as never,
          'contract',
          handlers as never
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
      const req = Object.assign(request('POST', path, payload), {
        headers: { 'idempotency-key': 'contract-' + action }
      });
      expect(
        await handleLaboratoryRoutes(
          path,
          req as never,
          response as never,
          'contract',
          handlers as never
        )
      ).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(conforms(responseSchema(documented, 'post', 200), JSON.parse(response.raw))).toBe(
        true
      );
      expect(
        document.paths[documented].post.parameters.find(
          (p: { name: string }) => p.name === 'Idempotency-Key'
        ).required
      ).toBe(true);
      expect(Object.keys(document.paths[documented].post.responses)).toEqual(
        expect.arrayContaining(['400', '404', '409'])
      );
    }
  });
  it('matches actual structured laboratory result validation instead of accepting object maps', () => {
    const schema =
      document.paths['/exam-results/{examResultId}'].patch.requestBody.content['application/json']
        .schema.properties.resultValues;
    const valid = [{ parameter: 'Hematocrit', value: '40', unit: '%' }];
    expect(conforms(schema, valid)).toBe(true);
    expect(normalizeLaboratoryResultValues(valid)).toEqual(valid);
    for (const invalid of [
      { Hematocrit: 40 },
      [{ parameter: 'x', value: 'bad\u0000' }],
      Array.from({ length: 201 }, () => valid[0])
    ]) {
      expect(conforms(schema, invalid)).toBe(false);
      expect(() => normalizeLaboratoryResultValues(invalid)).toThrow();
    }
  });
  it('matches actual agenda rejection and acceptance at numeric and string boundaries', async () => {
    const handlers = {
      audit,
      requirePrincipal: () => principal,
      repository: {
        createAvailability: async (value: unknown) => value,
        createAppointmentType: async (value: unknown) => value
      }
    };
    const cases = [
      ['/availability', { professionalUserId: 'doctor', dayOfWeek: 1.5 }, false],
      ['/availability', { professionalUserId: 'doctor', dayOfWeek: 7 }, false],
      [
        '/availability',
        { professionalUserId: 'doctor', dayOfWeek: 6, slotDurationMinutes: 5 },
        true
      ],
      ['/availability', { professionalUserId: 'doctor', slotDurationMinutes: 4 }, false],
      ['/availability', { professionalUserId: 'doctor', startTime: '24:00' }, false],
      ['/availability', { professionalUserId: 'doctor', notes: 'x'.repeat(1001) }, false],
      ['/appointment-types', { code: '!', name: 'ok' }, false],
      ['/appointment-types', { code: 'A', name: 'ok' }, false],
      ['/appointment-types', { code: 'A'.repeat(65), name: 'ok' }, false],
      ['/appointment-types', { code: 'ab_2', name: 'ok', defaultDurationMinutes: 480 }, true],
      ['/appointment-types', { code: 'AB', name: 'ok', defaultDurationMinutes: 5.5 }, false],
      ['/appointment-types', { code: 'AB', name: 'ok', color: '#zzzzzz' }, false]
    ] as const;
    for (const [path, payload, valid] of cases) {
      const schema = document.paths[path].post.requestBody.content['application/json'].schema;
      expect(conforms(schema, payload), JSON.stringify(payload)).toBe(valid);
      const response = mockResponse();
      const invocation = handleAgendaConfigRoutes(
        path,
        request('POST', path, payload) as never,
        response as never,
        'contract',
        handlers as never
      );
      if (valid) {
        await invocation;
        expect(response.statusCode).toBe(201);
      } else await expect(invocation).rejects.toMatchObject({ name: 'ValidationError' });
    }
  });
  it('rejects blank and oversized catalog descriptions and requires an exam name alias', () => {
    const payload = document.components.schemas.InventoryProductGroupPayload;
    for (const description of ['', '   ', 'x'.repeat(161)]) {
      expect(conforms(payload, { description })).toBe(false);
    }
    expect(conforms(payload, { description: 'Materiais' })).toBe(true);
    expect(
      document.paths['/exam-orders'].post.requestBody.content['application/json'].schema.anyOf
    ).toEqual([{ required: ['examName'] }, { required: ['examType'] }]);
  });
  it('checks real catalog list/create/archive responses and rejects a missing totalItems envelope', async () => {
    const item = {
      id: 'group-1',
      accountId,
      displayId: 1,
      description: 'Materiais',
      active: true,
      createdAt: '2026-09-05T10:00:00Z',
      updatedAt: '2026-09-05T10:00:00Z'
    };
    const handlers = {
      audit,
      requirePrincipal: () => principal,
      store: {
        list: async () => [item],
        create: async () => item,
        remove: async () => ({ ...item, active: false })
      }
    };
    for (const [method, path, documentedPath, body, status] of [
      ['GET', '/product-groups', '/product-groups', undefined, 200],
      ['POST', '/product-groups', '/product-groups', { description: 'Materiais' }, 201],
      ['DELETE', '/product-groups/group-1', '/product-groups/{id}', undefined, 204]
    ] as const) {
      const response = mockResponse();
      expect(
        await handleInventoryProductGroupsRoutes(
          path,
          request(method, path, body) as never,
          response as never,
          'contract',
          handlers as never
        )
      ).toBe(true);
      expect(response.statusCode).toBe(status);
      if (status === 204) {
        expect(response.raw).toBe('');
        expect(
          document.paths[documentedPath][method.toLowerCase()].responses['204'].content
        ).toBeUndefined();
      } else
        expect(
          conforms(
            responseSchema(documentedPath, method.toLowerCase(), status),
            JSON.parse(response.raw)
          )
        ).toBe(true);
    }
    expect(conforms(responseSchema('/product-groups', 'get', 200), { items: [item] })).toBe(false);
    expect(
      conforms(document.components.schemas.InventoryProductGroupPayload, { active: true })
    ).toBe(false);
  });

  it('checks the real consent GET wrapper and direct POST response separately', async () => {
    const consent = {
      id: 'consent-1',
      accountId,
      ownerId,
      purpose: 'marketing',
      status: 'granted',
      updatedByUserId: principal.user.id,
      updatedAt: '2026-09-05T10:00:00Z'
    };
    const handlers = {
      audit,
      requirePrincipal: () => principal,
      marketing: { getConsent: async () => consent, setConsent: async () => consent }
    };
    for (const method of ['GET', 'POST'] as const) {
      const path = method === 'GET' ? '/marketing/consent' : '/marketing/consent/opt-in';
      const response = mockResponse();
      expect(
        await handleMarketingRoutes(
          path,
          request(
            method,
            `${path}?ownerId=${ownerId}`,
            method === 'POST' ? { ownerId } : undefined
          ) as never,
          response as never,
          'contract',
          handlers as never
        )
      ).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(
        conforms(responseSchema(path, method.toLowerCase(), 200), JSON.parse(response.raw))
      ).toBe(true);
    }
    expect(conforms(responseSchema('/marketing/consent', 'get', 200), consent)).toBe(false);
    expect(conforms(responseSchema('/marketing/consent/opt-in', 'post', 200), { consent })).toBe(
      false
    );
  });

  it('documents start-encounter reuse versus creation and required scheduling query identities', () => {
    const start = document.paths['/appointments/{appointmentId}/start-encounter'].post;
    expect(start.responses['200'].content).toEqual(start.responses['201'].content);
    const parameters = document.paths['/scheduling/availability'].get.parameters;
    expect(
      parameters
        .filter((p: { required: boolean }) => p.required)
        .map((p: { name: string }) => p.name)
    ).toEqual(['patientId', 'scheduledAt']);
    expect(parameters.map((p: { name: string }) => p.name)).toContain('ignoreAppointmentId');
  });
});
