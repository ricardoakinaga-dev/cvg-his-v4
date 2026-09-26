import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { MedicalRecordsService } from '@cvg-his-v2/module-medical-records';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { parseIncludeArchived } from '../request-boundaries.js';

export interface MedicalRecordReadRoutesHandlers {
  readonly medicalRecords: Pick<
    MedicalRecordsService,
    | 'listAll'
    | 'getRecordByEncounterOrThrowAsync'
    | 'listEntriesByEncounterAsync'
    | 'getEntryOrThrowAsync'
    | 'getEntryRevisionsAsync'
  >;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (encounterId: string, accountId: string) => unknown;
  readonly appendAudit: (
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) => void;
}

export interface MedicalRecordTimelineRouteHandlers {
  readonly medicalRecords: Pick<MedicalRecordsService, 'listTimelineByEncounterAsync'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (encounterId: string, accountId: string) => unknown;
  readonly appendAudit: MedicalRecordReadRoutesHandlers['appendAudit'];
}

export async function handleMedicalRecordTimelineRoute(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MedicalRecordTimelineRouteHandlers
): Promise<boolean> {
  if (pathname !== '/medical-records/timeline' || request.method !== 'GET') {
    return false;
  }

  const { medicalRecords, requirePrincipal, requireEncounterForAccount, appendAudit } = handlers;
  const principal = await requirePrincipal(request, 'medical-records.read');
  const encounterId = requireNonEmptyString(url.searchParams.get('encounterId'), 'encounterId');
  requireEncounterForAccount(encounterId, principal.user.accountId);
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'medical-records',
    'read_timeline',
    'clinical-timeline',
    encounterId,
    'Clinical timeline inspected',
    'high',
    correlationId
  );
  response.statusCode = 200;
  response.end(
    JSON.stringify({
      items: await medicalRecords.listTimelineByEncounterAsync(
        principal.user.accountId as never,
        encounterId as never
      )
    })
  );
  return true;
}

export async function handleMedicalRecordReadRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MedicalRecordReadRoutesHandlers
): Promise<boolean> {
  const { medicalRecords, requirePrincipal, requireEncounterForAccount, appendAudit } = handlers;

  if (pathname.startsWith('/medical-records/entries/')) {
    const medicalRecordEntryParts = pathname.split('/');
    if (
      request.method === 'GET' &&
      medicalRecordEntryParts.length === 5 &&
      medicalRecordEntryParts[4] === 'revisions'
    ) {
      const entryId = requireNonEmptyString(medicalRecordEntryParts[3], 'entryId');
      const principal = await requirePrincipal(request, 'medical-records.read');
      const entry = await medicalRecords.getEntryOrThrowAsync(
        principal.user.accountId as never,
        entryId as never
      );
      if (entry.accountId !== principal.user.accountId) {
        throw new NotFoundError('Clinical entry not found', { entryId });
      }
      const revisions = await medicalRecords.getEntryRevisionsAsync(
        principal.user.accountId as never,
        entryId as never
      );
      appendAudit(
        principal.user.id,
        principal.user.accountId,
        'medical-records',
        'read_revisions',
        'clinical-entry',
        entryId,
        `Clinical entry ${entryId} revision history inspected`,
        'medium',
        correlationId
      );
      response.statusCode = 200;
      response.end(JSON.stringify({ items: revisions }));
      return true;
    }
  }

  if (pathname === '/medical-records' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'medical-records.read');
    const encounterId = url.searchParams.get('encounterId');

    if (encounterId) {
      requireEncounterForAccount(encounterId, principal.user.accountId);
      const record = await medicalRecords.getRecordByEncounterOrThrowAsync(
        principal.user.accountId as never,
        encounterId as never
      );
      appendAudit(
        principal.user.id,
        principal.user.accountId,
        'medical-records',
        'read_record',
        'medical-record',
        record.id,
        `Medical record read for encounter ${encounterId}`,
        'high',
        correlationId
      );
      response.statusCode = 200;
      response.end(
        JSON.stringify({
          record,
          entries: await medicalRecords.listEntriesByEncounterAsync(
            principal.user.accountId as never,
            encounterId as never
          )
        })
      );
      return true;
    }

    const items = await medicalRecords.listAll(principal.user.accountId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/medical-records/entries' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'medical-records.read');
    const encounterId = requireNonEmptyString(url.searchParams.get('encounterId'), 'encounterId');
    const includeArchived = parseIncludeArchived(url.searchParams.get('includeArchived'));
    requireEncounterForAccount(encounterId, principal.user.accountId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'medical-records',
      'list_entries',
      'clinical-entry',
      encounterId,
      'Clinical entries listed',
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await medicalRecords.listEntriesByEncounterAsync(
          principal.user.accountId as never,
          encounterId as never,
          { includeArchived }
        )
      })
    );
    return true;
  }

  return false;
}
