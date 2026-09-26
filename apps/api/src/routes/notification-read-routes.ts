import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

export interface NotificationReadPersistence {
  readonly listFromRepository: (
    accountId: string,
    status?: 'queued' | 'sent' | 'read'
  ) => Promise<readonly unknown[]>;
  readonly listJobsFromRepository: (accountId: string) => Promise<readonly unknown[]>;
}

export interface NotificationReadRouteHandlers {
  readonly notificationPersistence: NotificationReadPersistence;
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

export async function handleNotificationReadRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: NotificationReadRouteHandlers
): Promise<boolean> {
  const { notificationPersistence, requirePrincipal, appendAudit } = handlers;

  if (pathname === '/notifications' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'notifications.read');
    const status = url.searchParams.get('status') as 'queued' | 'sent' | 'read' | null;
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'notifications',
      'list',
      'notification',
      status ?? 'all',
      'Operational notifications listed',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await notificationPersistence.listFromRepository(
          principal.user.accountId,
          status ?? undefined
        )
      })
    );
    return true;
  }

  if (pathname === '/notifications/jobs' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'notifications.read');
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'notifications',
      'list_jobs',
      'notification-job',
      'all',
      'Notification jobs listed',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: await notificationPersistence.listJobsFromRepository(principal.user.accountId)
      })
    );
    return true;
  }

  return false;
}
