type DbClient = typeof import('@cvg-his/db').db;

export type MedicationScheduleType = 'interval' | 'fixed_times';

export type DueOrderScheduleRow = {
  scheduleId: string;
  orderId: string;
  accountId: string;
  stayId: string | null;
  wardId: string | null;
  encounterId: string | null;
  patientId: string;
  patientName: string;
  medicationName: string;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequencyType: string;
  orderStartAt: Date;
  orderEndAt: Date | null;
  scheduleType: MedicationScheduleType;
  intervalMinutes: number | null;
  times: string[] | null;
  nextDueAt: Date | null;
};

export type AdministrationWindowRow = {
  orderId: string;
  scheduledFor: Date;
  status: 'administered' | 'refused' | 'delayed' | 'held';
  delayedUntil: Date | null;
};

function mapScheduleType(value: unknown): MedicationScheduleType {
  return String(value) === 'fixed_times' ? 'fixed_times' : 'interval';
}

function mapTimes(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function mapDueOrderScheduleRow(row: Record<string, unknown>): DueOrderScheduleRow {
  return {
    scheduleId: String(row.schedule_id),
    orderId: String(row.order_id),
    accountId: String(row.account_id),
    stayId: row.stay_id ? String(row.stay_id) : null,
    wardId: row.ward_id ? String(row.ward_id) : null,
    encounterId: row.encounter_id ? String(row.encounter_id) : null,
    patientId: String(row.patient_id),
    patientName: String(row.patient_name),
    medicationName: String(row.medication_name),
    doseValue: String(row.dose_value),
    doseUnit: String(row.dose_unit),
    route: String(row.route),
    frequencyType: String(row.frequency_type),
    orderStartAt: new Date(String(row.start_at)),
    orderEndAt: row.end_at ? new Date(String(row.end_at)) : null,
    scheduleType: mapScheduleType(row.schedule_type),
    intervalMinutes:
      row.interval_minutes === null || row.interval_minutes === undefined
        ? null
        : Number(row.interval_minutes),
    times: mapTimes(row.times_json),
    nextDueAt: row.next_due_at ? new Date(String(row.next_due_at)) : null
  };
}

export type MedicationDosesRepo = {
  listActiveOrderSchedules: (accountId: string, stayId?: string) => Promise<DueOrderScheduleRow[]>;
  listLastScheduledForByOrderIds: (accountId: string, orderIds: string[]) => Promise<Map<string, Date>>;
  listAdministrationRowsInWindow: (
    accountId: string,
    orderIds: string[],
    from: Date,
    to: Date
  ) => Promise<AdministrationWindowRow[]>;
  updateScheduleNextDueAt: (accountId: string, scheduleId: string, nextDueAt: Date | null) => Promise<void>;
};

function mapAdministrationStatus(value: unknown): AdministrationWindowRow['status'] {
  const raw = String(value);
  if (raw === 'refused') {
    return 'refused';
  }

  if (raw === 'delayed') {
    return 'delayed';
  }

  if (raw === 'held') {
    return 'held';
  }

  return 'administered';
}

export function createMedicationDosesRepo(db: DbClient): MedicationDosesRepo {
  return {
    async listActiveOrderSchedules(accountId: string, stayId?: string): Promise<DueOrderScheduleRow[]> {
      const values: string[] = [accountId];
      let filter = '';

      if (stayId) {
        values.push(stayId);
        filter = 'and mo.stay_id = $2';
      }

      const queryResult = await db.$client.query(
        `
          select
            mos.id as schedule_id,
            mo.id as order_id,
            mo.account_id,
            mo.stay_id,
            ist.ward_id,
            mo.encounter_id,
            mo.patient_id,
            p.name as patient_name,
            mo.medication_name,
            mo.dose_value,
            mo.dose_unit,
            mo.route,
            mo.frequency_type,
            mo.start_at,
            mo.end_at,
            mos.schedule_type,
            mos.interval_minutes,
            mos.times_json,
            mos.next_due_at
          from medication_orders mo
          left join inpatient_stays ist
            on ist.id = mo.stay_id
           and ist.account_id = mo.account_id
          join lateral (
            select *
            from medication_order_schedules inner_mos
            where inner_mos.account_id = mo.account_id
              and inner_mos.order_id = mo.id
            order by inner_mos.updated_at desc, inner_mos.created_at desc
            limit 1
          ) mos on true
          join patients p
            on p.id = mo.patient_id
           and p.account_id = mo.account_id
          where mo.account_id = $1
            and mo.status = 'active'
            ${filter}
          order by mos.next_due_at asc nulls last, mos.created_at asc
        `,
        values
      );

      return queryResult.rows.map((row) => mapDueOrderScheduleRow(row as Record<string, unknown>));
    },

    async listLastScheduledForByOrderIds(accountId: string, orderIds: string[]): Promise<Map<string, Date>> {
      if (orderIds.length === 0) {
        return new Map();
      }

      const queryResult = await db.$client.query(
        `
          select
            order_id,
            max(scheduled_for) as last_scheduled_for
          from medication_administrations
          where account_id = $1
            and order_id = any($2::uuid[])
            and status = 'administered'
          group by order_id
        `,
        [accountId, orderIds]
      );

      const output = new Map<string, Date>();
      for (const row of queryResult.rows) {
        const casted = row as Record<string, unknown>;
        if (!casted.order_id || !casted.last_scheduled_for) {
          continue;
        }

        output.set(String(casted.order_id), new Date(String(casted.last_scheduled_for)));
      }

      return output;
    },

    async listAdministrationRowsInWindow(
      accountId: string,
      orderIds: string[],
      from: Date,
      to: Date
    ): Promise<AdministrationWindowRow[]> {
      if (orderIds.length === 0) {
        return [];
      }

      const queryResult = await db.$client.query(
        `
          select
            order_id,
            scheduled_for,
            status,
            delayed_until
          from medication_administrations
          where account_id = $1
            and order_id = any($2::uuid[])
            and (
              scheduled_for between $3 and $4
              or (status = 'delayed' and delayed_until between $3 and $4)
            )
        `,
        [accountId, orderIds, from, to]
      );

      return queryResult.rows.map((row) => {
        const casted = row as Record<string, unknown>;
        return {
          orderId: String(casted.order_id),
          scheduledFor: new Date(String(casted.scheduled_for)),
          status: mapAdministrationStatus(casted.status),
          delayedUntil: casted.delayed_until ? new Date(String(casted.delayed_until)) : null
        };
      });
    },

    async updateScheduleNextDueAt(accountId: string, scheduleId: string, nextDueAt: Date | null): Promise<void> {
      await db.$client.query(
        `
          update medication_order_schedules
          set
            next_due_at = $1,
            updated_at = now()
          where id = $2 and account_id = $3
        `,
        [nextDueAt, scheduleId, accountId]
      );
    }
  };
}
