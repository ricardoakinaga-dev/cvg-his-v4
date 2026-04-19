import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LocalEmailGateway,
  ResendEmailGatewayAdapter
} from '../../../apps/api/src/email-gateway.ts';

describe('email-gateway runtime coverage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends local email successfully and simulates deterministic local failures', async () => {
    const gateway = new LocalEmailGateway();

    const sent = await gateway.send({
      to: 'owner@example.com',
      subject: 'Resultado',
      text: 'Seu exame foi liberado.'
    });
    const failed = await gateway.send({
      to: 'fail-owner@example.com',
      subject: 'Erro esperado',
      text: 'Simulacao'
    });

    expect(sent).toEqual(
      expect.objectContaining({
        provider: 'local-email',
        status: 'sent',
        providerMessageId: expect.stringMatching(/^local_email_/)
      })
    );
    expect(failed).toEqual(
      expect.objectContaining({
        provider: 'local-email',
        status: 'failed',
        failureReason: 'Simulated local email failure'
      })
    );
  });

  it('sends email through Resend and serializes provider payload correctly', async () => {
    const calls: Array<{ readonly url: string; readonly init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: 're_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }) as typeof fetch;

    const gateway = new ResendEmailGatewayAdapter({
      apiKey: 're_test_key',
      from: 'clinic@example.com'
    });

    const result = await gateway.send({
      to: 'owner@example.com',
      subject: 'Exame liberado',
      text: 'Seu exame foi liberado.'
    });

    expect(result).toEqual(
      expect.objectContaining({
        provider: 'resend',
        status: 'sent',
        providerMessageId: 're_123'
      })
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      from: 'clinic@example.com',
      to: ['owner@example.com'],
      subject: 'Exame liberado',
      text: 'Seu exame foi liberado.'
    });
  });

  it('returns structured failures when Resend rejects or network transport fails', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'forbidden' }), {
          status: 403,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockRejectedValueOnce(new Error('network timeout')) as typeof fetch;

    const gateway = new ResendEmailGatewayAdapter({
      apiKey: 're_test_key',
      from: 'clinic@example.com'
    });

    const providerFailure = await gateway.send({
      to: 'owner@example.com',
      subject: 'Falha provider',
      text: 'Falha esperada.'
    });
    const transportFailure = await gateway.send({
      to: 'owner@example.com',
      subject: 'Falha rede',
      text: 'Falha de transporte.'
    });

    expect(providerFailure).toEqual(
      expect.objectContaining({
        provider: 'resend',
        status: 'failed',
        failureReason: expect.stringContaining('403')
      })
    );
    expect(transportFailure).toEqual(
      expect.objectContaining({
        provider: 'resend',
        status: 'failed',
        failureReason: 'network timeout'
      })
    );
  });
});

