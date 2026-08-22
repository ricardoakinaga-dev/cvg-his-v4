import { describe, expect, it } from 'vitest';

import { PixPaymentDispatchProviderError } from '../../../apps/worker/src/jobs/pix-payment-dispatcher.js';
import {
  normalizePixPaymentDispatchSuccess,
  type PixPaymentDispatchSuccess
} from '../../../apps/worker/src/pix-payment-dispatch-repository.js';

function validSuccess(
  overrides: Partial<PixPaymentDispatchSuccess> = {}
): PixPaymentDispatchSuccess {
  return Object.freeze({
    providerTransactionId: 'provider-transaction-1',
    qrCodePayload: '000201-pix-payload',
    qrCodeBase64: Buffer.from('qr-code').toString('base64'),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  });
}

describe('PIX provider value normalization', () => {
  it('sanitizes a declared public message and validates provider error metadata', () => {
    const error = new PixPaymentDispatchProviderError({
      code: 'SYNTHETIC_UNAVAILABLE',
      failureClass: 'transient',
      publicMessage: '  provider\n  unavailable\t now  '
    });

    expect(error).toMatchObject({
      name: 'PixPaymentDispatchProviderError',
      message: 'provider unavailable now',
      publicMessage: 'provider unavailable now'
    });
    expect(
      () =>
        new PixPaymentDispatchProviderError({
          code: 'invalid-code',
          failureClass: 'transient',
          publicMessage: 'temporary'
        })
    ).toThrow('PIX provider error code is invalid');
    expect(
      () =>
        new PixPaymentDispatchProviderError({
          code: 'VALID_CODE',
          failureClass: 'unknown' as never,
          publicMessage: 'temporary'
        })
    ).toThrow('PIX provider failure class is invalid');
    expect(
      () =>
        new PixPaymentDispatchProviderError({
          code: 'VALID_CODE',
          failureClass: 'transient',
          publicMessage: '   '
        })
    ).toThrow('PIX provider public message cannot be blank');
  });

  it('normalizes and freezes a canonical provider result', () => {
    const success = validSuccess();
    const normalized = normalizePixPaymentDispatchSuccess(success);

    expect(normalized).toEqual(success);
    expect(normalized).not.toBe(success);
    expect(Object.isFrozen(normalized)).toBe(true);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['primitive', 'pix'],
    ['missing transaction id', { ...validSuccess(), providerTransactionId: undefined }],
    ['missing payload', { ...validSuccess(), qrCodePayload: undefined }],
    ['missing image', { ...validSuccess(), qrCodeBase64: undefined }],
    ['missing expiry', { ...validSuccess(), expiresAt: undefined }],
    ['empty transaction id', validSuccess({ providerTransactionId: '' })],
    ['controlled payload', validSuccess({ qrCodePayload: 'payload\u0000secret' })],
    ['oversized transaction id', validSuccess({ providerTransactionId: 'x'.repeat(256) })],
    ['oversized payload', validSuccess({ qrCodePayload: 'x'.repeat(65_537) })],
    ['oversized image', validSuccess({ qrCodeBase64: 'A'.repeat(262_148) })],
    ['invalid base64 alphabet', validSuccess({ qrCodeBase64: 'not_base64!' })],
    ['non-canonical base64', validSuccess({ qrCodeBase64: 'AB==' })],
    ['non-canonical timestamp', validSuccess({ expiresAt: '2026-08-22T13:00:00Z' })],
    ['invalid timestamp', validSuccess({ expiresAt: '2026-99-99T99:99:99.999Z' })],
    ['expiry too soon', validSuccess({ expiresAt: new Date(Date.now() + 100).toISOString() })],
    [
      'expiry too far',
      validSuccess({ expiresAt: new Date(Date.now() + 31 * 86_400_000).toISOString() })
    ]
  ])('rejects an unsafe provider result: %s', (_label, value) => {
    expect(() => normalizePixPaymentDispatchSuccess(value)).toThrow();
  });
});
