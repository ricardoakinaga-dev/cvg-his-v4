import { ref } from 'vue';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type {
  ClinicalEntrySummary,
  CreateClinicalEntryRequest,
  UpdateClinicalEntryRequest
} from '@/types/medicalRecords';
import type { PatientSummary } from '@/types/patient';

interface PatientClinicalHistoryContext {
  patientId: string;
  patient: PatientSummary;
  encounter: EncounterSummary;
  existingEntry: ClinicalEntrySummary | null;
  medicalRecordId?: string;
}

interface StableMutationAttempt {
  readonly payloadSignature: string;
  readonly idempotencyKey: string;
}

function requireClinicalHistoryResponse(value: ClinicalEntrySummary): ClinicalEntrySummary {
  if (!value || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('O histórico clínico não retornou um identificador confirmável');
  }
  return value;
}

export function usePatientClinicalHistory() {
  const draft = ref('');
  const saving = ref(false);
  let mutationAttempt: StableMutationAttempt | null = null;

  function reset() {
    draft.value = '';
    mutationAttempt = null;
    saving.value = false;
  }

  async function save(
    context: PatientClinicalHistoryContext,
    isCurrentRequest: () => boolean
  ): Promise<ClinicalEntrySummary | null> {
    if (
      context.patient.id !== context.patientId ||
      context.encounter.patientId !== context.patientId ||
      (context.existingEntry && context.existingEntry.patientId !== context.patientId)
    ) {
      throw new Error(
        'O paciente e o atendimento não correspondem ao histórico clínico selecionado'
      );
    }

    saving.value = true;

    try {
      const content = draft.value.trim();
      const existing = context.existingEntry;
      const updatePayload: UpdateClinicalEntryRequest = {
        content,
        reason: 'Atualização do histórico clínico longitudinal',
        expectedVersion: existing?.version
      };
      const createPayload: CreateClinicalEntryRequest = {
        encounterId: context.encounter.id,
        patientId: context.patient.id,
        entryType: 'progress_note',
        title: 'Histórico clínico longitudinal',
        content
      };
      const mutationPayload = existing ? updatePayload : createPayload;
      const payloadSignature = JSON.stringify(mutationPayload);
      if (mutationAttempt?.payloadSignature !== payloadSignature) {
        const uuid = globalThis.crypto?.randomUUID?.();
        mutationAttempt = {
          payloadSignature,
          idempotencyKey: uuid
            ? `patient-clinical-history-${uuid}`
            : `patient-clinical-history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        };
      }
      const idempotencyKey = mutationAttempt.idempotencyKey;
      const saved = requireClinicalHistoryResponse(
        existing
          ? await medicalRecordsService.updateEntry(existing.id, updatePayload, { idempotencyKey })
          : await medicalRecordsService.createEntry(createPayload, { idempotencyKey })
      );

      if (!isCurrentRequest()) return null;

      const confirmationEncounterId = existing?.encounterId ?? context.encounter.id;
      const rereadEntries = await medicalRecordsService.listEntries(confirmationEncounterId);
      if (!isCurrentRequest()) return null;

      const confirmed = rereadEntries.find(
        (entry) =>
          entry.id === saved.id &&
          entry.patientId === context.patientId &&
          entry.encounterId === confirmationEncounterId &&
          entry.medicalRecordId === (existing?.medicalRecordId ?? context.medicalRecordId) &&
          entry.entryType === 'progress_note' &&
          entry.title === (existing?.title ?? createPayload.title) &&
          entry.content === content &&
          !entry.deletedAt &&
          (!existing || entry.version > existing.version)
      );
      if (!confirmed) {
        throw new Error(
          'Histórico clínico enviado, mas não foi confirmado na releitura do prontuário. O rascunho foi preservado.'
        );
      }

      draft.value = confirmed.content;
      mutationAttempt = null;
      return confirmed;
    } finally {
      if (isCurrentRequest()) {
        saving.value = false;
      }
    }
  }

  return { draft, saving, reset, save };
}

export type { PatientClinicalHistoryContext };
