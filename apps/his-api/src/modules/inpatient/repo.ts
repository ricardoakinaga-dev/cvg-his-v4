type DbClient = typeof import('@cvg-his/db').db;

export type InpatientStayStatus = 'active' | 'discharged' | 'transferred';

export type InpatientStayRecord = {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  encounterId: string | null;
  wardId: string;
  bedId: string;
  status: InpatientStayStatus;
  admittedAt: Date;
  dischargedAt: Date | null;
  admittedByUserId: string;
  dischargedByUserId: string | null;
  chiefComplaint: string | null;
  reason: string | null;
  planSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InpatientPatientRef = {
  patientId: string;
  ownerId: string;
};

export type InpatientBedRef = {
  bedId: string;
  wardId: string;
  isActive: boolean;
};

type AdmitInput = {
  accountId: string;
  patientId: string;
  ownerId: string;
  encounterId?: string;
  wardId: string;
  bedId: string;
  admittedByUserId: string;
  chiefComplaint?: string;
  reason?: string;
  planSummary?: string;
};

type TransferInput = {
  accountId: string;
  stayId: string;
  toWardId: string;
  toBedId: string;
  reason?: string;
};

type DischargeInput = {
  accountId: string;
  stayId: string;
  reason: string;
  dischargedByUserId: string;
};

type ListInput = {
  accountId: string;
  page: number;
  pageSize: number;
  status?: InpatientStayStatus;
  wardId?: string;
};

function mapStatus(value: unknown): InpatientStayStatus {
  const raw = String(value);
  if (raw === 'discharged') {
    return 'discharged';
  }

  if (raw === 'transferred') {
    return 'transferred';
  }

  return 'active';
}

function mapStayRow(row: Record<string, unknown>): InpatientStayRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    patientId: String(row.patient_id),
    ownerId: String(row.owner_id),
    encounterId: row.encounter_id ? String(row.encounter_id) : null,
    wardId: String(row.ward_id),
    bedId: String(row.bed_id),
    status: mapStatus(row.status),
    admittedAt: new Date(String(row.admitted_at)),
    dischargedAt: row.discharged_at ? new Date(String(row.discharged_at)) : null,
    admittedByUserId: String(row.admitted_by_user_id),
    dischargedByUserId: row.discharged_by_user_id ? String(row.discharged_by_user_id) : null,
    chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
    reason: row.reason ? String(row.reason) : null,
    planSummary: row.plan_summary ? String(row.plan_summary) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export type InpatientRepo = {
  findPatientInAccount: (accountId: string, patientId: string) => Promise<InpatientPatientRef | null>;
  wardExistsInAccount: (accountId: string, wardId: string) => Promise<boolean>;
  findBedInAccount: (accountId: string, bedId: string) => Promise<InpatientBedRef | null>;
  hasActiveStayInBed: (accountId: string, bedId: string, excludeStayId?: string) => Promise<boolean>;
  admit: (input: AdmitInput) => Promise<InpatientStayRecord>;
  findStayById: (accountId: string, stayId: string) => Promise<InpatientStayRecord | null>;
  transfer: (input: TransferInput) => Promise<InpatientStayRecord | null>;
  discharge: (input: DischargeInput) => Promise<InpatientStayRecord | null>;
  list: (input: ListInput) => Promise<{
    data: InpatientStayRecord[];
    page: number;
    pageSize: number;
    total: number;
  }>;
};

export function createInpatientRepo(db: DbClient): InpatientRepo {
  return {
    async findPatientInAccount(accountId: string, patientId: string): Promise<InpatientPatientRef | null> {
      const queryResult = await db.$client.query(
        `
          select id, owner_id
          from patients
          where id = $1 and account_id = $2
          limit 1
        `,
        [patientId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      const row = queryResult.rows[0] as Record<string, unknown>;
      return {
        patientId: String(row.id),
        ownerId: String(row.owner_id)
      };
    },

    async wardExistsInAccount(accountId: string, wardId: string): Promise<boolean> {
      const queryResult = await db.$client.query(
        `
          select 1
          from wards
          where id = $1 and account_id = $2 and is_active = true
          limit 1
        `,
        [wardId, accountId]
      );

      return queryResult.rows.length > 0;
    },

    async findBedInAccount(accountId: string, bedId: string): Promise<InpatientBedRef | null> {
      const queryResult = await db.$client.query(
        `
          select id, ward_id, is_active
          from beds
          where id = $1 and account_id = $2
          limit 1
        `,
        [bedId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      const row = queryResult.rows[0] as Record<string, unknown>;
      return {
        bedId: String(row.id),
        wardId: String(row.ward_id),
        isActive: Boolean(row.is_active)
      };
    },

    async hasActiveStayInBed(accountId: string, bedId: string, excludeStayId?: string): Promise<boolean> {
      const values: Array<string> = [accountId, bedId];
      let where = 'account_id = $1 and bed_id = $2 and status = \'active\'';

      if (excludeStayId) {
        values.push(excludeStayId);
        where += ' and id <> $3';
      }

      const queryResult = await db.$client.query(
        `
          select 1
          from inpatient_stays
          where ${where}
          limit 1
        `,
        values
      );

      return queryResult.rows.length > 0;
    },

    async admit(input: AdmitInput): Promise<InpatientStayRecord> {
      const queryResult = await db.$client.query(
        `
          insert into inpatient_stays (
            account_id,
            patient_id,
            owner_id,
            encounter_id,
            ward_id,
            bed_id,
            status,
            admitted_at,
            admitted_by_user_id,
            chief_complaint,
            reason,
            plan_summary
          ) values (
            $1, $2, $3, $4, $5, $6, 'active', now(), $7, $8, $9, $10
          )
          returning *
        `,
        [
          input.accountId,
          input.patientId,
          input.ownerId,
          input.encounterId ?? null,
          input.wardId,
          input.bedId,
          input.admittedByUserId,
          input.chiefComplaint ?? null,
          input.reason ?? null,
          input.planSummary ?? null
        ]
      );

      return mapStayRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findStayById(accountId: string, stayId: string): Promise<InpatientStayRecord | null> {
      const queryResult = await db.$client.query(
        `
          select *
          from inpatient_stays
          where id = $1 and account_id = $2
          limit 1
        `,
        [stayId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapStayRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async transfer(input: TransferInput): Promise<InpatientStayRecord | null> {
      const queryResult = await db.$client.query(
        `
          update inpatient_stays
          set
            ward_id = $1,
            bed_id = $2,
            reason = coalesce($3, reason),
            updated_at = now()
          where id = $4
            and account_id = $5
            and status = 'active'
          returning *
        `,
        [input.toWardId, input.toBedId, input.reason ?? null, input.stayId, input.accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapStayRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async discharge(input: DischargeInput): Promise<InpatientStayRecord | null> {
      const queryResult = await db.$client.query(
        `
          update inpatient_stays
          set
            status = 'discharged',
            discharged_at = now(),
            discharged_by_user_id = $1,
            reason = $2,
            updated_at = now()
          where id = $3
            and account_id = $4
            and status = 'active'
          returning *
        `,
        [input.dischargedByUserId, input.reason, input.stayId, input.accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapStayRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.status) {
        whereParts.push(`status = $${index}`);
        values.push(input.status);
        index += 1;
      }

      if (input.wardId) {
        whereParts.push(`ward_id = $${index}`);
        values.push(input.wardId);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from inpatient_stays
            where ${whereClause}
            order by admitted_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from inpatient_stays where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapStayRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
