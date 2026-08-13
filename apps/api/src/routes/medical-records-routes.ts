import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { MedicalRecordsService } from '@cvg-his-v2/module-medical-records';
import type {
  ArchiveClinicalEntryRequest,
  CreateClinicalEntryRequest,
  UpdateClinicalEntryRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface MedicalRecordsRoutesHandlers {
  medicalRecords: MedicalRecordsService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    resource: ResourceAttributes,
    request: IncomingMessage
  ) => void;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleMedicalRecordsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MedicalRecordsRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/medical-records')) {
    return false;
  }

  const { medicalRecords, audit, requirePrincipal, enforceAbac } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/medical-records' && method === 'GET') {
    const principal = requirePrincipal(request, 'medical-records.read');
    const encounterId = url.searchParams.get('encounterId');

    if (encounterId) {
      const record = await medicalRecords.getRecordByEncounterOrThrowAsync(
        encounterId as never,
        principal.user.accountId as never
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'medical-records',
        action: 'read_record',
        entityType: 'medical-record',
        entityId: record.id,
        payloadSummary: `Medical record read for encounter ${encounterId}`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, {
        record,
        entries: await medicalRecords.listEntriesByEncounterAsync(
          encounterId as never,
          undefined,
          principal.user.accountId as never
        )
      });
    }

    const items = await medicalRecords.listAll(principal.user.accountId as never);
    return json(response, 200, { items });
  }

  if (pathname === '/medical-records/entries' && method === 'GET') {
    const principal = requirePrincipal(request, 'medical-records.read');
    const encounterId = requireNonEmptyString(url.searchParams.get('encounterId'), 'encounterId');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'medical-records',
      action: 'list_entries',
      entityType: 'clinical-entry',
      entityId: encounterId,
      payloadSummary: 'Clinical entries listed',
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, {
      items: await medicalRecords.listEntriesByEncounterAsync(
        encounterId as never,
        undefined,
        principal.user.accountId as never
      )
    });
  }

  if (pathname === '/medical-records/entries' && method === 'POST') {
    const principal = requirePrincipal(request, 'medical-records.manage');
    const payload = (await readJsonBody(request)) as CreateClinicalEntryRequest;
    enforceAbac(
      'medical-records.manage',
      principal,
      {
        resourceType: 'patient',
        resourceId: payload.patientId,
        patientId: payload.patientId as never,
        encounterId: payload.encounterId as never,
        accountId: principal.user.accountId as never
      },
      request
    );
    const entry = medicalRecords.addEntry(
      principal.user.id,
      payload,
      principal.user.accountId as never
    );
    await medicalRecords.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'medical-records',
      action: 'create_entry',
      entityType: 'clinical-entry',
      entityId: entry.id,
      payloadSummary: `${entry.entryType} created for encounter ${entry.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, entry);
  }

  if (pathname.startsWith('/medical-records/entries/')) {
    const parts = pathname.split('/');
    const entryId = requireNonEmptyString(parts[3], 'entryId');

    if (method === 'GET' && parts.length === 5 && parts[4] === 'revisions') {
      const principal = requirePrincipal(request, 'medical-records.read');
      const revisions = await medicalRecords.getEntryRevisionsAsync(
        entryId as never,
        principal.user.accountId as never
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'medical-records',
        action: 'read_revisions',
        entityType: 'clinical-entry',
        entityId: entryId,
        payloadSummary: `Clinical entry ${entryId} revision history inspected`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, { items: revisions });
    }

    const principal = requirePrincipal(request, 'medical-records.manage');

    if (method === 'PATCH' && parts.length === 4) {
      const payload = (await readJsonBody(request)) as UpdateClinicalEntryRequest;
      const entry = medicalRecords.updateEntry(
        principal.user.id,
        entryId as never,
        payload,
        principal.user.accountId as never
      );
      await medicalRecords.waitForPersistence();
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'medical-records',
        action: 'update_entry',
        entityType: 'clinical-entry',
        entityId: entry.id,
        payloadSummary: `Clinical entry ${entry.id} updated to version ${entry.version}`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, entry);
    }

    if (method === 'DELETE' && parts.length === 4) {
      const payload = (await readJsonBody(request).catch(
        () => ({}) as ArchiveClinicalEntryRequest
      )) as ArchiveClinicalEntryRequest;
      const entry = medicalRecords.archiveEntry(
        principal.user.id,
        entryId as never,
        payload,
        principal.user.accountId as never
      );
      await medicalRecords.waitForPersistence();
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'medical-records',
        action: 'archive_entry',
        entityType: 'clinical-entry',
        entityId: entry.id,
        payloadSummary: `Clinical entry ${entry.id} archived`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, entry);
    }
  }

  if (pathname === '/medical-records/timeline' && method === 'GET') {
    const principal = requirePrincipal(request, 'medical-records.read');
    const encounterId = requireNonEmptyString(url.searchParams.get('encounterId'), 'encounterId');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'medical-records',
      action: 'read_timeline',
      entityType: 'clinical-timeline',
      entityId: encounterId,
      payloadSummary: 'Clinical timeline inspected',
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, {
      items: await medicalRecords.listTimelineByEncounterAsync(
        encounterId as never,
        principal.user.accountId as never
      )
    });
  }

  return false;
}
