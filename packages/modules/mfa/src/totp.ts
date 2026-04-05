import { createHmac, randomBytes } from 'node:crypto';

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = 'sha1';
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return result;
}

export function generateSecret(length = 20): string {
  return base32Encode(randomBytes(length));
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(4);
    const code = bytes.reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

export function generateProvisioningUri(
  secret: string,
  accountName: string,
  issuer: string
): string {
  const encodedSecret = secret.replace(/=/g, '');
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

function hmacHash(key: Buffer, message: Buffer): Buffer {
  return createHmac(TOTP_ALGORITHM, key).update(message).digest();
}

function generateTOTPValue(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = hmacHash(key, counterBuffer);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

function getCurrentCounter(timeStep = Date.now()): number {
  return Math.floor(timeStep / 1000 / TOTP_PERIOD);
}

export function verifyTOTP(secret: string, token: string, window = TOTP_WINDOW): boolean {
  const cleanToken = token.replace(/\s/g, '');
  if (cleanToken.length !== TOTP_DIGITS) return false;

  const counter = getCurrentCounter();
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTPValue(secret, counter + i);
    if (expected === cleanToken) return true;
  }
  return false;
}

function base32ToBuffer(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const clean = base32.toUpperCase().replace(/=/g, '');

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}
