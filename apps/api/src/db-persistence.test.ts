import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
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
import {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository
} from '@cvg-his-v2/module-inpatient';
import { DatabaseSurgeryCaseRepository } from '@cvg-his-v2/module-surgery';
import { DatabaseDiagnosticOrderRepository } from '@cvg-his-v2/module-diagnostics';
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
  NotificationJobSummary,
  InpatientStaySummary,
  InpatientProgressSummary,
  SurgeryCaseSummary,
  DiagnosticOrderSummary
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
  let inpatientStayRepo: DatabaseInpatientStayRepository;
  let inpatientProgressRepo: DatabaseInpatientProgressRepository;
  let surgeryCaseRepo: DatabaseSurgeryCaseRepository;
  let diagnosticOrderRepo: DatabaseDiagnosticOrderRepository;

  before(async () => {
    db = createDatabaseClient(TEST_DATABASE_URL);
    mrRepo = new DatabaseMedicalRecordRepository(db);
    ceRepo = new DatabaseClinicalEntryRepository(db);
    ctRepo = new DatabaseClinicalTimelineRepository(db);
    notifRepo = new DatabaseNotificationRepository(db);
    inpatientStayRepo = new DatabaseInpatientStayRepository(db);
    inpatientProgressRepo = new DatabaseInpatientProgressRepository(db);
    surgeryCaseRepo = new DatabaseSurgeryCaseRepository(db);
    diagnosticOrderRepo = new DatabaseDiagnosticOrderRepository(db);
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
      version: 1,
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
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
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

  it('should persist inpatient stay lifecycle across runtime and repository reads', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_inpatient_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de internacao'
      }
    );

    const stay = runtime.inpatient.admit({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: 'Internacao Clinica',
      ward: 'Ala Teste',
      bed: 'IT-01'
    });

    const progress = runtime.inpatient.addProgress('vet_user' as never, {
      stayId: stay.id,
      note: 'Paciente em observacao inicial'
    });

    const transferred = runtime.inpatient.updateStatus(stay.id, {
      status: 'transferred',
      transferToUnit: 'UTI',
      transferToWard: 'Sala 2'
    });

    const persistedStay = await waitFor(
      () => inpatientStayRepo.findById(stay.id),
      (current) => current?.status === 'transferred' && current?.transferToUnit === 'UTI'
    );
    assert.ok(persistedStay, 'Persisted inpatient stay should be found');
    assert.equal(persistedStay?.encounterId, encounter.id);
    assert.equal(persistedStay?.transferToUnit, 'UTI');
    assert.equal(persistedStay?.transferToWard, 'Sala 2');

    const persistedProgress = await waitFor(
      () => inpatientProgressRepo.findByStayId(stay.id),
      (items) => Boolean(items && items.length > 0)
    );
    assert.ok(persistedProgress);
    assert.equal((persistedProgress as readonly InpatientProgressSummary[])[0].note, progress.note);

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const stayAfterRestart = await waitFor(
      async () => bootstrapAfterRestart.repositories.inpatientStay?.findById(stay.id),
      (current) => current?.status === transferred.status && current?.transferToUnit === 'UTI'
    );
    assert.ok(stayAfterRestart, 'New bootstrap should read persisted inpatient stay');
    assert.equal(stayAfterRestart?.status, transferred.status);
    assert.equal(stayAfterRestart?.transferToUnit, 'UTI');
  });

  it('should persist surgery lifecycle across runtime and repository reads', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_surgery_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de cirurgia'
      }
    );

    const surgeryCase = runtime.surgery.requestCase({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      procedureName: 'Ovariohisterectomia teste',
      surgeonUserId: 'surgeon_test',
      surgicalTeam: ['anest_test', 'nurse_test'],
      scheduledAt: new Date().toISOString()
    });

    runtime.surgery.updateStatus(surgeryCase.id, { status: 'pre_op' });
    runtime.surgery.updateStatus(surgeryCase.id, { status: 'in_progress' });
    const completed = runtime.surgery.updateStatus(surgeryCase.id, {
      status: 'recovery',
      operativeNotes: 'Procedimento realizado sem intercorrencias'
    });

    const persistedCase = await waitFor(
      () => surgeryCaseRepo.findById(surgeryCase.id),
      (current) =>
        current?.status === 'recovery' &&
        current?.surgeonUserId === 'surgeon_test' &&
        Boolean(current?.endedAt)
    );
    assert.ok(persistedCase, 'Persisted surgery case should be found');
    assert.equal(persistedCase?.encounterId, encounter.id);
    assert.equal(persistedCase?.surgeonUserId, 'surgeon_test');
    assert.deepEqual(persistedCase?.surgicalTeam, ['anest_test', 'nurse_test']);
    assert.ok(persistedCase?.startedAt);
    assert.ok(persistedCase?.endedAt);
    assert.equal(persistedCase?.operativeNotes, 'Procedimento realizado sem intercorrencias');

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const surgeryAfterRestart = await bootstrapAfterRestart.repositories.surgeryCase?.findById(
      surgeryCase.id
    );
    assert.ok(surgeryAfterRestart, 'New bootstrap should read persisted surgery case');
    assert.equal(surgeryAfterRestart?.status, completed.status);
    assert.equal(surgeryAfterRestart?.operativeNotes, completed.operativeNotes);
  });

  it('should persist diagnostic lifecycle across runtime and repository reads', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_diag_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de diagnostico'
      }
    );

    const order = runtime.diagnostics.createOrder({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Check-up cirurgico'
    });

    runtime.diagnostics.recordResult(order.id, {
      status: 'collected',
      collectedByUserId: 'lab_user'
    });

    await sleep(50);

    const resulted = runtime.diagnostics.recordResult(order.id, {
      status: 'resulted',
      resultSummary: 'Hemograma sem alteracoes relevantes',
      resultAttachmentId: 'att_diag_test' as never
    });

    await sleep(50);

    const persistedOrder = await waitFor(
      () => diagnosticOrderRepo.findById(order.id),
      (current) =>
        current?.status === 'resulted' &&
        current?.collectedByUserId === 'lab_user' &&
        current?.examCatalogId === 'cat_001'
    );
    assert.ok(persistedOrder, 'Persisted diagnostic order should be found');
    assert.equal(persistedOrder?.encounterId, encounter.id);
    assert.equal(persistedOrder?.examCatalogId, 'cat_001');
    assert.equal(persistedOrder?.collectedByUserId, 'lab_user');
    assert.ok(persistedOrder?.collectedAt);
    assert.equal(persistedOrder?.resultSummary, 'Hemograma sem alteracoes relevantes');
    assert.equal(persistedOrder?.resultAttachmentId, 'att_diag_test');

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const orderAfterRestart = await bootstrapAfterRestart.repositories.diagnosticOrder?.findById(
      order.id
    );
    assert.ok(orderAfterRestart, 'New bootstrap should read persisted diagnostic order');
    assert.equal(orderAfterRestart?.status, resulted.status);
    assert.equal(orderAfterRestart?.examCatalogId, 'cat_001');
    assert.equal(orderAfterRestart?.resultSummary, resulted.resultSummary);
  });

  it('should persist attachment metadata and file content across runtime restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_attachment_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de anexo'
      }
    );

    const vetLogin = runtime.auth.login(
      { username: 'vet', password: 'seed_vet' },
      'corr_db_attachment_vet'
    );
    const veterinarian = runtime.auth.authenticateAccessToken(vetLogin.accessToken);
    const record = await runtime.medicalRecords.getRecordByEncounterOrThrowAsync(encounter.id);
    const fileContent = Buffer.from('attachment persistence content', 'utf8');
    const checksum = createHash('sha256').update(fileContent).digest('hex');

    const attachment = await runtime.attachments.upload(
      veterinarian.user.id,
      {
        linkedEntityType: 'medical_record',
        linkedEntityId: record.id,
        category: 'document',
        fileName: 'attachment-persistence.txt',
        mimeType: 'text/plain',
        checksum
      },
      fileContent
    );
    runtime.medicalRecords.appendAttachmentEvent(
      encounter.id,
      veterinarian.user.id,
      attachment.id,
      'Attachment persisted in runtime test'
    );

    const persistedAttachment = await waitFor(
      async () => bootstrap.repositories.attachment?.findById(attachment.id),
      (current) =>
        Boolean(
          current?.storageKey &&
          current?.checksum === checksum &&
          current?.sizeBytes === fileContent.length
        )
    );
    assert.ok(persistedAttachment, 'Persisted attachment should be found');
    assert.equal(persistedAttachment?.mimeType, 'text/plain');
    assert.equal(persistedAttachment?.checksum, checksum);
    assert.equal(persistedAttachment?.sizeBytes, fileContent.length);

    const storedContent = await bootstrap.fileStorage.retrieve(persistedAttachment!.storageKey);
    assert.deepEqual(storedContent, fileContent);

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrapAfterRestart.repositories,
      fileStorage: bootstrapAfterRestart.fileStorage
    });
    const attachmentsAfterRestart = await runtimeAfterRestart.attachments.listByLinkedEntity(
      'medical_record',
      record.id
    );
    const restored = attachmentsAfterRestart.find((item) => item.id === attachment.id);
    assert.ok(restored, 'Restarted runtime should list persisted attachment');
    const restoredContent = await runtimeAfterRestart.attachments.getFileContent(
      restored!.storageKey
    );
    assert.deepEqual(restoredContent, fileContent);
  });

  it('should persist entry versioning and revisions across runtime restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_versioning_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de revisao clinica'
      }
    );

    const vetLogin = runtime.auth.login(
      { username: 'vet', password: 'seed_vet' },
      'corr_db_versioning_vet'
    );
    const veterinarian = runtime.auth.authenticateAccessToken(vetLogin.accessToken);

    const entry = runtime.medicalRecords.addEntry(veterinarian.user.id, {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'progress_note',
      title: 'Evolucao inicial',
      content: 'Paciente estavel na admissao.'
    });
    const updated = runtime.medicalRecords.updateEntry(veterinarian.user.id, entry.id, {
      title: 'Evolucao revisada',
      content: 'Paciente estavel, hidratacao mantida.',
      reason: 'Complemento de evolucao'
    });

    const persistedEntry = await waitFor(
      async () => bootstrap.repositories.clinicalEntry?.findById(entry.id),
      (current) => current?.version === 2 && current?.title === 'Evolucao revisada'
    );
    assert.ok(persistedEntry, 'Updated clinical entry should be persisted');

    const persistedRevisions = await waitFor(
      async () => bootstrap.repositories.entryRevision?.findByEntryId(entry.id),
      (items) => Boolean(items && items.length > 0 && items[0].version === 1)
    );
    assert.ok(persistedRevisions, 'Entry revisions should be persisted');

    const persistedTimeline = await waitFor(
      async () =>
        bootstrap.repositories.clinicalTimeline?.findByMedicalRecordId(entry.medicalRecordId),
      (items) => Boolean(items?.some((event) => event.eventType === 'entry_updated'))
    );
    assert.ok(persistedTimeline, 'Clinical timeline should include entry_updated event');

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrapAfterRestart.repositories,
      fileStorage: bootstrapAfterRestart.fileStorage
    });
    const entriesAfterRestart =
      await runtimeAfterRestart.medicalRecords.listEntriesByEncounterAsync(encounter.id);
    const revisionsAfterRestart = await runtimeAfterRestart.medicalRecords.getEntryRevisionsAsync(
      entry.id
    );
    const timelineAfterRestart =
      await runtimeAfterRestart.medicalRecords.listTimelineByEncounterAsync(encounter.id);

    const restoredEntry = entriesAfterRestart.find(
      (item: ClinicalEntrySummary) => item.id === entry.id
    );
    assert.ok(restoredEntry, 'Restarted runtime should recover updated entry');
    assert.equal(restoredEntry?.version, updated.version);
    assert.equal(restoredEntry?.title, updated.title);
    assert.equal(revisionsAfterRestart.length, 1);
    assert.equal(revisionsAfterRestart[0].version, 1);
    assert.equal(revisionsAfterRestart[0].title, 'Evolucao inicial');
    assert.equal(
      timelineAfterRestart.some(
        (event: ClinicalTimelineEventSummary) => event.eventType === 'entry_updated'
      ),
      true
    );
  });

  it('should archive clinical entries with version guard and preserve history across restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });

    const receptionLogin = runtime.auth.login(
      { username: 'reception', password: 'seed_reception' },
      'corr_db_archive_reception'
    );
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: 'patient_luna',
        ownerId: 'owner_maria_silva',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de arquivamento clinico'
      }
    );

    const vetLogin = runtime.auth.login(
      { username: 'vet', password: 'seed_vet' },
      'corr_db_archive_vet'
    );
    const veterinarian = runtime.auth.authenticateAccessToken(vetLogin.accessToken);

    const entry = runtime.medicalRecords.addEntry(veterinarian.user.id, {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'assessment',
      title: 'Duplicidade clinica',
      content: 'Conteudo a ser arquivado'
    });

    const updated = runtime.medicalRecords.updateEntry(veterinarian.user.id, entry.id, {
      content: 'Conteudo revisado antes do arquivamento',
      expectedVersion: 1,
      reason: 'Revisao clinica'
    });

    assert.throws(() =>
      runtime.medicalRecords.updateEntry(veterinarian.user.id, entry.id, {
        content: 'Tentativa stale',
        expectedVersion: 1,
        reason: 'Atualizacao stale'
      })
    );

    const archived = runtime.medicalRecords.archiveEntry(veterinarian.user.id, entry.id, {
      reason: 'Lancamento duplicado',
      expectedVersion: 2
    });

    const persistedEntry = await waitFor(
      async () => bootstrap.repositories.clinicalEntry?.findById(entry.id),
      (current) =>
        Boolean(
          current?.deletedAt &&
          current?.deleteReason === 'Lancamento duplicado' &&
          current?.version === 3
        )
    );
    assert.ok(persistedEntry, 'Archived entry should be persisted');
    assert.equal(persistedEntry?.deletedByUserId, veterinarian.user.id);

    const persistedRevisions = await waitFor(
      async () => bootstrap.repositories.entryRevision?.findByEntryId(entry.id),
      (items) => Boolean(items && items.length === 2)
    );
    assert.ok(persistedRevisions, 'Entry revisions should preserve update and archive history');
    assert.equal(persistedRevisions?.[0].version, 1);
    assert.equal(persistedRevisions?.[1].version, 2);

    const persistedTimeline = await waitFor(
      async () =>
        bootstrap.repositories.clinicalTimeline?.findByMedicalRecordId(entry.medicalRecordId),
      (items) => Boolean(items?.some((event) => event.eventType === 'entry_archived'))
    );
    assert.ok(persistedTimeline, 'Timeline should include archive event');

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrapAfterRestart.repositories,
      fileStorage: bootstrapAfterRestart.fileStorage
    });
    const activeEntriesAfterRestart =
      await runtimeAfterRestart.medicalRecords.listEntriesByEncounterAsync(encounter.id);
    const allEntriesAfterRestart =
      await runtimeAfterRestart.medicalRecords.listEntriesByEncounterAsync(encounter.id, {
        includeArchived: true
      });
    const revisionsAfterRestart = await runtimeAfterRestart.medicalRecords.getEntryRevisionsAsync(
      entry.id
    );
    const timelineAfterRestart =
      await runtimeAfterRestart.medicalRecords.listTimelineByEncounterAsync(encounter.id);

    assert.equal(activeEntriesAfterRestart.length, 0);
    assert.equal(allEntriesAfterRestart.length, 1);
    assert.equal(allEntriesAfterRestart[0].id, archived.id);
    assert.ok(allEntriesAfterRestart[0].deletedAt);
    assert.equal(allEntriesAfterRestart[0].deleteReason, 'Lancamento duplicado');
    assert.equal(allEntriesAfterRestart[0].version, archived.version);
    assert.equal(revisionsAfterRestart.length, 2);
    assert.equal(revisionsAfterRestart[1].version, updated.version);
    assert.equal(
      timelineAfterRestart.some(
        (event: ClinicalTimelineEventSummary) => event.eventType === 'entry_archived'
      ),
      true
    );
  });
});
