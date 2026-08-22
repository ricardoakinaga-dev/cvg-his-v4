/**
 * Bootstrap token that gates the first-run setup wizard.
 *
 * Without it, whoever reaches a freshly deployed installation first becomes its
 * super administrator. The token is known only to the operator who can read the
 * service configuration or a secret manager.
 */
import { timingSafeEqual } from 'node:crypto';

/** Minimum Base64URL length for 32 random bytes without padding. */
export const MIN_SETUP_TOKEN_LENGTH = 43;
const MIN_DISTINCT_TOKEN_CHARACTERS = 8;

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
    const hasUnsafeWhitespace = /\s/.test(trimmed);
    const distinctCharacters = new Set(trimmed).size;
    if (
      trimmed.length < MIN_SETUP_TOKEN_LENGTH
      || hasUnsafeWhitespace
      || distinctCharacters < MIN_DISTINCT_TOKEN_CHARACTERS
    ) {
      throw new Error(
        `SETUP_BOOTSTRAP_TOKEN must contain at least ${MIN_SETUP_TOKEN_LENGTH} characters from a high-entropy secret generator.`
      );
    }
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
