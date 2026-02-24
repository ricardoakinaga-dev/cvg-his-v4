import { db } from '@cvg-his/db';
import { computeActiveSlot } from '@cvg-his/domain';
import { Worker } from 'bullmq';
import { MEDICATION_OVERDUE_QUEUE_NAME, MEDICATION_OVERDUE_SCAN_JOB_NAME } from '../queues/medicationOverdue.queue.js';
import { resolveMedicationScheduleTimezone } from './medicationTimezone.js';
const DEFAULT_GRACE_MINUTES = 30;
function parseScheduleType(value) {
    return String(value) === 'fixed_times' ? 'fixed_times' : 'interval';
}
function parseStringArray(value) {
    if (!Array.isArray(value)) {
        return null;
    }
    const items = value.filter((item) => typeof item === 'string');
    return items.length > 0 ? items : null;
}
function mapOrderRow(row) {
    return {
        orderId: String(row.order_id),
        accountId: String(row.account_id),
        stayId: String(row.stay_id),
        wardId: row.ward_id ? String(row.ward_id) : null,
        medicationName: String(row.medication_name),
        patientName: String(row.patient_name),
        scheduleType: parseScheduleType(row.schedule_type),
        intervalMinutes: row.interval_minutes === null || row.interval_minutes === undefined
            ? null
            : Number(row.interval_minutes),
        times: parseStringArray(row.times_json),
        orderStartAt: new Date(String(row.start_at)),
        orderEndAt: row.end_at ? new Date(String(row.end_at)) : null,
        lastScheduledFor: row.last_scheduled_for ? new Date(String(row.last_scheduled_for)) : null
    };
}
function calculateSeverity(delayMinutes) {
    if (delayMinutes >= 120) {
        return 'high';
    }
    if (delayMinutes >= 60) {
        return 'medium';
    }
    return 'low';
}
function buildAlertMessage(row, scheduledFor, delayMinutes) {
    return `Dose overdue: ${row.medicationName} for ${row.patientName} (slot ${scheduledFor.toISOString()}, delay ${delayMinutes}m)`;
}
function shouldUpgradeSeverity(currentSeverity, nextSeverity) {
    const rank = {
        low: 1,
        medium: 2,
        high: 3
    };
    return rank[nextSeverity] > rank[currentSeverity];
}
function mapAdministrationStatus(value) {
    const raw = String(value);
    if (raw === 'refused') {
        return 'refused';
    }
    if (raw === 'delayed') {
        return 'delayed';
    }
    if (raw === 'held') {
        return 'held';
    }
    return 'administered';
}
async function findAdministrationForSlot(input) {
    const result = await db.$client.query(`
      select
        status,
        delayed_until
      from medication_administrations
      where account_id = $1
        and order_id = $2
        and scheduled_for = $3
      limit 1
    `, [input.accountId, input.orderId, input.scheduledFor]);
    const row = result.rows[0];
    if (!row) {
        return null;
    }
    return {
        status: mapAdministrationStatus(row.status),
        delayedUntil: row.delayed_until ? new Date(String(row.delayed_until)) : null
    };
}
async function bumpMedicationDelayAlertSeverity(input) {
    const existing = await db.$client.query(`
      select severity
      from alerts
      where account_id = $1
        and order_id = $2
        and scheduled_for = $3
        and type = 'medication_delay'
      limit 1
    `, [input.accountId, input.orderId, input.scheduledFor]);
    const currentSeverityRaw = existing.rows[0]?.severity;
    if (!currentSeverityRaw) {
        return;
    }
    const currentSeverity = mapAlertSeverity(currentSeverityRaw);
    if (!shouldUpgradeSeverity(currentSeverity, input.severity)) {
        return;
    }
    await db.$client.query(`
      update alerts
      set severity = $4,
          message = $5,
          updated_at = now()
      where account_id = $1
        and order_id = $2
        and scheduled_for = $3
        and type = 'medication_delay'
        and status != 'resolved'
        and not exists (
          select 1
          from medication_administrations ma
          where ma.account_id = $1
            and ma.order_id = $2
            and ma.scheduled_for = $3
            and ma.status = 'administered'
        )
    `, [input.accountId, input.orderId, input.scheduledFor, input.severity, input.message]);
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
async function loadOverdueCandidates(accountId) {
    const values = [];
    let accountFilter = '';
    if (accountId) {
        values.push(accountId);
        accountFilter = `and mo.account_id = $${values.length}`;
    }
    const result = await db.$client.query(`
      select
        mo.id as order_id,
        mo.account_id,
        mo.stay_id,
        ist.ward_id,
        mo.medication_name,
        p.name as patient_name,
        mo.start_at,
        mo.end_at,
        mos.schedule_type,
        mos.interval_minutes,
        mos.times_json,
        last_admin.last_scheduled_for
      from medication_orders mo
      join patients p
        on p.id = mo.patient_id
       and p.account_id = mo.account_id
      left join inpatient_stays ist
        on ist.id = mo.stay_id
       and ist.account_id = mo.account_id
      join lateral (
        select *
        from medication_order_schedules inner_mos
        where inner_mos.account_id = mo.account_id
          and inner_mos.order_id = mo.id
        order by inner_mos.updated_at desc, inner_mos.created_at desc
        limit 1
      ) mos on true
      left join lateral (
        select max(ma.scheduled_for) as last_scheduled_for
        from medication_administrations ma
        where ma.account_id = mo.account_id
          and ma.order_id = mo.id
          and ma.status = 'administered'
      ) last_admin on true
      where mo.status = 'active'
        and mo.stay_id is not null
        ${accountFilter}
    `, values);
    return result.rows.map((row) => mapOrderRow(row));
}
async function createMedicationDelayAlert(input) {
    const result = await db.$client.query(`
      insert into alerts (
        account_id,
        type,
        stay_id,
        order_id,
        scheduled_for,
        severity,
        message
      )
      select
        $1,
        'medication_delay',
        $2,
        $3,
        $4,
        $5,
        $6
      where exists (
        select 1
        from medication_orders mo
        where mo.id = $3
          and mo.account_id = $1
          and mo.status = 'active'
      )
      and not exists (
        select 1
        from medication_administrations ma
        where ma.account_id = $1
          and ma.order_id = $3
          and ma.scheduled_for = $4
          and ma.status = 'administered'
      )
      on conflict (order_id, scheduled_for, type) where status != 'resolved' do update set
        updated_at = now()
      returning id, (xmax = 0) as inserted
    `, [
        input.accountId,
        input.stayId,
        input.orderId,
        input.scheduledFor,
        input.severity,
        input.message
    ]);
    const inserted = result.rows[0]?.inserted ?? false;
    if (inserted) {
        return true;
    }
    await bumpMedicationDelayAlertSeverity({
        accountId: input.accountId,
        orderId: input.orderId,
        scheduledFor: input.scheduledFor,
        severity: input.severity,
        message: input.message
    });
    return false;
}
function logInfo(context, message, extra = {}) {
    console.info(JSON.stringify({
        level: 'info',
        message,
        ...context,
        ...extra
    }));
}
export function createMedicationOverdueWorker(connection, prefix) {
    return new Worker(MEDICATION_OVERDUE_QUEUE_NAME, async (job) => {
        if (job.name !== MEDICATION_OVERDUE_SCAN_JOB_NAME) {
            throw new Error(`Unsupported medication overdue job name: ${job.name}`);
        }
        const context = {
            queue: MEDICATION_OVERDUE_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? 'unknown',
            requestId: job.data.requestId ?? null,
            accountId: job.data.accountId ?? null
        };
        const now = new Date();
        const graceMinutes = Number.isFinite(job.data.graceMinutes) && (job.data.graceMinutes ?? 0) > 0
            ? Number(job.data.graceMinutes)
            : DEFAULT_GRACE_MINUTES;
        const rows = await loadOverdueCandidates(job.data.accountId);
        let createdAlerts = 0;
        let skippedOrders = 0;
        for (const row of rows) {
            const timezone = resolveMedicationScheduleTimezone({
                accountId: row.accountId,
                wardId: row.wardId
            });
            const schedule = {
                scheduleType: row.scheduleType,
                intervalMinutes: row.intervalMinutes,
                times: row.times,
                orderStartAt: row.orderStartAt,
                orderEndAt: row.orderEndAt,
                lastScheduledFor: row.lastScheduledFor
            };
            const activeSlot = computeActiveSlot(now, schedule, row.lastScheduledFor, timezone);
            let scheduledFor = activeSlot && activeSlot.getTime() <= now.getTime() ? activeSlot : null;
            if (!scheduledFor) {
                skippedOrders += 1;
                continue;
            }
            const slotAdministration = await findAdministrationForSlot({
                accountId: row.accountId,
                orderId: row.orderId,
                scheduledFor
            });
            if (slotAdministration?.status === 'administered') {
                skippedOrders += 1;
                continue;
            }
            if (slotAdministration?.status === 'refused' || slotAdministration?.status === 'held') {
                skippedOrders += 1;
                continue;
            }
            if (slotAdministration?.status === 'delayed' && slotAdministration.delayedUntil) {
                if (slotAdministration.delayedUntil.getTime() > now.getTime()) {
                    skippedOrders += 1;
                    continue;
                }
                scheduledFor = slotAdministration.delayedUntil;
                const delayedUntilAdministration = await findAdministrationForSlot({
                    accountId: row.accountId,
                    orderId: row.orderId,
                    scheduledFor
                });
                if (delayedUntilAdministration?.status === 'administered') {
                    skippedOrders += 1;
                    continue;
                }
            }
            const delayMinutes = Math.floor((now.getTime() - scheduledFor.getTime()) / 60_000);
            if (delayMinutes <= graceMinutes) {
                skippedOrders += 1;
                continue;
            }
            const created = await createMedicationDelayAlert({
                accountId: row.accountId,
                stayId: row.stayId,
                orderId: row.orderId,
                scheduledFor,
                severity: calculateSeverity(delayMinutes),
                message: buildAlertMessage(row, scheduledFor, delayMinutes)
            });
            if (created) {
                createdAlerts += 1;
            }
            else {
                skippedOrders += 1;
            }
        }
        logInfo(context, 'medication overdue scan completed', {
            trigger: job.data.trigger,
            graceMinutes,
            scannedOrders: rows.length,
            createdAlerts,
            skippedOrders
        });
        return {
            status: 'ok',
            scannedAt: now.toISOString(),
            scannedOrders: rows.length,
            createdAlerts,
            skippedOrders
        };
    }, {
        connection,
        prefix,
        concurrency: 1
    });
}
//# sourceMappingURL=medicationOverdue.worker.js.map