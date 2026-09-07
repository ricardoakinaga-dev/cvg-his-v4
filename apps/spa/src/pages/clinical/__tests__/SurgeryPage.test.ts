import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const mockEncounterList = vi.fn();
const mockTimeline = vi.fn();
const mockSurgeryList = vi.fn();
const mockSurgeryCreate = vi.fn();
const mockSurgeryUpdateStatus = vi.fn();

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
    createRequest: (...args: unknown[]) => mockSurgeryCreate(...args),
    updateStatus: (...args: unknown[]) => mockSurgeryUpdateStatus(...args)
  }
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const encounters = [
  { id: 'enc-1', patientId: 'pat-1', reason: 'Paciente A', status: 'in_care' },
  { id: 'enc-2', patientId: 'pat-2', reason: 'Paciente B', status: 'in_care' }
];
function surgery(encounterId: string) {
  return { id: `case-${encounterId}`, encounterId, procedureName: `Procedimento ${encounterId}`, status: 'requested', createdAt: '2026-04-10T00:00:00Z' };
}
async function mountPage() {
  const Page = (await import('../SurgeryPage.vue')).default;
  return mount(Page, { global: { stubs: { DsAlert } } });
}
function action(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)!;
}

describe('SurgeryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
      id: 'surgery-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      procedureName: 'Ovariohisterectomia',
      status: 'requested',
      surgeonUserId: 'user-1',
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
        procedureName: 'Ovariohisterectomia'
      })
    );
    expect(wrapper.text()).toContain('Solicitação cirúrgica registrada');
  });
  it('clears the old records and draft while a different encounter loads', async () => {
    mockEncounterList.mockResolvedValue([
      { id: 'enc-1', patientId: 'pat-1', reason: 'Paciente A', status: 'in_care' },
      { id: 'enc-2', patientId: 'pat-2', reason: 'Paciente B', status: 'in_care' }
    ]);
    let resolveSecond!: (value: unknown[]) => void;
    mockSurgeryList.mockResolvedValueOnce([{ id: 'case-A', encounterId: 'enc-1', procedureName: 'Cirurgia exclusiva A', status: 'requested' }])
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));
    const SurgeryPage = (await import('../SurgeryPage.vue')).default;
    const wrapper = mount(SurgeryPage);
    await flushPromises();
    await wrapper.find('input').setValue('Rascunho exclusivo A');
    await wrapper.find('select').setValue('enc-2');
    expect(wrapper.text()).not.toContain('Cirurgia exclusiva A');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Carregando contexto cirúrgico');
    resolveSecond([]);
    await flushPromises();
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Cirurgia para Paciente B');
    expect(mockTimeline).toHaveBeenLastCalledWith('enc-2');
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('commits both reads atomically and ignores a late response after A → B → A', async () => {
    mockEncounterList.mockResolvedValue(encounters);
    mockSurgeryList.mockImplementation((id: string) => Promise.resolve([surgery(id)]));
    const lateTimeline = deferred<unknown[]>();
    mockTimeline.mockImplementation((id: string) => id === 'enc-2' ? lateTimeline.promise : Promise.resolve([]));
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Procedimento enc-2');
    await wrapper.find('select').setValue('enc-1');
    await flushPromises();
    lateTimeline.resolve([{ eventType: 'surgery_completed', summary: 'Evento exclusivo B' }]);
    await flushPromises();
    expect(wrapper.text()).toContain('Procedimento enc-1');
    expect(wrapper.text()).not.toContain('Procedimento enc-2');
    expect(wrapper.text()).not.toContain('Evento exclusivo B');
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
    expect(mockSurgeryUpdateStatus).not.toHaveBeenCalled();
  });

  it('keeps secondary-read failure and retry available after dismissing the alert', async () => {
    mockEncounterList.mockResolvedValue(encounters);
    mockSurgeryList.mockImplementation((id: string) => Promise.resolve([surgery(id)]));
    const wrapper = await mountPage();
    await flushPromises();
    mockTimeline.mockRejectedValueOnce(new Error('Timeline indisponível'));
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Procedimento enc-1');
    expect(wrapper.text()).not.toContain('Procedimento enc-2');
    await wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.find('.context-state').text()).toContain('Não foi possível carregar as cirurgias');
    expect(wrapper.findAll('.overview-metric dd').slice(1).map(node => node.text())).toEqual(['—', '—']);
    await action(wrapper, 'Tentar novamente').trigger('click');
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.text()).toContain('Procedimento enc-2');
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('shows unknown counts while loading and persistent list failure before recovering without writes', async () => {
    const pending = deferred<unknown[]>();
    mockEncounterList.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.findAll('.overview-metric dd').map(node => node.text())).toEqual(['—', '—', '—']);
    pending.reject(new Error('Falha de atendimentos'));
    await flushPromises();
    await wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.find('.context-state').text()).toContain('Não foi possível carregar os atendimentos');
    await action(wrapper, 'Tentar novamente').trigger('click');
    await flushPromises();
    expect(wrapper.find('select').element.value).toBe('enc-1');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('excludes closed encounters, offers empty recovery and clears an explicit blank selection', async () => {
    mockEncounterList.mockResolvedValueOnce([{ ...encounters[0], status: 'closed' }]);
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Nenhum atendimento disponível para cirurgia');
    expect(wrapper.find('a[href="/encounters"]').exists()).toBe(true);
    expect(mockSurgeryList).not.toHaveBeenCalled();
    mockEncounterList.mockResolvedValue(encounters);
    await action(wrapper, 'Atualizar').trigger('click');
    await flushPromises();
    await wrapper.find('select').setValue('');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Selecione um atendimento para consultar');
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('revalidates removed selection on refresh using the first eligible encounter', async () => {
    mockEncounterList.mockResolvedValueOnce(encounters).mockResolvedValueOnce([encounters[1]]);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('input').setValue('Rascunho A');
    await action(wrapper, 'Atualizar').trigger('click');
    await flushPromises();
    expect(wrapper.find('select').element.value).toBe('enc-2');
    expect(wrapper.find('input').element.value).toBe('Cirurgia para Paciente B');
    expect(mockSurgeryList).toHaveBeenLastCalledWith('enc-2');
    expect(mockTimeline).toHaveBeenLastCalledWith('enc-2');
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('preserves full create payload and locks selector and refresh while submitting', async () => {
    const pending = deferred<unknown>();
    mockSurgeryCreate.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    await flushPromises();
    const inputs = wrapper.findAll('form input');
    await inputs[0].setValue('  Procedimento detalhado  ');
    await inputs[1].setValue('  surgeon-2  ');
    await inputs[2].setValue('2026-09-08T10:30');
    await inputs[3].setValue(' user-1, user-2, , ');
    await wrapper.find('textarea').setValue('  Preparar sala  ');
    await wrapper.find('form').trigger('submit');
    expect(mockSurgeryCreate).toHaveBeenCalledWith({
      encounterId: 'enc-1', patientId: 'pat-1', procedureName: 'Procedimento detalhado',
      surgeonUserId: 'surgeon-2', scheduledAt: new Date('2026-09-08T10:30').toISOString(),
      surgicalTeam: ['user-1', 'user-2'], preparationNotes: 'Preparar sala'
    });
    expect(wrapper.find('select').element.disabled).toBe(true);
    expect(action(wrapper, 'Atualizar').attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit');
    expect(mockSurgeryCreate).toHaveBeenCalledTimes(1);
    pending.resolve({});
    await flushPromises();
    expect(wrapper.find('select').element.disabled).toBe(false);
  });

  it('preserves status transition payload and filters non-surgical timeline events', async () => {
    mockSurgeryList.mockResolvedValue([surgery('enc-1')]);
    mockTimeline.mockResolvedValue([
      { eventType: 'surgery_requested', summary: 'Evento cirúrgico' },
      { eventType: 'diagnostic_requested', summary: 'Evento diagnóstico' }
    ]);
    const pending = deferred<unknown>();
    mockSurgeryUpdateStatus.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Evento cirúrgico');
    expect(wrapper.text()).not.toContain('Evento diagnóstico');
    await action(wrapper, 'Avançar para Pré-operatório').trigger('click');
    expect(mockSurgeryUpdateStatus).toHaveBeenCalledWith('case-enc-1', 'pre_op');
    expect(wrapper.find('select').element.disabled).toBe(true);
    expect(wrapper.find('fieldset').element.disabled).toBe(true);
    pending.resolve({});
    await flushPromises();
    expect(mockSurgeryList).toHaveBeenCalledTimes(2);
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

  it('rejects a stale row action and ignores a late status response after a programmatic context change', async () => {
    mockEncounterList.mockResolvedValue(encounters);
    mockSurgeryList.mockImplementation((id: string) => Promise.resolve([surgery(id)]));
    const pending = deferred<unknown>();
    mockSurgeryUpdateStatus.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    await flushPromises();
    await action(wrapper, 'Avançar para Pré-operatório').trigger('click');
    // Programmatic changes remain possible even when the native selector is disabled.
    const vm = wrapper.vm as unknown as { selectedEncounterId: string; advanceCase: (row: ReturnType<typeof surgery>) => Promise<void> };
    vm.selectedEncounterId = 'enc-2';
    await flushPromises();
    const readsBeforeCompletion = mockSurgeryList.mock.calls.length;
    pending.reject(new Error('Falha exclusiva A'));
    await flushPromises();
    expect(mockSurgeryList).toHaveBeenCalledTimes(readsBeforeCompletion);
    expect(wrapper.text()).toContain('Procedimento enc-2');
    expect(wrapper.text()).not.toContain('Falha exclusiva A');
    await vm.advanceCase(surgery('enc-1'));
    expect(mockSurgeryUpdateStatus).toHaveBeenCalledTimes(1);
    expect(mockSurgeryCreate).not.toHaveBeenCalled();
  });

});
