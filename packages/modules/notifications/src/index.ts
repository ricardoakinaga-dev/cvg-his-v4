import { EncountersService } from '@cvg-his-v2/module-encounters';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateNotificationRequest,
  ProcessNotificationsRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  NotificationId,
  NotificationJobId,
  NotificationJobSummary,
  NotificationSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireEnum, requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export { DatabaseNotificationRepository } from './repositories/database-notifications.repository.js';

export interface NotificationRepository {
  createNotification(notification: NotificationSummary): Promise<void>;
  updateNotification(notification: NotificationSummary): Promise<void>;
  findNotificationById(id: NotificationId): Promise<NotificationSummary | null>;
  findNotifications(
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]>;
  createJob(job: NotificationJobSummary): Promise<void>;
  updateJob(job: NotificationJobSummary): Promise<void>;
  findJobById(id: NotificationJobId): Promise<NotificationJobSummary | null>;
  findQueuedJobs(limit: number): Promise<readonly NotificationJobSummary[]>;
}

export interface NotificationsServiceOptions {
  readonly encounters?: Pick<EncountersService, 'getOrThrow'>;
  readonly patients?: Pick<PatientsService, 'getOrThrow'>;
  readonly notificationRepository?: NotificationRepository;
}

export class NotificationsService {
  readonly #encounters?: Pick<EncountersService, 'getOrThrow'>;
  readonly #patients?: Pick<PatientsService, 'getOrThrow'>;
  readonly #repository?: NotificationRepository;
  readonly #notifications: NotificationSummary[] = [];
  readonly #jobs: NotificationJobSummary[] = [];

  public constructor(options?: NotificationsServiceOptions) {
    this.#encounters = options?.encounters;
    this.#patients = options?.patients;
    this.#repository = options?.notificationRepository;
  }

  public create(
    actorUserId: UserId,
    accountId: NotificationSummary['accountId'],
    payload: CreateNotificationRequest
  ): NotificationSummary {
    const encounterId = payload.encounterId?.trim() || undefined;
    const patientId = payload.patientId?.trim() || undefined;
    if (encounterId && this.#encounters) {
      this.#encounters.getOrThrow(encounterId as never);
    }
    if (patientId && this.#patients) {
      this.#patients.getOrThrow(patientId as never);
    }

    const notification: NotificationSummary = {
      id: createCorrelationId('ntf') as NotificationId,
      accountId,
      channel: 'internal',
      category: requireEnum(payload.category, 'category', [
        'billing',
        'inventory',
        'operations',
        'system'
      ]),
      encounterId: encounterId as never,
      patientId: patientId as never,
      recipientRoleCode: payload.recipientRoleCode?.trim() || undefined,
      title: requireNonEmptyString(payload.title, 'title'),
      message: requireNonEmptyString(payload.message, 'message'),
      severity: requireEnum(payload.severity, 'severity', ['low', 'medium', 'high']),
      status: 'queued',
      createdByUserId: actorUserId,
      createdAt: nowIso()
    };

    const job: NotificationJobSummary = {
      id: createCorrelationId('ntfjob') as NotificationJobId,
      accountId,
      notificationId: notification.id,
      status: 'queued',
      attempts: 0,
      scheduledAt: nowIso()
    };

    this.#notifications.unshift(notification);
    this.#jobs.unshift(job);

    // Persist to repository if available
    if (this.#repository) {
      this.#repository.createNotification(notification).catch(() => {});
      this.#repository.createJob(job).catch(() => {});
    }

    return notification;
  }

  public list(status?: NotificationSummary['status']): readonly NotificationSummary[] {
    return this.#notifications.filter((notification) => !status || notification.status === status);
  }

  public listJobs(status?: NotificationJobSummary['status']): readonly NotificationJobSummary[] {
    return this.#jobs.filter((job) => !status || job.status === status);
  }

  public async listFromRepository(
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]> {
    if (!this.#repository) {
      return this.list(status);
    }
    return this.#repository.findNotifications(status);
  }

  public async processPendingFromRepository(
    payload: ProcessNotificationsRequest = {}
  ): Promise<readonly NotificationSummary[]> {
    if (!this.#repository) {
      return this.processPending(payload);
    }

    const limit =
      typeof payload.limit === 'number' && payload.limit > 0 ? Math.floor(payload.limit) : 10;
    const pendingJobs = await this.#repository.findQueuedJobs(limit);
    const sentAt = nowIso();
    const processed: NotificationSummary[] = [];

    for (const job of pendingJobs) {
      await this.#repository.updateJob({
        ...job,
        status: 'processed',
        attempts: job.attempts + 1,
        processedAt: sentAt
      });

      const notification = await this.#repository.findNotificationById(job.notificationId);
      if (notification) {
        const updated: NotificationSummary = {
          ...notification,
          status: 'sent',
          sentAt
        };
        await this.#repository.updateNotification(updated);
        processed.push(updated);
      }
    }

    return processed;
  }

  public processPending(payload: ProcessNotificationsRequest = {}): readonly NotificationSummary[] {
    const limit =
      typeof payload.limit === 'number' && payload.limit > 0 ? Math.floor(payload.limit) : 10;
    const pendingJobs = this.#jobs.filter((job) => job.status === 'queued').slice(0, limit);
    const sentAt = nowIso();
    const processed: NotificationSummary[] = [];

    for (const job of pendingJobs) {
      const jobIndex = this.#jobs.findIndex((current) => current.id === job.id);
      if (jobIndex >= 0) {
        this.#jobs[jobIndex] = {
          ...job,
          status: 'processed',
          attempts: job.attempts + 1,
          processedAt: sentAt
        };
      }

      const notificationIndex = this.#notifications.findIndex(
        (current) => current.id === job.notificationId
      );
      if (notificationIndex >= 0) {
        const updated: NotificationSummary = {
          ...this.#notifications[notificationIndex],
          status: 'sent',
          sentAt
        };
        this.#notifications[notificationIndex] = updated;
        processed.push(updated);
      }
    }

    return processed;
  }
}
