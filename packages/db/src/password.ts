import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const scryptAsync = promisify(scrypt);

/** Produces the salted scrypt wire format consumed by UsersService. */
export async function hashSeedPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const key = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}
