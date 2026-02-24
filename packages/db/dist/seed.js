import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from '@cvg-his/rbac';
import { closeDbConnection, db } from './connection.js';
import { accounts, appointmentTypes, collaboratorAvailability, collaborators, permissions, products, resources, rolePermissions, roles, services, settings, units, userRoles, users } from './schema/index.js';
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
    'alerts.read': 'Permite leitura de alertas clínicos e operacionais.',
    // Settings permissions
    'settings.geral.read': 'Permite leitura de configurações gerais.',
    'settings.geral.update': 'Permite alterar configurações gerais.',
    'settings.clinica.read': 'Permite leitura de configurações da clínica.',
    'settings.clinica.update': 'Permite alterar configurações da clínica.',
    'settings.internacao.read': 'Permite leitura de configurações de internação.',
    'settings.internacao.update': 'Permite alterar configurações de internação.',
    'settings.imagem.read': 'Permite leitura de configurações de imagem.',
    'settings.imagem.update': 'Permite alterar configurações de imagem.',
    'settings.laboratorio.read': 'Permite leitura de configurações de laboratório.',
    'settings.laboratorio.update': 'Permite alterar configurações de laboratório.',
    'settings.estoque.read': 'Permite leitura de configurações de estoque.',
    'settings.estoque.update': 'Permite alterar configurações de estoque.',
    'settings.financeiro.read': 'Permite leitura de configurações financeiras.',
    'settings.financeiro.update': 'Permite alterar configurações financeiras.',
    // Products (inventory) permissions
    'estoque.produtos.read': 'Permite leitura de produtos do estoque.',
    'estoque.produtos.create': 'Permite criar produtos no estoque.',
    'estoque.produtos.update': 'Permite alterar produtos do estoque.',
    'estoque.produtos.delete': 'Permite excluir produtos do estoque.',
    // Services (billing items) permissions
    'financeiro.servicos.read': 'Permite leitura de serviços faturáveis.',
    'financeiro.servicos.create': 'Permite criar serviços faturáveis.',
    'financeiro.servicos.update': 'Permite alterar serviços faturáveis.',
    'financeiro.servicos.delete': 'Permite excluir serviços faturáveis.',
    // Admin permissions
    'admin.usuarios.read': 'Permite leitura de usuários do sistema.',
    'admin.usuarios.create': 'Permite criar usuários do sistema.',
    'admin.usuarios.update': 'Permite alterar usuários do sistema.',
    'admin.usuarios.disable': 'Permite ativar/desativar usuários do sistema.',
    'admin.usuarios.manage': 'Permite gerenciar perfis de usuários.',
    'admin.roles.read': 'Permite leitura de perfis de acesso.',
    'admin.roles.create': 'Permite criar perfis de acesso.',
    'admin.roles.update': 'Permite alterar perfis de acesso.',
    'admin.roles.delete': 'Permite excluir perfis de acesso.',
    'admin.roles.manage': 'Permite gerenciar permissões de perfis.',
    'admin.permissoes.read': 'Permite leitura de permissões do sistema.',
    'admin.permissoes.manage': 'Permite gerenciar permissões de perfis.',
    'admin.auditoria.read': 'Permite leitura de logs de auditoria.'
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
const rolePermissionMap = Object.fromEntries(Object.entries(ROLE_PERMISSIONS).map(([roleName, rolePerms]) => [
    roleName,
    [...rolePerms]
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
        .where(inArray(permissions.key, permissionSeeds.map((p) => p.key)));
    const dbRoles = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(inArray(roles.name, roleSeeds.map((r) => r.name)));
    const permissionIdByKey = new Map(dbPermissions.map((p) => [p.key, p.id]));
    const roleIdByName = new Map(dbRoles.map((r) => [r.name, r.id]));
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
            .filter((v) => v !== null);
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
const defaultSettings = [
    // namespace geral
    { namespace: 'geral', key: 'clinic_name', valueJson: { value: 'Clínica Veterinária' } },
    { namespace: 'geral', key: 'timezone', valueJson: { value: 'America/Sao_Paulo' } },
    { namespace: 'geral', key: 'default_language', valueJson: { value: 'pt-BR' } },
    // namespace clinica
    { namespace: 'clinica', key: 'soap_template', valueJson: { template: 'Subjetivo:\n\nObjetivo:\n\nAvaliação:\n\nPlano:' } },
    // namespace internacao
    { namespace: 'internacao', key: 'medication_double_check_enabled', valueJson: { enabled: true } },
    // namespace laboratorio
    { namespace: 'laboratorio', key: 'result_template', valueJson: { template: 'Resultado do exame laboratorial.' } },
    // namespace imagem
    { namespace: 'imagem', key: 'report_template', valueJson: { template: 'Laudo de exame de imagem.' } },
    // namespace estoque
    { namespace: 'estoque', key: 'default_uom', valueJson: { unit: 'UN' } },
    // namespace financeiro
    { namespace: 'financeiro', key: 'default_payment_terms', valueJson: { days: 30, description: 'Pagamento em 30 dias' } }
];
async function seedSettings(accountId) {
    const settingsValues = defaultSettings.map((setting) => ({
        accountId,
        namespace: setting.namespace,
        key: setting.key,
        valueJson: setting.valueJson
    }));
    await db
        .insert(settings)
        .values(settingsValues)
        .onConflictDoNothing({ target: [settings.accountId, settings.namespace, settings.key] });
    console.info('Default settings seeded.');
}
const defaultProducts = [
    { sku: 'MED-001', name: 'Dipirona 500mg', category: 'Medicamentos', uom: 'CX', cost: '15.00', price: '25.00', isControlled: false, trackLot: true, trackExpiry: true, minStock: '10' },
    { sku: 'MED-002', name: 'Amoxicilina 250mg', category: 'Medicamentos', uom: 'CX', cost: '22.00', price: '38.00', isControlled: false, trackLot: true, trackExpiry: true, minStock: '5' },
    { sku: 'MED-003', name: 'Cefalexina 500mg', category: 'Medicamentos', uom: 'CX', cost: '35.00', price: '55.00', isControlled: false, trackLot: true, trackExpiry: true, minStock: '8' },
    { sku: 'INS-001', name: 'Seringa 5ml', category: 'Insumos', uom: 'UN', cost: '0.50', price: '1.50', isControlled: false, trackLot: false, trackExpiry: false, minStock: '100' },
    { sku: 'INS-002', name: 'Luva Cirúrgica M', category: 'Insumos', uom: 'CX', cost: '12.00', price: '22.00', isControlled: false, trackLot: false, trackExpiry: false, minStock: '20' }
];
async function seedProducts(accountId) {
    const productsValues = defaultProducts.map((product) => ({
        accountId,
        sku: product.sku,
        name: product.name,
        category: product.category,
        uom: product.uom,
        cost: product.cost,
        price: product.price,
        isControlled: product.isControlled,
        trackLot: product.trackLot,
        trackExpiry: product.trackExpiry,
        minStock: product.minStock,
        active: true
    }));
    await db
        .insert(products)
        .values(productsValues)
        .onConflictDoNothing({ target: [products.accountId, products.sku] });
    console.info('Default products seeded.');
}
const defaultServices = [
    { code: 'CONS-001', name: 'Consulta Clínica Geral', group: 'consulta', sector: 'clinica', basePrice: '150.00', durationMinutes: 30, requiresReport: false, consumesStock: false },
    { code: 'CONS-002', name: 'Consulta Especializada', group: 'consulta', sector: 'clinica', basePrice: '250.00', durationMinutes: 45, requiresReport: false, consumesStock: false },
    { code: 'PROC-001', name: 'Curativo Simples', group: 'procedimento', sector: 'clinica', basePrice: '80.00', durationMinutes: 20, requiresReport: false, consumesStock: true },
    { code: 'PROC-002', name: 'Sutura Simples', group: 'procedimento', sector: 'clinica', basePrice: '200.00', durationMinutes: 30, requiresReport: true, consumesStock: true },
    { code: 'INT-001', name: 'Diária Internação', group: 'internacao', sector: 'internacao', basePrice: '350.00', durationMinutes: null, requiresReport: false, consumesStock: false },
    { code: 'INT-002', name: 'Diária UTI', group: 'internacao', sector: 'internacao', basePrice: '800.00', durationMinutes: null, requiresReport: false, consumesStock: false },
    { code: 'LAB-001', name: 'Hemograma Completo', group: 'lab', sector: 'laboratorio', basePrice: '45.00', durationMinutes: null, requiresReport: true, consumesStock: true },
    { code: 'LAB-002', name: 'Bioquímica Completa', group: 'lab', sector: 'laboratorio', basePrice: '120.00', durationMinutes: null, requiresReport: true, consumesStock: true },
    { code: 'IMG-001', name: 'Raio-X Tórax', group: 'imagem', sector: 'imagem', basePrice: '100.00', durationMinutes: 15, requiresReport: true, consumesStock: false },
    { code: 'IMG-002', name: 'Ultrassom Abdominal', group: 'imagem', sector: 'imagem', basePrice: '250.00', durationMinutes: 30, requiresReport: true, consumesStock: false }
];
async function seedServices(accountId) {
    const servicesValues = defaultServices.map((service) => ({
        accountId,
        code: service.code,
        name: service.name,
        group: service.group,
        sector: service.sector,
        basePrice: service.basePrice,
        durationMinutes: service.durationMinutes,
        requiresReport: service.requiresReport,
        consumesStock: service.consumesStock,
        active: true
    }));
    await db
        .insert(services)
        .values(servicesValues)
        .onConflictDoNothing({ target: [services.accountId, services.code] });
    console.info('Default services seeded.');
}
async function seedAgenda(accountId, unitId) {
    const collabs = [
        { name: 'Dr. Roberto Vet', roleTitle: 'Veterinário', status: 'active' },
        { name: 'Dra. Silva Vet', roleTitle: 'Veterinária Especialista', status: 'active' },
        { name: 'Carlos Anestesista', roleTitle: 'Anestesista', status: 'active' },
        { name: 'Ana Recepção', roleTitle: 'Recepção', status: 'active' }
    ];
    await db
        .insert(collaborators)
        .values(collabs.map((c) => ({ ...c, accountId })))
        .onConflictDoNothing();
    const allCollabs = await db.select().from(collaborators).where(eq(collaborators.accountId, accountId));
    // Default availability (Mon-Fri 08-18)
    for (const c of allCollabs) {
        const defaultAvails = [];
        for (let weekday = 1; weekday <= 5; weekday++) {
            defaultAvails.push({
                accountId,
                collaboratorId: c.id,
                weekday,
                startTime: '08:00',
                endTime: '18:00',
                breaksJson: [{ start: '12:00', end: '13:00' }],
                active: true
            });
        }
        await db.insert(collaboratorAvailability).values(defaultAvails).onConflictDoNothing();
    }
    // Resources
    const res = [
        { name: 'Consultório 1', type: 'room' },
        { name: 'Consultório 2', type: 'room' },
        { name: 'Cirurgia A', type: 'surgery_room' }
    ];
    await db
        .insert(resources)
        .values(res.map((r) => ({ ...r, accountId })))
        .onConflictDoNothing();
    // Appointment Types
    const types = [
        { code: 'CONSULTA', name: 'Consulta Geral', sector: 'clinica', defaultDurationMinutes: 30, requiresResource: true, requiresTeam: false },
        { code: 'RETORNO', name: 'Retorno', sector: 'clinica', defaultDurationMinutes: 20, requiresResource: true, requiresTeam: false },
        { code: 'CIRURGIA', name: 'Cirurgia Padrão', sector: 'cirurgia', defaultDurationMinutes: 120, requiresResource: true, requiresTeam: true }
    ];
    await db
        .insert(appointmentTypes)
        .values(types.map((t) => ({ ...t, accountId })))
        .onConflictDoNothing({ target: [appointmentTypes.accountId, appointmentTypes.code] });
    console.info('Premium Agenda default tables seeded.');
}
async function runSeed() {
    try {
        const { accountId, unitId } = await ensureDefaultAccountAndUnit();
        await seedPermissionsAndRoles();
        await seedAdminUser(accountId, unitId);
        await seedSettings(accountId);
        await seedProducts(accountId);
        await seedServices(accountId);
        await seedAgenda(accountId, unitId);
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