import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import * as schema from '@cvg-his-v2/shared-database';
import {
  MfaService,
  DatabaseMfaRepository,
  type MfaRecord,
  type MfaRepository,
  encrypt,
  decrypt,
  generateSecret,
  verifyTOTP,
  validateMasterKey
} from '@cvg-his-v2/module-mfa';
import { queryOne, queryMany } from '../../helpers/db-helpers.js';

// ============================================================================
// MFA Integration Tests — Phase 4c
// Validates end-to-end MFA flow with real PostgreSQL persistence.
// Covers: setup, confirm, login, disable, recovery codes, lastUsedAt,
// lastRecoveryCodesRegeneratedAt, encrypted secrets, hashed codes.
// ============================================================================

const MFA_ENCRYPTION_KEY = 'integration-test-mfa-encryption-key-12345';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';
const TEST_ACCOUNT_ID = 'a0000000-0000-0000-0000-000000000001';

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let repo: DatabaseMfaRepository;
let service: MfaService;

class TwoReaderBarrierMfaRepository implements MfaRepository {
  readonly #delegate: MfaRepository;
  readonly #ready: Promise<void>;
  #releaseReady!: () => void;
  #readerCount = 0;

  constructor(delegate: MfaRepository) {
    this.#delegate = delegate;
    this.#ready = new Promise((resolve) => {
      this.#releaseReady = resolve;
    });
  }

  async findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined> {
    const record = await this.#delegate.findByUserId(accountId, userId);
    this.#readerCount += 1;
    if (this.#readerCount === 2) this.#releaseReady();
    await this.#ready;
    return record;
  }

  beginSetup(record: MfaRecord): Promise<boolean> {
    return this.#delegate.beginSetup(record);
  }

  activateSetup(
    accountId: string,
    userId: string,
    credentialId: string,
    matchedTotpCounter: number,
    activatedAt: string
  ): Promise<MfaRecord | undefined> {
    return this.#delegate.activateSetup(
      accountId,
      userId,
      credentialId,
      matchedTotpCounter,
      activatedAt
    );
  }

  create(record: MfaRecord): Promise<void> {
    return this.#delegate.create(record);
  }

  update(record: MfaRecord): Promise<boolean> {
    return this.#delegate.update(record);
  }

  consumeTotpCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    counter: number,
    usedAt: string
  ): Promise<boolean> {
    return this.#delegate.consumeTotpCounter(
      accountId,
      userId,
      credentialId,
      counter,
      usedAt
    );
  }

  consumeRecoveryCode(
    accountId: string,
    userId: string,
    credentialId: string,
    recoveryCodeHash: string,
    usedAt: string
  ): Promise<boolean> {
    return this.#delegate.consumeRecoveryCode(
      accountId,
      userId,
      credentialId,
      recoveryCodeHash,
      usedAt
    );
  }

  delete(accountId: string, userId: string, credentialId: string): Promise<boolean> {
    return this.#delegate.delete(accountId, userId, credentialId);
  }
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

beforeAll(async () => {
  validateMasterKey(MFA_ENCRYPTION_KEY);

  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL_TEST ??
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5433/cvg_his_v2_test',
    max: 2
  });

  db = drizzle(pool, { schema });
  repo = new DatabaseMfaRepository(db);
  service = new MfaService({
    repository: repo,
    encryptionKey: MFA_ENCRYPTION_KEY,
    encryptionKeyVersion: 'integration-v1'
  });

  // Create test account and user via raw SQL (users/accounts tables not in shared-database schema)
  await pool.query(`
    INSERT INTO accounts (id, tenant_id, slug, name, is_active)
    VALUES ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test_mfa', 'Test MFA Account', true)
    ON CONFLICT (id) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
    VALUES ('${TEST_USER_ID}', '${TEST_ACCOUNT_ID}', 'mfa-test-user', 'mfa-test@cvg-his-v2.com', '${hashPassword('test-password-123')}', 'MFA Test User', true)
    ON CONFLICT (id) DO NOTHING
  `);

  await cleanupMfa(TEST_USER_ID);
});

afterAll(async () => {
  await cleanupMfa(TEST_USER_ID);
  await pool.end();
});

async function cleanupMfa(userId: string): Promise<void> {
  await db.delete(schema.mfaCredentials).where(eq(schema.mfaCredentials.userId, userId as never));
}

// ============================================================================
// MIT-001: MFA Setup + Confirm — persists encrypted secret and hashed codes
// ============================================================================
describe('MIT-001 — MFA Setup + Confirm with Database Persistence', () => {
  it('initiates setup and returns secret, provisioning URI, and recovery codes', async () => {
    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');

    expect(setup.secret).toBeDefined();
    expect(setup.secret.length).toBeGreaterThan(0);
    expect(setup.provisioningUri).toContain('otpauth://totp/');
    expect(setup.provisioningUri).toContain('CVG-HIS-V2');
    expect(setup.recoveryCodes).toHaveLength(8);
    const pending = await queryOne<{
      secret_encrypted: string;
      recovery_codes_hash: string[];
      is_active: boolean;
      setup_expires_at: Date | null;
      secret_key_version: string | null;
    }>(
      `SELECT secret_encrypted, recovery_codes_hash, is_active,
              setup_expires_at, secret_key_version
       FROM mfa_credentials
       WHERE account_id = $1 AND user_id = $2`,
      [TEST_ACCOUNT_ID, TEST_USER_ID]
    );
    expect(pending).toMatchObject({
      is_active: false,
      secret_key_version: 'integration-v1'
    });
    expect(pending?.setup_expires_at).not.toBeNull();
    expect(pending?.secret_encrypted).not.toBe(setup.secret);
    expect(pending?.recovery_codes_hash).toHaveLength(8);
    expect(pending?.recovery_codes_hash.every((value) => value.length === 64)).toBe(true);
    expect(JSON.stringify(pending)).not.toContain(setup.recoveryCodes[0]);
  });

  it('confirms setup and persists encrypted secret to database', async () => {
    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');

    const totpCode = generateCurrentTOTP(setup.secret);
    const secretRaw = setup.secret;

    const record = await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    expect(record.isActive).toBe(true);
    expect(record.activatedAt).toBeDefined();

    const dbRecord = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecord).toBeDefined();
    expect(dbRecord!.isActive).toBe(true);
    expect(dbRecord!.activatedAt).toBeDefined();
    expect(dbRecord!.createdAt).toBeDefined();

    const decryptedSecret = decrypt(dbRecord!.secret, MFA_ENCRYPTION_KEY);
    expect(decryptedSecret).toBe(secretRaw);

    const dbRow = await queryOne<{ recovery_codes_hash: unknown[] }>(
      'SELECT recovery_codes_hash FROM mfa_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(dbRow).toBeDefined();
    expect(dbRow!.recovery_codes_hash).toHaveLength(8);

    for (const hash of dbRow!.recovery_codes_hash as string[]) {
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    }
  });
});

// ============================================================================
// MIT-002: MFA Login — verifies TOTP and updates lastUsedAt
// ============================================================================
describe('MIT-002 — MFA Login with lastUsedAt Persistence', () => {
  it('verifies login with correct TOTP and updates lastUsedAt', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const dbRecordBefore = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordBefore!.lastUsedAt).toBeUndefined();

    const isValid = await service.verifyLogin(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret, Date.now() + 30_000)
    );
    expect(isValid).toBe(true);

    const dbRecordAfter = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordAfter!.lastUsedAt).toBeDefined();
  });

  it('rejects login with invalid TOTP', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const isValid = await service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, '000000');
    expect(isValid).toBe(false);
  });

  it('accepts a concurrent TOTP counter exactly once across repository instances', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);
    const nextTotpCode = generateCurrentTOTP(setup.secret, Date.now() + 30_000);
    const secondService = new MfaService({
      repository: new DatabaseMfaRepository(db),
      encryptionKey: MFA_ENCRYPTION_KEY
    });

    const results = await Promise.all([
      service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, nextTotpCode),
      secondService.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, nextTotpCode)
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const dbRow = await queryOne<{ last_totp_counter: number | null }>(
      'SELECT last_totp_counter FROM mfa_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(dbRow?.last_totp_counter).not.toBeNull();
  });

  it('verifies login with recovery code and consumes it', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const recoveryCode = setup.recoveryCodes[0];
    const isValid = await service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, recoveryCode);
    expect(isValid).toBe(true);

    const secondUse = await service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, recoveryCode);
    expect(secondUse).toBe(false);
  });

  it('accepts a recovery code exactly once across concurrent repository instances', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret)
    );
    const secondService = new MfaService({
      repository: new DatabaseMfaRepository(db),
      encryptionKey: MFA_ENCRYPTION_KEY
    });

    const results = await Promise.all([
      service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, setup.recoveryCodes[0]),
      secondService.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, setup.recoveryCodes[0])
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('does not resurrect a recovery code when different codes are consumed concurrently', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret)
    );
    const barrierRepository = new TwoReaderBarrierMfaRepository(
      new DatabaseMfaRepository(db)
    );
    const firstService = new MfaService({
      repository: barrierRepository,
      encryptionKey: MFA_ENCRYPTION_KEY
    });
    const secondService = new MfaService({
      repository: barrierRepository,
      encryptionKey: MFA_ENCRYPTION_KEY
    });
    const firstCode = setup.recoveryCodes[0];
    const secondCode = setup.recoveryCodes[1];

    await expect(
      Promise.all([
        firstService.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, firstCode),
        secondService.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, secondCode)
      ])
    ).resolves.toEqual([true, true]);

    await expect(service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, firstCode)).resolves.toBe(false);
    await expect(service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, secondCode)).resolves.toBe(false);
  });
});

// ============================================================================
// MIT-003: MFA Disable — deletes record from database
// ============================================================================
describe('MIT-003 — MFA Disable with Database Deletion', () => {
  it('disables MFA and deletes record from database', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const dbRecordBefore = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordBefore).toBeDefined();

    await service.disableMfa(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret, Date.now() + 30_000)
    );

    const dbRecordAfter = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordAfter).toBeUndefined();
  });

  it('throws error when disabling MFA that is not configured', async () => {
    await cleanupMfa(TEST_USER_ID);

    await expect(service.disableMfa(TEST_ACCOUNT_ID, TEST_USER_ID, '000000')).rejects.toThrow(
      'MFA is not configured for this user.'
    );
  });
});

// ============================================================================
// MIT-004: Recovery Codes Regeneration — persists new hashes and timestamp
// ============================================================================
describe('MIT-004 — Recovery Codes Regeneration with Persistence', () => {
  it('regenerates recovery codes and persists lastRecoveryCodesRegeneratedAt', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const dbRecordBefore = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordBefore!.lastRecoveryCodesRegeneratedAt).toBeUndefined();

    const newCodes = await service.regenerateRecoveryCodes(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(newCodes).toHaveLength(8);

    const dbRecordAfter = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(dbRecordAfter!.lastRecoveryCodesRegeneratedAt).toBeDefined();

    const oldCodes = setup.recoveryCodes;
    for (const oldCode of oldCodes) {
      const isValid = await service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, oldCode);
      expect(isValid).toBe(false);
    }

    const newCode = newCodes[0];
    const isValidNew = await service.verifyLogin(TEST_ACCOUNT_ID, TEST_USER_ID, newCode);
    expect(isValidNew).toBe(true);
  });

  it('does not regress lastUsedAt when a stale generic update arrives after login', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret)
    );
    const staleRecord = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(staleRecord?.lastUsedAt).toBeUndefined();

    await expect(
      service.verifyLogin(
        TEST_ACCOUNT_ID,
        TEST_USER_ID,
        generateCurrentTOTP(setup.secret, Date.now() + 30_000)
      )
    ).resolves.toBe(true);
    const currentRecord = await repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(currentRecord?.lastUsedAt).toBeDefined();

    await repo.update({
      ...staleRecord!,
      recoveryCodes: [...staleRecord!.recoveryCodes],
      lastRecoveryCodesRegeneratedAt: new Date().toISOString()
    });

    await expect(repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID)).resolves.toMatchObject({
      lastUsedAt: currentRecord?.lastUsedAt
    });
  });
});

// ============================================================================
// MIT-005: MFA Status — reads from database correctly
// ============================================================================
describe('MIT-005 — MFA Status from Database', () => {
  it('returns false when MFA is not configured', async () => {
    await cleanupMfa(TEST_USER_ID);

    const isActive = await service.isMfaActive(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(isActive).toBe(false);
  });

  it('returns true when MFA is active', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    const isActive = await service.isMfaActive(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(isActive).toBe(true);
  });

  it('returns false after MFA is disabled', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_ACCOUNT_ID, TEST_USER_ID, 'test@cvg-his-v2.com');
    const totpCode = generateCurrentTOTP(setup.secret);
    await service.confirmSetup(TEST_ACCOUNT_ID, TEST_USER_ID, totpCode);

    await service.disableMfa(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      generateCurrentTOTP(setup.secret, Date.now() + 30_000)
    );

    const isActive = await service.isMfaActive(TEST_ACCOUNT_ID, TEST_USER_ID);
    expect(isActive).toBe(false);
  });
});

// ============================================================================
// MIT-006: Critical Roles — MFA requirement enforcement
// ============================================================================
describe('MIT-006 — MFA Requirement for Critical Roles', () => {
  it('requires MFA for admin role', () => {
    expect(service.isMfaRequired(['admin'])).toBe(true);
  });

  it('requires MFA for finance role', () => {
    expect(service.isMfaRequired(['finance'])).toBe(true);
  });

  it('requires MFA for auditor role', () => {
    expect(service.isMfaRequired(['auditor'])).toBe(true);
  });

  it('does not require MFA for reception role', () => {
    expect(service.isMfaRequired(['reception'])).toBe(false);
  });

  it('requires MFA when user has any critical role', () => {
    expect(service.isMfaRequired(['reception', 'admin'])).toBe(true);
  });
});

// ============================================================================
// MIT-007: Database Schema — mfa_credentials table structure
// ============================================================================
describe('MIT-007 — mfa_credentials Table Structure', () => {
  it('table exists with correct columns', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.columns 
       WHERE table_name = 'mfa_credentials' 
       AND column_name IN ('id', 'user_id', 'secret_encrypted', 'is_active', 
           'recovery_codes_hash', 'created_at', 'activated_at', 'last_used_at',
           'last_recovery_codes_regenerated_at', 'last_totp_counter',
           'setup_expires_at', 'secret_key_version')`,
      []
    );
    expect(result?.count).toBe(12);
  });

  it('has unique index on user_id', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_indexes
       WHERE tablename = 'mfa_credentials'
       AND indexname = 'mfa_credentials_user_id_unique'`,
      []
    );
    expect(result?.count).toBe(1);
  });
});

// ============================================================================
// MIT-008: PostgreSQL Clock Authority — setup TTL and activation CAS
// ============================================================================
describe('MIT-008 — PostgreSQL clock authority for MFA enrollment', () => {
  it('derives created_at and setup_expires_at from PostgreSQL despite pod clock skew', async () => {
    await cleanupMfa(TEST_USER_ID);
    const podClockOneDayAhead = Date.now() + 24 * 60 * 60 * 1000;
    const skewedService = new MfaService({
      repository: repo,
      encryptionKey: MFA_ENCRYPTION_KEY,
      encryptionKeyVersion: 'integration-v1',
      clock: () => podClockOneDayAhead,
      setupTtlMs: 10 * 60 * 1000
    });

    await skewedService.initiateSetup(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      'test@cvg-his-v2.com'
    );

    const row = await queryOne<{
      created_at: Date;
      setup_expires_at: Date;
      database_now: Date;
    }>(
      `SELECT created_at, setup_expires_at, clock_timestamp() AS database_now
       FROM mfa_credentials
       WHERE account_id = $1 AND user_id = $2`,
      [TEST_ACCOUNT_ID, TEST_USER_ID]
    );
    expect(row).toBeDefined();
    expect(Math.abs(row!.created_at.getTime() - row!.database_now.getTime())).toBeLessThan(5_000);
    expect(
      Math.abs(
        row!.setup_expires_at.getTime() - row!.created_at.getTime() - 10 * 60 * 1000
      )
    ).toBeLessThan(10);
  });

  it('rejects activation expired by PostgreSQL even when the pod clock is behind', async () => {
    await cleanupMfa(TEST_USER_ID);
    const podClockFiveMinutesBehind = Date.now() - 5 * 60 * 1000;
    const skewedService = new MfaService({
      repository: repo,
      encryptionKey: MFA_ENCRYPTION_KEY,
      encryptionKeyVersion: 'integration-v1',
      clock: () => podClockFiveMinutesBehind
    });
    const setup = await skewedService.initiateSetup(
      TEST_ACCOUNT_ID,
      TEST_USER_ID,
      'test@cvg-his-v2.com'
    );
    await pool.query(
      `UPDATE mfa_credentials
       SET setup_expires_at = clock_timestamp() - interval '1 second'
       WHERE account_id = $1 AND user_id = $2`,
      [TEST_ACCOUNT_ID, TEST_USER_ID]
    );

    await expect(
      skewedService.confirmSetup(
        TEST_ACCOUNT_ID,
        TEST_USER_ID,
        generateCurrentTOTP(setup.secret, podClockFiveMinutesBehind)
      )
    ).rejects.toThrow('No pending MFA setup found');
    await expect(repo.findByUserId(TEST_ACCOUNT_ID, TEST_USER_ID)).resolves.toMatchObject({
      isActive: false
    });
  });
});

// ============================================================================
// Helper functions for TOTP generation (mirrors mfa.test.ts)
// ============================================================================

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

function generateCurrentTOTP(secret: string, nowMs = Date.now()): string {
  const { createHmac } = require('node:crypto');
  const TOTP_DIGITS = 6;
  const TOTP_PERIOD = 30;
  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD);
  const key = base32ToBuffer(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}
