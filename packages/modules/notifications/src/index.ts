import { randomUUID } from 'node:crypto';

import { EncountersService } from '@cvg-his-v2/module-encounters';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateNotificationRequest,
  ProcessNotificationsRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  NotificationId,
  NotificationJobId,
  NotificationJobSummary,
  NotificationSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import { nowIso } from '@cvg-his-v2/shared-utils';
import { requireEnum, requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export { DatabaseNotificationRepository } from './repositories/database-notifications.repository.js';

export interface NotificationRepository {
  createNotification(notification: NotificationSummary): Promise<void>;
  updateNotification(notification: NotificationSummary): Promise<void>;
  findNotificationById(id: NotificationId): Promise<NotificationSummary | null>;
  findNotifications(
    accountId: AccountId,
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]>;
  createJob(job: NotificationJobSummary): Promise<void>;
  updateJob(job: NotificationJobSummary): Promise<void>;
  findJobById(id: NotificationJobId): Promise<NotificationJobSummary | null>;
  findJobs(
    accountId: AccountId,
    status?: NotificationJobSummary['status']
  ): Promise<readonly NotificationJobSummary[]>;
  findQueuedJobs(accountId: AccountId, limit: number): Promise<readonly NotificationJobSummary[]>;
}

export interface NotificationsServiceOptions {
  readonly encounters?: Pick<EncountersService, 'getOrThrow'>;
  readonly patients?: Pick<PatientsService, 'getOrThrow'>;
  readonly notificationRepository?: NotificationRepository;
  readonly onNotificationSent?: (notification: NotificationSummary) => Promise<void>;
}

export class NotificationsService {
  readonly #encounters?: Pick<EncountersService, 'getOrThrow'>;
  readonly #patients?: Pick<PatientsService, 'getOrThrow'>;
  readonly #repository?: NotificationRepository;
  readonly #notifications: NotificationSummary[] = [];
  readonly #jobs: NotificationJobSummary[] = [];
  readonly #onNotificationSent?: (notification: NotificationSummary) => Promise<void>;

  public constructor(options?: NotificationsServiceOptions) {
    this.#encounters = options?.encounters;
    this.#patients = options?.patients;
    this.#repository = options?.notificationRepository;
    this.#onNotificationSent = options?.onNotificationSent;
  }

  public async create(
    actorUserId: UserId,
    accountId: AccountId,
    payload: CreateNotificationRequest
  ): Promise<NotificationSummary> {
    const scopedAccountId = this.#requireAccountId(accountId);
    const encounterId = payload.encounterId?.trim() || undefined;
    const patientId = payload.patientId?.trim() || undefined;
    let encounter:
      | ReturnType<NonNullable<NotificationsServiceOptions['encounters']>['getOrThrow']>
      | undefined;
    if (encounterId) {
      if (!this.#encounters) {
        throw new NotFoundError('Encounter not found', { encounterId });
      }
      encounter = this.#encounters.getOrThrow(scopedAccountId, encounterId as never);
      if (encounter.accountId !== scopedAccountId) {
        throw new NotFoundError('Encounter not found', { encounterId });
      }
    }
    if (patientId) {
      if (!this.#patients) {
        throw new NotFoundError('Patient not found', { patientId });
      }
      const patient = this.#patients.getOrThrow(patientId as never);
      if (patient.accountId !== scopedAccountId) {
        throw new NotFoundError('Patient not found', { patientId });
      }
      if (encounter && encounter.patientId !== patient.id) {
        throw new NotFoundError('Patient not found', { patientId });
      }
    }

    const notification: NotificationSummary = {
      id: randomUUID() as NotificationId,
      accountId: scopedAccountId,
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
      id: randomUUID() as NotificationJobId,
      accountId: scopedAccountId,
      notificationId: notification.id,
      status: 'queued',
      attempts: 0,
      scheduledAt: nowIso()
    };

    this.#notifications.unshift(notification);
    this.#jobs.unshift(job);

    // Persist to repository if available
    if (this.#repository) {
      await this.#repository.createNotification(notification);
      await this.#repository.createJob(job);
    }

    return notification;
  }

  public list(
    accountId: AccountId,
    status?: NotificationSummary['status']
  ): readonly NotificationSummary[] {
    const scopedAccountId = this.#requireAccountId(accountId);
    return this.#notifications.filter(
      (notification) =>
        (!status || notification.status === status) && notification.accountId === scopedAccountId
    );
  }

  public listJobs(
    accountId: AccountId,
    status?: NotificationJobSummary['status']
  ): readonly NotificationJobSummary[] {
    const scopedAccountId = this.#requireAccountId(accountId);
    return this.#jobs.filter(
      (job) => (!status || job.status === status) && job.accountId === scopedAccountId
    );
  }

  public async listFromRepository(
    accountId: AccountId,
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]> {
    const scopedAccountId = this.#requireAccountId(accountId);
    if (!this.#repository) {
      return this.list(scopedAccountId, status);
    }
    return (await this.#repository.findNotifications(scopedAccountId, status)).filter(
      (notification) =>
        notification.accountId === scopedAccountId && (!status || notification.status === status)
    );
  }

  public async listJobsFromRepository(
    accountId: AccountId,
    status?: NotificationJobSummary['status']
  ): Promise<readonly NotificationJobSummary[]> {
    const scopedAccountId = this.#requireAccountId(accountId);
    if (!this.#repository) {
      return this.listJobs(scopedAccountId, status);
    }
    return (await this.#repository.findJobs(scopedAccountId, status)).filter(
      (job) => job.accountId === scopedAccountId && (!status || job.status === status)
    );
  }

  public async processPendingFromRepository(
    accountId: AccountId,
    payload: ProcessNotificationsRequest = {}
  ): Promise<readonly NotificationSummary[]> {
    const scopedAccountId = this.#requireAccountId(accountId);
    if (!this.#repository) {
      return this.processPending(scopedAccountId, payload);
    }

    const limit =
      typeof payload.limit === 'number' && payload.limit > 0 ? Math.floor(payload.limit) : 10;
    const pendingJobs = (await this.#repository.findQueuedJobs(scopedAccountId, limit))
      .filter((job) => job.accountId === scopedAccountId && job.status === 'queued')
      .slice(0, limit);
    const sentAt = nowIso();
    const processed: NotificationSummary[] = [];

    for (const job of pendingJobs) {
      const notification = await this.#repository.findNotificationById(job.notificationId);
      if (
        !notification ||
        notification.accountId !== scopedAccountId ||
        notification.accountId !== job.accountId
      ) {
        continue;
      }

      await this.#repository.updateJob({
        ...job,
        status: 'processed',
        attempts: job.attempts + 1,
        processedAt: sentAt
      });

      const updated: NotificationSummary = {
        ...notification,
        status: 'sent',
        sentAt
      };
      await this.#repository.updateNotification(updated);
      processed.push(updated);
      await this.#onNotificationSent?.(updated);
    }

    return processed;
  }

  public async processPending(
    accountId: AccountId,
    payload: ProcessNotificationsRequest = {}
  ): Promise<readonly NotificationSummary[]> {
    const scopedAccountId = this.#requireAccountId(accountId);
    const limit =
      typeof payload.limit === 'number' && payload.limit > 0 ? Math.floor(payload.limit) : 10;
    const pendingJobs = this.#jobs
      .filter((job) => job.status === 'queued' && job.accountId === scopedAccountId)
      .slice(0, limit);
    const sentAt = nowIso();
    const processed: NotificationSummary[] = [];

    for (const job of pendingJobs) {
      const notificationIndex = this.#notifications.findIndex(
        (current) =>
          current.id === job.notificationId &&
          current.accountId === scopedAccountId &&
          current.accountId === job.accountId
      );
      if (notificationIndex < 0) {
        continue;
      }

      const jobIndex = this.#jobs.findIndex((current) => current.id === job.id);
      if (jobIndex >= 0) {
        this.#jobs[jobIndex] = {
          ...job,
          status: 'processed',
          attempts: job.attempts + 1,
          processedAt: sentAt
        };
      }

      const updated: NotificationSummary = {
        ...this.#notifications[notificationIndex],
        status: 'sent',
        sentAt
      };
      this.#notifications[notificationIndex] = updated;
      processed.push(updated);
      await this.#onNotificationSent?.(updated);
    }

    return processed;
  }

  #requireAccountId(accountId: AccountId): AccountId {
    return requireNonEmptyString(accountId, 'accountId') as AccountId;
  }
}
