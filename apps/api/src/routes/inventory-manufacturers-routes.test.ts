import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import {
  handleInventoryManufacturersRoutes,
  type InventoryManufacturerItem,
  type InventoryManufacturerPayload,
  type InventoryManufacturerPersistence
} from './inventory-manufacturers-routes.js';

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

class InMemoryManufacturerStore implements InventoryManufacturerPersistence {
  readonly items: InventoryManufacturerItem[] = [
    {
      id: 'mf-1',
      accountId: '11111111-1111-4111-8111-111111111111',
      displayId: 17,
      name: 'Fabricante CVG',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ];

  async list(_accountId: string, filters = {}) {
    const search = String((filters as { search?: string }).search ?? '').toLowerCase();
    return this.items.filter((item) => {
      const activeFilter = (filters as { active?: boolean }).active !== false ? item.active : true;
      const searchFilter = !search || item.name.toLowerCase().includes(search) || String(item.displayId).includes(search);
      return activeFilter && searchFilter;
    });
  }

  async create(accountId: string, payload: InventoryManufacturerPayload) {
    const item: InventoryManufacturerItem = {
      id: 'mf-2',
      accountId,
      displayId: 18,
      name: payload.name,
      active: payload.active ?? true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    };
    this.items.unshift(item);
    return item;
  }

  async update(_accountId: string, manufacturerId: string, payload: InventoryManufacturerPayload) {
    const index = this.items.findIndex((item) => item.id === manufacturerId);
    if (index < 0) throw new Error('Manufacturer not found');
    const previous = this.items[index]!;
    const item = { ...previous, name: payload.name, active: payload.active ?? previous.active };
    this.items[index] = item;
    return { item, diffSummary: `name: ${previous.name} -> ${item.name}` };
  }

  async remove(_accountId: string, manufacturerId: string) {
    const item = this.items.find((manufacturer) => manufacturer.id === manufacturerId);
    if (!item) throw new Error('Manufacturer not found');
    item.active = false;
    return item;
  }
}

test('inventory manufacturer routes list and filter Vetus-like manufacturers', async () => {
  const { audit, events } = createAuditCollector();
  const response = new MockResponse();
  const handled = await handleInventoryManufacturersRoutes(
    '/fabricantes',
    createMockRequest('GET', '/fabricantes?search=17') as never,
    response as never,
    'corr-mf-1',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store: new InMemoryManufacturerStore()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: InventoryManufacturerItem[]; totalItems: number }>();
  assert.equal(body.totalItems, 1);
  assert.equal(body.items[0]?.name, 'Fabricante CVG');
  assert.equal(events[0]?.action, 'list_manufacturers');
});

test('inventory manufacturer routes create, update and archive records', async () => {
  const { audit, events } = createAuditCollector();
  const store = new InMemoryManufacturerStore();

  const createResponse = new MockResponse();
  await handleInventoryManufacturersRoutes(
    '/manufacturers',
    createMockRequest('POST', '/manufacturers', { name: 'Laboratorio CVG' }) as never,
    createResponse as never,
    'corr-mf-2',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  const created = createResponse.bodyJson<InventoryManufacturerItem>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(created.displayId, 18);

  const updateResponse = new MockResponse();
  await handleInventoryManufacturersRoutes(
    `/fabricantes/${created.id}`,
    createMockRequest('PATCH', `/fabricantes/${created.id}`, { name: 'Laboratorio CVG Premium' }) as never,
    updateResponse as never,
    'corr-mf-3',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.bodyJson<InventoryManufacturerItem>().name, 'Laboratorio CVG Premium');

  const deleteResponse = new MockResponse();
  await handleInventoryManufacturersRoutes(
    `/manufacturers/${created.id}`,
    createMockRequest('DELETE', `/manufacturers/${created.id}`) as never,
    deleteResponse as never,
    'corr-mf-4',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(deleteResponse.statusCode, 204);
  assert.deepEqual(
    events.map((event) => event.action),
    ['create_manufacturer', 'update_manufacturer', 'archive_manufacturer']
  );
});
