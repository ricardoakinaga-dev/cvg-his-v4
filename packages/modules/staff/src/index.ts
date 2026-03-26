import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type { StaffId, StaffSummary, UserId } from "@cvg-his-v2/shared-types";

function createSeedStaff(): StaffSummary[] {
  const createdAt = "2026-03-25T00:00:00.000Z";

  return [
    {
      id: "staff_admin" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_admin" as UserId,
      employeeCode: "ADM-001",
      fullName: "Admin CVG",
      department: "Governanca",
      jobTitle: "Administrador do Sistema",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_reception" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_reception" as UserId,
      employeeCode: "REC-001",
      fullName: "Recepcao Central",
      department: "Atendimento",
      jobTitle: "Recepcionista",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_auditor" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_auditor" as UserId,
      employeeCode: "AUD-001",
      fullName: "Auditoria Interna",
      department: "Governanca",
      jobTitle: "Auditor",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_nurse" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_nurse" as UserId,
      employeeCode: "NUR-001",
      fullName: "Enfermagem Inicial",
      department: "Triagem",
      jobTitle: "Enfermeira",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_vet" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_vet" as UserId,
      employeeCode: "VET-001",
      fullName: "Veterinario Responsavel",
      department: "Clinica",
      jobTitle: "Medico Veterinario",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_finance" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_finance" as UserId,
      employeeCode: "FIN-001",
      fullName: "Financeiro Operacional",
      department: "Financeiro",
      jobTitle: "Analista Financeiro",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "staff_inventory" as StaffId,
      accountId: "acc_cvg_demo" as never,
      userId: "user_inventory" as UserId,
      employeeCode: "INV-001",
      fullName: "Estoque Assistencial",
      department: "Suprimentos",
      jobTitle: "Analista de Estoque",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export class StaffService {
  readonly #staffById = new Map<StaffId, StaffSummary>();
  readonly #staffByUserId = new Map<UserId, StaffSummary>();

  public constructor(seedStaff: readonly StaffSummary[] = createSeedStaff()) {
    for (const staff of seedStaff) {
      this.#staffById.set(staff.id, staff);
      if (staff.userId) {
        this.#staffByUserId.set(staff.userId, staff);
      }
    }
  }

  public list(): readonly StaffSummary[] {
    return Array.from(this.#staffById.values());
  }

  public getOrThrow(staffId: StaffId): StaffSummary {
    const staff = this.#staffById.get(staffId);
    if (!staff) {
      throw new NotFoundError("Staff member not found", { staffId });
    }

    return staff;
  }

  public findByUserId(userId: UserId): StaffSummary | undefined {
    return this.#staffByUserId.get(userId);
  }
}

export { createSeedStaff };
