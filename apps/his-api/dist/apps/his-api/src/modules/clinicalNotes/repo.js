function normalizeStatus(status) {
    return status === 'signed' ? 'signed' : 'draft';
}
function normalizeType(type) {
    return type === 'SOAP' ? 'SOAP' : 'SOAP';
}
function mapClinicalNoteRow(row) {
    const soapRaw = row.soap_json;
    return {
        id: String(row.id),
        encounterId: String(row.encounter_id),
        type: normalizeType(String(row.type)),
        status: normalizeStatus(String(row.status)),
        versionNumber: Number(row.version_number),
        signedAt: row.signed_at ? new Date(String(row.signed_at)) : null,
        signedByUserId: row.signed_by_user_id ? String(row.signed_by_user_id) : null,
        createdByUserId: String(row.created_by_user_id),
        updatedByUserId: String(row.updated_by_user_id),
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
        soap: typeof soapRaw === 'object' && soapRaw !== null ? soapRaw : null
    };
}
async function queryNoteById(queryable, accountId, noteId) {
    const result = await queryable.query(`
      select
        n.*,
        v.soap_json
      from clinical_notes n
      join encounters e
        on e.id = n.encounter_id
      left join clinical_note_versions v
        on v.note_id = n.id and v.version_number = n.version_number
      where n.id = $1
        and e.account_id = $2
      limit 1
    `, [noteId, accountId]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapClinicalNoteRow(result.rows[0]);
}
export function createClinicalNotesRepo(db) {
    return {
        async findEncounterInAccount(accountId, encounterId) {
            const result = await db.$client.query('select 1 from encounters where id = $1 and account_id = $2 limit 1', [encounterId, accountId]);
            return result.rows.length > 0;
        },
        async createDraft(input) {
            const client = await db.$client.connect();
            try {
                await client.query('begin');
                const noteResult = await client.query(`
            insert into clinical_notes (
              encounter_id,
              type,
              status,
              version_number,
              created_by_user_id,
              updated_by_user_id
            ) values ($1, 'SOAP', 'draft', 1, $2, $2)
            returning id
          `, [input.encounterId, input.userId]);
                const noteId = String(noteResult.rows[0].id);
                await client.query(`
            insert into clinical_note_versions (
              note_id,
              version_number,
              soap_json,
              reason,
              created_by_user_id
            ) values ($1, 1, $2::jsonb, $3, $4)
          `, [noteId, JSON.stringify(input.soap), input.reason ?? 'Initial SOAP draft', input.userId]);
                const created = await queryNoteById(client, input.accountId, noteId);
                if (!created) {
                    throw new Error('Failed to fetch created clinical note');
                }
                await client.query('commit');
                return created;
            }
            catch (error) {
                await client.query('rollback');
                throw error;
            }
            finally {
                client.release();
            }
        },
        async findById(accountId, noteId) {
            return queryNoteById(db.$client, accountId, noteId);
        },
        async updateDraft(input) {
            const client = await db.$client.connect();
            try {
                await client.query('begin');
                const updateResult = await client.query(`
            update clinical_notes n
            set
              version_number = n.version_number + 1,
              updated_by_user_id = $1,
              updated_at = now()
            where n.id = $2
              and n.status = 'draft'
              and exists (
                select 1
                from encounters e
                where e.id = n.encounter_id and e.account_id = $3
              )
            returning n.id, n.version_number
          `, [input.userId, input.noteId, input.accountId]);
                if (updateResult.rows.length === 0) {
                    await client.query('rollback');
                    return null;
                }
                const updatedRow = updateResult.rows[0];
                const noteId = String(updatedRow.id);
                const versionNumber = Number(updatedRow.version_number);
                await client.query(`
            insert into clinical_note_versions (
              note_id,
              version_number,
              soap_json,
              reason,
              created_by_user_id
            ) values ($1, $2, $3::jsonb, $4, $5)
          `, [noteId, versionNumber, JSON.stringify(input.soap), input.reason, input.userId]);
                const updated = await queryNoteById(client, input.accountId, noteId);
                if (!updated) {
                    throw new Error('Failed to fetch updated clinical note');
                }
                await client.query('commit');
                return updated;
            }
            catch (error) {
                await client.query('rollback');
                throw error;
            }
            finally {
                client.release();
            }
        },
        async signDraftById(input) {
            const result = await db.$client.query(`
          update clinical_notes n
          set
            status = 'signed',
            signed_at = now(),
            signed_by_user_id = $1,
            updated_by_user_id = $1,
            updated_at = now()
          where n.id = $2
            and n.status = 'draft'
            and exists (
              select 1
              from encounters e
              where e.id = n.encounter_id and e.account_id = $3
            )
          returning n.id
        `, [input.signedByUserId, input.noteId, input.accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            return queryNoteById(db.$client, input.accountId, input.noteId);
        }
    };
}
//# sourceMappingURL=repo.js.map