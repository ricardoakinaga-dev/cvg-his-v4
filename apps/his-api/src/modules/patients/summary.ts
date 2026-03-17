import { can } from '@cvg-his/rbac';

import type { AlertDto } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createPatientsRepo } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type PatientSummaryAuditEvent = {
  id: string;
  createdAt: string;
  action: string;
  actorRole: string | null;
  reason: string | null;
  requestId: string | null;
};

type HighlightedAlerts = {
  aggressive: boolean;
  allergiesCount: number;
  anesthesiaRisk: 'low' | 'medium' | 'high' | null;
  chronicConditionsCount: number;
  hasNotes: boolean;
};

type PatientSummary = {
  patient: {
    id: string;
    ownerId: string;
    name: string;
    species: string;
    microchip: string | null;
    alerts: AlertDto;
    highlightedAlerts: HighlightedAlerts;
    updatedAt: Date;
  };
  auditTrail: PatientSummaryAuditEvent[];
  encounters: [];
  documents: [];
};

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access patient summary.');
  }

  return actor;
}

function toHighlightedAlerts(alerts: AlertDto): HighlightedAlerts {
  return {
    aggressive: alerts.aggressive === true,
    allergiesCount: alerts.allergies?.length ?? 0,
    anesthesiaRisk: alerts.anesthesia_risk ?? null,
    chronicConditionsCount: alerts.chronic_conditions?.length ?? 0,
    hasNotes: Boolean(alerts.notes && String(alerts.notes).trim().length > 0)
  };
}

function mapAuditRow(row: Record<string, unknown>): PatientSummaryAuditEvent {
  const createdAtValue = row.created_at;

  return {
    id: String(row.id),
    createdAt:
      createdAtValue instanceof Date
        ? createdAtValue.toISOString()
        : new Date(String(createdAtValue)).toISOString(),
    action: String(row.action),
    actorRole: row.actor_role ? String(row.actor_role) : null,
    reason: row.reason ? String(row.reason) : null,
    requestId: row.request_id ? String(row.request_id) : null
  };
}

export async function getPatientSummary(
  db: DbClient,
  requestContext: RequestContext,
  patientId: string
): Promise<PatientSummary | null> {
  const actor = ensureActor(requestContext);
  const repo = createPatientsRepo(db);
  const patient = await repo.findById(actor.accountId, patientId);

  if (!patient) {
    return null;
  }

  const canReadAudit = can(actor, 'audit.read');
  const auditTrail = canReadAudit
    ? (
        await db.$client.query(
          `
            select id, created_at, action, actor_role, reason, request_id
            from audit_events ae
            where ae.entity_type = 'patient'
              and ae.entity_id = $1
              and ae.account_id = $2
            order by created_at desc
            limit 10
          `,
          [patientId, actor.accountId]
        )
      ).rows.map((row) => mapAuditRow(row as Record<string, unknown>))
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
      updatedAt: patient.updatedAt
    },
    auditTrail,
    encounters: [],
    documents: []
  };
}
