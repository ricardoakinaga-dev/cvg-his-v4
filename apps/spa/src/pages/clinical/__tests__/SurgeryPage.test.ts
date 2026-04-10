import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockTimeline = vi.fn();
const mockSurgeryList = vi.fn();
const mockSurgeryCreate = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    getTimeline: (...args: unknown[]) => mockTimeline(...args)
  }
}));

vi.mock('@/services/surgery', () => ({
  surgeryService: {
    listByEncounter: (...args: unknown[]) => mockSurgeryList(...args),
    createRequest: (...args: unknown[]) => mockSurgeryCreate(...args)
  }
}));

describe('SurgeryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno cirúrgico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockTimeline.mockResolvedValue([
      {
        id: 'tl-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        medicalRecordId: 'mr-1',
        eventType: 'surgery_requested',
        summary: 'Cirurgia solicitada',
        actorUserId: 'user-1',
        occurredAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockSurgeryList.mockResolvedValue([]);
    mockSurgeryCreate.mockResolvedValue({
      id: 'entry-1',
      accountId: 'acc-1',
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'conduct',
      title: 'Ovariohisterectomia',
      content: 'Cirurgião: user-1',
      authoredByUserId: 'user-1',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
  });

  it('registers a surgery request on the selected encounter', async () => {
    const SurgeryPage = (await import('../SurgeryPage.vue')).default;
    const wrapper = mount(SurgeryPage);
    await flushPromises();

    await wrapper.find('input').setValue('Ovariohisterectomia');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockSurgeryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        title: 'Ovariohisterectomia'
      })
    );
    expect(wrapper.text()).toContain('Solicitação cirúrgica registrada');
  });
});
