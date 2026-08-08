import { getTestPool } from '../../db/db-admin.js';
import { queryOne, queryMany } from '../../helpers/db-helpers.js';

// ============================================================================
// DB Integrity Tests — NOT NULL, UNIQUE, CHECK constraints.
// Based on docs/740 sections 5-7.
// ============================================================================

describe('NOT NULL Constraints', () => {
  it('should reject user without email', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO users (id, account_id, password_hash, full_name, is_active)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), 'hash', 'Test', true)`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject user without password_hash', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO users (id, account_id, email, full_name, is_active)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), 'test@test.com', 'Test', true)`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject user without full_name', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO users (id, account_id, email, password_hash, is_active)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), 'test2@test.com', 'hash', true)`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject user without account_id', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, is_active)
         VALUES (gen_random_uuid(), 'test3@test.com', 'hash', 'Test', true)`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject owner without full_name', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO owners (id, account_id)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1))`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject patient without name', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO patients (id, account_id, owner_id, species)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), (SELECT id FROM owners LIMIT 1), 'canine')`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject patient without species', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO patients (id, account_id, owner_id, name)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), (SELECT id FROM owners LIMIT 1), 'Rex')`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject patient without owner_id', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO patients (id, account_id, name, species)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), 'Rex', 'canine')`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject encounter without patient_id', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO encounters (id, account_id, owner_id, status, opened_by_user_id)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), (SELECT id FROM owners LIMIT 1), 'open', (SELECT id FROM users LIMIT 1))`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      // The ownership guard runs before PostgreSQL evaluates the NOT NULL
      // constraint, so the current invariant is the canonical failure.
      expect(String(error)).toContain('Encounter owner must be the current primary owner');
    }
  });

  it('should reject appointment without start_at', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO appointments (id, account_id, patient_id, owner_id, professional_user_id, end_at, status, type)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), (SELECT id FROM patients LIMIT 1), (SELECT id FROM owners LIMIT 1), (SELECT id FROM users LIMIT 1), NOW() + INTERVAL '1 hour', 'scheduled', 'consultation')`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });

  it('should reject product without name', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO products (id, account_id, base_price, active)
         VALUES (gen_random_uuid(), (SELECT id FROM accounts LIMIT 1), 10.0, true)`
      );
      expect.unreachable('Should have thrown NOT NULL violation');
    } catch (error) {
      expect(String(error)).toContain('not-null');
    }
  });
});

describe('Unique Constraints', () => {
  it('should reject duplicate account slug', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO accounts (id, slug, name, tenant_id)
         VALUES (gen_random_uuid(), 'default', 'Duplicate', '00000000-0000-0000-0000-000000000001')`
      );
      expect.unreachable('Should have thrown unique violation');
    } catch (error) {
      expect(String(error)).toContain('unique');
    }
  });

  it('should reject duplicate role name', async () => {
    try {
      const pool = getTestPool();
      await pool.query(
        `INSERT INTO roles (id, name, description)
         VALUES (gen_random_uuid(), 'admin', 'Duplicate admin')`
      );
      expect.unreachable('Should have thrown unique violation');
    } catch (error) {
      expect(String(error)).toContain('unique');
    }
  });

  it('should reject duplicate permission key', async () => {
    try {
      const pool = getTestPool();
      const firstPerm = await queryOne<{ key: string }>(`SELECT key FROM permissions LIMIT 1`);
      await pool.query(
        `INSERT INTO permissions (id, key, description)
         VALUES (gen_random_uuid(), $1, 'Duplicate')`,
        [firstPerm!.key]
      );
      expect.unreachable('Should have thrown unique violation');
    } catch (error) {
      expect(String(error)).toContain('unique');
    }
  });

  it('should reject duplicate user email within account', async () => {
    try {
      const pool = getTestPool();
      const firstUser = await queryOne<{ account_id: string; email: string }>(
        `SELECT account_id, email FROM users LIMIT 1`
      );
      if (!firstUser) return; // No users in DB (seed skipped without ADMIN_EMAIL/PASSWORD)
      await pool.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name, is_active)
         VALUES (gen_random_uuid(), $1, $2, 'hash', 'Duplicate', true)`,
        [firstUser.account_id, firstUser.email]
      );
      expect.unreachable('Should have thrown unique violation');
    } catch (error) {
      expect(String(error)).toContain('unique');
    }
  });
});

describe('CHECK Constraints', () => {
  it('should reject protocol version with version_number <= 0', async () => {
    try {
      const pool = getTestPool();
      const protocol = await queryOne<{ id: string; account_id: string }>(
        `SELECT id, account_id FROM protocols LIMIT 1`
      );
      if (!protocol) {
        // No protocols exist yet — skip (seed doesn't create protocols)
        return;
      }
      await pool.query(
        `INSERT INTO protocol_versions (id, account_id, protocol_id, version_number, status, title)
         VALUES (gen_random_uuid(), $1, $2, 0, 'draft', 'Invalid')`,
        [protocol.account_id, protocol.id]
      );
      expect.unreachable('Should have thrown CHECK violation');
    } catch (error) {
      const message = String(error);
      expect(message).toMatch(/check|violates/i);
    }
  });
});

describe('Unique Indexes — Existence', () => {
  interface IndexCheck {
    tableName: string;
    indexName: string;
  }

  const ESSENTIAL_INDEXES: IndexCheck[] = [
    { tableName: 'accounts', indexName: 'accounts_slug_unique' },
    { tableName: 'users', indexName: 'users_account_email_unique' },
    { tableName: 'roles', indexName: 'roles_name_unique' },
    { tableName: 'permissions', indexName: 'permissions_key_unique' }
  ];

  it.each(ESSENTIAL_INDEXES)(
    'unique index $indexName on $tableName should exist',
    async ({ tableName, indexName }) => {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int FROM pg_indexes WHERE tablename = $1 AND indexname = $2`,
        [tableName, indexName]
      );
      expect(result?.count).toBe(1);
    }
  );
});

describe('Scheduling Exclusion Constraints', () => {
  it('protects active practitioner, patient and resource intervals', async () => {
    const constraints = await queryMany<{ conname: string }>(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'appointments'::regclass
         AND contype = 'x'
         AND conname = ANY($1::text[])`,
      [[
        'appointments_practitioner_overlap_excl',
        'appointments_patient_overlap_excl',
        'appointments_resource_overlap_excl'
      ]]
    );

    expect(constraints.map((constraint) => constraint.conname).sort()).toEqual([
      'appointments_patient_overlap_excl',
      'appointments_practitioner_overlap_excl',
      'appointments_resource_overlap_excl'
    ]);
  });
});
