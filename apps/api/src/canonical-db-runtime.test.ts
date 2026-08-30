import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { AuthSessionResponse } from '@cvg-his-v2/shared-contracts';
import { closeDatabaseClient, getPool, type TenantUnitOfWork } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { bootstrapServices } from './bootstrap.js';
import { createApiRuntime } from './runtime.js';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.E2E_DATABASE_URL ??
  'postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test';

const AUTH_SECRET = 'canonical-db-runtime-test-secret';
const TENANT_CONTEXT_ID = '00000000-0000-0000-0000-000000000001';

function runtimeOptions(bootstrap: Awaited<ReturnType<typeof bootstrapServices>>) {
  return {
    authSecret: AUTH_SECRET,
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false,
    requireUuidEntityIdentifiers: true,
    unitOfWork: bootstrap.unitOfWork as TenantUnitOfWork | undefined
  };
}

test('canonical PostgreSQL runtime survives connection close and rehydrates critical aggregates', async () => {
  let runtimeB: ReturnType<typeof createApiRuntime> | undefined;

  try {
    const bootstrapA = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    assert.ok(
      bootstrapA.repositories.financeCatalog,
      'canonical database bootstrap must compose the finance catalog source'
    );
    assert.ok(
      bootstrapA.repositories.advancePayments,
      'canonical database bootstrap must compose the advance-payment report source'
    );
    const runtimeA = createApiRuntime(runtimeOptions(bootstrapA));
    await runtimeA.initialize();

    const loginA = (await runtimeA.auth.login(
      {
        username: process.env.CANONICAL_DB_TEST_USERNAME ?? 'admin',
        password: process.env.CANONICAL_DB_TEST_PASSWORD ?? 'seed_admin'
      },
      'canonical-db-runtime-login'
    )) as AuthSessionResponse;
    const principalA = runtimeA.auth.authenticateAccessToken(loginA.accessToken);
    const accountId = principalA.user.accountId;
    const actorUserId = principalA.user.id;

    const identifiers = await runWithTenantContext(
      {
        tenantId: TENANT_CONTEXT_ID,
        accountId,
        userId: actorUserId,
        correlationId: 'canonical-db-runtime-write'
      },
      async () => {
        const owner = runtimeA.owners.create(accountId, {
          fullName: `Owner restart ${Date.now()}`,
          contacts: [
            {
              label: 'Celular',
              value: '+55 11 99999-7890',
              type: 'phone',
              primary: true
            }
          ],
          financialResponsible: true
        });
        await runtimeA.owners.waitForPersistence();

        const patient = runtimeA.patients.create(accountId, {
          name: `Paciente restart ${Date.now()}`,
          species: 'canine',
          breed: 'SRD',
          sex: 'female',
          primaryOwnerId: owner.id
        });
        await runtimeA.patients.waitForPersistence();

        const encounter = runtimeA.encounters.openEncounter(accountId, actorUserId, {
          patientId: patient.id,
          ownerId: owner.id,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Persistencia apos reinicio do runtime'
        });
        await runtimeA.encounters.waitForPersistence();

        const entry = await runtimeA.medicalRecords.createEntryAtomically(actorUserId, {
          encounterId: encounter.id,
          patientId: patient.id,
          entryType: 'anamnesis',
          title: 'Registro apos reinicio',
          content: 'Dados persistidos no PostgreSQL antes do fechamento da conexao.'
        });
        const record = runtimeA.medicalRecords.getRecordByEncounterOrThrow(encounter.id);

        const fileContent = Buffer.from('canonical restart attachment', 'utf8');
        const attachment = await runtimeA.attachments.upload(
          actorUserId,
          {
            linkedEntityType: 'encounter',
            linkedEntityId: encounter.id,
            category: 'document',
            fileName: 'canonical-restart.txt',
            mimeType: 'text/plain',
            checksum: createHash('sha256').update(fileContent).digest('hex')
          },
          fileContent
        );
        runtimeA.medicalRecords.appendAttachmentEvent(
          encounter.id,
          actorUserId,
          attachment.id,
          'Anexo persistido antes do reinicio'
        );
        await runtimeA.medicalRecords.waitForPersistence();

        const billing = await runtimeA.billing.createEstimate({
          encounterId: encounter.id,
          administrativeNotes: 'Billing persistido antes do reinicio'
        });

        const diagnosticOrder = await runtimeA.laboratory.createOrderAndPersistForAccount(
          accountId,
          {
            encounterId: encounter.id,
            patientId: patient.id,
            examType: 'hemograma',
            reason: 'Validacao de pipeline clinico persistente'
          }
        );
        await runtimeA.laboratory.recordResultAndPersistForAccount(accountId, diagnosticOrder.id, {
          status: 'collected',
          collectedByUserId: actorUserId
        });
        const resultedDiagnostic = await runtimeA.laboratory.recordResultAndPersistForAccount(
          accountId,
          diagnosticOrder.id,
          {
            status: 'resulted',
            resultSummary: 'Sem alteracoes relevantes',
            releasedByUserId: actorUserId,
            signedByUserId: actorUserId
          }
        );

        const prescription = runtimeA.prescriptions.create(accountId, actorUserId, {
          medicalRecordId: record.id,
          encounterId: encounter.id,
          patientId: patient.id,
          medicationName: 'Amoxicilina',
          dosage: '10 mg/kg',
          route: 'oral',
          frequency: '12/12h',
          notes: 'Apos alimentacao'
        });
        await runtimeA.prescriptions.waitForPersistence();
        runtimeA.prescriptions.sign(prescription.id, actorUserId, prescription.version);
        await runtimeA.prescriptions.waitForPersistence();
        const execution = runtimeA.prescriptionExecutions.create(accountId, {
          clinicalEntryId: prescription.id,
          patientId: patient.id,
          encounterId: encounter.id,
          medicationName: prescription.medicationName,
          dosage: prescription.dosage ?? '10 mg/kg',
          route: prescription.route,
          frequency: prescription.frequency,
          scheduledAt: new Date(Date.now() + 60_000).toISOString()
        });
        await runtimeA.prescriptionExecutions.waitForPersistence();
        const administeredExecution = runtimeA.prescriptionExecutions.execute(
          accountId,
          execution.id,
          actorUserId,
          { status: 'administered', vitalsSnapshot: { temperatureC: 38.5 } }
        );
        await runtimeA.prescriptionExecutions.waitForPersistence();

        const inpatientStay = runtimeA.inpatient.admit(
          {
            encounterId: encounter.id,
            patientId: patient.id,
            unit: 'Internacao',
            ward: 'A',
            bed: 'sem-leito'
          },
          accountId,
          actorUserId
        );
        const inpatientProgress = runtimeA.inpatient.addProgress(
          actorUserId,
          {
            stayId: inpatientStay.id,
            note: 'Paciente estavel apos observacao'
          },
          accountId
        );
        const dailyCharge = runtimeA.inpatient.createDailyCharge(
          actorUserId,
          {
            stayId: inpatientStay.id,
            description: 'Diaria de observacao',
            unitAmount: 120
          },
          accountId
        );
        await runtimeA.inpatient.waitForPersistence();
        const dischargedStay = runtimeA.inpatient.updateStatus(
          inpatientStay.id,
          {
            status: 'discharged',
            dischargeReason: 'Alta apos observacao'
          },
          accountId
        );
        await runtimeA.inpatient.waitForPersistence();

        const surgeryCase = runtimeA.surgery.requestCase({
          encounterId: encounter.id,
          patientId: patient.id,
          procedureName: 'Limpeza dentaria',
          surgeonUserId: actorUserId,
          surgicalTeam: ['Equipe A']
        });
        await runtimeA.surgery.waitForPersistence();
        const surgeryPreOp = runtimeA.surgery.updateStatus(surgeryCase.id, {
          status: 'pre_op'
        });
        await runtimeA.surgery.waitForPersistence();

        const inventoryItem = await runtimeA.inventory.createItem(accountId, {
          sku: `CAN-${Date.now()}`,
          name: 'Material canonico de teste',
          unit: 'unidade',
          onHandQuantity: 10,
          reorderLevel: 2,
          unitCostAmount: 3.5
        });
        await runtimeA.inventory.consumeForSale(accountId, inventoryItem.id, 2);

        const journalEntry = await runtimeA.ledger.postEntry({
          accountId,
          sourceType: 'canonical-db-runtime',
          sourceId: `journal-${Date.now()}`,
          description: 'Partida persistida pelo teste de runtime canonico',
          createdByUserId: actorUserId,
          lines: [
            { accountCode: '1.1.01-caixa', debit: 120, credit: 0, memo: 'Entrada' },
            { accountCode: '3.1.01-receita-clinica', debit: 0, credit: 120, memo: 'Receita' }
          ]
        });

        return {
          ownerId: owner.id,
          patientId: patient.id,
          encounterId: encounter.id,
          recordId: record.id,
          entryId: entry.id,
          attachmentId: attachment.id,
          billingId: billing.id,
          diagnosticOrderId: resultedDiagnostic.id,
          executionId: administeredExecution.id,
          prescriptionId: prescription.id,
          inpatientStayId: dischargedStay.id,
          inpatientProgressId: inpatientProgress.id,
          dailyChargeId: dailyCharge.id,
          surgeryCaseId: surgeryPreOp.id,
          inventoryItemId: inventoryItem.id,
          journalEntryId: journalEntry.id,
          journalSourceId: journalEntry.sourceId
        };
      }
    );

    const unitOfWork = bootstrapA.unitOfWork;
    assert.ok(unitOfWork, 'canonical database bootstrap must expose TenantUnitOfWork');

    await assert.rejects(
      () =>
        unitOfWork.execute(
          {
            accountId,
            actorUserId,
            correlationId: 'canonical-db-runtime-rollback',
            operation: 'canonical-db-runtime.rollback',
            idempotencyKey: `rollback-${Date.now()}`
          },
          { scenario: 'forced-rollback' },
          async (transaction) => {
            await transaction.outbox.append({
              moduleName: 'canonical-db-runtime',
              eventType: 'canonical.rollback.requested',
              payload: { accountId, scenario: 'forced-rollback' }
            });
            await transaction.audit.append({
              entityType: 'canonical-db-runtime',
              entityId: identifiers.encounterId,
              action: 'forced_rollback',
              metadata: { accountId }
            });
            throw new Error('forced canonical rollback');
          }
        ),
      /forced canonical rollback/
    );

    const rollbackEvidence = await runWithTenantContext(
      {
        tenantId: TENANT_CONTEXT_ID,
        accountId,
        userId: actorUserId,
        correlationId: 'canonical-db-runtime-rollback-check'
      },
      () =>
        getPool().query<{ outbox_count: string; audit_count: string }>(
          `SELECT
             (SELECT count(*)::text FROM outbox_events WHERE account_id = $1 AND correlation_id = $2) AS outbox_count,
             (SELECT count(*)::text FROM audit_events WHERE account_id = $1 AND correlation_id = $2) AS audit_count`,
          [accountId, 'canonical-db-runtime-rollback']
        )
    );
    assert.equal(rollbackEvidence.rows[0]?.outbox_count, '0');
    assert.equal(rollbackEvidence.rows[0]?.audit_count, '0');

    const idempotencyKey = `success-${Date.now()}`;
    const firstExecution = await unitOfWork.execute(
      {
        accountId,
        actorUserId,
        correlationId: 'canonical-db-runtime-idempotency',
        operation: 'canonical-db-runtime.success',
        idempotencyKey
      },
      { scenario: 'idempotent-success' },
      async (transaction) => {
        await transaction.outbox.append({
          moduleName: 'canonical-db-runtime',
          eventType: 'canonical.success.created',
          payload: { accountId, scenario: 'idempotent-success' }
        });
        await transaction.audit.append({
          entityType: 'canonical-db-runtime',
          entityId: identifiers.encounterId,
          action: 'idempotent_success',
          metadata: { accountId }
        });
        return { persisted: true, encounterId: identifiers.encounterId };
      }
    );
    assert.equal(firstExecution.replayed, false);

    const replayExecution = await unitOfWork.execute(
      {
        accountId,
        actorUserId,
        correlationId: 'canonical-db-runtime-idempotency-replay',
        operation: 'canonical-db-runtime.success',
        idempotencyKey
      },
      { scenario: 'idempotent-success' },
      async () => {
        throw new Error('idempotent command must not execute twice');
      }
    );
    assert.equal(replayExecution.replayed, true);
    assert.deepEqual(replayExecution.value, firstExecution.value);

    await closeDatabaseClient();

    const bootstrapB = await bootstrapServices({ databaseUrl: TEST_DATABASE_URL });
    runtimeB = createApiRuntime(runtimeOptions(bootstrapB));
    await runtimeB.initialize();

    const refreshed = (await runtimeB.auth.refresh(
      { refreshToken: loginA.refreshToken },
      'canonical-db-runtime-refresh'
    )) as AuthSessionResponse;
    assert.equal(refreshed.principal.user.id, actorUserId);
    assert.equal(refreshed.principal.user.accountId, accountId);

    await runWithTenantContext(
      {
        tenantId: TENANT_CONTEXT_ID,
        accountId,
        userId: actorUserId,
        correlationId: 'canonical-db-runtime-read'
      },
      async () => {
        assert.equal(runtimeB!.owners.getOrThrow(identifiers.ownerId).accountId, accountId);
        assert.equal(runtimeB!.patients.getOrThrow(identifiers.patientId).accountId, accountId);
        assert.equal(
          runtimeB!.encounters.getOrThrow(identifiers.encounterId).patientId,
          identifiers.patientId
        );

        const record = await runtimeB!.medicalRecords.getRecordByEncounterOrThrowAsync(
          identifiers.encounterId as never
        );
        assert.equal(record.id, identifiers.recordId);

        const entries = await runtimeB!.medicalRecords.listEntriesByEncounterAsync(
          identifiers.encounterId as never
        );
        assert.ok(entries.some((entry) => entry.id === identifiers.entryId));

        const timeline = await runtimeB!.medicalRecords.listTimelineByEncounterAsync(
          identifiers.encounterId as never
        );
        assert.ok(timeline.some((event) => event.attachmentId === identifiers.attachmentId));

        const attachments = await runtimeB!.attachments.listByLinkedEntity(
          'encounter',
          identifiers.encounterId
        );
        assert.ok(attachments.some((attachment) => attachment.id === identifiers.attachmentId));

        const billing = await runtimeB!.billing.getByEncounterOrThrow(
          identifiers.encounterId as never
        );
        assert.equal(billing.id, identifiers.billingId);
        assert.equal(billing.status, 'estimated');

        assert.equal(
          runtimeB!.diagnostics.getOrThrow(identifiers.diagnosticOrderId as never).status,
          'resulted'
        );
        const prescription = runtimeB!.prescriptions.getById(identifiers.prescriptionId as never);
        assert.equal(prescription.entryType, 'prescription');
        const execution = runtimeB!.prescriptionExecutions.getById(
          identifiers.executionId as never
        );
        assert.equal(execution.status, 'administered');
        assert.equal(
          runtimeB!.prescriptionExecutions.getEvents(accountId, execution.id).length >= 2,
          true
        );

        const stay = runtimeB!.inpatient.getOrThrow(
          identifiers.inpatientStayId as never,
          accountId
        );
        assert.equal(stay.status, 'discharged');
        assert.ok(
          runtimeB!.inpatient
            .listProgress(stay.id, accountId)
            .some((progress) => progress.id === identifiers.inpatientProgressId)
        );
        assert.ok(
          runtimeB!.inpatient
            .listDailyCharges(stay.id, accountId)
            .some((charge) => charge.id === identifiers.dailyChargeId)
        );

        assert.equal(
          runtimeB!.surgery.getOrThrow(identifiers.surgeryCaseId as never).status,
          'pre_op'
        );
        const inventoryItem = runtimeB!.inventory.getItemOrThrow(
          identifiers.inventoryItemId as never,
          accountId
        );
        assert.equal(inventoryItem.onHandQuantity, 8);
        assert.ok(
          runtimeB!.inventory
            .listLots(accountId)
            .some((lot) => lot.inventoryItemId === identifiers.inventoryItemId && lot.quantity > 0)
        );
        const journal = await runtimeB!.ledger.findBySource(
          accountId,
          'canonical-db-runtime',
          identifiers.journalSourceId
        );
        assert.equal(journal?.id, identifiers.journalEntryId);
        assert.equal(
          journal?.lines.reduce((total, line) => total + line.debit, 0),
          journal?.lines.reduce((total, line) => total + line.credit, 0)
        );
      }
    );
  } finally {
    await runtimeB?.medicalRecords.waitForPersistence().catch(() => undefined);
    await closeDatabaseClient().catch(() => undefined);
  }
});
