import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AttachmentsService } from '@cvg-his-v2/module-attachments';
import { AppError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { createAttachmentDownloadToken } from '../helpers/attachment-download-token.js';

export interface AttachmentDownloadUrlRoutesHandlers {
  readonly attachments: Pick<AttachmentsService, 'getById'>;
  readonly authSecret: string;
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
}

export async function handleAttachmentDownloadUrlRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AttachmentDownloadUrlRoutesHandlers
): Promise<boolean> {
  const { attachments, authSecret, requirePrincipal, appendAudit } = handlers;
  const attachmentDownloadUrlMatch = pathname.match(/^\/attachments\/([^/]+)\/download-url$/);
  if (attachmentDownloadUrlMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'attachments.read');
    const attachmentId = requireNonEmptyString(attachmentDownloadUrlMatch[1], 'attachmentId');
    const attachment = await attachments.getById(principal.user.accountId, attachmentId);
    if (!attachment || attachment.accountId !== principal.user.accountId) {
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
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const token = createAttachmentDownloadToken(authSecret, {
      attachmentId: attachment.id,
      accountId: attachment.accountId,
      expiresAt
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'attachments',
      'create_download_url',
      'attachment',
      attachment.id,
      'Short-lived attachment download URL issued',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        url: `/attachments/${encodeURIComponent(attachment.id)}/content?token=${encodeURIComponent(token)}`,
        expiresAt: new Date(expiresAt).toISOString()
      })
    );
    return true;
  }

  return false;
}
