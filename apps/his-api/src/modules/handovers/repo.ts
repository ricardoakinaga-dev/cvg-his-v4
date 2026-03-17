import type { ShiftPeriod } from '@cvg-his/domain';

type DbClient = typeof import('@cvg-his/db').db;

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

export type HandoverStatus = 'draft' | 'published';
export type HandoverBuildStatus = 'pending' | 'building' | 'ready' | 'failed';

export type HandoverRecord = {
  id: string;
  accountId: string;
  wardId: string;
  status: HandoverStatus;
  shiftDate: string;
  shiftPeriod: ShiftPeriod;
  publishedAt: Date | null;
  publishedByUserId: string | null;
  buildStatus: HandoverBuildStatus;
  buildError: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HandoverItemRecord = {
  id: string;
  accountId: string;
  handoverId: string;
  stayId: string;
  patientSnapshotJson: Record<string, unknown>;
  problemsJson: unknown[];
  planJson: unknown[];
  criticalMedsJson: unknown[];
  alertsJson: Record<string, unknown>;
  pendingJson: unknown[];
  escalationJson: Record<string, unknown>;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HandoverWithItems = {
  handover: HandoverRecord;
  items: HandoverItemRecord[];
};

export type HandoverDocumentRecord = {
  id: string;
  accountId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: Date;
};

export type InpatientStayReference = {
  stayId: string;
  wardId: string;
  patientId: string;
  ownerId: string;
  patientName: string;
  species: string;
};

type DraftItemInsert = {
  stayId: string;
  patientSnapshotJson: Record<string, unknown>;
  problemsJson: unknown[];
  planJson: unknown[];
  criticalMedsJson: unknown[];
  alertsJson: Record<string, unknown>;
  pendingJson: unknown[];
  escalationJson: Record<string, unknown>;
  notes?: string;
};

type CreateDraftInput = {
  accountId: string;
  wardId: string;
  shiftDate: string;
  shiftPeriod: ShiftPeriod;
  items: DraftItemInsert[];
};

type PublishInput = {
  accountId: string;
  handoverId: string;
  publishedByUserId: string;
};

type MarkBuildFailedInput = {
  accountId: string;
  handoverId: string;
  buildError: string;
};

type MarkBuildPendingForRetryInput = {
  accountId: string;
  handoverId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapShiftPeriod(value: unknown): ShiftPeriod {
  const raw = String(value);
  if (raw === 'night' || raw === 'custom') {
    return raw;
  }

  return 'day';
}

function mapHandoverStatus(value: unknown): HandoverStatus {
  return String(value) === 'published' ? 'published' : 'draft';
}

function mapBuildStatus(value: unknown): HandoverBuildStatus {
  const raw = String(value);
  if (raw === 'building' || raw === 'ready' || raw === 'failed') {
    return raw;
  }

  return 'pending';
}

function mapShiftDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function mapHandoverRow(row: Record<string, unknown>): HandoverRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    wardId: String(row.ward_id),
    status: mapHandoverStatus(row.status),
    shiftDate: mapShiftDate(row.shift_date),
    shiftPeriod: mapShiftPeriod(row.shift_period),
    publishedAt: row.published_at ? new Date(String(row.published_at)) : null,
    publishedByUserId: row.published_by_user_id ? String(row.published_by_user_id) : null,
    buildStatus: mapBuildStatus(row.build_status),
    buildError: row.build_error ? String(row.build_error) : null,
    documentId: row.document_id ? String(row.document_id) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function mapHandoverItemRow(row: Record<string, unknown>): HandoverItemRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    handoverId: String(row.handover_id),
    stayId: String(row.stay_id),
    patientSnapshotJson: asRecord(row.patient_snapshot_json),
    problemsJson: asArray(row.problems_json),
    planJson: asArray(row.plan_json),
    criticalMedsJson: asArray(row.critical_meds_json),
    alertsJson: asRecord(row.alerts_json),
    pendingJson: asArray(row.pending_json),
    escalationJson: asRecord(row.escalation_json),
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

async function queryHandoverById(
  queryable: Queryable,
  accountId: string,
  handoverId: string
): Promise<HandoverRecord | null> {
  const result = await queryable.query(
    `
      select *
      from shift_handovers
      where id = $1 and account_id = $2
      limit 1
    `,
    [handoverId, accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapHandoverRow(result.rows[0] as Record<string, unknown>);
}

async function queryHandoverItems(
  queryable: Queryable,
  accountId: string,
  handoverId: string
): Promise<HandoverItemRecord[]> {
  const result = await queryable.query(
    `
      select *
      from shift_handover_items
      where handover_id = $1 and account_id = $2
      order by created_at asc
    `,
    [handoverId, accountId]
  );

  return result.rows.map((row) => mapHandoverItemRow(row as Record<string, unknown>));
}

export type HandoversRepo = {
  wardExistsInAccount: (accountId: string, wardId: string) => Promise<boolean>;
  findStaysByIds: (accountId: string, stayIds: string[]) => Promise<InpatientStayReference[]>;
  createDraft: (input: CreateDraftInput) => Promise<HandoverWithItems>;
  findById: (accountId: string, handoverId: string) => Promise<HandoverWithItems | null>;
  publish: (input: PublishInput) => Promise<HandoverRecord | null>;
  markBuildPendingForRetry: (input: MarkBuildPendingForRetryInput) => Promise<HandoverRecord | null>;
  markBuildFailed: (input: MarkBuildFailedInput) => Promise<HandoverRecord | null>;
  findLatestPublished: (accountId: string, wardId: string) => Promise<HandoverWithItems | null>;
  findDocumentByHandoverId: (
    accountId: string,
    handoverId: string
  ) => Promise<HandoverDocumentRecord | null>;
};

export function createHandoversRepo(db: DbClient): HandoversRepo {
  return {
    async wardExistsInAccount(accountId: string, wardId: string): Promise<boolean> {
      const result = await db.$client.query(
        `
          select 1
          from wards
          where id = $1 and account_id = $2 and is_active = true
          limit 1
        `,
        [wardId, accountId]
      );

      return result.rows.length > 0;
    },

    async findStaysByIds(accountId: string, stayIds: string[]): Promise<InpatientStayReference[]> {
      if (stayIds.length === 0) {
        return [];
      }

      const result = await db.$client.query(
        `
          select
            s.id as stay_id,
            s.ward_id,
            s.patient_id,
            s.owner_id,
            p.name as patient_name,
            p.species
          from inpatient_stays s
          join patients p
            on p.id = s.patient_id
           and p.account_id = s.account_id
          where s.account_id = $1
            and s.status = 'active'
            and s.id = any($2::uuid[])
        `,
        [accountId, stayIds]
      );

      return result.rows.map((row) => {
        const mapped = row as Record<string, unknown>;

        return {
          stayId: String(mapped.stay_id),
          wardId: String(mapped.ward_id),
          patientId: String(mapped.patient_id),
          ownerId: String(mapped.owner_id),
          patientName: String(mapped.patient_name),
          species: String(mapped.species)
        };
      });
    },

    async createDraft(input: CreateDraftInput): Promise<HandoverWithItems> {
      const client = await db.$client.connect();

      try {
        await client.query('begin');

        const handoverInsertResult = await client.query(
          `
            insert into shift_handovers (
              account_id,
              ward_id,
              status,
              shift_date,
              shift_period
            ) values ($1, $2, 'draft', $3, $4)
            returning *
          `,
          [input.accountId, input.wardId, input.shiftDate, input.shiftPeriod]
        );

        const handoverRow = handoverInsertResult.rows[0] as Record<string, unknown>;
        const handoverId = String(handoverRow.id);

        for (const item of input.items) {
          await client.query(
            `
              insert into shift_handover_items (
                account_id,
                handover_id,
                stay_id,
                patient_snapshot_json,
                problems_json,
                plan_json,
                critical_meds_json,
                alerts_json,
                pending_json,
                escalation_json,
                notes
              ) values (
                $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11
              )
            `,
            [
              input.accountId,
              handoverId,
              item.stayId,
              JSON.stringify(item.patientSnapshotJson),
              JSON.stringify(item.problemsJson),
              JSON.stringify(item.planJson),
              JSON.stringify(item.criticalMedsJson),
              JSON.stringify(item.alertsJson),
              JSON.stringify(item.pendingJson),
              JSON.stringify(item.escalationJson),
              item.notes ?? null
            ]
          );
        }

        const handover = mapHandoverRow(handoverRow);
        const items = await queryHandoverItems(client, input.accountId, handoverId);

        await client.query('commit');
        return {
          handover,
          items
        };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async findById(accountId: string, handoverId: string): Promise<HandoverWithItems | null> {
      const handover = await queryHandoverById(db.$client, accountId, handoverId);

      if (!handover) {
        return null;
      }

      const items = await queryHandoverItems(db.$client, accountId, handoverId);
      return {
        handover,
        items
      };
    },

    async publish(input: PublishInput): Promise<HandoverRecord | null> {
      const result = await db.$client.query(
        `
          update shift_handovers
          set
            status = 'published',
            published_at = now(),
            published_by_user_id = $1,
            build_status = 'pending',
            build_error = null,
            updated_at = now()
          where id = $2
            and account_id = $3
            and status = 'draft'
          returning *
        `,
        [input.publishedByUserId, input.handoverId, input.accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapHandoverRow(result.rows[0] as Record<string, unknown>);
    },

    async markBuildPendingForRetry(input: MarkBuildPendingForRetryInput): Promise<HandoverRecord | null> {
      const result = await db.$client.query(
        `
          update shift_handovers
          set
            build_status = 'pending',
            build_error = null,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'published'
            and build_status = 'failed'
          returning *
        `,
        [input.handoverId, input.accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapHandoverRow(result.rows[0] as Record<string, unknown>);
    },

    async markBuildFailed(input: MarkBuildFailedInput): Promise<HandoverRecord | null> {
      const result = await db.$client.query(
        `
          update shift_handovers
          set
            build_status = 'failed',
            build_error = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'published'
          returning *
        `,
        [input.handoverId, input.accountId, input.buildError]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapHandoverRow(result.rows[0] as Record<string, unknown>);
    },

    async findLatestPublished(accountId: string, wardId: string): Promise<HandoverWithItems | null> {
      const result = await db.$client.query(
        `
          select *
          from shift_handovers
          where account_id = $1
            and ward_id = $2
            and status = 'published'
          order by shift_date desc, published_at desc nulls last, created_at desc
          limit 1
        `,
        [accountId, wardId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const handover = mapHandoverRow(result.rows[0] as Record<string, unknown>);
      const items = await queryHandoverItems(db.$client, accountId, handover.id);

      return {
        handover,
        items
      };
    },

    async findDocumentByHandoverId(
      accountId: string,
      handoverId: string
    ): Promise<HandoverDocumentRecord | null> {
      const result = await db.$client.query(
        `
          select
            d.id,
            d.account_id,
            d.storage_key,
            d.filename,
            d.mime_type,
            d.size_bytes,
            d.created_by_user_id,
            d.created_at
          from shift_handovers h
          join documents d
            on d.id = h.document_id
          where h.id = $1
            and h.account_id = $2
            and d.account_id = $2
          limit 1
        `,
        [handoverId, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as Record<string, unknown>;

      return {
        id: String(row.id),
        accountId: String(row.account_id),
        storageKey: String(row.storage_key),
        filename: String(row.filename),
        mimeType: String(row.mime_type),
        sizeBytes: Number(row.size_bytes),
        createdByUserId: String(row.created_by_user_id),
        createdAt: new Date(String(row.created_at))
      };
    }
  };
}
