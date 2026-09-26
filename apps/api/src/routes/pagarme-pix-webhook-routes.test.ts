import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { PagarMePixChargeClient, PagarMePixChargeLookupError } from '../pagarme-pix-charge-client.js';
import {
  handlePagarMePixWebhookRoutes,
  PAGARME_PIX_WEBHOOK_PATH
} from './pagarme-pix-webhook-routes.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const ATTEMPT_ID = '00000000-0000-4000-8000-000000000002';

function request(body: unknown) {
  const stream = Readable.from([Buffer.from(JSON.stringify(body))]) as Readable & Record<string, unknown>;
  stream.method = 'POST';
  stream.url = PAGARME_PIX_WEBHOOK_PATH;
  stream.headers = { 'content-type': 'application/json' };
  stream.socket = { remoteAddress: '203.0.113.10' };
  return stream as never;
}

function response() {
  const state = { statusCode: 0, body: '' };
  return {
    state,
    res: {
      set statusCode(value: number) {
        state.statusCode = value;
      },
      get statusCode() {
        return state.statusCode;
      },
      setHeader() {},
      end(chunk?: string) {
        state.body = chunk ?? '';
      }
    } as never
  };
}

function paidCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qr_123',
    status: 'paid',
    amountCents: 15_000,
    paidAt: '2026-10-01T12:05:00Z',
    metadata: { cvg_account_id: ACCOUNT_ID, cvg_attempt_id: ATTEMPT_ID },
    ...overrides
  };
}

test('a paid charge re-read from the provider becomes a pagarme receipt; the body is only a hint', async () => {
  const persisted: unknown[] = [];
  const lookedUp: string[] = [];
  const { res, state } = response();

  await handlePagarMePixWebhookRoutes(
    PAGARME_PIX_WEBHOOK_PATH,
    // A forged body claiming another amount/account is ignored: only the id is used.
    request({ data: { id: 'qr_123', amount: 1, metadata: { cvg_account_id: 'attacker' } } }),
    res,
    'corr-1',
    {
      client: {
        getCharge: async (id) => {
          lookedUp.push(id);
          return paidCharge();
        }
      },
      repository: {
        persist: async (input) => {
          persisted.push(input);
          return { status: 'created', eventId: 'evt', deliveryId: 'dlv' };
        }
      }
    }
  );

  assert.equal(state.statusCode, 202);
  assert.deepEqual(lookedUp, ['qr_123']);
  const receipt = persisted[0] as { provider: string; claims: Record<string, unknown>; providerEventId: string; rawBody: Buffer };
  assert.equal(receipt.provider, 'pagarme');
  assert.equal(receipt.providerEventId, 'pagarme-paid-qr_123');
  assert.deepEqual(receipt.claims, {
    type: 'pix.payment.confirmed.v1',
    accountId: ACCOUNT_ID,
    attemptId: ATTEMPT_ID,
    providerTransactionId: 'qr_123',
    amountCents: 15_000,
    currency: 'BRL',
    confirmedAt: '2026-10-01T12:05:00.000Z'
  });
  assert.deepEqual(JSON.parse(receipt.rawBody.toString('utf8')), receipt.claims);
});

test('unpaid, unknown or foreign charges are acknowledged without effect', async () => {
  for (const charge of [
    null,
    paidCharge({ status: 'pending' }),
    paidCharge({ metadata: {} }),
    paidCharge({ amountCents: null }),
    paidCharge({ paidAt: null })
  ]) {
    let persisted = 0;
    const { res, state } = response();
    await handlePagarMePixWebhookRoutes(PAGARME_PIX_WEBHOOK_PATH, request({ id: 'qr_123' }), res, 'corr', {
      client: { getCharge: async () => charge as never },
      repository: {
        persist: async () => {
          persisted += 1;
          return { status: 'created', eventId: 'e', deliveryId: 'd' };
        }
      }
    });
    assert.equal(state.statusCode, 202);
    assert.equal(persisted, 0);
  }
});

test('provider lookup failures ask the provider to retry and bodies without an id are rejected', async () => {
  const failing = response();
  await handlePagarMePixWebhookRoutes(PAGARME_PIX_WEBHOOK_PATH, request({ id: 'qr_1' }), failing.res, 'c', {
    client: {
      getCharge: async () => {
        throw new PagarMePixChargeLookupError('HTTP 503', true);
      }
    },
    repository: { persist: async () => ({ status: 'created', eventId: 'e', deliveryId: 'd' }) }
  });
  assert.equal(failing.state.statusCode, 502);

  const invalid = response();
  await handlePagarMePixWebhookRoutes(PAGARME_PIX_WEBHOOK_PATH, request({ nothing: true }), invalid.res, 'c', {
    client: { getCharge: async () => null },
    repository: { persist: async () => ({ status: 'created', eventId: 'e', deliveryId: 'd' }) }
  });
  assert.equal(invalid.state.statusCode, 400);
});

test('the charge client authenticates, maps the provider shape and treats 404 as unknown', async () => {
  const seen: Array<{ url: string; auth: string | null }> = [];
  const client = new PagarMePixChargeClient({
    apiKey: 'sk_test',
    baseUrl: 'https://pagarme.test/',
    fetchImpl: (async (url: string, init: RequestInit) => {
      seen.push({ url, auth: new Headers(init.headers).get('authorization') });
      if (url.endsWith('/missing')) return new Response('', { status: 404 });
      return Response.json({
        id: 'qr_9',
        status: 'paid',
        amount: 2500,
        paid_at: '2026-10-01T10:00:00Z',
        metadata: { cvg_account_id: ACCOUNT_ID }
      });
    }) as typeof fetch
  });

  assert.deepEqual(await client.getCharge('qr_9'), {
    id: 'qr_9',
    status: 'paid',
    amountCents: 2500,
    paidAt: '2026-10-01T10:00:00Z',
    metadata: { cvg_account_id: ACCOUNT_ID }
  });
  assert.equal(await client.getCharge('missing'), null);
  assert.equal(await client.getCharge('../etc'), null);
  assert.equal(seen[0]?.url, 'https://pagarme.test/core/v5/pix/qr_codes/qr_9');
  assert.equal(seen[0]?.auth, `Basic ${Buffer.from('sk_test:').toString('base64')}`);
});
