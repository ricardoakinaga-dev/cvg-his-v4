import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { AttachmentsService } from '@cvg-his-v2/module-attachments';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

type AttachmentLinkedEntityType = 'encounter' | 'medical_record' | 'diagnostic_order';

export interface AttachmentReadRoutesHandlers {
  readonly attachments: Pick<AttachmentsService, 'listByLinkedEntity'>;
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

export async function handleAttachmentReadRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AttachmentReadRoutesHandlers
): Promise<boolean> {
  const { attachments, requirePrincipal, requireAttachmentTargetForAccount, appendAudit } =
    handlers;

  if (pathname === '/attachments' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'attachments.read');
    const linkedEntityType = requireNonEmptyString(
      url.searchParams.get('linkedEntityType'),
      'linkedEntityType'
    ) as AttachmentLinkedEntityType;
    const linkedEntityId = requireNonEmptyString(
      url.searchParams.get('linkedEntityId'),
      'linkedEntityId'
    );
    await requireAttachmentTargetForAccount(
      linkedEntityType,
      linkedEntityId,
      principal.user.accountId
    );
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'attachments',
      'list',
      'attachment',
      linkedEntityId,
      'Clinical attachments listed',
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await attachments.listByLinkedEntity(
          linkedEntityType,
          linkedEntityId,
          principal.user.accountId
        )
      })
    );
    return true;
  }

  return false;
}
