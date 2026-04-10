import { medicalRecordsService } from './medicalRecords';
import type { CreateClinicalEntryRequest, ClinicalEntrySummary } from '@/types/medicalRecords';

export const surgeryService = {
  async listByEncounter(encounterId: string): Promise<ClinicalEntrySummary[]> {
    const entries = await medicalRecordsService.listEntries(encounterId);
    return entries.filter(
      (entry) =>
        entry.entryType === 'plan' ||
        entry.entryType === 'conduct' ||
        /surg/i.test(entry.title) ||
        /surg/i.test(entry.content)
    );
  },

  async createRequest(payload: Omit<CreateClinicalEntryRequest, 'entryType'>): Promise<ClinicalEntrySummary> {
    return medicalRecordsService.createEntry({
      ...payload,
      entryType: 'conduct'
    });
  }
};
