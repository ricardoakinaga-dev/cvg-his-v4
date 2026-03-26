import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  createDatabaseClient,
  closeDatabaseClient,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { DatabaseMedicalRecordRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseClinicalEntryRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseClinicalTimelineRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseNotificationRepository } from '@cvg-his-v2/module-notifications';
import { bootstrapServices } from './bootstrap.js';
import { createApiRuntime } from './runtime.js';
import type {
  MedicalRecordId,
  ClinicalEntryId,
  NotificationId,
  NotificationJobId,
  MedicalRecordSummary,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  NotificationSummary,
  NotificationJobSummary
} from '@cvg-his-v2/shared-types';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cvg_his_test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRunOncePath = resolve(__dirname, '../../worker/dist/run-once.js');

async function runWorkerProcessOnce(): Promise<void> {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [workerRunOncePath], {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        APP_NAME: 'cvg-his-v2-worker-test',
        WORKER_INTERVAL_MS: '1'
      },
      stdio: 'pipe'
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      reject(new Error(stderr || `Worker process exited with code ${code}`));
    });
  });
}

async function waitFor<T>(
  action: () => Promise<T | undefined>,
  predicate: (value: T | undefined) => boolean,
  timeoutMs: number = 2000
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await action();
    if (predicate(result)) {
      return result;
    }
    await sleep(50);
  }

  return action();
}

describe('Database Persistence Integration Tests', () => {
  let db: DatabaseClient;
  let mrRepo: DatabaseMedicalRecordRepository;
  let ceRepo: DatabaseClinicalEntryRepository;
  let ctRepo: DatabaseClinicalTimelineRepository;
  let notifRepo: DatabaseNotificationRepository;

  before(async () => {
    db = createDatabaseClient(TEST_DATABASE_URL);
    mrRepo = new DatabaseMedicalRecordRepository(db);
    ceRepo = new DatabaseClinicalEntryRepository(db);
    ctRepo = new DatabaseClinicalTimelineRepository(db);
    notifRepo = new DatabaseNotificationRepository(db);
  });

  after(async () => {
    await closeDatabaseClient();
  });

  it('should persist and retrieve a medical record', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_${Date.now()}` as MedicalRecordId;
    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: 'acc_test' as any,
      encounterId: 'enc_test' as any,
      patientId: 'pat_test' as any,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    await mrRepo.create(record);

    const found = await mrRepo.findById(recordId);
    assert.ok(found, 'Medical record should be found');
    assert.equal(found?.id, recordId);
    assert.equal(found?.status, 'open');
  });

  it('should persist and retrieve clinical entries', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_ce_${Date.now()}` as MedicalRecordId;

    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: 'acc_test' as any,
      encounterId: 'enc_test' as any,
      patientId: 'pat_test' as any,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    await mrRepo.create(record);

    const entryId = `entry_test_${Date.now()}` as ClinicalEntryId;
    const entry: ClinicalEntrySummary = {
      id: entryId,
      accountId: 'acc_test' as any,
      medicalRecordId: recordId,
      encounterId: 'enc_test' as any,
      patientId: 'pat_test' as any,
      entryType: 'anamnesis',
      title: 'Test Entry',
      content: 'Test content for persistence',
      authoredByUserId: 'user_test' as any,
      createdAt: now,
      updatedAt: now
    };

    await ceRepo.create(entry);

    const found = await ceRepo.findByMedicalRecordId(recordId);
    assert.ok(found.length > 0, 'Clinical entries should be found');
    assert.equal(found[0].id, entryId);
    assert.equal(found[0].title, 'Test Entry');
  });

  it('should persist and retrieve clinical timeline events', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_ct_${Date.now()}` as MedicalRecordId;

    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: 'acc_test' as any,
      encounterId: 'enc_test' as any,
      patientId: 'pat_test' as any,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    await mrRepo.create(record);

    const eventId = `ct_test_${Date.now()}` as ClinicalTimelineEventSummary['id'];
    const event: ClinicalTimelineEventSummary = {
      id: eventId,
      accountId: 'acc_test' as any,
      medicalRecordId: recordId,
      encounterId: 'enc_test' as any,
      eventType: 'record_created',
      summary: 'Record created for test',
      actorUserId: 'user_test' as any,
      occurredAt: now
    };

    await ctRepo.create(event);

    const found = await ctRepo.findByMedicalRecordId(recordId);
    assert.ok(found.length > 0, 'Timeline events should be found');
    assert.equal(found[0].id, eventId);
    assert.equal(found[0].eventType, 'record_created');
  });

  it('should persist and retrieve notifications', async () => {
    const now = new Date().toISOString();
    const notifId = `notif_test_${Date.now()}` as NotificationId;

    const notification: NotificationSummary = {
      id: notifId,
      accountId: 'acc_test' as any,
      channel: 'internal',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification for persistence',
      severity: 'low',
      status: 'queued',
      createdByUserId: 'user_test' as any,
      createdAt: now
    };

    await notifRepo.createNotification(notification);

    const found = await notifRepo.findNotificationById(notifId);
    assert.ok(found, 'Notification should be found');
    assert.equal(found?.id, notifId);
    assert.equal(found?.title, 'Test Notification');
    assert.equal(found?.status, 'queued');
  });

  it('should persist and retrieve notification jobs', async () => {
    const now = new Date().toISOString();
    const notifId = `notif_job_test_${Date.now()}` as NotificationId;

    const notification: NotificationSummary = {
      id: notifId,
      accountId: 'acc_test' as any,
      channel: 'internal',
      category: 'system',
      title: 'Test Notification for Job',
      message: 'Test message',
      severity: 'low',
      status: 'queued',
      createdByUserId: 'user_test' as any,
      createdAt: now
    };
    await notifRepo.createNotification(notification);

    const jobId = `job_test_${Date.now()}` as NotificationJobId;
    const job: NotificationJobSummary = {
      id: jobId,
      accountId: 'acc_test' as any,
      notificationId: notifId,
      status: 'queued',
      attempts: 0,
      scheduledAt: now
    };

    await notifRepo.createJob(job);

    const found = await notifRepo.findJobById(jobId);
    assert.ok(found, 'Notification job should be found');
    assert.equal(found?.id, jobId);
    assert.equal(found?.status, 'queued');
    assert.equal(found?.attempts, 0);
  });

  it('should let API and worker in separate processes share notification state through DB', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories
    });

    const financeLogin = runtime.auth.login(
      { username: 'finance', password: 'finance123' },
      'corr_db_worker_process'
    );
    const finance = runtime.auth.authenticateAccessToken(financeLogin.accessToken);

    const notification = runtime.notifications.create(finance.user.id, finance.user.accountId, {
      category: 'operations',
      severity: 'high',
      title: 'Worker process integration',
      message: 'Notification created by API and processed by external worker process'
    });

    const queuedJob = await waitFor(
      async () => {
        const queuedJobs = await notifRepo.findQueuedJobs(10);
        return queuedJobs.find((job) => job.notificationId === notification.id);
      },
      (job) => Boolean(job)
    );
    assert.ok(queuedJob, 'Notification job should be queued before worker process runs');

    await runWorkerProcessOnce();

    const sentNotification = await waitFor(
      () => notifRepo.findNotificationById(notification.id),
      (current) => current?.status === 'sent'
    );
    assert.equal(
      sentNotification?.status,
      'sent',
      'Separate worker process should mark notification as sent'
    );

    const processedJob = await waitFor(
      () => notifRepo.findJobById(queuedJob.id),
      (job) => job?.status === 'processed'
    );
    assert.equal(
      processedJob?.status,
      'processed',
      'Separate worker process should mark notification job as processed'
    );
  });
});
