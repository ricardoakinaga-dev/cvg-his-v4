import { createHash } from 'node:crypto';

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

const DEFAULT_TENANT_SLUG = 'default';
const DEFAULT_ACCOUNT_SLUG = 'default';
const DEFAULT_UNIT_CODE = 'hq';

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
  { key: 'notifications.read', description: 'Permite leitura de notificacoes operacionais.' },
  { key: 'notifications.manage', description: 'Permite criar e processar notificacoes.' },
  { key: 'prescriptions.read', description: 'Permite leitura de prescricoes.' },
  { key: 'prescriptions.write', description: 'Permite criar e alterar prescricoes.' },
  {
    key: 'prescription-executions.read',
    description: 'Permite leitura de planos de execucao de prescricoes.'
  },
  {
    key: 'prescription-executions.manage',
    description: 'Permite agendar e registrar execucoes de prescricoes.'
  },
  { key: 'discharges.read', description: 'Permite leitura de registros de alta.' },
  { key: 'discharges.manage', description: 'Permite criar e alterar registros de alta.' },
  { key: 'fiscal.read', description: 'Permite leitura de parametrizacao fiscal.' },
  { key: 'fiscal.manage', description: 'Permite gerenciar parametrizacao fiscal.' },
  { key: 'product.read', description: 'Permite leitura do catalogo de produtos.' },
  { key: 'product.write', description: 'Permite gerenciar o catalogo de produtos.' },
  { key: 'service.read', description: 'Permite leitura do catalogo de servicos.' },
  { key: 'service.write', description: 'Permite gerenciar o catalogo de servicos.' },
  { key: 'counter_sale.read', description: 'Permite leitura de vendas de balcao.' },
  { key: 'counter_sale.write', description: 'Permite gerenciar vendas de balcao.' },
  { key: 'quote.read', description: 'Permite leitura de orcamentos.' },
  { key: 'quote.write', description: 'Permite gerenciar orcamentos.' },
  { key: 'webhooks.read', description: 'Permite leitura de webhooks e entregas.' },
  { key: 'webhooks.manage', description: 'Permite gerenciar webhooks.' },
  { key: 'integrations.read', description: 'Permite leitura de integracoes.' },
  { key: 'integrations.manage', description: 'Permite gerenciar integracoes.' },
  { key: 'api_keys.manage', description: 'Permite gerenciar chaves de API.' },
  { key: 'payments.manage', description: 'Permite gerenciar pagamentos.' },
  { key: 'flags.read', description: 'Permite leitura de feature flags.' },
  { key: 'flags.admin', description: 'Permite administrar feature flags.' }
];

// Role-permission mapping aligned with AccessControlService vocabulary
const rolePermissionMap: Record<string, string[]> = {
  admin: permissionSeeds.map((p) => p.key),
  veterinarian: [
    'auth.session.read',
    'owners.read',
    'patients.read',
    'encounters.read',
    'encounters.manage',
    'triage.read',
    'medical-records.read',
    'medical-records.manage',
    'prescriptions.read',
    'prescriptions.write',
    'prescription-executions.read',
    'prescription-executions.manage',
    'discharges.read',
    'discharges.manage',
    'attachments.read',
    'attachments.manage',
    'inpatient.read',
    'inpatient.manage',
    'surgery.read',
    'surgery.manage',
    'diagnostics.read',
    'diagnostics.manage',
    'inventory.read',
    'inventory.manage',
    'notifications.read',
    'notifications.manage'
  ],
  nurse: [
    'auth.session.read',
    'owners.read',
    'patients.read',
    'scheduling.read',
    'encounters.read',
    'encounters.manage',
    'triage.read',
    'triage.manage',
    'medical-records.read',
    'prescriptions.read',
    'prescriptions.write',
    'prescription-executions.read',
    'prescription-executions.manage',
    'discharges.read',
    'discharges.manage',
    'attachments.read',
    'inpatient.read',
    'inventory.read',
    'inventory.manage',
    'notifications.read',
    'notifications.manage'
  ],
  reception: [
    'auth.session.read',
    'users.read',
    'staff.read',
    'owners.read',
    'owners.manage',
    'patients.read',
    'patients.manage',
    'scheduling.read',
    'scheduling.manage',
    'encounters.read',
    'encounters.manage',
    'medical-records.read',
    'billing.read',
    'inventory.read',
    'notifications.read',
    'notifications.manage',
    'webhooks.read',
    'webhooks.manage',
    'product.read',
    'service.read',
    'counter_sale.read',
    'counter_sale.write',
    'quote.read',
    'quote.write'
  ],
  finance: [
    'auth.session.read',
    'owners.read',
    'patients.read',
    'encounters.read',
    'billing.read',
    'billing.manage',
    'fiscal.read',
    'fiscal.manage',
    'product.read',
    'service.read',
    'counter_sale.read',
    'counter_sale.write',
    'quote.read',
    'quote.write',
    'notifications.read',
    'notifications.manage'
  ],
  inventory: [
    'auth.session.read',
    'patients.read',
    'encounters.read',
    'inventory.read',
    'inventory.manage',
    'fiscal.read',
    'product.read',
    'service.read',
    'counter_sale.read',
    'quote.read',
    'notifications.read',
    'notifications.manage'
  ],
  auditor: [
    'auth.session.read',
    'audit.read',
    'access.read',
    'fiscal.read',
    'owners.read',
    'patients.read',
    'scheduling.read',
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

function hashPassword(rawPassword: string): string {
  return createHash('sha256').update(rawPassword).digest('hex');
}

async function ensureDefaultAccountAndUnit(): Promise<{ accountId: string; unitId: string }> {
  await db
    .insert(tenants)
    .values({
      slug: DEFAULT_TENANT_SLUG,
      name: 'Tenant padrao'
    })
    .onConflictDoNothing({ target: tenants.slug });

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
    .limit(1);

  if (!tenant) {
    throw new Error('Failed to ensure default tenant');
  }

  await db
    .insert(accounts)
    .values({
      tenantId: tenant.id,
      slug: DEFAULT_ACCOUNT_SLUG,
      name: 'Conta padrao'
    })
    .onConflictDoNothing({ target: accounts.slug });

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.slug, DEFAULT_ACCOUNT_SLUG))
    .limit(1);

  if (!account) {
    throw new Error('Failed to ensure default account');
  }

  await db
    .insert(units)
    .values({
      accountId: account.id,
      code: DEFAULT_UNIT_CODE,
      name: 'Unidade Central'
    })
    .onConflictDoNothing({ target: [units.accountId, units.code] });

  const [unit] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.accountId, account.id), eq(units.code, DEFAULT_UNIT_CODE)))
    .limit(1);

  if (!unit) {
    throw new Error('Failed to ensure default unit');
  }

  return { accountId: account.id, unitId: unit.id };
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

  const canonicalRoleIds = [...roleIdByName.values()];
  if (canonicalRoleIds.length > 0) {
    await db
      .delete(rolePermissions)
      .where(inArray(rolePermissions.roleId, canonicalRoleIds));
  }

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

async function seedAdminUser(accountId: string, unitId: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.info('ADMIN_EMAIL/ADMIN_PASSWORD nao definidos. Seed de usuario admin foi pulado.');
    return;
  }

  await db
    .insert(users)
    .values({
      accountId,
      unitId,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      fullName: 'Administrador Seed'
    })
    .onConflictDoNothing({ target: [users.accountId, users.email] });

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.accountId, accountId), eq(users.email, adminEmail)))
    .limit(1);

  const [adminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'admin'))
    .limit(1);

  if (!adminUser || !adminRole) {
    console.warn('Nao foi possivel vincular usuario admin ao role admin.');
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
    console.info('Seed concluido com sucesso.');
  } finally {
    await closeDbConnection();
  }
}

void runSeed().catch((error) => {
  console.error('Falha ao executar seed.', error);
  process.exitCode = 1;
});
