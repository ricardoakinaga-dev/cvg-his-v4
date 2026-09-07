import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

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
    vi.resetAllMocks();
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

    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
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
  it('clears previous detail and draft immediately when the encounter changes', async () => {
    const first = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([first, { ...first, id: 'enc-2', patientId: 'pat-2' }]);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Amoxicilina');
    mockPrescriptionList.mockImplementation(() => new Promise(() => {}));
    await wrapper.findAll('select')[0].setValue('enc-2');
    expect(wrapper.text()).not.toContain('Amoxicilina');
    expect(wrapper.find('form').exists()).toBe(false);
    wrapper.unmount();
  });

  it('wires the visible create action to native form submission', async () => {
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    const create = wrapper.findAll('button').find(button => button.text() === 'Criar execução')!;
    expect(create.attributes('type')).toBe('submit');
    document.body.appendChild(wrapper.element);
    await wrapper.findAll('input')[1].setValue('1 cap 12/12h');
    await wrapper.find('input[type="datetime-local"]').setValue('2026-04-10T12:00');
    await create.trigger('click');
    await flushPromises();
    expect(mockExecutionCreate).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('keeps the latest detail when requests finish out of order', async () => {
    const first = (await mockExecutionList())[0];
    const second = { ...first, id: 'exec-2', medicationName: 'Dipirona' };
    mockExecutionList.mockResolvedValue([first, second]);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    let resolveFirst!: (value: unknown) => void;
    mockExecutionGet.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    mockExecutionGet.mockResolvedValueOnce({ ...second, events: [] });
    const buttons = wrapper.findAll('button').filter(button => button.text() === 'Detalhes');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await flushPromises();
    resolveFirst({ ...first, events: [] });
    await flushPromises();
    expect(wrapper.findAll('.summary-list').at(-1)!.text()).toContain('Dipirona');
    wrapper.unmount();
  });

  it.each(['administered', 'not-administered', 'cancelled', 'suspended'])('does not offer administer or suspend for %s', async (status) => {
    const first = (await mockExecutionList())[0];
    mockExecutionList.mockResolvedValue([{ ...first, status }]);
    mockExecutionGet.mockResolvedValue({ ...first, status, events: [] });
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const actions = wrapper.findAll('button').map(button => button.text());
    expect(actions).not.toContain('Administrar');
    expect(actions).not.toContain('Suspender');
    expect(actions.includes('Retomar')).toBe(status === 'suspended');
    wrapper.unmount();
  });

  it('keeps the second encounter when an earlier list finishes late', async () => {
    const encounter = (await mockEncounterList())[0];
    const entry = (await mockPrescriptionList())[0];
    const execution = (await mockExecutionList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let resolveOld!: (value: unknown) => void;
    mockPrescriptionList.mockImplementation(id => id === 'enc-1' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve([{ ...entry, id: 'entry-2', encounterId: 'enc-2', patientId: 'pat-2', title: 'Dipirona' }]));
    mockExecutionList.mockImplementation(({ encounterId }) => Promise.resolve(encounterId === 'enc-1' ? [execution] : []));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    resolveOld([entry]);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).not.toContain('Amoxicilina');
    expect(wrapper.find('input').element.value).toBe('Dipirona');
    wrapper.unmount();
  });

  it('shows dropdown load failures and retries without stale records', async () => {
    const encounter = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockPrescriptionList.mockRejectedValueOnce(new Error('Falha de conexão'));
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    expect(wrapper.text()).toContain('Falha de conexão');
    expect(wrapper.text()).not.toContain('Amoxicilina');
    mockPrescriptionList.mockResolvedValue([]);
    mockExecutionList.mockResolvedValue([]);
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Falha de conexão');
    expect(mockPrescriptionList).toHaveBeenLastCalledWith('enc-2');
    wrapper.unmount();
  });

  it('shows detail failure with a working retry', async () => {
    mockExecutionGet.mockRejectedValueOnce(new Error('Detalhe indisponível'));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Detalhe indisponível');
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Detalhe indisponível');
    expect(wrapper.find('.summary-list').text()).toContain('Amoxicilina');
    wrapper.unmount();
  });

  it('locks duplicate administration and ignores completion after encounter switch', async () => {
    const encounter = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionExecute.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const action = wrapper.findAll('button').find(button => button.text() === 'Administrar')!;
    await action.trigger('click');
    await action.trigger('click');
    expect(mockExecutionExecute).toHaveBeenCalledTimes(1);
    expect(mockExecutionExecute).toHaveBeenCalledWith('exec-1', { status: 'administered', notes: 'Administrado pela SPA' });
    mockPrescriptionList.mockResolvedValue([]);
    mockExecutionList.mockResolvedValue([]);
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    const reads = mockExecutionList.mock.calls.length;
    finish({});
    await flushPromises();
    expect(wrapper.text()).not.toContain('Execução administrada.');
    expect(mockExecutionList).toHaveBeenCalledTimes(reads);
    wrapper.unmount();
  });

  it('rejects prescriptions from a different patient even if returned by the context endpoint', async () => {
    const entry = (await mockPrescriptionList())[0];
    mockPrescriptionList.mockResolvedValue([{ ...entry, patientId: 'pat-2' }]);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const open = wrapper.findAll('button').find(button => button.text() === 'Nova execução')!;
    expect(open.attributes('disabled')).toBeDefined();
    expect(mockExecutionCreate).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('does not continue pending mutation work after unmount', async () => {
    let finish!: (value: unknown) => void;
    mockExecutionSuspend.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Suspender')!.trigger('click');
    expect(mockExecutionSuspend).toHaveBeenCalledWith('exec-1', { reason: 'Suspensão operacional via SPA' });
    const reads = mockExecutionList.mock.calls.length;
    wrapper.unmount();
    finish({});
    await flushPromises();
    expect(mockExecutionList).toHaveBeenCalledTimes(reads);
  });

  it('prefills structured prescription fields and preserves resume and logging contracts', async () => {
    const entry = (await mockPrescriptionList())[0];
    const execution = (await mockExecutionList())[0];
    mockPrescriptionList.mockResolvedValue([{ ...entry, medicationName: 'Amoxicilina 250 mg', dosage: '1 cápsula', route: 'oral', frequency: '12/12h' }]);
    mockExecutionList.mockResolvedValue([{ ...execution, status: 'suspended' }]);
    mockExecutionGet.mockResolvedValue({ ...execution, status: 'suspended', events: [] });
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    expect(wrapper.findAll('input').map(input => input.element.value).slice(0, 4)).toEqual(['Amoxicilina 250 mg', '1 cápsula', 'oral', '12/12h']);
    await wrapper.findAll('button').find(button => button.text() === 'Retomar')!.trigger('click');
    await flushPromises();
    expect(mockExecutionResume).toHaveBeenCalledWith('exec-1');
    await wrapper.findAll('button').find(button => button.text() === 'Registrar evento')!.trigger('click');
    await flushPromises();
    expect(mockExecutionLog).toHaveBeenCalledWith('exec-1', { eventType: 'spa_manual_log', notes: 'Evento administrativo registrado pela SPA' });
    wrapper.unmount();
  });

  it.each(['resolve', 'reject'])('ignores stale create %s and protects the new draft', async (outcome) => {
    const encounter = (await mockEncounterList())[0];
    const entry = (await mockPrescriptionList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionCreate.mockImplementation(() => new Promise((resolve, reject) => { finish = outcome === 'resolve' ? resolve : reject; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    await wrapper.findAll('input')[1].setValue('1 cap 12/12h');
    await wrapper.find('input[type="datetime-local"]').setValue('2026-04-10T12:00');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    expect(mockExecutionCreate).toHaveBeenCalledTimes(1);
    mockPrescriptionList.mockResolvedValue([{ ...entry, id: 'entry-2', encounterId: 'enc-2', patientId: 'pat-2', title: 'Dipirona' }]);
    mockExecutionList.mockResolvedValue([]);
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    await wrapper.findAll('input')[1].setValue('Nova posologia');
    const reads = mockExecutionList.mock.calls.length;
    finish(outcome === 'resolve' ? {} : new Error('Erro do atendimento anterior'));
    await flushPromises();
    expect(wrapper.findAll('input')[1].element.value).toBe('Nova posologia');
    expect(wrapper.text()).not.toContain('Execução criada com sucesso');
    expect(wrapper.text()).not.toContain('Erro do atendimento anterior');
    expect(mockExecutionList).toHaveBeenCalledTimes(reads);
    wrapper.unmount();
  });

  it('reloads authoritative context when query parameters change without remounting', async () => {
    const encounter = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2', ownerId: 'own-2' }]);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/prescription-executions', component: Page }] });
    await router.push('/prescription-executions?encounterId=enc-1');
    await router.isReady();
    const wrapper = mount(Page, { global: { plugins: [router] } });
    await flushPromises();
    mockPrescriptionList.mockResolvedValue([]);
    mockExecutionList.mockResolvedValue([]);
    await router.push('/prescription-executions?encounterId=enc-2&patientId=pat-2');
    await flushPromises();
    expect(mockPrescriptionList).toHaveBeenLastCalledWith('enc-2');
    expect(wrapper.text()).toContain('pat-2');
    expect(wrapper.text()).not.toContain('Amoxicilina');
    expect(wrapper.findComponent({ name: 'AppPageHeader' }).props('primaryAction').to).toBe('/medical-records/enc-2');
    wrapper.unmount();
  });

  it('ignores an old detail response after switching encounters', async () => {
    const encounter = (await mockEncounterList())[0];
    const execution = (await mockExecutionGet());
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionGet.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockPrescriptionList.mockResolvedValue([]);
    mockExecutionList.mockResolvedValue([]);
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    finish(execution);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Amoxicilina');
    expect(wrapper.find('.summary-list').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the mutation lock when returning to an encounter with an action still pending', async () => {
    const encounter = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionExecute.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Administrar')!.trigger('click');
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    await wrapper.find('select').setValue('enc-1');
    await flushPromises();
    const action = wrapper.findAll('button').find(button => button.text() === 'Administrar')!;
    expect(action.attributes('disabled')).toBeDefined();
    await action.trigger('click');
    expect(mockExecutionExecute).toHaveBeenCalledTimes(1);
    const refreshed = { ...(await mockExecutionGet()), status: 'administered' };
    mockExecutionList.mockResolvedValue([refreshed]);
    mockExecutionGet.mockResolvedValue(refreshed);
    finish({});
    await flushPromises();
    expect(wrapper.text()).not.toContain('Execução administrada.');
    expect(wrapper.findAll('button').some(button => button.text() === 'Administrar')).toBe(false);
    expect(wrapper.find('.summary-list').text()).toContain('Administrada');

    wrapper.unmount();
  });

  it.each([
    'encounterId=missing',
    'encounterId=missing&patientId=pat-1',
    'patientId=missing',
    'encounterId=enc-1&patientId=other-patient'
  ])('does not substitute an encounter for unavailable explicit context %s', async (query) => {
    window.history.pushState({}, '', `/prescription-executions?${query}`);
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento solicitado indisponível');
    expect(wrapper.find('select').element.value).toBe('');
    expect(wrapper.find('.context-identity').exists()).toBe(false);
    expect(wrapper.find('.summary-list').exists()).toBe(false);
    expect(mockPrescriptionList).not.toHaveBeenCalled();
    expect(mockExecutionList).not.toHaveBeenCalled();
    expect(wrapper.findAll('button').some(button => button.text() === 'Administrar')).toBe(false);
    wrapper.unmount();
  });

  it('requires deliberate selection when the current encounter disappears on refresh', async () => {
    const encounter = (await mockEncounterList())[0];
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const reads = mockExecutionList.mock.calls.length;
    mockEncounterList.mockResolvedValue([{ ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento solicitado indisponível');
    expect(wrapper.find('.summary-list').exists()).toBe(false);
    expect(mockExecutionList).toHaveBeenCalledTimes(reads);
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Atendimento solicitado indisponível');
    expect(mockExecutionList).toHaveBeenLastCalledWith({ encounterId: 'enc-2' });
    wrapper.unmount();
  });

  it('reconciles a creation completed after leaving and returning to its encounter', async () => {
    const encounter = (await mockEncounterList())[0];
    const original = await mockExecutionGet();
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionCreate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    await wrapper.findAll('input')[1].setValue('1 cap 12/12h');
    await wrapper.find('input[type="datetime-local"]').setValue('2026-04-10T12:00');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    await wrapper.find('select').setValue('enc-1');
    await flushPromises();
    expect(wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.attributes('disabled')).toBeDefined();
    mockExecutionList.mockResolvedValue([original, { ...original, id: 'new-execution', medicationName: 'Nova execução registrada' }]);
    finish({});
    await flushPromises();
    expect(wrapper.text()).toContain('Nova execução registrada');
    expect(wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.attributes('disabled')).toBeUndefined();
    expect(mockExecutionCreate).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('keeps actions locked until returned-context reconciliation settles and exposes its failure', async () => {
    const encounter = (await mockEncounterList())[0];
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finish!: (value: unknown) => void;
    mockExecutionExecute.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Administrar')!.trigger('click');
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    await wrapper.find('select').setValue('enc-1');
    await flushPromises();
    let failRead!: (error: Error) => void;
    mockExecutionList.mockImplementationOnce(() => new Promise((resolve, reject) => { failRead = reject; }));
    finish({});
    await flushPromises();
    expect(wrapper.text()).toContain('Carregando prescrições e execuções');
    expect(wrapper.findAll('button').some(button => button.text() === 'Administrar')).toBe(false);
    expect(wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.attributes('disabled')).toBeDefined();
    failRead(new Error('Falha ao reconciliar atendimento'));
    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao reconciliar atendimento');
    expect(wrapper.findAll('button').some(button => button.text() === 'Administrar')).toBe(false);
    expect(mockExecutionExecute).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('holds the returned-context action lock until refreshed detail has settled', async () => {
    const encounter = (await mockEncounterList())[0];
    const original = await mockExecutionGet();
    mockEncounterList.mockResolvedValue([encounter, { ...encounter, id: 'enc-2', patientId: 'pat-2' }]);
    let finishWrite!: (value: unknown) => void;
    mockExecutionExecute.mockImplementation(() => new Promise(resolve => { finishWrite = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Administrar')!.trigger('click');
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    await wrapper.find('select').setValue('enc-1');
    await flushPromises();
    mockExecutionList.mockResolvedValue([{ ...original, status: 'administered' }, { ...original, id: 'pending-other', status: 'pending' }]);
    let finishDetail!: (value: unknown) => void;
    mockExecutionGet.mockImplementationOnce(() => new Promise(resolve => { finishDetail = resolve; }));
    finishWrite({});
    await flushPromises();
    expect(wrapper.text()).toContain('Carregando detalhe');
    expect(wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('button').some(button => button.text() === 'Administrar' && button.attributes('disabled') === undefined)).toBe(false);
    finishDetail({ ...original, status: 'administered' });
    await flushPromises();
    expect(wrapper.find('.summary-list').text()).toContain('Administrada');
    expect(wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('locks every execution mutation while the encounter list is refreshing', async () => {
    const original = await mockExecutionGet();
    mockExecutionList.mockResolvedValue([{ ...original, status: 'suspended' }, { ...original, id: 'execution-pending', status: 'pending' }]);
    mockExecutionGet.mockResolvedValue({ ...original, status: 'suspended' });
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const encounters = await mockEncounterList();
    let finish!: (value: unknown) => void;
    mockEncounterList.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    const mutations = wrapper.findAll('button').filter(button => ['Administrar', 'Suspender', 'Retomar', 'Registrar evento'].includes(button.text()));
    expect(mutations).toHaveLength(4);
    for (const button of mutations) {
      expect(button.attributes('disabled')).toBeDefined();
      await button.trigger('click');
    }
    expect(mockExecutionExecute).not.toHaveBeenCalled();
    expect(mockExecutionSuspend).not.toHaveBeenCalled();
    expect(mockExecutionResume).not.toHaveBeenCalled();
    expect(mockExecutionLog).not.toHaveBeenCalled();
    finish(encounters);
    await flushPromises();
    expect(wrapper.findAll('button').find(button => button.text() === 'Retomar')!.attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('disables every draft field and create control while creation is pending', async () => {
    let finish!: (value: unknown) => void;
    mockExecutionCreate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    await wrapper.findAll('input')[1].setValue('1 cap 12/12h');
    await wrapper.find('input[type="datetime-local"]').setValue('2026-04-10T12:00');
    await wrapper.find('form').trigger('submit');
    for (const field of wrapper.findAll('form input, form select, form textarea, form button')) {
      expect(field.attributes('disabled')).toBeDefined();
    }
    expect(wrapper.findAll('button').find(button => button.text() === 'Fechar formulário')!.attributes('disabled')).toBeDefined();
    expect(wrapper.find('select').attributes('disabled')).toBeUndefined();
    finish({});
    await flushPromises();
    wrapper.unmount();
  });

  it('disables the visible draft during refresh and after same-context refresh failure', async () => {
    const Page = (await import('../PrescriptionExecutionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    let fail!: (error: Error) => void;
    mockEncounterList.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; }));
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    for (const field of wrapper.findAll('form input, form select, form textarea, form button')) {
      expect(field.attributes('disabled')).toBeDefined();
    }
    await wrapper.find('form').trigger('submit');
    expect(mockExecutionCreate).not.toHaveBeenCalled();
    fail(new Error('Falha ao atualizar atendimentos'));
    await flushPromises();
    // Reopen after recovery, then exercise the context-read failure with the disclosure still open.
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Nova execução')!.trigger('click');
    mockPrescriptionList.mockRejectedValueOnce(new Error('Falha ao atualizar prescrições'));
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao atualizar prescrições');
    expect(wrapper.find('form').exists()).toBe(true);
    for (const field of wrapper.findAll('form input, form select, form textarea, form button')) {
      expect(field.attributes('disabled')).toBeDefined();
    }
    expect(wrapper.findAll('button').find(button => button.text() === 'Fechar formulário')!.attributes('disabled')).toBeDefined();
    expect(wrapper.find('select').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

});
