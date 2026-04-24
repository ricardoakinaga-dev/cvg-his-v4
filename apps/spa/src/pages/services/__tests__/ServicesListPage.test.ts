import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ServicesListPage from '../ServicesListPage.vue';
import { servicesService, type ServiceSummary } from '@/services/services';

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: vi.fn()
  }
}));

const mockServices: ServiceSummary[] = [
  {
    id: 'svc-1',
    accountId: 'acc-1',
    name: 'Consulta Veterinária',
    code: 'CONS-001',
    description: 'Atendimento clínico agendável',
    basePrice: 150,
    active: true,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z'
  },
  {
    id: 'svc-2',
    accountId: 'acc-1',
    name: 'Banho terapêutico',
    code: 'BAN-002',
    description: 'Serviço comercial para comanda',
    basePrice: 90,
    active: false,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z'
  }
];

describe('ServicesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(servicesService.list).mockResolvedValue(mockServices);
  });

  it('renders the legacy Vetus service registry semantics', async () => {
    const wrapper = mount(ServicesListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Cadastro de Serviços');
    expect(wrapper.text()).toContain('Serviços Ativos');
    expect(wrapper.text()).toContain('Tabela de Preço');
    expect(wrapper.text()).toContain('Tabela Fiscal');
    expect(wrapper.text()).toContain('Agenda usa ativos agendáveis');
    expect(wrapper.text()).toContain('Comanda cobra execução');
    expect(wrapper.text()).toContain('Fiscal parametriza NFS-e');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Valor');
    expect(wrapper.text()).toContain('Abrir');
  });

  it('filters services by id/description and active flag', async () => {
    const wrapper = mount(ServicesListPage);
    await flushPromises();

    await wrapper.find('input[placeholder="Id"]').setValue('svc-1');
    await wrapper.find('input[placeholder="Descrição"]').setValue('consulta');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(wrapper.text()).toContain('Consulta Veterinária');
    expect(wrapper.text()).not.toContain('Banho terapêutico');
  });
});
