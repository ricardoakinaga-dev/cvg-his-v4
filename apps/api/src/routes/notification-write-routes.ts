import type { IncomingMessage, ServerResponse } from 'node:http';

import type { NotificationsService } from '@cvg-his-v2/module-notifications';
import type { ProcessNotificationsRequest } from '@cvg-his-v2/shared-contracts';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { readJsonBody } from '../helpers/request-body.js';

export interface NotificationWritePersistence {
  readonly processPendingFromRepository: (
    accountId: AccountId,
    payload?: ProcessNotificationsRequest
  ) => Promise<readonly unknown[]>;
}

export interface NotificationWriteRouteHandlers {
  readonly notifications: Pick<NotificationsService, 'create'>;
  readonly notificationPersistence: NotificationWritePersistence;
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

export async function handleNotificationWriteRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: NotificationWriteRouteHandlers
): Promise<boolean> {
  if (pathname === '/notifications' && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'notifications.manage');
    const payload = (await readJsonBody(request)) as Parameters<NotificationsService['create']>[2];
    const notification = await handlers.notifications.create(
      principal.user.id,
      principal.user.accountId,
      payload
    );
    handlers.appendAudit(
      principal.user.id,
      principal.user.accountId,
      'notifications',
      'create',
      'notification',
      notification.id,
      `Notification queued for category ${notification.category}`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(notification));
    return true;
  }

  if (pathname === '/notifications/process' && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'notifications.manage');
    const payload = (await readJsonBody(request).catch(() => ({}))) as ProcessNotificationsRequest;
    const processed = await handlers.notificationPersistence.processPendingFromRepository(
      principal.user.accountId,
      payload
    );
    handlers.appendAudit(
      principal.user.id,
      principal.user.accountId,
      'notifications',
      'process_jobs',
      'notification-job',
      String(processed.length),
      `Processed ${processed.length} notification jobs`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items: processed }));
    return true;
  }

  return false;
}
