import { randomBytes } from "node:crypto";

/** Bytes of entropy used by identifiers that are merely unique (correlation, tracing). */
const CORRELATION_ID_ENTROPY_BYTES = 9;
/** Bytes of entropy used by identifiers that act as credentials (session ids, nonces). */
const SECURE_ID_ENTROPY_BYTES = 32;

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Generates a prefixed, time-ordered unique identifier.
 *
 * The random suffix comes from a CSPRNG because this helper also backs
 * identifiers that are treated as credentials (see `createSecureId`), and a
 * predictable suffix would make those guessable.
 */
export function createCorrelationId(prefix = "cvg"): string {
  const random = randomBytes(CORRELATION_ID_ENTROPY_BYTES).toString("hex");
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

/**
 * Generates a prefixed identifier suitable for security-sensitive values such
 * as session identifiers and refresh-token nonces.
 *
 * Unlike `createCorrelationId`, this carries 256 bits of entropy and must be
 * used wherever guessing the identifier would grant access.
 */
export function createSecureId(prefix = "cvg"): string {
  return `${prefix}_${randomBytes(SECURE_ID_ENTROPY_BYTES).toString("hex")}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
