type DbClient = typeof import('@cvg-his/db').db;

export type MedicationOrderStatus = 'active' | 'stopped';
export type MedicationScheduleType = 'interval' | 'fixed_times';

export type MedicationOrderForSchedule = {
  id: string;
  accountId: string;
  stayId: string | null;
  wardId: string | null;
  encounterId: string | null;
  patientId: string;
  status: MedicationOrderStatus;
  startAt: Date;
  endAt: Date | null;
};

export type MedicationScheduleRecord = {
  id: string;
  accountId: string;
  orderId: string;
  scheduleType: MedicationScheduleType;
  intervalMinutes: number | null;
  times: string[] | null;
  nextDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateScheduleInput = {
  accountId: string;
  orderId: string;
  scheduleType: MedicationScheduleType;
  intervalMinutes: number | null;
  times: string[] | null;
  nextDueAt: Date | null;
};

type UpdateScheduleInput = {
  accountId: string;
  orderId: string;
  scheduleType: MedicationScheduleType;
  intervalMinutes: number | null;
  times: string[] | null;
  nextDueAt: Date | null;
};

function mapOrderStatus(value: unknown): MedicationOrderStatus {
  return String(value) === 'stopped' ? 'stopped' : 'active';
}

function mapScheduleType(value: unknown): MedicationScheduleType {
  return String(value) === 'fixed_times' ? 'fixed_times' : 'interval';
}

function mapTimes(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function mapOrderRow(row: Record<string, unknown>): MedicationOrderForSchedule {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    stayId: row.stay_id ? String(row.stay_id) : null,
    wardId: row.ward_id ? String(row.ward_id) : null,
    encounterId: row.encounter_id ? String(row.encounter_id) : null,
    patientId: String(row.patient_id),
    status: mapOrderStatus(row.status),
    startAt: new Date(String(row.start_at)),
    endAt: row.end_at ? new Date(String(row.end_at)) : null
  };
}

function mapScheduleRow(row: Record<string, unknown>): MedicationScheduleRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    orderId: String(row.order_id),
    scheduleType: mapScheduleType(row.schedule_type),
    intervalMinutes:
      row.interval_minutes === null || row.interval_minutes === undefined
        ? null
        : Number(row.interval_minutes),
    times: mapTimes(row.times_json),
    nextDueAt: row.next_due_at ? new Date(String(row.next_due_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export type MedicationSchedulesRepo = {
  findOrderInAccount: (accountId: string, orderId: string) => Promise<MedicationOrderForSchedule | null>;
  findScheduleByOrderId: (accountId: string, orderId: string) => Promise<MedicationScheduleRecord | null>;
  findLastScheduledFor: (accountId: string, orderId: string) => Promise<Date | null>;
  createSchedule: (input: CreateScheduleInput) => Promise<MedicationScheduleRecord>;
  updateScheduleByOrderId: (input: UpdateScheduleInput) => Promise<MedicationScheduleRecord | null>;
};

export function createMedicationSchedulesRepo(db: DbClient): MedicationSchedulesRepo {
  return {
    async findOrderInAccount(
      accountId: string,
      orderId: string
    ): Promise<MedicationOrderForSchedule | null> {
      const queryResult = await db.$client.query(
        `
          select
            mo.id,
            mo.account_id,
            mo.stay_id,
            ist.ward_id,
            mo.encounter_id,
            mo.patient_id,
            mo.status,
            mo.start_at,
            mo.end_at
          from medication_orders mo
          left join inpatient_stays ist
            on ist.id = mo.stay_id
           and ist.account_id = mo.account_id
          where mo.id = $1 and mo.account_id = $2
          limit 1
        `,
        [orderId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapOrderRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findScheduleByOrderId(
      accountId: string,
      orderId: string
    ): Promise<MedicationScheduleRecord | null> {
      const queryResult = await db.$client.query(
        `
          select *
          from medication_order_schedules
          where account_id = $1 and order_id = $2
          limit 1
        `,
        [accountId, orderId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapScheduleRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findLastScheduledFor(accountId: string, orderId: string): Promise<Date | null> {
      const queryResult = await db.$client.query(
        `
          select max(scheduled_for) as last_scheduled_for
          from medication_administrations
          where account_id = $1 and order_id = $2
        `,
        [accountId, orderId]
      );

      const row = queryResult.rows[0] as Record<string, unknown> | undefined;
      const value = row?.last_scheduled_for;
      return value ? new Date(String(value)) : null;
    },

    async createSchedule(input: CreateScheduleInput): Promise<MedicationScheduleRecord> {
      const timesJson = input.scheduleType === 'fixed_times' ? input.times ?? null : null;
      const intervalMinutes = input.scheduleType === 'interval' ? input.intervalMinutes ?? null : null;

      const queryResult = await db.$client.query(
        `
          insert into medication_order_schedules (
            account_id,
            order_id,
            schedule_type,
            interval_minutes,
            times_json,
            next_due_at
          ) values ($1, $2, $3, $4, $5, $6)
          returning *
        `,
        [
          input.accountId,
          input.orderId,
          input.scheduleType,
          intervalMinutes,
          timesJson,
          input.nextDueAt
        ]
      );

      return mapScheduleRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateScheduleByOrderId(input: UpdateScheduleInput): Promise<MedicationScheduleRecord | null> {
      const timesJson = input.scheduleType === 'fixed_times' ? input.times ?? null : null;
      const intervalMinutes = input.scheduleType === 'interval' ? input.intervalMinutes ?? null : null;

      const queryResult = await db.$client.query(
        `
          update medication_order_schedules
          set
            schedule_type = $1,
            interval_minutes = $2,
            times_json = $3,
            next_due_at = $4,
            updated_at = now()
          where account_id = $5 and order_id = $6
          returning *
        `,
        [input.scheduleType, intervalMinutes, timesJson, input.nextDueAt, input.accountId, input.orderId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapScheduleRow(queryResult.rows[0] as Record<string, unknown>);
    }
  };
}
