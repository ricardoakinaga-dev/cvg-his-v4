import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AttachmentsService } from '@cvg-his-v2/module-attachments';
import { AppError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import type { AttachmentDownloadClaims } from '../helpers/attachment-download-token.js';

export interface AttachmentContentReadRouteHandlers {
  readonly attachments: Pick<AttachmentsService, 'getById' | 'getFileContent'>;
  readonly signedClaims: AttachmentDownloadClaims | null;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
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
  readonly waitForAuditPersistence: () => Promise<void>;
}

export async function handleAttachmentContentReadRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AttachmentContentReadRouteHandlers
): Promise<boolean> {
  const attachmentContentMatch = pathname.match(/^\/attachments\/([^/]+)\/content$/);
  if (!attachmentContentMatch || request.method !== 'GET') {
    return false;
  }

  const attachmentId = requireNonEmptyString(attachmentContentMatch[1], 'attachmentId');
  const { attachments, signedClaims, requirePrincipal, appendAudit, waitForAuditPersistence } =
    handlers;
  const principal = signedClaims ? undefined : await requirePrincipal(request, 'attachments.read');
  const requestedAccountId = signedClaims?.accountId ?? principal?.user.accountId;
  const attachment = requestedAccountId
    ? await attachments.getById(requestedAccountId as never, attachmentId)
    : null;
  if (
    !attachment ||
    !requestedAccountId ||
    attachment.accountId !== requestedAccountId ||
    (signedClaims && signedClaims.attachmentId !== attachment.id)
  ) {
    throw new NotFoundError('Attachment not found', { attachmentId });
  }
  if (attachment.scanStatus !== 'available') {
    throw new AppError(
      'ATTACHMENT_NOT_AVAILABLE',
      'Attachment is not available until security scanning completes',
      409,
      { scanStatus: attachment.scanStatus }
    );
  }
  const content = await attachments.getFileContent(
    requestedAccountId as never,
    attachment.storageKey
  );
  if (!content) throw new NotFoundError('Attachment content not found', { attachmentId });

  const safeFileName = attachment.fileName.replace(/[\r\n"\\]/g, '_');
  response.setHeader('content-type', attachment.mimeType);
  response.setHeader('content-length', String(content.length));
  response.setHeader('content-disposition', `attachment; filename="${safeFileName}"`);
  response.setHeader('x-content-type-options', 'nosniff');
  appendAudit(
    principal?.user.id ?? 'signed-download',
    attachment.accountId,
    'attachments',
    signedClaims ? 'download_signed' : 'download',
    'attachment',
    attachment.id,
    `Attachment ${attachment.id} downloaded`,
    'high',
    correlationId
  );
  await waitForAuditPersistence();
  response.statusCode = 200;
  response.end(content);
  return true;
}
