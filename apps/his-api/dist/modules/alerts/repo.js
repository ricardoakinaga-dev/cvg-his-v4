function mapAlertType(value) {
    return String(value) === 'dose_refused_needs_review' ? 'dose_refused_needs_review' : 'medication_delay';
}
function mapAlertSeverity(value) {
    const raw = String(value);
    if (raw === 'high') {
        return 'high';
    }
    if (raw === 'medium') {
        return 'medium';
    }
    return 'low';
}
function mapAlertStatus(value) {
    const raw = String(value);
    if (raw === 'resolved') {
        return 'resolved';
    }
    if (raw === 'acknowledged') {
        return 'acknowledged';
    }
    return 'active';
}
function mapAlertRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        type: mapAlertType(row.type),
        stayId: String(row.stay_id),
        orderId: String(row.order_id),
        scheduledFor: new Date(String(row.scheduled_for)),
        severity: mapAlertSeverity(row.severity),
        message: String(row.message),
        status: mapAlertStatus(row.status),
        acknowledgedAt: row.acknowledged_at ? new Date(String(row.acknowledged_at)) : null,
        acknowledgedByUserId: row.acknowledged_by_user_id ? String(row.acknowledged_by_user_id) : null,
        resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)) : null,
        resolvedByUserId: row.resolved_by_user_id ? String(row.resolved_by_user_id) : null,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
    };
}
export function createAlertsRepo(db) {
    return {
        async create(input) {
            const queryResult = await db.$client.query(`
          insert into alerts (account_id, type, stay_id, order_id, scheduled_for, severity, message)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (order_id, scheduled_for, type) where status != 'resolved'
          do update set
            severity = excluded.severity,
            message = excluded.message,
            updated_at = now()
          returning *
        `, [
                input.accountId,
                input.type,
                input.stayId,
                input.orderId,
                input.scheduledFor,
                input.severity,
                input.message
            ]);
            return mapAlertRow(queryResult.rows[0]);
        },
        async list(input) {
            const whereParts = ['account_id = $1'];
            const values = [input.accountId];
            let index = 2;
            if (input.stayId) {
                whereParts.push(`stay_id = $${index}`);
                values.push(input.stayId);
                index += 1;
            }
            if (input.type) {
                whereParts.push(`type = $${index}`);
                values.push(input.type);
                index += 1;
            }
            if (input.status) {
                whereParts.push(`status = $${index}`);
                values.push(input.status);
                index += 1;
            }
            const whereClause = whereParts.join(' and ');
            const offset = (input.page - 1) * input.pageSize;
            const [rowsResult, totalResult] = await Promise.all([
                db.$client.query(`
            select *
            from alerts
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `, [...values, input.pageSize, offset]),
                db.$client.query(`
            select count(*)::int as total
            from alerts
            where ${whereClause}
          `, values)
            ]);
            return {
                data: rowsResult.rows.map((row) => mapAlertRow(row)),
                page: input.page,
                pageSize: input.pageSize,
                total: Number(totalResult.rows[0]?.total ?? 0)
            };
        },
        async acknowledge(input) {
            const result = await db.$client.query(`
          update alerts
          set status = 'acknowledged',
              acknowledged_at = now(),
              acknowledged_by_user_id = $3,
              updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'active'
          returning *
        `, [input.alertId, input.accountId, input.acknowledgedByUserId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapAlertRow(result.rows[0]);
        },
        async resolve(input) {
            const result = await db.$client.query(`
          update alerts
          set status = 'resolved',
              resolved_at = now(),
              resolved_by_user_id = $3,
              updated_at = now()
          where id = $1
            and account_id = $2
            and status in ('active', 'acknowledged')
          returning *
        `, [input.alertId, input.accountId, input.resolvedByUserId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapAlertRow(result.rows[0]);
        },
        async acknowledgeMany(input) {
            const result = await db.$client.query(`
          update alerts
          set status = 'acknowledged',
              acknowledged_at = now(),
              acknowledged_by_user_id = $3,
              updated_at = now()
          where id = any($1::uuid[])
            and account_id = $2
            and status = 'active'
          returning id
        `, [input.alertIds, input.accountId, input.acknowledgedByUserId]);
            const acknowledgedIds = new Set(result.rows.map((row) => String(row.id)));
            const notFound = [];
            const alreadyAcknowledged = [];
            for (const alertId of input.alertIds) {
                if (!acknowledgedIds.has(alertId)) {
                    // Check if alert exists but is not active
                    const checkResult = await db.$client.query(`
              select status from alerts where id = $1 and account_id = $2
            `, [alertId, input.accountId]);
                    if (checkResult.rows.length === 0) {
                        notFound.push(alertId);
                    }
                    else {
                        alreadyAcknowledged.push(alertId);
                    }
                }
            }
            return {
                acknowledged: Array.from(acknowledgedIds),
                notFound,
                alreadyAcknowledged
            };
        },
        async resolveMany(input) {
            const result = await db.$client.query(`
          update alerts
          set status = 'resolved',
              resolved_at = now(),
              resolved_by_user_id = $3,
              updated_at = now()
          where id = any($1::uuid[])
            and account_id = $2
            and status in ('active', 'acknowledged')
          returning id
        `, [input.alertIds, input.accountId, input.resolvedByUserId]);
            const resolvedIds = new Set(result.rows.map((row) => String(row.id)));
            const notFound = [];
            const alreadyResolved = [];
            for (const alertId of input.alertIds) {
                if (!resolvedIds.has(alertId)) {
                    // Check if alert exists but is already resolved
                    const checkResult = await db.$client.query(`
              select status from alerts where id = $1 and account_id = $2
            `, [alertId, input.accountId]);
                    if (checkResult.rows.length === 0) {
                        notFound.push(alertId);
                    }
                    else {
                        alreadyResolved.push(alertId);
                    }
                }
            }
            return {
                resolved: Array.from(resolvedIds),
                notFound,
                alreadyResolved
            };
        }
    };
}
//# sourceMappingURL=repo.js.map