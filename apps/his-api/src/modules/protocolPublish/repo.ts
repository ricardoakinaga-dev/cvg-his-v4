type DbClient = typeof import('@cvg-his/db').db;

export type ProtocolVersionStatus = 'draft' | 'publishing' | 'published' | 'failed';

export type ProtocolVersionPublishRecord = {
  id: string;
  accountId: string;
  protocolId: string;
  versionNumber: number;
  status: ProtocolVersionStatus;
  contentJson: Record<string, unknown>;
  changeReason: string | null;
  publishedAt: Date | null;
  publishedByUserId: string | null;
  buildError: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MarkPublishingInput = {
  accountId: string;
  versionId: string;
  updatedByUserId: string;
};

type MarkFailedInput = {
  accountId: string;
  versionId: string;
  updatedByUserId: string;
  buildError: string;
};

function mapStatus(value: unknown): ProtocolVersionStatus {
  const raw = String(value);
  if (raw === 'published') {
    return 'published';
  }

  if (raw === 'publishing') {
    return 'publishing';
  }

  if (raw === 'failed') {
    return 'failed';
  }

  return 'draft';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapVersionRow(row: Record<string, unknown>): ProtocolVersionPublishRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    protocolId: String(row.protocol_id),
    versionNumber: Number(row.version_number),
    status: mapStatus(row.status),
    contentJson: asRecord(row.content_json),
    changeReason: row.change_reason ? String(row.change_reason) : null,
    publishedAt: row.published_at ? new Date(String(row.published_at)) : null,
    publishedByUserId: row.published_by_user_id ? String(row.published_by_user_id) : null,
    buildError: row.build_error ? String(row.build_error) : null,
    createdByUserId: String(row.created_by_user_id),
    updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export type ProtocolPublishRepo = {
  findVersionById: (accountId: string, versionId: string) => Promise<ProtocolVersionPublishRecord | null>;
  markPublishing: (input: MarkPublishingInput) => Promise<ProtocolVersionPublishRecord | null>;
  markFailed: (input: MarkFailedInput) => Promise<ProtocolVersionPublishRecord | null>;
};

export function createProtocolPublishRepo(db: DbClient): ProtocolPublishRepo {
  return {
    async findVersionById(accountId: string, versionId: string): Promise<ProtocolVersionPublishRecord | null> {
      const result = await db.$client.query(
        `
          select *
          from protocol_versions
          where id = $1
            and account_id = $2
          limit 1
        `,
        [versionId, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapVersionRow(result.rows[0] as Record<string, unknown>);
    },

    async markPublishing(input: MarkPublishingInput): Promise<ProtocolVersionPublishRecord | null> {
      const result = await db.$client.query(
        `
          update protocol_versions
          set
            status = 'publishing',
            build_error = null,
            updated_by_user_id = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status in ('draft', 'failed')
          returning *
        `,
        [input.versionId, input.accountId, input.updatedByUserId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapVersionRow(result.rows[0] as Record<string, unknown>);
    },

    async markFailed(input: MarkFailedInput): Promise<ProtocolVersionPublishRecord | null> {
      const result = await db.$client.query(
        `
          update protocol_versions
          set
            status = 'failed',
            build_error = $4,
            updated_by_user_id = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'publishing'
          returning *
        `,
        [input.versionId, input.accountId, input.updatedByUserId, input.buildError]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapVersionRow(result.rows[0] as Record<string, unknown>);
    }
  };
}
