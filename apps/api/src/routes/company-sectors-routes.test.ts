import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import {
  handleCompanySectorsRoutes,
  type CompanySectorItem,
  type CompanySectorPayload,
  type CompanySectorPersistence
} from './company-sectors-routes.js';

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

class InMemoryCompanySectorStore implements CompanySectorPersistence {
  readonly items: CompanySectorItem[] = [
    {
      id: 'sector-1',
      accountId: '11111111-1111-4111-8111-111111111111',
      code: 'EST',
      name: 'Estoque',
      kind: 'inventory',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ];

  async list(_accountId: string, filters = {}) {
    const search = String((filters as { search?: string }).search ?? '').toLowerCase();
    return this.items.filter((item) => {
      const activeFilter = (filters as { active?: boolean }).active !== false ? item.active : true;
      const searchFilter = !search || item.code.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
      return activeFilter && searchFilter;
    });
  }

  async create(accountId: string, payload: CompanySectorPayload) {
    const item: CompanySectorItem = {
      id: 'sector-2',
      accountId,
      code: payload.code,
      name: payload.name,
      kind: payload.kind ?? 'other',
      active: payload.active ?? true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    };
    this.items.unshift(item);
    return item;
  }

  async update(_accountId: string, sectorId: string, payload: CompanySectorPayload) {
    const index = this.items.findIndex((item) => item.id === sectorId);
    if (index < 0) throw new Error('Company sector not found');
    const previous = this.items[index]!;
    const item = {
      ...previous,
      code: payload.code,
      name: payload.name,
      kind: payload.kind ?? previous.kind,
      active: payload.active ?? previous.active
    };
    this.items[index] = item;
    return { item, diffSummary: `name: ${previous.name} -> ${item.name}` };
  }

  async remove(_accountId: string, sectorId: string) {
    const item = this.items.find((sector) => sector.id === sectorId);
    if (!item) throw new Error('Company sector not found');
    item.active = false;
    return item;
  }
}

test('company sector routes list and filter Vetus-like sectors', async () => {
  const { audit, events } = createAuditCollector();
  const response = new MockResponse();
  const handled = await handleCompanySectorsRoutes(
    '/setores',
    createMockRequest('GET', '/setores?search=EST') as never,
    response as never,
    'corr-sector-1',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store: new InMemoryCompanySectorStore()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: CompanySectorItem[]; totalItems: number }>();
  assert.equal(body.totalItems, 1);
  assert.equal(body.items[0]?.name, 'Estoque');
  assert.equal(events[0]?.action, 'list_company_sectors');
});

test('company sector routes create, update and archive records', async () => {
  const { audit, events } = createAuditCollector();
  const store = new InMemoryCompanySectorStore();

  const createResponse = new MockResponse();
  await handleCompanySectorsRoutes(
    '/company-sectors',
    createMockRequest('POST', '/company-sectors', { code: 'ADM', name: 'Administrativo', kind: 'administration' }) as never,
    createResponse as never,
    'corr-sector-2',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  const created = createResponse.bodyJson<CompanySectorItem>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(created.code, 'ADM');

  const updateResponse = new MockResponse();
  await handleCompanySectorsRoutes(
    `/setores/${created.id}`,
    createMockRequest('PATCH', `/setores/${created.id}`, { code: 'ADM', name: 'Administrativo CVG', kind: 'administration' }) as never,
    updateResponse as never,
    'corr-sector-3',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.bodyJson<CompanySectorItem>().name, 'Administrativo CVG');

  const deleteResponse = new MockResponse();
  await handleCompanySectorsRoutes(
    `/company-sectors/${created.id}`,
    createMockRequest('DELETE', `/company-sectors/${created.id}`) as never,
    deleteResponse as never,
    'corr-sector-4',
    {
      audit: audit as never,
      requirePrincipal: () => createPrincipal(),
      store
    }
  );
  assert.equal(deleteResponse.statusCode, 204);
  assert.deepEqual(
    events.map((event) => event.action),
    ['create_company_sector', 'update_company_sector', 'archive_company_sector']
  );
});
