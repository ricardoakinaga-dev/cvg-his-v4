import type { MedicationOrderCreateDto, MedicationOrderUpdateDto } from '@cvg-his/domain';

import type { MedicationOrderRecord, MedicationOrderStatus } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreateMedicationOrderInput = MedicationOrderCreateDto & {
  accountId: string;
  createdByUserId: string;
};

type UpdateMedicationOrderInput = {
  accountId: string;
  orderId: string;
  patch: MedicationOrderUpdateDto;
};

type StopMedicationOrderInput = {
  accountId: string;
  orderId: string;
  stopReason: string;
  stoppedByUserId: string;
};

type ListMedicationOrdersInput = {
  accountId: string;
  encounterId?: string;
  stayId?: string;
  status?: MedicationOrderStatus;
  page: number;
  pageSize: number;
};

type InpatientStayRef = {
  id: string;
  patientId: string;
};

type EncounterRef = {
  id: string;
  patientId: string;
};

type PatientRef = {
  id: string;
};

function mapStatus(value: unknown): MedicationOrderStatus {
  return String(value) === 'stopped' ? 'stopped' : 'active';
}

function mapMedicationOrderRow(row: Record<string, unknown>): MedicationOrderRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    encounterId: row.encounter_id ? String(row.encounter_id) : null,
    stayId: row.stay_id ? String(row.stay_id) : null,
    patientId: String(row.patient_id),
    medicationName: String(row.medication_name),
    doseValue: String(row.dose_value),
    doseUnit: String(row.dose_unit),
    route: String(row.route),
    frequencyType: String(row.frequency_type),
    prescriptionText:
      row.prescription_text === null || row.prescription_text === undefined
        ? null
        : String(row.prescription_text),
    durationValue:
      row.duration_value === null || row.duration_value === undefined
        ? null
        : Number(row.duration_value),
    durationUnit: row.duration_unit ? String(row.duration_unit) : null,
    startAt: new Date(String(row.start_at)),
    endAt: row.end_at ? new Date(String(row.end_at)) : null,
    status: mapStatus(row.status),
    stopReason: row.stop_reason ? String(row.stop_reason) : null,
    createdByUserId: String(row.created_by_user_id),
    stoppedByUserId: row.stopped_by_user_id ? String(row.stopped_by_user_id) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export type MedicationOrdersRepo = {
  findPatientInAccount: (accountId: string, patientId: string) => Promise<PatientRef | null>;
  findStayInAccount: (accountId: string, stayId: string) => Promise<InpatientStayRef | null>;
  findEncounterInAccount: (accountId: string, encounterId: string) => Promise<EncounterRef | null>;
  create: (input: CreateMedicationOrderInput) => Promise<MedicationOrderRecord>;
  findById: (accountId: string, orderId: string) => Promise<MedicationOrderRecord | null>;
  updateById: (input: UpdateMedicationOrderInput) => Promise<MedicationOrderRecord | null>;
  stopById: (input: StopMedicationOrderInput) => Promise<MedicationOrderRecord | null>;
  list: (input: ListMedicationOrdersInput) => Promise<{
    data: MedicationOrderRecord[];
    page: number;
    pageSize: number;
    total: number;
  }>;
};

export function createMedicationOrdersRepo(db: DbClient): MedicationOrdersRepo {
  return {
    async findPatientInAccount(accountId: string, patientId: string): Promise<PatientRef | null> {
      const queryResult = await db.$client.query(
        `
          select id
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
        id: String(row.id)
      };
    },

    async findStayInAccount(accountId: string, stayId: string): Promise<InpatientStayRef | null> {
      const queryResult = await db.$client.query(
        `
          select id, patient_id
          from inpatient_stays
          where id = $1 and account_id = $2
          limit 1
        `,
        [stayId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      const row = queryResult.rows[0] as Record<string, unknown>;
      return {
        id: String(row.id),
        patientId: String(row.patient_id)
      };
    },

    async findEncounterInAccount(accountId: string, encounterId: string): Promise<EncounterRef | null> {
      const queryResult = await db.$client.query(
        `
          select id, patient_id
          from encounters
          where id = $1 and account_id = $2
          limit 1
        `,
        [encounterId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      const row = queryResult.rows[0] as Record<string, unknown>;
      return {
        id: String(row.id),
        patientId: String(row.patient_id)
      };
    },

    async create(input: CreateMedicationOrderInput): Promise<MedicationOrderRecord> {
      const queryResult = await db.$client.query(
        `
          insert into medication_orders (
            account_id,
            encounter_id,
            stay_id,
            patient_id,
            medication_name,
            dose_value,
            dose_unit,
            route,
            frequency_type,
            prescription_text,
            duration_value,
            duration_unit,
            start_at,
            end_at,
            status,
            created_by_user_id
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15
          )
          returning *
        `,
        [
          input.accountId,
          input.encounterId ?? null,
          input.stayId ?? null,
          input.patientId,
          input.medicationName,
          input.doseValue,
          input.doseUnit,
          input.route,
          input.frequencyType,
          input.prescriptionText ?? null,
          input.durationValue ?? null,
          input.durationUnit ?? null,
          input.startAt,
          input.endAt ?? null,
          input.createdByUserId
        ]
      );

      return mapMedicationOrderRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, orderId: string): Promise<MedicationOrderRecord | null> {
      const queryResult = await db.$client.query(
        `
          select *
          from medication_orders
          where id = $1 and account_id = $2
          limit 1
        `,
        [orderId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapMedicationOrderRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(input: UpdateMedicationOrderInput): Promise<MedicationOrderRecord | null> {
      const fields: string[] = [];
      const values: Array<string | number | null> = [];
      let index = 1;

      if (input.patch.doseValue !== undefined) {
        fields.push(`dose_value = $${index++}`);
        values.push(input.patch.doseValue);
      }

      if (input.patch.doseUnit !== undefined) {
        fields.push(`dose_unit = $${index++}`);
        values.push(input.patch.doseUnit);
      }

      if (input.patch.route !== undefined) {
        fields.push(`route = $${index++}`);
        values.push(input.patch.route);
      }

      if (input.patch.frequencyType !== undefined) {
        fields.push(`frequency_type = $${index++}`);
        values.push(input.patch.frequencyType);
      }

      if (input.patch.prescriptionText !== undefined) {
        fields.push(`prescription_text = $${index++}`);
        values.push(input.patch.prescriptionText ?? null);
      }

      if (input.patch.durationValue !== undefined) {
        fields.push(`duration_value = $${index++}`);
        values.push(input.patch.durationValue ?? null);
      }

      if (input.patch.durationUnit !== undefined) {
        fields.push(`duration_unit = $${index++}`);
        values.push(input.patch.durationUnit ?? null);
      }

      if (input.patch.endAt !== undefined) {
        fields.push(`end_at = $${index++}`);
        values.push(input.patch.endAt ?? null);
      }

      if (fields.length === 0) {
        return this.findById(input.accountId, input.orderId);
      }

      fields.push('updated_at = now()');
      values.push(input.orderId, input.accountId);

      const queryResult = await db.$client.query(
        `
          update medication_orders
          set ${fields.join(', ')}
          where id = $${index++}
            and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapMedicationOrderRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async stopById(input: StopMedicationOrderInput): Promise<MedicationOrderRecord | null> {
      const queryResult = await db.$client.query(
        `
          update medication_orders
          set
            status = 'stopped',
            stop_reason = $1,
            stopped_by_user_id = $2,
            end_at = coalesce(end_at, now()),
            updated_at = now()
          where id = $3
            and account_id = $4
            and status = 'active'
          returning *
        `,
        [input.stopReason, input.stoppedByUserId, input.orderId, input.accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapMedicationOrderRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListMedicationOrdersInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.encounterId) {
        whereParts.push(`encounter_id = $${index}`);
        values.push(input.encounterId);
        index += 1;
      }

      if (input.stayId) {
        whereParts.push(`stay_id = $${index}`);
        values.push(input.stayId);
        index += 1;
      }

      if (input.status) {
        whereParts.push(`status = $${index}`);
        values.push(input.status);
        index += 1;
      }

      const whereClause = whereParts.join(' and ');
      const offset = (input.page - 1) * input.pageSize;

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from medication_orders
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(
          `
            select count(*)::int as total
            from medication_orders
            where ${whereClause}
          `,
          values
        )
      ]);

      return {
        data: rowsResult.rows.map((row) => mapMedicationOrderRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
