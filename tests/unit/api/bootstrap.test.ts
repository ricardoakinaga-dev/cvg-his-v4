import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@cvg-his-v2/shared-database');
  });

  it('keeps in-memory repositories when skipDatabase is enabled', async () => {
    const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

    const result = await bootstrapServices({ skipDatabase: true });

    expect(result.repositoriesUseDatabase).toBe(false);
    expect(result.databaseHealthy).toBe(false);
    expect(result.databaseDetail).toContain('in-memory');
    expect(result.repositories.session).toBeDefined();
    expect(result.repositories.audit).toBeDefined();
  });

  it('keeps in-memory repositories when DATABASE_URL is absent', async () => {
    const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

    const result = await bootstrapServices({});

    expect(result.repositoriesUseDatabase).toBe(false);
    expect(result.databaseDetail).toContain('in-memory');
    expect(result.fileStorage).toBeDefined();
  });

  it('preserves CRUD, filtering and lifecycle semantics in non-production fallback repositories', async () => {
    const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');
    const { repositories } = await bootstrapServices({ skipDatabase: true, environment: 'test' });
    const accountId = 'account-fallback' as never;

    const session = {
      sessionId: 'session-fallback',
      userId: 'user-fallback',
      accountId,
      active: true,
      createdAt: '2026-08-12T10:00:00.000Z',
      expiresAt: '2026-08-12T11:00:00.000Z',
      refreshExpiresAt: '2026-08-19T10:00:00.000Z'
    } as never;
    await repositories.session!.create(session);
    await repositories.session!.update({ sessionId: session.sessionId, expiresAt: '2026-08-12T12:00:00.000Z' } as never);
    expect(await repositories.session!.findById(session.sessionId)).toMatchObject({
      expiresAt: '2026-08-12T12:00:00.000Z'
    });
    await repositories.session!.update({ sessionId: 'missing-session' } as never);
    await repositories.session!.update({ sessionId: session.sessionId, active: false } as never);
    expect(await repositories.session!.findById(session.sessionId)).toBeNull();
    await repositories.session!.create(session);
    expect(await repositories.session!.findByUserId('user-fallback')).toHaveLength(1);
    await repositories.session!.delete(session.sessionId);

    const auditEvent = {
      eventId: 'audit-fallback',
      accountId,
      actorId: 'user-fallback',
      module: 'audit',
      action: 'create',
      entityType: 'fallback',
      entityId: 'fallback-1',
      riskLevel: 'low',
      correlationId: 'corr-fallback',
      occurredAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.audit!.create(auditEvent);
    expect(await repositories.audit!.findById(auditEvent.eventId)).toEqual(auditEvent);
    expect(await repositories.audit!.findById('missing-audit' as never)).toBeNull();
    expect(await repositories.audit!.list(accountId, 1)).toEqual([auditEvent]);
    expect(await repositories.audit!.list(undefined, 1)).toEqual([auditEvent]);

    const owner = {
      id: 'owner-fallback',
      accountId,
      fullName: 'Owner Fallback',
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.owner!.create(owner);
    const updatedOwner = { ...owner, fullName: 'Owner Updated' } as never;
    await repositories.owner!.update(updatedOwner);
    expect(await repositories.owner!.findByAccountId(accountId, 'updated')).toEqual([updatedOwner]);
    await repositories.owner!.delete(owner.id);
    expect(await repositories.owner!.findById(owner.id)).toBeNull();

    const patient = {
      id: 'patient-fallback',
      accountId,
      primaryOwnerId: owner.id,
      name: 'Patient Fallback',
      species: 'canine',
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.patient!.create(patient);
    const updatedPatient = { ...patient, name: 'Patient Updated' } as never;
    await repositories.patient!.update(updatedPatient);
    expect(await repositories.patient!.findByAccountId(accountId, 'updated')).toEqual([
      updatedPatient
    ]);

    const ownerPatientLink = {
      id: 'link-fallback',
      accountId,
      ownerId: owner.id,
      patientId: patient.id,
      relationship: 'owner',
      isPrimary: true,
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.ownerPatientLink!.create(ownerPatientLink);
    expect(await repositories.ownerPatientLink!.findByPatientId(patient.id)).toEqual([
      ownerPatientLink
    ]);
    expect(await repositories.ownerPatientLink!.findByOwnerId(owner.id)).toEqual([
      ownerPatientLink
    ]);
    expect(await repositories.ownerPatientLink!.findById(ownerPatientLink.id)).toEqual(
      ownerPatientLink
    );
    await repositories.ownerPatientLink!.delete(ownerPatientLink.id);
    expect(await repositories.ownerPatientLink!.findById(ownerPatientLink.id)).toBeNull();
    await repositories.patient!.delete(patient.id);

    const openEncounter = {
      id: 'encounter-open',
      accountId,
      patientId: patient.id,
      ownerId: owner.id,
      status: 'in_care',
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    const closedEncounter = { ...openEncounter, id: 'encounter-closed', status: 'closed' } as never;
    await repositories.encounter!.create(openEncounter);
    await repositories.encounter!.create(closedEncounter);
    expect(await repositories.encounter!.findActiveByPatientId(patient.id)).toEqual(openEncounter);
    expect(await repositories.encounter!.findActive(accountId)).toEqual([openEncounter]);
    expect(await repositories.encounter!.findAll(accountId)).toHaveLength(2);
    const updatedEncounter = { ...openEncounter, status: 'observation' } as never;
    await repositories.encounter!.update(updatedEncounter);
    expect(await repositories.encounter!.findById(openEncounter.id)).toEqual(updatedEncounter);

    const encounterTimelineEvent = {
      id: 'timeline-fallback',
      accountId,
      encounterId: openEncounter.id,
      eventType: 'status_changed',
      summary: 'Fallback timeline',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.encounterTimeline!.create(encounterTimelineEvent);
    expect(await repositories.encounterTimeline!.findByEncounterId(openEncounter.id)).toEqual([
      encounterTimelineEvent
    ]);
    await repositories.encounter!.delete(openEncounter.id);

    const medicalRecord = {
      id: 'record-fallback',
      accountId,
      encounterId: openEncounter.id,
      patientId: patient.id,
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await expect(repositories.medicalRecord!.update(medicalRecord)).rejects.toThrow('not found');
    await repositories.medicalRecord!.create(medicalRecord);
    await repositories.medicalRecord!.update({ ...medicalRecord, updatedAt: '2026-08-12T11:00:00.000Z' } as never);
    expect(await repositories.medicalRecord!.findById(medicalRecord.id)).not.toBeNull();
    expect(await repositories.medicalRecord!.findByEncounterId(openEncounter.id)).not.toBeNull();
    expect(await repositories.medicalRecord!.findAll(accountId)).toHaveLength(1);

    const entry = {
      id: 'entry-fallback',
      accountId,
      medicalRecordId: medicalRecord.id,
      encounterId: openEncounter.id,
      patientId: patient.id,
      entryType: 'progress_note',
      title: 'Fallback entry',
      content: 'Original',
      version: 1,
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.clinicalEntry!.create(entry);
    await repositories.clinicalEntry!.update({ ...entry, content: 'Updated' } as never);
    await repositories.clinicalEntry!.update({ ...entry, id: 'missing-entry' } as never);
    expect(await repositories.clinicalEntry!.findById(entry.id)).toMatchObject({ content: 'Updated' });
    expect(await repositories.clinicalEntry!.findById('missing-entry' as never)).toBeNull();

    const clinicalTimelineEvent = {
      id: 'clinical-timeline-fallback',
      accountId,
      medicalRecordId: medicalRecord.id,
      encounterId: openEncounter.id,
      eventType: 'entry_created',
      summary: 'Fallback clinical timeline',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.clinicalTimeline!.create(clinicalTimelineEvent);
    expect(await repositories.clinicalTimeline!.findByMedicalRecordId(medicalRecord.id)).toEqual([
      clinicalTimelineEvent
    ]);
    const revision = {
      id: 'revision-fallback',
      accountId,
      entryId: entry.id,
      version: 1,
      content: 'Original',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.entryRevision!.create(revision);
    expect(await repositories.entryRevision!.findByEntryId(entry.id)).toEqual([revision]);

    const attachment = {
      id: 'attachment-fallback',
      accountId,
      linkedEntityType: 'encounter',
      linkedEntityId: openEncounter.id,
      category: 'document',
      fileName: 'fallback.pdf',
      storageKey: 'pending/fallback.pdf',
      mimeType: 'application/pdf',
      checksum: 'fallback-checksum',
      source: 'upload',
      uploadedByUserId: 'user-fallback',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.attachment!.create(attachment);
    expect(await repositories.attachment!.findByLinkedEntity('encounter', openEncounter.id)).toEqual([
      attachment
    ]);
    expect(await repositories.attachment!.findById(attachment.id)).toEqual(attachment);
    expect(await repositories.attachment!.deleteById(attachment.id)).toBe(true);

    const notificationRepository = repositories.notification!;
    const notification = {
      id: 'notification-fallback',
      accountId,
      channel: 'internal',
      category: 'system',
      title: 'Fallback notification',
      message: 'Fallback message',
      severity: 'low',
      status: 'queued',
      createdByUserId: 'user-fallback',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    const job = {
      id: 'job-fallback',
      accountId,
      notificationId: notification.id,
      status: 'queued',
      attempts: 0,
      scheduledAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await notificationRepository.createNotification(notification);
    await notificationRepository.updateNotification({ ...notification, status: 'sent' } as never);
    await notificationRepository.createJob(job);
    await notificationRepository.updateJob({ ...job, attempts: 1 } as never);
    expect(await notificationRepository.findNotificationById(notification.id)).toMatchObject({
      status: 'sent'
    });
    expect(await notificationRepository.findJobById(job.id)).toMatchObject({ attempts: 1 });
    expect(await notificationRepository.findJobs(accountId, 'queued')).toHaveLength(1);
    expect(await notificationRepository.findQueuedJobs(1, accountId)).toHaveLength(1);

    const webhook = {
      id: 'webhook-fallback',
      accountId,
      url: 'https://example.test/fallback',
      events: ['fallback.created'],
      isActive: true,
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.webhook!.create(webhook);
    await repositories.webhook!.update({ ...webhook, url: 'https://example.test/updated' } as never);
    expect(await repositories.webhook!.findById(webhook.id)).toMatchObject({
      url: 'https://example.test/updated'
    });
    expect(await repositories.webhook!.findByAccount(accountId)).toHaveLength(1);
    expect(await repositories.webhook!.findActiveByEvent(accountId, 'fallback.created')).toHaveLength(1);
    const delivery = {
      id: 'webhook-delivery-fallback',
      accountId,
      webhookId: webhook.id,
      eventType: 'fallback.created',
      status: 'pending',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    await repositories.webhook!.createDelivery(delivery);
    await repositories.webhook!.updateDelivery({ ...delivery, attemptCount: 1 } as never);
    expect(await repositories.webhook!.findPendingDeliveries(1)).toHaveLength(1);
    expect(await repositories.webhook!.findDeliveriesByWebhook(webhook.id)).toHaveLength(1);
    await repositories.webhook!.deleteDeliveriesByWebhook(webhook.id);
    await repositories.webhook!.delete(webhook.id);
    expect(await repositories.webhook!.findById(webhook.id)).toBeNull();

    const medicalRecordTools = repositories.medicalRecord as unknown as {
      clear(): void;
      getAll(): readonly unknown[];
    };
    const clinicalEntryTools = repositories.clinicalEntry as unknown as { clear(): void };
    const clinicalTimelineTools = repositories.clinicalTimeline as unknown as { clear(): void };
    const notificationTools = notificationRepository as unknown as {
      clear(): void;
      getNotifications(): readonly unknown[];
      getJobs(): readonly unknown[];
    };
    expect(medicalRecordTools.getAll()).toHaveLength(1);
    expect(notificationTools.getNotifications()).toHaveLength(1);
    expect(notificationTools.getJobs()).toHaveLength(1);
    medicalRecordTools.clear();
    clinicalEntryTools.clear();
    clinicalTimelineTools.clear();
    notificationTools.clear();
    expect(medicalRecordTools.getAll()).toEqual([]);
    expect(notificationTools.getNotifications()).toEqual([]);
  });

  it('reports dependency health when the database check succeeds', async () => {
    vi.doMock('@cvg-his-v2/shared-database', async () => {
      const actual = await vi.importActual<object>('@cvg-his-v2/shared-database');
      return {
        ...actual,
        checkDatabaseHealth: vi.fn(async () => ({
          healthy: true,
          detail: 'Database connected'
        }))
      };
    });

    const { validateDependencies } = await import('../../../apps/api/src/bootstrap.ts');

    await expect(validateDependencies()).resolves.toEqual([
      { name: 'database', healthy: true, detail: 'Database connected' }
    ]);
  });

  it('captures dependency failures as unhealthy results', async () => {
    vi.doMock('@cvg-his-v2/shared-database', async () => {
      const actual = await vi.importActual<object>('@cvg-his-v2/shared-database');
      return {
        ...actual,
        checkDatabaseHealth: vi.fn(async () => {
          throw new Error('database unavailable');
        })
      };
    });

    const { validateDependencies } = await import('../../../apps/api/src/bootstrap.ts');

    await expect(validateDependencies()).resolves.toEqual([
      { name: 'database', healthy: false, detail: 'database unavailable' }
    ]);
  });
});
