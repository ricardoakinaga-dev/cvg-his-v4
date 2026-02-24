import { can } from '@cvg-his/rbac';
import { createPatientsRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access patient summary.');
    }
    return actor;
}
function toHighlightedAlerts(alerts) {
    return {
        aggressive: alerts.aggressive === true,
        allergiesCount: alerts.allergies?.length ?? 0,
        anesthesiaRisk: alerts.anesthesia_risk ?? null,
        chronicConditionsCount: alerts.chronic_conditions?.length ?? 0,
        hasNotes: Boolean(alerts.notes && String(alerts.notes).trim().length > 0)
    };
}
function mapAuditRow(row) {
    const createdAtValue = row.created_at;
    return {
        id: String(row.id),
        createdAt: createdAtValue instanceof Date
            ? createdAtValue.toISOString()
            : new Date(String(createdAtValue)).toISOString(),
        action: String(row.action),
        actorRole: row.actor_role ? String(row.actor_role) : null,
        reason: row.reason ? String(row.reason) : null,
        requestId: row.request_id ? String(row.request_id) : null
    };
}
export async function getPatientSummary(db, requestContext, patientId) {
    const actor = ensureActor(requestContext);
    const repo = createPatientsRepo(db);
    const patient = await repo.findById(actor.accountId, patientId);
    if (!patient) {
        return null;
    }
    const canReadAudit = can(actor, 'audit.read');
    const auditTrail = canReadAudit
        ? (await db.$client.query(`
            select id, created_at, action, actor_role, reason, request_id
            from audit_events ae
            where ae.entity_type = 'patient'
              and ae.entity_id = $1
              and ae.account_id = $2
            order by created_at desc
            limit 10
          `, [patientId, actor.accountId])).rows.map((row) => mapAuditRow(row))
        : [];
    return {
        patient: {
            id: patient.id,
            ownerId: patient.ownerId,
            name: patient.name,
            species: patient.species,
            microchip: patient.microchip,
            alerts: patient.alerts,
            highlightedAlerts: toHighlightedAlerts(patient.alerts),
            updatedAt: patient.updatedAt.toISOString()
        },
        auditTrail,
        encounters: [],
        documents: []
    };
}
//# sourceMappingURL=summary.js.map