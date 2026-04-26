import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import {
  handleMeasurementUnitsRoutes,
  type MeasurementUnitItem,
  type MeasurementUnitPayload,
  type MeasurementUnitPersistence
} from './measurement-units-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly #headers = new Map<string, string>();

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>() {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: '11111111-1111-4111-8111-111111111111' as never,
      username: 'inventory',
      email: 'inventory@example.test',
      displayName: 'Estoque',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: '11111111-1111-4111-8111-111111111111' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['inventory'],
      permissionCodes: ['inventory.read', 'inventory.manage'],
      capabilities: []
    }
  };
}

function createMockRequest(method: string, url: string, body?: object): object {
  const bodyStr = body ? JSON.stringify(body) : '';
  const chunks: Buffer[] = bodyStr ? [Buffer.from(bodyStr)] : [];
  return {
    method,
    url,
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (chunks.length === 0) return { done: true, value: undefined };
        return { done: false, value: chunks.shift()! };
      }
    })
  };
}

function createAuditCollector() {
  const events: Array<{ action: string; payloadSummary: string }> = [];
  return {
    audit: {
      write: (event: { action: string; payloadSummary: string }) => {
        events.push({ action: event.action, payloadSummary: event.payloadSummary });
      }
    },
    events
  };
}

class InMemoryMeasurementUnitStore implements MeasurementUnitPersistence {
  readonly items: MeasurementUnitItem[] = [
    {
      id: 'mu-1',
      accountId: '11111111-1111-4111-8111-111111111111',
      code: 'UN',
      description: 'Unidade',
      decimalPlaces: 0,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'mu-2',
      accountId: '11111111-1111-4111-8111-111111111111',
      code: 'KG',
      description: 'Quilograma',
      decimalPlaces: 3,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ];

  async list(_accountId: string, filters = {}) {
    const search = String((filters as { search?: string }).search ?? '').toLowerCase();
    const precision = (filters as { precision?: string }).precision;
    return this.items.filter((item) => {
      const activeFilter = (filters as { active?: boolean }).active !== false ? item.active : true;
      const precisionFilter =
        precision === 'integer' ? item.decimalPlaces === 0 : precision === 'decimal' ? item.decimalPlaces > 0 : true;
      const searchFilter = !search || item.code.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
      return activeFilter && precisionFilter && searchFilter;
    });
  }

  async create(accountId: string, payload: MeasurementUnitPayload) {
    const item: MeasurementUnitItem = {
      id: 'mu-3',
      accountId,
      code: payload.code,
      description: payload.description,
      decimalPlaces: payload.decimalPlaces ?? 0,
      active: payload.active ?? true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    };
    this.items.unshift(item);
    return item;
  }

  async update(_accountId: string, unitId: string, payload: MeasurementUnitPayload) {
    const index = this.items.findIndex((item) => item.id === unitId);
    if (index < 0) throw new Error('Measurement unit not found');
    const previous = this.items[index]!;
    const item = {
      ...previous,
      code: payload.code,
      description: payload.description,
      decimalPlaces: payload.decimalPlaces ?? previous.decimalPlaces,
      active: payload.active ?? previous.active
    };
    this.items[index] = item;
    return { item, diffSummary: `description: ${previous.description} -> ${item.description}` };
  }

  async remove(_accountId: string, unitId: string) {
    const item = this.items.find((unit) => unit.id === unitId);
    if (!item) throw new Error('Measurement unit not found');
    item.active = false;
    return item;
  }
}

test('measurement unit routes list and filter Vetus-like units', async () => {
  const { audit, events } = createAuditCollector();
  const response = new MockResponse();
  const handled = await handleMeasurementUnitsRoutes(
    '/unidades-de-medida',
    createMockRequest('GET', '/unidades-de-medida?search=UN&precision=integer') as never,
    response as never,
    'corr-mu-1',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store: new InMemoryMeasurementUnitStore()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: MeasurementUnitItem[]; totalItems: number }>();
  assert.equal(body.totalItems, 1);
  assert.equal(body.items[0]?.code, 'UN');
  assert.equal(body.items[0]?.description, 'Unidade');
  assert.equal(events[0]?.action, 'list_measurement_units');
});

test('measurement unit routes create, update and archive records', async () => {
  const { audit, events } = createAuditCollector();
  const store = new InMemoryMeasurementUnitStore();

  const createResponse = new MockResponse();
  await handleMeasurementUnitsRoutes(
    '/measurement-units',
    createMockRequest('POST', '/measurement-units', {
      code: 'cx',
      description: 'Caixa',
      decimalPlaces: 0
    }) as never,
    createResponse as never,
    'corr-mu-2',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  const created = createResponse.bodyJson<MeasurementUnitItem>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(created.code, 'CX');

  const updateResponse = new MockResponse();
  await handleMeasurementUnitsRoutes(
    `/unidades-de-medida/${created.id}`,
    createMockRequest('PATCH', `/unidades-de-medida/${created.id}`, {
      code: 'CX',
      description: 'Caixa Fechada',
      decimalPlaces: 0
    }) as never,
    updateResponse as never,
    'corr-mu-3',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.bodyJson<MeasurementUnitItem>().description, 'Caixa Fechada');

  const deleteResponse = new MockResponse();
  await handleMeasurementUnitsRoutes(
    `/measurement-units/${created.id}`,
    createMockRequest('DELETE', `/measurement-units/${created.id}`) as never,
    deleteResponse as never,
    'corr-mu-4',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(deleteResponse.statusCode, 204);
  assert.deepEqual(
    events.map((event) => event.action),
    ['create_measurement_unit', 'update_measurement_unit', 'archive_measurement_unit']
  );
});
