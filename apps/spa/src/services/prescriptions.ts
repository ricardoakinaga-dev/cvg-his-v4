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
  notes?: string;
  lastRevisionReason?: string;
  lastRevisionByUserId?: string;
}

interface PrescriptionListResponse {
  items?: PrescriptionSummary[];
}

interface PrescriptionDocumentContext {
  clinic: {
    name: string;
    document?: string;
    address?: string;
    phone?: string;
  };
  owner: {
    name: string;
    document?: string;
  };
  patient: {
    name: string;
    species?: string;
    breed?: string;
    weightKg?: number;
  };
  professional: {
    name: string;
    license?: string;
  };
}

interface PrescriptionDocument {
  title: 'Receita Veterinaria';
  prescriptionId: string;
  issuedAt: string;
  header: string;
  owner: string;
  patient: string;
  medications: Array<{
    medicationName: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    notes?: string;
  }>;
  footer: string;
  printText: string;
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

  async listByPatient(patientId: string): Promise<PrescriptionSummary[]> {
    const response = await apiRequest<PrescriptionListResponse>(
      `/prescriptions?patientId=${encodeURIComponent(patientId)}`
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
  },

  async getById(id: string): Promise<PrescriptionSummary> {
    return apiRequest<PrescriptionSummary>(`/prescriptions/${encodeURIComponent(id)}`);
  },

  async renderDocument(
    id: string,
    context: PrescriptionDocumentContext
  ): Promise<PrescriptionDocument> {
    return apiRequest<PrescriptionDocument>(`/prescriptions/${encodeURIComponent(id)}/document`, {
      method: 'POST',
      body: JSON.stringify(context)
    });
  },

  async update(
    id: string,
    payload: { title?: string; content?: string; reason: string; expectedVersion?: number }
  ): Promise<PrescriptionSummary> {
    return apiRequest<PrescriptionSummary>(`/prescriptions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async archive(
    id: string,
    payload: { reason: string; expectedVersion?: number }
  ): Promise<PrescriptionSummary> {
    return apiRequest<PrescriptionSummary>(`/prescriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    });
  }
};
