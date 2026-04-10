import { attachmentService } from './attachments';
import { medicalRecordsService } from './medicalRecords';
import type { CreateClinicalEntryRequest, ClinicalEntrySummary } from '@/types/medicalRecords';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';

export const diagnosticsService = {
  async listByEncounter(encounterId: string): Promise<ClinicalEntrySummary[]> {
    const entries = await medicalRecordsService.listEntries(encounterId);
    return entries.filter((entry) => entry.entryType === 'assessment' || entry.entryType === 'plan');
  },

  async createRequest(payload: Omit<CreateClinicalEntryRequest, 'entryType'>): Promise<ClinicalEntrySummary> {
    return medicalRecordsService.createEntry({
      ...payload,
      entryType: 'assessment'
    });
  },

  async listAttachments(encounterId: string): Promise<AttachmentSummary[]> {
    const record = await medicalRecordsService.getByEncounter(encounterId);
    return attachmentService.list('medical_record', record.record.id);
  },

  async uploadAttachment(
    encounterId: string,
    payload: Omit<Parameters<typeof attachmentService.upload>[0], 'linkedEntityType' | 'linkedEntityId'>
  ): Promise<AttachmentSummary> {
    const record = await medicalRecordsService.getByEncounter(encounterId);
    return attachmentService.upload({
      linkedEntityType: 'medical_record',
      linkedEntityId: record.record.id,
      ...payload
    });
  }
};
