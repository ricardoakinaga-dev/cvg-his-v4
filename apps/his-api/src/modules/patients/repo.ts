import type { AlertDto } from '@cvg-his/domain';

import type { CreatePatientBody, PatientRecord, UpdatePatientBody } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreatePatientInput = CreatePatientBody & {
  accountId: string;
  unitId?: string | null;
};

type ListPatientsInput = {
  accountId: string;
  page: number;
  pageSize: number;
  ownerId?: string;
  species?: string;
  q?: string;
};

function mapPatientRow(row: Record<string, unknown>): PatientRecord {
  const alertsJson = row.alerts_json;

  return {
    id: String(row.id),
    accountId: String(row.account_id),
    unitId: row.unit_id ? String(row.unit_id) : null,
    ownerId: String(row.owner_id),
    name: String(row.name),
    species: String(row.species),
    breed: row.breed ? String(row.breed) : null,
    sex: row.sex ? String(row.sex) : null,
    birthDate: row.birth_date ? String(row.birth_date) : null,
    weightKg: row.weight_kg ? String(row.weight_kg) : null,
    microchip: row.microchip ? String(row.microchip) : null,
    alerts:
      typeof alertsJson === 'object' && alertsJson !== null ? (alertsJson as AlertDto) : {},
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export function createPatientsRepo(db: DbClient) {
  return {
    async ownerExistsInAccount(accountId: string, ownerId: string): Promise<boolean> {
      const queryResult = await db.$client.query(
        'select 1 from owners where id = $1 and account_id = $2 limit 1',
        [ownerId, accountId]
      );

      return queryResult.rows.length > 0;
    },

    async create(input: CreatePatientInput): Promise<PatientRecord> {
      const queryResult = await db.$client.query(
        `
          insert into patients (
            account_id,
            unit_id,
            owner_id,
            name,
            species,
            breed,
            sex,
            birth_date,
            weight_kg,
            microchip,
            alerts_json
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning *
        `,
        [
          input.accountId,
          input.unitId ?? null,
          input.ownerId,
          input.name,
          input.species,
          input.breed ?? null,
          input.sex ?? null,
          input.birthDate ?? null,
          input.weightKg ?? null,
          input.microchip ?? null,
          input.alerts ?? {}
        ]
      );

      return mapPatientRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, patientId: string): Promise<PatientRecord | null> {
      const queryResult = await db.$client.query(
        'select * from patients where id = $1 and account_id = $2 limit 1',
        [patientId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapPatientRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(
      accountId: string,
      patientId: string,
      patch: UpdatePatientBody
    ): Promise<PatientRecord | null> {
      const fields: string[] = [];
      const values: Array<string | number | AlertDto | null> = [];
      let index = 1;

      if (patch.ownerId !== undefined) {
        fields.push(`owner_id = $${index++}`);
        values.push(patch.ownerId);
      }

      if (patch.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(patch.name);
      }

      if (patch.species !== undefined) {
        fields.push(`species = $${index++}`);
        values.push(patch.species);
      }

      if (patch.breed !== undefined) {
        fields.push(`breed = $${index++}`);
        values.push(patch.breed);
      }

      if (patch.sex !== undefined) {
        fields.push(`sex = $${index++}`);
        values.push(patch.sex);
      }

      if (patch.birthDate !== undefined) {
        fields.push(`birth_date = $${index++}`);
        values.push(patch.birthDate);
      }

      if (patch.weightKg !== undefined) {
        fields.push(`weight_kg = $${index++}`);
        values.push(patch.weightKg);
      }

      if (patch.microchip !== undefined) {
        fields.push(`microchip = $${index++}`);
        values.push(patch.microchip);
      }

      if (patch.alerts !== undefined) {
        fields.push(`alerts_json = $${index++}`);
        values.push(patch.alerts);
      }

      if (fields.length === 0) {
        return this.findById(accountId, patientId);
      }

      fields.push('updated_at = now()');
      values.push(patientId, accountId);

      const queryResult = await db.$client.query(
        `
          update patients
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapPatientRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListPatientsInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.ownerId) {
        whereParts.push(`owner_id = $${index}`);
        values.push(input.ownerId);
        index += 1;
      }

      if (input.species) {
        whereParts.push(`species ilike $${index}`);
        values.push(input.species);
        index += 1;
      }

      if (input.q) {
        whereParts.push(`(name ilike $${index} or microchip ilike $${index})`);
        values.push(`%${input.q}%`);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from patients
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from patients where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapPatientRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
