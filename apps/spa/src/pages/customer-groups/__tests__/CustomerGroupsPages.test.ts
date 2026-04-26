import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CustomerGroupDetailPage from '../CustomerGroupDetailPage.vue';
import CustomerGroupFormPage from '../CustomerGroupFormPage.vue';
import CustomerGroupsListPage from '../CustomerGroupsListPage.vue';
import { customerGroupsService, type CustomerGroupSummary } from '@/services/customerGroups';

const routerPush = vi.fn();
let routeParams: Record<string, string> = {};

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush
  }),
  useRoute: () => ({
    params: routeParams
  })
}));

vi.mock('@/services/customerGroups', async () => {
  const actual = await vi.importActual<typeof import('@/services/customerGroups')>('@/services/customerGroups');
  return {
    ...actual,
    customerGroupsService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

const mockCustomerGroup: CustomerGroupSummary = {
  id: 'customer-group-1',
  accountId: 'acc-1',
  name: 'Convenio',
  code: 'AGREEMENT',
  segment: 'Convenio',
  discountPercent: 10,
  paymentTermDays: 30,
  creditLimitAmount: 1000,
  description: 'Grupo para validar cadastro Vetus-like.',
  active: true,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

describe('Customer groups pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(customerGroupsService.list).mockResolvedValue([mockCustomerGroup]);
    vi.mocked(customerGroupsService.getById).mockResolvedValue(mockCustomerGroup);
    vi.mocked(customerGroupsService.create).mockResolvedValue(mockCustomerGroup);
    vi.mocked(customerGroupsService.update).mockResolvedValue(mockCustomerGroup);
    vi.mocked(customerGroupsService.delete).mockResolvedValue(undefined);
  });

  it('renders the Vetus-aligned list and loads active customer groups', async () => {
    const wrapper = mount(CustomerGroupsListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Grupos de Clientes');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Segmento');
    expect(wrapper.text()).toContain('Grupos Ativos');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Convenio');
    expect(customerGroupsService.list).toHaveBeenCalledWith({
      search: undefined,
      active: true,
      segment: undefined
    });
  });

  it('creates a customer group with commercial policy fields', async () => {
    const wrapper = mount(CustomerGroupFormPage);
    const inputs = wrapper.findAll('input');

    await inputs[0]?.setValue('VIP');
    await inputs[1]?.setValue('VIP');
    await inputs[2]?.setValue('Relacionamento');
    await inputs[3]?.setValue('12.5');
    await inputs[4]?.setValue('15');
    await inputs[5]?.setValue('750');
    await wrapper.find('textarea').setValue('Grupo comercial prioritario.');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(customerGroupsService.create).toHaveBeenCalledWith({
      name: 'VIP',
      code: 'VIP',
      segment: 'Relacionamento',
      discountPercent: 12.5,
      paymentTermDays: 15,
      creditLimitAmount: 750,
      description: 'Grupo comercial prioritario.',
      active: true
    });
    expect(wrapper.text()).toContain('Grupo de Clientes salvo com sucesso.');
  });

  it('opens detail with duplicate, delete and operational integrations', async () => {
    routeParams = { id: 'customer-group-1' };
    const wrapper = mount(CustomerGroupDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhes do Grupo de Clientes');
    expect(wrapper.text()).toContain('Duplicar');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Comandas e vendas');
    expect(wrapper.text()).toContain('Orçamentos');
    expect(wrapper.text()).toContain('Marketing');
    expect(wrapper.text()).toContain('Convenio');
  });
});
