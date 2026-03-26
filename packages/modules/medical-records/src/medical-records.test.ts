import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import {
  MedicalRecordsService,
  type ClinicalEntryRepository,
  type ClinicalTimelineRepository,
  type MedicalRecordRepository
} from './index.js';

function createService() {
  const medicalRecords: unknown[] = [];
  const entries: unknown[] = [];
  const timeline: unknown[] = [];

  const medicalRecordRepository: MedicalRecordRepository = {
    async create(record) {
      medicalRecords.push(record);
    },
    async update() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return null;
    }
  };

  const clinicalEntryRepository: ClinicalEntryRepository = {
    async create(entry) {
      entries.push(entry);
    },
    async findByMedicalRecordId() {
      return [];
    }
  };

  const clinicalTimelineRepository: ClinicalTimelineRepository = {
    async create(event) {
      timeline.push(event);
    },
    async findByMedicalRecordId() {
      return [];
    }
  };

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return {
          id: patientId
        };
      }
    } as never,
    medicalRecordRepository,
    clinicalEntryRepository,
    clinicalTimelineRepository
  });

  return { service, medicalRecords, entries, timeline };
}

test('MedicalRecordsService ensureRecord creates record and initial timeline event', async () => {
  const { service, medicalRecords, timeline } = createService();

  const record = service.ensureRecord('encounter_1' as never);
  await Promise.resolve();

  assert.equal(record.encounterId, 'encounter_1');
  assert.equal(medicalRecords.length, 1);
  assert.equal(timeline.length, 1);
  assert.equal((timeline[0] as { eventType: string }).eventType, 'record_created');
});

test('MedicalRecordsService addEntry stores entry and appends timeline', async () => {
  const { service, entries, timeline } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Paciente com boa evolucao'
  });
  await Promise.resolve();

  assert.equal(entry.title, 'Historico');
  assert.equal(entries.length, 1);
  assert.equal(service.listEntriesByEncounter('encounter_1' as never).length, 1);
  assert.equal(service.listTimelineByEncounter('encounter_1' as never).length, 2);
  assert.equal(
    service.listTimelineByEncounter('encounter_1' as never)[0].eventType,
    'entry_added'
  );
});

test('MedicalRecordsService addEntry rejects patient mismatch', () => {
  const { service } = createService();

  assert.throws(
    () =>
      service.addEntry('doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_other',
        entryType: 'anamnesis',
        title: 'Historico',
        content: 'Conteudo'
      }),
    NotFoundError
  );
});

test('MedicalRecordsService appends attachment and advanced-care events to timeline', () => {
  const { service } = createService();

  service.ensureRecord('encounter_1' as never);
  service.appendAttachmentEvent(
    'encounter_1' as never,
    'doctor_1' as never,
    'att_1',
    'Anexo laboratorial'
  );
  service.appendAdvancedCareEvent(
    'encounter_1' as never,
    'doctor_1' as never,
    'diagnostic_requested',
    'Ultrassom solicitado'
  );

  const timeline = service.listTimelineByEncounter('encounter_1' as never);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].eventType, 'diagnostic_requested');
  assert.equal(timeline[1].eventType, 'attachment_added');
});
