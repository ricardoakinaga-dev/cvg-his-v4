type DbClient = typeof import('@cvg-his/db').db;

export type EncounterStatus = 'open' | 'closed';

export type EncounterRecord = {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  status: EncounterStatus;
  openedByUserId: string;
  closedByUserId: string | null;
  openedAt: Date;
  closedAt: Date | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EncounterPatientRef = {
  patientId: string;
  ownerId: string;
};

type CreateEncounterInput = {
  accountId: string;
  patientId: string;
  ownerId: string;
  openedByUserId: string;
  reason?: string;
};

type CloseEncounterInput = {
  accountId: string;
  encounterId: string;
  closedByUserId: string;
  reason?: string;
};

type ListEncountersInput = {
  accountId: string;
  patientId?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export type ListEncountersResult = {
  data: EncounterRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type EncounterTimelineNote = {
  id: string;
  encounterId: string;
  type: string;
  status: string;
  versionNumber: number;
  signedAt: Date | null;
  signedByUserId: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  currentSoapJson: Record<string, unknown> | null;
};

export type EncounterTimelineVersion = {
  id: string;
  noteId: string;
  encounterId: string;
  versionNumber: number;
  soapJson: Record<string, unknown>;
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
};

export type EncounterTimelineDocument = {
  encounterDocumentId: string;
  encounterId: string;
  documentId: string;
  attachedByUserId: string;
  attachedAt: Date;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: Date;
};

export type EncounterTimelineEvent = {
  kind:
    | 'encounter.opened'
    | 'encounter.closed'
    | 'note.created'
    | 'note.signed'
    | 'note.version.created'
    | 'document.attached';
  entityId: string;
  happenedAt: Date;
  data: Record<string, unknown>;
};

export type EncounterTimelineResult = {
  encounter: EncounterRecord;
  notes: EncounterTimelineNote[];
  versions: EncounterTimelineVersion[];
  documents: EncounterTimelineDocument[];
  timeline: EncounterTimelineEvent[];
};

export type EncountersRepo = {
  findPatientInAccount: (accountId: string, patientId: string) => Promise<EncounterPatientRef | null>;
  create: (input: CreateEncounterInput) => Promise<EncounterRecord>;
  findById: (accountId: string, encounterId: string) => Promise<EncounterRecord | null>;
  closeById: (input: CloseEncounterInput) => Promise<EncounterRecord | null>;
  list: (input: ListEncountersInput) => Promise<ListEncountersResult>;
  getTimeline: (accountId: string, encounterId: string) => Promise<EncounterTimelineResult | null>;
};

function mapEncounterRow(row: Record<string, unknown>): EncounterRecord {
  const status = String(row.status);

  return {
    id: String(row.id),
    accountId: String(row.account_id),
    patientId: String(row.patient_id),
    ownerId: String(row.owner_id),
    status: status === 'closed' ? 'closed' : 'open',
    openedByUserId: String(row.opened_by_user_id),
    closedByUserId: row.closed_by_user_id ? String(row.closed_by_user_id) : null,
    openedAt: new Date(String(row.opened_at)),
    closedAt: row.closed_at ? new Date(String(row.closed_at)) : null,
    reason: row.reason ? String(row.reason) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function mapTimelineNoteRow(row: Record<string, unknown>): EncounterTimelineNote {
  const currentSoapRaw = row.current_soap_json;

  return {
    id: String(row.id),
    encounterId: String(row.encounter_id),
    type: String(row.type),
    status: String(row.status),
    versionNumber: Number(row.version_number),
    signedAt: row.signed_at ? new Date(String(row.signed_at)) : null,
    signedByUserId: row.signed_by_user_id ? String(row.signed_by_user_id) : null,
    createdByUserId: String(row.created_by_user_id),
    updatedByUserId: String(row.updated_by_user_id),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    currentSoapJson:
      typeof currentSoapRaw === 'object' && currentSoapRaw !== null
        ? (currentSoapRaw as Record<string, unknown>)
        : null
  };
}

function mapTimelineVersionRow(row: Record<string, unknown>): EncounterTimelineVersion {
  const soapRaw = row.soap_json;

  return {
    id: String(row.id),
    noteId: String(row.note_id),
    encounterId: String(row.encounter_id),
    versionNumber: Number(row.version_number),
    soapJson:
      typeof soapRaw === 'object' && soapRaw !== null ? (soapRaw as Record<string, unknown>) : {},
    reason: row.reason ? String(row.reason) : null,
    createdByUserId: String(row.created_by_user_id),
    createdAt: new Date(String(row.created_at))
  };
}

function mapTimelineDocumentRow(row: Record<string, unknown>): EncounterTimelineDocument {
  return {
    encounterDocumentId: String(row.encounter_document_id),
    encounterId: String(row.encounter_id),
    documentId: String(row.document_id),
    attachedByUserId: String(row.attached_by_user_id),
    attachedAt: new Date(String(row.attached_at)),
    storageKey: String(row.storage_key),
    filename: String(row.filename),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    createdByUserId: String(row.created_by_user_id),
    createdAt: new Date(String(row.created_at))
  };
}

function buildEncounterTimelineEvents(input: {
  encounter: EncounterRecord;
  notes: EncounterTimelineNote[];
  versions: EncounterTimelineVersion[];
  documents: EncounterTimelineDocument[];
}): EncounterTimelineEvent[] {
  const events: EncounterTimelineEvent[] = [
    {
      kind: 'encounter.opened',
      entityId: input.encounter.id,
      happenedAt: input.encounter.openedAt,
      data: {
        status: input.encounter.status,
        openedByUserId: input.encounter.openedByUserId,
        reason: input.encounter.reason
      }
    }
  ];

  if (input.encounter.closedAt) {
    events.push({
      kind: 'encounter.closed',
      entityId: input.encounter.id,
      happenedAt: input.encounter.closedAt,
      data: {
        closedByUserId: input.encounter.closedByUserId,
        reason: input.encounter.reason
      }
    });
  }

  for (const note of input.notes) {
    events.push({
      kind: 'note.created',
      entityId: note.id,
      happenedAt: note.createdAt,
      data: {
        encounterId: note.encounterId,
        status: note.status,
        versionNumber: note.versionNumber
      }
    });

    if (note.signedAt) {
      events.push({
        kind: 'note.signed',
        entityId: note.id,
        happenedAt: note.signedAt,
        data: {
          signedByUserId: note.signedByUserId
        }
      });
    }
  }

  for (const version of input.versions) {
    events.push({
      kind: 'note.version.created',
      entityId: version.id,
      happenedAt: version.createdAt,
      data: {
        noteId: version.noteId,
        versionNumber: version.versionNumber,
        reason: version.reason
      }
    });
  }

  for (const document of input.documents) {
    events.push({
      kind: 'document.attached',
      entityId: document.encounterDocumentId,
      happenedAt: document.attachedAt,
      data: {
        documentId: document.documentId,
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        attachedByUserId: document.attachedByUserId
      }
    });
  }

  return events.sort((left, right) => {
    const timeDiff = left.happenedAt.getTime() - right.happenedAt.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const kindDiff = left.kind.localeCompare(right.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }

    return left.entityId.localeCompare(right.entityId);
  });
}

export function createEncountersRepo(db: DbClient): EncountersRepo {
  return {
    async findPatientInAccount(accountId: string, patientId: string): Promise<EncounterPatientRef | null> {
      const result = await db.$client.query(
        `
          select id, owner_id
          from patients
          where id = $1 and account_id = $2
          limit 1
        `,
        [patientId, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as Record<string, unknown>;
      return {
        patientId: String(row.id),
        ownerId: String(row.owner_id)
      };
    },

    async create(input: CreateEncounterInput): Promise<EncounterRecord> {
      const result = await db.$client.query(
        `
          insert into encounters (
            account_id,
            patient_id,
            owner_id,
            status,
            opened_by_user_id,
            opened_at,
            reason
          ) values ($1, $2, $3, 'open', $4, now(), $5)
          returning *
        `,
        [input.accountId, input.patientId, input.ownerId, input.openedByUserId, input.reason ?? null]
      );

      return mapEncounterRow(result.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, encounterId: string): Promise<EncounterRecord | null> {
      const result = await db.$client.query(
        `
          select *
          from encounters
          where id = $1 and account_id = $2
          limit 1
        `,
        [encounterId, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapEncounterRow(result.rows[0] as Record<string, unknown>);
    },

    async closeById(input: CloseEncounterInput): Promise<EncounterRecord | null> {
      const result = await db.$client.query(
        `
          update encounters
          set
            status = 'closed',
            closed_by_user_id = $1,
            closed_at = now(),
            reason = coalesce($2, reason),
            updated_at = now()
          where id = $3 and account_id = $4 and status = 'open'
          returning *
        `,
        [input.closedByUserId, input.reason ?? null, input.encounterId, input.accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapEncounterRow(result.rows[0] as Record<string, unknown>);
    },

    async list(input: ListEncountersInput): Promise<ListEncountersResult> {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.patientId) {
        whereParts.push(`patient_id = $${index}`);
        values.push(input.patientId);
        index += 1;
      }

      if (input.q) {
        whereParts.push(`(reason ilike $${index} or cast(id as text) ilike $${index})`);
        values.push(`%${input.q}%`);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from encounters
            where ${whereClause}
            order by opened_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from encounters where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapEncounterRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    },

    async getTimeline(accountId: string, encounterId: string): Promise<EncounterTimelineResult | null> {
      const encounter = await this.findById(accountId, encounterId);

      if (!encounter) {
        return null;
      }

      const [notesResult, versionsResult, documentsResult] = await Promise.all([
        db.$client.query(
          `
            select
              n.*,
              v.soap_json as current_soap_json
            from clinical_notes n
            join encounters e
              on e.id = n.encounter_id
             and e.account_id = $2
            left join clinical_note_versions v
              on v.note_id = n.id and v.version_number = n.version_number
            where n.encounter_id = $1
            order by n.created_at asc, n.id asc
          `,
          [encounterId, accountId]
        ),
        db.$client.query(
          `
            select
              v.*,
              n.encounter_id
            from clinical_note_versions v
            join clinical_notes n
              on n.id = v.note_id
            join encounters e
              on e.id = n.encounter_id
             and e.account_id = $2
            where n.encounter_id = $1
            order by v.created_at asc, v.note_id asc, v.version_number asc
          `,
          [encounterId, accountId]
        ),
        db.$client.query(
          `
            select
              ed.id as encounter_document_id,
              ed.encounter_id,
              ed.document_id,
              ed.attached_by_user_id,
              ed.created_at as attached_at,
              d.storage_key,
              d.filename,
              d.mime_type,
              d.size_bytes,
              d.created_by_user_id,
              d.created_at
            from encounter_documents ed
            join documents d
              on d.id = ed.document_id
            where ed.encounter_id = $1
              and d.account_id = $2
            order by ed.created_at asc, ed.id asc
          `,
          [encounterId, accountId]
        )
      ]);

      const notes = notesResult.rows.map((row) => mapTimelineNoteRow(row as Record<string, unknown>));
      const versions = versionsResult.rows.map((row) =>
        mapTimelineVersionRow(row as Record<string, unknown>)
      );
      const documents = documentsResult.rows.map((row) =>
        mapTimelineDocumentRow(row as Record<string, unknown>)
      );

      return {
        encounter,
        notes,
        versions,
        documents,
        timeline: buildEncounterTimelineEvents({
          encounter,
          notes,
          versions,
          documents
        })
      };
    }
  };
}
