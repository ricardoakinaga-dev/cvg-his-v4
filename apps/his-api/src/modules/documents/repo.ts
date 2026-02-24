import type { DocumentCreateDto } from '@cvg-his/domain';

type DbClient = typeof import('@cvg-his/db').db;

export type DocumentRecord = {
  id: string;
  accountId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: Date;
};

export type EncounterDocumentRecord = {
  id: string;
  encounterId: string;
  documentId: string;
  attachedByUserId: string;
  createdAt: Date;
};

export type AttachToEncounterResult = {
  relation: EncounterDocumentRecord;
  alreadyAttached: boolean;
};

export type DocumentsRepo = {
  create: (input: {
    accountId: string;
    storageKey: string;
    createdByUserId: string;
    payload: DocumentCreateDto;
  }) => Promise<DocumentRecord>;
  findById: (accountId: string, documentId: string) => Promise<DocumentRecord | null>;
  encounterExistsInAccount: (accountId: string, encounterId: string) => Promise<boolean>;
  attachToEncounter: (input: {
    accountId: string;
    encounterId: string;
    documentId: string;
    attachedByUserId: string;
  }) => Promise<AttachToEncounterResult | null>;
};

function mapDocumentRow(row: Record<string, unknown>): DocumentRecord {
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

function mapEncounterDocumentRow(row: Record<string, unknown>): EncounterDocumentRecord {
  return {
    id: String(row.id),
    encounterId: String(row.encounter_id),
    documentId: String(row.document_id),
    attachedByUserId: String(row.attached_by_user_id),
    createdAt: new Date(String(row.created_at))
  };
}

export function createDocumentsRepo(db: DbClient): DocumentsRepo {
  return {
    async create(input): Promise<DocumentRecord> {
      const result = await db.$client.query(
        `
          insert into documents (
            account_id,
            storage_key,
            filename,
            mime_type,
            size_bytes,
            created_by_user_id
          ) values ($1, $2, $3, $4, $5, $6)
          returning *
        `,
        [
          input.accountId,
          input.storageKey,
          input.payload.filename,
          input.payload.mimeType,
          input.payload.size,
          input.createdByUserId
        ]
      );

      return mapDocumentRow(result.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, documentId: string): Promise<DocumentRecord | null> {
      const result = await db.$client.query(
        `
          select *
          from documents
          where id = $1 and account_id = $2
          limit 1
        `,
        [documentId, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapDocumentRow(result.rows[0] as Record<string, unknown>);
    },

    async encounterExistsInAccount(accountId: string, encounterId: string): Promise<boolean> {
      const result = await db.$client.query(
        'select 1 from encounters where id = $1 and account_id = $2 limit 1',
        [encounterId, accountId]
      );

      return result.rows.length > 0;
    },

    async attachToEncounter(input): Promise<AttachToEncounterResult | null> {
      const insertResult = await db.$client.query(
        `
          insert into encounter_documents (
            encounter_id,
            document_id,
            attached_by_user_id
          )
          select e.id, d.id, $3
          from encounters e
          join documents d
            on d.id = $2 and d.account_id = $1
          where e.id = $4 and e.account_id = $1
          on conflict (encounter_id, document_id) do nothing
          returning *
        `,
        [input.accountId, input.documentId, input.attachedByUserId, input.encounterId]
      );

      if (insertResult.rows.length > 0) {
        return {
          relation: mapEncounterDocumentRow(insertResult.rows[0] as Record<string, unknown>),
          alreadyAttached: false
        };
      }

      const existingResult = await db.$client.query(
        `
          select ed.*
          from encounter_documents ed
          join encounters e
            on e.id = ed.encounter_id
          join documents d
            on d.id = ed.document_id
          where ed.encounter_id = $1
            and ed.document_id = $2
            and e.account_id = $3
            and d.account_id = $3
          limit 1
        `,
        [input.encounterId, input.documentId, input.accountId]
      );

      if (existingResult.rows.length === 0) {
        return null;
      }

      return {
        relation: mapEncounterDocumentRow(existingResult.rows[0] as Record<string, unknown>),
        alreadyAttached: true
      };
    }
  };
}
