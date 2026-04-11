export {
  MfaService,
  type MfaRecord,
  type MfaSetupResponse,
  type MfaSetupConfirmRequest,
  type MfaLoginRequest,
  type MfaRepository,
  CRITICAL_ROLES,
  validateMasterKey
} from './service.js';

export {
  generateSecret,
  generateRecoveryCodes,
  generateProvisioningUri,
  verifyTOTP
} from './totp.js';

export { encrypt, decrypt, validateMasterKey as validateMfaEncryptionKey } from './crypto.js';

export { DatabaseMfaRepository } from './repositories/database-mfa.repository.js';

// WebAuthn/FIDO2
export {
  type WebAuthnCredential,
  type WebAuthnRegistrationOptions,
  type WebAuthnAssertionOptions,
  type WebAuthnRepository,
  type WebAuthnService,
  generateWebAuthnChallenge,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl
} from './webauthn.js';
