import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockPrescriptionList = vi.fn();
const mockExecutionList = vi.fn();
const mockPrescriptionCreate = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/prescriptions', () => ({
  prescriptionsService: {
    listByEncounter: (...args: unknown[]) => mockPrescriptionList(...args),
    create: (...args: unknown[]) => mockPrescriptionCreate(...args)
  }
}));

vi.mock('@/services/prescription-executions', () => ({
  prescriptionExecutionsService: {
    list: (...args: unknown[]) => mockExecutionList(...args)
  }
}));

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/prescriptions');
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockPrescriptionList.mockResolvedValue([]);
    mockExecutionList.mockResolvedValue([]);
    mockPrescriptionCreate.mockResolvedValue({
      id: 'entry-1',
      accountId: 'acc-1',
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'prescription',
      title: 'Amoxicilina',
      content: 'Posologia: 1 cap 12/12h',
      authoredByUserId: 'user-1',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
  });

  it('uses encounter query context without creating a prescription automatically', async () => {
    window.history.pushState(
      {},
      '',
      '/prescriptions?encounterId=enc-2&patientId=pat-2&ownerId=own-2'
    );
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      },
      {
        id: 'enc-2',
        accountId: 'acc-1',
        patientId: 'pat-2',
        ownerId: 'own-2',
        visitType: 'walk_in',
        status: 'in_care',
        origin: 'reception',
        reason: 'Prescrição pós-consulta',
        openedAt: '2026-04-10T01:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T01:00:00Z'
      }
    ]);

    const PrescriptionsPage = (await import('../PrescriptionsPage.vue')).default;
    const wrapper = mount(PrescriptionsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Contexto do atendimento clínico');
    expect(wrapper.text()).toContain('enc-2');
    expect(wrapper.text()).toContain('Prescrição pós-consulta');
    expect(mockPrescriptionList).toHaveBeenCalledWith('enc-2');
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('creates a prescription entry on the selected encounter', async () => {
    const PrescriptionsPage = (await import('../PrescriptionsPage.vue')).default;
    const wrapper = mount(PrescriptionsPage);
    await flushPromises();

    await wrapper.find('input').setValue('Amoxicilina');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('1 cap 12/12h');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockPrescriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        title: 'Amoxicilina'
      })
    );
    expect(wrapper.text()).toContain('Prescrição registrada com sucesso');
  });
});
