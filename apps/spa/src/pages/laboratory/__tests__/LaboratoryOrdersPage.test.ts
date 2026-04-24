import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryOrdersPage from '../LaboratoryOrdersPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: vi.fn()
  }
}));

describe('LaboratoryOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders laboratory exam orders loaded from the API contract', async () => {
    vi.mocked(laboratoryService.listOrders).mockResolvedValue([
      {
        id: 'diag_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Backlog de coleta',
        status: 'requested',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T08:30:00.000Z'
      }
    ]);

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Pedidos de Exame');
    expect(wrapper.text()).toContain('1 pedido(s)');
    expect(wrapper.text()).toContain('1 aguardando coleta');
    expect(wrapper.text()).toContain('Hemograma');
    expect(wrapper.text()).toContain('Solicitado');
  });

  it('keeps the page usable when the laboratory API returns an error', async () => {
    vi.mocked(laboratoryService.listOrders).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Pedidos de Exame');
    expect(wrapper.text()).toContain('0 pedido(s)');
    expect(wrapper.text()).toContain('Unexpected error');
  });
});
