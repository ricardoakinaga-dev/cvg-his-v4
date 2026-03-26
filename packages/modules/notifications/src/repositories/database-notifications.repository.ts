import { eq, desc } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { notifications, notificationJobs } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  NotificationId,
  NotificationJobId,
  NotificationJobSummary,
  NotificationSummary
} from '@cvg-his-v2/shared-types';
import type { NotificationRepository } from '../index.js';

export class DatabaseNotificationRepository implements NotificationRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async createNotification(notification: NotificationSummary): Promise<void> {
    await this.#db.insert(notifications).values({
      id: notification.id,
      accountId: notification.accountId,
      channel: notification.channel,
      category: notification.category,
      encounterId: notification.encounterId ?? null,
      patientId: notification.patientId ?? null,
      recipientRoleCode: notification.recipientRoleCode ?? null,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      status: notification.status,
      createdByUserId: notification.createdByUserId ?? null,
      createdAt: new Date(notification.createdAt),
      sentAt: notification.sentAt ? new Date(notification.sentAt) : null
    });
  }

  public async updateNotification(notification: NotificationSummary): Promise<void> {
    await this.#db
      .update(notifications)
      .set({
        channel: notification.channel,
        category: notification.category,
        encounterId: notification.encounterId ?? null,
        patientId: notification.patientId ?? null,
        recipientRoleCode: notification.recipientRoleCode ?? null,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        status: notification.status,
        sentAt: notification.sentAt ? new Date(notification.sentAt) : null
      })
      .where(eq(notifications.id, notification.id));
  }

  public async findNotificationById(id: NotificationId): Promise<NotificationSummary | null> {
    const result = await this.#db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result[0]);
  }

  public async findNotifications(
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]> {
    let query = this.#db.select().from(notifications);

    if (status) {
      query = query.where(eq(notifications.status, status)) as typeof query;
    }

    const result = await query.orderBy(desc(notifications.createdAt));
    return result.map((row) => this.mapRowToNotification(row));
  }

  public async createJob(job: NotificationJobSummary): Promise<void> {
    await this.#db.insert(notificationJobs).values({
      id: job.id,
      accountId: job.accountId,
      notificationId: job.notificationId,
      status: job.status,
      attempts: job.attempts,
      scheduledAt: new Date(job.scheduledAt),
      processedAt: job.processedAt ? new Date(job.processedAt) : null
    });
  }

  public async updateJob(job: NotificationJobSummary): Promise<void> {
    await this.#db
      .update(notificationJobs)
      .set({
        status: job.status,
        attempts: job.attempts,
        processedAt: job.processedAt ? new Date(job.processedAt) : null
      })
      .where(eq(notificationJobs.id, job.id));
  }

  public async findJobById(id: NotificationJobId): Promise<NotificationJobSummary | null> {
    const result = await this.#db
      .select()
      .from(notificationJobs)
      .where(eq(notificationJobs.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToJob(result[0]);
  }

  public async findQueuedJobs(limit: number): Promise<readonly NotificationJobSummary[]> {
    const result = await this.#db
      .select()
      .from(notificationJobs)
      .where(eq(notificationJobs.status, 'queued'))
      .orderBy(notificationJobs.scheduledAt)
      .limit(limit);

    return result.map((row) => this.mapRowToJob(row));
  }

  private mapRowToNotification(row: typeof notifications.$inferSelect): NotificationSummary {
    return {
      id: row.id as NotificationId,
      accountId: row.accountId as AccountId,
      channel: row.channel as NotificationSummary['channel'],
      category: row.category as NotificationSummary['category'],
      encounterId: (row.encounterId ?? undefined) as never,
      patientId: (row.patientId ?? undefined) as never,
      recipientRoleCode: row.recipientRoleCode ?? undefined,
      title: row.title,
      message: row.message,
      severity: row.severity as NotificationSummary['severity'],
      status: row.status as NotificationSummary['status'],
      createdByUserId: (row.createdByUserId ?? undefined) as never,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt?.toISOString()
    };
  }

  private mapRowToJob(row: typeof notificationJobs.$inferSelect): NotificationJobSummary {
    return {
      id: row.id as NotificationJobId,
      accountId: row.accountId as AccountId,
      notificationId: row.notificationId as never,
      status: row.status as NotificationJobSummary['status'],
      attempts: row.attempts,
      scheduledAt: row.scheduledAt.toISOString(),
      processedAt: row.processedAt?.toISOString()
    };
  }
}
