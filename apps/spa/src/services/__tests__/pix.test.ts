import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

const validResponse = {
  id: 'pix-1',
  accountId: 'acc-1',
  amount: 45,
  currency: 'BRL' as const,
  provider: 'local-pix',
  status: 'pending' as const,
  qrCodePayload: '000201pix',
  qrCodeBase64: 'cGl4LXFyLTE=',
  expiresAt: '2026-04-10T00:15:00Z',
  eventId: 'evt-1',
  eventCorrelationId: 'corr-1'
};

const validAttempt = {
  id: 'attempt-1',
  encounterId: 'encounter-1',
  billingRecordId: 'billing-1',
  state: 'pending_dispatch' as const,
  amountCents: 4550,
  currency: 'BRL' as const,
  qrCodePayload: null,
  qrCodeBase64: null,
  expiresAt: null,
  error: null,
  createdAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z'
};

describe('pixService', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('sends the create payload and accepts the API QR/status contract', async () => {
    mockApiRequest.mockResolvedValue(validResponse);
    const { pixService } = await import('../pix');
    const payload = {
      amount: 45,
      description: 'Liquidação teste',
      expirationMinutes: 15
    };

    await expect(pixService.createIntent(payload)).resolves.toEqual(validResponse);
    expect(mockApiRequest).toHaveBeenCalledWith('/payments/pix/intents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  });

  it('accepts completed when the create endpoint returns the terminal API status', async () => {
    mockApiRequest.mockResolvedValue({ ...validResponse, status: 'completed' });
    const { pixService } = await import('../pix');

    await expect(
      pixService.createIntent({ amount: 45, description: 'Liquidação teste' })
    ).resolves.toMatchObject({ status: 'completed' });
  });

  it('rejects the legacy QR/status shape instead of inventing a frontend state', async () => {
    mockApiRequest.mockResolvedValue({
      ...validResponse,
      status: 'paid',
      qrCodeText: '000201legacy',
      qrCodeImageUrl: 'https://example.test/legacy.png',
      qrCodePayload: undefined,
      qrCodeBase64: undefined
    });
    const { pixService } = await import('../pix');

    await expect(
      pixService.createIntent({ amount: 45, description: 'Liquidação teste' })
    ).rejects.toThrow('Resposta da API PIX incompatível com o contrato atual');
  });

  it('rejects a status outside the create endpoint contract', async () => {
    mockApiRequest.mockResolvedValue({ ...validResponse, status: 'expired' });
    const { pixService } = await import('../pix');

    await expect(
      pixService.createIntent({ amount: 45, description: 'Liquidação teste' })
    ).rejects.toThrow('Resposta da API PIX incompatível com o contrato atual');
  });

  it('marks only pending/completed as available and names every requested unsupported state', async () => {
    const { getPixStatusPresentation, PIX_STATUS_CONTRACT } = await import('../pix');

    expect(getPixStatusPresentation('pending')).toMatchObject({
      label: 'Pendente',
      supported: true
    });
    expect(getPixStatusPresentation('completed')).toMatchObject({
      label: 'Concluído',
      supported: true
    });

    for (const status of ['confirmed', 'expired', 'cancelled', 'failed', 'timeout', 'reversal']) {
      expect(getPixStatusPresentation(status)).toMatchObject({
        supported: false,
        availabilityLabel: 'não disponível neste contrato'
      });
    }

    expect(PIX_STATUS_CONTRACT.map((status) => status.code)).toEqual([
      'pending',
      'completed',
      'confirmed',
      'expired',
      'cancelled',
      'failed',
      'timeout',
      'reversal'
    ]);
  });

  it('requests a durable encounter attempt with an empty body and explicit idempotency key', async () => {
    mockApiRequest.mockResolvedValue(validAttempt);
    const { pixService } = await import('../pix');

    await expect(pixService.requestEncounterAttempt('encounter/1', 'same-key')).resolves.toEqual(validAttempt);
    expect(mockApiRequest).toHaveBeenCalledWith('/encounters/encounter%2F1/payments/pix-attempts', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'same-key' },
      body: '{}'
    });
  });

  it('gets a durable attempt through the read endpoint', async () => {
    mockApiRequest.mockResolvedValue(validAttempt);
    const { pixService } = await import('../pix');

    await expect(pixService.getEncounterAttempt('attempt/1')).resolves.toEqual(validAttempt);
    expect(mockApiRequest).toHaveBeenCalledWith('/payments/pix-attempts/attempt%2F1');
  });

  it('restores the latest durable attempt by encounter and accepts an explicit empty response', async () => {
    mockApiRequest.mockResolvedValueOnce({ attempt: validAttempt });
    const { pixService } = await import('../pix');

    await expect(pixService.getLatestEncounterAttempt('encounter/1')).resolves.toEqual(validAttempt);
    expect(mockApiRequest).toHaveBeenCalledWith('/encounters/encounter%2F1/payments/pix-attempts');

    mockApiRequest.mockResolvedValueOnce({ attempt: null });
    await expect(pixService.getLatestEncounterAttempt('encounter/1')).resolves.toBeNull();
  });

  it('rejects an invalid encounter lookup envelope instead of hiding a contract mismatch', async () => {
    mockApiRequest.mockResolvedValue({ attempt: { ...validAttempt, unexpected: true } });
    const { pixService } = await import('../pix');

    await expect(pixService.getLatestEncounterAttempt(validAttempt.encounterId)).rejects.toThrow(
      'Resposta da tentativa PIX incompatível com o contrato atual'
    );
  });

  it.each([
    ['unknown state', { state: 'provider_confirmed' }],
    ['negative amount', { amountCents: 0 }],
    ['invalid currency', { currency: 'USD' }],
    ['malformed error', { error: { code: 'ONLY_CODE' } }],
    ['unexpected field', { unexpected: true }]
  ])('rejects attempt responses with %s', async (_label, override) => {
    mockApiRequest.mockResolvedValue({ ...validAttempt, ...override });
    const { pixService } = await import('../pix');

    await expect(pixService.getEncounterAttempt(validAttempt.id)).rejects.toThrow(
      'Resposta da tentativa PIX incompatível com o contrato atual'
    );
  });

  it('accepts nullable QR/error fields and presents every durable state', async () => {
    const {
      PIX_PAYMENT_ATTEMPT_STATUS_CONTRACT,
      getPixPaymentAttemptStatusPresentation,
      isPixPaymentAttemptResponse,
      isTerminalPixPaymentAttemptState
    } = await import('../pix');

    expect(isPixPaymentAttemptResponse(validAttempt)).toBe(true);
    expect(PIX_PAYMENT_ATTEMPT_STATUS_CONTRACT.map((status) => status.code)).toEqual([
      'pending_dispatch',
      'awaiting_confirmation',
      'confirmed_pending_apply',
      'settled',
      'expired',
      'cancelled',
      'dispatch_failed',
      'reconciliation_required'
    ]);
    expect(getPixPaymentAttemptStatusPresentation('settled')).toMatchObject({
      label: 'Liquidado',
      variant: 'success'
    });
    expect(getPixPaymentAttemptStatusPresentation('reconciliation_required')).toMatchObject({
      label: 'Reconciliação necessária',
      variant: 'danger'
    });
    expect(isTerminalPixPaymentAttemptState('settled')).toBe(true);
    expect(isTerminalPixPaymentAttemptState('pending_dispatch')).toBe(false);
  });
});
