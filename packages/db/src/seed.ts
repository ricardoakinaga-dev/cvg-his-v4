import { and, eq, inArray } from 'drizzle-orm';

import {
  DB_ACCESS_CONTROL_PERMISSION_SEEDS,
  DB_ACCESS_CONTROL_ROLE_PERMISSION_MAP,
  DB_ACCESS_CONTROL_ROLE_SEEDS
} from './access-control-seeds.js';
import { closeDbConnection, db } from './connection.js';
import {
  accounts,
  permissions,
  rolePermissions,
  roles,
  professions,
  staff,
  tenants,
  units,
  userRoles,
  users
} from './schema/index.js';
import { hashSeedPassword } from './password.js';

const DEFAULT_TENANT_SLUG = 'default';
const DEFAULT_ACCOUNT_SLUG = 'default';
const DEFAULT_UNIT_CODE = 'hq';

type AccountUnitSeedOptions = {
  readonly tenantSlug: string;
  readonly tenantName: string;
  readonly accountSlug: string;
  readonly accountName: string;
  readonly unitCode: string;
  readonly unitName: string;
};

type SeedAdminCredentials = {
  readonly email: string;
  readonly password: string;
  readonly username?: string;
  readonly fullName?: string;
  readonly roleName?: string;
};

type SeedLaboratorySigner = {
  readonly id: string;
  readonly fullName: string;
  readonly employeeCode: string;
};

const SEED_LABORATORY_PROFESSION = {
  code: 'VET-RESPONSAVEL',
  name: 'Medico veterinario responsavel',
  description: 'Profissao tecnica usada pelo principal clinico do ambiente seed.'
} as const;

const roleSeeds = DB_ACCESS_CONTROL_ROLE_SEEDS;
const permissionSeeds = DB_ACCESS_CONTROL_PERMISSION_SEEDS;
const rolePermissionMap = DB_ACCESS_CONTROL_ROLE_PERMISSION_MAP;

async function ensureAccountAndUnit(
  options: AccountUnitSeedOptions
): Promise<{ accountId: string; unitId: string }> {
  await db
    .insert(tenants)
    .values({
      slug: options.tenantSlug,
      name: options.tenantName
    })
    .onConflictDoNothing({ target: tenants.slug });

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, options.tenantSlug))
    .limit(1);

  if (!tenant) {
    throw new Error(`Failed to ensure tenant ${options.tenantSlug}`);
  }

  await db
    .insert(accounts)
    .values({
      tenantId: tenant.id,
      slug: options.accountSlug,
      name: options.accountName
    })
    .onConflictDoNothing({ target: accounts.slug });

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.slug, options.accountSlug))
    .limit(1);

  if (!account) {
    throw new Error(`Failed to ensure account ${options.accountSlug}`);
  }

  await db
    .insert(units)
    .values({
      accountId: account.id,
      code: options.unitCode,
      name: options.unitName
    })
    .onConflictDoNothing({ target: [units.accountId, units.code] });

  const [unit] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.accountId, account.id), eq(units.code, options.unitCode)))
    .limit(1);

  if (!unit) {
    throw new Error(`Failed to ensure unit ${options.unitCode} for account ${options.accountSlug}`);
  }

  return { accountId: account.id, unitId: unit.id };
}

async function ensureDefaultAccountAndUnit(): Promise<{ accountId: string; unitId: string }> {
  return ensureAccountAndUnit({
    tenantSlug: DEFAULT_TENANT_SLUG,
    tenantName: 'Tenant padrao',
    accountSlug: DEFAULT_ACCOUNT_SLUG,
    accountName: 'Conta padrao',
    unitCode: DEFAULT_UNIT_CODE,
    unitName: 'Unidade Central'
  });
}

async function seedPermissionsAndRoles(): Promise<void> {
  await db
    .insert(permissions)
    .values(permissionSeeds)
    .onConflictDoNothing({ target: permissions.key });
  await db.insert(roles).values(roleSeeds).onConflictDoNothing({ target: roles.name });

  const dbPermissions = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(
      inArray(
        permissions.key,
        permissionSeeds.map((permission) => permission.key)
      )
    );

  const dbRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(
      inArray(
        roles.name,
        roleSeeds.map((role) => role.name)
      )
    );

  const permissionIdByKey = new Map(
    dbPermissions.map((permission: { key: string; id: string }) => [permission.key, permission.id])
  );
  const roleIdByName = new Map(
    dbRoles.map((role: { name: string; id: string }) => [role.name, role.id])
  );

  for (const [roleName, permissionKeys] of Object.entries(rolePermissionMap)) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) {
      continue;
    }

    const values = permissionKeys
      .map((permissionKey) => {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (!permissionId) {
          return null;
        }

        return {
          roleId,
          permissionId
        };
      })
      .filter((value): value is { roleId: string; permissionId: string } => value !== null);

    if (values.length === 0) {
      continue;
    }

    await db
      .insert(rolePermissions)
      .values(values)
      .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
  }
}

async function seedAdminUser(
  accountId: string,
  unitId: string,
  credentials?: SeedAdminCredentials
): Promise<string | null> {
  const adminEmail = credentials?.email ?? process.env.ADMIN_EMAIL;
  const adminPassword = credentials?.password ?? process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.info('ADMIN_EMAIL/ADMIN_PASSWORD nao definidos. Seed de usuario admin foi pulado.');
    return null;
  }

  await db
    .insert(users)
    .values({
      accountId,
      unitId,
      username:
        credentials?.username?.trim() ||
        process.env.ADMIN_USERNAME?.trim() ||
        adminEmail.split('@')[0]!,
      email: adminEmail,
      passwordHash: await hashSeedPassword(adminPassword),
      fullName: credentials?.fullName ?? 'Administrador Seed'
    })
    .onConflictDoNothing({ target: [users.accountId, users.email] });

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.accountId, accountId), eq(users.email, adminEmail)))
    .limit(1);

  const roleName = credentials?.roleName ?? 'admin';
  const [adminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!adminUser || !adminRole) {
    console.warn(`Nao foi possivel vincular usuario ${adminEmail} ao role ${roleName}.`);
    return null;
  }

  await db
    .insert(userRoles)
    .values({
      userId: adminUser.id,
      roleId: adminRole.id
    })
    .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });

  if (roleName === 'admin' || roleName === 'veterinarian') {
    await ensureSeedLaboratorySigner(accountId, {
      id: adminUser.id,
      fullName: credentials?.fullName ?? 'Administrador Seed',
      employeeCode: roleName === 'admin' ? 'SEED-ADMIN-VET-001' : 'SEED-VET-001'
    });
  }

  return adminUser.id;
}

async function ensureSeedLaboratorySigner(
  accountId: string,
  user: SeedLaboratorySigner
): Promise<void> {
  await db
    .insert(professions)
    .values({
      accountId,
      code: SEED_LABORATORY_PROFESSION.code,
      name: SEED_LABORATORY_PROFESSION.name,
      description: SEED_LABORATORY_PROFESSION.description,
      isActive: true
    })
    .onConflictDoUpdate({
      target: [professions.accountId, professions.code],
      set: {
        name: SEED_LABORATORY_PROFESSION.name,
        description: SEED_LABORATORY_PROFESSION.description,
        isActive: true,
        updatedAt: new Date()
      }
    });

  const [profession] = await db
    .select({ id: professions.id })
    .from(professions)
    .where(
      and(
        eq(professions.accountId, accountId),
        eq(professions.code, SEED_LABORATORY_PROFESSION.code)
      )
    )
    .limit(1);

  if (!profession) {
    throw new Error(`Failed to ensure seed laboratory profession for account ${accountId}`);
  }

  await db
    .insert(staff)
    .values({
      accountId,
      userId: user.id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      department: 'Clinica',
      jobTitle: 'Medico veterinario',
      professionId: profession.id,
      isActive: true
    })
    .onConflictDoUpdate({
      target: [staff.accountId, staff.employeeCode],
      set: {
        userId: user.id,
        fullName: user.fullName,
        department: 'Clinica',
        jobTitle: 'Medico veterinario',
        professionId: profession.id,
        isActive: true,
        updatedAt: new Date()
      }
    });
}

async function runSeed(): Promise<void> {
  try {
    const { accountId, unitId } = await ensureDefaultAccountAndUnit();
    await seedPermissionsAndRoles();
    await seedAdminUser(accountId, unitId);

    const receptionEmail = process.env.RECEPTION_EMAIL?.trim();
    const receptionPassword = process.env.RECEPTION_PASSWORD;
    if (receptionEmail && receptionPassword) {
      await seedAdminUser(accountId, unitId, {
        email: receptionEmail,
        password: receptionPassword,
        username: process.env.RECEPTION_USERNAME?.trim() || receptionEmail.split('@')[0]!,
        fullName: 'Recepção E2E',
        roleName: 'reception'
      });
    }

    const veterinarianEmail = process.env.VETERINARIAN_EMAIL?.trim();
    const veterinarianPassword = process.env.VETERINARIAN_PASSWORD;
    if (veterinarianEmail && veterinarianPassword) {
      await seedAdminUser(accountId, unitId, {
        email: veterinarianEmail,
        password: veterinarianPassword,
        username: process.env.VETERINARIAN_USERNAME?.trim() || veterinarianEmail.split('@')[0]!,
        fullName: 'Veterinário E2E',
        roleName: 'veterinarian'
      });
    }

    const secondAdminEmail = process.env.SECOND_ADMIN_EMAIL?.trim();
    const secondAdminPassword = process.env.SECOND_ADMIN_PASSWORD;
    if (secondAdminEmail && secondAdminPassword) {
      const secondTenantSlug = process.env.SECOND_TENANT_SLUG?.trim() || 'e2e-secondary';
      const secondAccountSlug = process.env.SECOND_ACCOUNT_SLUG?.trim() || secondTenantSlug;
      const secondUnitCode = process.env.SECOND_UNIT_CODE?.trim() || DEFAULT_UNIT_CODE;
      const second = await ensureAccountAndUnit({
        tenantSlug: secondTenantSlug,
        tenantName: 'Tenant secundario E2E',
        accountSlug: secondAccountSlug,
        accountName: 'Conta secundaria E2E',
        unitCode: secondUnitCode,
        unitName: 'Unidade Secundaria E2E'
      });
      await seedAdminUser(second.accountId, second.unitId, {
        email: secondAdminEmail,
        password: secondAdminPassword,
        username: process.env.SECOND_ADMIN_USERNAME?.trim() || secondAdminEmail.split('@')[0]!,
        fullName: 'Administrador Tenant B'
      });
      console.info(`Seed secundario concluido para tenant ${secondTenantSlug}.`);
    }

    console.info('Seed concluido com sucesso.');
  } finally {
    await closeDbConnection();
  }
}

void runSeed().catch((error) => {
  console.error('Falha ao executar seed.', error);
  process.exitCode = 1;
});
