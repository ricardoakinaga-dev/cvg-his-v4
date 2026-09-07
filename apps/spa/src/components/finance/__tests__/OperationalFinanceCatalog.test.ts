import { flushPromises, mount } from '@vue/test-utils';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}));

vi.mock('@/services/financeOperationalCatalog', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/financeOperationalCatalog')>();
  return {
    ...original,
    financeOperationalCatalogService: mocks
  };
});

const bank = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: 'acc-1',
  type: 'banks' as const,
  code: 'BANK_001',
  name: 'Banco Operacional',
  status: 'active' as const,
  configuration: {
    bankCode: '001',
    agency: '0001',
    accountNumber: '12345-6',
    accountType: 'checking' as const,
    usageKey: 'settlement' as const,
    usageDescription: 'Liquidação operacional',
    reconciliationMode: 'manual' as const
  },
  version: 3,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-02T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z'
};

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(label));
  if (!button) throw new Error(`Button ${label} not found`);
  return button;
}

describe('OperationalFinanceCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      items: [bank],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    });
    mocks.update.mockResolvedValue({ ...bank, name: 'Banco Principal', version: 4 });
    mocks.remove.mockResolvedValue({ ok: true });
  });

  it('loads persisted records and exposes versioned edit and audited delete commands', async () => {
    const OperationalFinanceCatalog = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(OperationalFinanceCatalog, { props: { type: 'banks' } });
    await flushPromises();

    expect(mocks.list).toHaveBeenCalledWith('banks', {
      page: 1,
      pageSize: 25
    });
    expect(wrapper.text()).toContain('Banco Operacional');
    expect(wrapper.text()).toContain('v3');
    expect(findButton(wrapper, 'Novo Banco').attributes('disabled')).toBeUndefined();

    await findButton(wrapper, 'Editar').trigger('click');
    await wrapper.find('#banks-form-name').setValue('Banco Principal');
    await findButton(wrapper, 'Salvar alterações').trigger('click');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(
      'banks',
      bank.id,
      3,
      expect.objectContaining({
        code: 'BANK_001',
        name: 'Banco Principal',
        configuration: expect.objectContaining({
          bankCode: '001',
          reconciliationMode: 'manual'
        })
      })
    );

    await findButton(wrapper, 'Excluir').trigger('click');
    expect(wrapper.text()).toContain('Confirma a exclusão');
    await findButton(wrapper, 'Excluir definitivamente').trigger('click');
    await flushPromises();
    expect(mocks.remove).toHaveBeenCalledWith('banks', bank.id);
  });
  it('shows unknown values while loading, then a real empty result', async () => {
    let resolve!: (value: unknown) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } });
    expect(wrapper.findComponent(DataTable).props('loading')).toBe(true);
    expect(wrapper.findAll('.catalog-summary dd').map(e => e.text())).toEqual(['—', '—', '—', '—']);
    expect(wrapper.text()).not.toContain('Nenhum registro');
    resolve({ items: [], page: 1, totalItems: 0, totalPages: 1 }); await flushPromises();
    expect(wrapper.text()).toContain('Nenhum registro nesta consulta');
    expect(wrapper.findAll('.catalog-summary dd').map(e => e.text())).toEqual(['0', '0', '0', '1 de 1']);
  });

  it('keeps failed query context and recovery after dismissing its alert', async () => {
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } }); await flushPromises();
    await wrapper.find('#banks-search').setValue('Rex');
    mocks.list.mockRejectedValueOnce(new Error('Unexpected error'));
    await wrapper.find('.catalog-filters').trigger('submit'); await flushPromises();
    expect(wrapper.text()).not.toContain('Unexpected error');
    wrapper.findComponent(DsAlert).vm.$emit('dismiss'); await flushPromises();
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.text()).not.toContain('Nenhum registro');
    expect(wrapper.findAll('.catalog-summary dd').every(e => e.text() === '—')).toBe(true);
    await wrapper.find('#banks-search').setValue('Outro filtro não aplicado');
    await findButton(wrapper, 'Tentar novamente').trigger('click'); await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith('banks', { search: 'Rex', page: 1, pageSize: 25 });
    expect(wrapper.text()).toContain('Banco Operacional');
  });

  it('paginates the applied query rather than unsent filter edits', async () => {
    mocks.list.mockResolvedValue({ items: [bank], page: 1, totalItems: 30, totalPages: 2 });
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } }); await flushPromises();
    await wrapper.find('#banks-search').setValue('Ainda não pesquisado');
    await findButton(wrapper, 'Próxima').trigger('click'); await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith('banks', { page: 2, pageSize: 25 });
  });

  it.each(['success', 'failure'])('ignores old catalog %s after switching type', async outcome => {
    let resolve!: (value: unknown) => void; let reject!: (value: Error) => void;
    mocks.list.mockImplementationOnce(() => new Promise((yes, no) => { resolve = yes; reject = no; }));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } });
    mocks.list.mockResolvedValueOnce({ items: [], page: 1, totalItems: 0, totalPages: 1 });
    await wrapper.setProps({ type: 'card-machines' }); await flushPromises();
    if (outcome === 'success') resolve({ items: [bank], page: 1, totalItems: 1, totalPages: 1 }); else reject(new Error('Old failure'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Banco Operacional');
    expect(wrapper.text()).not.toContain('Old failure');
    expect(wrapper.text()).toContain('Nova Maquininha');
    expect(wrapper.text()).toContain('Nenhum registro nesta consulta');
  });

  it('keeps newer failure when an older success arrives last', async () => {
    let resolve!: (value: unknown) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } });
    mocks.list.mockRejectedValueOnce(new Error('Failed latest request'));
    await wrapper.find('.catalog-filters').trigger('submit'); await flushPromises();
    resolve({ items: [bank], page: 1, totalItems: 1, totalPages: 1 }); await flushPromises();
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.text()).not.toContain('Banco Operacional');
  });

  it('preserves new-record preparation when list loading fails without claiming emptiness', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Read endpoint failed'));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } }); await flushPromises();
    await findButton(wrapper, 'Novo Banco').trigger('click');
    expect(wrapper.find('#banks-form-code').exists()).toBe(true);
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.text()).not.toContain('Nenhum registro');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('disables refresh and new-record controls while preserving a pending versioned update', async () => {
    let resolve!: (value: unknown) => void;
    mocks.update.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } }); await flushPromises();
    await findButton(wrapper, 'Editar').trigger('click');
    await wrapper.find('#banks-form-name').setValue('Banco Principal');
    await wrapper.find('.catalog-form').trigger('submit');
    expect(findButton(wrapper, 'Atualizar').attributes('disabled')).toBeDefined();
    expect(findButton(wrapper, 'Novo Banco').attributes('disabled')).toBeDefined();
    expect(mocks.update).toHaveBeenCalledWith('banks', bank.id, 3, expect.objectContaining({ name: 'Banco Principal' }));
    resolve({ ...bank, name: 'Banco Principal', version: 4 }); await flushPromises();
    expect(findButton(wrapper, 'Atualizar').attributes('disabled')).toBeUndefined();
  });

  it.each(['', '0', '101', '0.015'])('rejects invalid split percentage %s through the footer save action', async percentage => {
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'split-rules' } }); await flushPromises();
    await findButton(wrapper, 'Nova Regra').trigger('click');
    await wrapper.find('#split-rules-form-code').setValue('RULE');
    await wrapper.find('#split-rules-form-name').setValue('Regra');
    await wrapper.find('#split-rules-form-recipient').setValue('Recebedor');
    await wrapper.find('#split-rules-form-appliesTo').setValue('Consultas');
    await wrapper.find('#split-rules-form-percentage').setValue(percentage);
    expect(findButton(wrapper, 'Criar registro').attributes('disabled')).toBeDefined();
    await findButton(wrapper, 'Criar registro').trigger('click');
    expect(mocks.create).not.toHaveBeenCalled();
    await wrapper.find('#split-rules-form-percentage').setValue('75.25');
    mocks.create.mockResolvedValueOnce({ ...bank, type: 'split-rules' });
    await findButton(wrapper, 'Criar registro').trigger('click'); await flushPromises();
    expect(mocks.create).toHaveBeenCalledWith('split-rules', expect.objectContaining({ configuration: expect.objectContaining({ percentage: 75.25 }) }));
  });

  it.each(['success', 'failure'])('does not apply an old update %s to a new catalog context', async outcome => {
    let resolve!: (value: unknown) => void; let reject!: (value: Error) => void;
    mocks.update.mockImplementationOnce(() => new Promise((yes, no) => { resolve = yes; reject = no; }));
    const Page = (await import('../OperationalFinanceCatalog.vue')).default;
    const wrapper = mount(Page, { props: { type: 'banks' } }); await flushPromises();
    await findButton(wrapper, 'Editar').trigger('click');
    await wrapper.find('.catalog-form').trigger('submit');
    mocks.list.mockResolvedValueOnce({ items: [], page: 1, totalItems: 0, totalPages: 1 });
    await wrapper.setProps({ type: 'card-machines' }); await flushPromises();
    const calls = mocks.list.mock.calls.length;
    if (outcome === 'success') resolve(bank); else reject(new Error('Old update failed'));
    await flushPromises();
    expect(mocks.list).toHaveBeenCalledTimes(calls);
    expect(wrapper.text()).not.toContain('Alterações salvas');
    expect(wrapper.text()).not.toContain('Old update failed');
    expect(wrapper.text()).toContain('Nova Maquininha');
  });

});
