import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ManufacturersPage from '../ManufacturersPage.vue';
import { manufacturersService } from '@/services/manufacturers';
import { productsService } from '@/services/products';

vi.mock('@/services/manufacturers', () => ({
  manufacturersService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn()
  }
}));

const manufacturerResponse = {
  items: [
    {
      id: 'mf-1',
      accountId: 'account-1',
      displayId: 17,
      name: 'Fabricante CVG',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'mf-2',
      accountId: 'account-1',
      displayId: 14,
      name: 'Linha Hospitalar',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ],
  totalItems: 2
};

describe('ManufacturersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(manufacturersService.list).mockResolvedValue(structuredClone(manufacturerResponse));
    vi.mocked(manufacturersService.create).mockResolvedValue({
      id: 'mf-3',
      accountId: 'account-1',
      displayId: 18,
      name: 'Laboratorio CVG',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
    vi.mocked(manufacturersService.update).mockResolvedValue({
      ...manufacturerResponse.items[0],
      name: 'Fabricante CVG Premium'
    });
    vi.mocked(manufacturersService.remove).mockResolvedValue(undefined);
    vi.mocked(productsService.list).mockResolvedValue([
      {
        id: 'prod-1',
        accountId: 'account-1',
        name: 'Fabricante CVG Shampoo',
        code: 'SH-1',
        description: 'Produto Fabricante CVG',
        basePrice: 29.9,
        active: true,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]);
  });

  it('renders the Vetus-like manufacturers catalog', async () => {
    const wrapper = mount(ManufacturersPage);
    await flushPromises();

    expect(manufacturersService.list).toHaveBeenCalledWith({ search: undefined, active: true });
    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain('EstoqueCadastrosFabricantes');
    expect(wrapper.text()).toContain('Incluir Novo Fabricante');
    expect(wrapper.get('[data-testid="manufacturer-search"]').attributes('placeholder')).toBe('Buscar por ID ou nome');
    expect(wrapper.text()).toContain('Nome:');
    expect(wrapper.text()).toContain('Fabricante CVG');
    expect(wrapper.text()).toContain('ID:');
    expect(wrapper.text()).toContain('17');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('filters by ID or name through the manufacturer API', async () => {
    const wrapper = mount(ManufacturersPage);
    await flushPromises();

    await wrapper.get('[data-testid="manufacturer-search"]').setValue('17');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(manufacturersService.list).toHaveBeenLastCalledWith({ search: '17', active: true });
  });

  it('creates and updates manufacturers through the durable catalog API', async () => {
    const wrapper = mount(ManufacturersPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Novo Fabricante')!.trigger('click');
    await wrapper.get('[data-testid="manufacturer-name"]').setValue('Laboratorio CVG');
    await wrapper.find('form[aria-label="Cadastro de fabricante"]').trigger('submit');
    await flushPromises();

    expect(manufacturersService.create).toHaveBeenCalledWith({
      name: 'Laboratorio CVG',
      active: true
    });
    expect(wrapper.text()).toContain('Fabricante cadastrado com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.get('[data-testid="manufacturer-name"]').setValue('Fabricante CVG Premium');
    await wrapper.find('form[aria-label="Cadastro de fabricante"]').trigger('submit');
    await flushPromises();

    expect(manufacturersService.update).toHaveBeenCalledWith('mf-3', {
      name: 'Fabricante CVG Premium',
      active: true
    });
  });

  it('archives manufacturers through the exclude action', async () => {
    const wrapper = mount(ManufacturersPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flushPromises();

    expect(manufacturersService.remove).toHaveBeenCalledWith('mf-1');
    expect(wrapper.text()).toContain('Fabricante excluído com sucesso.');
  });
});
