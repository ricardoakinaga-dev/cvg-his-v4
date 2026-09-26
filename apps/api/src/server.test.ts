import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, createHmac } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { ChaosEngine } from '@cvg-his-v2/chaos';
import type { PersistedSessionRecord, SessionRepository } from '@cvg-his-v2/module-auth';
import {
  DatabaseEncounterRepository,
  type EncounterRepository
} from '@cvg-his-v2/module-encounters';
import { createRateLimiter } from '@cvg-his-v2/shared-rate-limiter';
import { getTenantContext } from '@cvg-his-v2/tenant-context';
import {
  MAX_ATTACHMENT_BASE64_LENGTH,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
  MAX_ATTACHMENT_JSON_BODY_BYTES
} from '@cvg-his-v2/shared-contracts';
import { PayloadTooLargeError } from '@cvg-his-v2/shared-errors';
import {
  ClamAvAttachmentSecurityScanner,
  S3CompatibleFileStorage
} from '@cvg-his-v2/module-attachments';

import { setAppState } from './app-state.js';
import {
  recordRequestSloObservation,
  resetClinicalOperationalMetrics,
  resetActiveRequestsCount,
  resetRequestSloObservations,
  getMetricsText,
  resetDatabasePoolMetrics,
  updateDatabasePoolMetrics
} from './metrics.js';
import {
  assertDistributedStateReadiness,
  assertProductionProviderReadiness,
  buildAuthenticatedActorAttributes,
  decodeAttachmentContent
} from './server.js';
import { applySecurityHeaders, isSecureRequest } from './http/security-headers.js';
import { bootstrapServices } from './bootstrap.js';
import { createInMemoryRuntimeRepositories } from './runtime-repositories.js';
import { InMemoryLaboratoryResultImportRepository } from './laboratory-result-import-repository.js';
import { createAttachmentDownloadToken } from './helpers/attachment-download-token.js';
import {
  createServerUnderTest,
  login,
  MockResponse,
  performRequest,
  type ApiTestServer
} from './server-test-support.js';

function createTestPrincipal() {
  return {
    user: {
      id: 'user-1',
      accountId: 'account-1',
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {} as never,
    access: {
      roleCodes: ['admin'],
      permissionCodes: [],
      capabilities: []
    }
  } as never;
}

test('ABAC actor branches cannot be supplied by an HTTP request header', () => {
  const actor = buildAuthenticatedActorAttributes(createTestPrincipal(), {
    teams: [{ id: 'team-1' }],
    sectors: [{ id: 'sector-1', code: 'reception' }]
  });

  assert.deepEqual(actor.branchIds, []);
  assert.deepEqual(actor.teamIds, ['team-1']);
  assert.deepEqual(actor.sectorIds, ['sector-1']);
  assert.deepEqual(actor.sectorCodes, ['reception']);
});

function createNonAdminAuditWriteRepositories() {
  const accountId = 'acc_reprocess_http';
  const userId = 'user_reprocess_operator';
  const createdAt = '2026-08-29T00:00:00.000Z';
  const user = {
    id: userId,
    accountId,
    username: 'audit-operator',
    email: 'audit-operator@example.test',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_audit_operator',
    fullName: 'Audit Operator',
    isActive: true,
    principalKind: 'human' as const,
    interactiveLoginEnabled: true,
    createdAt,
    updatedAt: createdAt
  };
  const permission = {
    id: 'perm_audit_write',
    key: 'audit.write',
    description: 'Write audit trail events.',
    createdAt
  };
  const role = {
    id: 'role_audit_operator',
    code: 'audit_operator',
    name: 'Audit Operator',
    description: 'Non-administrative audit operator for HTTP authorization tests.',
    createdAt,
    permissionCodes: ['audit.write']
  };

  const users = {
    create: async () => undefined,
    update: async () => undefined,
    upgradePasswordHash: async () => false,
    findById: async (requestedUserId: string) => (requestedUserId === userId ? user : null),
    findByUsername: async (requestedAccountId: string, username: string) =>
      requestedAccountId === accountId && username === user.username ? user : null,
    findByEmail: async (requestedAccountId: string, email: string) =>
      requestedAccountId === accountId && email === user.email ? user : null,
    findAll: async () => [user],
    findRoleCodesByUserId: async (requestedUserId: string) =>
      requestedUserId === userId ? ['audit_operator'] : [],
    findByAccountId: async (requestedAccountId: string) =>
      requestedAccountId === accountId ? [user] : []
  };

  const accessControl = {
    findAllRoles: async () => [role],
    findAllPermissions: async () => [permission],
    findAllTeams: async () => [],
    findAllSectors: async () => [],
    findTeamMemberships: async () => [],
    findSectorMemberships: async () => [],
    findPermissionAssignments: async () => [],
    findUserIdsByAccount: async (requestedAccountId: string) =>
      requestedAccountId === accountId ? [userId] : [],
    findRolesByUser: async (requestedUserId: string) => (requestedUserId === userId ? [role] : [])
  };

  return {
    accountId,
    repositories: {
      users: users as never,
      accessControl: accessControl as never
    }
  };
}

class DurableLaboratoryResultImportTestRepository extends InMemoryLaboratoryResultImportRepository {
  override readonly storage = 'durable' as const;
}

async function performRawHttpRequest(
  server: ApiTestServer,
  input: {
    readonly path: string;
    readonly headers: Record<string, string>;
    readonly body: Buffer;
  }
): Promise<{ readonly statusCode: number; readonly body: string }> {
  await server.ready;
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return await new Promise((resolve, reject) => {
      const request = httpRequest(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: input.path,
          method: 'POST',
          headers: {
            ...input.headers,
            'content-length': String(input.body.length)
          }
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
          response.once('end', () =>
            resolve({
              statusCode: response.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8')
            })
          );
          response.once('error', reject);
        }
      );
      request.once('error', reject);
      request.end(input.body);
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await server.closeDependencies();
  }
}

test('server preserves the raw signed equipment-bridge body through HTTP dispatch', async () => {
  const accountId = 'acc_lab_server_http';
  const providerKeyId = 'lab-server-key';
  const providerSecret = Buffer.alloc(32, 0x37);
  const nowSeconds = 1_756_400_000;
  const payload = {
    schemaVersion: '1',
    provider: 'equipment-bridge',
    externalResultId: 'server-http-result',
    orderId: 'server-http-order',
    equipmentId: 'server-http-equipment',
    resultSummary: 'Hemoglobina: 7.2',
    observedAt: '2026-08-29T03:33:20.000Z'
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const timestamp = String(nowSeconds);
  const signature = `v1=${createHmac('sha256', providerSecret)
    .update(Buffer.from(`v1.${timestamp}.`, 'ascii'))
    .update(body)
    .digest('hex')}`;
  const runtimeRepositories = createInMemoryRuntimeRepositories();
  const apiKeys = new ApiKeysService(runtimeRepositories.apiKey);
  const created = await apiKeys.create({
    accountId: accountId as never,
    name: 'Server laboratory bridge',
    permissions: ['laboratory.results.write'],
    createdBy: 'test'
  });
  const laboratoryResultImports = new DurableLaboratoryResultImportTestRepository();
  const server = createServerUnderTest({
    repositories: {
      apiKey: runtimeRepositories.apiKey,
      laboratoryResultImport: laboratoryResultImports
    } as never,
    laboratoryProviderKeyring: new Map([[providerKeyId, { accountId, secret: providerSecret }]]),
    laboratoryProviderNowSeconds: () => nowSeconds
  });

  const result = await performRawHttpRequest(server, {
    path: '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': created.rawKey,
      'content-type': 'application/json',
      'x-lab-provider-key-id': providerKeyId,
      'x-lab-timestamp': timestamp,
      'x-lab-signature': signature
    },
    body
  });

  assert.equal(result.statusCode, 202);
  assert.equal(JSON.parse(result.body).status, 'pending_human_review');
  assert.equal((await laboratoryResultImports.list(accountId)).length, 1);
});

test('API server exposes idempotent cleanup for distributed limiter connections', async () => {
  let closeCalls = 0;
  const limiter = {
    check: async () => ({
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      blocked: false,
      retryAfterMs: 0
    }),
    healthCheck: async () => ({
      healthy: true,
      backend: 'redis' as const,
      detail: 'test'
    }),
    close: async () => {
      closeCalls += 1;
    }
  };
  const server = createServerUnderTest({
    runtimeDistributedStateEnabled: true,
    redisUrl: 'redis://127.0.0.1:6379/0',
    authRateLimiter: limiter,
    pixPaymentAttemptRateLimiter: limiter,
    pixProviderWebhookRateLimiter: limiter
  });

  await Promise.all([server.closeDependencies(), server.closeDependencies()]);
  assert.equal(closeCalls, 3);
});

function createDatabaseConflictEncounterRepository(): EncounterRepository {
  let createAttempts = 0;
  const databaseClient = {
    async execute() {
      createAttempts += 1;
      if (createAttempts > 1) {
        const cause = Object.assign(new Error('duplicate active encounter'), {
          code: '23505',
          constraint: 'uidx_encounters_one_active_per_patient'
        });
        throw Object.assign(new Error('Failed query'), { cause });
      }
      return { rowCount: 1 };
    },
    select() {
      return {
        from() {
          return {
            async where() {
              // Keep each runtime's hot cache empty so the second request
              // reaches the simulated database unique violation.
              return [];
            }
          };
        }
      };
    }
  };

  return new DatabaseEncounterRepository(databaseClient as never);
}

async function assertAccountScopedCollectionVisibility(
  server: ApiTestServer,
  collectionUrl: string,
  ownerAccessToken: string,
  foreignAccessToken: string,
  itemId: string
): Promise<void> {
  const listFor = async (accessToken: string) =>
    performRequest(server, {
      method: 'GET',
      url: collectionUrl,
      headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
    });
  const [ownerResponse, foreignResponse] = await Promise.all([
    listFor(ownerAccessToken),
    listFor(foreignAccessToken)
  ]);
  assert.equal(ownerResponse.statusCode, 200, `${collectionUrl} owner list`);
  assert.equal(foreignResponse.statusCode, 200, `${collectionUrl} foreign list`);
  const ownerItems = ownerResponse.bodyJson<{ items: Array<{ id: string }> }>().items;
  const foreignItems = foreignResponse.bodyJson<{ items: Array<{ id: string }> }>().items;
  assert.ok(
    ownerItems.some((item) => item.id === itemId),
    `${collectionUrl} owner can list item`
  );
  assert.equal(
    foreignItems.some((item) => item.id === itemId),
    false,
    `${collectionUrl} foreign account cannot list item`
  );
  const nestedPathResponse = await performRequest(server, {
    method: 'GET',
    url: `${collectionUrl}/${itemId}/extra`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(nestedPathResponse.statusCode, 404, `${collectionUrl} rejects nested item path`);
}

function createTwoAccountTriageServer(
  options: {
    readonly attachmentRepository?: unknown;
    readonly fileStorage?: unknown;
    readonly useInMemoryCatalogStores?: boolean;
  } = {}
) {
  const accounts = ['acc_triage_http_a', 'acc_triage_http_b'];
  const createdAt = '2026-04-01T10:00:00.000Z';
  const users = accounts.map((accountId, index) => ({
    id: `user_triage_http_${index}`,
    accountId,
    username: `triage_admin_${index}`,
    email: `triage_admin_${index}@example.test`,
    passwordHash: `cvg-his-v2-seed-salt-v1:seed_admin_${index}`,
    fullName: `Triage Admin ${index}`,
    isActive: true,
    principalKind: 'human' as const,
    interactiveLoginEnabled: true,
    roleCode: 'admin',
    createdAt,
    updatedAt: createdAt
  }));
  const encounters = accounts.map((accountId, index) => ({
    id: `enc_triage_http_${index}`,
    accountId,
    patientId: `patient_triage_http_${index}`,
    ownerId: `owner_triage_http_${index}`,
    visitType: 'walk_in' as const,
    origin: 'reception' as const,
    reason: 'HTTP tenant isolation',
    status: 'observation' as 'observation' | 'closed',
    openedAt: createdAt,
    createdByUserId: users[index]!.id,
    createdAt,
    updatedAt: createdAt
  }));
  const triageRecords = accounts.map((accountId, index) => ({
    id: `triage_http_${index}`,
    accountId,
    encounterId: encounters[index]!.id,
    patientId: encounters[index]!.patientId,
    priority: index === 0 ? ('high' as const) : ('critical' as const),
    chiefComplaint: `Queixa da conta ${index}`,
    initialNotes: undefined,
    alerts: [`alerta-${index}`],
    destination: 'observation' as const,
    triagedByUserId: users[index]!.id,
    createdAt,
    updatedAt: createdAt
  }));
  const triageVersions = triageRecords.map((record, index) => ({
    id: `triage_version_http_${index}`,
    triageId: record.id,
    accountId: record.accountId,
    encounterId: record.encounterId,
    changedFields: ['priority'],
    previousSnapshot: {
      priority: 'medium' as const,
      chiefComplaint: record.chiefComplaint,
      initialNotes: record.initialNotes,
      alerts: record.alerts,
      destination: record.destination,
      updatedAt: record.updatedAt
    },
    nextSnapshot: {
      priority: record.priority,
      chiefComplaint: record.chiefComplaint,
      initialNotes: record.initialNotes,
      alerts: record.alerts,
      destination: record.destination,
      updatedAt: record.updatedAt
    },
    changedByUserId: record.triagedByUserId,
    createdAt: record.updatedAt
  }));
  const diagnosticOrders = accounts.map((accountId, index) => ({
    id: `diagnostic_http_${index}`,
    accountId,
    encounterId: encounters[index]!.id,
    patientId: encounters[index]!.patientId,
    examType: 'Hemograma',
    reason: `Diagnostico da conta ${index}`,
    status: 'requested' as const,
    createdAt,
    updatedAt: createdAt
  }));

  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById(id: string) {
      return users.find((user) => user.id === id) ?? null;
    },
    async findByUsername(accountId: string, username: string) {
      return (
        users.find((user) => user.accountId === accountId && user.username === username) ?? null
      );
    },
    async findByEmail(accountId: string, email: string) {
      return users.find((user) => user.accountId === accountId && user.email === email) ?? null;
    },
    async findAll() {
      return users;
    },
    async findRoleCodesByUserId() {
      return ['admin'];
    },
    async findByAccountId(accountId: string) {
      return users.filter((user) => user.accountId === accountId);
    }
  };
  const encounterRepository = {
    async create() {},
    async update() {},
    async findById(id: string) {
      return encounters.find((encounter) => encounter.id === id) ?? null;
    },
    async findActiveByPatientId() {
      return null;
    },
    async findAll(accountId: string) {
      return encounters.filter((encounter) => encounter.accountId === accountId);
    },
    async findActive(accountId: string) {
      return encounters.filter(
        (encounter) => encounter.accountId === accountId && encounter.status !== 'closed'
      );
    },
    async delete() {}
  };
  const triageRepository = {
    async create() {},
    async update() {},
    async createVersion() {},
    async findById(id: string, accountId: string) {
      return (
        triageRecords.find((record) => record.id === id && record.accountId === accountId) ?? null
      );
    },
    async findByEncounterId(encounterId: string, accountId: string) {
      return triageRecords.filter(
        (record) => record.encounterId === encounterId && record.accountId === accountId
      );
    },
    async findByAccountId(accountId: string) {
      return triageRecords.filter((record) => record.accountId === accountId);
    },
    async findVersionsByTriageId(triageId: string, accountId: string) {
      return triageVersions.filter(
        (version) => version.triageId === triageId && version.accountId === accountId
      );
    },
    async findVersionsByAccountId(accountId: string) {
      return triageVersions.filter((version) => version.accountId === accountId);
    }
  };
  const diagnosticOrderRepository = {
    async create() {},
    async update() {},
    async findById(id: string) {
      return diagnosticOrders.find((order) => order.id === id) ?? null;
    },
    async findAll(accountId: string) {
      return diagnosticOrders.filter((order) => order.accountId === accountId);
    },
    async findByEncounterId(encounterId: string) {
      return diagnosticOrders.filter((order) => order.encounterId === encounterId);
    }
  };

  return createServerUnderTest({
    repositories: {
      users: usersRepository,
      encounter: encounterRepository,
      triage: triageRepository,
      diagnosticOrder: diagnosticOrderRepository,
      attachment: options.attachmentRepository
    } as never,
    preserveSeedUsersWithRepository: true,
    fileStorage: options.fileStorage as never,
    ...(options.useInMemoryCatalogStores ? { useDatabaseCatalogStores: false } : {})
  });
}

function createTwoAccountMedicalRecordsServer(
  options: {
    readonly failNextTransaction?: boolean;
    readonly attachmentRepository?: unknown;
  } = {}
) {
  const accounts = ['acc_medical_http_a', 'acc_medical_http_b'];
  const createdAt = '2026-04-01T10:00:00.000Z';
  const users = accounts.map((accountId, index) => ({
    id: `user_medical_http_${index}`,
    accountId,
    username: `medical_admin_${index}`,
    email: `medical_admin_${index}@example.test`,
    passwordHash: `cvg-his-v2-seed-salt-v1:seed_medical_${index}`,
    fullName: `Medical Admin ${index}`,
    isActive: true,
    principalKind: 'human' as const,
    interactiveLoginEnabled: true,
    roleCode: 'admin',
    createdAt,
    updatedAt: createdAt
  }));
  const encounters = accounts.map((accountId, index) => ({
    id: `enc_medical_http_${index}`,
    accountId,
    patientId: `patient_medical_http_${index}`,
    ownerId: `owner_medical_http_${index}`,
    visitType: 'walk_in' as const,
    origin: 'reception' as const,
    reason: 'HTTP medical-record tenant isolation',
    status: 'in_care' as 'in_care' | 'closed',
    openedAt: createdAt,
    createdByUserId: users[index]!.id,
    createdAt,
    updatedAt: createdAt
  }));
  let records = accounts.map((accountId, index) => ({
    id: `medical_record_http_${index}`,
    accountId,
    encounterId: encounters[index]!.id,
    patientId: encounters[index]!.patientId,
    status: 'open' as const,
    createdAt,
    updatedAt: createdAt
  }));
  let entries = accounts.map((accountId, index) => ({
    id: `clinical_entry_http_${index}`,
    accountId,
    medicalRecordId: records[index]!.id,
    encounterId: encounters[index]!.id,
    patientId: encounters[index]!.patientId,
    entryType: 'progress_note' as const,
    title: `Private title ${index}`,
    content: `Private content ${index}`,
    authoredByUserId: users[index]!.id,
    version: 1,
    createdAt,
    updatedAt: createdAt
  }));
  let revisions = entries.map((entry) => ({
    id: `entry_revision_http_${entry.id}`,
    entryId: entry.id,
    version: 1,
    title: entry.title,
    content: entry.content,
    authorUserId: entry.authoredByUserId,
    reason: 'Initial clinical entry',
    createdAt
  }));
  let timeline = records.map((record, index) => ({
    id: `timeline_http_${index}`,
    accountId: record.accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    eventType: 'record_created' as const,
    summary: `Private timeline ${index}`,
    actorUserId: users[index]!.id,
    occurredAt: createdAt
  }));
  const patients = accounts.map((accountId, index) => ({
    id: encounters[index]!.patientId,
    accountId,
    name: `HTTP Patient ${index}`,
    species: 'canine',
    sex: 'unknown' as const,
    primaryOwnerId: `owner_medical_http_${index}`,
    status: 'active' as const,
    createdAt,
    updatedAt: createdAt
  }));

  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById(id: string) {
      return users.find((user) => user.id === id) ?? null;
    },
    async findByUsername(accountId: string, username: string) {
      return (
        users.find((user) => user.accountId === accountId && user.username === username) ?? null
      );
    },
    async findByEmail(accountId: string, email: string) {
      return users.find((user) => user.accountId === accountId && user.email === email) ?? null;
    },
    async findAll() {
      return users;
    },
    async findRoleCodesByUserId() {
      return ['admin'];
    },
    async findByAccountId(accountId: string) {
      return users.filter((user) => user.accountId === accountId);
    }
  };
  const encounterRepository = {
    async create() {},
    async update() {},
    async findById(id: string) {
      return encounters.find((encounter) => encounter.id === id) ?? null;
    },
    async findActiveByPatientId() {
      return null;
    },
    async findAll(accountId: string) {
      return encounters.filter((encounter) => encounter.accountId === accountId);
    },
    async findActive(accountId: string) {
      return encounters.filter(
        (encounter) => encounter.accountId === accountId && encounter.status !== 'closed'
      );
    },
    async delete() {}
  };
  const patientRepository = {
    async create() {},
    async update() {},
    async findById(id: string) {
      return patients.find((patient) => patient.id === id) ?? null;
    },
    async findByAccountId(accountId: string) {
      return patients.filter((patient) => patient.accountId === accountId);
    },
    async delete() {}
  };
  const medicalRecordRepository = {
    async create(record: (typeof records)[number]) {
      records = [...records, { ...record }];
    },
    async update(record: (typeof records)[number]) {
      records = records.map((candidate) =>
        candidate.id === record.id ? { ...candidate, ...record } : candidate
      );
    },
    async findById(id: string) {
      return records.find((record) => record.id === id) ?? null;
    },
    async findByEncounterId(encounterId: string) {
      return records.find((record) => record.encounterId === encounterId) ?? null;
    },
    async findAll(accountId: string) {
      medicalRecordFindAllCalls += 1;
      return records.filter((record) => record.accountId === accountId);
    }
  };
  const clinicalEntryRepository = {
    async create(entry: (typeof entries)[number]) {
      entries = [...entries, { ...entry }];
    },
    async update(entry: (typeof entries)[number]) {
      entries = entries.map((candidate) => (candidate.id === entry.id ? entry : candidate));
    },
    async findById(id: string) {
      return entries.find((entry) => entry.id === id) ?? null;
    },
    async findByMedicalRecordId(medicalRecordId: string) {
      return entries.filter((entry) => entry.medicalRecordId === medicalRecordId);
    }
  };
  const clinicalTimelineRepository = {
    async create(event: unknown) {
      timeline = [...timeline, event as (typeof timeline)[number]];
    },
    async findByMedicalRecordId(medicalRecordId: string) {
      return timeline.filter((event) => event.medicalRecordId === medicalRecordId);
    }
  };
  const entryRevisionRepository = {
    async create(revision: unknown) {
      revisions = [...revisions, revision as (typeof revisions)[number]];
    },
    async findByEntryId(entryId: string) {
      return revisions.filter((revision) => revision.entryId === entryId);
    }
  };

  const transactionContext = new AsyncLocalStorage<boolean>();
  let failNextTransaction = options.failNextTransaction === true;
  let medicalRecordFindAllCalls = 0;
  const tenantTransaction = async <T>(
    _accountId: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    if (transactionContext.getStore()) return operation();

    const previousRecords = records.map((record) => ({ ...record }));
    const previousEntries = entries.map((entry) => ({ ...entry }));
    const previousRevisions = revisions.map((revision) => ({ ...revision }));
    const previousTimeline = timeline.map((event) => ({ ...event }));
    return transactionContext.run(true, async () => {
      try {
        const result = await operation();
        if (failNextTransaction) {
          failNextTransaction = false;
          throw new Error('simulated tenant transaction rollback');
        }
        return result;
      } catch (error) {
        records = previousRecords;
        entries = previousEntries;
        revisions = previousRevisions;
        timeline = previousTimeline;
        throw error;
      }
    });
  };

  const server = createServerUnderTest({
    repositories: {
      users: usersRepository,
      patient: patientRepository,
      encounter: encounterRepository,
      medicalRecord: medicalRecordRepository,
      clinicalEntry: clinicalEntryRepository,
      clinicalTimeline: clinicalTimelineRepository,
      entryRevision: entryRevisionRepository,
      attachment: options.attachmentRepository
    } as never,
    preserveSeedUsersWithRepository: true,
    tenantTransaction
  });
  return Object.assign(server, {
    armNextTransactionFailure: () => {
      failNextTransaction = true;
    },
    getMedicalRecordFindAllCalls: () => medicalRecordFindAllCalls,
    resetMedicalRecordFindAllCalls: () => {
      medicalRecordFindAllCalls = 0;
    }
  });
}

test('CORS preflight reflects an allowed origin', async () => {
  const server = createServerUnderTest({
    corsAllowedOrigins: ['https://app.example.com']
  });

  const response = await performRequest(server, {
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      'access-control-request-method': 'GET',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.getHeader('access-control-allow-origin'), 'https://app.example.com');
  assert.equal(response.getHeader('access-control-allow-credentials'), 'true');
  assert.match(response.getHeader('access-control-allow-methods') ?? '', /OPTIONS/);
  assert.match(response.getHeader('access-control-allow-headers') ?? '', /idempotency-key/i);
});

test('serves a non-secret setup status even when bootstrap mutation is disabled', async () => {
  const server = createServerUnderTest({ setupBootstrapToken: undefined });

  const response = await performRequest(server, {
    method: 'GET',
    url: '/auth/setup/status',
    headers: { host: 'localhost' }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), {
    setupRequired: false,
    setupAvailable: false
  });
});

test('server falls back to LocalPix when PagarMe credentials are absent', async () => {
  assert.doesNotThrow(() =>
    createServerUnderTest({
      pixMockMode: false,
      pagarmeApiKey: undefined,
      pagarmePixKey: undefined
    })
  );
});

test('canonical repository-backed test runtime does not load legacy seed principals', async () => {
  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById() {
      return null;
    },
    async findByUsername() {
      return null;
    },
    async findByEmail() {
      return null;
    },
    async findAll() {
      return [
        {
          id: '5c2b3750-783b-4cd7-bf8d-4ce982c1dabb' as never,
          accountId: '65751ed5-07d3-44a2-830a-cc9dc8a0dbe4' as never,
          username: 'dbadmin',
          email: 'dbadmin@cvg.local',
          passwordHash: 'cvg-his-v2-seed-salt-v1:seed_db_password',
          fullName: 'Database Admin',
          isActive: true,
          createdAt: '2026-08-07T00:00:00.000Z',
          updatedAt: '2026-08-07T00:00:00.000Z'
        }
      ];
    },
    async findRoleCodesByUserId() {
      return ['admin'];
    },
    async findByAccountId() {
      return [];
    }
  };
  const server = createServerUnderTest({
    preserveSeedUsersWithRepository: false,
    requireUuidEntityIdentifiers: true,
    repositories: {
      users: usersRepository
    }
  });
  await server.ready;

  const canonicalLogin = await performRequest(server, {
    method: 'POST',
    url: '/auth/login',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: { username: 'dbadmin', password: 'seed_db_password' }
  });
  const legacyLogin = await performRequest(server, {
    method: 'POST',
    url: '/auth/login',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: { username: 'admin', password: 'seed_admin' }
  });

  assert.equal(canonicalLogin.statusCode, 200);
  assert.equal(legacyLogin.statusCode, 401);
});

test('repository-backed authentication fails closed when session synchronization is unavailable', async () => {
  const accountId = '65751ed5-07d3-44a2-830a-cc9dc8a0dbe4' as never;
  const userId = '5c2b3750-783b-4cd7-bf8d-4ce982c1dabb' as never;
  const sessions = new Map<string, PersistedSessionRecord>();
  let sessionReadsAvailable = true;
  const sessionRepository: SessionRepository = {
    async create(session) {
      sessions.set(session.sessionId, { ...session });
    },
    async update(session) {
      const existing = sessions.get(session.sessionId);
      if (!existing) throw new Error('Session not found');
      sessions.set(session.sessionId, { ...existing, ...session } as PersistedSessionRecord);
    },
    async rotateRefreshNonce(params) {
      const existing = sessions.get(params.sessionId);
      if (
        !existing ||
        !existing.active ||
        existing.revokedAt ||
        existing.refreshNonce !== params.expectedRefreshNonce
      ) {
        return null;
      }
      const rotated = {
        ...existing,
        refreshNonce: params.refreshNonce,
        expiresAt: params.expiresAt,
        refreshExpiresAt: params.refreshExpiresAt
      };
      sessions.set(params.sessionId, rotated);
      return rotated;
    },
    async findById(id) {
      if (!sessionReadsAvailable) throw new Error('session repository unavailable');
      const session = sessions.get(id);
      return session ? { ...session } : null;
    },
    async findByUserId(targetUserId) {
      return Array.from(sessions.values())
        .filter((session) => session.userId === targetUserId)
        .map((session) => ({ ...session }));
    },
    async delete(id) {
      sessions.delete(id);
    }
  };
  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById(id: string) {
      return id === userId
        ? {
            id: userId,
            accountId,
            username: 'admin',
            email: 'admin@cvg.local',
            passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
            fullName: 'Admin CVG',
            isActive: true,
            createdAt: '2026-08-07T00:00:00.000Z',
            updatedAt: '2026-08-07T00:00:00.000Z'
          }
        : null;
    },
    async findByUsername(targetAccountId: string, username: string) {
      return targetAccountId === accountId && username === 'admin'
        ? {
            id: userId,
            accountId,
            username: 'admin',
            email: 'admin@cvg.local',
            passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
            fullName: 'Admin CVG',
            isActive: true,
            createdAt: '2026-08-07T00:00:00.000Z',
            updatedAt: '2026-08-07T00:00:00.000Z'
          }
        : null;
    },
    async findByEmail() {
      return null;
    },
    async findAll() {
      return [
        {
          id: userId,
          accountId,
          username: 'admin',
          email: 'admin@cvg.local',
          passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
          fullName: 'Admin CVG',
          isActive: true,
          createdAt: '2026-08-07T00:00:00.000Z',
          updatedAt: '2026-08-07T00:00:00.000Z'
        }
      ];
    },
    async findRoleCodesByUserId() {
      return ['admin'];
    },
    async findByAccountId() {
      return [];
    }
  };
  const server = createServerUnderTest({
    preserveSeedUsersWithRepository: false,
    requireUuidEntityIdentifiers: true,
    repositories: { users: usersRepository, session: sessionRepository }
  });
  await server.ready;
  const accessToken = await login(server, 'admin', 'seed_admin');

  sessionReadsAvailable = false;
  const response = await performRequest(server, {
    method: 'GET',
    url: '/auth/session',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  const earlyPrivilegedResponse = await performRequest(server, {
    method: 'GET',
    url: '/chaos/experiments',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  const sessionListResponse = await performRequest(server, {
    method: 'GET',
    url: '/auth/sessions',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });

  assert.equal(response.statusCode, 503);
  assert.equal(earlyPrivilegedResponse.statusCode, 503);
  assert.equal(sessionListResponse.statusCode, 503);
  assert.equal(sessionListResponse.bodyJson<{ code: string }>().code, 'AUTHENTICATION_UNAVAILABLE');
});

test('catalog stores honor the in-memory persistence mode', async () => {
  const server = createServerUnderTest({
    useDatabaseCatalogStores: false
  });
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/breeds?active=true',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ name: string }> }>();
  assert.equal(
    payload.items.some((breed) => breed.name === 'Golden Retriever'),
    true
  );
});

test('animal reference item routes enforce account ownership over HTTP', async () => {
  const server = createTwoAccountTriageServer({ useInMemoryCatalogStores: true });
  await server.ready;
  const ownerAccessToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const foreignAccessToken = await login(server, 'triage_admin_1', 'seed_admin_1');
  const catalogs = [
    {
      collection: '/breeds',
      name: 'Account A Breed',
      payload: { name: 'Account A Breed', code: 'ACCOUNT-A-BREED-001', species: 'canine' }
    },
    {
      collection: '/species',
      name: 'Account A Species',
      payload: { name: 'Account A Species', code: 'ACCOUNT-A-SPECIES-001', systemCode: 'other' }
    },
    {
      collection: '/coat-colors',
      name: 'Account A Coat Color',
      payload: {
        name: 'Account A Coat Color',
        code: 'ACCOUNT-A-COAT-001',
        colorGroup: 'Solida',
        hexColor: '#4b2e22'
      }
    }
  ];

  for (const catalog of catalogs) {
    const createResponse = await performRequest(server, {
      method: 'POST',
      url: catalog.collection,
      headers: {
        authorization: `Bearer ${ownerAccessToken}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: catalog.payload
    });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.bodyJson<{ id: string; accountId: string; name: string }>();
    assert.equal(created.accountId, 'acc_triage_http_a');
    await assertAccountScopedCollectionVisibility(
      server,
      catalog.collection,
      ownerAccessToken,
      foreignAccessToken,
      created.id
    );

    const ownerRead = await performRequest(server, {
      method: 'GET',
      url: `${catalog.collection}/${created.id}`,
      headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
    });
    assert.equal(ownerRead.statusCode, 200);
    assert.equal(ownerRead.bodyJson<{ id: string }>().id, created.id);

    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const foreignRequest = await performRequest(server, {
        method,
        url: `${catalog.collection}/${created.id}`,
        headers: {
          authorization: `Bearer ${foreignAccessToken}`,
          host: 'localhost',
          ...(method === 'PATCH' ? { 'content-type': 'application/json' } : {})
        },
        ...(method === 'PATCH' ? { body: { name: `Foreign ${catalog.name}` } } : {})
      });
      assert.equal(foreignRequest.statusCode, 401, `${catalog.collection} ${method}`);
    }

    const ownerReadAfterForeignRequests = await performRequest(server, {
      method: 'GET',
      url: `${catalog.collection}/${created.id}`,
      headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
    });
    assert.equal(ownerReadAfterForeignRequests.statusCode, 200);
    assert.equal(ownerReadAfterForeignRequests.bodyJson<{ name: string }>().name, catalog.name);
  }
});

test('product and service item routes enforce account ownership over HTTP', async () => {
  const server = createTwoAccountTriageServer({ useInMemoryCatalogStores: true });
  await server.ready;
  const ownerAccessToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const foreignAccessToken = await login(server, 'triage_admin_1', 'seed_admin_1');

  const createdProductResponse = await performRequest(server, {
    method: 'POST',
    url: '/products',
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Account A Product', code: 'ACCOUNT-A-PRODUCT-001', basePrice: 10 }
  });
  assert.equal(createdProductResponse.statusCode, 201);
  const createdProduct = createdProductResponse.bodyJson<{
    id: string;
    accountId: string;
    name: string;
  }>();
  assert.equal(createdProduct.accountId, 'acc_triage_http_a');
  await assertAccountScopedCollectionVisibility(
    server,
    '/products',
    ownerAccessToken,
    foreignAccessToken,
    createdProduct.id
  );

  const ownerProduct = await performRequest(server, {
    method: 'GET',
    url: `/products/${createdProduct.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerProduct.statusCode, 200);
  assert.equal(ownerProduct.bodyJson<{ id: string }>().id, createdProduct.id);

  const ownerProductUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/products/${createdProduct.id}`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Account A Product Updated' }
  });
  assert.equal(ownerProductUpdate.statusCode, 200);
  assert.equal(ownerProductUpdate.bodyJson<{ name: string }>().name, 'Account A Product Updated');

  const foreignProductRead = await performRequest(server, {
    method: 'GET',
    url: `/products/${createdProduct.id}`,
    headers: { authorization: `Bearer ${foreignAccessToken}`, host: 'localhost' }
  });
  assert.equal(foreignProductRead.statusCode, 401);

  const foreignProductUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/products/${createdProduct.id}`,
    headers: {
      authorization: `Bearer ${foreignAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Foreign Product Update' }
  });
  assert.equal(foreignProductUpdate.statusCode, 401);

  const unchangedProduct = await performRequest(server, {
    method: 'GET',
    url: `/products/${createdProduct.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(unchangedProduct.statusCode, 200);
  assert.equal(unchangedProduct.bodyJson<{ name: string }>().name, 'Account A Product Updated');

  const createdServiceResponse = await performRequest(server, {
    method: 'POST',
    url: '/services',
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Account A Service', code: 'ACCOUNT-A-SERVICE-001', basePrice: 20 }
  });
  assert.equal(createdServiceResponse.statusCode, 201);
  const createdService = createdServiceResponse.bodyJson<{
    id: string;
    accountId: string;
    name: string;
  }>();
  assert.equal(createdService.accountId, 'acc_triage_http_a');
  await assertAccountScopedCollectionVisibility(
    server,
    '/services',
    ownerAccessToken,
    foreignAccessToken,
    createdService.id
  );

  const ownerService = await performRequest(server, {
    method: 'GET',
    url: `/services/${createdService.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerService.statusCode, 200);
  assert.equal(ownerService.bodyJson<{ id: string }>().id, createdService.id);

  const ownerServiceUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/services/${createdService.id}`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Account A Service Updated' }
  });
  assert.equal(ownerServiceUpdate.statusCode, 200);
  assert.equal(ownerServiceUpdate.bodyJson<{ name: string }>().name, 'Account A Service Updated');

  const foreignServiceRead = await performRequest(server, {
    method: 'GET',
    url: `/services/${createdService.id}`,
    headers: { authorization: `Bearer ${foreignAccessToken}`, host: 'localhost' }
  });
  assert.equal(foreignServiceRead.statusCode, 401);

  const foreignServiceUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/services/${createdService.id}`,
    headers: {
      authorization: `Bearer ${foreignAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Foreign Service Update' }
  });
  assert.equal(foreignServiceUpdate.statusCode, 401);

  const unchangedService = await performRequest(server, {
    method: 'GET',
    url: `/services/${createdService.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(unchangedService.statusCode, 200);
  assert.equal(unchangedService.bodyJson<{ name: string }>().name, 'Account A Service Updated');
});

test('customer group item routes enforce account ownership over HTTP', async () => {
  const server = createTwoAccountTriageServer({ useInMemoryCatalogStores: true });
  await server.ready;
  const ownerAccessToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const foreignAccessToken = await login(server, 'triage_admin_1', 'seed_admin_1');

  const createdResponse = await performRequest(server, {
    method: 'POST',
    url: '/customer-groups',
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Account A Customer Group',
      code: 'ACCOUNT-A-CUSTOMER-GROUP-001',
      segment: 'Retail',
      discountPercent: 5,
      paymentTermDays: 7,
      creditLimitAmount: 100
    }
  });
  assert.equal(createdResponse.statusCode, 201);
  const created = createdResponse.bodyJson<{ id: string; accountId: string; name: string }>();
  assert.equal(created.accountId, 'acc_triage_http_a');
  await assertAccountScopedCollectionVisibility(
    server,
    '/customer-groups',
    ownerAccessToken,
    foreignAccessToken,
    created.id
  );

  const ownerRead = await performRequest(server, {
    method: 'GET',
    url: `/customer-groups/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerRead.statusCode, 200);

  const ownerUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/customer-groups/${created.id}`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { name: 'Account A Customer Group Updated' }
  });
  assert.equal(ownerUpdate.statusCode, 200);
  assert.equal(ownerUpdate.bodyJson<{ name: string }>().name, 'Account A Customer Group Updated');

  for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
    const foreignRequest = await performRequest(server, {
      method,
      url: `/customer-groups/${created.id}`,
      headers: {
        authorization: `Bearer ${foreignAccessToken}`,
        host: 'localhost',
        ...(method === 'PATCH' ? { 'content-type': 'application/json' } : {})
      },
      ...(method === 'PATCH' ? { body: { name: 'Foreign Customer Group Update' } } : {})
    });
    assert.equal(foreignRequest.statusCode, 401, `customer-groups ${method}`);
  }

  const ownerReadAfterForeignRequests = await performRequest(server, {
    method: 'GET',
    url: `/customer-groups/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerReadAfterForeignRequests.statusCode, 200);
  assert.equal(
    ownerReadAfterForeignRequests.bodyJson<{ name: string }>().name,
    'Account A Customer Group Updated'
  );

  const ownerDelete = await performRequest(server, {
    method: 'DELETE',
    url: `/customer-groups/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerDelete.statusCode, 204);
});

test('responsibility-term item routes enforce account ownership over HTTP', async () => {
  const server = createTwoAccountTriageServer({ useInMemoryCatalogStores: true });
  await server.ready;
  const ownerAccessToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const foreignAccessToken = await login(server, 'triage_admin_1', 'seed_admin_1');

  const createdResponse = await performRequest(server, {
    method: 'POST',
    url: '/responsibility-terms',
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Account A Responsibility Term',
      code: 'ACCOUNT-A-RESPONSIBILITY-001',
      usageContext: 'internacao',
      content: 'Account A responsibility terms test',
      active: true,
      requiresOwnerSignature: true,
      requiresWitnessSignature: false
    }
  });
  assert.equal(createdResponse.statusCode, 201);
  const created = createdResponse.bodyJson<{ id: string; accountId: string; title: string }>();
  assert.equal(created.accountId, 'acc_triage_http_a');
  await assertAccountScopedCollectionVisibility(
    server,
    '/responsibility-terms',
    ownerAccessToken,
    foreignAccessToken,
    created.id
  );

  const ownerRead = await performRequest(server, {
    method: 'GET',
    url: `/responsibility-terms/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerRead.statusCode, 200);

  const ownerUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/responsibility-terms/${created.id}`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { title: 'Account A Responsibility Term Updated' }
  });
  assert.equal(ownerUpdate.statusCode, 200);
  assert.equal(
    ownerUpdate.bodyJson<{ title: string }>().title,
    'Account A Responsibility Term Updated'
  );

  for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
    const foreignRequest = await performRequest(server, {
      method,
      url: `/responsibility-terms/${created.id}`,
      headers: {
        authorization: `Bearer ${foreignAccessToken}`,
        host: 'localhost',
        ...(method === 'PATCH' ? { 'content-type': 'application/json' } : {})
      },
      ...(method === 'PATCH' ? { body: { title: 'Foreign Responsibility Term Update' } } : {})
    });
    assert.equal(foreignRequest.statusCode, 401, `responsibility-terms ${method}`);
  }

  const ownerReadAfterForeignRequests = await performRequest(server, {
    method: 'GET',
    url: `/responsibility-terms/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerReadAfterForeignRequests.statusCode, 200);
  assert.equal(
    ownerReadAfterForeignRequests.bodyJson<{ title: string }>().title,
    'Account A Responsibility Term Updated'
  );

  const ownerDelete = await performRequest(server, {
    method: 'DELETE',
    url: `/responsibility-terms/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerDelete.statusCode, 204);
});

test('preventive-event item routes enforce account ownership over HTTP', async () => {
  const server = createTwoAccountTriageServer({ useInMemoryCatalogStores: true });
  await server.ready;
  const ownerAccessToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const foreignAccessToken = await login(server, 'triage_admin_1', 'seed_admin_1');

  const createdResponse = await performRequest(server, {
    method: 'POST',
    url: '/vaccines-dewormers',
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_triage_http_0',
      ownerId: 'owner_triage_http_0',
      clientName: 'Account A Client',
      animalName: 'Account A Patient',
      eventDate: '2026-06-10',
      itemType: 'vaccine',
      description: 'Account A Preventive Event'
    }
  });
  assert.equal(createdResponse.statusCode, 201);
  const created = createdResponse.bodyJson<{
    id: string;
    accountId: string;
    description: string;
  }>();
  assert.equal(created.accountId, 'acc_triage_http_a');
  await assertAccountScopedCollectionVisibility(
    server,
    '/vaccines-dewormers',
    ownerAccessToken,
    foreignAccessToken,
    created.id
  );

  const ownerUpdate = await performRequest(server, {
    method: 'PATCH',
    url: `/vaccines-dewormers/${created.id}`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { description: 'Account A Preventive Event Updated' }
  });
  assert.equal(ownerUpdate.statusCode, 200);
  assert.equal(
    ownerUpdate.bodyJson<{ description: string }>().description,
    'Account A Preventive Event Updated'
  );

  const foreignRequests = await Promise.all([
    performRequest(server, {
      method: 'GET',
      url: `/vaccines-dewormers/${created.id}`,
      headers: { authorization: `Bearer ${foreignAccessToken}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'PATCH',
      url: `/vaccines-dewormers/${created.id}`,
      headers: {
        authorization: `Bearer ${foreignAccessToken}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { description: 'Foreign Preventive Event Update' }
    }),
    performRequest(server, {
      method: 'DELETE',
      url: `/vaccines-dewormers/${created.id}`,
      headers: { authorization: `Bearer ${foreignAccessToken}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'POST',
      url: `/vaccines-dewormers/${created.id}/execute`,
      headers: {
        authorization: `Bearer ${foreignAccessToken}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { observation: 'Foreign execution' }
    }),
    performRequest(server, {
      method: 'POST',
      url: `/vaccines-dewormers/${created.id}/email`,
      headers: { authorization: `Bearer ${foreignAccessToken}`, host: 'localhost' }
    })
  ]);
  for (const [index, response] of foreignRequests.entries()) {
    assert.equal(response.statusCode, 401, `preventive event foreign request ${index}`);
  }

  const nestedActionPath = await performRequest(server, {
    method: 'POST',
    url: `/vaccines-dewormers/${created.id}/extra/execute`,
    headers: {
      authorization: `Bearer ${ownerAccessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { observation: 'Malformed execution path' }
  });
  assert.equal(nestedActionPath.statusCode, 404);

  const ownerReadAfterForeignRequests = await performRequest(server, {
    method: 'GET',
    url: `/vaccines-dewormers/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerReadAfterForeignRequests.statusCode, 200);
  assert.equal(
    ownerReadAfterForeignRequests.bodyJson<{ description: string }>().description,
    'Account A Preventive Event Updated'
  );

  const ownerDelete = await performRequest(server, {
    method: 'DELETE',
    url: `/vaccines-dewormers/${created.id}`,
    headers: { authorization: `Bearer ${ownerAccessToken}`, host: 'localhost' }
  });
  assert.equal(ownerDelete.statusCode, 204);
});

test('tenant command envelope replays the complete HTTP response without repeating the mutation', async () => {
  const executions = new Map<string, unknown>();
  let commandCalls = 0;
  const server = createServerUnderTest({
    unitOfWork: {
      async execute(
        context: { idempotencyKey?: string },
        _payload: unknown,
        command: () => Promise<unknown>
      ) {
        const key = context.idempotencyKey ?? 'missing';
        const previous = executions.get(key);
        if (previous !== undefined) return { value: previous, replayed: true };
        commandCalls += 1;
        const value = await command();
        executions.set(key, value);
        return { value, replayed: false };
      }
    } as never
  });
  const accessToken = await login(server, 'admin', 'seed_admin');
  const request = {
    method: 'POST',
    url: '/owners',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'owner-create-replay-1',
      host: 'localhost'
    },
    body: {
      fullName: 'Replay Owner',
      contacts: [{ label: 'phone', value: '+5511999990000', type: 'phone', primary: true }],
      financialResponsible: true
    }
  } as const;

  const first = await performRequest(server, request);
  const replay = await performRequest(server, request);

  assert.equal(first.statusCode, 201);
  assert.equal(replay.statusCode, 201);
  assert.deepEqual(replay.bodyJson(), first.bodyJson());
  assert.equal(commandCalls, 1);
});

test('report replays resolve the definition from the tenant-command envelope', async () => {
  const executions = new Map<string, unknown>();
  let commandCalls = 0;
  const server = createServerUnderTest({
    unitOfWork: {
      async execute(
        context: { idempotencyKey?: string },
        _payload: unknown,
        command: () => Promise<unknown>
      ) {
        const key = context.idempotencyKey ?? 'missing';
        const previous = executions.get(key);
        if (previous !== undefined) return { value: previous, replayed: true };
        commandCalls += 1;
        const value = await command();
        executions.set(key, value);
        return { value, replayed: false };
      }
    } as never
  });
  const accessToken = await login(server, 'admin', 'seed_admin');
  const request = {
    method: 'POST',
    url: '/reports/executions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'report-definition-replay-1',
      host: 'localhost'
    },
    body: { reportId: 'registration-owners' }
  } as const;

  const first = await performRequest(server, request);
  const replay = await performRequest(server, request);

  assert.equal(first.statusCode, 201);
  assert.equal(replay.statusCode, 201);
  assert.deepEqual(replay.bodyJson(), first.bodyJson());
  assert.equal(commandCalls, 1);
});

test('report schedule replays resolve the definition from the schedule route', async () => {
  const executions = new Map<string, unknown>();
  let commandCalls = 0;
  const server = createServerUnderTest({
    unitOfWork: {
      async execute(
        context: { idempotencyKey?: string },
        _payload: unknown,
        command: () => Promise<unknown>
      ) {
        const key = context.idempotencyKey ?? 'missing';
        const previous = executions.get(key);
        if (previous !== undefined) return { value: previous, replayed: true };
        commandCalls += 1;
        const value = await command();
        executions.set(key, value);
        return { value, replayed: false };
      }
    } as never
  });
  const accessToken = await login(server, 'admin', 'seed_admin');
  const createSchedule = await performRequest(server, {
    method: 'POST',
    url: '/reports/schedules',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'report-schedule-create-replay-1',
      host: 'localhost'
    },
    body: {
      reportId: 'registration-owners',
      name: 'Owners replay schedule',
      frequency: 'daily',
      format: 'csv',
      recipients: ['finance@example.test']
    }
  } as const);
  assert.equal(createSchedule.statusCode, 201);
  const schedule = createSchedule.bodyJson<{ id: string }>();

  const request = {
    method: 'PATCH',
    url: `/reports/schedules/${schedule.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'report-schedule-patch-replay-1',
      host: 'localhost'
    },
    body: { isActive: false }
  } as const;
  const first = await performRequest(server, request);
  const replay = await performRequest(server, request);

  assert.equal(first.statusCode, 200);
  assert.equal(replay.statusCode, 200);
  assert.deepEqual(replay.bodyJson(), first.bodyJson());
  assert.equal(commandCalls, 2);
});

test('cash drawer mutations receive the server tenant-command runner envelope', async () => {
  const calls: Array<{
    operation: string;
    idempotencyKey: string;
    payload: unknown;
  }> = [];
  const server = createServerUnderTest({
    unitOfWork: {
      async execute(
        context: { readonly operation: string; readonly idempotencyKey: string },
        payload: unknown,
        command: () => Promise<unknown>
      ) {
        calls.push({
          operation: context.operation,
          idempotencyKey: context.idempotencyKey,
          payload
        });
        return { value: await command(), replayed: false };
      }
    } as never
  });
  const accessToken = await login(server, 'admin', 'seed_admin');

  const open = await performRequest(server, {
    method: 'POST',
    url: '/cash-register/open',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'cash-server-open-1',
      host: 'localhost'
    },
    body: { openingAmount: 100, notes: 'Abertura HTTP' }
  });
  assert.equal(open.statusCode, 201);

  const movement = await performRequest(server, {
    method: 'POST',
    url: '/cash-register/movements',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'cash-server-movement-1',
      host: 'localhost'
    },
    body: { movementType: 'supply', amount: 10, reference: 'HTTP-REF' }
  });
  assert.equal(movement.statusCode, 201);

  const close = await performRequest(server, {
    method: 'POST',
    url: '/cash-register/close',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'cash-server-close-1',
      host: 'localhost'
    },
    body: { closingAmount: 110, notes: 'Fechamento HTTP' }
  });
  assert.equal(close.statusCode, 200);

  assert.deepEqual(calls, [
    {
      operation: 'cash.register.open',
      idempotencyKey: 'cash-server-open-1',
      payload: { openingAmount: 100, notes: 'Abertura HTTP' }
    },
    {
      operation: 'cash.movement.create',
      idempotencyKey: 'cash-server-movement-1',
      payload: {
        movementType: 'supply',
        amount: 10,
        reference: 'HTTP-REF'
      }
    },
    {
      operation: 'cash.register.close',
      idempotencyKey: 'cash-server-close-1',
      payload: {
        closingAmount: 110,
        notes: 'Fechamento HTTP'
      }
    }
  ]);
});

test('prescription execution replay rechecks authorization before returning the cached response', async () => {
  const accountId = '00000000-0000-0000-0000-000000000201';
  const userId = '00000000-0000-0000-0000-000000000202';
  const patientId = '00000000-0000-0000-0000-000000000203';
  const encounterId = '00000000-0000-0000-0000-000000000204';
  const clinicalEntryId = 'rx_replay-prescription-1';
  const createdAt = '2026-08-27T10:00:00.000Z';
  let permissionGranted = true;
  let mutationCalls = 0;

  const repositoryUser = {
    id: userId,
    accountId,
    username: 'replay-admin',
    email: 'replay-admin@example.test',
    passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
    fullName: 'Replay Admin',
    isActive: true,
    createdAt,
    updatedAt: createdAt
  };
  const prescription = {
    id: clinicalEntryId,
    accountId,
    medicalRecordId: 'mr_replay-1',
    encounterId,
    patientId,
    entryType: 'prescription' as const,
    title: 'Amoxicilina',
    content: 'Posologia: 500mg\nVia: oral\nFrequência: 8/8h',
    authoredByUserId: userId,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'oral',
    frequency: '8/8h',
    signedAt: createdAt,
    signedByUserId: userId,
    signatureHash: 'replay-fixture-signature'
  };
  const usersRepository = {
    async create() {},
    async update() {},
    async upgradePasswordHash() {
      return false;
    },
    async findById(id: string) {
      return id === userId ? repositoryUser : null;
    },
    async findByUsername(_accountId: string, username: string) {
      return username === repositoryUser.username ? repositoryUser : null;
    },
    async findByEmail() {
      return null;
    },
    async findAll() {
      return [repositoryUser];
    },
    async findRoleCodesByUserId() {
      return permissionGranted ? ['admin'] : [];
    },
    async findByAccountId() {
      return [repositoryUser];
    }
  };
  const prescriptionRepository = {
    async create() {},
    async update() {},
    async findById(id: string) {
      return id === clinicalEntryId ? prescription : null;
    },
    async findByEncounterId() {
      return [prescription];
    },
    async findByPatientId() {
      return [prescription];
    },
    async findByAccountId() {
      return [prescription];
    },
    async findByAccountIdPaginated() {
      return { items: [prescription], total: 1 };
    },
    async findSignature() {
      return {
        prescriptionId: clinicalEntryId,
        version: 1,
        signedByUserId: userId,
        signedAt: createdAt,
        signatureHash: 'replay-fixture-signature'
      };
    }
  };
  const cachedResponses = new Map<string, unknown>();
  const server = createServerUnderTest({
    preserveSeedUsersWithRepository: false,
    repositories: {
      users: usersRepository,
      prescription: prescriptionRepository
    } as never,
    unitOfWork: {
      async execute(
        context: { readonly idempotencyKey: string },
        _payload: unknown,
        command: (transaction: unknown) => Promise<unknown>,
        beforeIdempotency?: (transaction: unknown) => Promise<void>
      ) {
        await beforeIdempotency?.({} as never);
        const key = context.idempotencyKey;
        const cached = cachedResponses.get(key);
        if (cached !== undefined) return { value: cached, replayed: true };
        mutationCalls += 1;
        const value = await command({} as never);
        cachedResponses.set(key, value);
        return { value, replayed: false };
      }
    } as never
  });
  await server.ready;
  const accessToken = await login(server, repositoryUser.username, 'seed_admin');
  const create = await performRequest(server, {
    method: 'POST',
    url: '/prescription-executions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'prescription-create-replay-fixture',
      host: 'localhost'
    },
    body: {
      clinicalEntryId,
      patientId,
      encounterId,
      medicationName: 'Amoxicilina',
      dosage: '500mg',
      route: 'oral',
      frequency: '8/8h',
      scheduledAt: createdAt
    }
  });
  assert.equal(create.statusCode, 201);
  const executionId = create.bodyJson<{ id: string }>().id;
  const executeRequest = {
    method: 'POST',
    url: `/prescription-executions/${executionId}/execute`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'prescription-execute-replay-fixture',
      host: 'localhost'
    },
    body: { status: 'administered' }
  } as const;

  const first = await performRequest(server, executeRequest);
  permissionGranted = false;
  const revokedReplay = await performRequest(server, executeRequest);

  assert.equal(first.statusCode, 200);
  assert.equal(revokedReplay.statusCode, 403);
  assert.equal(mutationCalls, 2);
});

test('PIX attempt replay authenticates first and stores only a derived ledger key', async () => {
  const rawKey = 'customer-visible-pix-request-key';
  const ledgerKeys: string[] = [];
  const replaySnapshot = {
    statusCode: 202,
    headers: { 'content-type': 'application/json' },
    bodyBase64: Buffer.from(JSON.stringify({ state: 'pending_dispatch' })).toString('base64')
  };
  const server = createServerUnderTest({
    unitOfWork: {
      async execute(context: { idempotencyKey?: string }) {
        ledgerKeys.push(context.idempotencyKey ?? 'missing');
        return { value: replaySnapshot, replayed: true };
      }
    } as never
  });
  const adminToken = await login(server, 'admin', 'seed_admin');
  const request = {
    method: 'POST',
    url: '/encounters/00000000-0000-0000-0000-000000000101/payments/pix-attempts',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': rawKey,
      host: 'localhost'
    },
    body: {}
  } as const;

  const authorizedReplay = await performRequest(server, {
    ...request,
    headers: { ...request.headers, authorization: `Bearer ${adminToken}` }
  });
  const unauthorizedReplay = await performRequest(server, {
    ...request
  });

  assert.equal(authorizedReplay.statusCode, 202);
  assert.deepEqual(authorizedReplay.bodyJson(), { state: 'pending_dispatch' });
  assert.equal(ledgerKeys.length, 1);
  assert.notEqual(ledgerKeys[0], rawKey);
  assert.match(ledgerKeys[0] ?? '', /^pix-attempt-sha256:[a-f0-9]{64}$/);
  assert.equal(unauthorizedReplay.statusCode, 401);
  assert.equal(ledgerKeys.length, 1);
});

test('auth login fails closed when the distributed rate-limit backend is unavailable', async () => {
  const server = createServerUnderTest({
    authRateLimiter: {
      async check() {
        throw new Error('Redis rate limiter unavailable');
      }
    }
  });
  await server.ready;

  const response = await performRequest(server, {
    method: 'POST',
    url: '/auth/login',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: { username: 'admin', password: 'seed_admin' }
  });

  assert.equal(response.statusCode, 503);
  const body = response.bodyJson<{ code: string; message: string }>();
  assert.deepEqual(
    { code: body.code, message: body.message },
    {
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: 'Rate limit service unavailable'
    }
  );
  assert.equal(response.getHeader('set-cookie'), undefined);
});

test('PIX attempt POST is rate limited before idempotency ledger execution', async () => {
  let ledgerCalls = 0;
  const server = createServerUnderTest({
    pixPaymentAttemptRateLimiter: {
      async check() {
        return { blocked: true, limit: 120, remaining: 0, reset: 123, retryAfterMs: 5_001 };
      }
    },
    unitOfWork: {
      async execute() {
        ledgerCalls += 1;
        throw new Error('ledger must not run');
      }
    } as never
  });
  const adminToken = await login(server, 'admin', 'seed_admin');
  const response = await performRequest(server, {
    method: 'POST',
    url: '/encounters/00000000-0000-0000-0000-000000000101/payments/pix-attempts',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
      'idempotency-key': 'rate-limited-pix-attempt',
      host: 'localhost'
    },
    body: {}
  });

  assert.equal(response.statusCode, 429);
  assert.equal(response.getHeader('retry-after'), '6');
  assert.equal(response.bodyJson<{ code: string }>().code, 'RATE_LIMITED');
  assert.equal(ledgerCalls, 0);
});

test('CORS rejects an origin outside the allowlist', async () => {
  const server = createServerUnderTest({
    corsAllowedOrigins: ['https://app.example.com']
  });

  const response = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://evil.example.com',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.bodyJson<{ code: string }>().code, 'CORS_ORIGIN_DENIED');
});

test('HSTS is emitted only for secure production-like requests', async () => {
  const server = createServerUnderTest({
    environment: 'production',
    corsAllowedOrigins: ['https://app.example.com'],
    redisUrl: 'redis://127.0.0.1:6379/0',
    runtimeDistributedStateEnabled: true,
    pagarmeApiKey: 'pagarme-test-key',
    pagarmePixKey: 'pagarme-test-pix-key',
    nfseProvider: 'abrasf',
    nfseApiUrl: 'https://nfse.test.example/api',
    nfseApiKey: 'nfse-test-key',
    nfseMunicipalityCode: '3550308',
    nfseIssuer: {
      cnpj: '12345678000190',
      inscricaoMunicipal: '123456',
      razaoSocial: 'CVG HIS Testes',
      address: {
        street: 'Rua de Testes',
        number: '100',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01000000',
        country: 'BR'
      }
    },
    resendApiKey: 'resend-test-key',
    smsApiKey: 'sms-test-key',
    googleCalendarAccessToken: 'calendar-test-token',
    googleCalendarCalendarId: 'calendar-test-id',
    attachmentScanner: new ClamAvAttachmentSecurityScanner({ host: 'clamav.test' }),
    fileStorage: new S3CompatibleFileStorage({
      endpoint: 'https://s3.test.example',
      bucket: 'cvg-test',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret'
    })
  });

  const secureResponse = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      'x-forwarded-proto': 'https',
      host: 'localhost'
    }
  });
  assert.equal(
    secureResponse.getHeader('strict-transport-security'),
    'max-age=31536000; includeSubDomains; preload'
  );

  const insecureResponse = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      host: 'localhost'
    }
  });

  assert.equal(insecureResponse.getHeader('strict-transport-security'), undefined);
});

test('production-like API refuses missing or mock providers', () => {
  assert.throws(
    () =>
      assertProductionProviderReadiness({
        environment: 'production',
        pixMockMode: true
      }),
    /cannot start with mock or missing providers/
  );

  assert.doesNotThrow(() =>
    assertProductionProviderReadiness({
      environment: 'production',
      pagarmeApiKey: 'pagarme-test-key',
      pagarmePixKey: 'pagarme-test-pix-key',
      nfseProvider: 'abrasf',
      nfseApiUrl: 'https://nfse.test.example',
      nfseApiKey: 'nfse-test-key',
      nfseMunicipalityCode: '3550308',
      nfseIssuer: {
        cnpj: '12345678000190',
        inscricaoMunicipal: '123456',
        razaoSocial: 'CVG HIS Teste',
        address: {
          street: 'Rua Teste',
          number: '1',
          district: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipCode: '01000000',
          country: 'BR'
        }
      },
      resendApiKey: 'resend-test-key',
      smsApiKey: 'sms-test-key',
      googleCalendarAccessToken: 'calendar-test-token',
      googleCalendarCalendarId: 'calendar-test-id',
      attachmentScanner: new ClamAvAttachmentSecurityScanner({ host: 'clamav.test' }),
      fileStorage: new S3CompatibleFileStorage({
        endpoint: 'https://s3.test.example',
        bucket: 'cvg-test',
        accessKeyId: 'test-access',
        secretAccessKey: 'test-secret'
      })
    })
  );
});

test('production-like API requires a healthy Redis distributed-state preflight', async () => {
  const base = {
    environment: 'production',
    runtimeDistributedStateEnabled: true,
    redisUrl: 'redis://redis.test:6379/0',
    authRateLimiter: {
      check: async () => ({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60_000,
        blocked: false,
        retryAfterMs: 0
      }),
      healthCheck: async () => ({
        healthy: true,
        backend: 'redis' as const,
        detail: 'test'
      })
    },
    pixPaymentAttemptRateLimiter: {
      check: async () => ({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60_000,
        blocked: false,
        retryAfterMs: 0
      }),
      healthCheck: async () => ({
        healthy: true,
        backend: 'redis' as const,
        detail: 'test'
      })
    },
    pixProviderWebhookRateLimiter: {
      check: async () => ({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60_000,
        blocked: false,
        retryAfterMs: 0
      }),
      healthCheck: async () => ({
        healthy: true,
        backend: 'redis' as const,
        detail: 'test'
      })
    }
  };

  await assert.doesNotReject(() => assertDistributedStateReadiness(base));
  await assert.rejects(
    () =>
      assertDistributedStateReadiness({
        ...base,
        authRateLimiter: {
          check: async () => ({
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60_000,
            blocked: false,
            retryAfterMs: 0
          }),
          healthCheck: async () => ({
            healthy: false,
            backend: 'redis' as const,
            detail: 'test failure'
          })
        }
      }),
    /Redis distributed state is unhealthy/
  );
});

test('observability contract exposes server-generated request and trace correlation headers', async () => {
  const server = createServerUnderTest();
  const callerSelectedId = 'corr_abc123_0123456789abcdef01';
  const response = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      'x-correlation-id': callerSelectedId,
      host: 'localhost'
    }
  });

  const traceparent = response.getHeader('traceparent');
  assert.ok(traceparent);
  const correlationId = response.getHeader('x-correlation-id') ?? '';
  assert.match(correlationId, /^api_[0-9a-z]+_[a-f0-9]{18}$/);
  assert.notEqual(correlationId, callerSelectedId);
  assert.equal(response.getHeader('x-request-id'), correlationId);
  assert.equal(response.getHeader('x-trace-id'), traceparent?.split('-')[1]);
});

test('caller correlation headers are not reflected in response headers or health bodies', async () => {
  const server = createServerUnderTest();
  const unsafeHeaders = [
    '',
    'patient@example.com',
    'Patient Jane Doe',
    'patient-jane-doe_abc123_aabbccddeeff001122',
    'x'.repeat(256)
  ];

  for (const unsafeHeader of unsafeHeaders) {
    for (const url of ['/health', '/live', '/ready']) {
      const response = await performRequest(server, {
        method: 'GET',
        url,
        headers: { 'x-correlation-id': unsafeHeader, host: 'localhost' }
      });
      const correlationId = response.getHeader('x-correlation-id') ?? '';

      assert.match(correlationId, /^api_[0-9a-z]+_[a-f0-9]{18}$/);
      assert.notEqual(correlationId, unsafeHeader);
      assert.equal(response.getHeader('x-request-id'), correlationId);
      if (url !== '/health') {
        assert.equal(response.bodyJson<{ correlationId: string }>().correlationId, correlationId);
      }
    }
  }
});

test('operational metrics classify forbidden responses and downloads by normalized route and role', async () => {
  const server = createServerUnderTest({ corsAllowedOrigins: ['https://app.example.com'] });
  await server.ready;

  const forbidden = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://outside.example.com',
      host: 'localhost'
    }
  });
  assert.equal(forbidden.statusCode, 403);
  forbidden.emit('finish');

  const accessToken = await login(server, 'admin', 'seed_admin');
  const failedDownload = await performRequest(server, {
    method: 'POST',
    url: '/reports/executions/missing-report/export',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { format: 'csv' }
  });
  assert.equal(failedDownload.statusCode, 404);
  failedDownload.emit('finish');

  const metricsResponse = await performRequest(server, {
    method: 'GET',
    url: '/metrics',
    headers: {
      authorization: 'Bearer test-metrics-token',
      host: 'localhost'
    }
  });
  const metricsText = metricsResponse.bodyText();
  assert.match(
    metricsText,
    /^http_operational_outcomes_total\{route="\/health",role="anonymous",operation="forbidden",result="error"\} [1-9]\d*$/m
  );
  assert.match(
    metricsText,
    /^http_operational_outcomes_total\{route="\/reports\/executions\/:id\/export",role="admin",operation="download",result="error"\} [1-9]\d*$/m
  );
});

test('clinical operational metrics use an authoritative unlabeled snapshot', async () => {
  resetClinicalOperationalMetrics();
  const server = createServerUnderTest({
    clinicalOperationalMetricsProvider: async () => ({
      activeInpatients: 4,
      openEncounters: 7,
      pendingWorkflowTasks: 11,
      overdueWorkflowTasks: 3,
      medicationOverdue: 2,
      pendingDiagnostics: 5,
      handoverPending: 1
    })
  });

  const response = await performRequest(server, {
    method: 'GET',
    url: '/metrics',
    headers: {
      authorization: 'Bearer test-metrics-token',
      host: 'localhost'
    }
  });
  assert.equal(response.statusCode, 200);
  const metrics = response.bodyText();
  assert.match(metrics, /^cvg_active_inpatients 4$/m);
  assert.match(metrics, /^cvg_open_encounters 7$/m);
  assert.match(metrics, /^cvg_pending_workflow_tasks 11$/m);
  assert.match(metrics, /^cvg_overdue_workflow_tasks 3$/m);
  assert.match(metrics, /^cvg_medication_overdue 2$/m);
  assert.match(metrics, /^cvg_pending_diagnostics 5$/m);
  assert.match(metrics, /^cvg_handover_pending 1$/m);
  assert.doesNotMatch(metrics, /^cvg_[^\n]+\{[^\n]+\}/m);
  resetClinicalOperationalMetrics();
});

test('collector surfaces fail closed before auth and reuse one bounded refresh across repeated scrapes', async () => {
  let refreshCalls = 0;
  const server = createServerUnderTest({
    clinicalOperationalMetricsProvider: async () => {
      refreshCalls += 1;
      return {
        activeInpatients: 1,
        openEncounters: 2,
        pendingWorkflowTasks: 3,
        overdueWorkflowTasks: 0,
        medicationOverdue: 0,
        pendingDiagnostics: 0,
        handoverPending: 0
      };
    }
  });

  for (const url of ['/metrics', '/internal/metrics', '/slos', '/health/slos']) {
    const denied = await performRequest(server, {
      method: 'GET',
      url,
      headers: { host: 'localhost' }
    });
    assert.equal(denied.statusCode, 401, `${url} must be collector-authenticated`);
    assert.equal(denied.bodyJson<{ code: string }>().code, 'METRICS_AUTH_REQUIRED');
  }
  assert.equal(refreshCalls, 0, 'unauthorized scrapes must not fan out to tenant sources');

  const first = await performRequest(server, {
    method: 'GET',
    url: '/metrics',
    headers: { authorization: 'Bearer test-metrics-token', host: 'localhost' }
  });
  const second = await performRequest(server, {
    method: 'GET',
    url: '/metrics',
    headers: { 'x-metrics-token': 'test-metrics-token', host: 'localhost' }
  });
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(refreshCalls, 1, 'repeated scrapes must use the bounded clinical snapshot cache');
  assert.match(second.bodyText(), /^cvg_active_inpatients 1$/m);

  const live = await performRequest(server, {
    method: 'GET',
    url: '/live',
    headers: { host: 'localhost' }
  });
  assert.equal(live.statusCode, 200, 'probe-only liveness remains public');
});

test('production-like API refuses to start without a dedicated metrics collector token', () => {
  assert.throws(
    () => createServerUnderTest({ environment: 'production', metricsAuthToken: undefined }),
    /METRICS_AUTH_TOKEN/
  );
});

test('database pool metrics expose bounded connection pressure without tenant labels', async () => {
  updateDatabasePoolMetrics({ waitingCount: 3, idleCount: 2, totalCount: 6, max: 8 });
  const metrics = await getMetricsText();

  assert.match(metrics, /^app_database_pool_configured 1$/m);
  assert.match(metrics, /^app_database_pool_waiting_count 3$/m);
  assert.match(metrics, /^app_database_pool_idle_count 2$/m);
  assert.match(metrics, /^app_database_pool_total_count 6$/m);
  assert.match(metrics, /^app_database_pool_max_connections 8$/m);
  assert.doesNotMatch(metrics, /app_database_pool_[^\n]+\{[^\n]+account/);
  resetDatabasePoolMetrics();
});

test('SLO endpoint exposes compliance, error budget and Prometheus gauges', async () => {
  resetRequestSloObservations();
  const now = Date.now();
  for (let index = 0; index < 20; index += 1) {
    recordRequestSloObservation({
      durationMs: index < 18 ? 120 : 640,
      statusCode: index < 18 ? 200 : 500,
      timestamp: now - index * 1_000
    });
  }

  const server = createServerUnderTest();
  const response = await performRequest(server, {
    method: 'GET',
    url: '/slos',
    headers: {
      authorization: 'Bearer test-metrics-token',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    snapshot: {
      requestCount5m: number;
      requestCount1h: number;
      p95LatencyMs: number;
      errorRatePercent: number;
    };
    report: {
      overallStatus: string;
      errorBudgetExhausted: boolean;
      slos: Array<{
        id: string;
        category: string;
        status: string;
        errorBudgetPercent: number;
        burnRate: number;
      }>;
    };
    runbook: { metrics: string; readiness: string; liveness: string };
  }>();
  assert.equal(payload.snapshot.requestCount5m, 20);
  assert.equal(payload.snapshot.requestCount1h, 20);
  assert.equal(payload.snapshot.p95LatencyMs, 640);
  assert.equal(payload.snapshot.errorRatePercent, 10);
  assert.equal(payload.report.overallStatus, 'critical');
  assert.equal(payload.report.errorBudgetExhausted, true);
  assert.equal(payload.runbook.metrics, '/metrics');
  assert.equal(
    payload.report.slos.some(
      (slo) => slo.id === 'api-error-rate' && slo.category === 'reliability'
    ),
    true
  );

  const aliasResponse = await performRequest(server, {
    method: 'GET',
    url: '/health/slos',
    headers: {
      authorization: 'Bearer test-metrics-token',
      host: 'localhost'
    }
  });
  assert.equal(aliasResponse.statusCode, 200);

  resetActiveRequestsCount();
  const metricsResponse = await performRequest(server, {
    method: 'GET',
    url: '/metrics',
    headers: {
      authorization: 'Bearer test-metrics-token',
      host: 'localhost'
    }
  });
  assert.equal(metricsResponse.statusCode, 200);
  const metricsText = metricsResponse.bodyText();
  assert.match(
    metricsText,
    /^app_slo_status\{slo_id="api-error-rate",category="reliability"\} 2$/m
  );
  assert.match(
    metricsText,
    /^app_slo_burn_rate\{slo_id="api-error-rate",category="reliability"\} 100$/m
  );
  assert.match(metricsText, /^app_active_requests 1$/m);

  resetActiveRequestsCount();
  resetRequestSloObservations();
});

test('SLO endpoint accepts an authenticated operator session without collector credentials', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');
  const response = await performRequest(server, {
    method: 'GET',
    url: '/slos',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.bodyJson<{ report: { overallStatus: string } }>().report.overallStatus,
    'healthy'
  );
});

test('chaos operations expose effective runtime state, runbooks and metrics', async () => {
  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: 'Database connected',
    repositoriesReady: true,
    repositoryCount: 13,
    workerReady: true,
    workerDetail: 'Worker connected',
    productionReady: true,
    initialized: true,
    mlReady: true,
    mlDetail: 'ML ready'
  });

  const server = createServerUnderTest({
    redisUrl: 'redis://127.0.0.1:6379/0',
    runtimeDistributedStateEnabled: true,
    pixProviderWebhookSyntheticEnabled: true,
    pixProviderWebhookKeyring: new Map([
      ['test-key-id', { accountId: 'account-1', secret: Buffer.alloc(32, 7) }]
    ]),
    pixProviderEventIngressRepository: {
      persist: async () => ({
        status: 'created' as const,
        eventId: 'pix-event-1',
        deliveryId: 'pix-delivery-1'
      })
    },
    authRateLimiter: createRateLimiter({
      windowMs: 60_000,
      maxRequests: 100,
      name: 'chaos-test'
    })
  });
  await server.ready;
  const accessToken = await login(server, 'admin', 'seed_admin');
  const unauthorized = await performRequest(server, {
    method: 'GET',
    url: '/chaos/experiments',
    headers: { host: 'localhost' }
  });
  assert.equal(unauthorized.statusCode, 401);
  const chaosHeaders = { authorization: `Bearer ${accessToken}`, host: 'localhost' };

  const chaos = ChaosEngine.getInstance();
  for (const experimentId of [
    'database-failure',
    'redis-failure',
    'worker-failure',
    'provider-failure'
  ]) {
    if (chaos.isActive(experimentId)) {
      await chaos.stop(experimentId);
    }
  }
  try {
    const startDatabaseFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/database-failure/start',
      headers: {
        ...chaosHeaders,
        'content-type': 'application/json'
      },
      body: { durationMs: 60_000 }
    });
    assert.equal(startDatabaseFailure.statusCode, 200);

    const startRedisFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/redis-failure/start',
      headers: {
        ...chaosHeaders,
        'content-type': 'application/json'
      },
      body: { durationMs: 60_000 }
    });
    assert.equal(startRedisFailure.statusCode, 200);

    const startWorkerFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/worker-failure/start',
      headers: {
        ...chaosHeaders,
        'content-type': 'application/json'
      },
      body: { durationMs: 60_000, faultDelayMs: 5 }
    });
    assert.equal(startWorkerFailure.statusCode, 200);

    const startProviderFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/provider-failure/start',
      headers: {
        ...chaosHeaders,
        'content-type': 'application/json'
      },
      body: { durationMs: 60_000 }
    });
    assert.equal(startProviderFailure.statusCode, 200);

    const experimentsResponse = await performRequest(server, {
      method: 'GET',
      url: '/chaos/experiments',
      headers: {
        ...chaosHeaders
      }
    });
    assert.equal(experimentsResponse.statusCode, 200);
    const experimentsPayload = experimentsResponse.bodyJson<{
      runtimeState: {
        databaseHealthy: boolean;
        persistenceMode: string;
        workerReady: boolean;
        externalProvidersHealthy: boolean;
        redisHealthy: boolean;
        rateLimiterMode: string;
        activeExperimentIds: string[];
      };
      experiments: Array<{
        id: string;
        active: boolean;
        runbook?: { path: string };
        runtimeImpact?: {
          persistenceMode: string;
          redisHealthy: boolean;
          workerReady: boolean;
          externalProvidersHealthy: boolean;
        };
      }>;
    }>();

    assert.equal(experimentsPayload.runtimeState.databaseHealthy, false);
    assert.equal(experimentsPayload.runtimeState.persistenceMode, 'unavailable');
    assert.equal(experimentsPayload.runtimeState.workerReady, false);
    assert.equal(experimentsPayload.runtimeState.externalProvidersHealthy, false);
    assert.equal(experimentsPayload.runtimeState.redisHealthy, false);
    assert.equal(experimentsPayload.runtimeState.rateLimiterMode, 'fail-closed');
    assert.equal(
      experimentsPayload.runtimeState.activeExperimentIds.includes('database-failure'),
      true
    );

    const databaseExperiment = experimentsPayload.experiments.find(
      (item) => item.id === 'database-failure'
    );
    assert.equal(databaseExperiment?.active, true);
    assert.equal(
      databaseExperiment?.runbook?.path,
      'packages/chaos/src/runbooks/database-failure-runbook.md'
    );
    assert.equal(databaseExperiment?.runtimeImpact?.persistenceMode, 'unavailable');

    const providerExperiment = experimentsPayload.experiments.find(
      (item) => item.id === 'provider-failure'
    );
    assert.equal(providerExperiment?.active, true);
    assert.equal(
      providerExperiment?.runbook?.path,
      'packages/chaos/src/runbooks/provider-failure-runbook.md'
    );
    assert.equal(providerExperiment?.runtimeImpact?.externalProvidersHealthy, false);

    const readyResponse = await performRequest(server, {
      method: 'GET',
      url: '/ready',
      headers: {
        host: 'localhost'
      }
    });
    assert.equal(readyResponse.statusCode, 503);
    const readyPayload = readyResponse.bodyJson<{
      readiness: { ready: boolean; persistenceMode: string };
      dependencies: {
        database: { state: string };
        worker: { state: string };
      };
    }>();
    assert.equal(readyPayload.readiness.ready, false);
    assert.equal(readyPayload.readiness.persistenceMode, 'unavailable');
    assert.equal(readyPayload.dependencies.database.state, 'unhealthy');
    assert.equal(readyPayload.dependencies.worker.state, 'degraded');

    const metricsResponse = await performRequest(server, {
      method: 'GET',
      url: '/metrics',
      headers: {
        authorization: 'Bearer test-metrics-token',
        host: 'localhost'
      }
    });
    assert.equal(metricsResponse.statusCode, 200);
    const metricsText = metricsResponse.bodyText();
    assert.match(metricsText, /^app_database_healthy 0$/m);
    assert.match(metricsText, /^app_redis_healthy 0$/m);
    assert.match(metricsText, /^app_persistence_mode\{mode="unavailable"\} 1$/m);
    assert.match(metricsText, /^app_rate_limiter_mode\{mode="fail-closed"\} 1$/m);
    assert.match(metricsText, /^chaos_experiment_active\{experiment="provider-failure"\} 1$/m);
    const healthResponse = await performRequest(server, {
      method: 'GET',
      url: '/health',
      headers: { host: 'localhost' }
    });
    assert.equal(healthResponse.statusCode, 200);
    const healthPayload = healthResponse.bodyJson<{
      ok: boolean;
      persistenceMode: string;
    }>();
    assert.equal(healthPayload.ok, false);
    assert.equal(healthPayload.persistenceMode, 'unavailable');

    const blockedClinicalWrite = await performRequest(server, {
      method: 'POST',
      url: '/encounters',
      headers: {
        ...chaosHeaders,
        'content-type': 'application/json'
      },
      // The guard must run before body validation or the route handler can
      // acknowledge an in-memory mutation during simulated DB loss.
      body: {}
    });
    assert.equal(blockedClinicalWrite.statusCode, 503);
    assert.equal(
      blockedClinicalWrite.bodyJson<{ code: string }>().code,
      'DATABASE_PERSISTENCE_UNAVAILABLE'
    );

    const blockedPublicWebhook = await performRequest(server, {
      method: 'POST',
      url: '/webhooks/pix/synthetic/v1',
      headers: {
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: {}
    });
    assert.equal(blockedPublicWebhook.statusCode, 503);
    assert.equal(
      blockedPublicWebhook.bodyJson<{ code: string }>().code,
      'DATABASE_PERSISTENCE_UNAVAILABLE'
    );

    const blockedWhatsAppWebhook = await performRequest(server, {
      method: 'POST',
      url: '/webhooks/whatsapp/inbound',
      headers: {
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: {}
    });
    assert.equal(blockedWhatsAppWebhook.statusCode, 503);
    assert.equal(
      blockedWhatsAppWebhook.bodyJson<{ code: string }>().code,
      'DATABASE_PERSISTENCE_UNAVAILABLE'
    );

    const healthReadyAliasResponse = await performRequest(server, {
      method: 'GET',
      url: '/health/ready',
      headers: { host: 'localhost' }
    });
    assert.equal(healthReadyAliasResponse.statusCode, 503);

    const livenessResponse = await performRequest(server, {
      method: 'GET',
      url: '/live',
      headers: { host: 'localhost' }
    });
    assert.equal(livenessResponse.statusCode, 200);
    const livenessPayload = livenessResponse.bodyJson<{
      ok: boolean;
      readiness: { persistenceMode: string };
    }>();
    assert.equal(livenessPayload.ok, true);
    assert.equal(livenessPayload.readiness.persistenceMode, 'unavailable');
  } finally {
    for (const experimentId of [
      'database-failure',
      'redis-failure',
      'worker-failure',
      'provider-failure'
    ]) {
      if (chaos.isActive(experimentId)) {
        await chaos.stop(experimentId);
      }
    }
  }
});

test('production-like API rejects chaos mutations before executing an experiment', async () => {
  const chaos = ChaosEngine.getInstance();
  if (chaos.isActive('database-failure')) {
    await chaos.stop('database-failure');
  }

  const productionChaosLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 100 });
  const server = createServerUnderTest({
    environment: 'production',
    pagarmeApiKey: 'pagarme-test-key',
    pagarmePixKey: 'pagarme-test-pix-key',
    nfseProvider: 'abrasf',
    nfseApiUrl: 'https://nfse.test.example/api',
    nfseApiKey: 'nfse-test-key',
    nfseMunicipalityCode: '3550308',
    nfseIssuer: {
      cnpj: '12345678000190',
      inscricaoMunicipal: '123456',
      razaoSocial: 'CVG HIS Testes',
      address: {
        street: 'Rua de Testes',
        number: '100',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01000000',
        country: 'BR'
      }
    },
    resendApiKey: 'resend-test-key',
    smsApiKey: 'sms-test-key',
    googleCalendarAccessToken: 'calendar-test-token',
    googleCalendarCalendarId: 'calendar-test-id',
    attachmentScanner: new ClamAvAttachmentSecurityScanner({ host: 'clamav.test' }),
    fileStorage: new S3CompatibleFileStorage({
      endpoint: 'https://s3.test.example',
      bucket: 'cvg-test',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret'
    }),
    authRateLimiter: productionChaosLimiter,
    pixPaymentAttemptRateLimiter: productionChaosLimiter,
    pixProviderWebhookRateLimiter: productionChaosLimiter
  });

  try {
    await server.ready;
    const accessToken = await login(server, 'admin', 'seed_admin');
    const response = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/database-failure/start',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { durationMs: 60_000 }
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.bodyJson<{ ok: boolean; code: string }>(), {
      ok: false,
      code: 'CHAOS_MUTATIONS_DISABLED'
    });
    assert.equal(chaos.isActive('database-failure'), false);
  } finally {
    if (chaos.isActive('database-failure')) {
      await chaos.stop('database-failure');
    }
    await server.closeDependencies();
  }
});

test('database-backed chaos authorization runs inside the authenticated tenant context', async () => {
  const accountId = 'acc_cvg_demo';
  const createdAt = '2026-09-02T00:00:00.000Z';
  let observedAccountId: string | undefined;
  const adminRole = {
    id: 'role_admin_context',
    code: 'admin',
    name: 'Administrator',
    description: 'Game-day tenant-context regression role',
    createdAt,
    permissionCodes: ['users.manage']
  };
  const accessControl = {
    getAccountChangeToken: async (requestedAccountId: string) => {
      observedAccountId = getTenantContext()?.accountId;
      assert.equal(requestedAccountId, accountId);
      return 'stable-game-day-token';
    },
    findAllRoles: async () => [adminRole],
    findAllPermissions: async () => [
      {
        id: 'permission_users_manage',
        key: 'users.manage',
        description: 'Manage users',
        createdAt
      }
    ],
    findAllTeams: async () => [],
    findAllSectors: async () => [],
    findTeamMemberships: async () => [],
    findSectorMemberships: async () => [],
    findPermissionAssignments: async () => [],
    findUserIdsByAccount: async () => ['user_admin'],
    findRolesByUser: async (userId: string) => (userId === 'user_admin' ? [adminRole] : [])
  };
  const server = createServerUnderTest({
    repositories: { accessControl: accessControl as never }
  });

  try {
    await server.ready;
    const accessToken = await login(server, 'admin', 'seed_admin');
    const response = await performRequest(server, {
      method: 'GET',
      url: '/chaos/experiments',
      headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(observedAccountId, accountId);
  } finally {
    await server.closeDependencies();
  }
});

test('bootstrap serves extracted OpenAPI and docs routes over HTTP semantics', async () => {
  const server = createServerUnderTest();

  const openApiResponse = await performRequest(server, {
    method: 'GET',
    url: '/openapi.json',
    headers: {
      host: 'localhost'
    }
  });
  assert.equal(openApiResponse.statusCode, 200);
  assert.equal(openApiResponse.getHeader('content-type'), 'application/json');
  const openApiPayload = openApiResponse.bodyJson<{
    openapi: string;
    paths: Record<string, unknown>;
  }>();
  assert.equal(openApiPayload.openapi, '3.0.3');
  assert.ok(Object.keys(openApiPayload.paths).length > 0);

  const docsResponse = await performRequest(server, {
    method: 'GET',
    url: '/api-docs',
    headers: {
      host: 'localhost'
    }
  });
  assert.equal(docsResponse.statusCode, 200);
  assert.equal(
    docsResponse.bodyJson<{ endpoints: { openapi: { url: string } } }>().endpoints.openapi.url,
    '/openapi.json'
  );
});

test('bootstrap serves extracted owners and patients routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const ownersResponse = await performRequest(server, {
    method: 'GET',
    url: '/owners?financialResponsible=true',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(ownersResponse.statusCode, 200);
  const ownersPayload = ownersResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(ownersPayload.items[0]?.id, 'owner_maria_silva');

  const patientsResponse = await performRequest(server, {
    method: 'GET',
    url: '/owner-patient-links?ownerId=owner_maria_silva',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(patientsResponse.statusCode, 200);
  const patientsPayload = patientsResponse.bodyJson<{ items: Array<{ patientId: string }> }>();
  assert.equal(patientsPayload.items[0]?.patientId, 'patient_luna');
});

test('repository-backed server does not expose non-persisted owner and patient seeds by default', async () => {
  const server = createServerUnderTest({
    environment: 'development',
    repositories: {
      owner: {
        async create() {},
        async update() {},
        async findById() {
          return null;
        },
        async findByAccountId() {
          return [];
        },
        async delete() {}
      },
      patient: {
        async create() {},
        async update() {},
        async findById() {
          return null;
        },
        async findByAccountId() {
          return [];
        },
        async delete() {}
      },
      ownerPatientLink: {
        async create() {},
        async findById() {
          return null;
        },
        async findByPatientId() {
          return [];
        },
        async findByOwnerId() {
          return [];
        },
        async delete() {}
      }
    } as never
  });
  await server.ready;
  const accessToken = await login(server, 'admin', 'seed_admin');

  const ownersResponse = await performRequest(server, {
    method: 'GET',
    url: '/owners',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  const patientsResponse = await performRequest(server, {
    method: 'GET',
    url: '/patients',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(ownersResponse.statusCode, 200);
  assert.deepEqual(ownersResponse.bodyJson<{ items: unknown[] }>().items, []);
  assert.equal(patientsResponse.statusCode, 200);
  assert.deepEqual(patientsResponse.bodyJson<{ items: unknown[] }>().items, []);
});

test('bootstrap registers prescription routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createResponse = await performRequest(server, {
    method: 'POST',
    url: '/prescriptions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      medicalRecordId: 'mr-http-prescription',
      encounterId: 'enc-http-prescription',
      patientId: 'patient_luna',
      medicationName: 'Dipirona',
      dosage: '25 mg/kg',
      route: 'Oral',
      frequency: '12/12h'
    }
  });
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; medicationName: string }>();
  assert.equal(created.medicationName, 'Dipirona');

  const listResponse = await performRequest(server, {
    method: 'GET',
    url: '/prescriptions?patientId=patient_luna',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listResponse.statusCode, 200);
  const payload = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.ok(payload.items.some((item) => item.id === created.id));
});

test('bootstrap serves administrative financial routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Fluxo financeiro administrativo HTTP'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string }>();

  const estimateResponse = await performRequest(server, {
    method: 'POST',
    url: '/billing/estimate',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      administrativeNotes: 'Orcamento administrativo HTTP'
    }
  });
  assert.equal(estimateResponse.statusCode, 200);

  const itemResponse = await performRequest(server, {
    method: 'POST',
    url: '/billing/items',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta HTTP',
      quantity: 1,
      unitPriceAmount: 150
    }
  });
  assert.equal(itemResponse.statusCode, 201);

  const summaryResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}/financial-summary`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(summaryResponse.statusCode, 200);
  const summary = summaryResponse.bodyJson<{
    total: number;
    receivables: Array<{ installmentLabel: string }>;
  }>();
  assert.equal(summary.total, 150);
  assert.equal(summary.receivables.length, 1);

  const closeResponse = await performRequest(server, {
    method: 'POST',
    url: `/encounters/${encounter.id}/financial-close`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      notes: 'Parcelamento administrativo HTTP',
      installments: [
        { label: 'Entrada', amount: 50, dueAt: '2026-04-15T00:00:00.000Z' },
        { label: '30 dias', amount: 100, dueAt: '2026-05-15T00:00:00.000Z' }
      ]
    }
  });
  assert.equal(closeResponse.statusCode, 200);
  const closedSummary = closeResponse.bodyJson<{
    financialClosed: boolean;
    receivables: Array<{ installmentLabel: string }>;
  }>();
  assert.equal(closedSummary.financialClosed, true);
  assert.equal(closedSummary.receivables.length, 2);

  const receivablesResponse = await performRequest(server, {
    method: 'GET',
    url: `/financial/receivables?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(receivablesResponse.statusCode, 200);
  const receivables = receivablesResponse.bodyJson<{ data: Array<{ encounterId: string }> }>();
  assert.equal(receivables.data.length, 2);
  assert.equal(receivables.data[0]?.encounterId, encounter.id);
});

test('bootstrap deletes encounters over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Delete encounter over HTTP'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string }>();

  const nestedDeleteResponse = await performRequest(server, {
    method: 'DELETE',
    url: `/encounters/${encounter.id}/nested`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(nestedDeleteResponse.statusCode, 404);

  const preservedEncounterResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(preservedEncounterResponse.statusCode, 200);

  const deleteResponse = await performRequest(server, {
    method: 'DELETE',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(deleteResponse.statusCode, 204);

  const getResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(getResponse.statusCode, 404);
});

test('attachment base64 accepts the exact decoded frontier and returns canonical 413 above it', () => {
  const exact = Buffer.alloc(MAX_ATTACHMENT_FILE_SIZE_BYTES).toString('base64');
  const decoded = decodeAttachmentContent(exact);
  assert.equal(decoded?.length, MAX_ATTACHMENT_FILE_SIZE_BYTES);
  assert.equal(exact.length, MAX_ATTACHMENT_BASE64_LENGTH);

  const oversized = Buffer.alloc(MAX_ATTACHMENT_FILE_SIZE_BYTES + 1).toString('base64');
  assert.throws(
    () => decodeAttachmentContent(oversized),
    (error) =>
      error instanceof PayloadTooLargeError &&
      error.statusCode === 413 &&
      error.code === 'PAYLOAD_TOO_LARGE'
  );
  assert.throws(
    () => decodeAttachmentContent('not-base64'),
    (error) => error instanceof Error && (error as { statusCode?: number }).statusCode === 400
  );
});

test('attachment HTTP boundary returns canonical 413 for a declared oversized body', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');
  const response = await performRequest(server, {
    method: 'POST',
    url: '/attachments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'content-length': String(MAX_ATTACHMENT_JSON_BODY_BYTES + 1),
      host: 'localhost'
    },
    body: {}
  });

  assert.equal(response.statusCode, 413);
  assert.equal(response.bodyJson<{ code: string }>().code, 'PAYLOAD_TOO_LARGE');
});

test('attachment upload rejects mismatched content, hides storage failures, and audits only success', async () => {
  const content = Buffer.from('M27 attachment upload acceptance probe', 'utf8');
  const checksum = createHash('sha256').update(content).digest('hex');
  let storageMode: 'fail' | 'cleanup-fail' | 'succeed' = 'fail';
  let storageWrites = 0;
  const stored = new Map<string, Buffer>();
  const server = createServerUnderTest({
    fileStorage: {
      async store(accountId, linkedEntityId, fileName, bytes) {
        storageWrites += 1;
        if (storageMode === 'fail') {
          throw new Error('private-storage-endpoint-and-credential-marker');
        }
        const storageKey = `${accountId}/${linkedEntityId}/uploads/${fileName}`;
        stored.set(storageKey, Buffer.from(bytes));
        return {
          storageKey,
          checksum:
            storageMode === 'cleanup-fail'
              ? 'provider-checksum-mismatch'
              : createHash('sha256').update(bytes).digest('hex'),
          sizeBytes: bytes.length
        };
      },
      async retrieve(_accountId, storageKey) {
        return stored.get(storageKey) ?? null;
      },
      async delete(_accountId, storageKey) {
        if (storageMode === 'cleanup-fail') {
          throw new Error('private-storage-cleanup-object-key-marker');
        }
        return stored.delete(storageKey);
      },
      async exists(_accountId, storageKey) {
        return stored.has(storageKey);
      }
    }
  });
  const accessToken = await login(server, 'admin', 'seed_admin');
  const authenticatedHeaders = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    host: 'localhost'
  };
  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: authenticatedHeaders,
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'M27 upload boundary'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounterId = encounterResponse.bodyJson<{ id: string }>().id;
  const receptionToken = await login(server, 'reception', 'seed_reception');
  const forbiddenUpload = await performRequest(server, {
    method: 'POST',
    url: '/attachments',
    headers: {
      authorization: `Bearer ${receptionToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      linkedEntityType: 'encounter',
      linkedEntityId: encounterId,
      category: 'lab',
      fileName: 'resultado.txt',
      mimeType: 'text/plain',
      checksum,
      contentBase64: content.toString('base64')
    }
  });
  assert.equal(forbiddenUpload.statusCode, 403);
  assert.equal(forbiddenUpload.bodyJson<{ code: string }>().code, 'FORBIDDEN');
  assert.equal(storageWrites, 0, 'a principal without upload permission must not reach storage');

  const upload = (mimeType: string) =>
    performRequest(server, {
      method: 'POST',
      url: '/attachments',
      headers: authenticatedHeaders,
      body: {
        linkedEntityType: 'encounter',
        linkedEntityId: encounterId,
        category: 'lab',
        fileName: 'resultado.txt',
        mimeType,
        checksum,
        contentBase64: content.toString('base64')
      }
    });
  const assertGenericStorageFailure = (response: MockResponse) => {
    assert.equal(response.statusCode, 500);
    const error = response.bodyJson<{ code: string; message: string }>();
    assert.equal(error.code, 'INTERNAL_ERROR');
    assert.equal(error.message, 'Unexpected error');
  };

  const invalidType = await upload('image/png');
  assert.equal(invalidType.statusCode, 400);
  assert.equal(invalidType.bodyJson<{ code: string }>().code, 'VALIDATION_ERROR');
  assert.equal(storageWrites, 0, 'invalid content must be rejected before storage access');

  const storageFailure = await upload('text/plain');
  assert.equal(storageFailure.statusCode, 500);
  assertGenericStorageFailure(storageFailure);
  assert.doesNotMatch(storageFailure.bodyText(), /private-storage-endpoint-and-credential-marker/);

  storageMode = 'cleanup-fail';
  const cleanupFailure = await upload('text/plain');
  assertGenericStorageFailure(cleanupFailure);
  assert.doesNotMatch(cleanupFailure.bodyText(), /private-storage-cleanup-object-key-marker/);

  storageMode = 'succeed';
  const successfulUpload = await upload('text/plain');
  assert.equal(successfulUpload.statusCode, 201);
  const createdAttachment = successfulUpload.bodyJson<{ id: string }>();

  const listedAttachments = await performRequest(server, {
    method: 'GET',
    url: `/attachments?linkedEntityType=encounter&linkedEntityId=${encounterId}`,
    headers: authenticatedHeaders
  });
  assert.equal(listedAttachments.statusCode, 200);
  assert.deepEqual(
    listedAttachments.bodyJson<{ items: Array<{ id: string }> }>().items.map(({ id }) => id),
    [createdAttachment.id]
  );

  const auditEvents = await performRequest(server, {
    method: 'GET',
    url: '/audit/events?module=attachments&limit=100',
    headers: authenticatedHeaders
  });
  assert.equal(auditEvents.statusCode, 200);
  const uploadEvents = auditEvents
    .bodyJson<{
      items: Array<{ action: string; entityId: string; entityType: string; module: string }>;
    }>()
    .items.filter((event) => event.action === 'upload');
  assert.equal(uploadEvents.length, 1);
  assert.deepEqual(
    {
      action: uploadEvents[0]?.action,
      entityId: uploadEvents[0]?.entityId,
      entityType: uploadEvents[0]?.entityType,
      module: uploadEvents[0]?.module
    },
    {
      action: 'upload',
      entityId: createdAttachment.id,
      entityType: 'attachment',
      module: 'attachments'
    }
  );
});

test('diagnostic summaries and attachments preserve the authenticated account over HTTP', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');
  const authenticatedHeaders = {
    authorization: `Bearer ${accessToken}`,
    host: 'localhost'
  };

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      ...authenticatedHeaders,
      'content-type': 'application/json'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Diagnostic HTTP account boundary'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const orderResponse = await performRequest(server, {
    method: 'POST',
    url: '/diagnostics/orders',
    headers: {
      ...authenticatedHeaders,
      'content-type': 'application/json'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: 'Hemograma',
      reason: 'HTTP account boundary'
    }
  });
  assert.equal(orderResponse.statusCode, 201);
  const order = orderResponse.bodyJson<{
    id: string;
    accountId: string;
    encounterId: string;
  }>();
  assert.equal(order.encounterId, encounter.id);

  const summaryResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}/summary`,
    headers: authenticatedHeaders
  });
  assert.equal(summaryResponse.statusCode, 200);
  const summary = summaryResponse.bodyJson<{
    diagnostics: { totalOrders: number; latestOrders: Array<{ id: string; accountId: string }> };
  }>();
  assert.equal(summary.diagnostics.totalOrders, 1);
  assert.equal(summary.diagnostics.latestOrders[0]?.id, order.id);
  assert.equal(summary.diagnostics.latestOrders[0]?.accountId, order.accountId);

  const attachmentResponse = await performRequest(server, {
    method: 'POST',
    url: '/attachments',
    headers: {
      ...authenticatedHeaders,
      'content-type': 'application/json'
    },
    body: {
      linkedEntityType: 'diagnostic_order',
      linkedEntityId: order.id,
      category: 'lab',
      fileName: 'resultado.txt',
      mimeType: 'text/plain',
      checksum: 'metadata-only-checksum'
    }
  });
  assert.equal(attachmentResponse.statusCode, 201);
  const attachment = attachmentResponse.bodyJson<{
    id: string;
    accountId: string;
    linkedEntityType: string;
    linkedEntityId: string;
  }>();
  assert.equal(attachment.accountId, order.accountId);
  assert.equal(attachment.linkedEntityType, 'diagnostic_order');
  assert.equal(attachment.linkedEntityId, order.id);

  const listResponse = await performRequest(server, {
    method: 'GET',
    url: `/attachments?linkedEntityType=diagnostic_order&linkedEntityId=${order.id}`,
    headers: authenticatedHeaders
  });
  assert.equal(listResponse.statusCode, 200);
  assert.deepEqual(
    listResponse
      .bodyJson<{ items: Array<{ id: string; accountId: string }> }>()
      .items.map((item) => ({ id: item.id, accountId: item.accountId })),
    [{ id: attachment.id, accountId: order.accountId }]
  );
});

test('bootstrap serves administrative report hubs over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/reports/administrative-hubs',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    generatedAt: string;
    domains: {
      financial: { billing: { totalRecords: number } };
      commercial: { quotes: { issuedCount: number } };
      cash: { hasOpenRegister: boolean };
      fiscal: { activeTaxes: number };
    };
    highlights: Array<{ title: string }>;
  }>();

  assert.ok(payload.generatedAt.length > 0);
  assert.equal(typeof payload.domains.financial.billing.totalRecords, 'number');
  assert.equal(typeof payload.domains.commercial.quotes.issuedCount, 'number');
  assert.equal(typeof payload.domains.cash.hasOpenRegister, 'boolean');
  assert.equal(typeof payload.domains.fiscal.activeTaxes, 'number');
  assert.ok(Array.isArray(payload.highlights));
});

test('queue endpoints support check-in, list and call lifecycle over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createResponse = await performRequest(server, {
    method: 'POST',
    url: '/queue/check-in',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'HTTP queue lifecycle',
      priority: 'high'
    }
  });
  assert.equal(createResponse.statusCode, 201);
  const queueEntry = createResponse.bodyJson<{ id: string; status: string }>();

  const listResponse = await performRequest(server, {
    method: 'GET',
    url: '/queue',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listResponse.statusCode, 200);
  const listed = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(
    listed.items.some((entry) => entry.id === queueEntry.id),
    true
  );

  const callResponse = await performRequest(server, {
    method: 'POST',
    url: `/queue/${queueEntry.id}/call`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(callResponse.statusCode, 200);
  const called = callResponse.bodyJson<{ status: string; calledAt?: string }>();
  assert.equal(called.status, 'called');
  assert.ok(called.calledAt);
});

test('appointments reject duplicate time slot for the same patient over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'reception', 'seed_reception');
  const payload = {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-20T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta duplicada'
  };

  const first = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: payload
  });
  assert.equal(first.statusCode, 201);

  const duplicate = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: payload
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.bodyJson<{ code: string }>().code, 'CONFLICT');
});

test('in-memory encounters expose active-patient conflicts through the stable HTTP envelope', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'reception', 'seed_reception');
  const payload = {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Duplicate active encounter over HTTP'
  };
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    host: 'localhost'
  };

  const first = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers,
    body: payload
  });
  assert.equal(first.statusCode, 201);

  const duplicate = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers,
    body: payload
  });
  assert.equal(duplicate.statusCode, 409);
  const errorBody = duplicate.bodyJson<{
    code: string;
    message: string;
    details?: { encounterId?: string };
    correlationId?: string;
  }>();
  assert.equal(errorBody.code, 'CONFLICT');
  assert.equal(errorBody.message, 'Patient already has an active encounter');
  assert.ok(errorBody.details?.encounterId);
  assert.ok(errorBody.correlationId);
});

test('database-origin active-patient conflicts map to HTTP 409 with safe details', async () => {
  const encounterRepository = createDatabaseConflictEncounterRepository();
  const firstServer = createServerUnderTest({
    repositories: { encounter: encounterRepository },
    requireUuidEntityIdentifiers: false
  });
  const secondServer = createServerUnderTest({
    repositories: { encounter: encounterRepository },
    requireUuidEntityIdentifiers: false
  });
  await Promise.all([firstServer.ready, secondServer.ready]);

  const firstToken = await login(firstServer, 'reception', 'seed_reception');
  const secondToken = await login(secondServer, 'reception', 'seed_reception');
  const payload = {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Database-origin duplicate active encounter'
  };

  const first = await performRequest(firstServer, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${firstToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: payload
  });
  assert.equal(first.statusCode, 201);

  const checkIn = await performRequest(secondServer, {
    method: 'POST',
    url: '/queue/check-in',
    headers: {
      authorization: `Bearer ${secondToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: payload.patientId,
      ownerId: payload.ownerId,
      reason: 'Database-origin conflict queue rollback',
      priority: 'high'
    }
  });
  assert.equal(checkIn.statusCode, 201);
  const queueEntry = checkIn.bodyJson<{ id: string }>();

  const duplicate = await performRequest(secondServer, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${secondToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { ...payload, queueEntryId: queueEntry.id }
  });
  assert.equal(duplicate.statusCode, 409);
  const errorBody = duplicate.bodyJson<{
    code: string;
    message: string;
    details?: { patientId?: string; encounterId?: string };
    correlationId?: string;
  }>();
  assert.equal(errorBody.code, 'CONFLICT');
  assert.equal(errorBody.message, 'Patient already has an active encounter');
  assert.equal(errorBody.details?.patientId, payload.patientId);
  assert.equal(errorBody.details?.encounterId, undefined);
  assert.ok(errorBody.correlationId);

  const queueAfterConflict = await performRequest(secondServer, {
    method: 'GET',
    url: '/queue',
    headers: { authorization: `Bearer ${secondToken}`, host: 'localhost' }
  });
  assert.equal(queueAfterConflict.statusCode, 200);
  const restoredQueueEntry = queueAfterConflict
    .bodyJson<{ items: Array<{ id: string; status: string; encounterId?: string }> }>()
    .items.find((entry) => entry.id === queueEntry.id);
  assert.equal(restoredQueueEntry?.status, 'waiting');
  assert.equal(restoredQueueEntry?.encounterId, undefined);
});

test('triage patch updates the record and transitions encounter status over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'HTTP triage update'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const createTriageResponse = await performRequest(server, {
    method: 'POST',
    url: '/triage',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      priority: 'medium',
      chiefComplaint: 'Apatia',
      initialNotes: 'Paciente chegou sem apetite',
      alerts: ['letargia'],
      destination: 'observation'
    }
  });
  assert.equal(createTriageResponse.statusCode, 201);
  const triage = createTriageResponse.bodyJson<{ id: string }>();

  const updateTriageResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/triage/${triage.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      priority: 'high',
      chiefComplaint: 'Apatia e desidratacao',
      alerts: ['letargia', 'desidratacao'],
      destination: 'in_care'
    }
  });
  assert.equal(updateTriageResponse.statusCode, 200);
  const updated = updateTriageResponse.bodyJson<{ priority: string; destination: string }>();
  assert.equal(updated.priority, 'high');
  assert.equal(updated.destination, 'in_care');

  const encounterAfterResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(encounterAfterResponse.statusCode, 200);
  const encounterAfter = encounterAfterResponse.bodyJson<{ status: string }>();
  assert.equal(encounterAfter.status, 'in_care');

  const triageListResponse = await performRequest(server, {
    method: 'GET',
    url: `/triage?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(triageListResponse.statusCode, 200);
  const triageList = triageListResponse.bodyJson<{ items: Array<{ chiefComplaint: string }> }>();
  assert.equal(triageList.items[0]?.chiefComplaint, 'Apatia e desidratacao');

  const historyResponse = await performRequest(server, {
    method: 'GET',
    url: `/triage/${triage.id}/history`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(historyResponse.statusCode, 200);
  const history = historyResponse.bodyJson<{
    items: Array<{ changedFields: string[]; nextSnapshot: { destination: string } }>;
  }>();
  assert.equal(history.items.length, 1);
  assert.equal(history.items[0]?.changedFields.includes('priority'), true);
  assert.equal(history.items[0]?.nextSnapshot.destination, 'in_care');
});

test('triage rejects an explicitly empty encounter filter instead of broadening the collection', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/triage?encounterId=',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 400);
});

test('triage HTTP collections and history remain isolated across authenticated accounts', async () => {
  const server = createTwoAccountTriageServer();
  await server.ready;
  const accessTokenA = await login(server, 'triage_admin_0', 'seed_admin_0');
  const accessTokenB = await login(server, 'triage_admin_1', 'seed_admin_1');

  const listA = await performRequest(server, {
    method: 'GET',
    url: '/triage',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(listA.statusCode, 200);
  assert.deepEqual(
    listA.bodyJson<{ items: Array<{ id: string }> }>().items.map((item) => item.id),
    ['triage_http_0']
  );

  const listB = await performRequest(server, {
    method: 'GET',
    url: '/triage',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(listB.statusCode, 200);
  assert.deepEqual(
    listB.bodyJson<{ items: Array<{ id: string }> }>().items.map((item) => item.id),
    ['triage_http_1']
  );

  const crossAccountHistory = await performRequest(server, {
    method: 'GET',
    url: '/triage/triage_http_1/history',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(crossAccountHistory.statusCode, 404);

  const crossAccountUpdate = await performRequest(server, {
    method: 'PATCH',
    url: '/triage/triage_http_1',
    headers: {
      authorization: `Bearer ${accessTokenA}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { priority: 'low' }
  });
  assert.equal(crossAccountUpdate.statusCode, 404);

  const crossAccountCreate = await performRequest(server, {
    method: 'POST',
    url: '/triage',
    headers: {
      authorization: `Bearer ${accessTokenA}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: 'enc_triage_http_1',
      patientId: 'patient_triage_http_1',
      priority: 'low',
      chiefComplaint: 'Tentativa cruzada',
      alerts: [],
      destination: 'observation'
    }
  });
  assert.equal(crossAccountCreate.statusCode, 404);

  const ownHistory = await performRequest(server, {
    method: 'GET',
    url: '/triage/triage_http_1/history',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(ownHistory.statusCode, 200);
  assert.equal(ownHistory.bodyJson<{ items: unknown[] }>().items.length, 1);

  const nestedHistoryPath = await performRequest(server, {
    method: 'GET',
    url: '/triage/triage_http_1/extra/history',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(nestedHistoryPath.statusCode, 404);
});

test('diagnostic summaries, orders and attachments fail closed across authenticated accounts', async () => {
  const server = createTwoAccountTriageServer();
  await server.ready;
  const accessTokenA = await login(server, 'triage_admin_0', 'seed_admin_0');
  const accessTokenB = await login(server, 'triage_admin_1', 'seed_admin_1');

  const listA = await performRequest(server, {
    method: 'GET',
    url: '/diagnostics/orders',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(listA.statusCode, 200);
  assert.deepEqual(
    listA.bodyJson<{ items: Array<{ id: string }> }>().items.map((item) => item.id),
    ['diagnostic_http_0']
  );

  const listB = await performRequest(server, {
    method: 'GET',
    url: '/diagnostics/orders',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(listB.statusCode, 200);
  assert.deepEqual(
    listB.bodyJson<{ items: Array<{ id: string }> }>().items.map((item) => item.id),
    ['diagnostic_http_1']
  );

  const crossAccountOrder = await performRequest(server, {
    method: 'GET',
    url: '/diagnostics/orders/diagnostic_http_1',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(crossAccountOrder.statusCode, 404);

  const crossAccountSummary = await performRequest(server, {
    method: 'GET',
    url: '/encounters/enc_triage_http_1/summary',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(crossAccountSummary.statusCode, 404);

  const crossAccountCreate = await performRequest(server, {
    method: 'POST',
    url: '/diagnostics/orders',
    headers: {
      authorization: `Bearer ${accessTokenA}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: 'enc_triage_http_1',
      patientId: 'patient_triage_http_1',
      examType: 'Hemograma',
      reason: 'Tentativa diagnostica cruzada'
    }
  });
  assert.equal(crossAccountCreate.statusCode, 404);

  const crossAccountAttachment = await performRequest(server, {
    method: 'POST',
    url: '/attachments',
    headers: {
      authorization: `Bearer ${accessTokenA}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      linkedEntityType: 'diagnostic_order',
      linkedEntityId: 'diagnostic_http_1',
      category: 'lab',
      fileName: 'resultado.txt',
      mimeType: 'text/plain',
      checksum: 'cross-account-attachment'
    }
  });
  assert.equal(crossAccountAttachment.statusCode, 404);
});

test('triage validation does not transition a reception encounter before persistence', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Triage validation ordering'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string }>();

  const invalidTriageResponse = await performRequest(server, {
    method: 'POST',
    url: '/triage',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: 'patient_not_the_encounter_patient',
      priority: 'high',
      chiefComplaint: 'Payload invalido',
      alerts: [],
      destination: 'in_care'
    }
  });
  assert.equal(invalidTriageResponse.statusCode, 400);

  const unchangedEncounter = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(unchangedEncounter.statusCode, 200);
  assert.equal(unchangedEncounter.bodyJson<{ status: string }>().status, 'reception');
});

test('triage creation rejects a closed encounter without speculative list or timeline state', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Closed triage precondition'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const closeResponse = await performRequest(server, {
    method: 'POST',
    url: `/encounters/${encounter.id}/close`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { closeReason: 'Atendimento encerrado antes da triagem' }
  });
  assert.equal(closeResponse.statusCode, 200);

  const triageResponse = await performRequest(server, {
    method: 'POST',
    url: '/triage',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      priority: 'high',
      chiefComplaint: 'Tentativa após encerramento',
      alerts: [],
      destination: 'in_care'
    }
  });
  assert.equal(triageResponse.statusCode, 409);

  const triageListResponse = await performRequest(server, {
    method: 'GET',
    url: `/triage?encounterId=${encounter.id}`,
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(triageListResponse.statusCode, 200);
  assert.deepEqual(triageListResponse.bodyJson<{ items: unknown[] }>().items, []);

  const timelineResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}/timeline`,
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(timelineResponse.statusCode, 200);
  const timeline = timelineResponse.bodyJson<{
    items: Array<{ eventType?: string }>;
  }>().items;
  assert.equal(
    timeline.some((event) => event.eventType === 'triage_recorded'),
    false
  );
});

test('quotes expose dedicated PDF generation over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createQuote = await performRequest(server, {
    method: 'POST',
    url: '/quotes',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { notes: 'Quote PDF API' }
  });
  assert.equal(createQuote.statusCode, 201);
  const quote = createQuote.bodyJson<{ id: string }>();

  const addItem = await performRequest(server, {
    method: 'POST',
    url: `/quotes/${quote.id}/items`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      itemType: 'service',
      nameSnapshot: 'Consulta clinica',
      unitPrice: 180,
      quantity: 1
    }
  });
  assert.equal(addItem.statusCode, 201);

  const pdfResponse = await performRequest(server, {
    method: 'GET',
    url: `/quotes/${quote.id}/pdf`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(pdfResponse.statusCode, 200);
  assert.equal(pdfResponse.getHeader('content-type'), 'application/pdf');
  assert.ok(pdfResponse.getHeader('content-disposition')?.includes('.pdf'));
  assert.ok(pdfResponse.bodyText().startsWith('%PDF-1.4'));
});

test('medical records expose revision history and archive semantics over HTTP', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'HTTP medical record contract'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const createEntryResponse = await performRequest(server, {
    method: 'POST',
    url: '/medical-records/entries',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'progress_note',
      title: 'Admissao',
      content: 'Paciente admitido para observacao.'
    }
  });
  assert.equal(createEntryResponse.statusCode, 201);
  const entry = createEntryResponse.bodyJson<{ id: string }>();

  const updateEntryResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/medical-records/entries/${entry.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Admissao atualizada',
      content: 'Paciente admitido e monitorado.'
    }
  });
  assert.equal(updateEntryResponse.statusCode, 200);

  const revisionsResponse = await performRequest(server, {
    method: 'GET',
    url: `/medical-records/entries/${entry.id}/revisions`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(revisionsResponse.statusCode, 200);
  const revisions = revisionsResponse.bodyJson<{
    items: Array<{ version: number; content: string }>;
  }>();
  assert.equal(revisions.items.length, 1);
  assert.equal(revisions.items[0]?.version, 1);
  assert.equal(revisions.items[0]?.content, 'Paciente admitido para observacao.');

  const archiveResponse = await performRequest(server, {
    method: 'DELETE',
    url: `/medical-records/entries/${entry.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      reason: 'Lancamento duplicado'
    }
  });
  assert.equal(archiveResponse.statusCode, 200);
  const archived = archiveResponse.bodyJson<{ deletedAt?: string; deleteReason?: string }>();
  assert.ok(archived.deletedAt);
  assert.equal(archived.deleteReason, 'Lancamento duplicado');

  const listEntriesResponse = await performRequest(server, {
    method: 'GET',
    url: `/medical-records/entries?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listEntriesResponse.statusCode, 200);
  const entries = listEntriesResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(entries.items.length, 0);
});

test('medical-record HTTP collections, timeline and mutations fail closed across accounts', async () => {
  const server = createTwoAccountMedicalRecordsServer();
  await server.ready;
  const accessTokenA = await login(server, 'medical_admin_0', 'seed_medical_0');
  const accessTokenB = await login(server, 'medical_admin_1', 'seed_medical_1');

  const ownListA = await performRequest(server, {
    method: 'GET',
    url: '/medical-records',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(ownListA.statusCode, 200);
  const ownListAItems = ownListA.bodyJson<{
    items: Array<{ record: { id: string }; entryCount: number }>;
  }>().items;
  assert.equal(ownListAItems.length, 1);
  assert.equal(ownListAItems[0]?.record.id, 'medical_record_http_0');
  assert.equal(ownListAItems[0]?.entryCount, 1);

  const ownListB = await performRequest(server, {
    method: 'GET',
    url: '/medical-records',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(ownListB.statusCode, 200);
  const ownListBItems = ownListB.bodyJson<{
    items: Array<{ record: { id: string }; entryCount: number }>;
  }>().items;
  assert.equal(ownListBItems.length, 1);
  assert.equal(ownListBItems[0]?.record.id, 'medical_record_http_1');
  assert.equal(ownListBItems[0]?.entryCount, 1);

  const emptyEncounterFilterList = await performRequest(server, {
    method: 'GET',
    url: '/medical-records?encounterId=',
    headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
  });
  assert.equal(emptyEncounterFilterList.statusCode, 200);
  assert.deepEqual(
    emptyEncounterFilterList
      .bodyJson<{ items: Array<{ record: { id: string } }> }>()
      .items.map((item) => item.record.id),
    ['medical_record_http_0']
  );

  const foreignRequests = await Promise.all([
    performRequest(server, {
      method: 'GET',
      url: '/medical-records?encounterId=enc_medical_http_1',
      headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'GET',
      url: '/medical-records/entries?encounterId=enc_medical_http_1',
      headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'GET',
      url: '/medical-records/timeline?encounterId=enc_medical_http_1',
      headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'GET',
      url: '/medical-records/entries/clinical_entry_http_1/revisions',
      headers: { authorization: `Bearer ${accessTokenA}`, host: 'localhost' }
    }),
    performRequest(server, {
      method: 'PATCH',
      url: '/medical-records/entries/clinical_entry_http_1',
      headers: {
        authorization: `Bearer ${accessTokenA}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { title: 'Cross-account mutation', content: 'Should never persist' }
    }),
    performRequest(server, {
      method: 'DELETE',
      url: '/medical-records/entries/clinical_entry_http_1',
      headers: {
        authorization: `Bearer ${accessTokenA}`,
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { reason: 'Cross-account archive' }
    })
  ]);

  for (const response of foreignRequests) {
    assert.equal(response.statusCode, 404);
    assert.doesNotMatch(response.bodyText(), /Private (title|content|timeline) 1/);
  }

  const ownRecord = await performRequest(server, {
    method: 'GET',
    url: '/medical-records?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(ownRecord.statusCode, 200);
  const ownRecordBody = ownRecord.bodyJson<{
    record: { id: string };
    entries: Array<{ content: string }>;
  }>();
  assert.equal(ownRecordBody.record.id, 'medical_record_http_1');
  assert.equal(ownRecordBody.entries[0]?.content, 'Private content 1');

  const ownEntries = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/entries?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(ownEntries.statusCode, 200);
  assert.equal(
    ownEntries.bodyJson<{ items: Array<{ id: string }> }>().items[0]?.id,
    'clinical_entry_http_1'
  );

  const ownTimeline = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });
  assert.equal(ownTimeline.statusCode, 200);
  assert.equal(
    ownTimeline.bodyJson<{ items: Array<{ summary: string }> }>().items[0]?.summary,
    'Private timeline 1'
  );

  const ownUpdate = await performRequest(server, {
    method: 'PATCH',
    url: '/medical-records/entries/clinical_entry_http_1',
    headers: {
      authorization: `Bearer ${accessTokenB}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { title: 'Updated own title', content: 'Updated own content' }
  });
  assert.equal(ownUpdate.statusCode, 200);
  assert.equal(ownUpdate.bodyJson<{ title: string; content: string }>().title, 'Updated own title');
});

test('medical-record attachment collections filter contaminated repository rows by account', async () => {
  const createdAt = '2026-04-01T10:00:00.000Z';
  const attachments = [
    {
      id: 'attachment_medical_http_foreign',
      accountId: 'acc_medical_http_a',
      linkedEntityType: 'encounter',
      linkedEntityId: 'enc_medical_http_1',
      category: 'document',
      fileName: 'foreign.txt',
      storageKey: 'pending/acc_medical_http_a/enc_medical_http_1/foreign.txt',
      mimeType: 'text/plain',
      checksum: 'foreign-checksum',
      source: 'upload',
      scanStatus: 'available',
      uploadedByUserId: 'user_medical_http_0',
      createdAt
    },
    {
      id: 'attachment_medical_http_own',
      accountId: 'acc_medical_http_b',
      linkedEntityType: 'encounter',
      linkedEntityId: 'enc_medical_http_1',
      category: 'document',
      fileName: 'own.txt',
      storageKey: 'pending/acc_medical_http_b/enc_medical_http_1/own.txt',
      mimeType: 'text/plain',
      checksum: 'own-checksum',
      source: 'upload',
      scanStatus: 'available',
      uploadedByUserId: 'user_medical_http_1',
      createdAt
    }
  ];
  const server = createTwoAccountMedicalRecordsServer({
    attachmentRepository: {
      async create() {},
      async findById(_accountId: string, id: string) {
        return attachments.find((attachment) => attachment.id === id) ?? null;
      },
      async findByLinkedEntity(_accountId: string) {
        return attachments;
      },
      async deleteById() {
        return true;
      }
    }
  });
  await server.ready;
  const accessTokenB = await login(server, 'medical_admin_1', 'seed_medical_1');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/attachments?linkedEntityType=encounter&linkedEntityId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessTokenB}`, host: 'localhost' }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    response.bodyJson<{ items: Array<{ id: string }> }>().items.map((item) => item.id),
    ['attachment_medical_http_own']
  );
});

test('cross-account attachment download requests return opaque 404 while the owner can retrieve content', async () => {
  const createdAt = '2026-04-01T10:00:00.000Z';
  const attachment = {
    id: 'attachment_triage_http_owner',
    accountId: 'acc_triage_http_b',
    linkedEntityType: 'diagnostic_order',
    linkedEntityId: 'diagnostic_http_1',
    category: 'document',
    fileName: 'owner.txt',
    storageKey: 'local/acc_triage_http_b/diagnostic_http_1/owner.txt',
    mimeType: 'text/plain',
    checksum: 'owner-checksum',
    sizeBytes: Buffer.byteLength('private attachment content'),
    source: 'upload',
    scanStatus: 'available',
    uploadedByUserId: 'user_triage_http_1',
    createdAt
  };
  const pendingAttachment = {
    ...attachment,
    id: 'attachment_triage_http_pending',
    scanStatus: 'pending' as const
  };
  const content = Buffer.from('private attachment content', 'utf8');
  const fileRetrievals: string[] = [];
  const server = createTwoAccountTriageServer({
    attachmentRepository: {
      async create() {},
      // Deliberately return the row by ID regardless of the requested account so
      // the service's account check also guards against contaminated repositories.
      async findById(_accountId: string, id: string) {
        return id === attachment.id
          ? attachment
          : id === pendingAttachment.id
            ? pendingAttachment
            : null;
      },
      async findByLinkedEntity() {
        return [attachment];
      },
      async deleteById() {
        return true;
      }
    },
    fileStorage: {
      async retrieve(accountId: string, storageKey: string) {
        fileRetrievals.push(`${accountId}:${storageKey}`);
        return accountId === attachment.accountId && storageKey === attachment.storageKey
          ? content
          : null;
      }
    }
  });
  await server.ready;
  const foreignToken = await login(server, 'triage_admin_0', 'seed_admin_0');
  const ownerToken = await login(server, 'triage_admin_1', 'seed_admin_1');
  const attachmentPath = `/attachments/${attachment.id}`;
  const expectOpaqueNotFound = (response: MockResponse, requestedAttachmentId: string) => {
    assert.equal(response.statusCode, 404);
    const body = response.bodyJson<{
      code: string;
      message: string;
      details?: Record<string, unknown>;
      correlationId: string;
    }>();
    assert.equal(body.code, 'NOT_FOUND');
    assert.equal(body.message, 'Attachment not found');
    assert.deepEqual(body.details, { attachmentId: requestedAttachmentId });
    return {
      code: body.code,
      message: body.message,
      detailFields: Object.keys(body.details ?? {}).sort()
    };
  };

  const foreignDownloadUrl = await performRequest(server, {
    method: 'POST',
    url: `${attachmentPath}/download-url`,
    headers: { authorization: `Bearer ${foreignToken}`, host: 'localhost' }
  });

  const foreignContent = await performRequest(server, {
    method: 'GET',
    url: `${attachmentPath}/content`,
    headers: { authorization: `Bearer ${foreignToken}`, host: 'localhost' }
  });

  const missingDownloadUrl = await performRequest(server, {
    method: 'POST',
    url: '/attachments/attachment_missing/download-url',
    headers: { authorization: `Bearer ${foreignToken}`, host: 'localhost' }
  });
  const missingContent = await performRequest(server, {
    method: 'GET',
    url: '/attachments/attachment_missing/content',
    headers: { authorization: `Bearer ${foreignToken}`, host: 'localhost' }
  });

  assert.deepEqual(
    expectOpaqueNotFound(foreignDownloadUrl, attachment.id),
    expectOpaqueNotFound(missingDownloadUrl, 'attachment_missing')
  );
  assert.deepEqual(
    expectOpaqueNotFound(foreignContent, attachment.id),
    expectOpaqueNotFound(missingContent, 'attachment_missing')
  );
  assert.deepEqual(fileRetrievals, []);

  const ownerContent = await performRequest(server, {
    method: 'GET',
    url: `${attachmentPath}/content`,
    headers: { authorization: `Bearer ${ownerToken}`, host: 'localhost' }
  });
  assert.equal(ownerContent.statusCode, 200);
  assert.equal(ownerContent.bodyText(), content.toString('utf8'));

  const ownerDownloadUrl = await performRequest(server, {
    method: 'POST',
    url: `${attachmentPath}/download-url`,
    headers: { authorization: `Bearer ${ownerToken}`, host: 'localhost' }
  });
  assert.equal(ownerDownloadUrl.statusCode, 200);
  const signedDownload = ownerDownloadUrl.bodyJson<{ url: string }>();
  const signedContent = await performRequest(server, {
    method: 'GET',
    url: signedDownload.url,
    headers: { host: 'localhost' }
  });
  assert.equal(signedContent.statusCode, 200);
  assert.equal(signedContent.bodyText(), content.toString('utf8'));

  const invalidSignedContent = await performRequest(server, {
    method: 'GET',
    url: `/attachments/${attachment.id}/content?token=invalid`,
    headers: { host: 'localhost' }
  });
  assert.equal(invalidSignedContent.statusCode, 401);

  const expiredToken = createAttachmentDownloadToken('test-secret', {
    attachmentId: attachment.id,
    accountId: attachment.accountId,
    expiresAt: Date.now() - 1
  });
  const expiredSignedContent = await performRequest(server, {
    method: 'GET',
    url: `/attachments/${attachment.id}/content?token=${expiredToken}`,
    headers: { host: 'localhost' }
  });
  assert.equal(expiredSignedContent.statusCode, 401);

  const mismatchedToken = createAttachmentDownloadToken('test-secret', {
    attachmentId: 'attachment_other',
    accountId: attachment.accountId,
    expiresAt: Date.now() + 60_000
  });
  const mismatchedSignedContent = await performRequest(server, {
    method: 'GET',
    url: `/attachments/${attachment.id}/content?token=${mismatchedToken}`,
    headers: { host: 'localhost' }
  });
  assert.equal(mismatchedSignedContent.statusCode, 404);

  assert.deepEqual(fileRetrievals, [
    `${attachment.accountId}:${attachment.storageKey}`,
    `${attachment.accountId}:${attachment.storageKey}`
  ]);

  const pendingDownloadUrl = await performRequest(server, {
    method: 'POST',
    url: `/attachments/${pendingAttachment.id}/download-url`,
    headers: { authorization: `Bearer ${ownerToken}`, host: 'localhost' }
  });
  assert.equal(pendingDownloadUrl.statusCode, 409);
  const pendingBody = pendingDownloadUrl.bodyJson<{
    code: string;
    details?: { scanStatus?: string };
    correlationId?: string;
  }>();
  assert.equal(pendingBody.code, 'ATTACHMENT_NOT_AVAILABLE');
  assert.equal(pendingBody.details?.scanStatus, 'pending');
  assert.ok(pendingBody.correlationId);
});

test('bootstrap in-memory attachment deletes preserve the principal account scope', async () => {
  const bootstrap = await bootstrapServices({ skipDatabase: true });
  const repository = bootstrap.repositories.attachment;
  assert.ok(repository);

  const attachment = {
    id: 'attachment_delete_scope',
    accountId: 'acc_attachment_owner',
    linkedEntityType: 'encounter' as const,
    linkedEntityId: 'encounter_delete_scope',
    category: 'document' as const,
    fileName: 'delete-scope.txt',
    storageKey: 'pending/acc_attachment_owner/encounter_delete_scope/delete-scope.txt',
    mimeType: 'text/plain',
    checksum: 'delete-scope-checksum',
    source: 'upload' as const,
    scanStatus: 'available' as const,
    uploadedByUserId: 'user_attachment_owner',
    createdAt: '2026-08-31T00:00:00.000Z'
  };

  await repository.create(attachment as never);

  assert.equal(
    await repository.deleteById('acc_attachment_foreign' as never, attachment.id as never),
    false
  );
  assert.ok(
    await repository.findById('acc_attachment_owner' as never, attachment.id as never),
    'foreign-account delete must leave the owner attachment available'
  );
  assert.equal(
    await repository.deleteById('acc_attachment_owner' as never, attachment.id as never),
    true
  );
  assert.equal(
    await repository.findById('acc_attachment_owner' as never, attachment.id as never),
    null
  );
});

test('attachment clinical projection refreshes its cache after ambient transaction rollback', async () => {
  const server = createTwoAccountMedicalRecordsServer({ failNextTransaction: true });
  await server.ready;
  const accessToken = await login(server, 'medical_admin_1', 'seed_medical_1');

  const failedUpload = await performRequest(server, {
    method: 'POST',
    url: '/attachments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      linkedEntityType: 'encounter',
      linkedEntityId: 'enc_medical_http_1',
      category: 'document',
      fileName: 'rollback-projection.txt',
      mimeType: 'text/plain',
      checksum: 'rollback-projection-checksum'
    }
  });
  assert.equal(failedUpload.statusCode, 500);

  const afterRollback = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(afterRollback.statusCode, 200);
  assert.equal(
    afterRollback
      .bodyJson<{ items: Array<{ summary: string }> }>()
      .items.some((item) => item.summary.includes('Attachment added to encounter')),
    false
  );
});

test('laboratory clinical projection refreshes its cache after ambient transaction rollback', async () => {
  const server = createTwoAccountMedicalRecordsServer({ failNextTransaction: true });
  await server.ready;
  const accessToken = await login(server, 'medical_admin_1', 'seed_medical_1');

  const failedOrder = await performRequest(server, {
    method: 'POST',
    url: '/diagnostics/orders',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: 'enc_medical_http_1',
      patientId: 'patient_medical_http_1',
      examType: 'Hemograma rollback',
      reason: 'Rollback da projeção clínica'
    }
  });
  assert.equal(failedOrder.statusCode, 500);

  const afterRollback = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(afterRollback.statusCode, 200);
  assert.equal(
    afterRollback
      .bodyJson<{ items: Array<{ eventType: string }> }>()
      .items.some((item) => item.eventType === 'diagnostic_requested'),
    false
  );
});

test('laboratory aliases refresh their clinical projection after ambient transaction rollback', async () => {
  const server = createTwoAccountMedicalRecordsServer({ failNextTransaction: true });
  await server.ready;
  const accessToken = await login(server, 'medical_admin_1', 'seed_medical_1');

  const failedOrder = await performRequest(server, {
    method: 'POST',
    url: '/laboratory/exams',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: 'enc_medical_http_1',
      patientId: 'patient_medical_http_1',
      examType: 'Bioquímica alias rollback',
      reason: 'Rollback do alias laboratorial'
    }
  });
  assert.equal(failedOrder.statusCode, 500);

  const afterRollback = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(afterRollback.statusCode, 200);
  assert.equal(
    afterRollback
      .bodyJson<{ items: Array<{ eventType: string }> }>()
      .items.some((item) => item.eventType === 'diagnostic_requested'),
    false
  );
});

test('inpatient clinical projection refreshes its cache after ambient transaction rollback', async () => {
  const server = createTwoAccountMedicalRecordsServer();
  await server.ready;
  const accessToken = await login(server, 'medical_admin_1', 'seed_medical_1');

  const admission = await performRequest(server, {
    method: 'POST',
    url: '/inpatient',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: 'enc_medical_http_1',
      patientId: 'patient_medical_http_1',
      unit: 'UTI',
      ward: 'A',
      bed: '1'
    }
  });
  assert.equal(admission.statusCode, 201);
  const stayId = admission.bodyJson<{ id: string }>().id;

  server.resetMedicalRecordFindAllCalls();
  server.armNextTransactionFailure();
  const failedProgress = await performRequest(server, {
    method: 'POST',
    url: `/inpatient/${stayId}/progress`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { note: 'Projeção que deve desaparecer no rollback externo' }
  });
  assert.equal(failedProgress.statusCode, 500);

  const afterRollback = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(afterRollback.statusCode, 200);
  assert.equal(
    afterRollback
      .bodyJson<{ items: Array<{ summary: string }> }>()
      .items.some((item) => item.summary.includes('Evolucao de internacao registrada')),
    false
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(
    server.getMedicalRecordFindAllCalls() >= 1,
    'tenant rollback recovery must observe committed medical-record rows'
  );
});

test('medical-record HTTP mutation refreshes its cache after ambient transaction rollback', async () => {
  const server = createTwoAccountMedicalRecordsServer({ failNextTransaction: true });
  await server.ready;
  const accessToken = await login(server, 'medical_admin_1', 'seed_medical_1');

  const failedUpdate = await performRequest(server, {
    method: 'PATCH',
    url: '/medical-records/entries/clinical_entry_http_1',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { title: 'Fantasma', content: 'Não deve sobreviver ao rollback' }
  });
  assert.equal(failedUpdate.statusCode, 500);

  const afterRollback = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/entries?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(afterRollback.statusCode, 200);
  const restoredEntry = afterRollback.bodyJson<{
    items: Array<{ title: string; content: string }>;
  }>().items[0];
  assert.equal(restoredEntry?.title, 'Private title 1');
  assert.equal(restoredEntry?.content, 'Private content 1');

  const restoredRevisions = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/entries/clinical_entry_http_1/revisions',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(restoredRevisions.statusCode, 200);
  assert.equal(restoredRevisions.bodyJson<{ items: Array<{ version: number }> }>().items.length, 1);

  const restoredTimeline = await performRequest(server, {
    method: 'GET',
    url: '/medical-records/timeline?encounterId=enc_medical_http_1',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(restoredTimeline.statusCode, 200);
  const restoredTimelineItems = restoredTimeline.bodyJson<{
    items: Array<{ summary: string }>;
  }>().items;
  assert.equal(restoredTimelineItems.length, 1);
  assert.equal(restoredTimelineItems[0]?.summary, 'Private timeline 1');
  assert.doesNotMatch(JSON.stringify(restoredTimelineItems), /Fantasma/);
});

test('catalog endpoints respect frontend search filters over HTTP semantics', async () => {
  const server = createServerUnderTest({ useDatabaseCatalogStores: false });
  const accessToken = await login(server, 'admin', 'seed_admin');

  const seededBreedsResponse = await performRequest(server, {
    method: 'GET',
    url: '/breeds?active=true&species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(seededBreedsResponse.statusCode, 200);
  const seededBreeds = seededBreedsResponse.bodyJson<{
    items: Array<{ name: string; code: string | null; species: string; active: boolean }>;
  }>();
  assert.equal(
    seededBreeds.items.some(
      (item) => item.name === 'Yorkshire Terrier' && item.species === 'canine' && item.active
    ),
    true
  );

  const seededSpeciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/species?active=true&systemCode=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(seededSpeciesResponse.statusCode, 200);
  const seededSpecies = seededSpeciesResponse.bodyJson<{
    items: Array<{ name: string; code: string | null; systemCode: string; active: boolean }>;
  }>();
  assert.equal(
    seededSpecies.items.some(
      (item) => item.name === 'Canina' && item.systemCode === 'canine' && item.active
    ),
    true
  );

  const createProductResponse = await performRequest(server, {
    method: 'POST',
    url: '/products',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Produto Integrado',
      code: 'PROD-FILTRO-001',
      description: 'Produto para validar busca HTTP',
      basePrice: 45.5
    }
  });
  assert.equal(createProductResponse.statusCode, 201);

  const createServiceResponse = await performRequest(server, {
    method: 'POST',
    url: '/services',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Servico Integrado',
      code: 'SRV-FILTRO-001',
      description: 'Servico para validar busca HTTP',
      basePrice: 90
    }
  });
  assert.equal(createServiceResponse.statusCode, 201);

  const createInactiveServiceResponse = await performRequest(server, {
    method: 'POST',
    url: '/services',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Servico Inativo',
      code: 'SRV-INATIVO-001',
      description: 'Servico para validar filtro ativo',
      basePrice: 75,
      active: false
    }
  });
  assert.equal(createInactiveServiceResponse.statusCode, 201);

  const productsResponse = await performRequest(server, {
    method: 'GET',
    url: '/products?search=FILTRO-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(productsResponse.statusCode, 200);
  const products = productsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(products.items.length, 1);
  assert.equal(products.items[0]?.code, 'PROD-FILTRO-001');

  const servicesResponse = await performRequest(server, {
    method: 'GET',
    url: '/services?search=SRV-FILTRO-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(servicesResponse.statusCode, 200);
  const services = servicesResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(services.items.length, 1);
  assert.equal(services.items[0]?.code, 'SRV-FILTRO-001');

  const activeServicesResponse = await performRequest(server, {
    method: 'GET',
    url: '/services?active=true',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(activeServicesResponse.statusCode, 200);
  const activeServices = activeServicesResponse.bodyJson<{
    items: Array<{ code: string | null; active: boolean }>;
  }>();
  assert.equal(
    activeServices.items.some((item) => item.code === 'SRV-FILTRO-001'),
    true
  );
  assert.equal(
    activeServices.items.some((item) => item.code === 'SRV-INATIVO-001'),
    false
  );

  const createTermResponse = await performRequest(server, {
    method: 'POST',
    url: '/responsibility-terms',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Termo de Internacao',
      code: 'TERM-INTERNACAO-001',
      usageContext: 'internacao',
      content: 'Responsavel ciente dos riscos da internacao.',
      active: true,
      requiresOwnerSignature: true,
      requiresWitnessSignature: false
    }
  });
  assert.equal(createTermResponse.statusCode, 201);
  const createdTerm = createTermResponse.bodyJson<{
    id: string;
    code: string | null;
    usageContext: string;
  }>();
  assert.equal(createdTerm.code, 'TERM-INTERNACAO-001');
  assert.equal(createdTerm.usageContext, 'internacao');

  const termsResponse = await performRequest(server, {
    method: 'GET',
    url: '/responsibility-terms?search=TERM-INTERNACAO-001&active=true&usageContext=internacao',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(termsResponse.statusCode, 200);
  const terms = termsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(terms.items.length, 1);
  assert.equal(terms.items[0]?.code, 'TERM-INTERNACAO-001');

  const updateTermResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/responsibility-terms/${createdTerm.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Termo de Internacao Revisado',
      active: false
    }
  });
  assert.equal(updateTermResponse.statusCode, 200);
  assert.equal(updateTermResponse.bodyJson<{ active: boolean; title: string }>().active, false);

  const createBreedResponse = await performRequest(server, {
    method: 'POST',
    url: '/breeds',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Golden Retriever',
      code: 'CAN-GOLD-001',
      species: 'canine',
      description: 'Raca canina para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createBreedResponse.statusCode, 201);
  const createdBreed = createBreedResponse.bodyJson<{
    id: string;
    code: string | null;
    species: string;
  }>();
  assert.equal(createdBreed.code, 'CAN-GOLD-001');
  assert.equal(createdBreed.species, 'canine');

  const breedsResponse = await performRequest(server, {
    method: 'GET',
    url: '/breeds?search=GOLD-001&active=true&species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(breedsResponse.statusCode, 200);
  const breeds = breedsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(breeds.items.length, 1);
  assert.equal(breeds.items[0]?.code, 'CAN-GOLD-001');

  const vetusAliasBreedResponse = await performRequest(server, {
    method: 'GET',
    url: '/breed?species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasBreedResponse.statusCode, 200);
  const vetusAliasBreeds = vetusAliasBreedResponse.bodyJson<{
    items: Array<{ code: string | null }>;
  }>();
  assert.equal(
    vetusAliasBreeds.items.some((item) => item.code === 'CAN-GOLD-001'),
    true
  );

  const updateBreedResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/breeds/${createdBreed.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Golden Retriever Revisado',
      active: false
    }
  });
  assert.equal(updateBreedResponse.statusCode, 200);
  assert.equal(updateBreedResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createSpeciesResponse = await performRequest(server, {
    method: 'POST',
    url: '/species',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Lagomorfo',
      code: 'LAGOMORPH-001',
      systemCode: 'other',
      description: 'Especie para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createSpeciesResponse.statusCode, 201);
  const createdSpecies = createSpeciesResponse.bodyJson<{
    id: string;
    code: string | null;
    systemCode: string;
  }>();
  assert.equal(createdSpecies.code, 'LAGOMORPH-001');
  assert.equal(createdSpecies.systemCode, 'other');

  const speciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/species?search=LAGOMORPH-001&active=true&systemCode=other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(speciesResponse.statusCode, 200);
  const species = speciesResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(species.items.length, 1);
  assert.equal(species.items[0]?.code, 'LAGOMORPH-001');

  const vetusAliasSpeciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/specie?systemCode=other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasSpeciesResponse.statusCode, 200);
  const vetusAliasSpecies = vetusAliasSpeciesResponse.bodyJson<{
    items: Array<{ code: string | null }>;
  }>();
  assert.equal(
    vetusAliasSpecies.items.some((item) => item.code === 'LAGOMORPH-001'),
    true
  );

  const updateSpeciesResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/species/${createdSpecies.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Lagomorfo Revisado',
      active: false
    }
  });
  assert.equal(updateSpeciesResponse.statusCode, 200);
  assert.equal(updateSpeciesResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createCoatColorResponse = await performRequest(server, {
    method: 'POST',
    url: '/coat-colors',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Chocolate',
      code: 'COAT-CHOCOLATE-001',
      colorGroup: 'Solida',
      hexColor: '#4b2e22',
      description: 'Pelagem para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createCoatColorResponse.statusCode, 201);
  const createdCoatColor = createCoatColorResponse.bodyJson<{
    id: string;
    code: string | null;
    colorGroup: string | null;
    hexColor: string | null;
  }>();
  assert.equal(createdCoatColor.code, 'COAT-CHOCOLATE-001');
  assert.equal(createdCoatColor.colorGroup, 'Solida');
  assert.equal(createdCoatColor.hexColor, '#4b2e22');

  const coatColorsResponse = await performRequest(server, {
    method: 'GET',
    url: '/coat-colors?search=CHOCOLATE-001&active=true&colorGroup=Solida',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(coatColorsResponse.statusCode, 200);
  const coatColors = coatColorsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(coatColors.items.length, 1);
  assert.equal(coatColors.items[0]?.code, 'COAT-CHOCOLATE-001');

  const vetusAliasCoatColorsResponse = await performRequest(server, {
    method: 'GET',
    url: '/coat-color?colorGroup=Solida',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasCoatColorsResponse.statusCode, 200);
  const vetusAliasCoatColors = vetusAliasCoatColorsResponse.bodyJson<{
    items: Array<{ code: string | null }>;
  }>();
  assert.equal(
    vetusAliasCoatColors.items.some((item) => item.code === 'COAT-CHOCOLATE-001'),
    true
  );

  const pelagensAliasResponse = await performRequest(server, {
    method: 'GET',
    url: '/pelagens?colorGroup=Solida',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(pelagensAliasResponse.statusCode, 200);
  assert.equal(
    pelagensAliasResponse
      .bodyJson<{ items: Array<{ code: string | null }> }>()
      .items.some((item) => item.code === 'COAT-CHOCOLATE-001'),
    true
  );

  const updateCoatColorResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/coat-colors/${createdCoatColor.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Chocolate Revisado',
      active: false
    }
  });
  assert.equal(updateCoatColorResponse.statusCode, 200);
  assert.equal(updateCoatColorResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createCustomerGroupResponse = await performRequest(server, {
    method: 'POST',
    url: '/customer-groups',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Convenio',
      code: 'CUSTOMER-GROUP-001',
      segment: 'Convenio',
      discountPercent: 10,
      paymentTermDays: 30,
      creditLimitAmount: 1000,
      description: 'Grupo para validar cadastro Vetus-like',
      active: true
    }
  });
  assert.equal(createCustomerGroupResponse.statusCode, 201);
  const createdCustomerGroup = createCustomerGroupResponse.bodyJson<{
    id: string;
    code: string | null;
    segment: string | null;
    discountPercent: number;
    paymentTermDays: number;
    creditLimitAmount: number | null;
  }>();
  assert.equal(createdCustomerGroup.code, 'CUSTOMER-GROUP-001');
  assert.equal(createdCustomerGroup.segment, 'Convenio');
  assert.equal(createdCustomerGroup.discountPercent, 10);
  assert.equal(createdCustomerGroup.paymentTermDays, 30);
  assert.equal(createdCustomerGroup.creditLimitAmount, 1000);

  const customerGroupsResponse = await performRequest(server, {
    method: 'GET',
    url: '/customer-groups?search=CUSTOMER-GROUP-001&active=true&segment=Convenio',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(customerGroupsResponse.statusCode, 200);
  const customerGroups = customerGroupsResponse.bodyJson<{
    items: Array<{ code: string | null }>;
  }>();
  assert.equal(customerGroups.items.length, 1);
  assert.equal(customerGroups.items[0]?.code, 'CUSTOMER-GROUP-001');

  const vetusAliasCustomerGroupsResponse = await performRequest(server, {
    method: 'GET',
    url: '/grupos-de-clientes?segment=Convenio',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasCustomerGroupsResponse.statusCode, 200);
  const vetusAliasCustomerGroups = vetusAliasCustomerGroupsResponse.bodyJson<{
    items: Array<{ code: string | null }>;
  }>();
  assert.equal(
    vetusAliasCustomerGroups.items.some((item) => item.code === 'CUSTOMER-GROUP-001'),
    true
  );

  const customerGroupAliasResponse = await performRequest(server, {
    method: 'GET',
    url: '/customer-group?segment=Convenio',
    headers: { authorization: `Bearer ${accessToken}`, host: 'localhost' }
  });
  assert.equal(customerGroupAliasResponse.statusCode, 200);
  assert.equal(
    customerGroupAliasResponse
      .bodyJson<{ items: Array<{ code: string | null }> }>()
      .items.some((item) => item.code === 'CUSTOMER-GROUP-001'),
    true
  );

  const updateCustomerGroupResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/customer-groups/${createdCustomerGroup.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Convenio Revisado',
      active: false
    }
  });
  assert.equal(updateCustomerGroupResponse.statusCode, 200);
  assert.equal(
    updateCustomerGroupResponse.bodyJson<{ active: boolean; name: string }>().active,
    false
  );

  const createPreventiveResponse = await performRequest(server, {
    method: 'POST',
    url: '/vaccines-dewormers',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_rex',
      ownerId: 'owner_maria',
      clientName: 'Maria Silva',
      animalName: 'Rex',
      eventDate: '2026-05-10',
      itemType: 'vaccine',
      protocolCode: 'V10-ANUAL',
      lotNumber: 'LOT-2026-001',
      description: 'Vacina V10 - reforco anual',
      observation: 'Avisar tutor com antecedencia.'
    }
  });
  assert.equal(createPreventiveResponse.statusCode, 201);
  const createdPreventive = createPreventiveResponse.bodyJson<{
    id: string;
    description: string;
    status: string;
    itemType: string;
    protocolCode: string | null;
    lotNumber: string | null;
    patientId: string | null;
    ownerId: string | null;
  }>();
  assert.equal(createdPreventive.description, 'Vacina V10 - reforco anual');
  assert.equal(createdPreventive.status, 'scheduled');
  assert.equal(createdPreventive.itemType, 'vaccine');
  assert.equal(createdPreventive.protocolCode, 'V10-ANUAL');
  assert.equal(createdPreventive.lotNumber, 'LOT-2026-001');
  assert.equal(createdPreventive.patientId, 'patient_rex');
  assert.equal(createdPreventive.ownerId, 'owner_maria');

  const preventiveListResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?dateFrom=2026-05-01&dateTo=2026-05-31&client=Maria&animal=Rex&itemType=vaccine&patientId=patient_rex&ownerId=owner_maria',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(preventiveListResponse.statusCode, 200);
  const preventiveEvents = preventiveListResponse.bodyJson<{
    items: Array<{ id: string; status: string }>;
  }>();
  assert.equal(preventiveEvents.items.length, 1);
  assert.equal(preventiveEvents.items[0]?.id, createdPreventive.id);

  const otherPatientPreventiveListResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?includeExecuted=true&patientId=patient_other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(otherPatientPreventiveListResponse.statusCode, 200);
  assert.equal(otherPatientPreventiveListResponse.bodyJson<{ items: unknown[] }>().items.length, 0);

  const executePreventiveResponse = await performRequest(server, {
    method: 'POST',
    url: `/vaccines-dewormers/${createdPreventive.id}/execute`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      observation: 'Aplicada sem intercorrencias.',
      rescheduleTo: '2027-05-10'
    }
  });
  assert.equal(executePreventiveResponse.statusCode, 200);
  const executePreventive = executePreventiveResponse.bodyJson<{
    event: {
      status: string;
      executedObservation: string | null;
      protocolCode: string | null;
      lotNumber: string | null;
      nextDoseDate: string | null;
    };
    rescheduledEvent: { eventDate: string; status: string } | null;
  }>();
  assert.equal(executePreventive.event.status, 'executed');
  assert.equal(executePreventive.event.executedObservation, 'Aplicada sem intercorrencias.');
  assert.equal(executePreventive.event.protocolCode, 'V10-ANUAL');
  assert.equal(executePreventive.event.lotNumber, 'LOT-2026-001');
  assert.equal(executePreventive.event.nextDoseDate, '2027-05-10');
  assert.equal(executePreventive.rescheduledEvent?.eventDate, '2027-05-10');
  assert.equal(executePreventive.rescheduledEvent?.status, 'scheduled');

  const includeExecutedPreventiveResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?includeExecuted=true&client=Maria',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(includeExecutedPreventiveResponse.statusCode, 200);
  const includeExecutedPreventive = includeExecutedPreventiveResponse.bodyJson<{
    items: Array<{ status: string }>;
  }>();
  assert.equal(
    includeExecutedPreventive.items.some((item) => item.status === 'executed'),
    true
  );

  const preventiveEmailResponse = await performRequest(server, {
    method: 'POST',
    url: '/vaccines-dewormers/reminders/email',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      client: 'Maria'
    }
  });
  assert.equal(preventiveEmailResponse.statusCode, 200);
  assert.equal(preventiveEmailResponse.bodyJson<{ preparedCount: number }>().preparedCount, 1);

  const inventoryResponse = await performRequest(server, {
    method: 'GET',
    url: '/inventory?search=MED-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(inventoryResponse.statusCode, 200);
  const inventory = inventoryResponse.bodyJson<{ items: Array<{ sku: string; name: string }> }>();
  assert.equal(inventory.items.length, 1);
  assert.equal(inventory.items[0]?.sku, 'MED-001');
  assert.equal(inventory.items[0]?.name, 'Dipirona Injetavel');
});

test('API keys unlock integration catalog and PIX intent creation over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createKeyResponse = await performRequest(server, {
    method: 'POST',
    url: '/api-keys',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Third-party integration key',
      permissions: ['integrations.read', 'payments.manage'],
      rateLimit: 120,
      rateLimitWindow: 3600
    }
  });
  assert.equal(createKeyResponse.statusCode, 201);
  const createdKey = createKeyResponse.bodyJson<{ apiKey: { id: string }; rawKey: string }>();
  assert.ok(createdKey.rawKey.startsWith('cvg_'));

  const listKeyResponse = await performRequest(server, {
    method: 'GET',
    url: '/api-keys',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listKeyResponse.statusCode, 200);
  const apiKeyList = listKeyResponse.bodyJson<{ items: Array<{ id: string; keyHash?: string }> }>();
  assert.equal(
    apiKeyList.items.some((item) => item.id === createdKey.apiKey.id),
    true
  );
  assert.equal(
    apiKeyList.items.some((item) => 'keyHash' in item),
    false
  );

  const catalogResponse = await performRequest(server, {
    method: 'GET',
    url: '/integrations/catalog',
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(catalogResponse.statusCode, 200);
  const catalog = catalogResponse.bodyJson<{
    eventBus: {
      endpoints: string[];
      operatorEndpoints: string[];
      authentication: { type: string; readPermission: string; writePermission: string };
    };
    payments: { provider: string; capabilities: string[]; endpoints: string[] };
  }>();
  assert.deepEqual(catalog.eventBus.endpoints, []);
  assert.equal(
    catalog.eventBus.operatorEndpoints.includes('/internal/events/by-correlation/:correlationId'),
    true
  );
  assert.deepEqual(catalog.eventBus.authentication, {
    type: 'bearer',
    readPermission: 'audit.read',
    writePermission: 'audit.write'
  });

  const apiKeyOperatorResponse = await performRequest(server, {
    method: 'GET',
    url: '/internal/events/by-correlation/catalog-contract-check',
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(apiKeyOperatorResponse.statusCode, 401);

  assert.equal(catalog.payments.provider, 'gateway-abstraction');
  assert.deepEqual(catalog.payments.capabilities, ['pix', 'cards']);
  assert.equal(catalog.payments.endpoints.includes('/payments/cards/intents'), true);
  assert.equal(
    catalog.payments.endpoints.includes('/payments/cards/intents/{intentId}/capture'),
    true
  );
  assert.equal(catalog.payments.endpoints.includes('/payments/cards/report'), true);

  const paymentResponse = await performRequest(server, {
    method: 'POST',
    url: '/payments/pix/intents',
    headers: {
      'x-api-key': createdKey.rawKey,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      amount: 149.9,
      description: 'Consulta de acompanhamento',
      expirationMinutes: 45
    }
  });
  assert.equal(paymentResponse.statusCode, 201);
  const payment = paymentResponse.bodyJson<{
    provider: string;
    status: string;
    eventId: string;
    qrCodePayload: string;
  }>();
  assert.equal(payment.provider, 'local-pix');
  assert.equal(payment.status, 'pending');
  assert.ok(payment.eventId);
  assert.ok(payment.qrCodePayload.length > 0);

  const legacyBillingPixResponse = await performRequest(server, {
    method: 'POST',
    url: '/payments/pix/intents',
    headers: {
      'x-api-key': createdKey.rawKey,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      billingRecordId: 'legacy-billing-link-is-disabled',
      amount: 149.9,
      description: 'Consulta de acompanhamento'
    }
  });
  assert.equal(legacyBillingPixResponse.statusCode, 409);
  assert.equal(
    legacyBillingPixResponse.bodyJson<{ code: string }>().code,
    'LEGACY_BILLING_PIX_DISABLED'
  );

  const cardIntentResponse = await performRequest(server, {
    method: 'POST',
    url: '/payments/cards/intents',
    headers: {
      'x-api-key': createdKey.rawKey,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      amount: 320,
      description: 'Internacao parcelada',
      cardHolderName: 'Maria Silva',
      customerName: 'Maria Silva',
      customerEmail: 'maria@example.com',
      brand: 'visa',
      last4: '4242',
      installments: 4
    }
  });
  assert.equal(cardIntentResponse.statusCode, 201);
  const cardIntent = cardIntentResponse.bodyJson<{
    provider: string;
    status: string;
    installments: number;
    eventId: string;
    id: string;
    providerChargeId?: string;
    card: { last4: string; brand?: string };
  }>();
  assert.equal(cardIntent.provider, 'local-card');
  assert.equal(cardIntent.status, 'authorized_pending_capture');
  assert.equal(cardIntent.installments, 4);
  assert.equal(cardIntent.card.last4, '4242');
  assert.equal(cardIntent.card.brand, 'visa');
  assert.ok(cardIntent.eventId);
  assert.ok(cardIntent.providerChargeId);

  const cardCaptureResponse = await performRequest(server, {
    method: 'POST',
    url: `/payments/cards/intents/${cardIntent.id}/capture`,
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(cardCaptureResponse.statusCode, 200);
  const cardCapture = cardCaptureResponse.bodyJson<{
    provider: string;
    status: string;
    providerChargeId?: string;
  }>();
  assert.equal(cardCapture.provider, 'local-card');
  assert.equal(cardCapture.status, 'captured');
  assert.ok(cardCapture.providerChargeId);

  const cardReportResponse = await performRequest(server, {
    method: 'GET',
    url: '/payments/cards/report',
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(cardReportResponse.statusCode, 200);
  const cardReport = cardReportResponse.bodyJson<{
    provider: string;
    summary: { total: number };
    items: unknown[];
  }>();
  assert.equal(cardReport.provider, 'local-card');
  assert.ok(Array.isArray(cardReport.items));
  assert.equal(typeof cardReport.summary.total, 'number');
});

test('internal event inspection applies the configured audit ABAC policy to an admin principal', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/internal/events/stats',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ total: number }>().total >= 0, true);
});

test('audit event listing applies the configured audit ABAC policy to an admin principal', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/audit/events?limit=1',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(Array.isArray(response.bodyJson<{ items: unknown[] }>().items), true);
});

test('outbox reprocess applies the configured admin-only audit.write ABAC policy', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'POST',
    url: '/internal/events/missing-reprocess-event/reprocess',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.bodyJson<{ code: string }>().code, 'NOT_FOUND');
});

test('outbox reprocess denies a non-admin audit.write principal at the HTTP ABAC boundary', async () => {
  const testRuntime = createNonAdminAuditWriteRepositories();
  const server = createServerUnderTest({ repositories: testRuntime.repositories });
  await server.ready;
  const accessToken = await login(server, 'audit-operator', 'seed_audit_operator');

  const response = await performRequest(server, {
    method: 'POST',
    url: '/internal/events/missing-reprocess-event/reprocess',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.bodyJson<{ code: string }>().code, 'FORBIDDEN');
  await server.closeDependencies();
});

// =============================================================================
// WhatsApp inbound webhook tests
// =============================================================================

test('POST /webhooks/whatsapp/inbound confirms a scheduled appointment', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-01T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Confirm test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(appointment.status, 'scheduled');

  // Send CONFIRMAR via WhatsApp inbound
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestconfirm001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CONFIRMAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');

  // Verify appointment status changed to checked_in
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const updatedApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(updatedApt.status, 'checked_in');
});

test('POST /webhooks/whatsapp/inbound cancels a scheduled appointment', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-02T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Cancel test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(appointment.status, 'scheduled');

  // Send CANCELAR via WhatsApp inbound
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestcancel001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CANCELAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CANCELADO');

  // Verify appointment status changed to cancelled
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const cancelledApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(cancelledApt.status, 'cancelled');
});

test('POST /webhooks/whatsapp/inbound with REMARCAR returns AGUARDANDO REMARCA', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-03T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reschedule test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestremarcar001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'REMARCAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'AGUARDANDO REMARCA');

  // Status should remain scheduled (REMARCAR does not change status)
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const unchangedApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(unchangedApt.status, 'scheduled');
});

test('POST /webhooks/whatsapp/inbound with malformed payload returns OK', async () => {
  const server = createServerUnderTest();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestmalformed001',
      From: 'whatsapp:+5511999998888',
      Body: 'CONFIRMAR'
      // no AppointmentId
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'OK');
});

test('POST /webhooks/whatsapp/inbound returns CONFIRMADO even if appointment not found (fail-safe)', async () => {
  const server = createServerUnderTest();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestnotfound001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CONFIRMAR',
      AppointmentId: 'appt_nonexistent_999'
    }
  });

  // Fail-safe: always return CONFIRMADO even if appointment lookup fails
  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');
});

test('POST /webhooks/whatsapp/inbound CONFIRM returns CONFIRMADO (alias)', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-04T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Confirm alias test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string }>();

  // Use CONFIRM (alias) instead of CONFIRMAR
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': 'test-webhook-secret',
      host: 'localhost'
    },
    body: {
      MessageSid: 'SMtestconfirmalias001',
      From: 'whatsapp:+5511999998888',
      Body: 'CONFIRM',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');
});

test('security headers fail closed and add HSTS only for secure production-like requests', () => {
  const encryptedRequest = {
    socket: { encrypted: true },
    headers: {}
  } as never;
  const forwardedRequest = {
    socket: { encrypted: false },
    headers: { 'x-forwarded-proto': ['https, http'] }
  } as never;
  const insecureRequest = {
    socket: { encrypted: false },
    headers: { 'x-forwarded-proto': 'http, https' }
  } as never;

  assert.equal(isSecureRequest(encryptedRequest), true);
  assert.equal(isSecureRequest(forwardedRequest), true);
  assert.equal(isSecureRequest(insecureRequest), false);
  assert.equal(isSecureRequest({ socket: {}, headers: {} } as never), false);

  const secureResponse = new MockResponse();
  applySecurityHeaders(insecureRequest, secureResponse as never, 'production');
  assert.equal(secureResponse.getHeader('x-content-type-options'), 'nosniff');
  assert.equal(secureResponse.getHeader('x-frame-options'), 'DENY');
  assert.equal(
    secureResponse.getHeader('content-security-policy'),
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  assert.equal(secureResponse.getHeader('strict-transport-security'), undefined);

  for (const environment of ['production', 'staging', 'prod', 'stage']) {
    const response = new MockResponse();
    applySecurityHeaders(encryptedRequest, response as never, environment);
    assert.equal(
      response.getHeader('strict-transport-security'),
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  const nonProductionResponse = new MockResponse();
  applySecurityHeaders(encryptedRequest, nonProductionResponse as never, 'development');
  assert.equal(nonProductionResponse.getHeader('strict-transport-security'), undefined);
});
