import { and, eq, inArray } from 'drizzle-orm';

import { closeDbConnection, db } from './connection.js';
import {
  accounts,
  permissions,
  rolePermissions,
  roles,
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

// Role seeds now use AccessControlService codes (not @cvg-his/rbac codes)
// This eliminates the dual RBAC divergence between seed and enforcement
const roleSeeds = [
  { name: 'admin', description: 'Acesso administrativo completo.' },
  { name: 'veterinarian', description: 'Perfil de medico veterinario.' },
  { name: 'nurse', description: 'Perfil de enfermagem.' },
  { name: 'reception', description: 'Perfil de recepcao.' },
  { name: 'finance', description: 'Perfil financeiro e faturamento.' },
  { name: 'inventory', description: 'Perfil de gestao de estoque.' },
  { name: 'auditor', description: 'Perfil de auditoria.' }
];

// Permission seeds now use AccessControlService codes (plural nouns + read/manage)
// This eliminates the dual RBAC divergence between seed and enforcement
const permissionSeeds = [
  { key: 'auth.session.read', description: 'Permite leitura da propria sessao.' },
  { key: 'users.read', description: 'Permite leitura de usuarios do sistema.' },
  { key: 'users.manage', description: 'Permite criar e gerenciar usuarios.' },
  { key: 'staff.read', description: 'Permite leitura de membros da equipe.' },
  { key: 'staff.manage', description: 'Permite gerenciar membros da equipe.' },
  { key: 'access.read', description: 'Permite leitura de roles e permissoes.' },
  { key: 'audit.read', description: 'Permite leitura de trilhas de auditoria.' },
  { key: 'audit.write', description: 'Permite gravar eventos de auditoria.' },
  { key: 'owners.read', description: 'Permite leitura de cadastros de proprietarios.' },
  { key: 'owners.manage', description: 'Permite criar e alterar cadastros de proprietarios.' },
  { key: 'patients.read', description: 'Permite leitura de cadastros clinicos de pacientes.' },
  {
    key: 'patients.manage',
    description: 'Permite criar e alterar cadastros clinicos de pacientes.'
  },
  { key: 'scheduling.read', description: 'Permite leitura de agendamentos e fila.' },
  { key: 'scheduling.manage', description: 'Permite gerenciar agendamentos e fila.' },
  { key: 'encounters.read', description: 'Permite leitura de atendimentos e casos clinicos.' },
  {
    key: 'encounters.manage',
    description: 'Permite abertura e atualizacao de atendimentos clinicos.'
  },
  { key: 'triage.read', description: 'Permite leitura de triagens.' },
  { key: 'triage.manage', description: 'Permite registrar e gerenciar triagens.' },
  { key: 'medical-records.read', description: 'Permite leitura de prontuarios e notas clinicas.' },
  {
    key: 'medical-records.manage',
    description: 'Permite criar e editar notas clinicas e prontuarios.'
  },
  { key: 'attachments.read', description: 'Permite leitura de anexos e documentos clinicos.' },
  { key: 'attachments.manage', description: 'Permite upload e vinculo de documentos clinicos.' },
  { key: 'inpatient.read', description: 'Permite leitura de internacoes ativas e historicas.' },
  { key: 'inpatient.manage', description: 'Permite admitir e transferir internacoes.' },
  { key: 'surgery.read', description: 'Permite leitura de casos cirurgicos.' },
  { key: 'surgery.manage', description: 'Permite gerenciar casos cirurgicos.' },
  { key: 'diagnostics.read', description: 'Permite leitura de ordens e resultados de exames.' },
  {
    key: 'diagnostics.manage',
    description: 'Permite criar ordens de exame e registrar resultados.'
  },
  { key: 'billing.read', description: 'Permite leitura de registros de cobranca.' },
  { key: 'billing.manage', description: 'Permite criar e gerenciar itens de cobranca.' },
  { key: 'inventory.read', description: 'Permite leitura de itens de estoque.' },
  { key: 'inventory.manage', description: 'Permite registrar consumo de estoque.' },
  { key: 'prescriptions.read', description: 'Permite leitura de prescricoes clinicas.' },
  { key: 'prescriptions.write', description: 'Permite criar e alterar prescricoes clinicas.' },
  {
    key: 'prescription-executions.read',
    description: 'Permite leitura da execucao de prescricoes.'
  },
  {
    key: 'prescription-executions.manage',
    description: 'Permite gerenciar a execucao de prescricoes.'
  },
  { key: 'discharges.read', description: 'Permite leitura de altas clinicas.' },
  { key: 'discharges.manage', description: 'Permite gerenciar altas clinicas.' },
  { key: 'fiscal.read', description: 'Permite leitura de configuracoes fiscais.' },
  { key: 'fiscal.manage', description: 'Permite gerenciar configuracoes fiscais.' },
  {
    key: 'marketing.read',
    description: 'Permite leitura de audiencias, campanhas e entregas de marketing.'
  },
  {
    key: 'marketing.manage',
    description: 'Permite gerenciar consentimentos, campanhas e entregas de marketing.'
  },
  { key: 'product.read', description: 'Permite leitura do cadastro de produtos.' },
  { key: 'product.write', description: 'Permite gerenciar o cadastro de produtos.' },
  {
    key: 'service.read',
    description: 'Permite leitura dos cadastros auxiliares e servicos.'
  },
  {
    key: 'service.write',
    description: 'Permite gerenciar cadastros auxiliares e servicos.'
  },
  { key: 'counter_sale.read', description: 'Permite leitura de vendas de balcao.' },
  { key: 'counter_sale.write', description: 'Permite gerenciar vendas de balcao.' },
  { key: 'quote.read', description: 'Permite leitura de orcamentos.' },
  { key: 'quote.write', description: 'Permite gerenciar orcamentos.' },
  { key: 'webhooks.read', description: 'Permite leitura de webhooks.' },
  { key: 'webhooks.manage', description: 'Permite gerenciar webhooks.' },
  { key: 'integrations.read', description: 'Permite leitura de integracoes.' },
  { key: 'integrations.manage', description: 'Permite gerenciar integracoes.' },
  { key: 'api_keys.manage', description: 'Permite gerenciar chaves de API.' },
  { key: 'notifications.read', description: 'Permite leitura de notificacoes operacionais.' },
  { key: 'notifications.manage', description: 'Permite criar e processar notificacoes.' }
];

// Role-permission mapping aligned with AccessControlService vocabulary
const rolePermissionMap: Record<string, string[]> = {
  admin: permissionSeeds.map((p) => p.key),
  veterinarian: [
    'auth.session.read',
    'audit.read',
    'audit.write',
    'owners.read',
    'patients.read',
    'patients.manage',
    'scheduling.read',
    'scheduling.manage',
    'encounters.read',
    'encounters.manage',
    'triage.read',
    'triage.manage',
    'medical-records.read',
    'medical-records.manage',
    'attachments.read',
    'attachments.manage',
    'inpatient.read',
    'inpatient.manage',
    'surgery.read',
    'surgery.manage',
    'diagnostics.read',
    'diagnostics.manage',
    'billing.read',
    'notifications.read'
  ],
  nurse: [
    'auth.session.read',
    'audit.read',
    'owners.read',
    'patients.read',
    'scheduling.read',
    'encounters.read',
    'encounters.manage',
    'triage.read',
    'triage.manage',
    'medical-records.read',
    'medical-records.manage',
    'attachments.read',
    'attachments.manage',
    'inpatient.read',
    'inpatient.manage',
    'surgery.read',
    'diagnostics.read',
    'diagnostics.manage',
    'billing.read',
    'inventory.read',
    'inventory.manage',
    'notifications.read'
  ],
  reception: [
    'auth.session.read',
    'owners.read',
    'owners.manage',
    'patients.read',
    'patients.manage',
    'scheduling.read',
    'scheduling.manage',
    'encounters.read',
    'encounters.manage',
    'triage.read',
    'triage.manage',
    'medical-records.read',
    'attachments.read',
    'inpatient.read',
    'billing.read',
    'notifications.read'
  ],
  finance: [
    'auth.session.read',
    'audit.read',
    'owners.read',
    'patients.read',
    'encounters.read',
    'medical-records.read',
    'billing.read',
    'billing.manage',
    'notifications.read'
  ],
  inventory: [
    'auth.session.read',
    'encounters.read',
    'inventory.read',
    'inventory.manage',
    'notifications.read'
  ],
  auditor: [
    'auth.session.read',
    'audit.read',
    'owners.read',
    'patients.read',
    'encounters.read',
    'triage.read',
    'medical-records.read',
    'attachments.read',
    'inpatient.read',
    'surgery.read',
    'diagnostics.read',
    'billing.read',
    'inventory.read',
    'notifications.read'
  ]
};

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
): Promise<void> {
  const adminEmail = credentials?.email ?? process.env.ADMIN_EMAIL;
  const adminPassword = credentials?.password ?? process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.info('ADMIN_EMAIL/ADMIN_PASSWORD nao definidos. Seed de usuario admin foi pulado.');
    return;
  }

  await db
    .insert(users)
    .values({
      accountId,
      unitId,
      username:
        credentials?.username?.trim() || process.env.ADMIN_USERNAME?.trim() || adminEmail.split('@')[0]!,
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
    return;
  }

  await db
    .insert(userRoles)
    .values({
      userId: adminUser.id,
      roleId: adminRole.id
    })
    .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
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
