import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockPrescriptionList = vi.fn();
const mockExecutionList = vi.fn();
const mockExecutionGet = vi.fn();
const mockExecutionCreate = vi.fn();
const mockExecutionExecute = vi.fn();
const mockExecutionSuspend = vi.fn();
const mockExecutionResume = vi.fn();
const mockExecutionLog = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/prescriptions', () => ({
  prescriptionsService: {
    listByEncounter: (...args: unknown[]) => mockPrescriptionList(...args)
  }
}));

vi.mock('@/services/prescription-executions', () => ({
  prescriptionExecutionsService: {
    list: (...args: unknown[]) => mockExecutionList(...args),
    getById: (...args: unknown[]) => mockExecutionGet(...args),
    create: (...args: unknown[]) => mockExecutionCreate(...args),
    execute: (...args: unknown[]) => mockExecutionExecute(...args),
    suspend: (...args: unknown[]) => mockExecutionSuspend(...args),
    resume: (...args: unknown[]) => mockExecutionResume(...args),
    logEvent: (...args: unknown[]) => mockExecutionLog(...args)
  }
}));

describe('PrescriptionExecutionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/prescription-executions');
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
    mockPrescriptionList.mockResolvedValue([
      {
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
      }
    ]);
    mockExecutionList.mockResolvedValue([
      {
        id: 'exec-1',
        accountId: 'acc-1',
        clinicalEntryId: 'entry-1',
        patientId: 'pat-1',
        encounterId: 'enc-1',
        medicationName: 'Amoxicilina',
        dosage: '1 cap 12/12h',
        route: 'oral',
        frequency: '12/12h',
        scheduledAt: '2026-04-10T12:00:00Z',
        status: 'pending',
        version: 1,
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockExecutionGet.mockResolvedValue({
      id: 'exec-1',
      accountId: 'acc-1',
      clinicalEntryId: 'entry-1',
      patientId: 'pat-1',
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina',
      dosage: '1 cap 12/12h',
      route: 'oral',
      frequency: '12/12h',
      scheduledAt: '2026-04-10T12:00:00Z',
      status: 'pending',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z',
      events: []
    });
    mockExecutionCreate.mockResolvedValue({
      id: 'exec-2',
      accountId: 'acc-1',
      clinicalEntryId: 'entry-1',
      patientId: 'pat-1',
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina',
      dosage: '1 cap 12/12h',
      route: 'oral',
      frequency: '12/12h',
      scheduledAt: '2026-04-10T13:00:00Z',
      status: 'pending',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockExecutionExecute.mockResolvedValue({
      id: 'exec-1',
      accountId: 'acc-1',
      clinicalEntryId: 'entry-1',
      patientId: 'pat-1',
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina',
      dosage: '1 cap 12/12h',
      route: 'oral',
      frequency: '12/12h',
      scheduledAt: '2026-04-10T12:00:00Z',
      status: 'administered',
      version: 2,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T01:00:00Z'
    });
    mockExecutionSuspend.mockResolvedValue({
      id: 'exec-1',
      accountId: 'acc-1',
      clinicalEntryId: 'entry-1',
      patientId: 'pat-1',
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina',
      dosage: '1 cap 12/12h',
      route: 'oral',
      frequency: '12/12h',
      scheduledAt: '2026-04-10T12:00:00Z',
      status: 'suspended',
      version: 2,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T01:00:00Z'
    });
    mockExecutionResume.mockResolvedValue({
      id: 'exec-1',
      accountId: 'acc-1',
      clinicalEntryId: 'entry-1',
      patientId: 'pat-1',
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina',
      dosage: '1 cap 12/12h',
      route: 'oral',
      frequency: '12/12h',
      scheduledAt: '2026-04-10T12:00:00Z',
      status: 'pending',
      version: 3,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T01:30:00Z'
    });
    mockExecutionLog.mockResolvedValue({
      id: 'evt-1',
      executionId: 'exec-1',
      eventType: 'spa_manual_log',
      actorId: 'user-1',
      occurredAt: '2026-04-10T00:00:00Z',
      createdAt: '2026-04-10T00:00:00Z'
    });
  });

  it('uses encounter query context without creating an execution automatically', async () => {
    window.history.pushState(
      {},
      '',
      '/prescription-executions?encounterId=enc-2&patientId=pat-2&ownerId=own-2'
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
        reason: 'Aplicação supervisionada',
        openedAt: '2026-04-10T01:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T01:00:00Z'
      }
    ]);

    const PrescriptionExecutionsPage = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(PrescriptionExecutionsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Contexto do atendimento clínico');
    expect(wrapper.text()).toContain('enc-2');
    expect(wrapper.text()).toContain('Aplicação supervisionada');
    expect(mockPrescriptionList).toHaveBeenCalledWith('enc-2');
    expect(mockExecutionList).toHaveBeenCalledWith({ encounterId: 'enc-2' });
    expect(mockExecutionCreate).not.toHaveBeenCalled();
  });

  it('creates a prescription execution from a selected prescription', async () => {
    const PrescriptionExecutionsPage = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(PrescriptionExecutionsPage);
    await flushPromises();

    const inputs = wrapper.findAll('input');
    await inputs[1].setValue('1 cap 12/12h');
    await inputs[4].setValue('2026-04-10T12:00');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Observação de execução');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockExecutionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        clinicalEntryId: 'entry-1',
        medicationName: 'Amoxicilina'
      })
    );
    expect(wrapper.text()).toContain('Execução criada com sucesso');
  });
});
