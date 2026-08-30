import { describe, expect, it } from 'vitest';

import {
  InMemoryWebAuthnChallengeStore,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from '../../../packages/modules/mfa/src/webauthn.js';
import { assertWebAuthnDurableStateReadiness } from '../../../apps/api/src/server.js';

const ACCOUNT_A = '00000000-0000-4000-8000-0000000000a1';
const ACCOUNT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_A = '10000000-0000-4000-8000-0000000000a1';

describe('durable WebAuthn state contract', () => {
  it('requires account-scoped credential lookups and mutations', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const credentialId = await repository.save(ACCOUNT_A, USER_A, {
      publicKey: 'public-key-a',
      counter: 2,
      deviceType: 'platform',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: null
    });

    expect(await repository.findByCredentialId(ACCOUNT_B, USER_A, credentialId)).toBeNull();
    expect(await repository.findByCredentialId(ACCOUNT_A, ACCOUNT_B, credentialId)).toBeNull();
    expect(await repository.findByUserId(ACCOUNT_B, USER_A)).toEqual([]);
    expect(await repository.findByUserId(ACCOUNT_A, USER_A)).toHaveLength(1);

    expect(await repository.updateCounter(ACCOUNT_B, USER_A, credentialId, 2, 99)).toBe(false);
    expect(await repository.updateCounter(ACCOUNT_A, ACCOUNT_B, credentialId, 2, 99)).toBe(false);
    expect(await repository.findByCredentialId(ACCOUNT_A, USER_A, credentialId)).toMatchObject({
      counter: 2
    });

    expect(await repository.updateCounter(ACCOUNT_A, USER_A, credentialId, 2, 3)).toBe(true);
    expect(await repository.updateCounter(ACCOUNT_A, USER_A, credentialId, 2, 4)).toBe(false);
    expect(await repository.findByCredentialId(ACCOUNT_A, USER_A, credentialId)).toMatchObject({
      counter: 3
    });

    await repository.delete(ACCOUNT_B, USER_A, credentialId);
    expect(await repository.findByCredentialId(ACCOUNT_A, USER_A, credentialId)).not.toBeNull();
  });

  it('does not authenticate a credential owned by another user in the same account', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository);
    const credentialId = await repository.save(ACCOUNT_A, ACCOUNT_B, {
      publicKey: 'public-key-other-user',
      counter: 0,
      deviceType: 'platform',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: null
    });

    const result = await service.verifyAuthentication(
      ACCOUNT_A,
      USER_A,
      credentialId,
      {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'signature'
      },
      'challenge',
      'localhost'
    );

    expect(result).toEqual({ success: false });
  });

  it('consumes a purpose-specific challenge once and rejects expired state', async () => {
    const store = new InMemoryWebAuthnChallengeStore();
    const key = { accountId: ACCOUNT_A, userId: USER_A, purpose: 'authentication' as const };

    await store.issue({ key, challenge: 'challenge-1', ttlMs: 60_000 });
    expect(await store.consume(key)).toEqual({ ok: true, challenge: 'challenge-1' });
    expect(await store.consume(key)).toMatchObject({ ok: false, code: 'INVALID_CHALLENGE' });

    await store.issue({ key, challenge: 'challenge-expired', ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await store.consume(key)).toMatchObject({ ok: false, code: 'CHALLENGE_EXPIRED' });
  });

  it('fails closed when enabled in production-like mode without durable stores', () => {
    expect(() =>
      assertWebAuthnDurableStateReadiness({
        environment: 'production',
        enabled: true,
        credentialRepository: undefined,
        challengeStore: undefined
      })
    ).toThrow(/durable WebAuthn state/i);

    expect(() =>
      assertWebAuthnDurableStateReadiness({
        environment: 'test',
        enabled: true,
        credentialRepository: undefined,
        challengeStore: undefined
      })
    ).not.toThrow();
  });

  it('keeps the foundational verifier disabled in normalized production-like mode', () => {
    expect(() =>
      assertWebAuthnDurableStateReadiness({
        environment: ' STAGING ',
        enabled: true,
        credentialRepository: {} as never,
        challengeStore: {} as never
      })
    ).toThrow(/full FIDO2/i);
  });
});
