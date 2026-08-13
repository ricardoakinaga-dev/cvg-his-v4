import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AttachmentsService } from '@cvg-his-v2/module-attachments';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import type { MedicalRecordsService } from '@cvg-his-v2/module-medical-records';
import type { CreateAttachmentRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface AttachmentsRoutesHandlers {
  attachments: AttachmentsService;
  diagnostics: DiagnosticsService;
  medicalRecords: MedicalRecordsService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleAttachmentsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AttachmentsRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/attachments') {
    return false;
  }

  const { attachments, diagnostics, medicalRecords, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (method === 'GET') {
    const principal = requirePrincipal(request, 'attachments.read');
    const linkedEntityType = requireNonEmptyString(
      url.searchParams.get('linkedEntityType'),
      'linkedEntityType'
    ) as 'encounter' | 'medical_record' | 'diagnostic_order';
    const linkedEntityId = requireNonEmptyString(
      url.searchParams.get('linkedEntityId'),
      'linkedEntityId'
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'attachments',
      action: 'list',
      entityType: 'attachment',
      entityId: linkedEntityId,
      payloadSummary: 'Clinical attachments listed',
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, {
      items: await attachments.listByLinkedEntity(
        linkedEntityType,
        linkedEntityId,
        principal.user.accountId as never
      )
    });
  }

  if (method === 'POST') {
    const principal = requirePrincipal(request, 'attachments.manage');
    const payload = (await readJsonBody(request)) as CreateAttachmentRequest;
    const attachment = await attachments.upload(
      principal.user.id,
      payload,
      undefined,
      principal.user.accountId as never
    );

    if (payload.linkedEntityType === 'encounter') {
      medicalRecords.ensureRecord(
        payload.linkedEntityId as never,
        principal.user.accountId as never
      );
      medicalRecords.appendAttachmentEvent(
        payload.linkedEntityId as never,
        principal.user.id,
        attachment.id,
        `Attachment added to encounter ${payload.linkedEntityId}`,
        principal.user.accountId as never
      );
    } else if (payload.linkedEntityType === 'medical_record') {
      const record = await medicalRecords.getRecordOrThrowAsync(
        payload.linkedEntityId as never,
        principal.user.accountId as never
      );
      medicalRecords.appendAttachmentEvent(
        record.encounterId,
        principal.user.id,
        attachment.id,
        `Attachment added to medical record ${record.id}`,
        principal.user.accountId as never
      );
    } else {
      const order = diagnostics.getOrThrow(payload.linkedEntityId as never);
      medicalRecords.appendAttachmentEvent(
        order.encounterId,
        principal.user.id,
        attachment.id,
        `Attachment added to diagnostic order ${order.id}`,
        principal.user.accountId as never
      );
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'attachments',
      action: 'upload',
      entityType: 'attachment',
      entityId: attachment.id,
      payloadSummary: `Attachment ${attachment.fileName} uploaded`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, attachment);
  }

  return false;
}
