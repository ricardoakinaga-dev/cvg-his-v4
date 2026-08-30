/**
 * Bootstrap token that gates the first-run setup wizard.
 *
 * Without it, whoever reaches a freshly deployed installation first becomes its
 * super administrator. The token is known only to the operator who can read the
 * service configuration or a secret manager.
 */
import { timingSafeEqual } from 'node:crypto';

import {
  MIN_SETUP_BOOTSTRAP_TOKEN_LENGTH,
  validateSetupBootstrapToken
} from '@cvg-his-v2/shared-config';

/** Minimum Base64URL length for 32 random bytes without padding. */
export const MIN_SETUP_TOKEN_LENGTH = MIN_SETUP_BOOTSTRAP_TOKEN_LENGTH;

export interface ResolvedSetupToken {
  readonly token?: string;
  /** False means setup mutation is deliberately disabled. */
  readonly configured: boolean;
}

/**
 * Resolves the operator-provided token without ever manufacturing a credential.
 * Missing configuration keeps the API available for health/status checks while
 * setup mutation fails closed.
 */
export function resolveSetupBootstrapToken(configuredToken?: string): ResolvedSetupToken {
  const trimmed = configuredToken?.trim();
  if (trimmed && trimmed.length > 0) {
    validateSetupBootstrapToken(trimmed);
    return { token: trimmed, configured: true };
  }

  return { token: undefined, configured: false };
}

export function isValidSetupToken(expectedToken: string, providedToken: unknown): boolean {
  if (typeof providedToken !== 'string' || providedToken.length === 0) {
    return false;
  }

  const expected = Buffer.from(expectedToken, 'utf8');
  const provided = Buffer.from(providedToken, 'utf8');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
