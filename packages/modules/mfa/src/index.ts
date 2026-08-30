export {
  MfaService,
  type MfaRecord,
  type MfaSetupResponse,
  type MfaSetupConfirmation,
  type MfaSetupConfirmRequest,
  type MfaLoginRequest,
  type MfaEncryptionKeyring,
  type MfaRepository,
  CRITICAL_ROLES,
  validateMasterKey
} from './service.js';

export {
  generateSecret,
  generateRecoveryCodes,
  generateProvisioningUri,
  findMatchingTotpCounter,
  verifyTOTP
} from './totp.js';

export { encrypt, decrypt, validateMasterKey as validateMfaEncryptionKey } from './crypto.js';

export { DatabaseMfaRepository } from './repositories/database-mfa.repository.js';
export { InMemoryMfaRepository } from './repositories/in-memory-mfa.repository.js';

// WebAuthn/FIDO2
export {
  type WebAuthnCredential,
  type WebAuthnChallengeKey,
  type WebAuthnChallengePurpose,
  type IssueWebAuthnChallengeInput,
  type WebAuthnChallengeConsumeResult,
  type WebAuthnChallengeStore,
  type WebAuthnRegistrationOptions,
  type WebAuthnAssertionOptions,
  type WebAuthnRepository,
  type WebAuthnService,
  generateWebAuthnChallenge,
  InMemoryWebAuthnChallengeStore,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from './webauthn.js';

export { DatabaseWebAuthnRepository } from './repositories/database-webauthn.repository.js';
export { DatabaseWebAuthnChallengeStore } from './repositories/database-webauthn-challenge.store.js';
