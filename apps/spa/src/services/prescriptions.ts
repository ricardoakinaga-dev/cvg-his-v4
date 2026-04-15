import { apiRequest } from './api';
import { medicalRecordsService } from './medicalRecords';
import type {
  CreateClinicalEntryRequest,
  ClinicalEntrySummary
} from '@/types/medicalRecords';

interface PrescriptionSummary extends ClinicalEntrySummary {
  medicationName?: string;
  dosage?: string;
  route?: string;
  frequency?: string;
}

interface PrescriptionListResponse {
  items?: PrescriptionSummary[];
}

function parsePrescriptionContent(title: string, content: string) {
  const parsed: {
    medicationName: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    notes?: string;
  } = {
    medicationName: title.trim()
  };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('Posologia:')) {
      parsed.dosage = line.slice('Posologia:'.length).trim();
      continue;
    }

    if (line.startsWith('Via:')) {
      parsed.route = line.slice('Via:'.length).trim();
      continue;
    }

    if (line.startsWith('Frequência:')) {
      parsed.frequency = line.slice('Frequência:'.length).trim();
      continue;
    }

    if (line.startsWith('Observações:')) {
      parsed.notes = line.slice('Observações:'.length).trim();
    }
  }

  return parsed;
}

export const prescriptionsService = {
  async listByEncounter(encounterId: string): Promise<PrescriptionSummary[]> {
    const response = await apiRequest<PrescriptionListResponse>(
      `/prescriptions?encounterId=${encodeURIComponent(encounterId)}`
    );
    return response.items ?? [];
  },

  async create(payload: Omit<CreateClinicalEntryRequest, 'entryType'>): Promise<PrescriptionSummary> {
    const { record } = await medicalRecordsService.getByEncounter(payload.encounterId);
    const parsed = parsePrescriptionContent(payload.title, payload.content);

    return apiRequest<PrescriptionSummary>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        medicalRecordId: record.id,
        encounterId: payload.encounterId,
        patientId: payload.patientId,
        medicationName: parsed.medicationName,
        dosage: parsed.dosage,
        route: parsed.route,
        frequency: parsed.frequency,
        notes: parsed.notes
      })
    });
  }
};
