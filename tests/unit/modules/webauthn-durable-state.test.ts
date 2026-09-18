// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  generateWebAuthnChallenge,
  InMemoryWebAuthnChallengeStore,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from '../../../packages/modules/mfa/src/webauthn.js';
import { assertWebAuthnDurableStateReadiness } from '../../../apps/api/src/server.js';

const ACCOUNT_A = '00000000-0000-4000-8000-0000000000a1';
const ACCOUNT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_A = '10000000-0000-4000-8000-0000000000a1';
const RP_ID = 'his.example.test';
const ORIGIN = 'https://his.example.test';
const VERIFIER_CONFIG = { rpId: RP_ID, origins: [ORIGIN] } as const;

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
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);
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
      RP_ID
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

  it('rejects malformed challenge inputs and generates cryptographically sized challenges', async () => {
    const store = new InMemoryWebAuthnChallengeStore();
    const key = { accountId: ACCOUNT_A, userId: USER_A, purpose: 'registration' as const };

    expect(generateWebAuthnChallenge()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(store.issue({ key, challenge: '', ttlMs: 60_000 })).rejects.toThrow(
      'challenge must not be empty'
    );
    await expect(store.issue({ key, challenge: 'challenge', ttlMs: 0 })).rejects.toThrow(
      'TTL must be a positive integer'
    );
    await expect(store.issue({ key, challenge: 'challenge', ttlMs: 1.5 })).rejects.toThrow(
      'TTL must be a positive integer'
    );
  });

  it('builds registration options with exclusions and authenticator preferences', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);
    const first = await repository.save(ACCOUNT_A, USER_A, {
      publicKey: 'public-key-a',
      counter: 0,
      deviceType: 'platform',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: null,
      nickname: 'Biometria'
    });

    const result = await service.generateRegistrationOptions(ACCOUNT_A, USER_A, {
      rpName: 'CVG-HIS',
      rpId: RP_ID,
      userName: 'user@example.test',
      userId: USER_A,
      timeout: 45_000,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform'
      }
    });

    expect(result.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.publicKeyOptions).toMatchObject({
      timeout: 45_000,
      rp: { name: 'CVG-HIS', id: RP_ID },
      attestation: 'none',
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform'
      }
    });
    expect(result.publicKeyOptions.excludeCredentials).toEqual([{ id: first, type: 'public-key' }]);
  });

  it('rejects malformed registration and omits allowCredentials for discoverable authentication', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);

    await expect(
      service.verifyRegistration(
        ACCOUNT_A,
        USER_A,
        {
          credentialId: 'browser-credential',
          attestationObject: 'attestation',
          clientDataJSON: 'client'
        },
        'expected-challenge'
      )
    ).rejects.toThrow(/WebAuthn verification failed/i);

    const options = await service.generateAuthenticationOptions(ACCOUNT_A, 'new-user', {
      rpId: RP_ID
    });
    expect(options.publicKeyOptions).toMatchObject({
      timeout: 60_000,
      rpId: RP_ID,
      userVerification: 'preferred'
    });
    expect(options.publicKeyOptions).not.toHaveProperty('allowCredentials');
  });

  it('fails closed on malformed assertions and unsafe stored counters', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);
    const credentialId = await repository.save(ACCOUNT_A, USER_A, {
      id: 'credential-with-invalid-key',
      publicKey: 'not-a-public-key',
      counter: 4,
      deviceType: 'platform',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: null
    });

    await expect(
      service.verifyAuthentication(
        ACCOUNT_A,
        USER_A,
        credentialId,
        { authenticatorData: 'data', clientDataJSON: 'client', signature: 'signature' },
        'challenge',
        RP_ID
      )
    ).resolves.toEqual({ success: false });

    const unsafeId = await repository.save(ACCOUNT_A, USER_A, {
      id: 'credential-with-unsafe-counter',
      publicKey: 'not-a-public-key',
      counter: Number.MAX_SAFE_INTEGER,
      deviceType: 'platform',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: null
    });
    await expect(
      service.verifyAuthentication(
        ACCOUNT_A,
        USER_A,
        unsafeId,
        { authenticatorData: 'data', clientDataJSON: 'client', signature: 'signature' },
        'challenge',
        RP_ID
      )
    ).resolves.toEqual({ success: false });
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

  it('requires authoritative verifier settings in normalized production-like mode', () => {
    expect(() =>
      assertWebAuthnDurableStateReadiness({
        environment: ' STAGING ',
        enabled: true,
        credentialRepository: {} as never,
        challengeStore: {} as never
      })
    ).toThrow(/authoritative RP ID and browser origin/i);
  });
});
