import { describe, expect, it } from 'vitest';

import {
  generateWebAuthnChallenge,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from '../../../packages/modules/mfa/src/webauthn.js';

const ACCOUNT_ID = 'account-webauthn';

describe('WebAuthn coverage guard', () => {
  it('generates URL-safe challenges and registration options with existing credential exclusion', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const existingCredentialId = await repository.save(ACCOUNT_ID, 'user_reg', {
      publicKey: 'user:user_reg:cred_existing',
      counter: 2,
      deviceType: 'platform',
      createdAt: '2026-04-18T00:00:00.000Z',
      lastUsedAt: null,
      nickname: 'MacBook'
    });
    const service = new WebAuthnServiceImpl(repository);

    const challenge = generateWebAuthnChallenge();
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateWebAuthnChallenge()).not.toBe(challenge);

    const registration = await service.generateRegistrationOptions(ACCOUNT_ID, 'user_reg', {
      rpName: 'CVG HIS',
      rpId: 'cvg.local',
      userName: 'user@example.com',
      userId: 'user_reg',
      timeout: 45_000,
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform'
      }
    });

    expect(registration.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(registration.publicKeyOptions).toEqual(
      expect.objectContaining({
        timeout: 45_000,
        attestation: 'none',
        rp: { name: 'CVG HIS', id: 'cvg.local' },
        authenticatorSelection: {
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'required',
          authenticatorAttachment: 'platform'
        }
      })
    );
    expect((registration.publicKeyOptions.excludeCredentials as Array<{ id: string }>)[0]?.id).toBe(
      existingCredentialId
    );
  });

  it('persists registrations with repository ids and lists credentials by user', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository);

    const registered = await service.verifyRegistration(
      ACCOUNT_ID,
      'user_register',
      {
        credentialId: 'browser-credential-id',
        attestationObject: 'attestation',
        clientDataJSON: 'client-data'
      },
      'expected-challenge'
    );

    const stored = await repository.findByCredentialId(
      ACCOUNT_ID,
      'user_register',
      registered.credentialId
    );
    const byUser = await repository.findByUserId(ACCOUNT_ID, 'user_register');

    expect(registered.credentialId).toMatch(/^webauthn_/);
    expect(stored).toEqual(
      expect.objectContaining({
        id: registered.credentialId,
        publicKey: 'user:user_register:browser-credential-id',
        counter: 0,
        deviceType: 'cross-platform'
      })
    );
    expect(byUser).toHaveLength(1);
  });

  it('generates authentication options and verifies assertions only for known credentials', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository);

    const authOptions = await service.generateAuthenticationOptions(ACCOUNT_ID, 'user_auth', {
      rpId: 'cvg.local',
      timeout: 20_000,
      userVerification: 'required'
    });

    expect(authOptions.publicKeyOptions).toEqual(
      expect.objectContaining({
        timeout: 20_000,
        rpId: 'cvg.local',
        userVerification: 'required',
        extensions: { appid: 'cvg.local' }
      })
    );

    const missing = await service.verifyAuthentication(
      ACCOUNT_ID,
      'user_auth',
      'cred_missing',
      {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'signature'
      },
      authOptions.challenge,
      'cvg.local'
    );
    expect(missing).toEqual({ success: false });

    const savedCredentialId = await repository.save(ACCOUNT_ID, 'user_auth', {
      publicKey: 'user:user_auth:cred_real',
      counter: 4,
      deviceType: 'cross-platform',
      createdAt: '2026-04-18T00:00:00.000Z',
      lastUsedAt: null
    });

    const verified = await service.verifyAuthentication(
      ACCOUNT_ID,
      'user_auth',
      savedCredentialId,
      {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'signature',
        userHandle: 'user_auth'
      },
      authOptions.challenge,
      'cvg.local'
    );

    const updated = await repository.findByCredentialId(ACCOUNT_ID, 'user_auth', savedCredentialId);
    expect(verified).toEqual({ success: true, newCounter: 5 });
    expect(updated?.counter).toBe(5);
    expect(updated?.lastUsedAt).toBeTypeOf('string');
  });

  it('supports repository lifecycle operations for stored authenticators', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const credentialId = await repository.save(ACCOUNT_ID, 'user_delete', {
      publicKey: 'user:user_delete:cred_to_delete',
      counter: 0,
      deviceType: 'platform',
      createdAt: '2026-04-18T00:00:00.000Z',
      lastUsedAt: null,
      nickname: 'Passkey iPhone'
    });

    expect(await repository.findByCredentialId(ACCOUNT_ID, 'user_delete', credentialId)).toEqual(
      expect.objectContaining({
        nickname: 'Passkey iPhone',
        deviceType: 'platform'
      })
    );

    await repository.delete(ACCOUNT_ID, 'user_delete', credentialId);

    expect(await repository.findByCredentialId(ACCOUNT_ID, 'user_delete', credentialId)).toBeNull();
    expect(await repository.findByUserId(ACCOUNT_ID, 'user_delete')).toEqual([]);
  });
});
