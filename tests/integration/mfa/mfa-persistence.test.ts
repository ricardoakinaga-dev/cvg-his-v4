import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@cvg-his-v2/shared-database';
import {
  MfaService,
  DatabaseMfaRepository,
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
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let repo: DatabaseMfaRepository;
let service: MfaService;

beforeAll(async () => {
  validateMasterKey(MFA_ENCRYPTION_KEY);

  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL_TEST ??
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/cvg_his_v2_test',
    max: 2
  });

  db = drizzle(pool, { schema });
  repo = new DatabaseMfaRepository(db);
  service = new MfaService({ repository: repo, encryptionKey: MFA_ENCRYPTION_KEY });

  await cleanupMfa(TEST_USER_ID);
});

afterAll(async () => {
  await cleanupMfa(TEST_USER_ID);
  await pool.end();
});

async function cleanupMfa(userId: string): Promise<void> {
  await db
    .delete(schema.mfaCredentials)
    .where(schema.mfaCredentials.userId.equals(userId as never));
}

// ============================================================================
// MIT-001: MFA Setup + Confirm — persists encrypted secret and hashed codes
// ============================================================================
describe('MIT-001 — MFA Setup + Confirm with Database Persistence', () => {
  it('initiates setup and returns secret, provisioning URI, and recovery codes', async () => {
    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');

    expect(setup.secret).toBeDefined();
    expect(setup.secret.length).toBeGreaterThan(0);
    expect(setup.provisioningUri).toContain('otpauth://totp/');
    expect(setup.provisioningUri).toContain('CVG-HIS-V2');
    expect(setup.recoveryCodes).toHaveLength(10);
  });

  it('confirms setup and persists encrypted secret to database', async () => {
    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');

    const totpCode = generateSecret();
    const secretRaw = setup.secret;

    const record = await service.confirmSetup(TEST_USER_ID, totpCode);

    expect(record.isActive).toBe(true);
    expect(record.activatedAt).toBeDefined();

    const dbRecord = await repo.findByUserId(TEST_USER_ID);
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
    expect(dbRow!.recovery_codes_hash).toHaveLength(10);

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

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const dbRecordBefore = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordBefore!.lastUsedAt).toBeUndefined();

    const isValid = await service.verifyLogin(TEST_USER_ID, setup.secret);
    expect(isValid).toBe(true);

    const dbRecordAfter = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordAfter!.lastUsedAt).toBeDefined();
  });

  it('rejects login with invalid TOTP', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const isValid = await service.verifyLogin(TEST_USER_ID, '000000');
    expect(isValid).toBe(false);
  });

  it('verifies login with recovery code and consumes it', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const recoveryCode = setup.recoveryCodes[0];
    const isValid = await service.verifyLogin(TEST_USER_ID, recoveryCode);
    expect(isValid).toBe(true);

    const secondUse = await service.verifyLogin(TEST_USER_ID, recoveryCode);
    expect(secondUse).toBe(false);
  });
});

// ============================================================================
// MIT-003: MFA Disable — deletes record from database
// ============================================================================
describe('MIT-003 — MFA Disable with Database Deletion', () => {
  it('disables MFA and deletes record from database', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const dbRecordBefore = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordBefore).toBeDefined();

    await service.disableMfa(TEST_USER_ID, setup.secret);

    const dbRecordAfter = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordAfter).toBeUndefined();
  });

  it('throws error when disabling MFA that is not configured', async () => {
    await cleanupMfa(TEST_USER_ID);

    await expect(service.disableMfa(TEST_USER_ID, '000000')).rejects.toThrow(
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

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const dbRecordBefore = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordBefore!.lastRecoveryCodesRegeneratedAt).toBeUndefined();

    const newCodes = await service.regenerateRecoveryCodes(TEST_USER_ID);
    expect(newCodes).toHaveLength(10);

    const dbRecordAfter = await repo.findByUserId(TEST_USER_ID);
    expect(dbRecordAfter!.lastRecoveryCodesRegeneratedAt).toBeDefined();

    const oldCodes = setup.recoveryCodes;
    for (const oldCode of oldCodes) {
      const isValid = await service.verifyLogin(TEST_USER_ID, oldCode);
      expect(isValid).toBe(false);
    }

    const newCode = newCodes[0];
    const isValidNew = await service.verifyLogin(TEST_USER_ID, newCode);
    expect(isValidNew).toBe(true);
  });
});

// ============================================================================
// MIT-005: MFA Status — reads from database correctly
// ============================================================================
describe('MIT-005 — MFA Status from Database', () => {
  it('returns false when MFA is not configured', async () => {
    await cleanupMfa(TEST_USER_ID);

    const isActive = await service.isMfaActive(TEST_USER_ID);
    expect(isActive).toBe(false);
  });

  it('returns true when MFA is active', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    const isActive = await service.isMfaActive(TEST_USER_ID);
    expect(isActive).toBe(true);
  });

  it('returns false after MFA is disabled', async () => {
    await cleanupMfa(TEST_USER_ID);

    const setup = await service.initiateSetup(TEST_USER_ID, 'test@cvg-his-v2.com');
    await service.confirmSetup(TEST_USER_ID, setup.secret);

    await service.disableMfa(TEST_USER_ID, setup.secret);

    const isActive = await service.isMfaActive(TEST_USER_ID);
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
           'last_recovery_codes_regenerated_at')`,
      []
    );
    expect(result?.count).toBe(9);
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
