import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryHubPage from '../LaboratoryHubPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    getDashboardSummary: vi.fn()
  }
}));

describe('LaboratoryHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.getDashboardSummary).mockResolvedValue({
      totalOrders: 8,
      pendingOrders: 2,
      pendingResults: 3,
      releasedResults: 4,
      equipmentActive: 5
    });
  });

  it('shows the laboratory workload and preserves access to exams and reference settings', async () => {
    const wrapper = mount(LaboratoryHubPage, { global: { stubs: { DsAlert: false } } });
    await flushPromises();

    const metrics = wrapper.findAll('.ds-stat-card');
    expect(metrics.map((card) => card.find('.ds-stat-card__value').text())).toEqual(['8', '2', '3', '5']);
    expect(metrics.map((card) => card.find('.ds-stat-card__label').text())).toEqual([
      'Pedidos de exame', 'Aguardando coleta', 'Aguardando laudo', 'Equipamentos ativos'
    ]);
    expect(wrapper.text()).toContain('3 laudo(s) ainda aguardam liberação.');
    const destinations = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(destinations).toEqual(expect.arrayContaining([
      '/laboratory/orders', '/laboratory/results', '/diagnostics',
      '/laboratory/results?type=HEM', '/laboratory/results?type=BIO', '/laboratory/results?type=URIN',
      '/laboratory/equipment', '/laboratory/report-types', '/laboratory/reference-values',
      '/laboratory/hemogram-reference-values', '/laboratory/biochemistry-reference-values'
    ]));
  });

  it('does not present unavailable metrics as zero and lets staff retry', async () => {
    vi.mocked(laboratoryService.getDashboardSummary).mockRejectedValueOnce(new Error('Resumo indisponível'));
    const wrapper = mount(LaboratoryHubPage, { global: { stubs: { DsAlert: false } } });
    await flushPromises();

    expect(wrapper.text()).toContain('Resumo indisponível');
    expect(wrapper.findAll('.ds-stat-card__value').map((value) => value.text())).toEqual(['—', '—', '—', '—']);
    const refresh = wrapper.findAll('button').find((button) => button.text().includes('Atualizar'))!;
    await refresh.trigger('click');
    await flushPromises();
    expect(laboratoryService.getDashboardSummary).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain('Resumo indisponível');
    expect(wrapper.find('.ds-stat-card__value').text()).toBe('8');
  });

  it('keeps stale workload hidden after a failed refresh alert is dismissed', async () => {
    const wrapper = mount(LaboratoryHubPage, { global: { stubs: { DsAlert: false } } });
    await flushPromises();
    expect(wrapper.text()).toContain('3 laudo(s) ainda aguardam liberação.');

    vi.mocked(laboratoryService.getDashboardSummary).mockRejectedValueOnce(new Error('Resumo indisponível'));
    const refresh = wrapper.findAll('button').find((button) => button.text().includes('Atualizar'))!;
    await refresh.trigger('click');
    await flushPromises();
    await wrapper.get('.ds-alert--danger button[aria-label="Fechar alerta"]').trigger('click');

    expect(wrapper.text()).not.toContain('Resumo indisponível');
    expect(wrapper.findAll('.ds-stat-card__value').map((value) => value.text())).toEqual(['—', '—', '—', '—']);
    expect(wrapper.text()).not.toContain('Fila laboratorial');
  });

});
