import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { NotificationsService } from '@cvg-his-v2/module-notifications';
import type {
  CreateNotificationRequest,
  ProcessNotificationsRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface NotificationPersistence {
  listFromRepository(
    status?: 'queued' | 'sent' | 'read',
    accountId?: string
  ): Promise<readonly unknown[]>;
  listJobsFromRepository(status?: string, accountId?: string): Promise<readonly unknown[]>;
  processPendingFromRepository(
    payload?: ProcessNotificationsRequest,
    accountId?: string
  ): Promise<readonly unknown[]>;
}

export interface NotificationsRoutesHandlers {
  notifications: NotificationsService;
  notificationPersistence: NotificationPersistence;
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

export async function handleNotificationsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: NotificationsRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/notifications')) {
    return false;
  }

  const { notifications, notificationPersistence, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/notifications' && method === 'GET') {
    const principal = requirePrincipal(request, 'notifications.read');
    const status = url.searchParams.get('status') as 'queued' | 'sent' | 'read' | null;
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'notifications',
      action: 'list',
      entityType: 'notification',
      entityId: status ?? 'all',
      payloadSummary: 'Operational notifications listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: await notificationPersistence.listFromRepository(
        status ?? undefined,
        principal.user.accountId
      )
    });
  }

  if (pathname === '/notifications/jobs' && method === 'GET') {
    const principal = requirePrincipal(request, 'notifications.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'notifications',
      action: 'list_jobs',
      entityType: 'notification-job',
      entityId: 'all',
      payloadSummary: 'Notification jobs listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: await notificationPersistence.listJobsFromRepository(
        undefined,
        principal.user.accountId
      )
    });
  }

  if (pathname === '/notifications' && method === 'POST') {
    const principal = requirePrincipal(request, 'notifications.manage');
    const payload = (await readJsonBody(request)) as CreateNotificationRequest;
    const notification = await notifications.create(
      principal.user.id,
      principal.user.accountId,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'notifications',
      action: 'create',
      entityType: 'notification',
      entityId: notification.id,
      payloadSummary: `Notification queued for category ${notification.category}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, notification);
  }

  if (pathname === '/notifications/process' && method === 'POST') {
    const principal = requirePrincipal(request, 'notifications.manage');
    const payload = (await readJsonBody(request).catch(
      () => ({})
    )) as ProcessNotificationsRequest;
    const processed = await notificationPersistence.processPendingFromRepository(
      payload,
      principal.user.accountId
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'notifications',
      action: 'process_jobs',
      entityType: 'notification-job',
      entityId: String(processed.length),
      payloadSummary: `Processed ${processed.length} notification jobs`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, { items: processed });
  }

  return false;
}
