import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockDischargeList = vi.fn();
const mockDischargeCreate = vi.fn();
const mockDischargeUpdate = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/discharges', () => ({
  dischargeService: {
    list: (...args: unknown[]) => mockDischargeList(...args),
    create: (...args: unknown[]) => mockDischargeCreate(...args),
    update: (...args: unknown[]) => mockDischargeUpdate(...args)
  }
}));

describe('DischargesPage', () => {
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
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockDischargeList.mockResolvedValue([]);
    mockDischargeCreate.mockResolvedValue({
      id: 'dis-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      dischargeType: 'ambulatory',
      dischargedBy: 'user-1',
      dischargedAt: '2026-04-10T00:00:00Z',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockDischargeUpdate.mockResolvedValue({
      id: 'dis-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      dischargeType: 'ambulatory',
      dischargedBy: 'user-1',
      dischargedAt: '2026-04-10T00:00:00Z',
      version: 2,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T01:00:00Z'
    });
  });

  it('creates a discharge for the selected encounter', async () => {
    const DischargesPage = (await import('../DischargesPage.vue')).default;
    const wrapper = mount(DischargesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Retorno clínico');

    await wrapper.find('input').setValue('Alta médica');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Paciente estável');
    await textareas[1].setValue('Retorno em 7 dias');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockDischargeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        outcome: 'Alta médica'
      })
    );
    expect(wrapper.text()).toContain('Alta registrada com sucesso');
  });
  it('clears the previous discharge fields when selecting another encounter', async () => {
    mockEncounterList.mockResolvedValue([
      { id: 'enc-1', patientId: 'pat-1', reason: 'Primeiro atendimento' },
      { id: 'enc-2', patientId: 'pat-2', reason: 'Segundo atendimento' }
    ]);
    mockDischargeList.mockResolvedValue([{ id: 'dis-1', encounterId: 'enc-1', dischargeType: 'inpatient', outcome: 'Desfecho anterior', clinicalSummary: 'Resumo anterior', continuityInstructions: 'Instruções anteriores', followUpDate: '2026-09-10', followUpNotes: 'Retorno anterior' }]);
    const wrapper = mount((await import('../DischargesPage.vue')).default);
    await flushPromises();
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('Resumo anterior');
    await wrapper.find('select').setValue('enc-2');
    await flushPromises();
    expect(wrapper.findAll('textarea').every(input => (input.element as HTMLTextAreaElement).value === '')).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
    expect(mockDischargeCreate).not.toHaveBeenCalled();
    expect(mockDischargeUpdate).not.toHaveBeenCalled();
  });

  it('keeps failed loading distinct from empty after dismiss and supports retry', async () => {
    mockEncounterList.mockRejectedValueOnce(new Error('Falha de conexão'));
    const wrapper = mount((await import('../DischargesPage.vue')).default, { global: { stubs: { DsAlert: false } } });
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    await wrapper.get('[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Não foi possível carregar os atendimentos e as altas.');
    mockEncounterList.mockResolvedValue([]);
    await wrapper.findAll('button').find(b => b.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum atendimento disponível');
    expect(wrapper.text()).toContain('Ver atendimentos');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(mockDischargeCreate).not.toHaveBeenCalled();
  });

  it('revalidates selection and clears a removed encounter on refresh', async () => {
    const wrapper = mount((await import('../DischargesPage.vue')).default);
    await flushPromises();
    await wrapper.find('input').setValue('Texto do primeiro paciente');
    mockEncounterList.mockResolvedValue([]);
    await wrapper.findAll('button').find(b => b.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(mockDischargeCreate).not.toHaveBeenCalled();
  });

  it('shows unknown counts and no editable form during the initial read', async () => {
    let resolve!: (value: unknown[]) => void;
    mockEncounterList.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const wrapper = mount((await import('../DischargesPage.vue')).default);
    expect(wrapper.text()).toContain('Carregando atendimentos');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.findAll('.overview-metric__value').every(m => m.text() === '—')).toBe(true);
    resolve([]); await flushPromises();
    expect(wrapper.text()).toContain('Nenhum atendimento disponível');
  });

  it('updates the selected existing discharge instead of creating another', async () => {
    mockDischargeList.mockResolvedValue([{ id: 'dis-1', encounterId: 'enc-1', dischargeType: 'inpatient', outcome: 'Em recuperação', clinicalSummary: 'Resumo existente' }]);
    const wrapper = mount((await import('../DischargesPage.vue')).default);
    await flushPromises();
    await wrapper.find('input').setValue('Estável para alta');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockDischargeUpdate).toHaveBeenCalledWith('dis-1', expect.objectContaining({ encounterId: 'enc-1', dischargeType: 'inpatient', outcome: 'Estável para alta', clinicalSummary: 'Resumo existente' }));
    expect(mockDischargeCreate).not.toHaveBeenCalled();
  });

  it('labels and restores saved discharge data without submitting', async () => {
    mockDischargeList.mockResolvedValue([{ id: 'dis-1', encounterId: 'enc-1', dischargeType: 'inpatient', outcome: 'Desfecho salvo', clinicalSummary: 'Resumo salvo' }]);
    const wrapper = mount((await import('../DischargesPage.vue')).default); await flushPromises();
    await wrapper.find('input').setValue('Alteração não salva');
    await wrapper.findAll('button').find(b => b.text() === 'Restaurar dados salvos')!.trigger('click');
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Desfecho salvo');
    expect(mockDischargeUpdate).not.toHaveBeenCalled();
    expect(mockDischargeCreate).not.toHaveBeenCalled();
  });

});
