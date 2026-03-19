import type { PartnersQueryDto } from '@cvg-his/contracts';

type DbClient = typeof import('@cvg-his/db').db;

export function createPartnersRepo(db: DbClient) {
  return {
    // =====================
    // Partners CRUD
    // =====================

    async create(partner: {
      name: string;
      accountId: string;
      type?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      address?: string;
      discountPercent?: number;
      active?: boolean;
      notes?: string;
      metadata?: Record<string, unknown>;
      createdByUserId?: string;
    }): Promise<Record<string, unknown>> {
      const result = await db.$client.query(
        `INSERT INTO partners (
          name, account_id, type, contact_name, contact_phone, contact_email,
          address, discount_percent, active, notes, metadata, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          partner.name,
          partner.accountId,
          partner.type || 'pet_shop',
          partner.contactName || null,
          partner.contactPhone || null,
          partner.contactEmail || null,
          partner.address || null,
          String(partner.discountPercent || 0),
          partner.active !== undefined ? partner.active : true,
          partner.notes || null,
          JSON.stringify(partner.metadata || {}),
          partner.createdByUserId || null
        ]
      );
      return result.rows[0];
    },

    async getById(accountId: string, id: string): Promise<Record<string, unknown> | null> {
      const result = await db.$client.query(
        `SELECT * FROM partners WHERE account_id = $1 AND id = $2`,
        [accountId, id]
      );
      return result.rows[0] || null;
    },

    async list(accountId: string, query: PartnersQueryDto): Promise<{
      partners: Record<string, unknown>[];
      total: number;
    }> {
      let whereClause = 'WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let paramIndex = 2;

      if (query.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(query.type);
        paramIndex++;
      }

      if (query.active !== undefined) {
        whereClause += ` AND active = $${paramIndex}`;
        params.push(query.active);
        paramIndex++;
      }

      if (query.search) {
        whereClause += ` AND (
          name ILIKE $${paramIndex} OR
          contact_name ILIKE $${paramIndex} OR
          contact_email ILIKE $${paramIndex}
        )`;
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      const offset = (query.page - 1) * query.pageSize;

      const [partnersResult, totalResult] = await Promise.all([
        db.$client.query(
          `SELECT * FROM partners ${whereClause}
           ORDER BY name
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, query.pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM partners ${whereClause}`,
          params
        )
      ]);

      return {
        partners: partnersResult.rows,
        total: parseInt(totalResult.rows[0].count, 10)
      };
    },

    async update(accountId: string, id: string, updates: {
      name?: string;
      type?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      address?: string;
      discountPercent?: number;
      active?: boolean;
      notes?: string;
      metadata?: Record<string, unknown>;
    }): Promise<Record<string, unknown> | null> {
      const fields: string[] = [];
      const values: unknown[] = [accountId, id];
      let paramIndex = 3;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex}`);
        values.push(updates.name);
        paramIndex++;
      }
      if (updates.type !== undefined) {
        fields.push(`type = $${paramIndex}`);
        values.push(updates.type);
        paramIndex++;
      }
      if (updates.contactName !== undefined) {
        fields.push(`contact_name = $${paramIndex}`);
        values.push(updates.contactName);
        paramIndex++;
      }
      if (updates.contactPhone !== undefined) {
        fields.push(`contact_phone = $${paramIndex}`);
        values.push(updates.contactPhone);
        paramIndex++;
      }
      if (updates.contactEmail !== undefined) {
        fields.push(`contact_email = $${paramIndex}`);
        values.push(updates.contactEmail);
        paramIndex++;
      }
      if (updates.address !== undefined) {
        fields.push(`address = $${paramIndex}`);
        values.push(updates.address);
        paramIndex++;
      }
      if (updates.discountPercent !== undefined) {
        fields.push(`discount_percent = $${paramIndex}`);
        values.push(String(updates.discountPercent));
        paramIndex++;
      }
      if (updates.active !== undefined) {
        fields.push(`active = $${paramIndex}`);
        values.push(updates.active);
        paramIndex++;
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
      }
      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      fields.push(`updated_at = NOW()`);

      const result = await db.$client.query(
        `UPDATE partners SET ${fields.join(', ')}
         WHERE account_id = $1 AND id = $2
         RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },

    async delete(accountId: string, id: string): Promise<boolean> {
      const result = await db.$client.query(
        `DELETE FROM partners WHERE account_id = $1 AND id = $2`,
        [accountId, id]
      );
      return (result.rowCount ?? 0) > 0;
    },

    // =====================
    // Partner Patients CRUD
    // =====================

    async addPatientToPartner(partnerId: string, accountId: string, patient: {
      patientId: string;
      discountPercent?: number;
      notes?: string;
      metadata?: Record<string, unknown>;
      createdByUserId?: string;
    }): Promise<Record<string, unknown>> {
      const result = await db.$client.query(
        `INSERT INTO partner_patients (
          partner_id, patient_id, account_id, discount_percent, notes, metadata, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          partnerId,
          patient.patientId,
          accountId,
          String(patient.discountPercent || 0),
          patient.notes || null,
          JSON.stringify(patient.metadata || {}),
          patient.createdByUserId || null
        ]
      );
      return result.rows[0];
    },

    async getPartnerPatient(accountId: string, partnerId: string, patientId: string): Promise<Record<string, unknown> | null> {
      const result = await db.$client.query(
        `SELECT * FROM partner_patients
         WHERE account_id = $1 AND partner_id = $2 AND patient_id = $3`,
        [accountId, partnerId, patientId]
      );
      return result.rows[0] || null;
    },

    async listPartnerPatients(accountId: string, partnerId: string): Promise<Record<string, unknown>[]> {
      const result = await db.$client.query(
        `SELECT * FROM partner_patients
         WHERE account_id = $1 AND partner_id = $2
         ORDER BY created_at`,
        [accountId, partnerId]
      );
      return result.rows;
    },

    async removePatientFromPartner(accountId: string, partnerId: string, patientId: string): Promise<boolean> {
      const result = await db.$client.query(
        `DELETE FROM partner_patients
         WHERE account_id = $1 AND partner_id = $2 AND patient_id = $3`,
        [accountId, partnerId, patientId]
      );
      return (result.rowCount ?? 0) > 0;
    },

    // =====================
    // Reports
    // =====================

    async getPartnerStats(accountId: string, partnerId: string): Promise<{
      totalPatients: number;
      totalDiscount: number;
    }> {
      const result = await db.$client.query(
        `SELECT
          COUNT(*) as total_patients,
          COALESCE(SUM(discount_percent), 0) as total_discount
         FROM partner_patients
         WHERE account_id = $1 AND partner_id = $2`,
        [accountId, partnerId]
      );
      return {
        totalPatients: parseInt(result.rows[0].total_patients || 0, 10),
        totalDiscount: parseFloat(result.rows[0].total_discount || 0)
      };
    }
  };
}
