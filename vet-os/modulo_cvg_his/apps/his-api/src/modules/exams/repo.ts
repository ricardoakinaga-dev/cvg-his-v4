import type { ExamOrderRecord, ExamResultRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

function mapExamOrderRow(r: Record<string, unknown>): ExamOrderRecord {
  return {
    id: String(r.id), accountId: String(r.account_id), patientId: String(r.patient_id),
    encounterId: r.encounter_id ? String(r.encounter_id) : null,
    requestedByUserId: String(r.requested_by_user_id), category: String(r.category),
    examName: String(r.exam_name), examCode: r.exam_code ? String(r.exam_code) : null,
    priority: String(r.priority), status: String(r.status), notes: r.notes ? String(r.notes) : null,
    requestedAt: new Date(String(r.requested_at)), completedAt: r.completed_at ? new Date(String(r.completed_at)) : null,
    createdAt: new Date(String(r.created_at)), updatedAt: new Date(String(r.updated_at))
  };
}

function mapExamResultRow(r: Record<string, unknown>): ExamResultRecord {
  return {
    id: String(r.id), accountId: String(r.account_id), patientId: String(r.patient_id),
    examOrderId: String(r.exam_order_id), category: String(r.category),
    examName: String(r.exam_name), examCode: r.exam_code ? String(r.exam_code) : null,
    requestedAt: new Date(String(r.requested_at)), status: String(r.status),
    findings: r.findings ? String(r.findings) : null, interpretation: r.interpretation ? String(r.interpretation) : null,
    resultValues: r.result_values ? String(r.result_values) : null, normalRange: r.normal_range ? String(r.normal_range) : null,
    performedByUserId: r.performed_by_user_id ? String(r.performed_by_user_id) : null,
    performedAt: r.performed_at ? new Date(String(r.performed_at)) : null,
    reviewedByUserId: r.reviewed_by_user_id ? String(r.reviewed_by_user_id) : null,
    reviewedAt: r.reviewed_at ? new Date(String(r.reviewed_at)) : null,
    releasedAt: r.released_at ? new Date(String(r.released_at)) : null,
    notes: r.notes ? String(r.notes) : null,
    createdAt: new Date(String(r.created_at)), updatedAt: new Date(String(r.updated_at))
  };
}

export function createExamOrdersRepo(db: DbClient) {
  return {
    async create(input: { accountId: string; patientId: string; encounterId?: string | null; requestedByUserId: string; category: string; examName: string; examCode?: string | null; priority?: string; notes?: string | null }): Promise<ExamOrderRecord> {
      const r = await db.$client.query(
        `insert into exam_orders (account_id, patient_id, encounter_id, requested_by_user_id, category, exam_name, exam_code, priority, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [input.accountId, input.patientId, input.encounterId ?? null, input.requestedByUserId, input.category, input.examName, input.examCode ?? null, input.priority ?? 'routine', input.notes ?? null]
      );
      return mapExamOrderRow(r.rows[0]);
    },
    async findById(accountId: string, id: string): Promise<ExamOrderRecord | null> {
      const r = await db.$client.query('select * from exam_orders where id=$1 and account_id=$2 limit 1', [id, accountId]);
      return r.rows.length ? mapExamOrderRow(r.rows[0]) : null;
    },
    async list(input: { accountId: string; page: number; pageSize: number; q?: string; patientId?: string; encounterId?: string; status?: string; category?: string; dateFrom?: Date; dateTo?: Date }) {
      const where = ['account_id=$1']; const values: any[] = [input.accountId]; let i = 2;
      if (input.patientId) { where.push(`patient_id=$${i++}`); values.push(input.patientId); }
      if (input.encounterId) { where.push(`encounter_id=$${i++}`); values.push(input.encounterId); }
      if (input.status) { where.push(`status=$${i++}`); values.push(input.status); }
      if (input.category) { where.push(`category=$${i++}`); values.push(input.category); }
      if (input.dateFrom) { where.push(`requested_at>=$${i++}`); values.push(input.dateFrom); }
      if (input.dateTo) { where.push(`requested_at<=$${i++}`); values.push(input.dateTo); }
      if (input.q) { where.push(`(exam_name ilike $${i} or exam_code ilike $${i} or notes ilike $${i})`); values.push(`%${input.q}%`); i++; }
      const offset = (input.page - 1) * input.pageSize; const wc = where.join(' and ');
      const [rows, total] = await Promise.all([
        db.$client.query(`select * from exam_orders where ${wc} order by requested_at desc limit $${i} offset $${i + 1}`, [...values, input.pageSize, offset]),
        db.$client.query(`select count(*)::int as total from exam_orders where ${wc}`, values)
      ]);
      return { data: rows.rows.map(mapExamOrderRow), page: input.page, pageSize: input.pageSize, total: Number(total.rows[0]?.total ?? 0) };
    },
    async updateById(accountId: string, id: string, patch: { status?: string; priority?: string; notes?: string | null; completedAt?: Date | null }): Promise<ExamOrderRecord | null> {
      const fields: string[] = []; const values: any[] = []; let i = 1;
      if (patch.status) { fields.push(`status=$${i++}`); values.push(patch.status); if (patch.status === 'completed') { fields.push(`completed_at=now()`); } }
      if (patch.priority) { fields.push(`priority=$${i++}`); values.push(patch.priority); }
      if (patch.notes !== undefined) { fields.push(`notes=$${i++}`); values.push(patch.notes); }
      if (!fields.length) return this.findById(accountId, id);
      fields.push('updated_at=now()'); values.push(id, accountId);
      const r = await db.$client.query(`update exam_orders set ${fields.join(', ')} where id=$${i++} and account_id=$${i} returning *`, values);
      return r.rows.length ? mapExamOrderRow(r.rows[0]) : null;
    }
  };
}

export function createExamResultsRepo(db: DbClient) {
  return {
    async create(input: { accountId: string; patientId: string; examOrderId: string; category: string; examName: string; examCode?: string | null; requestedAt: Date; findings?: string | null; interpretation?: string | null; resultValues?: string | null; normalRange?: string | null; notes?: string | null }): Promise<ExamResultRecord> {
      const r = await db.$client.query(
        `insert into exam_results (account_id, patient_id, exam_order_id, category, exam_name, exam_code, requested_at, findings, interpretation, result_values, normal_range, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
        [input.accountId, input.patientId, input.examOrderId, input.category, input.examName, input.examCode ?? null, input.requestedAt, input.findings ?? null, input.interpretation ?? null, input.resultValues ?? null, input.normalRange ?? null, input.notes ?? null]
      );
      return mapExamResultRow(r.rows[0]);
    },
    async findById(accountId: string, id: string): Promise<ExamResultRecord | null> {
      const r = await db.$client.query('select * from exam_results where id=$1 and account_id=$2 limit 1', [id, accountId]);
      return r.rows.length ? mapExamResultRow(r.rows[0]) : null;
    },
    async list(input: { accountId: string; page: number; pageSize: number; q?: string; patientId?: string; examOrderId?: string; status?: string; category?: string }) {
      const where = ['account_id=$1']; const values: any[] = [input.accountId]; let i = 2;
      if (input.patientId) { where.push(`patient_id=$${i++}`); values.push(input.patientId); }
      if (input.examOrderId) { where.push(`exam_order_id=$${i++}`); values.push(input.examOrderId); }
      if (input.status) { where.push(`status=$${i++}`); values.push(input.status); }
      if (input.category) { where.push(`category=$${i++}`); values.push(input.category); }
      if (input.q) { where.push(`(exam_name ilike $${i} or findings ilike $${i} or interpretation ilike $${i})`); values.push(`%${input.q}%`); i++; }
      const offset = (input.page - 1) * input.pageSize; const wc = where.join(' and ');
      const [rows, total] = await Promise.all([
        db.$client.query(`select * from exam_results where ${wc} order by requested_at desc limit $${i} offset $${i + 1}`, [...values, input.pageSize, offset]),
        db.$client.query(`select count(*)::int as total from exam_results where ${wc}`, values)
      ]);
      return { data: rows.rows.map(mapExamResultRow), page: input.page, pageSize: input.pageSize, total: Number(total.rows[0]?.total ?? 0) };
    },
    async updateById(accountId: string, id: string, patch: Record<string, any>): Promise<ExamResultRecord | null> {
      const fields: string[] = []; const values: any[] = []; let i = 1;
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col}=$${i++}`); values.push(value);
      }
      if (!fields.length) return this.findById(accountId, id);
      fields.push('updated_at=now()'); values.push(id, accountId);
      const r = await db.$client.query(`update exam_results set ${fields.join(', ')} where id=$${i++} and account_id=$${i} returning *`, values);
      return r.rows.length ? mapExamResultRow(r.rows[0]) : null;
    }
  };
}
