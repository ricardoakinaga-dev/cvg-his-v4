export type ProtocolReferenceType = 'qdrant_chunk' | 'url' | 'pdf' | 'doi' | 'book';

export type ProtocolReferenceRecord = {
  id: string;
  accountId: string;
  protocolId: string;
  refType: ProtocolReferenceType;
  title: string | null;
  url: string | null;
  sourceId: string | null;
  score: number | null;
  metadataJson: Record<string, unknown> | null;
  createdByUserId: string;
  createdAt: Date;
};

type DbClient = typeof import('@cvg-his/db').db;

type CreateReferenceInput = {
  accountId: string;
  protocolId: string;
  refType: ProtocolReferenceType;
  title?: string;
  url?: string;
  sourceId?: string;
  score?: number;
  metadataJson?: Record<string, unknown>;
  createdByUserId: string;
};

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapRefType(value: unknown): ProtocolReferenceType {
  const raw = String(value);
  if (raw === 'url') {
    return 'url';
  }

  if (raw === 'pdf') {
    return 'pdf';
  }

  if (raw === 'doi') {
    return 'doi';
  }

  if (raw === 'book') {
    return 'book';
  }

  return 'qdrant_chunk';
}

function mapScore(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapReferenceRow(row: Record<string, unknown>): ProtocolReferenceRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    protocolId: String(row.protocol_id),
    refType: mapRefType(row.ref_type),
    title: row.title ? String(row.title) : null,
    url: row.url ? String(row.url) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    score: mapScore(row.score),
    metadataJson: asRecordOrNull(row.metadata_json),
    createdByUserId: String(row.created_by_user_id),
    createdAt: new Date(String(row.created_at))
  };
}

export type ProtocolReferencesRepo = {
  protocolExistsInAccount: (accountId: string, protocolId: string) => Promise<boolean>;
  listByProtocol: (accountId: string, protocolId: string) => Promise<ProtocolReferenceRecord[]>;
  create: (input: CreateReferenceInput) => Promise<ProtocolReferenceRecord>;
  findById: (
    accountId: string,
    protocolId: string,
    refId: string
  ) => Promise<ProtocolReferenceRecord | null>;
  deleteById: (
    accountId: string,
    protocolId: string,
    refId: string
  ) => Promise<ProtocolReferenceRecord | null>;
};

export function createProtocolReferencesRepo(db: DbClient): ProtocolReferencesRepo {
  return {
    async protocolExistsInAccount(accountId: string, protocolId: string): Promise<boolean> {
      const result = await db.$client.query(
        `
          select 1
          from protocols
          where id = $1
            and account_id = $2
          limit 1
        `,
        [protocolId, accountId]
      );

      return result.rows.length > 0;
    },

    async listByProtocol(accountId: string, protocolId: string): Promise<ProtocolReferenceRecord[]> {
      const result = await db.$client.query(
        `
          select *
          from protocol_references
          where account_id = $1
            and protocol_id = $2
          order by created_at desc
        `,
        [accountId, protocolId]
      );

      return result.rows.map((row) => mapReferenceRow(row as Record<string, unknown>));
    },

    async create(input: CreateReferenceInput): Promise<ProtocolReferenceRecord> {
      const result = await db.$client.query(
        `
          insert into protocol_references (
            account_id,
            protocol_id,
            ref_type,
            title,
            url,
            source_id,
            score,
            metadata_json,
            created_by_user_id
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
          returning *
        `,
        [
          input.accountId,
          input.protocolId,
          input.refType,
          input.title ?? null,
          input.url ?? null,
          input.sourceId ?? null,
          input.score ?? null,
          input.metadataJson ?? null,
          input.createdByUserId
        ]
      );

      return mapReferenceRow(result.rows[0] as Record<string, unknown>);
    },

    async findById(
      accountId: string,
      protocolId: string,
      refId: string
    ): Promise<ProtocolReferenceRecord | null> {
      const result = await db.$client.query(
        `
          select *
          from protocol_references
          where id = $1
            and account_id = $2
            and protocol_id = $3
          limit 1
        `,
        [refId, accountId, protocolId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapReferenceRow(result.rows[0] as Record<string, unknown>);
    },

    async deleteById(
      accountId: string,
      protocolId: string,
      refId: string
    ): Promise<ProtocolReferenceRecord | null> {
      const result = await db.$client.query(
        `
          delete from protocol_references
          where id = $1
            and account_id = $2
            and protocol_id = $3
          returning *
        `,
        [refId, accountId, protocolId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapReferenceRow(result.rows[0] as Record<string, unknown>);
    }
  };
}
