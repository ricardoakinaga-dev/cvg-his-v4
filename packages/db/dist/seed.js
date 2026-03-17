import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from '@cvg-his/rbac';
import { closeDbConnection, db } from './connection.js';
import { accounts, permissions, rolePermissions, roles, units, userRoles, users } from './schema/index.js';
const DEFAULT_ACCOUNT_SLUG = 'default';
const DEFAULT_UNIT_CODE = 'hq';
const permissionDescriptions = {
    'rbac.manage': 'Permite gerenciar papéis, permissões e vínculos de acesso.',
    'audit.read': 'Permite leitura de trilhas de auditoria.',
    'system.health.read': 'Permite consultar endpoints de saúde do sistema.',
    'system.admin.test': 'Permite acesso aos endpoints administrativos de validação RBAC.',
    'owner.read': 'Permite leitura de cadastros de proprietários.',
    'owner.write': 'Permite criar e alterar cadastros de proprietários.',
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
    'alerts.read': 'Permite leitura de alertas clínicos e operacionais.'
};
const permissionSeeds = CANONICAL_PERMISSIONS.map((key) => ({
    key,
    description: permissionDescriptions[key] ?? `Permissão canônica ${key}`
}));
const roleSeeds = [
    { name: 'admin', description: 'Acesso administrativo completo.' },
    { name: 'vet', description: 'Perfil de médico veterinário.' },
    { name: 'enfermagem', description: 'Perfil de enfermagem.' },
    { name: 'recepcao', description: 'Perfil de recepção.' }
];
const rolePermissionMap = Object.fromEntries(Object.entries(ROLE_PERMISSIONS).map(([roleName, rolePermissions]) => [
    roleName,
    [...rolePermissions]
]));
function hashPassword(rawPassword) {
    return createHash('sha256').update(rawPassword).digest('hex');
}
async function ensureDefaultAccountAndUnit() {
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
async function seedPermissionsAndRoles() {
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
    const permissionIdByKey = new Map(dbPermissions.map((permission) => [permission.key, permission.id]));
    const roleIdByName = new Map(dbRoles.map((role) => [role.name, role.id]));
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
            .filter((value) => value !== null);
        if (values.length === 0) {
            continue;
        }
        await db
            .insert(rolePermissions)
            .values(values)
            .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
    }
}
async function seedAdminUser(accountId, unitId) {
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
}
async function runSeed() {
    try {
        const { accountId, unitId } = await ensureDefaultAccountAndUnit();
        await seedPermissionsAndRoles();
        await seedAdminUser(accountId, unitId);
        console.info('Seed concluído com sucesso.');
    }
    finally {
        await closeDbConnection();
    }
}
void runSeed().catch((error) => {
    console.error('Falha ao executar seed.', error);
    process.exitCode = 1;
});
//# sourceMappingURL=seed.js.map