import { randomBytes, scryptSync } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';
import { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from '@cvg-his/rbac';

import { closeDbConnection, db } from './connection.js';
import {
  accounts,
  permissions,
  rolePermissions,
  roles,
  units,
  userRoles,
  users
} from './schema/index.js';

const DEFAULT_ACCOUNT_SLUG = 'default';
const DEFAULT_UNIT_CODE = 'hq';

const permissionDescriptions: Record<string, string> = {
  'rbac.manage': 'Permite gerenciar papéis, permissões e vínculos de acesso.',
  'audit.read': 'Permite leitura de trilhas de auditoria.',
  'system.health.read': 'Permite consultar endpoints de saúde do sistema.',
  'system.admin.test': 'Permite acesso aos endpoints administrativos de validação RBAC.',
  'system.settings.manage': 'Permite administrar configurações críticas do sistema.',
  'reports.read': 'Permite leitura de relatórios operacionais consolidados.',
  'build.read': 'Permite leitura de metadados de build e rastreabilidade da aplicação.',
  'users.read': 'Permite listar e visualizar usuários do sistema.',
  'users.create': 'Permite criar novos usuários do sistema.',
  'users.update': 'Permite editar dados cadastrais de usuários.',
  'users.disable': 'Permite desativar usuários.',
  'roles.read': 'Permite listar papéis e seus detalhes.',
  'roles.create': 'Permite criar papéis.',
  'roles.update': 'Permite editar papéis.',
  'permissions.read': 'Permite listar permissões disponíveis.',
  'permissions.manage': 'Permite administrar vínculos de permissões.',
  'sessions.read': 'Permite listar sessões autenticadas.',
  'sessions.revoke': 'Permite revogar sessões ativas.',
  'access_scope.read': 'Permite listar escopos de acesso.',
  'access_scope.manage': 'Permite criar e vincular escopos de acesso.',
  'notification_template.read': 'Permite listar e visualizar templates de notificação.',
  'notification_template.write': 'Permite criar e editar templates de notificação.',
  'notification.read': 'Permite listar e visualizar notificações.',
  'notification.write': 'Permite criar e disparar notificações.',
  'notification_settings.read': 'Permite ler configurações de notificações.',
  'notification_settings.write': 'Permite atualizar configurações de notificações.',
  'owner.read': 'Permite leitura de cadastros de proprietários.',
  'owner.write': 'Permite criar e alterar cadastros de proprietários.',
  'partner.read': 'Permite leitura de parceiros e convênios.',
  'partner.write': 'Permite criar e alterar parceiros e convênios.',
  'patient.read': 'Permite leitura de cadastros clínicos de pacientes.',
  'patient.write': 'Permite criar e alterar cadastros clínicos de pacientes.',
  'search.read': 'Permite uso de consultas e busca textual no domínio clínico.',
  'encounter.read': 'Permite leitura de atendimentos e casos clínicos.',
  'encounter.write': 'Permite abertura e atualização de atendimentos clínicos.',
  'encounter.close': 'Permite encerramento formal de atendimentos clínicos.',
  'note.read': 'Permite leitura de notas clínicas e evolução SOAP.',
  'note.write': 'Permite criação e edição de notas clínicas.',
  'note.sign': 'Permite assinatura de nota clínica.',
  'note.version': 'Permite criação de novas versões de nota clínica.',
  'timeline.read': 'Permite leitura da linha do tempo clínica consolidada.',
  'document.read': 'Permite leitura de anexos e documentos clínicos.',
  'document.write': 'Permite upload e vínculo de documentos clínicos.',
  'ward.read': 'Permite leitura de alas de internação.',
  'ward.write': 'Permite criar e alterar alas de internação.',
  'bed.read': 'Permite leitura de leitos de internação.',
  'bed.write': 'Permite criar e alterar leitos de internação.',
  'bedmap.read': 'Permite consulta ao mapa de leitos e ocupação.',
  'inpatient.read': 'Permite leitura de internações ativas e históricas.',
  'inpatient.write': 'Permite admitir e transferir internações.',
  'inpatient.discharge': 'Permite efetivar alta de internações.',
  'handover.read': 'Permite leitura de handovers de plantão.',
  'handover.write': 'Permite criar e editar rascunhos de handover.',
  'handover.publish': 'Permite publicar handover de plantão.',
  'medorder.read': 'Permite leitura de prescrições de medicação.',
  'medorder.write': 'Permite criar e editar prescrições de medicação.',
  'medorder.stop': 'Permite interromper prescrições de medicação ativas.',
  'medadmin.read': 'Permite leitura de checagens/administrações de medicação.',
  'medadmin.write': 'Permite registrar administração, recusa ou atraso de dose.',
  'medlog.read': 'Permite leitura de logs e trilha operacional de medicação.',
  'protocol.read': 'Permite leitura de protocolos clínicos.',
  'protocol.write': 'Permite criar e editar protocolos clínicos.',
  'protocol.publish': 'Permite publicar versões de protocolos clínicos.',
  'protocol.diff.read': 'Permite leitura de diff entre versões de protocolos.',
  'protocol.audit.read': 'Permite leitura de trilha de auditoria de protocolos.',
  'protocol.ref.read': 'Permite leitura de referências/evidências de protocolos.',
  'protocol.ref.write': 'Permite criar e editar referências/evidências de protocolos.',
  'alerts.read': 'Permite leitura de alertas clínicos e operacionais.',
  'alerts.write': 'Permite criar e atualizar alertas clínicos e operacionais.',
  'product.read': 'Permite leitura do catálogo de produtos.',
  'product.write': 'Permite criar e alterar itens do catálogo de produtos.',
  'service.read': 'Permite leitura do catálogo de serviços.',
  'service.write': 'Permite criar e alterar itens do catálogo de serviços.',
  'inventory.read': 'Permite leitura de saldos e movimentações de estoque.',
  'inventory.adjust': 'Permite ajustes de estoque e movimentações sensíveis.',
  'billing_item.read': 'Permite leitura dos itens de cobrança vinculados ao atendimento.',
  'billing_item.write': 'Permite criar, alterar e remover itens de cobrança do atendimento.',
  'billing.read': 'Permite leitura consolidada de faturamento operacional.',
  'billing.create': 'Permite criação operacional de itens de faturamento.',
  'financial_account.read': 'Permite leitura do status financeiro e contas a receber do atendimento.',
  'financial_account.close': 'Permite fechamento financeiro formal da conta do atendimento.',
  'financial_reports.read': 'Permite leitura de relatórios financeiros estratégicos.',
  'appointment.read': 'Permite leitura da agenda e agendamentos.',
  'appointment.write': 'Permite criar, alterar e cancelar agendamentos.',
  'exam_order.read': 'Permite leitura de pedidos de exame.',
  'exam_order.create': 'Permite criar pedidos de exame.',
  'exam_order.update': 'Permite atualizar pedidos de exame.',
  'exam_result.read': 'Permite leitura de resultados de exame.',
  'exam_result.create': 'Permite criar resultados de exame.',
  'exam_result.update': 'Permite atualizar resultados de exame.',
  'lab_order.create': 'Permite criar pedidos laboratoriais.',
  'lab_result.read': 'Permite ler resultados laboratoriais.',
  'imaging_order.create': 'Permite criar pedidos de imagem.',
  'medical_record.read': 'Permite ler prontuário clínico detalhado.',
  'medical_record.write': 'Permite escrever em prontuário clínico.',
  'medical_record.sign': 'Permite assinatura final de prontuário clínico.'
};

const permissionSeeds = CANONICAL_PERMISSIONS.map((key: string) => ({
  key,
  description: permissionDescriptions[key] ?? `Permissão canônica ${key}`
}));

const roleSeeds = [
  { name: 'admin', description: 'Acesso administrativo completo.' },
  { name: 'superadmin', description: 'Acesso total sistêmico e operacional.' },
  { name: 'diretoria', description: 'Perfil executivo com visão estratégica e financeira.' },
  { name: 'gestao', description: 'Perfil executivo/gestão com visão estratégica e financeira.' },
  { name: 'coordenacao_medica', description: 'Coordenação clínica com supervisão assistencial.' },
  { name: 'vet', description: 'Perfil de médico veterinário.' },
  { name: 'veterinario', description: 'Perfil de médico veterinário.' },
  { name: 'residente', description: 'Perfil clínico supervisionado.' },
  { name: 'enfermagem', description: 'Perfil de enfermagem.' },
  { name: 'recepcao', description: 'Perfil de recepção.' },
  { name: 'laboratorio', description: 'Perfil de laboratório.' },
  { name: 'imagem', description: 'Perfil de imagem diagnóstica.' },
  { name: 'radiologia', description: 'Perfil de radiologia.' },
  { name: 'ultrassonografia', description: 'Perfil de ultrassonografia.' },
  { name: 'farmacia_estoque', description: 'Perfil de farmácia e estoque.' },
  { name: 'farmacia', description: 'Perfil de farmácia.' },
  { name: 'estoque', description: 'Perfil de estoque.' },
  { name: 'financeiro', description: 'Perfil financeiro.' },
  { name: 'administrativo', description: 'Perfil administrativo.' },
  { name: 'banho_tosa', description: 'Perfil operacional de banho e tosa.' }
];

const rolePermissionMap: Record<string, string[]> = Object.fromEntries(
  Object.entries(ROLE_PERMISSIONS).map(([roleName, rolePermissions]) => [
    roleName,
    [...(rolePermissions as readonly string[])]
  ])
);

function hashPassword(rawPassword: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(rawPassword, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function ensureDefaultAccountAndUnit(): Promise<{ accountId: string; unitId: string }> {
  await db
    .insert(accounts)
    .values({
      slug: DEFAULT_ACCOUNT_SLUG,
      name: 'Conta padrão'
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
  await db.insert(permissions).values(permissionSeeds).onConflictDoNothing({ target: permissions.key });
  await db.insert(roles).values(roleSeeds).onConflictDoNothing({ target: roles.name });

  const dbPermissions = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, permissionSeeds.map((permission) => permission.key)));

  const dbRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(inArray(roles.name, roleSeeds.map((role) => role.name)));

  const permissionIdByKey = new Map(dbPermissions.map((permission: { key: string; id: string }) => [permission.key, permission.id]));
  const roleIdByName = new Map(dbRoles.map((role: { name: string; id: string }) => [role.name, role.id]));

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
    console.info('ADMIN_EMAIL/ADMIN_PASSWORD não definidos. Seed de usuário admin foi pulado.');
    return;
  }

  await db
    .insert(users)
    .values({
      accountId,
      unitId,
      email: adminEmail,
      username: 'admin',
      passwordHash: hashPassword(adminPassword),
      fullName: 'Administrador Seed',
      passwordChangedAt: new Date()
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
    console.warn('Não foi possível vincular usuário admin ao role admin.');
    return;
  }

  await db
    .insert(userRoles)
    .values({
      userId: adminUser.id,
      roleId: adminRole.id
    })
    .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });

  const [superadminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'superadmin'))
    .limit(1);

  if (superadminRole) {
    await db
      .insert(userRoles)
      .values({
        userId: adminUser.id,
        roleId: superadminRole.id
      })
      .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
  }
}

async function runSeed(): Promise<void> {
  try {
    const { accountId, unitId } = await ensureDefaultAccountAndUnit();
    await seedPermissionsAndRoles();
    await seedAdminUser(accountId, unitId);
    console.info('Seed concluído com sucesso.');
  } finally {
    await closeDbConnection();
  }
}

void runSeed().catch((error) => {
  console.error('Falha ao executar seed.', error);
  process.exitCode = 1;
});
