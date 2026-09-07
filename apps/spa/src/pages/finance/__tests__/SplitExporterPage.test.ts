import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SplitExporterPage from '../SplitExporterPage.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const mockList = vi.hoisted(() => vi.fn());
vi.mock('@/services/financeCards', () => ({ financeCardsService: { list: (...args: unknown[]) => mockList(...args) } }));
const card = (extra = {}) => ({ transactionId: 'txn_1', provider: 'pagarme-card', status: 'captured', amount: 300, currency: 'BRL', description: 'Consulta', installments: 1, ...extra });
function deferred() {
  let resolve!: (value: unknown[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function money(value: string) { return value.replace(/\u00a0/g, ' '); }

describe('SplitExporterPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockList.mockReset(); mockList.mockResolvedValue([card()]); });

  it('preserves actual contract records without inventing net, receivers or allocation', async () => {
    const wrapper = mount(SplitExporterPage);
    await flushPromises();
    expect(wrapper.text()).toContain('Consulta');
    expect(wrapper.text()).toContain('Exportação indisponível');
    expect(wrapper.text()).toContain('até 100 registros');
    expect(wrapper.text()).not.toContain('Centro Veterinário Guarapiranga');
    expect(wrapper.text()).not.toContain('CVG Pagamentos');
    expect(wrapper.text()).not.toContain('247,35');
    expect(wrapper.findAll('tbody td').map(cell => cell.text())).toEqual(['Consultatxn_1', 'Cliente não informadoPaciente não vinculado', '—', '—', '—', 'Capturada', 'Não informada']);
    expect(wrapper.findAll('button').some(button => /Gerar|Exportar/.test(button.text()))).toBe(false);
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual(expect.arrayContaining(['/finance/card-transactions', '/finance/split/simulator', '/finance/split']));
  });

  it('supports provided zero net and preserves foreign currencies without mixed totals', async () => {
    mockList.mockResolvedValue([card({ netAmount: 0 }), card({ transactionId: 'usd', netAmount: 20, currency: 'USD' })]);
    const wrapper = mount(SplitExporterPage);
    await flushPromises();
    expect(money(wrapper.find('tbody').text())).toContain('R$ 0,00');
    expect(money(wrapper.find('tbody').text())).toContain('US$ 20,00');
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['2', '—']);
  });

  it('totals only provided net and never infers it from gross or fees', async () => {
    mockList.mockResolvedValue([card({ netAmount: 291 }), card({ transactionId: 'unknown', feeAmount: 3 })]);
    const wrapper = mount(SplitExporterPage);
    await flushPromises();
    expect(money(wrapper.find('tbody').text())).toContain('R$ 291,00');
    expect(wrapper.findAll('dd')[1].text()).toBe('—');
    mockList.mockResolvedValue([card({ netAmount: 0 })]);
    await wrapper.find('form').trigger('submit'); await flushPromises();
    expect(money(wrapper.findAll('dd')[1].text())).toBe('R$ 0,00');
  });

  it('does not label absent or unfamiliar status as pending', async () => {
    mockList.mockResolvedValue([card({ status: '', reconciliationState: null }), card({ transactionId: 'other', status: 'new_status', reconciliationState: 'new_reconciliation' })]);
    const wrapper = mount(SplitExporterPage); await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Não informado');
    expect(wrapper.find('tbody').text()).toContain('new_status');
    expect(wrapper.find('tbody').text()).toContain('new_reconciliation');
    expect(wrapper.find('tbody').text()).not.toContain('Pendente');
  });

  it('offers operative query filters without pretending to select an export format', async () => {
    const wrapper = mount(SplitExporterPage); await flushPromises();
    expect(wrapper.find('#split-exporter-format').exists()).toBe(false);
    expect(wrapper.find('tbody').text()).not.toMatch(/CSV|JSON|OFX/);
    await wrapper.find('#split-exporter-search').setValue(' Rex ');
    await wrapper.find('#split-exporter-provider').setValue('pagarme-card');
    await wrapper.find('#split-exporter-status').setValue('captured');
    expect(wrapper.find('tbody').text()).toContain('Consulta');
    const pending = deferred(); mockList.mockReturnValueOnce(pending.promise);
    await wrapper.find('form').trigger('submit');
    await wrapper.find('#split-exporter-search').setValue('Luna');
    pending.resolve([card({ description: 'Resultado de Rex' })]); await flushPromises();
    expect(mockList).toHaveBeenLastCalledWith({ search: 'Rex', provider: 'pagarme-card', status: 'captured', pageSize: 100 });
    expect(wrapper.find('tbody').text()).toContain('Resultado de Rex');
    await wrapper.findAll('button').find(button => button.text() === 'Limpar')!.trigger('click'); await flushPromises();
    expect(mockList).toHaveBeenLastCalledWith({ search: '', provider: '', status: '', pageSize: 100 });
  });

  it('starts loading with unknown summary and distinguishes successful emptiness', async () => {
    const pending = deferred(); mockList.mockReturnValueOnce(pending.promise);
    const wrapper = mount(SplitExporterPage);
    expect(wrapper.findComponent(DataTable).props('loading')).toBe(true);
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['—', '—']);
    expect(wrapper.text()).not.toContain('Nenhuma transação');
    pending.resolve([]); await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma transação nesta consulta');
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['0', '—']);
  });

  it('keeps a failed state and retry after dismissal, without claiming empty or zero', async () => {
    mockList.mockRejectedValueOnce(new Error('Falha da fonte'));
    const wrapper = mount(SplitExporterPage); await flushPromises();
    wrapper.findComponent(DsAlert).vm.$emit('dismiss'); await flushPromises();
    expect(wrapper.text()).not.toContain('Falha da fonte');
    expect(wrapper.text()).not.toContain('Nenhuma transação');
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['—', '—']);
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click'); await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Consulta');
  });

  it.each(['success', 'failure'])('ignores stale request %s and its loading completion', async (outcome) => {
    const first = deferred(); const second = deferred();
    mockList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const wrapper = mount(SplitExporterPage);
    await wrapper.find('#split-exporter-search').setValue('Latest');
    await wrapper.find('form').trigger('submit');
    if (outcome === 'success') first.resolve([card({ description: 'Old' })]); else first.reject(new Error('Old failure'));
    await flushPromises();
    expect(wrapper.findComponent(DataTable).props('loading')).toBe(true);
    expect(wrapper.text()).not.toContain('Old');
    second.resolve([card({ description: 'Latest' })]); await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Latest');
  });

  it('ignores an old success arriving after a newer failure', async () => {
    const first = deferred(); const second = deferred();
    mockList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const wrapper = mount(SplitExporterPage);
    await wrapper.find('form').trigger('submit');
    second.reject(new Error('Latest failed')); await flushPromises();
    first.resolve([card()]); await flushPromises();
    expect(wrapper.text()).toContain('Latest failed');
    expect(wrapper.find('tbody').exists()).toBe(false);
    expect(wrapper.findAll('dd')[0].text()).toBe('—');
  });
});
