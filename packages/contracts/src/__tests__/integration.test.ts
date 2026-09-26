import { describe, expect, it } from 'vitest';
import { integrationContract } from '../integration.js';

describe('clinical integration contract runtime boundaries', () => {
  it('keeps provider response permissive while exposing an explicit unknown boundary', () => {
    const responseSchema = integrationContract.createExamOrderFromEncounter.responses[201];

    expect(responseSchema.safeParse({ providerOrderId: 'provider-order-1', raw: { status: 'queued' } }).success).toBe(true);
    expect(responseSchema.safeParse('provider-accepted').success).toBe(true);
  });
});
