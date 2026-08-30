import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import type { AuthSessionResponse } from '@cvg-his-v2/shared-contracts';
import {
  createDatabaseClient,
  closeDatabaseClient,
  getPool,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { DatabaseStaffRepository } from '@cvg-his-v2/module-staff';
import { DatabaseMedicalRecordRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseClinicalEntryRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseClinicalTimelineRepository } from '@cvg-his-v2/module-medical-records';
import { DatabaseNotificationRepository } from '@cvg-his-v2/module-notifications';
import {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository,
  DatabaseInpatientOccurrenceRepository,
  DatabaseInpatientDailyChargeRepository
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
  InpatientOccurrenceSummary,
  InpatientDailyChargeSummary,
  SurgeryCaseSummary,
  DiagnosticOrderSummary
} from '@cvg-his-v2/shared-types';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cvg_his_test';
const PERSISTENCE_FIXTURE_SLUG = `db-persistence-${process.pid}-${Date.now()}`;
const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRunOncePath = resolve(__dirname, '../../worker/dist/run-once.js');

interface DatabasePersistenceFixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly unitId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly adminUserId: string;
  readonly receptionUserId: string;
  readonly nurseUserId: string;
  readonly vetUserId: string;
  readonly financeUserId: string;
  readonly labUserId: string;
  readonly surgeonUserId: string;
  readonly anesthetistUserId: string;
  readonly billingRecordId: string;
}

let persistenceFixture: DatabasePersistenceFixture;

async function provisionDatabasePersistenceFixture(): Promise<DatabasePersistenceFixture> {
  const client = await getPool().connect();
  const tenantId = randomUUID();
  const accountId = randomUUID();
  const unitId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const labProfessionId = randomUUID();
  const billingRecordId = `bill_inpatient_${tenantId.slice(0, 8)}`;
  const roleNames = ['admin', 'reception', 'nurse', 'veterinarian', 'finance'] as const;
  const principalSpecs = [
    {
      key: 'adminUserId',
      username: 'admin',
      password: 'seed_admin',
      role: 'admin',
      name: 'DB Admin'
    },
    {
      key: 'receptionUserId',
      username: 'reception',
      password: 'seed_reception',
      role: 'reception',
      name: 'DB Reception'
    },
    {
      key: 'nurseUserId',
      username: 'nurse',
      password: 'seed_nurse',
      role: 'nurse',
      name: 'DB Nurse'
    },
    {
      key: 'vetUserId',
      username: 'vet',
      password: 'seed_vet',
      role: 'veterinarian',
      name: 'DB Vet'
    },
    {
      key: 'financeUserId',
      username: 'finance',
      password: 'seed_finance',
      role: 'finance',
      name: 'DB Finance'
    },
    {
      key: 'labUserId',
      username: 'lab',
      password: 'seed_lab',
      role: 'veterinarian',
      name: 'DB Lab'
    },
    {
      key: 'surgeonUserId',
      username: 'surgeon',
      password: 'seed_surgeon',
      role: 'veterinarian',
      name: 'DB Surgeon'
    },
    {
      key: 'anesthetistUserId',
      username: 'anesthetist',
      password: 'seed_anesthetist',
      role: 'veterinarian',
      name: 'DB Anesthetist'
    }
  ] as const;
  const principalIds = Object.fromEntries(
    principalSpecs.map(({ key }) => [key, randomUUID()])
  ) as Record<(typeof principalSpecs)[number]['key'], string>;

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, $3, 'active', now())`,
      [tenantId, PERSISTENCE_FIXTURE_SLUG, 'Database persistence fixture tenant']
    );
    await client.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $2, $3, $4)`,
      [
        accountId,
        tenantId,
        `${PERSISTENCE_FIXTURE_SLUG}-account`,
        'Database persistence fixture account'
      ]
    );
    await client.query(
      `INSERT INTO units (id, account_id, code, name)
       VALUES ($1, $2, $3, $4)`,
      [unitId, accountId, 'DB-FIXTURE', 'Database persistence fixture unit']
    );

    const roleIds = new Map<string, string>();
    for (const roleName of roleNames) {
      const role = await client.query<{ id: string }>(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [roleName, `Database persistence fixture ${roleName} role`]
      );
      roleIds.set(roleName, role.rows[0]!.id);
    }

    for (const principal of principalSpecs) {
      await client.query(
        `INSERT INTO users (
           id, account_id, unit_id, username, email, password_hash, full_name,
           is_active, principal_kind, interactive_login_enabled
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'human', true)`,
        [
          principalIds[principal.key],
          accountId,
          unitId,
          principal.username,
          `${principal.username}.${tenantId.slice(0, 8)}@example.test`,
          `cvg-his-v2-seed-salt-v1:${principal.password}`,
          principal.name
        ]
      );
      await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
        principalIds[principal.key],
        roleIds.get(principal.role)!
      ]);
    }

    await client.query(
      `INSERT INTO professions (id, account_id, code, name, is_active)
       VALUES ($1, $2, $3, 'Laboratory Veterinarian', true)`,
      [labProfessionId, accountId, `LAB-${tenantId.slice(0, 8)}`]
    );
    await client.query(
      `INSERT INTO staff (
         id, account_id, user_id, employee_code, full_name, department,
         job_title, profession_id, is_active
       ) VALUES ($1, $2, $3, $4, 'DB Lab', 'Laboratory', 'Veterinarian', $5, true)`,
      [
        randomUUID(),
        accountId,
        principalIds.labUserId,
        `LAB-${tenantId.slice(0, 8)}`,
        labProfessionId
      ]
    );

    await client.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $2, 'Maria DB Fixture')`,
      [ownerId, accountId]
    );
    await client.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $2, $3, 'Luna DB Fixture', 'canine')`,
      [patientId, accountId, ownerId]
    );
    await client.query(
      `INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
       VALUES ($1, $2, $3, $4, $5, 'Database persistence fixture encounter')`,
      [encounterId, accountId, patientId, ownerId, principalIds.receptionUserId]
    );
    await client.query(
      `INSERT INTO billing_records (
         id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount
       ) VALUES ($1, $2, $3, $4, $5, 'open', 0)`,
      [billingRecordId, accountId, encounterId, patientId, ownerId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return {
    tenantId,
    accountId,
    unitId,
    ownerId,
    patientId,
    encounterId,
    adminUserId: principalIds.adminUserId,
    receptionUserId: principalIds.receptionUserId,
    nurseUserId: principalIds.nurseUserId,
    vetUserId: principalIds.vetUserId,
    financeUserId: principalIds.financeUserId,
    labUserId: principalIds.labUserId,
    surgeonUserId: principalIds.surgeonUserId,
    anesthetistUserId: principalIds.anesthetistUserId,
    billingRecordId
  };
}

async function createPersistenceEncounter(): Promise<string> {
  const encounterId = randomUUID();
  await getPool().query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      encounterId,
      persistenceFixture.accountId,
      persistenceFixture.patientId,
      persistenceFixture.ownerId,
      persistenceFixture.receptionUserId,
      'Database persistence isolated record fixture'
    ]
  );
  return encounterId;
}

async function createPersistencePatient(): Promise<{ ownerId: string; patientId: string }> {
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const patientName = `Luna DB Runtime ${patientId.slice(0, 8)}`;

  await getPool().query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, $3)`,
    [ownerId, persistenceFixture.accountId, `Maria DB Runtime ${ownerId.slice(0, 8)}`]
  );
  await getPool().query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, $4, 'canine')`,
    [patientId, persistenceFixture.accountId, ownerId, patientName]
  );

  return { ownerId, patientId };
}

function tenantIt(name: string, test: () => Promise<void>): void {
  it(name, () =>
    runWithTenantContext(
      {
        tenantId: persistenceFixture.tenantId,
        accountId: persistenceFixture.accountId,
        correlationId: `db-persistence-${randomUUID()}`
      },
      test
    )
  );
}

async function runWorkerProcessOnce(): Promise<void> {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [workerRunOncePath], {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        APP_NAME: 'cvg-his-v2-worker-test',
        WORKER_INTERVAL_MS: '1',
        WORKER_ACCOUNT_ID: persistenceFixture.accountId
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
  let staffRepo: DatabaseStaffRepository;
  let ceRepo: DatabaseClinicalEntryRepository;
  let ctRepo: DatabaseClinicalTimelineRepository;
  let notifRepo: DatabaseNotificationRepository;
  let inpatientStayRepo: DatabaseInpatientStayRepository;
  let inpatientProgressRepo: DatabaseInpatientProgressRepository;
  let inpatientOccurrenceRepo: DatabaseInpatientOccurrenceRepository;
  let inpatientDailyChargeRepo: DatabaseInpatientDailyChargeRepository;
  let surgeryCaseRepo: DatabaseSurgeryCaseRepository;
  let diagnosticOrderRepo: DatabaseDiagnosticOrderRepository;

  before(async () => {
    db = createDatabaseClient(TEST_DATABASE_URL);
    persistenceFixture = await provisionDatabasePersistenceFixture();
    mrRepo = new DatabaseMedicalRecordRepository(db);
    staffRepo = new DatabaseStaffRepository();
    ceRepo = new DatabaseClinicalEntryRepository(db);
    ctRepo = new DatabaseClinicalTimelineRepository(db);
    notifRepo = new DatabaseNotificationRepository(db);
    inpatientStayRepo = new DatabaseInpatientStayRepository(db);
    inpatientProgressRepo = new DatabaseInpatientProgressRepository(db);
    inpatientOccurrenceRepo = new DatabaseInpatientOccurrenceRepository(db);
    inpatientDailyChargeRepo = new DatabaseInpatientDailyChargeRepository(db);
    surgeryCaseRepo = new DatabaseSurgeryCaseRepository(db);
    diagnosticOrderRepo = new DatabaseDiagnosticOrderRepository(db);
  });

  after(async () => {
    await closeDatabaseClient();
  });

  it('should provision a UUID-backed tenant fixture for database persistence tests', async () => {
    const result = await getPool().query<{
      tenant_id: string;
      account_id: string;
      unit_id: string;
      owner_id: string;
      patient_id: string;
      encounter_id: string;
      principal_count: string;
    }>(
      `SELECT
         t.id AS tenant_id,
         a.id AS account_id,
         u.id AS unit_id,
         o.id AS owner_id,
         p.id AS patient_id,
         e.id AS encounter_id,
         (SELECT COUNT(*)::text FROM users WHERE account_id = a.id) AS principal_count
       FROM tenants t
       JOIN accounts a ON a.tenant_id = t.id
       JOIN units u ON u.account_id = a.id
       JOIN owners o ON o.account_id = a.id
       JOIN patients p ON p.account_id = a.id AND p.owner_id = o.id
       JOIN encounters e ON e.account_id = a.id AND e.patient_id = p.id AND e.owner_id = o.id
       WHERE t.slug = $1
       LIMIT 1`,
      [PERSISTENCE_FIXTURE_SLUG]
    );

    assert.equal(result.rowCount, 1, 'Database persistence fixture should be provisioned');
    const row = result.rows[0]!;
    for (const [name, value] of Object.entries(row).slice(0, 6)) {
      assert.match(value, /^[0-9a-f-]{36}$/i, `${name} should be a UUID`);
    }
    assert.ok(Number(row.principal_count) >= 6, 'Fixture should provide all runtime principals');
  });

  tenantIt('should persist and retrieve a medical record', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_${Date.now()}` as MedicalRecordId;
    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: persistenceFixture.accountId as never,
      encounterId: persistenceFixture.encounterId as never,
      patientId: persistenceFixture.patientId as never,
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

  tenantIt('should persist and retrieve clinical entries', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_ce_${Date.now()}` as MedicalRecordId;
    const encounterId = await createPersistenceEncounter();

    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: persistenceFixture.accountId as never,
      encounterId: encounterId as never,
      patientId: persistenceFixture.patientId as never,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    await mrRepo.create(record);

    const entryId = `entry_test_${Date.now()}` as ClinicalEntryId;
    const entry: ClinicalEntrySummary = {
      id: entryId,
      accountId: persistenceFixture.accountId as never,
      medicalRecordId: recordId,
      encounterId: encounterId as never,
      patientId: persistenceFixture.patientId as never,
      entryType: 'anamnesis',
      title: 'Test Entry',
      content: 'Test content for persistence',
      authoredByUserId: persistenceFixture.vetUserId as never,
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

  tenantIt('should persist and retrieve clinical timeline events', async () => {
    const now = new Date().toISOString();
    const recordId = `mr_test_ct_${Date.now()}` as MedicalRecordId;
    const encounterId = await createPersistenceEncounter();

    const record: MedicalRecordSummary = {
      id: recordId,
      accountId: persistenceFixture.accountId as never,
      encounterId: encounterId as never,
      patientId: persistenceFixture.patientId as never,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    await mrRepo.create(record);

    const eventId = `ct_test_${Date.now()}` as ClinicalTimelineEventSummary['id'];
    const event: ClinicalTimelineEventSummary = {
      id: eventId,
      accountId: persistenceFixture.accountId as never,
      medicalRecordId: recordId,
      encounterId: encounterId as never,
      eventType: 'record_created',
      summary: 'Record created for test',
      actorUserId: persistenceFixture.vetUserId as never,
      occurredAt: now
    };

    await ctRepo.create(event);

    const found = await ctRepo.findByMedicalRecordId(recordId);
    assert.ok(found.length > 0, 'Timeline events should be found');
    assert.equal(found[0].id, eventId);
    assert.equal(found[0].eventType, 'record_created');
  });

  tenantIt('should persist and retrieve notifications', async () => {
    const now = new Date().toISOString();
    const notifId = randomUUID() as NotificationId;

    const notification: NotificationSummary = {
      id: notifId,
      accountId: persistenceFixture.accountId as never,
      channel: 'internal',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification for persistence',
      severity: 'low',
      status: 'queued',
      createdByUserId: persistenceFixture.financeUserId as never,
      createdAt: now
    };

    await notifRepo.createNotification(notification);

    const found = await notifRepo.findNotificationById(notifId);
    assert.ok(found, 'Notification should be found');
    assert.equal(found?.id, notifId);
    assert.equal(found?.title, 'Test Notification');
    assert.equal(found?.status, 'queued');
  });

  tenantIt('should persist and retrieve staff members', async () => {
    const created = await staffRepo.create({
      accountId: persistenceFixture.accountId as never,
      userId: null,
      employeeCode: `STAFF-${Date.now()}`,
      fullName: 'Staff Persistido',
      department: 'Operacoes',
      jobTitle: 'Supervisor'
    });

    const found = await staffRepo.findById(created.id);
    assert.ok(found, 'Staff member should be found');
    assert.equal(found?.employeeCode, created.employeeCode);
    assert.equal(found?.fullName, 'Staff Persistido');
  });

  tenantIt('should persist and retrieve notification jobs', async () => {
    const now = new Date().toISOString();
    const notifId = randomUUID() as NotificationId;

    const notification: NotificationSummary = {
      id: notifId,
      accountId: persistenceFixture.accountId as never,
      channel: 'internal',
      category: 'system',
      title: 'Test Notification for Job',
      message: 'Test message',
      severity: 'low',
      status: 'queued',
      createdByUserId: persistenceFixture.financeUserId as never,
      createdAt: now
    };
    await notifRepo.createNotification(notification);

    const jobId = randomUUID() as NotificationJobId;
    const job: NotificationJobSummary = {
      id: jobId,
      accountId: persistenceFixture.accountId as never,
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

  tenantIt(
    'should let API and worker in separate processes share notification state through DB',
    async () => {
      const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
      const runtime = createApiRuntime({
        authSecret: 'test-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        repositories: bootstrap.repositories,
        fileStorage: bootstrap.fileStorage
      });
      await runtime.initialize();

      const financeLogin = (await runtime.auth.login(
        { username: 'finance', password: 'seed_finance', accountId: persistenceFixture.accountId },
        'corr_db_worker_process'
      )) as AuthSessionResponse;
      const finance = runtime.auth.authenticateAccessToken(financeLogin.accessToken);

      const notification = await runtime.notifications.create(
        finance.user.id,
        finance.user.accountId,
        {
          category: 'operations',
          severity: 'high',
          title: 'Worker process integration',
          message: 'Notification created by API and processed by external worker process'
        }
      );

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
    }
  );

  tenantIt('should persist scheduling queue entries across runtime restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_queue_persistence'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

    const queued = await runtime.scheduling.checkIn(reception.user.accountId, {
      patientId: persistenceFixture.patientId as never,
      ownerId: persistenceFixture.ownerId as never,
      reason: 'Queue persistence across restart',
      priority: 'high'
    });
    await runtime.scheduling.callQueueEntry(queued.id);

    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtimeAfterRestart.initialize();

    const restored = runtimeAfterRestart.scheduling.getQueueEntryOrThrow(queued.id);
    assert.equal(restored.status, 'called');
    assert.equal(restored.reason, 'Queue persistence across restart');
    assert.equal(runtimeAfterRestart.scheduling.getQueue().length >= 1, true);
  });

  tenantIt('should persist triage revision history across runtime restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const patientFixture = await createPersistencePatient();
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_triage_versions_reception'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: patientFixture.patientId as never,
        ownerId: patientFixture.ownerId as never,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Triage revision persistence'
      }
    );
    await runtime.encounters.waitForPersistence();

    const nurseLogin = (await runtime.auth.login(
      { username: 'nurse', password: 'seed_nurse', accountId: persistenceFixture.accountId },
      'corr_db_triage_versions_nurse'
    )) as AuthSessionResponse;
    const nurse = runtime.auth.authenticateAccessToken(nurseLogin.accessToken);

    const triage = await runtime.triage.createTriage(
      nurse.user.id,
      {
        encounterId: encounter.id,
        patientId: encounter.patientId,
        priority: 'medium',
        chiefComplaint: 'Apatia',
        initialNotes: 'Paciente quieto',
        alerts: ['letargia'],
        destination: 'observation'
      },
      nurse.user.accountId
    );
    await runtime.triage.updateTriage(
      triage.id,
      {
        priority: 'high',
        chiefComplaint: 'Apatia com desidratacao',
        alerts: ['letargia', 'desidratacao'],
        destination: 'in_care'
      },
      nurse.user.accountId,
      nurse.user.id
    );

    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtimeAfterRestart.initialize();

    const versions = runtimeAfterRestart.triage.listVersions(
      triage.id,
      persistenceFixture.accountId as never
    );
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.nextSnapshot.destination, 'in_care');
    assert.equal(versions[0]?.changedFields.includes('priority'), true);
  });

  tenantIt(
    'should persist inpatient stay lifecycle across runtime and repository reads',
    async () => {
      const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
      const patientFixture = await createPersistencePatient();
      const runtime = createApiRuntime({
        authSecret: 'test-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        repositories: bootstrap.repositories,
        fileStorage: bootstrap.fileStorage
      });
      await runtime.initialize();

      const receptionLogin = (await runtime.auth.login(
        {
          username: 'reception',
          password: 'seed_reception',
          accountId: persistenceFixture.accountId
        },
        'corr_db_inpatient_reception'
      )) as AuthSessionResponse;
      const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
      const encounter = runtime.encounters.openEncounter(
        reception.user.accountId,
        reception.user.id,
        {
          patientId: patientFixture.patientId as never,
          ownerId: patientFixture.ownerId as never,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Teste de persistencia de internacao'
        }
      );
      await runtime.encounters.waitForPersistence();

      const stay = runtime.inpatient.admit({
        encounterId: encounter.id,
        patientId: encounter.patientId,
        unit: 'Internacao Clinica',
        ward: 'Ala Teste',
        bed: 'IT-01'
      });

      const progress = runtime.inpatient.addProgress(
        persistenceFixture.vetUserId as never,
        {
          stayId: stay.id,
          note: 'Paciente em observacao inicial'
        },
        persistenceFixture.accountId as never
      );
      const occurrence = runtime.inpatient.addOccurrence(
        persistenceFixture.vetUserId as never,
        {
          stayId: stay.id,
          type: 'clinical',
          severity: 'attention',
          title: 'Hiporexia',
          description: 'Paciente recusou dieta durante o plantao'
        },
        persistenceFixture.accountId as never
      );
      const dailyCharge = runtime.inpatient.createDailyCharge(
        persistenceFixture.vetUserId as never,
        {
          stayId: stay.id,
          description: 'Diaria internacao clinica',
          chargeDate: '2026-05-28',
          quantity: 2,
          unitAmount: 150
        },
        persistenceFixture.accountId as never
      );
      const billedDailyCharge = runtime.inpatient.markDailyChargeBilled(
        stay.id,
        dailyCharge.id,
        {
          billingRecordId: persistenceFixture.billingRecordId
        },
        persistenceFixture.accountId as never
      );

      const transferred = runtime.inpatient.updateStatus(
        stay.id,
        {
          status: 'transferred',
          transferToUnit: 'UTI',
          transferToWard: 'Sala 2'
        },
        persistenceFixture.accountId as never
      );
      await runtime.inpatient.waitForPersistence();

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
      assert.equal(
        (persistedProgress as readonly InpatientProgressSummary[])[0].note,
        progress.note
      );

      const persistedOccurrences = await waitFor(
        () => inpatientOccurrenceRepo.findByStayId(stay.id),
        (items) => Boolean(items && items.length > 0)
      );
      assert.equal(
        (persistedOccurrences as readonly InpatientOccurrenceSummary[])[0]?.title,
        occurrence.title
      );

      const persistedDailyCharges = await waitFor(
        () => inpatientDailyChargeRepo.findByStayId(stay.id),
        (items) => Boolean(items?.some((item) => item.status === 'billed'))
      );
      const persistedDailyCharge = (
        persistedDailyCharges as readonly InpatientDailyChargeSummary[]
      ).find((item) => item.id === billedDailyCharge.id);
      assert.equal(persistedDailyCharge?.totalAmount, 300);
      assert.equal(persistedDailyCharge?.status, 'billed');
      assert.equal(persistedDailyCharge?.billingRecordId, persistenceFixture.billingRecordId);

      const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
      const stayAfterRestart = await waitFor(
        async () => bootstrapAfterRestart.repositories.inpatientStay?.findById(stay.id),
        (current) => current?.status === transferred.status && current?.transferToUnit === 'UTI'
      );
      assert.ok(stayAfterRestart, 'New bootstrap should read persisted inpatient stay');
      assert.equal(stayAfterRestart?.status, transferred.status);
      assert.equal(stayAfterRestart?.transferToUnit, 'UTI');
      const occurrencesAfterRestart =
        await bootstrapAfterRestart.repositories.inpatientOccurrence?.findByStayId(stay.id);
      const chargesAfterRestart =
        await bootstrapAfterRestart.repositories.inpatientDailyCharge?.findByStayId(stay.id);
      assert.equal(occurrencesAfterRestart?.[0]?.title, occurrence.title);
      assert.equal(
        chargesAfterRestart?.find((item) => item.id === billedDailyCharge.id)?.status,
        'billed'
      );
    }
  );

  tenantIt('should persist surgery lifecycle across runtime and repository reads', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const patientFixture = await createPersistencePatient();
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_surgery_reception'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: patientFixture.patientId as never,
        ownerId: patientFixture.ownerId as never,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de cirurgia'
      }
    );
    await runtime.encounters.waitForPersistence();

    const surgeryCase = runtime.surgery.requestCase({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      procedureName: 'Ovariohisterectomia teste',
      surgeonUserId: persistenceFixture.surgeonUserId as never,
      surgicalTeam: [persistenceFixture.anesthetistUserId, persistenceFixture.nurseUserId],
      scheduledAt: new Date().toISOString()
    });

    runtime.surgery.updateStatus(surgeryCase.id, { status: 'pre_op' });
    runtime.surgery.updateStatus(surgeryCase.id, { status: 'in_progress' });
    const completed = runtime.surgery.updateStatus(surgeryCase.id, {
      status: 'recovery',
      operativeNotes: 'Procedimento realizado sem intercorrencias'
    });
    await runtime.surgery.waitForPersistence();

    const persistedCase = await waitFor(
      () => surgeryCaseRepo.findById(surgeryCase.id),
      (current) =>
        current?.status === 'recovery' &&
        current?.surgeonUserId === persistenceFixture.surgeonUserId &&
        Boolean(current?.endedAt)
    );
    assert.ok(persistedCase, 'Persisted surgery case should be found');
    assert.equal(persistedCase?.encounterId, encounter.id);
    assert.equal(persistedCase?.surgeonUserId, persistenceFixture.surgeonUserId);
    assert.deepEqual(persistedCase?.surgicalTeam, [
      persistenceFixture.anesthetistUserId,
      persistenceFixture.nurseUserId
    ]);
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

  tenantIt('should persist diagnostic lifecycle across runtime and repository reads', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const patientFixture = await createPersistencePatient();
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_diag_reception'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: patientFixture.patientId as never,
        ownerId: patientFixture.ownerId as never,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de diagnostico'
      }
    );
    await runtime.encounters.waitForPersistence();

    const order = await runtime.diagnostics.createOrderAndPersist({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Check-up cirurgico'
    });

    await runtime.diagnostics.recordResultAndPersist(order.id, {
      status: 'collected',
      collectedByUserId: persistenceFixture.labUserId
    });

    await sleep(50);

    const resulted = await runtime.diagnostics.recordResultAndPersist(order.id, {
      status: 'resulted',
      resultSummary: 'Hemograma sem alteracoes relevantes',
      resultAttachmentId: 'att_diag_test' as never,
      releasedByUserId: persistenceFixture.labUserId
    });

    await sleep(50);

    const persistedOrder = await waitFor(
      () => diagnosticOrderRepo.findById(order.id),
      (current) =>
        current?.status === 'resulted' &&
        current?.collectedByUserId === persistenceFixture.labUserId &&
        current?.examCatalogId === 'cat_001'
    );
    assert.ok(persistedOrder, 'Persisted diagnostic order should be found');
    assert.equal(persistedOrder?.encounterId, encounter.id);
    assert.equal(persistedOrder?.examCatalogId, 'cat_001');
    assert.equal(persistedOrder?.collectedByUserId, persistenceFixture.labUserId);
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

  tenantIt(
    'should persist attachment metadata and file content across runtime restart',
    async () => {
      const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
      const patientFixture = await createPersistencePatient();
      const runtime = createApiRuntime({
        authSecret: 'test-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        repositories: bootstrap.repositories,
        fileStorage: bootstrap.fileStorage
      });
      await runtime.initialize();

      const receptionLogin = (await runtime.auth.login(
        {
          username: 'reception',
          password: 'seed_reception',
          accountId: persistenceFixture.accountId
        },
        'corr_db_attachment_reception'
      )) as AuthSessionResponse;
      const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
      const encounter = runtime.encounters.openEncounter(
        reception.user.accountId,
        reception.user.id,
        {
          patientId: patientFixture.patientId as never,
          ownerId: patientFixture.ownerId as never,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Teste de persistencia de anexo'
        }
      );
      await runtime.encounters.waitForPersistence();

      const vetLogin = (await runtime.auth.login(
        { username: 'vet', password: 'seed_vet', accountId: persistenceFixture.accountId },
        'corr_db_attachment_vet'
      )) as AuthSessionResponse;
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
    }
  );

  tenantIt('should persist entry versioning and revisions across runtime restart', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const patientFixture = await createPersistencePatient();
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_versioning_reception'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: patientFixture.patientId as never,
        ownerId: patientFixture.ownerId as never,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de persistencia de revisao clinica'
      }
    );
    await runtime.encounters.waitForPersistence();

    const vetLogin = (await runtime.auth.login(
      { username: 'vet', password: 'seed_vet', accountId: persistenceFixture.accountId },
      'corr_db_versioning_vet'
    )) as AuthSessionResponse;
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

  tenantIt(
    'should archive clinical entries with version guard and preserve history across restart',
    async () => {
      const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
      const patientFixture = await createPersistencePatient();
      const runtime = createApiRuntime({
        authSecret: 'test-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        repositories: bootstrap.repositories,
        fileStorage: bootstrap.fileStorage
      });
      await runtime.initialize();

      const receptionLogin = (await runtime.auth.login(
        {
          username: 'reception',
          password: 'seed_reception',
          accountId: persistenceFixture.accountId
        },
        'corr_db_archive_reception'
      )) as AuthSessionResponse;
      const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);
      const encounter = runtime.encounters.openEncounter(
        reception.user.accountId,
        reception.user.id,
        {
          patientId: patientFixture.patientId as never,
          ownerId: patientFixture.ownerId as never,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Teste de arquivamento clinico'
        }
      );
      await runtime.encounters.waitForPersistence();

      const vetLogin = (await runtime.auth.login(
        { username: 'vet', password: 'seed_vet', accountId: persistenceFixture.accountId },
        'corr_db_archive_vet'
      )) as AuthSessionResponse;
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
    }
  );

  tenantIt('should persist sector, bed and bedmap with inpatient integration', async () => {
    const bootstrap = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const patientFixture = await createPersistencePatient();
    const runtime = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage,
      sectorBedOptions: { databaseClient: db }
    });
    await runtime.initialize();

    const receptionLogin = (await runtime.auth.login(
      {
        username: 'reception',
        password: 'seed_reception',
        accountId: persistenceFixture.accountId
      },
      'corr_db_sector_bed'
    )) as AuthSessionResponse;
    const reception = runtime.auth.authenticateAccessToken(receptionLogin.accessToken);

    // 1. Create sector
    const sector = await runtime.sectorBedService.createSector(reception.user.accountId as never, {
      code: 'UTI-VET',
      name: 'UTI Veterinaria',
      kind: 'icu'
    });
    assert.ok(sector.id, 'Sector should have an ID');
    assert.equal(sector.code, 'UTI-VET');
    assert.equal(sector.kind, 'icu');

    // 2. Create bed
    const bed = await runtime.sectorBedService.createBed(reception.user.accountId as never, {
      sectorId: sector.id,
      code: 'UTI-01',
      name: 'Leito UTI 01',
      supportsSpecies: 'caninos'
    });
    assert.ok(bed.id, 'Bed should have an ID');
    assert.equal(bed.sectorId, sector.id);
    assert.equal(bed.status, 'available');

    // 3. Create encounter and admit with sector/bed
    const encounter = runtime.encounters.openEncounter(
      reception.user.accountId,
      reception.user.id,
      {
        patientId: patientFixture.patientId as never,
        ownerId: patientFixture.ownerId as never,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Teste de internacao com setor/leito'
      }
    );
    await runtime.encounters.waitForPersistence();

    const stay = runtime.inpatient.admit({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: 'UTI',
      ward: 'Ala Central',
      bed: 'UTI-01',
      sectorId: sector.id,
      bedId: bed.id
    });
    assert.ok(stay.id, 'Stay should have an ID');
    assert.equal(stay.sectorId, sector.id);
    assert.equal(stay.bedId, bed.id);
    await runtime.inpatient.waitForPersistence();

    // 4. Wait for bed status to be persisted
    await sleep(100);

    // 5. Check bedmap
    const bedMap = await runtime.sectorBedService.buildBedMap(reception.user.accountId as never);
    assert.ok(bedMap.items.length > 0, 'BedMap should have sectors');
    const sectorMap = bedMap.items.find((s) => s.sectorId === sector.id);
    assert.ok(sectorMap, 'Sector should be in bedmap');
    assert.equal(sectorMap.totalBeds, 1);
    assert.equal(sectorMap.occupiedBeds, 1);
    const bedInMap = sectorMap.beds.find((b) => b.id === bed.id);
    assert.ok(bedInMap, 'Bed should be in bedmap');
    assert.equal(bedInMap.status, 'occupied');
    assert.equal(bedInMap.patientId, encounter.patientId);

    // 6. Transfer bed
    const bed2 = await runtime.sectorBedService.createBed(reception.user.accountId as never, {
      sectorId: sector.id,
      code: 'UTI-02',
      name: 'Leito UTI 02',
      supportsSpecies: 'caninos'
    });

    const transferred = await runtime.inpatient.transferBed(
      stay.id,
      {
        sectorId: sector.id,
        bedId: bed2.id
      },
      reception.user.accountId
    );
    assert.equal(transferred.status, 'transferred');
    assert.equal(transferred.transferToBedId, bed2.id);

    // 7. Discharge - should free the bed (need to go back to admitted first)
    const readmitted = runtime.inpatient.updateStatus(
      stay.id,
      {
        status: 'admitted'
      },
      reception.user.accountId
    );
    runtime.inpatient.updateStatus(
      stay.id,
      {
        status: 'discharged',
        dischargeReason: 'Alta medica'
      },
      reception.user.accountId
    );
    await runtime.inpatient.waitForPersistence();

    // 8. Persist and verify after restart
    await sleep(100);

    const bootstrapAfterRestart = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    const runtimeAfterRestart = createApiRuntime({
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrapAfterRestart.repositories,
      fileStorage: bootstrapAfterRestart.fileStorage,
      sectorBedOptions: { databaseClient: db }
    });

    const sectorsAfterRestart = await runtimeAfterRestart.sectorBedService.listSectors(
      reception.user.accountId as never
    );
    assert.ok(
      sectorsAfterRestart.find((s) => s.id === sector.id),
      'Sector should persist after restart'
    );

    const bedsAfterRestart = await runtimeAfterRestart.sectorBedService.listBeds(
      reception.user.accountId as never,
      sector.id as never
    );
    assert.ok(
      bedsAfterRestart.find((b) => b.id === bed.id),
      'Bed should persist after restart'
    );
    assert.ok(
      bedsAfterRestart.find((b) => b.id === bed2.id),
      'Second bed should persist after restart'
    );

    const stayAfterRestart = await bootstrapAfterRestart.repositories.inpatientStay?.findById(
      stay.id
    );
    assert.ok(stayAfterRestart, 'Stay should persist after restart');
    assert.equal(stayAfterRestart?.sectorId, sector.id);
    assert.equal(stayAfterRestart?.bedId, bed2.id);
    assert.equal(stayAfterRestart?.status, 'discharged');
  });
});
