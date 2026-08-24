import { ForbiddenError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccessAssignmentEffect,
  AccessMembershipSummary,
  AccessModulePermissionMatrixEntry,
  AccessRoutineAction,
  AccessPermissionAssignmentSummary,
  AccessProfile,
  AccessSectorId,
  AccessSectorSummary,
  AccessTeamId,
  AccessTeamSummary,
  AccountId,
  EffectivePermissionSource,
  EffectivePermissionSummary,
  PermissionId,
  PermissionDefinition,
  RoleId,
  RoleDefinition,
  UserId,
  UserSummary
} from '@cvg-his-v2/shared-types';
import {
  DatabaseAccessControlRepository,
  type AccessControlRepository,
  type AccessPermissionAssignmentRecord,
  type PermissionRecord,
  type RoleRecord
} from './repositories/database-access-control.repository.js';

const permissionCatalog: readonly PermissionDefinition[] = [
  {
    id: 'perm_auth_session_read' as PermissionId,
    code: 'auth.session.read',
    module: 'auth',
    description: 'Read the current authenticated session.'
  },
  {
    id: 'perm_users_read' as PermissionId,
    code: 'users.read',
    module: 'users',
    description: 'Read user records.'
  },
  {
    id: 'perm_users_manage' as PermissionId,
    code: 'users.manage',
    module: 'users',
    description: 'Manage user records.'
  },
  {
    id: 'perm_staff_read' as PermissionId,
    code: 'staff.read',
    module: 'staff',
    description: 'Read staff records.'
  },
  {
    id: 'perm_staff_manage' as PermissionId,
    code: 'staff.manage',
    module: 'staff',
    description: 'Manage staff records.'
  },
  {
    id: 'perm_access_read' as PermissionId,
    code: 'access.read',
    module: 'access-control',
    description: 'Read roles and permissions.'
  },
  {
    id: 'perm_audit_read' as PermissionId,
    code: 'audit.read',
    module: 'audit',
    description: 'Read audit trail events.'
  },
  {
    id: 'perm_audit_write' as PermissionId,
    code: 'audit.write',
    module: 'audit',
    description: 'Write audit trail events.'
  },
  {
    id: 'perm_owners_read' as PermissionId,
    code: 'owners.read',
    module: 'owners',
    description: 'Read owner records.'
  },
  {
    id: 'perm_owners_manage' as PermissionId,
    code: 'owners.manage',
    module: 'owners',
    description: 'Manage owner records.'
  },
  {
    id: 'perm_patients_read' as PermissionId,
    code: 'patients.read',
    module: 'patients',
    description: 'Read patient records.'
  },
  {
    id: 'perm_patients_manage' as PermissionId,
    code: 'patients.manage',
    module: 'patients',
    description: 'Manage patient records.'
  },
  {
    id: 'perm_scheduling_read' as PermissionId,
    code: 'scheduling.read',
    module: 'scheduling',
    description: 'Read appointments and operational queue.'
  },
  {
    id: 'perm_scheduling_manage' as PermissionId,
    code: 'scheduling.manage',
    module: 'scheduling',
    description: 'Manage appointments and queue flow.'
  },
  {
    id: 'perm_encounters_read' as PermissionId,
    code: 'encounters.read',
    module: 'encounters',
    description: 'Read encounter records and operational timeline.'
  },
  {
    id: 'perm_encounters_manage' as PermissionId,
    code: 'encounters.manage',
    module: 'encounters',
    description: 'Open, transition and close encounters.'
  },
  {
    id: 'perm_triage_read' as PermissionId,
    code: 'triage.read',
    module: 'triage',
    description: 'Read triage records.'
  },
  {
    id: 'perm_triage_manage' as PermissionId,
    code: 'triage.manage',
    module: 'triage',
    description: 'Record and update initial triage.'
  },
  {
    id: 'perm_medical_records_read' as PermissionId,
    code: 'medical-records.read',
    module: 'medical-records',
    description: 'Read medical records and clinical timeline.'
  },
  {
    id: 'perm_medical_records_manage' as PermissionId,
    code: 'medical-records.manage',
    module: 'medical-records',
    description: 'Create clinical entries, prescriptions and conduct.'
  },
  {
    id: 'perm_prescriptions_read' as PermissionId,
    code: 'prescriptions.read',
    module: 'medical-records',
    description: 'Read prescription entries linked to the clinical record.'
  },
  {
    id: 'perm_prescriptions_write' as PermissionId,
    code: 'prescriptions.write',
    module: 'medical-records',
    description: 'Create, update and archive prescription entries.'
  },
  {
    id: 'perm_prescription_executions_read' as PermissionId,
    code: 'prescription-executions.read',
    module: 'medical-records',
    description: 'Read scheduled prescription execution plans.'
  },
  {
    id: 'perm_prescription_executions_manage' as PermissionId,
    code: 'prescription-executions.manage',
    module: 'medical-records',
    description: 'Schedule, execute and suspend prescription administrations.'
  },
  {
    id: 'perm_discharges_read' as PermissionId,
    code: 'discharges.read',
    module: 'encounters',
    description: 'Read discharge summaries and follow-up instructions.'
  },
  {
    id: 'perm_discharges_manage' as PermissionId,
    code: 'discharges.manage',
    module: 'encounters',
    description: 'Create and update discharge records.'
  },
  {
    id: 'perm_attachments_read' as PermissionId,
    code: 'attachments.read',
    module: 'attachments',
    description: 'Read clinical attachments.'
  },
  {
    id: 'perm_attachments_manage' as PermissionId,
    code: 'attachments.manage',
    module: 'attachments',
    description: 'Upload and link clinical attachments.'
  },
  {
    id: 'perm_inpatient_read' as PermissionId,
    code: 'inpatient.read',
    module: 'inpatient',
    description: 'Read inpatient stays and progress.'
  },
  {
    id: 'perm_inpatient_manage' as PermissionId,
    code: 'inpatient.manage',
    module: 'inpatient',
    description: 'Admit and update inpatient stays.'
  },
  {
    id: 'perm_surgery_read' as PermissionId,
    code: 'surgery.read',
    module: 'surgery',
    description: 'Read surgery cases.'
  },
  {
    id: 'perm_surgery_manage' as PermissionId,
    code: 'surgery.manage',
    module: 'surgery',
    description: 'Manage surgery requests and statuses.'
  },
  {
    id: 'perm_diagnostics_read' as PermissionId,
    code: 'diagnostics.read',
    module: 'diagnostics',
    description: 'Read diagnostic orders and results.'
  },
  {
    id: 'perm_diagnostics_manage' as PermissionId,
    code: 'diagnostics.manage',
    module: 'diagnostics',
    description: 'Create diagnostic orders and record results.'
  },
  {
    id: 'perm_billing_read' as PermissionId,
    code: 'billing.read',
    module: 'billing',
    description: 'Read encounter-linked billing records.'
  },
  {
    id: 'perm_billing_manage' as PermissionId,
    code: 'billing.manage',
    module: 'billing',
    description: 'Manage encounter-linked billing records and items.'
  },
  {
    id: 'perm_inventory_read' as PermissionId,
    code: 'inventory.read',
    module: 'inventory',
    description: 'Read stock items and assistive consumption records.'
  },
  {
    id: 'perm_inventory_manage' as PermissionId,
    code: 'inventory.manage',
    module: 'inventory',
    description: 'Register assistive consumption and adjust stock usage.'
  },
  {
    id: 'perm_fiscal_read' as PermissionId,
    code: 'fiscal.read',
    module: 'fiscal',
    description: 'Read fiscal catalogs, tax rules and NFS-e layouts.'
  },
  {
    id: 'perm_fiscal_manage' as PermissionId,
    code: 'fiscal.manage',
    module: 'fiscal',
    description: 'Manage fiscal parametrization and tax rules.'
  },
  {
    id: 'perm_marketing_read' as PermissionId,
    code: 'marketing.read',
    module: 'marketing',
    description: 'Read marketing audiences, campaigns and delivery history.'
  },
  {
    id: 'perm_marketing_manage' as PermissionId,
    code: 'marketing.manage',
    module: 'marketing',
    description: 'Manage consent preferences, campaigns and marketing deliveries.'
  },
  {
    id: 'perm_notifications_read' as PermissionId,
    code: 'notifications.read',
    module: 'notifications',
    description: 'Read internal operational notifications.'
  },
  {
    id: 'perm_notifications_manage' as PermissionId,
    code: 'notifications.manage',
    module: 'notifications',
    description: 'Create and process operational notification jobs.'
  },
  {
    id: 'perm_product_read' as PermissionId,
    code: 'product.read',
    module: 'products',
    description: 'Read product catalog items.'
  },
  {
    id: 'perm_product_write' as PermissionId,
    code: 'product.write',
    module: 'products',
    description: 'Create and manage product catalog items.'
  },
  {
    id: 'perm_service_read' as PermissionId,
    code: 'service.read',
    module: 'services',
    description: 'Read service catalog items.'
  },
  {
    id: 'perm_service_write' as PermissionId,
    code: 'service.write',
    module: 'services',
    description: 'Create and manage service catalog items.'
  },
  {
    id: 'perm_counter_sale_read' as PermissionId,
    code: 'counter_sale.read',
    module: 'counter-sales',
    description: 'Read counter sale records.'
  },
  {
    id: 'perm_counter_sale_write' as PermissionId,
    code: 'counter_sale.write',
    module: 'counter-sales',
    description: 'Create and manage counter sales.'
  },
  {
    id: 'perm_quote_read' as PermissionId,
    code: 'quote.read',
    module: 'quotes',
    description: 'Read quote records.'
  },
  {
    id: 'perm_quote_write' as PermissionId,
    code: 'quote.write',
    module: 'quotes',
    description: 'Create and manage quotes.'
  },
  {
    id: 'perm_webhooks_read' as PermissionId,
    code: 'webhooks.read',
    module: 'webhooks',
    description: 'Read webhook integrations and delivery history.'
  },
  {
    id: 'perm_webhooks_manage' as PermissionId,
    code: 'webhooks.manage',
    module: 'webhooks',
    description: 'Register, update and disable webhook integrations.'
  },
  {
    id: 'perm_integrations_read' as PermissionId,
    code: 'integrations.read',
    module: 'integrations',
    description: 'Read the premium integrations catalog and event surface.'
  },
  {
    id: 'perm_integrations_manage' as PermissionId,
    code: 'integrations.manage',
    module: 'integrations',
    description: 'Manage premium integrations and third-party access.'
  },
  {
    id: 'perm_api_keys_manage' as PermissionId,
    code: 'api_keys.manage',
    module: 'integrations',
    description: 'Create and manage API keys for third-party access.'
  },
  {
    id: 'perm_payments_manage' as PermissionId,
    code: 'payments.manage',
    module: 'billing',
    description: 'Create and manage payment intents and provider access.'
  },
  {
    id: 'perm_flags_read' as PermissionId,
    code: 'flags.read',
    module: 'feature-flags',
    description: 'Read feature flag definitions, overrides and evaluation results.'
  },
  {
    id: 'perm_flags_admin' as PermissionId,
    code: 'flags.admin',
    module: 'feature-flags',
    description: 'Create, update and delete feature flags and overrides. Apply kill switches.'
  }
] as const;

const roleCatalog: readonly RoleDefinition[] = [
  {
    id: 'role_admin' as RoleId,
    code: 'admin',
    name: 'Admin',
    description: 'Governanca sistêmica e administracao de identidade.',
    permissionCodes: permissionCatalog.map((permission) => permission.code)
  },
  {
    id: 'role_reception' as RoleId,
    code: 'reception',
    name: 'Reception',
    description: 'Acesso operacional basico para cadastro mestre.',
    permissionCodes: [
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
    ]
  },
  {
    id: 'role_nurse' as RoleId,
    code: 'nurse',
    name: 'Nurse',
    description: 'Acesso assistencial inicial para triagem e fluxo operacional.',
    permissionCodes: [
      'auth.session.read',
      'patients.read',
      'owners.read',
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
    ]
  },
  {
    id: 'role_veterinarian' as RoleId,
    code: 'veterinarian',
    name: 'Veterinarian',
    description: 'Acesso clinico para registro de prontuario base e condutas.',
    permissionCodes: [
      'auth.session.read',
      'patients.read',
      'owners.read',
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
    ]
  },
  {
    id: 'role_finance' as RoleId,
    code: 'finance',
    name: 'Finance',
    description: 'Acesso administrativo para cobranca sem leitura clinica sensivel.',
    permissionCodes: [
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
    ]
  },
  {
    id: 'role_inventory' as RoleId,
    code: 'inventory',
    name: 'Inventory',
    description: 'Acesso administrativo-operacional para consumo assistencial e estoque basico.',
    permissionCodes: [
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
    ]
  },
  {
    id: 'role_auditor' as RoleId,
    code: 'auditor',
    name: 'Auditor',
    description: 'Consulta de trilha auditavel sem operacao administrativa.',
    permissionCodes: [
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
  }
] as const;

const roleMap = new Map(roleCatalog.map((role) => [role.code, role]));

const routineActions: readonly AccessRoutineAction[] = [
  'consult',
  'insert',
  'update',
  'delete',
  'execute',
  'admin'
];

function resolveRoutineActions(permissionCode: string): readonly AccessRoutineAction[] {
  const normalized = permissionCode.toLowerCase();
  if (normalized.includes('.admin')) {
    return ['consult', 'insert', 'update', 'delete', 'execute', 'admin'];
  }
  if (normalized.includes('.manage')) {
    return ['consult', 'insert', 'update', 'delete', 'execute'];
  }

  const actions = new Set<AccessRoutineAction>();
  if (
    normalized.includes('.read') ||
    normalized.includes('.view') ||
    normalized.includes('.consult') ||
    normalized.includes('.list')
  ) {
    actions.add('consult');
  }
  if (
    normalized.includes('.write') ||
    normalized.includes('.create') ||
    normalized.includes('.insert')
  ) {
    actions.add('insert');
    actions.add('update');
  }
  if (
    normalized.includes('.update') ||
    normalized.includes('.edit') ||
    normalized.includes('.review')
  ) {
    actions.add('update');
  }
  if (
    normalized.includes('.delete') ||
    normalized.includes('.remove') ||
    normalized.includes('.archive') ||
    normalized.includes('.cancel')
  ) {
    actions.add('delete');
  }
  if (
    normalized.includes('.execute') ||
    normalized.includes('.run') ||
    normalized.includes('.settle') ||
    normalized.includes('.pay') ||
    normalized.includes('.release')
  ) {
    actions.add('execute');
  }
  return actions.size > 0 ? [...actions] : ['consult'];
}

function createEmptyRoutineActionMap(): Record<AccessRoutineAction, boolean> {
  return {
    consult: false,
    insert: false,
    update: false,
    delete: false,
    execute: false,
    admin: false
  };
}

function determineCoverageStatus(
  actions: Record<AccessRoutineAction, boolean>
): AccessModulePermissionMatrixEntry['coverageStatus'] {
  if (actions.consult && actions.insert && actions.update && (actions.delete || actions.execute || actions.admin)) {
    return 'complete';
  }
  if (actions.consult && !actions.insert && !actions.update && !actions.delete && !actions.execute && !actions.admin) {
    return 'read-only';
  }
  return 'partial';
}

export interface AccessContext {
  readonly roleCodes: readonly string[];
  readonly department?: string;
  readonly accountId?: AccountId;
  readonly userId?: UserId;
}

export interface PolicyEvaluationInput {
  readonly actor: UserSummary;
  readonly access: AccessProfile;
  readonly permissionCode: string;
  readonly accountId?: string;
}

export interface AccessControlServiceOptions {
  readonly repository?: AccessControlRepository;
}

type SubjectType = 'user' | 'team' | 'sector';

export class AccessControlService {
  readonly #repository?: AccessControlRepository;
  #permissions = [...permissionCatalog];
  #roles = [...roleCatalog];
  readonly #teams = new Map<AccessTeamId, AccessTeamSummary>();
  readonly #sectors = new Map<AccessSectorId, AccessSectorSummary>();
  readonly #userRoleCodes = new Map<UserId, readonly string[]>();
  readonly #teamMembershipsByUser = new Map<UserId, readonly AccessTeamId[]>();
  readonly #sectorMembershipsByUser = new Map<UserId, readonly AccessSectorId[]>();
  readonly #userAssignments = new Map<UserId, readonly AccessPermissionAssignmentSummary[]>();
  readonly #teamAssignments = new Map<AccessTeamId, readonly AccessPermissionAssignmentSummary[]>();
  readonly #sectorAssignments = new Map<AccessSectorId, readonly AccessPermissionAssignmentSummary[]>();
  readonly #hydratedUserIdsByAccount = new Map<AccountId, readonly UserId[]>();

  public constructor(options?: AccessControlServiceOptions) {
    this.#repository = options?.repository;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository || !accountId) return;
    const [roles, permissions, teams, sectors, membershipsTeams, membershipsSectors, assignments, accountUserIds] =
      await Promise.all([
        this.#repository.findAllRoles(),
        this.#repository.findAllPermissions(),
        this.#repository.findAllTeams(accountId),
        this.#repository.findAllSectors(accountId),
        this.#repository.findTeamMemberships(accountId),
        this.#repository.findSectorMemberships(accountId),
        this.#repository.findPermissionAssignments(accountId),
        this.#repository.findUserIdsByAccount?.(accountId) ?? Promise.resolve([])
      ]);

    this.#roles = roles.length ? roles.map(mapRoleRecord) : [...roleCatalog];
    this.#permissions = permissions.length
      ? permissions.map(mapPermissionRecord)
      : [...permissionCatalog];

    const previousTeamIds = Array.from(this.#teams.values())
      .filter((team) => team.accountId === accountId)
      .map((team) => team.id);
    const previousSectorIds = Array.from(this.#sectors.values())
      .filter((sector) => sector.accountId === accountId)
      .map((sector) => sector.id);
    const previousUserIds = this.#hydratedUserIdsByAccount.get(accountId) ?? [];

    for (const teamId of previousTeamIds) {
      this.#teams.delete(teamId);
      this.#teamAssignments.delete(teamId);
    }
    for (const team of teams) this.#teams.set(team.id, team);

    for (const sectorId of previousSectorIds) {
      this.#sectors.delete(sectorId);
      this.#sectorAssignments.delete(sectorId);
    }
    for (const sector of sectors) this.#sectors.set(sector.id, sector);

    for (const userId of previousUserIds) {
      this.#userRoleCodes.delete(userId);
      this.#teamMembershipsByUser.delete(userId);
      this.#sectorMembershipsByUser.delete(userId);
      this.#userAssignments.delete(userId);
    }
    const userIds = new Set<UserId>([
      ...accountUserIds,
      ...membershipsTeams.map((membership) => membership.userId),
      ...membershipsSectors.map((membership) => membership.userId),
      ...assignments
        .filter((assignment) => assignment.subjectType === 'user')
        .map((assignment) => assignment.subjectId as UserId)
    ]);
    for (const userId of userIds) {
      const rolesByUser = await this.#repository.findRolesByUser(userId);
      if (rolesByUser.length > 0) {
        this.#userRoleCodes.set(
          userId,
          rolesByUser.map((role) => role.code)
        );
      }
    }
    this.#hydratedUserIdsByAccount.set(accountId, [...userIds]);

    for (const membership of membershipsTeams) {
      const existing = this.#teamMembershipsByUser.get(membership.userId) ?? [];
      this.#teamMembershipsByUser.set(membership.userId, [...existing, membership.subjectId as AccessTeamId]);
    }

    for (const membership of membershipsSectors) {
      const existing = this.#sectorMembershipsByUser.get(membership.userId) ?? [];
      this.#sectorMembershipsByUser.set(membership.userId, [
        ...existing,
        membership.subjectId as AccessSectorId
      ]);
    }

    for (const assignment of assignments) {
      this.#storeAssignment(assignment);
    }
  }

  public listPermissions(): readonly PermissionDefinition[] {
    return this.#permissions;
  }

  public listRoles(): readonly RoleDefinition[] {
    return this.#roles;
  }

  public listTeams(accountId?: AccountId): readonly AccessTeamSummary[] {
    return Array.from(this.#teams.values()).filter((team) => !accountId || team.accountId === accountId);
  }

  public listSectors(accountId?: AccountId): readonly AccessSectorSummary[] {
    return Array.from(this.#sectors.values()).filter(
      (sector) => !accountId || sector.accountId === accountId
    );
  }

  public listMemberships(userId: UserId): {
    teams: readonly AccessTeamSummary[];
    sectors: readonly AccessSectorSummary[];
  } {
    return {
      teams: (this.#teamMembershipsByUser.get(userId) ?? [])
        .map((id) => this.#teams.get(id))
        .filter(Boolean) as readonly AccessTeamSummary[],
      sectors: (this.#sectorMembershipsByUser.get(userId) ?? [])
        .map((id) => this.#sectors.get(id))
        .filter(Boolean) as readonly AccessSectorSummary[]
    };
  }

  public listAssignments(): {
    userPermissions: readonly AccessPermissionAssignmentSummary[];
    teamPermissions: readonly AccessPermissionAssignmentSummary[];
    sectorPermissions: readonly AccessPermissionAssignmentSummary[];
  } {
    return {
      userPermissions: Array.from(this.#userAssignments.values()).flat(),
      teamPermissions: Array.from(this.#teamAssignments.values()).flat(),
      sectorPermissions: Array.from(this.#sectorAssignments.values()).flat()
    };
  }

  public getModulePermissionMatrix(accountId?: AccountId): readonly AccessModulePermissionMatrixEntry[] {
    const assignments = this.listAssignments();
    const grouped = new Map<
      string,
      {
        module: string;
        permissionCodes: Set<string>;
        actions: Record<AccessRoutineAction, boolean>;
        rolesAllowed: Set<string>;
        teamOverrideCount: number;
        sectorOverrideCount: number;
        userOverrideCount: number;
      }
    >();

    for (const permission of this.#permissions) {
      const module = permission.module || permission.code.split('.')[0] || 'outros';
      const current =
        grouped.get(module) ??
        {
          module,
          permissionCodes: new Set<string>(),
          actions: createEmptyRoutineActionMap(),
          rolesAllowed: new Set<string>(),
          teamOverrideCount: 0,
          sectorOverrideCount: 0,
          userOverrideCount: 0
        };

      current.permissionCodes.add(permission.code);
      for (const action of resolveRoutineActions(permission.code)) {
        current.actions[action] = true;
      }

      for (const role of this.#roles) {
        if (role.permissionCodes.includes(permission.code)) {
          current.rolesAllowed.add(role.code);
        }
      }

      current.userOverrideCount += assignments.userPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;
      current.teamOverrideCount += assignments.teamPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;
      current.sectorOverrideCount += assignments.sectorPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;

      grouped.set(module, current);
    }

    return [...grouped.values()]
      .map((entry) => ({
        module: entry.module,
        permissionCodes: [...entry.permissionCodes].sort(),
        actions: routineActions.reduce<Record<AccessRoutineAction, boolean>>(
          (acc, action) => ({ ...acc, [action]: entry.actions[action] }),
          createEmptyRoutineActionMap()
        ),
        rolesAllowed: [...entry.rolesAllowed].sort(),
        teamOverrideCount: entry.teamOverrideCount,
        sectorOverrideCount: entry.sectorOverrideCount,
        userOverrideCount: entry.userOverrideCount,
        coverageStatus: determineCoverageStatus(entry.actions)
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }

  public getLegacyRoleCodes(userId: UserId): readonly string[] {
    return this.#userRoleCodes.get(userId) ?? [];
  }

  public async replaceLegacyRoles(userId: UserId, roleCodes: readonly string[]): Promise<void> {
    if (this.#repository) {
      const existing = await this.#repository.findRolesByUser(userId);
      for (const role of existing) {
        await this.#repository.removeRoleFromUser(userId, role.id);
      }
      for (const roleCode of roleCodes) {
        const role = this.#roles.find((item) => item.code === roleCode);
        if (role) {
          await this.#repository.assignRoleToUser(userId, role.id);
        }
      }
    }
    this.#userRoleCodes.set(userId, [...roleCodes]);
  }

  public async createTeam(
    accountId: AccountId,
    input: { code: string; name: string; description?: string | null }
  ): Promise<AccessTeamSummary> {
    const team = this.#repository
      ? await this.#repository.createTeam({ accountId, ...input })
      : createInMemoryTeam(accountId, input);
    this.#teams.set(team.id, team);
    return team;
  }

  public async updateTeam(
    id: AccessTeamId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessTeamSummary> {
    const existing = this.#teams.get(id);
    if (!existing) throw new NotFoundError('Access team not found', { teamId: id });
    const team = this.#repository
      ? await this.#repository.updateTeam(id, input)
      : {
          ...existing,
          code: input.code ?? existing.code,
          name: input.name ?? existing.name,
          description:
            input.description !== undefined ? input.description ?? undefined : existing.description,
          status:
            input.isActive !== undefined ? (input.isActive ? 'active' : 'inactive') : existing.status,
          updatedAt: new Date().toISOString()
        };
    this.#teams.set(team.id, team);
    return team;
  }

  public async createSector(
    accountId: AccountId,
    input: { code: string; name: string; description?: string | null }
  ): Promise<AccessSectorSummary> {
    const sector = this.#repository
      ? await this.#repository.createSector({ accountId, ...input })
      : createInMemorySector(accountId, input);
    this.#sectors.set(sector.id, sector);
    return sector;
  }

  public async updateSector(
    id: AccessSectorId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessSectorSummary> {
    const existing = this.#sectors.get(id);
    if (!existing) throw new NotFoundError('Access sector not found', { sectorId: id });
    const sector = this.#repository
      ? await this.#repository.updateSector(id, input)
      : {
          ...existing,
          code: input.code ?? existing.code,
          name: input.name ?? existing.name,
          description:
            input.description !== undefined ? input.description ?? undefined : existing.description,
          status:
            input.isActive !== undefined ? (input.isActive ? 'active' : 'inactive') : existing.status,
          updatedAt: new Date().toISOString()
        };
    this.#sectors.set(sector.id, sector);
    return sector;
  }

  public async replaceUserTeams(userId: UserId, teamIds: readonly AccessTeamId[]): Promise<void> {
    if (this.#repository) {
      await this.#repository.replaceUserTeams(userId, teamIds);
    }
    this.#teamMembershipsByUser.set(userId, [...teamIds]);
  }

  public async replaceUserSectors(
    userId: UserId,
    sectorIds: readonly AccessSectorId[]
  ): Promise<void> {
    if (this.#repository) {
      await this.#repository.replaceUserSectors(userId, sectorIds);
    }
    this.#sectorMembershipsByUser.set(userId, [...sectorIds]);
  }

  public async setPermissionAssignment(input: {
    accountId: AccountId;
    subjectType: SubjectType;
    subjectId: string;
    permissionCode: string;
    effect?: AccessAssignmentEffect | 'inherit';
  }): Promise<void> {
    if (input.effect === 'inherit' || !input.effect) {
      if (this.#repository) {
        await this.#repository.removePermissionAssignment({
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          permissionCode: input.permissionCode
        });
      }
      this.#removeAssignment(input.subjectType, input.subjectId, input.permissionCode);
      return;
    }

    if (this.#repository) {
      await this.#repository.upsertPermissionAssignment({
        accountId: input.accountId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        permissionCode: input.permissionCode,
        effect: input.effect
      });
    }

    this.#storeAssignment({
      accountId: input.accountId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      permissionCode: input.permissionCode,
      effect: input.effect,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  public getEffectivePermissions(input: {
    accountId: AccountId;
    userId: UserId;
    roleCodes?: readonly string[];
  }): readonly EffectivePermissionSummary[] {
    const permissionByCode = new Map(this.#permissions.map((permission) => [permission.code, permission]));
    const effective: EffectivePermissionSummary[] = [];
    const roleCodes = this.#userRoleCodes.get(input.userId) ?? input.roleCodes ?? [];
    const teams = this.#teamMembershipsByUser.get(input.userId) ?? [];
    const sectors = this.#sectorMembershipsByUser.get(input.userId) ?? [];
    const userAssignments = this.#userAssignments.get(input.userId) ?? [];
    const teamAssignments = teams.flatMap((teamId) => this.#teamAssignments.get(teamId) ?? []);
    const sectorAssignments = sectors.flatMap((sectorId) => this.#sectorAssignments.get(sectorId) ?? []);

    for (const permission of this.#permissions) {
      const sources: EffectivePermissionSource[] = [];
      for (const assignment of userAssignments.filter((item) => item.permissionCode === permission.code)) {
        sources.push({
          kind: 'user',
          sourceId: String(input.userId),
          sourceCode: String(input.userId),
          sourceName: 'Usuario',
          effect: assignment.effect,
          inherited: false
        });
      }
      for (const sectorId of sectors) {
        const sector = this.#sectors.get(sectorId);
        for (const assignment of (this.#sectorAssignments.get(sectorId) ?? []).filter(
          (item) => item.permissionCode === permission.code
        )) {
          sources.push({
            kind: 'sector',
            sourceId: String(sectorId),
            sourceCode: sector?.code ?? String(sectorId),
            sourceName: sector?.name ?? 'Setor',
            effect: assignment.effect,
            inherited: true
          });
        }
      }
      for (const teamId of teams) {
        const team = this.#teams.get(teamId);
        for (const assignment of (this.#teamAssignments.get(teamId) ?? []).filter(
          (item) => item.permissionCode === permission.code
        )) {
          sources.push({
            kind: 'team',
            sourceId: String(teamId),
            sourceCode: team?.code ?? String(teamId),
            sourceName: team?.name ?? 'Equipe',
            effect: assignment.effect,
            inherited: true
          });
        }
      }
      for (const roleCode of roleCodes) {
        const role = this.#roles.find((item) => item.code === roleCode);
        if (role?.permissionCodes.includes(permission.code)) {
          sources.push({
            kind: 'role',
            sourceId: role.id,
            sourceCode: role.code,
            sourceName: role.name,
            effect: 'allow_legacy',
            inherited: true
          });
        }
      }

      const resolution = resolvePermission(sources);
      effective.push({
        permissionCode: permission.code,
        module: permission.module,
        description: permission.description,
        effective: resolution !== 'none' && !resolution.endsWith('deny'),
        direct: resolution.startsWith('user_'),
        inherited: !resolution.startsWith('user_') && resolution !== 'none',
        resolution,
        sources
      });
      if (!permissionByCode.has(permission.code)) continue;
    }
    return effective;
  }

  public createProfile(context: AccessContext): AccessProfile {
    const effectivePermissions =
      context.userId && context.accountId
        ? this.getEffectivePermissions({
            accountId: context.accountId,
            userId: context.userId,
            roleCodes: context.roleCodes
          })
        : this.#permissions
            .filter((permission) =>
              context.roleCodes.some((roleCode) =>
                (this.#roles.find((role) => role.code === roleCode) ?? roleMap.get(roleCode))?.permissionCodes.includes(permission.code)
              )
            )
            .map((permission) => ({
              permissionCode: permission.code,
              module: permission.module,
              description: permission.description,
              effective: true,
              direct: false,
              inherited: true,
              resolution: 'role_allow' as const,
              sources: []
            }));

    const permissionCodes = effectivePermissions
      .filter((permission) => permission.effective)
      .map((permission) => permission.permissionCode)
      .sort();

    const capabilities = [
      'identity.authenticated',
      ...permissionCodes.map((permissionCode) => `cap:${permissionCode}`)
    ];

    return {
      roleCodes: [...context.roleCodes],
      permissionCodes,
      capabilities,
      effectivePermissions
    };
  }

  public assertAuthorized(input: PolicyEvaluationInput): void {
    if (input.actor.status !== 'active') {
      throw new ForbiddenError('Inactive users cannot perform this action', {
        userId: input.actor.id
      });
    }

    if (!input.access.permissionCodes.includes(input.permissionCode)) {
      throw new ForbiddenError('Missing required permission', {
        permissionCode: input.permissionCode
      });
    }

    if (input.accountId && input.actor.accountId !== input.accountId) {
      throw new ForbiddenError('Cross-account access is not allowed', {
        actorAccountId: input.actor.accountId,
        targetAccountId: input.accountId
      });
    }
  }

  #storeAssignment(assignment: AccessPermissionAssignmentRecord | AccessPermissionAssignmentSummary) {
    const normalized: AccessPermissionAssignmentSummary = {
      accountId: assignment.accountId,
      subjectType: assignment.subjectType,
      subjectId: assignment.subjectId as UserId | AccessTeamId | AccessSectorId,
      permissionCode: assignment.permissionCode,
      effect: assignment.effect,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    };
    const target =
      assignment.subjectType === 'user'
        ? this.#userAssignments
        : assignment.subjectType === 'team'
          ? this.#teamAssignments
          : this.#sectorAssignments;
    const existing = target.get(normalized.subjectId as never) ?? [];
    const filtered = existing.filter((item) => item.permissionCode !== normalized.permissionCode);
    target.set(normalized.subjectId as never, [...filtered, normalized]);
  }

  #removeAssignment(subjectType: SubjectType, subjectId: string, permissionCode: string) {
    const target =
      subjectType === 'user'
        ? this.#userAssignments
        : subjectType === 'team'
          ? this.#teamAssignments
          : this.#sectorAssignments;
    const existing = target.get(subjectId as never) ?? [];
    target.set(
      subjectId as never,
      existing.filter((item) => item.permissionCode !== permissionCode)
    );
  }
}

function resolvePermission(
  sources: readonly EffectivePermissionSource[]
): EffectivePermissionSummary['resolution'] {
  if (sources.some((source) => source.kind === 'user' && source.effect === 'deny')) return 'user_deny';
  if (sources.some((source) => source.kind === 'user' && source.effect === 'allow')) return 'user_allow';
  if (sources.some((source) => source.kind === 'sector' && source.effect === 'deny')) return 'sector_deny';
  if (sources.some((source) => source.kind === 'sector' && source.effect === 'allow')) return 'sector_allow';
  if (sources.some((source) => source.kind === 'team' && source.effect === 'deny')) return 'team_deny';
  if (sources.some((source) => source.kind === 'team' && source.effect === 'allow')) return 'team_allow';
  if (sources.some((source) => source.kind === 'role' && source.effect === 'allow_legacy')) return 'role_allow';
  return 'none';
}

function mapRoleRecord(record: RoleRecord): RoleDefinition {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? '',
    permissionCodes: [...record.permissionCodes]
  };
}

function mapPermissionRecord(record: PermissionRecord): PermissionDefinition {
  return {
    id: record.id,
    code: record.key,
    module: record.key.split('.')[0] ?? 'access-control',
    description: record.description ?? record.key
  };
}

function createInMemoryTeam(
  accountId: AccountId,
  input: { code: string; name: string; description?: string | null }
): AccessTeamSummary {
  const now = new Date().toISOString();
  return {
    id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as AccessTeamId,
    accountId,
    code: input.code,
    name: input.name,
    description: input.description ?? undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

function createInMemorySector(
  accountId: AccountId,
  input: { code: string; name: string; description?: string | null }
): AccessSectorSummary {
  const now = new Date().toISOString();
  return {
    id: `sector_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as AccessSectorId,
    accountId,
    code: input.code,
    name: input.name,
    description: input.description ?? undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

export {
  DatabaseAccessControlRepository,
  type AccessControlRepository,
  type RoleRecord,
  type PermissionRecord,
  type AccessPermissionAssignmentRecord
} from './repositories/database-access-control.repository.js';

export {
  AbacEngine,
  DEFAULT_ABAC_POLICIES,
  resolveAttribute,
  type AbacEngineOptions,
  type AbacPolicy,
  type PolicyRule,
  type PolicyCondition,
  type ConditionOperator,
  type PolicyCombiningAlgorithm,
  type ActorAttributes,
  type ResourceAttributes,
  type EnvironmentAttributes,
  type ResourceType,
  type PolicyEvaluationResult
} from './abac.js';
