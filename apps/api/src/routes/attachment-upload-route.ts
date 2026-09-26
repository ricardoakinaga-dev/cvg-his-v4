import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AttachmentsService } from '@cvg-his-v2/module-attachments';
import type { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import type { MedicalRecordsService } from '@cvg-his-v2/module-medical-records';
import {
  MAX_ATTACHMENT_JSON_BODY_BYTES,
  type CreateAttachmentRequest
} from '@cvg-his-v2/shared-contracts';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { readJsonBody } from '../helpers/request-body.js';
import { decodeAttachmentContent } from '../helpers/attachment-upload-content.js';

type AttachmentLinkedEntityType = 'encounter' | 'medical_record' | 'diagnostic_order';

export interface AttachmentUploadRouteHandlers {
  readonly attachments: Pick<AttachmentsService, 'upload'>;
  readonly diagnostics: Pick<DiagnosticsService, 'getOrThrow'>;
  readonly medicalRecords: Pick<
    MedicalRecordsService,
    'ensureRecord' | 'appendAttachmentEvent' | 'getRecordOrThrowAsync' | 'waitForPersistence'
  >;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireAttachmentTargetForAccount: (
    linkedEntityType: AttachmentLinkedEntityType,
    linkedEntityId: string,
    accountId: string
  ) => Promise<void>;
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

export async function handleAttachmentUploadRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AttachmentUploadRouteHandlers
): Promise<boolean> {
  if (pathname !== '/attachments' || request.method !== 'POST') return false;

  const principal = await handlers.requirePrincipal(request, 'attachments.manage');
  const payload = (await readJsonBody(
    request,
    MAX_ATTACHMENT_JSON_BODY_BYTES
  )) as CreateAttachmentRequest;
  await handlers.requireAttachmentTargetForAccount(
    payload.linkedEntityType,
    payload.linkedEntityId,
    principal.user.accountId
  );
  const fileContent = decodeAttachmentContent(payload.contentBase64);
  const attachment = await handlers.attachments.upload(
    principal.user.id,
    principal.user.accountId as AccountId,
    payload,
    fileContent
  );

  if (payload.linkedEntityType === 'encounter') {
    handlers.medicalRecords.ensureRecord(
      principal.user.accountId as never,
      payload.linkedEntityId as never
    );
    handlers.medicalRecords.appendAttachmentEvent(
      principal.user.accountId as never,
      payload.linkedEntityId as never,
      principal.user.id,
      attachment.id,
      `Attachment added to encounter ${payload.linkedEntityId}`
    );
  } else if (payload.linkedEntityType === 'medical_record') {
    const record = await handlers.medicalRecords.getRecordOrThrowAsync(
      principal.user.accountId as never,
      payload.linkedEntityId as never
    );
    handlers.medicalRecords.appendAttachmentEvent(
      principal.user.accountId as never,
      record.encounterId,
      principal.user.id,
      attachment.id,
      `Attachment added to medical record ${record.id}`
    );
  } else {
    const order = handlers.diagnostics.getOrThrow(
      principal.user.accountId as AccountId,
      payload.linkedEntityId as never
    );
    handlers.medicalRecords.appendAttachmentEvent(
      principal.user.accountId as never,
      order.encounterId,
      principal.user.id,
      attachment.id,
      `Attachment added to diagnostic order ${order.id}`
    );
  }

  await handlers.medicalRecords.waitForPersistence();
  handlers.appendAudit(
    principal.user.id,
    principal.user.accountId,
    'attachments',
    'upload',
    'attachment',
    attachment.id,
    `Attachment ${attachment.fileName} uploaded`,
    'high',
    correlationId
  );
  response.statusCode = 201;
  response.end(JSON.stringify(attachment));
  return true;
}
