function asRecord(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function mapShiftPeriod(value) {
    const raw = String(value);
    if (raw === 'night' || raw === 'custom') {
        return raw;
    }
    return 'day';
}
function mapHandoverStatus(value) {
    return String(value) === 'published' ? 'published' : 'draft';
}
function mapBuildStatus(value) {
    const raw = String(value);
    if (raw === 'building' || raw === 'ready' || raw === 'failed') {
        return raw;
    }
    return 'pending';
}
function mapShiftDate(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value);
}
function mapHandoverRow(row) {
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
function mapHandoverItemRow(row) {
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
async function queryHandoverById(queryable, accountId, handoverId) {
    const result = await queryable.query(`
      select *
      from shift_handovers
      where id = $1 and account_id = $2
      limit 1
    `, [handoverId, accountId]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapHandoverRow(result.rows[0]);
}
async function queryHandoverItems(queryable, accountId, handoverId) {
    const result = await queryable.query(`
      select *
      from shift_handover_items
      where handover_id = $1 and account_id = $2
      order by created_at asc
    `, [handoverId, accountId]);
    return result.rows.map((row) => mapHandoverItemRow(row));
}
export function createHandoversRepo(db) {
    return {
        async wardExistsInAccount(accountId, wardId) {
            const result = await db.$client.query(`
          select 1
          from wards
          where id = $1 and account_id = $2 and is_active = true
          limit 1
        `, [wardId, accountId]);
            return result.rows.length > 0;
        },
        async findStaysByIds(accountId, stayIds) {
            if (stayIds.length === 0) {
                return [];
            }
            const result = await db.$client.query(`
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
        `, [accountId, stayIds]);
            return result.rows.map((row) => {
                const mapped = row;
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
        async createDraft(input) {
            const client = await db.$client.connect();
            try {
                await client.query('begin');
                const handoverInsertResult = await client.query(`
            insert into shift_handovers (
              account_id,
              ward_id,
              status,
              shift_date,
              shift_period
            ) values ($1, $2, 'draft', $3, $4)
            returning *
          `, [input.accountId, input.wardId, input.shiftDate, input.shiftPeriod]);
                const handoverRow = handoverInsertResult.rows[0];
                const handoverId = String(handoverRow.id);
                for (const item of input.items) {
                    await client.query(`
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
            `, [
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
                    ]);
                }
                const handover = mapHandoverRow(handoverRow);
                const items = await queryHandoverItems(client, input.accountId, handoverId);
                await client.query('commit');
                return {
                    handover,
                    items
                };
            }
            catch (error) {
                await client.query('rollback');
                throw error;
            }
            finally {
                client.release();
            }
        },
        async findById(accountId, handoverId) {
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
        async publish(input) {
            const result = await db.$client.query(`
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
        `, [input.publishedByUserId, input.handoverId, input.accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapHandoverRow(result.rows[0]);
        },
        async markBuildPendingForRetry(input) {
            const result = await db.$client.query(`
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
        `, [input.handoverId, input.accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapHandoverRow(result.rows[0]);
        },
        async markBuildFailed(input) {
            const result = await db.$client.query(`
          update shift_handovers
          set
            build_status = 'failed',
            build_error = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'published'
          returning *
        `, [input.handoverId, input.accountId, input.buildError]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapHandoverRow(result.rows[0]);
        },
        async findLatestPublished(accountId, wardId) {
            const result = await db.$client.query(`
          select *
          from shift_handovers
          where account_id = $1
            and ward_id = $2
            and status = 'published'
          order by shift_date desc, published_at desc nulls last, created_at desc
          limit 1
        `, [accountId, wardId]);
            if (result.rows.length === 0) {
                return null;
            }
            const handover = mapHandoverRow(result.rows[0]);
            const items = await queryHandoverItems(db.$client, accountId, handover.id);
            return {
                handover,
                items
            };
        },
        async findDocumentByHandoverId(accountId, handoverId) {
            const result = await db.$client.query(`
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
        `, [handoverId, accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
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
//# sourceMappingURL=repo.js.map