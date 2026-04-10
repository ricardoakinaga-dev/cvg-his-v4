import { medicalRecordsService } from './medicalRecords';
import type {
  CreateClinicalEntryRequest,
  ClinicalEntrySummary
} from '@/types/medicalRecords';

export const prescriptionsService = {
  async listByEncounter(encounterId: string): Promise<ClinicalEntrySummary[]> {
    const entries = await medicalRecordsService.listEntries(encounterId);
    return entries.filter((entry) => entry.entryType === 'prescription');
  },

  async create(payload: Omit<CreateClinicalEntryRequest, 'entryType'>): Promise<ClinicalEntrySummary> {
    return medicalRecordsService.createEntry({
      ...payload,
      entryType: 'prescription'
    });
  }
};
