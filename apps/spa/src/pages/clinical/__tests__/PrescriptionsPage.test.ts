import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const encounterPair = [
  { id: 'enc-A', patientId: 'pat-A', reason: 'Paciente A' },
  { id: 'enc-B', patientId: 'pat-B', reason: 'Paciente B' }
];
function prescription(id: string) {
  return { id: `entry-${id}`, encounterId: id, title: `Medicamento ${id}`, content: `Notas ${id}`, createdAt: '2026-04-10T00:00:00Z' };
}
async function mountPage() {
  const Page = (await import('../PrescriptionsPage.vue')).default;
  return mount(Page);
}

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
  it('refreshes prescriptions when the encounter selector changes instead of copying the prior context', async () => {
    mockEncounterList.mockResolvedValue([
      { id: 'enc-A', patientId: 'pat-A', reason: 'Paciente A' },
      { id: 'enc-B', patientId: 'pat-B', reason: 'Paciente B' }
    ]);
    mockPrescriptionList.mockImplementation(async (id: string) => [{
      id: `entry-${id}`, encounterId: id, title: `Medicamento ${id}`, content: `Notas ${id}`, createdAt: '2026-04-10T00:00:00Z'
    }]);
    const Page = (await import('../PrescriptionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.get('select').setValue('enc-B');
    await flushPromises();
    expect(mockPrescriptionList).toHaveBeenLastCalledWith('enc-B');
    expect(wrapper.text()).not.toContain('Medicamento enc-A');
    expect(wrapper.text()).toContain('Medicamento enc-B');
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('resets every draft field and isolates both datasets while B loads, then ignores late B responses after returning to A', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    mockPrescriptionList.mockResolvedValue([prescription('enc-A')]);
    const wrapper = await mountPage();
    await flushPromises();
    for (const input of wrapper.findAll('form input')) await input.setValue('Rascunho A');
    await wrapper.get('textarea').setValue('Observações A');
    const pendingB = deferred<unknown[]>();
    const executionsB = deferred<unknown[]>();
    mockPrescriptionList.mockImplementation((id: string) => id === 'enc-B' ? pendingB.promise : Promise.resolve([prescription('enc-A')]));
    mockExecutionList.mockImplementation(({ encounterId }: { encounterId: string }) => encounterId === 'enc-B' ? executionsB.promise : Promise.resolve([]));
    await wrapper.get('select').setValue('enc-B');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Medicamento enc-A');
    expect(wrapper.findAll('.overview-metric dd').slice(1).map((x) => x.text())).toEqual(['—', '—']);
    await wrapper.get('select').setValue('enc-A');
    await flushPromises();
    expect(wrapper.findAll('form input').every((x) => (x.element as HTMLInputElement).value === '')).toBe(true);
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('');
    pendingB.resolve([prescription('enc-B')]);
    executionsB.resolve([{ id: 'exec-B', medicationName: 'Execução B' }]);
    await flushPromises();
    expect(wrapper.text()).toContain('Medicamento enc-A');
    expect(wrapper.text()).not.toContain('Medicamento enc-B');
    expect(wrapper.text()).not.toContain('Execução B');
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('ignores a late failure from an abandoned encounter', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    const pendingB = deferred<unknown[]>();
    mockPrescriptionList.mockImplementation((id: string) => id === 'enc-B' ? pendingB.promise : Promise.resolve([prescription('enc-A')]));
    await wrapper.get('select').setValue('enc-B');
    await wrapper.get('select').setValue('enc-A');
    await flushPromises();
    pendingB.reject(new Error('Falha antiga B'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Falha antiga B');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.text()).toContain('Medicamento enc-A');
  });

  it('keeps a secondary read failure distinct from empty and retries after dismissing the alert', async () => {
    mockExecutionList.mockRejectedValueOnce(new Error('Execuções offline'));
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Nenhuma execução vinculada');
    expect(wrapper.text()).not.toContain('Nenhuma prescrição encontrada');
    wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Execuções offline');
    expect(wrapper.text()).toContain('Não foi possível carregar as prescrições e execuções');
    await wrapper.get('.context-state button').trigger('click');
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.text()).toContain('Nenhuma prescrição encontrada');
    expect(wrapper.text()).toContain('Nenhuma execução vinculada');
    expect(wrapper.findAll('.overview-metric dd').map((x) => x.text())).toEqual(['1', '0', '0']);
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('shows pending/failed/empty encounter states without a mutation form or misleading context counts', async () => {
    const pending = deferred<unknown[]>();
    mockEncounterList.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.get('option[value=""]').text()).toContain('Carregando');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.findAll('.overview-metric dd').map((x) => x.text())).toEqual(['—', '—', '—']);
    pending.reject(new Error('Atendimentos offline'));
    await flushPromises();
    wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).toContain('Não foi possível carregar os atendimentos');
    mockEncounterList.mockResolvedValueOnce([]);
    await wrapper.get('.context-state button').trigger('click');
    await flushPromises();
    expect(wrapper.get('option[value=""]').text()).toContain('Nenhum atendimento');
    expect(wrapper.find('a[href="/encounters"]').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.findAll('.overview-metric dd').map((x) => x.text())).toEqual(['0', '—', '—']);
    expect(mockPrescriptionList).not.toHaveBeenCalled();
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('clears an explicit blank selection and revalidates an encounter removed by refresh', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    mockPrescriptionList.mockResolvedValue([prescription('enc-A')]);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.get('select').setValue('');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Medicamento enc-A');
    await wrapper.get('select').setValue('enc-A');
    await flushPromises();
    mockEncounterList.mockResolvedValueOnce([encounterPair[1]]);
    mockPrescriptionList.mockResolvedValueOnce([prescription('enc-B')]);
    await wrapper.findAll('button').find((x) => x.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('enc-B');
    expect(mockPrescriptionList).toHaveBeenLastCalledWith('enc-B');
    expect(wrapper.text()).not.toContain('Medicamento enc-A');
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

  it('submits only the new encounter and preserves the composed clinical payload', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.get('select').setValue('enc-B');
    await flushPromises();
    const inputs = wrapper.findAll('form input');
    for (const [index, value] of [' Medicamento B ', ' 2 ml ', ' Oral ', ' 12/12h '].entries()) await inputs[index].setValue(value);
    await wrapper.get('textarea').setValue(' Observação B ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mockPrescriptionCreate).toHaveBeenCalledTimes(1);
    expect(mockPrescriptionCreate).toHaveBeenCalledWith({ encounterId: 'enc-B', patientId: 'pat-B', title: 'Medicamento B', content: 'Posologia: 2 ml\nVia: Oral\nFrequência: 12/12h\nObservações: Observação B' });
  });

  it('copies a prescription to a clean draft without retaining another dose or writing data', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    mockPrescriptionList.mockResolvedValue([prescription('enc-A')]);
    const wrapper = await mountPage(); await flushPromises();
    const inputs = wrapper.findAll('form input');
    for (const [index, value] of ['Outro medicamento', 'Dose anterior', 'Via anterior', 'Frequência anterior'].entries()) await inputs[index].setValue(value);
    await wrapper.get('textarea').setValue('Notas anteriores');
    await wrapper.findAll('button').find(b => b.text() === 'Copiar para rascunho')!.trigger('click');
    expect((inputs[0].element as HTMLInputElement).value).toBe('Medicamento enc-A');
    for (const input of inputs.slice(1)) expect((input.element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(prescription('enc-A').content);
    expect(mockPrescriptionCreate).not.toHaveBeenCalled();
  });

});
