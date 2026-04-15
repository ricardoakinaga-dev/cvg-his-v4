import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const permissions = [
  { id: '00000000-0000-4000-8000-000000000101', key: 'auth.session.read', description: 'Read current authenticated session.' },
  { id: '00000000-0000-4000-8000-000000000102', key: 'owners.read', description: 'Read owner records.' },
  { id: '00000000-0000-4000-8000-000000000103', key: 'patients.read', description: 'Read patient records.' },
  { id: '00000000-0000-4000-8000-000000000104', key: 'staff.read', description: 'Read staff records.' },
  { id: '00000000-0000-4000-8000-000000000105', key: 'encounters.read', description: 'Read encounters.' },
  { id: '00000000-0000-4000-8000-000000000106', key: 'scheduling.read', description: 'Read scheduling data.' },
  { id: '00000000-0000-4000-8000-000000000107', key: 'billing.read', description: 'Read billing records.' },
  { id: '00000000-0000-4000-8000-000000000108', key: 'billing.manage', description: 'Manage billing records.' },
  { id: '00000000-0000-4000-8000-000000000109', key: 'inventory.read', description: 'Read inventory items.' },
  { id: '00000000-0000-4000-8000-00000000010a', key: 'inventory.manage', description: 'Manage inventory items.' },
  { id: '00000000-0000-4000-8000-00000000010b', key: 'medical-records.read', description: 'Read medical records.' }
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
    email: 'admin@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
    fullName: 'Admin Benchmark',
    roleCode: 'admin'
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    email: 'vet@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_vet',
    fullName: 'Vet Benchmark',
    roleCode: 'veterinarian'
  },
  {
    id: '00000000-0000-4000-8000-000000000303',
    email: 'finance@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_finance',
    fullName: 'Finance Benchmark',
    roleCode: 'finance'
  },
  {
    id: '00000000-0000-4000-8000-000000000304',
    email: 'inventory@cvg-his.local',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_inventory',
    fullName: 'Inventory Benchmark',
    roleCode: 'inventory'
  }
] as const;

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

async function ensureUsers(client: InstanceType<typeof Client>) {
  const accountRow = await client.query<{ id: string }>(
    'SELECT id FROM accounts WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
  );
  const accountId = process.env.ACCOUNT_ID ?? accountRow.rows[0]?.id;

  if (!accountId) {
    throw new Error('No active account found for benchmark fixture');
  }

  for (const user of users) {
    await client.query(
      `
        INSERT INTO users (id, account_id, email, password_hash, full_name, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        ON CONFLICT (account_id, email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            is_active = true,
            updated_at = NOW()
      `,
      [user.id, accountId, user.email, user.passwordHash, user.fullName]
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
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await ensurePermissions(client);
    await ensureRoles(client);
    await ensureUsers(client);
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
