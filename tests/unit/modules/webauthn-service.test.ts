// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  generateWebAuthnChallenge,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from '../../../packages/modules/mfa/src/webauthn.js';
import {
  createWebAuthnAssertionFixture,
  createWebAuthnRegistrationFixture
} from './webauthn-fixtures.js';

const ACCOUNT_ID = 'account-webauthn';
const USER_ID = 'user-webauthn';
const RP_ID = 'cvg.local';
const ORIGIN = 'https://cvg.local';
const VERIFIER_CONFIG = { rpId: RP_ID, origins: [ORIGIN] } as const;

function userHandle(userId: string): string {
  return Buffer.from(userId, 'utf8').toString('base64url');
}

describe('WebAuthn FIDO2 verification', () => {
  it('generates URL-safe challenges and registration options with real exclusions', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const existingCredentialId = await repository.save(ACCOUNT_ID, USER_ID, {
      id: 'existing-credential',
      publicKey: 'stored-public-key',
      counter: 2,
      deviceType: 'platform',
      createdAt: '2026-04-18T00:00:00.000Z',
      lastUsedAt: null,
      nickname: 'MacBook'
    });
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);

    const challenge = generateWebAuthnChallenge();
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateWebAuthnChallenge()).not.toBe(challenge);

    const registration = await service.generateRegistrationOptions(ACCOUNT_ID, USER_ID, {
      rpName: 'CVG HIS',
      rpId: RP_ID,
      userName: 'user@example.com',
      userId: USER_ID,
      timeout: 45_000,
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform'
      }
    });

    expect(registration.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(registration.publicKeyOptions).toEqual(
      expect.objectContaining({
        timeout: 45_000,
        attestation: 'none',
        rp: { name: 'CVG HIS', id: RP_ID },
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

  it('verifies attestation, stores the browser credential ID and rejects tampering', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);
    const options = await service.generateRegistrationOptions(ACCOUNT_ID, USER_ID, {
      rpName: 'CVG HIS',
      rpId: RP_ID,
      userName: 'user@example.com',
      userId: USER_ID
    });
    const fixture = createWebAuthnRegistrationFixture({
      rpId: RP_ID,
      origin: ORIGIN,
      challenge: options.challenge
    });

    const registered = await service.verifyRegistration(
      ACCOUNT_ID,
      USER_ID,
      fixture.registration,
      options.challenge
    );
    const stored = await repository.findByCredentialId(
      ACCOUNT_ID,
      USER_ID,
      registered.credentialId
    );

    expect(registered.credentialId).toBe(fixture.credentialId);
    expect(stored).toEqual(
      expect.objectContaining({
        id: fixture.credentialId,
        publicKey: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
        counter: 0,
        deviceType: 'cross-platform'
      })
    );
    await expect(
      service.verifyRegistration(
        ACCOUNT_ID,
        USER_ID,
        fixture.registration,
        `${options.challenge}-tampered`
      )
    ).rejects.toThrow('WebAuthn verification failed');
  });

  it('verifies signed assertions, advances the counter and rejects replay, origin and signature changes', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);
    const registrationOptions = await service.generateRegistrationOptions(ACCOUNT_ID, USER_ID, {
      rpName: 'CVG HIS',
      rpId: RP_ID,
      userName: 'user@example.com',
      userId: USER_ID
    });
    const registrationFixture = createWebAuthnRegistrationFixture({
      rpId: RP_ID,
      origin: ORIGIN,
      challenge: registrationOptions.challenge
    });
    await service.verifyRegistration(
      ACCOUNT_ID,
      USER_ID,
      registrationFixture.registration,
      registrationOptions.challenge
    );

    const authenticationOptions = await service.generateAuthenticationOptions(ACCOUNT_ID, USER_ID, {
      rpId: RP_ID,
      timeout: 20_000,
      userVerification: 'required'
    });
    expect(authenticationOptions.publicKeyOptions).toEqual(
      expect.objectContaining({
        timeout: 20_000,
        rpId: RP_ID,
        userVerification: 'required'
      })
    );
    expect(authenticationOptions.publicKeyOptions).not.toHaveProperty('extensions.appid');

    const validAssertion = createWebAuthnAssertionFixture({
      rpId: RP_ID,
      origin: ORIGIN,
      challenge: authenticationOptions.challenge,
      privateKey: registrationFixture.privateKey,
      counter: 1,
      userHandle: userHandle(USER_ID)
    });
    const tamperedSignature = Buffer.from(validAssertion.signature, 'base64url');
    tamperedSignature[tamperedSignature.length - 1] ^= 1;
    const invalidSignature = {
      ...validAssertion,
      signature: tamperedSignature.toString('base64url')
    };

    await expect(
      service.verifyAuthentication(
        ACCOUNT_ID,
        USER_ID,
        registrationFixture.credentialId,
        invalidSignature,
        authenticationOptions.challenge,
        RP_ID
      )
    ).resolves.toEqual({ success: false });

    await expect(
      service.verifyAuthentication(
        ACCOUNT_ID,
        USER_ID,
        registrationFixture.credentialId,
        validAssertion,
        authenticationOptions.challenge,
        RP_ID
      )
    ).resolves.toEqual({ success: true, newCounter: 1 });

    await expect(
      service.verifyAuthentication(
        ACCOUNT_ID,
        USER_ID,
        registrationFixture.credentialId,
        validAssertion,
        authenticationOptions.challenge,
        RP_ID
      )
    ).resolves.toEqual({ success: false });

    const nextOptions = await service.generateAuthenticationOptions(ACCOUNT_ID, USER_ID, {
      rpId: RP_ID
    });
    const wrongOrigin = createWebAuthnAssertionFixture({
      rpId: RP_ID,
      origin: 'https://attacker.example',
      challenge: nextOptions.challenge,
      privateKey: registrationFixture.privateKey,
      counter: 2
    });
    await expect(
      service.verifyAuthentication(
        ACCOUNT_ID,
        USER_ID,
        registrationFixture.credentialId,
        wrongOrigin,
        nextOptions.challenge,
        RP_ID
      )
    ).resolves.toEqual({ success: false });

    const stored = await repository.findByCredentialId(
      ACCOUNT_ID,
      USER_ID,
      registrationFixture.credentialId
    );
    expect(stored?.counter).toBe(1);
  });

  it('rejects unknown credentials and RP changes before verification', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const service = new WebAuthnServiceImpl(repository, VERIFIER_CONFIG);

    await expect(
      service.generateAuthenticationOptions(ACCOUNT_ID, USER_ID, { rpId: 'attacker.example' })
    ).rejects.toThrow('RP ID');

    await expect(
      service.verifyAuthentication(
        ACCOUNT_ID,
        USER_ID,
        'credential-not-found',
        { authenticatorData: 'bad', clientDataJSON: 'bad', signature: 'bad' },
        'challenge',
        RP_ID
      )
    ).resolves.toEqual({ success: false });
  });

  it('supports repository lifecycle operations for stored authenticators', async () => {
    const repository = new InMemoryWebAuthnRepository();
    const credentialId = await repository.save(ACCOUNT_ID, 'user_delete', {
      id: 'credential-to-delete',
      publicKey: 'stored-public-key',
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
