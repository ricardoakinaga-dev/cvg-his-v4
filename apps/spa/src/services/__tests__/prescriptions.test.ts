import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();
const mockGetByEncounter = vi.fn();

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

vi.mock('../medicalRecords', () => ({
  medicalRecordsService: {
    getByEncounter: (...args: unknown[]) => mockGetByEncounter(...args)
  }
}));

describe('prescriptionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists prescriptions from the dedicated API and maps them to clinical entries', async () => {
    mockApiRequest.mockResolvedValue({
      items: [
        {
          id: 'rx-1',
          accountId: 'acc-1',
          medicalRecordId: 'mr-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          entryType: 'prescription',
          title: 'Amoxicilina',
          content: 'Posologia: 500mg\nVia: Oral',
          authoredByUserId: 'user-1',
          version: 1,
          createdAt: '2026-04-13T00:00:00Z',
          updatedAt: '2026-04-13T00:00:00Z',
          medicationName: 'Amoxicilina',
          dosage: '500mg',
          route: 'Oral'
        }
      ]
    });

    const { prescriptionsService } = await import('../prescriptions');
    const result = await prescriptionsService.listByEncounter('enc-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/prescriptions?encounterId=enc-1');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'rx-1',
        medicalRecordId: 'mr-1',
        encounterId: 'enc-1',
        title: 'Amoxicilina',
        content: 'Posologia: 500mg\nVia: Oral',
        entryType: 'prescription'
      })
    ]);
  });

  it('creates prescriptions through the dedicated API using the encounter medical record', async () => {
    mockGetByEncounter.mockResolvedValue({
      record: {
        id: 'mr-1'
      }
    });
    mockApiRequest.mockResolvedValue({
      id: 'rx-1',
      accountId: 'acc-1',
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'prescription',
      title: 'Amoxicilina',
      content: 'Posologia: 500mg\nVia: Oral\nFrequência: 8/8h\nObservações: após alimentação',
      authoredByUserId: 'user-1',
      version: 1,
      createdAt: '2026-04-13T00:00:00Z',
      updatedAt: '2026-04-13T00:00:00Z',
      medicationName: 'Amoxicilina',
      dosage: '500mg',
      route: 'Oral',
      frequency: '8/8h'
    });

    const { prescriptionsService } = await import('../prescriptions');
    const result = await prescriptionsService.create({
      encounterId: 'enc-1',
      patientId: 'pat-1',
      title: 'Amoxicilina',
      content: 'Posologia: 500mg\nVia: Oral\nFrequência: 8/8h\nObservações: após alimentação'
    });

    expect(mockGetByEncounter).toHaveBeenCalledWith('enc-1');
    expect(mockApiRequest).toHaveBeenCalledWith('/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        medicalRecordId: 'mr-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        medicationName: 'Amoxicilina',
        dosage: '500mg',
        route: 'Oral',
        frequency: '8/8h',
        notes: 'após alimentação'
      })
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'rx-1',
        medicalRecordId: 'mr-1',
        entryType: 'prescription',
        title: 'Amoxicilina'
      })
    );
  });
});
