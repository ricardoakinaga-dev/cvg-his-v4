import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const permissions = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    key: 'auth.session.read',
    description: 'Read current authenticated session.'
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    key: 'owners.read',
    description: 'Read owner records.'
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    key: 'patients.read',
    description: 'Read patient records.'
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    key: 'staff.read',
    description: 'Read staff records.'
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    key: 'encounters.read',
    description: 'Read encounters.'
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    key: 'scheduling.read',
    description: 'Read scheduling data.'
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    key: 'billing.read',
    description: 'Read billing records.'
  },
  {
    id: '00000000-0000-4000-8000-000000000108',
    key: 'billing.manage',
    description: 'Manage billing records.'
  },
  {
    id: '00000000-0000-4000-8000-000000000109',
    key: 'inventory.read',
    description: 'Read inventory items.'
  },
  {
    id: '00000000-0000-4000-8000-00000000010a',
    key: 'inventory.manage',
    description: 'Manage inventory items.'
  },
  {
    id: '00000000-0000-4000-8000-00000000010b',
    key: 'medical-records.read',
    description: 'Read medical records.'
  }
] as const;

const roles = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    code: 'admin',
    description: 'Benchmark administrator role.',
    permissionKeys: permissions.map((permission) => permission.key)
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    code: 'veterinarian',
    description: 'Benchmark veterinarian role.',
    permissionKeys: [
      'auth.session.read',
      'owners.read',
      'patients.read',
      'encounters.read',
      'inventory.read',
      'medical-records.read'
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    code: 'finance',
    description: 'Benchmark finance role.',
    permissionKeys: [
      'auth.session.read',
      'owners.read',
      'patients.read',
      'encounters.read',
      'billing.read',
      'billing.manage'
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    code: 'inventory',
    description: 'Benchmark inventory role.',
    permissionKeys: [
      'auth.session.read',
      'patients.read',
      'encounters.read',
      'inventory.read',
      'inventory.manage'
    ]
  }
] as const;

const users = [
  {
    id: '00000000-0000-4000-8000-000000000301',
    username: 'admin@cvg-his.local',
    email: 'admin@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
    fullName: 'Admin Benchmark',
    roleCode: 'admin'
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    username: 'vet@cvg-his.local',
    email: 'vet@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_vet',
    fullName: 'Vet Benchmark',
    roleCode: 'veterinarian'
  },
  {
    id: '00000000-0000-4000-8000-000000000303',
    username: 'finance@cvg-his.local',
    email: 'finance@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_finance',
    fullName: 'Finance Benchmark',
    roleCode: 'finance'
  },
  {
    id: '00000000-0000-4000-8000-000000000304',
    username: 'inventory@cvg-his.local',
    email: 'inventory@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_inventory',
    fullName: 'Inventory Benchmark',
    roleCode: 'inventory'
  }
] as const;

const BENCHMARK_OWNER_ID = '00000000-0000-4000-8000-000000000401';
const BENCHMARK_PATIENT_ID = '00000000-0000-4000-8000-000000000402';
const BENCHMARK_ENCOUNTER_ID = '00000000-0000-4000-8000-000000000403';

type FixtureTable = 'users' | 'owners' | 'patients' | 'encounters';

const BENCHMARK_FIXTURE_KEYS: readonly { table: FixtureTable; id: string }[] = [
  ...users.map((user) => ({ table: 'users' as const, id: user.id })),
  { table: 'owners', id: BENCHMARK_OWNER_ID },
  { table: 'patients', id: BENCHMARK_PATIENT_ID },
  { table: 'encounters', id: BENCHMARK_ENCOUNTER_ID }
];

async function ensurePermissions(client: InstanceType<typeof Client>) {
  for (const permission of permissions) {
    await client.query(
      `
        INSERT INTO permissions (id, key, description, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key) DO UPDATE
        SET description = EXCLUDED.description
      `,
      [permission.id, permission.key, permission.description]
    );
  }
}

async function ensureRoles(client: InstanceType<typeof Client>) {
  for (const role of roles) {
    await client.query(
      `
        INSERT INTO roles (id, name, description, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (name) DO UPDATE
        SET description = EXCLUDED.description
      `,
      [role.id, role.code, role.description]
    );

    const persistedRole = await client.query<{ id: string }>(
      'SELECT id FROM roles WHERE name = $1',
      [role.code]
    );
    const roleId = persistedRole.rows[0]?.id;
    if (!roleId) {
      throw new Error(`Role not found after upsert: ${role.code}`);
    }

    for (const permissionKey of role.permissionKeys) {
      const persistedPermission = await client.query<{ id: string }>(
        'SELECT id FROM permissions WHERE key = $1',
        [permissionKey]
      );
      const permissionId = persistedPermission.rows[0]?.id;
      if (!permissionId) {
        throw new Error(`Permission not found after upsert: ${permissionKey}`);
      }

      await client.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [roleId, permissionId]
      );
    }
  }
}

async function ensureUsers(
  client: InstanceType<typeof Client>
): Promise<{ accountId: string; adminUserId: string }> {
  const accountId = await resolveBenchmarkAccount(client);

  for (const user of users) {
    await assertFixtureOwnership(client, 'users', user.id, accountId, user.email);
    await client.query(
      `
        INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (account_id, email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            username = EXCLUDED.username,
            full_name = EXCLUDED.full_name,
            is_active = true,
            updated_at = NOW()
      `,
      [user.id, accountId, user.username, user.email, user.passwordHash, user.fullName]
    );

    const persistedUser = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE account_id = $1 AND email = $2',
      [accountId, user.email]
    );
    const persistedRole = await client.query<{ id: string }>(
      'SELECT id FROM roles WHERE name = $1',
      [user.roleCode]
    );

    const userId = persistedUser.rows[0]?.id;
    const roleId = persistedRole.rows[0]?.id;

    if (!userId || !roleId) {
      throw new Error(`Failed to load user or role for ${user.email}`);
    }

    await client.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [userId, roleId]
    );
  }

  const adminUser = await client.query<{ id: string }>(
    'SELECT id FROM users WHERE account_id = $1 AND email = $2',
    [accountId, 'admin@cvg-his.local']
  );
  const adminUserId = adminUser.rows[0]?.id;
  if (!adminUserId) {
    throw new Error('Benchmark admin user not found after fixture upsert');
  }

  return { accountId, adminUserId };
}

async function resolveBenchmarkAccount(client: InstanceType<typeof Client>): Promise<string> {
  const requestedAccountId = process.env.ACCOUNT_ID?.trim() || undefined;
  const requestedAccountSlug = process.env.ACCOUNT_SLUG?.trim() || undefined;

  if (requestedAccountId) {
    return findActiveAccountOrThrow(
      client,
      'SELECT id FROM accounts WHERE id = $1 AND is_active = true LIMIT 1',
      [requestedAccountId],
      `ACCOUNT_ID=${requestedAccountId}`
    );
  }

  if (requestedAccountSlug) {
    return findActiveAccountOrThrow(
      client,
      'SELECT id FROM accounts WHERE slug = $1 AND is_active = true LIMIT 1',
      [requestedAccountSlug],
      `ACCOUNT_SLUG=${requestedAccountSlug}`
    );
  }

  // A previous version selected an arbitrary active account. Preserve an
  // already-created benchmark fixture set when it is coherent, while making
  // a fresh database resolve to the canonical account created by db/seed.ts.
  const fixtureAccountIds = await findExistingFixtureAccountIds(client);
  if (fixtureAccountIds.length > 1) {
    throw new Error(
      `Benchmark fixture IDs belong to multiple accounts (${fixtureAccountIds.join(', ')}); refusing to merge them`
    );
  }
  if (fixtureAccountIds.length === 1) {
    return findActiveAccountOrThrow(
      client,
      'SELECT id FROM accounts WHERE id = $1 AND is_active = true LIMIT 1',
      [fixtureAccountIds[0]],
      `existing benchmark fixtures in account ${fixtureAccountIds[0]}`
    );
  }

  return findActiveAccountOrThrow(
    client,
    'SELECT id FROM accounts WHERE slug = $1 AND is_active = true LIMIT 1',
    ['default'],
    'ACCOUNT_SLUG=default'
  );
}

async function findActiveAccountOrThrow(
  client: InstanceType<typeof Client>,
  query: string,
  values: readonly unknown[],
  selector: string
): Promise<string> {
  const accountRow = await client.query<{ id: string }>(query, values);
  const accountId = accountRow.rows[0]?.id;
  if (!accountId) {
    throw new Error(`No active account found for ${selector}`);
  }
  return accountId;
}

async function findExistingFixtureAccountIds(
  client: InstanceType<typeof Client>
): Promise<string[]> {
  const accountIds = new Set<string>();
  for (const fixture of BENCHMARK_FIXTURE_KEYS) {
    const result = await client.query<{ account_id: string }>(
      `SELECT account_id FROM ${fixture.table} WHERE id = $1 LIMIT 1`,
      [fixture.id]
    );
    const accountId = result.rows[0]?.account_id;
    if (accountId) accountIds.add(accountId);
  }
  return [...accountIds];
}

/**
 * Fixture IDs are intentionally stable so the k6 script can avoid discovery
 * requests. Never move an existing row from another tenant while repairing a
 * dirty benchmark database; fail closed and require an explicit cleanup.
 */
async function assertFixtureOwnership(
  client: InstanceType<typeof Client>,
  table: FixtureTable,
  id: string,
  accountId: string,
  label: string
): Promise<void> {
  const existing = await client.query<{ account_id: string }>(
    `SELECT account_id FROM ${table} WHERE id = $1 LIMIT 1`,
    [id]
  );
  const existingAccountId = existing.rows[0]?.account_id;
  if (existingAccountId && existingAccountId !== accountId) {
    throw new Error(
      `Benchmark fixture ${label} (${id}) belongs to account ${existingAccountId}; refusing to reassign it to ${accountId}`
    );
  }
}

async function ensureDomainFixtures(
  client: InstanceType<typeof Client>,
  accountId: string,
  adminUserId: string
) {
  await assertFixtureOwnership(client, 'owners', BENCHMARK_OWNER_ID, accountId, 'owner');
  await assertFixtureOwnership(client, 'patients', BENCHMARK_PATIENT_ID, accountId, 'patient');
  await assertFixtureOwnership(
    client,
    'encounters',
    BENCHMARK_ENCOUNTER_ID,
    accountId,
    'encounter'
  );

  await client.query(
    `
      INSERT INTO owners (
        id, account_id, full_name, document, email, phone_main, address_json, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        full_name = EXCLUDED.full_name,
        document = EXCLUDED.document,
        email = EXCLUDED.email,
        phone_main = EXCLUDED.phone_main,
        address_json = EXCLUDED.address_json,
        updated_at = NOW()
    `,
    [
      BENCHMARK_OWNER_ID,
      accountId,
      'Tutor Benchmark',
      '00000000000',
      'benchmark.owner@cvg-his.local',
      '+55 11 90000-0401',
      JSON.stringify({
        version: 2,
        contacts: [
          {
            label: 'Email',
            value: 'benchmark.owner@cvg-his.local',
            type: 'email',
            primary: true
          }
        ],
        status: 'active',
        financialResponsible: true
      })
    ]
  );

  await client.query(
    `
      INSERT INTO patients (
        id, account_id, owner_id, name, species, breed, sex, birth_date, weight_kg,
        alerts_json, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        owner_id = EXCLUDED.owner_id,
        name = EXCLUDED.name,
        species = EXCLUDED.species,
        breed = EXCLUDED.breed,
        sex = EXCLUDED.sex,
        birth_date = EXCLUDED.birth_date,
        weight_kg = EXCLUDED.weight_kg,
        alerts_json = EXCLUDED.alerts_json,
        updated_at = NOW()
    `,
    [
      BENCHMARK_PATIENT_ID,
      accountId,
      BENCHMARK_OWNER_ID,
      'Paciente Benchmark',
      'canine',
      'SRD',
      'female',
      '2020-01-01',
      '18.500',
      JSON.stringify({ version: 2, status: 'active', size: 'medium' })
    ]
  );

  await client.query(
    `
      INSERT INTO encounters (
        id, account_id, patient_id, owner_id, status, opened_by_user_id,
        opened_at, reason, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'open', $5, NOW(), $6, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        patient_id = EXCLUDED.patient_id,
        owner_id = EXCLUDED.owner_id,
        status = 'open',
        opened_by_user_id = EXCLUDED.opened_by_user_id,
        closed_by_user_id = NULL,
        opened_at = EXCLUDED.opened_at,
        closed_at = NULL,
        close_reason = NULL,
        reason = EXCLUDED.reason,
        updated_at = NOW()
    `,
    [
      BENCHMARK_ENCOUNTER_ID,
      accountId,
      BENCHMARK_PATIENT_ID,
      BENCHMARK_OWNER_ID,
      adminUserId,
      'Benchmark clinical encounter'
    ]
  );
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await ensurePermissions(client);
    await ensureRoles(client);
    const { accountId, adminUserId } = await ensureUsers(client);
    await ensureDomainFixtures(client, accountId, adminUserId);
    await client.query('COMMIT');
    console.log('Benchmark fixtures ready');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    'Failed to prepare benchmark fixtures:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
