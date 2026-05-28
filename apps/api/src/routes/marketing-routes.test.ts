import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuditService } from '@cvg-his-v2/module-audit';
import { MarketingService } from '@cvg-his-v2/module-marketing';
import type { AccountId, AuthenticatedPrincipal, UserId } from '@cvg-his-v2/shared-types';

import { handleMarketingRoutes } from './marketing-routes.js';
import { LocalSmsGateway } from '../sms-gateway.js';

const ACCOUNT = 'acc-marketing-route' as AccountId;
const USER = 'user-marketing-route' as UserId;

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

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

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/marketing/campaigns',
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: USER,
      accountId: ACCOUNT,
      username: 'marketing-user',
      email: 'marketing@example.com',
      displayName: 'Marketing User',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-marketing' as never,
      userId: USER,
      accountId: ACCOUNT,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['marketing.read', 'marketing.manage'],
      capabilities: []
    }
  };
}

function handlers(marketing = new MarketingService(), audit?: AuditService) {
  return {
    marketing,
    smsGateway: new LocalSmsGateway(),
    audit: audit ?? ({ write() {} } as unknown as AuditService),
    requirePrincipal: () => principal()
  };
}

test('handleMarketingRoutes ignores unrelated paths', async () => {
  const res = new MockResponse();
  const handled = await handleMarketingRoutes('/notifications', request('GET'), res as never, 'corr', handlers());
  assert.equal(handled, false);
});

test('handleMarketingRoutes exposes campaign planning lifecycle', async () => {
  const marketing = new MarketingService();
  const routeHandlers = handlers(marketing);

  const segmentResponse = new MockResponse();
  await handleMarketingRoutes(
    '/marketing/segments',
    request('POST', {
      name: 'VIP caninos',
      criteria: {
        ownerGroups: ['VIP'],
        consentPurpose: 'marketing',
        patientSpecies: ['Canina']
      }
    }, '/marketing/segments'),
    segmentResponse as never,
    'corr-segment',
    routeHandlers
  );
  assert.equal(segmentResponse.statusCode, 201);
  const segment = segmentResponse.bodyJson<{ id: string }>();

  const templateResponse = new MockResponse();
  await handleMarketingRoutes(
    '/marketing/templates',
    request('POST', {
      name: 'Vacina SMS',
      channel: 'sms',
      subject: 'Vacina',
      body: 'Ola {{ownerName}}, vacina de {{patientName}} pendente.'
    }, '/marketing/templates'),
    templateResponse as never,
    'corr-template',
    routeHandlers
  );
  assert.equal(templateResponse.statusCode, 201);
  const template = templateResponse.bodyJson<{ id: string }>();

  const campaignResponse = new MockResponse();
  await handleMarketingRoutes(
    '/marketing/campaigns',
    request('POST', {
      name: 'Campanha vacina',
      channel: 'sms',
      segmentId: segment.id,
      templateId: template.id,
      scheduledAt: '2026-05-30T12:00:00.000Z',
      audience: [
        {
          ownerId: 'owner-1',
          ownerName: 'Maria',
          ownerGroup: 'VIP',
          consentPurposes: ['marketing'],
          patientId: 'patient-1',
          patientName: 'Thor',
          patientSpecies: 'Canina',
          contacts: [{ type: 'sms', value: '5511999999999' }]
        }
      ]
    }),
    campaignResponse as never,
    'corr-campaign',
    routeHandlers
  );
  assert.equal(campaignResponse.statusCode, 201);
  const campaign = campaignResponse.bodyJson<{ id: string; estimatedAudience: number }>();
  assert.equal(campaign.estimatedAudience, 1);

  const scheduleResponse = new MockResponse();
  await handleMarketingRoutes(
    `/marketing/campaigns/${campaign.id}/schedule`,
    request('POST', undefined, `/marketing/campaigns/${campaign.id}/schedule`),
    scheduleResponse as never,
    'corr-schedule',
    routeHandlers
  );
  assert.equal(scheduleResponse.bodyJson<{ status: string }>().status, 'scheduled');

  const dispatchResponse = new MockResponse();
  await handleMarketingRoutes(
    `/marketing/campaigns/${campaign.id}/dispatch`,
    request('POST', {
      audience: [
        {
          ownerId: 'owner-1',
          ownerName: 'Maria',
          ownerGroup: 'VIP',
          consentPurposes: ['marketing'],
          patientId: 'patient-1',
          patientName: 'Thor',
          patientSpecies: 'Canina',
          contacts: [{ type: 'sms', value: '5511999999999' }]
        },
        {
          ownerId: 'owner-2',
          ownerName: 'Ana',
          ownerGroup: 'VIP',
          consentPurposes: ['marketing'],
          patientId: 'patient-2',
          patientName: 'Mia',
          patientSpecies: 'Canina',
          contacts: [{ type: 'sms', value: '5511000000000' }]
        }
      ]
    }, `/marketing/campaigns/${campaign.id}/dispatch`),
    dispatchResponse as never,
    'corr-dispatch',
    routeHandlers
  );
  const dispatch = dispatchResponse.bodyJson<{ summary: { sent: number; failed: number }; deliveries: unknown[] }>();
  assert.equal(dispatch.summary.sent, 1);
  assert.equal(dispatch.summary.failed, 1);
  assert.equal(dispatch.deliveries.length, 2);

  const deliveriesResponse = new MockResponse();
  await handleMarketingRoutes(
    `/marketing/campaigns/${campaign.id}/deliveries`,
    request('GET', undefined, `/marketing/campaigns/${campaign.id}/deliveries`),
    deliveriesResponse as never,
    'corr-deliveries',
    routeHandlers
  );
  assert.equal(deliveriesResponse.bodyJson<{ items: unknown[] }>().items.length, 2);

  const listResponse = new MockResponse();
  await handleMarketingRoutes(
    '/marketing/campaigns',
    request('GET', undefined, '/marketing/campaigns?status=sent'),
    listResponse as never,
    'corr-list',
    routeHandlers
  );
  assert.equal(listResponse.bodyJson<{ items: unknown[] }>().items.length, 1);
});
