import { ForbiddenError } from "@cvg-his-v2/shared-errors";
import type {
  AccessProfile,
  PermissionId,
  PermissionDefinition,
  RoleId,
  RoleDefinition,
  UserSummary,
} from "@cvg-his-v2/shared-types";

const permissionCatalog: readonly PermissionDefinition[] = [
  {
    id: "perm_auth_session_read" as PermissionId,
    code: "auth.session.read",
    module: "auth",
    description: "Read the current authenticated session.",
  },
  {
    id: "perm_users_read" as PermissionId,
    code: "users.read",
    module: "users",
    description: "Read user records.",
  },
  {
    id: "perm_users_manage" as PermissionId,
    code: "users.manage",
    module: "users",
    description: "Manage user records.",
  },
  {
    id: "perm_staff_read" as PermissionId,
    code: "staff.read",
    module: "staff",
    description: "Read staff records.",
  },
  {
    id: "perm_staff_manage" as PermissionId,
    code: "staff.manage",
    module: "staff",
    description: "Manage staff records.",
  },
  {
    id: "perm_access_read" as PermissionId,
    code: "access.read",
    module: "access-control",
    description: "Read roles and permissions.",
  },
  {
    id: "perm_audit_read" as PermissionId,
    code: "audit.read",
    module: "audit",
    description: "Read audit trail events.",
  },
  {
    id: "perm_audit_write" as PermissionId,
    code: "audit.write",
    module: "audit",
    description: "Write audit trail events.",
  },
  {
    id: "perm_owners_read" as PermissionId,
    code: "owners.read",
    module: "owners",
    description: "Read owner records.",
  },
  {
    id: "perm_owners_manage" as PermissionId,
    code: "owners.manage",
    module: "owners",
    description: "Manage owner records.",
  },
  {
    id: "perm_patients_read" as PermissionId,
    code: "patients.read",
    module: "patients",
    description: "Read patient records.",
  },
  {
    id: "perm_patients_manage" as PermissionId,
    code: "patients.manage",
    module: "patients",
    description: "Manage patient records.",
  },
  {
    id: "perm_scheduling_read" as PermissionId,
    code: "scheduling.read",
    module: "scheduling",
    description: "Read appointments and operational queue.",
  },
  {
    id: "perm_scheduling_manage" as PermissionId,
    code: "scheduling.manage",
    module: "scheduling",
    description: "Manage appointments and queue flow.",
  },
  {
    id: "perm_encounters_read" as PermissionId,
    code: "encounters.read",
    module: "encounters",
    description: "Read encounter records and operational timeline.",
  },
  {
    id: "perm_encounters_manage" as PermissionId,
    code: "encounters.manage",
    module: "encounters",
    description: "Open, transition and close encounters.",
  },
  {
    id: "perm_triage_read" as PermissionId,
    code: "triage.read",
    module: "triage",
    description: "Read triage records.",
  },
  {
    id: "perm_triage_manage" as PermissionId,
    code: "triage.manage",
    module: "triage",
    description: "Record and update initial triage.",
  },
  {
    id: "perm_medical_records_read" as PermissionId,
    code: "medical-records.read",
    module: "medical-records",
    description: "Read medical records and clinical timeline.",
  },
  {
    id: "perm_medical_records_manage" as PermissionId,
    code: "medical-records.manage",
    module: "medical-records",
    description: "Create clinical entries, prescriptions and conduct.",
  },
  {
    id: "perm_attachments_read" as PermissionId,
    code: "attachments.read",
    module: "attachments",
    description: "Read clinical attachments.",
  },
  {
    id: "perm_attachments_manage" as PermissionId,
    code: "attachments.manage",
    module: "attachments",
    description: "Upload and link clinical attachments.",
  },
  {
    id: "perm_inpatient_read" as PermissionId,
    code: "inpatient.read",
    module: "inpatient",
    description: "Read inpatient stays and progress.",
  },
  {
    id: "perm_inpatient_manage" as PermissionId,
    code: "inpatient.manage",
    module: "inpatient",
    description: "Admit and update inpatient stays.",
  },
  {
    id: "perm_surgery_read" as PermissionId,
    code: "surgery.read",
    module: "surgery",
    description: "Read surgery cases.",
  },
  {
    id: "perm_surgery_manage" as PermissionId,
    code: "surgery.manage",
    module: "surgery",
    description: "Manage surgery requests and statuses.",
  },
  {
    id: "perm_diagnostics_read" as PermissionId,
    code: "diagnostics.read",
    module: "diagnostics",
    description: "Read diagnostic orders and results.",
  },
  {
    id: "perm_diagnostics_manage" as PermissionId,
    code: "diagnostics.manage",
    module: "diagnostics",
    description: "Create diagnostic orders and record results.",
  },
  {
    id: "perm_billing_read" as PermissionId,
    code: "billing.read",
    module: "billing",
    description: "Read encounter-linked billing records.",
  },
  {
    id: "perm_billing_manage" as PermissionId,
    code: "billing.manage",
    module: "billing",
    description: "Manage encounter-linked billing records and items.",
  },
  {
    id: "perm_inventory_read" as PermissionId,
    code: "inventory.read",
    module: "inventory",
    description: "Read stock items and assistive consumption records.",
  },
  {
    id: "perm_inventory_manage" as PermissionId,
    code: "inventory.manage",
    module: "inventory",
    description: "Register assistive consumption and adjust stock usage.",
  },
  {
    id: "perm_notifications_read" as PermissionId,
    code: "notifications.read",
    module: "notifications",
    description: "Read internal operational notifications.",
  },
  {
    id: "perm_notifications_manage" as PermissionId,
    code: "notifications.manage",
    module: "notifications",
    description: "Create and process operational notification jobs.",
  },
] as const;

const roleCatalog: readonly RoleDefinition[] = [
  {
    id: "role_admin" as RoleId,
    code: "admin",
    name: "Admin",
    description: "Governanca sistêmica e administracao de identidade.",
    permissionCodes: [
      "auth.session.read",
      "users.read",
      "users.manage",
      "staff.read",
      "staff.manage",
      "access.read",
      "audit.read",
      "audit.write",
      "owners.read",
      "owners.manage",
      "patients.read",
      "patients.manage",
      "scheduling.read",
      "scheduling.manage",
      "encounters.read",
      "encounters.manage",
      "triage.read",
      "triage.manage",
      "medical-records.read",
      "medical-records.manage",
      "attachments.read",
      "attachments.manage",
      "inpatient.read",
      "inpatient.manage",
      "surgery.read",
      "surgery.manage",
      "diagnostics.read",
      "diagnostics.manage",
      "billing.read",
      "billing.manage",
      "inventory.read",
      "inventory.manage",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_reception" as RoleId,
    code: "reception",
    name: "Reception",
    description: "Acesso operacional basico para cadastro mestre.",
    permissionCodes: [
      "auth.session.read",
      "users.read",
      "staff.read",
      "owners.read",
      "owners.manage",
      "patients.read",
      "patients.manage",
      "scheduling.read",
      "scheduling.manage",
      "encounters.read",
      "encounters.manage",
      "medical-records.read",
      "billing.read",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_nurse" as RoleId,
    code: "nurse",
    name: "Nurse",
    description: "Acesso assistencial inicial para triagem e fluxo operacional.",
    permissionCodes: [
      "auth.session.read",
      "patients.read",
      "owners.read",
      "scheduling.read",
      "encounters.read",
      "encounters.manage",
      "triage.read",
      "triage.manage",
      "medical-records.read",
      "attachments.read",
      "inpatient.read",
      "inventory.read",
      "inventory.manage",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_veterinarian" as RoleId,
    code: "veterinarian",
    name: "Veterinarian",
    description: "Acesso clinico para registro de prontuario base e condutas.",
    permissionCodes: [
      "auth.session.read",
      "patients.read",
      "owners.read",
      "encounters.read",
      "encounters.manage",
      "triage.read",
      "medical-records.read",
      "medical-records.manage",
      "attachments.read",
      "attachments.manage",
      "inpatient.read",
      "inpatient.manage",
      "surgery.read",
      "surgery.manage",
      "diagnostics.read",
      "diagnostics.manage",
      "inventory.read",
      "inventory.manage",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_finance" as RoleId,
    code: "finance",
    name: "Finance",
    description: "Acesso administrativo para cobranca sem leitura clinica sensivel.",
    permissionCodes: [
      "auth.session.read",
      "owners.read",
      "patients.read",
      "encounters.read",
      "billing.read",
      "billing.manage",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_inventory" as RoleId,
    code: "inventory",
    name: "Inventory",
    description: "Acesso administrativo-operacional para consumo assistencial e estoque basico.",
    permissionCodes: [
      "auth.session.read",
      "patients.read",
      "encounters.read",
      "inventory.read",
      "inventory.manage",
      "notifications.read",
      "notifications.manage",
    ],
  },
  {
    id: "role_auditor" as RoleId,
    code: "auditor",
    name: "Auditor",
    description: "Consulta de trilha auditavel sem operacao administrativa.",
    permissionCodes: [
      "auth.session.read",
      "audit.read",
      "access.read",
      "owners.read",
      "patients.read",
      "scheduling.read",
      "encounters.read",
      "triage.read",
      "medical-records.read",
      "attachments.read",
      "inpatient.read",
      "surgery.read",
      "diagnostics.read",
      "billing.read",
      "inventory.read",
      "notifications.read",
    ],
  },
] as const;

const roleMap = new Map(roleCatalog.map((role) => [role.code, role]));

export interface AccessContext {
  readonly roleCodes: readonly string[];
  readonly department?: string;
}

export interface PolicyEvaluationInput {
  readonly actor: UserSummary;
  readonly access: AccessProfile;
  readonly permissionCode: string;
  readonly accountId?: string;
}

export class AccessControlService {
  public listPermissions(): readonly PermissionDefinition[] {
    return permissionCatalog;
  }

  public listRoles(): readonly RoleDefinition[] {
    return roleCatalog;
  }

  public createProfile(context: AccessContext): AccessProfile {
    const permissionCodes = new Set<string>();

    for (const roleCode of context.roleCodes) {
      const role = roleMap.get(roleCode);
      if (!role) {
        continue;
      }

      for (const permissionCode of role.permissionCodes) {
        permissionCodes.add(permissionCode);
      }
    }

    const capabilities = [
      "identity.authenticated",
      ...Array.from(permissionCodes).map((permissionCode) => `cap:${permissionCode}`),
    ];

    return {
      roleCodes: [...context.roleCodes],
      permissionCodes: Array.from(permissionCodes).sort(),
      capabilities,
    };
  }

  public assertAuthorized(input: PolicyEvaluationInput): void {
    if (input.actor.status !== "active") {
      throw new ForbiddenError("Inactive users cannot perform this action", {
        userId: input.actor.id,
      });
    }

    if (!input.access.permissionCodes.includes(input.permissionCode)) {
      throw new ForbiddenError("Missing required permission", {
        permissionCode: input.permissionCode,
      });
    }

    if (input.accountId && input.actor.accountId !== input.accountId) {
      throw new ForbiddenError("Cross-account access is not allowed", {
        actorAccountId: input.actor.accountId,
        targetAccountId: input.accountId,
      });
    }
  }
}
