import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CompanySectorsPage from '../CompanySectorsPage.vue';
import { companySectorsService } from '@/services/companySectors';
import { inpatientService } from '@/services/inpatient';

vi.mock('@/services/companySectors', () => ({
  companySectorsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    listBeds: vi.fn()
  }
}));

const companySectorResponse = {
  items: [
    {
      id: 'sector-1',
      accountId: 'account-1',
      code: 'EST',
      name: 'Estoque',
      kind: 'inventory',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'sector-2',
      accountId: 'account-1',
      code: 'CLI',
      name: 'Clínica',
      kind: 'clinic',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ],
  totalItems: 2
};

describe('CompanySectorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(companySectorsService.list).mockResolvedValue(structuredClone(companySectorResponse));
    vi.mocked(companySectorsService.create).mockResolvedValue({
      id: 'sector-3',
      accountId: 'account-1',
      code: 'ADM',
      name: 'Administrativo',
      kind: 'administration',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
    vi.mocked(companySectorsService.update).mockResolvedValue({
      ...companySectorResponse.items[0],
      name: 'Estoque Central'
    });
    vi.mocked(companySectorsService.remove).mockResolvedValue(undefined);
    vi.mocked(inpatientService.listBeds).mockResolvedValue([
      {
        id: 'bed-1',
        accountId: 'account-1',
        sectorId: 'sector-1',
        code: 'BOX-1',
        name: 'Box 1',
        status: 'available',
        active: true,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]);
  });

  it('renders the Vetus-like company sectors catalog', async () => {
    const wrapper = mount(CompanySectorsPage);
    await flushPromises();

    expect(companySectorsService.list).toHaveBeenCalledWith({ search: undefined, kind: undefined, active: true });
    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain('EstoqueCadastrosSetoresdaEmpresa');
    expect(wrapper.text()).toContain('Incluir Novo Setor');
    expect(wrapper.get('[data-testid="company-sector-search"]').attributes('placeholder')).toBe('Buscar por código ou nome');
    expect(wrapper.text()).toContain('Nome:');
    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Código:');
    expect(wrapper.text()).toContain('EST');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('filters by code or name through the company sectors API', async () => {
    const wrapper = mount(CompanySectorsPage);
    await flushPromises();

    await wrapper.get('[data-testid="company-sector-search"]').setValue('EST');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(companySectorsService.list).toHaveBeenLastCalledWith({ search: 'EST', kind: undefined, active: true });
  });

  it('creates and updates company sectors through the durable sectors API', async () => {
    const wrapper = mount(CompanySectorsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Novo Setor')!.trigger('click');
    await wrapper.get('[data-testid="company-sector-code"]').setValue('ADM');
    await wrapper.get('[data-testid="company-sector-name"]').setValue('Administrativo');
    await wrapper.get('[data-testid="company-sector-kind"]').setValue('administration');
    await wrapper.find('form[aria-label="Cadastro de setor da empresa"]').trigger('submit');
    await flushPromises();

    expect(companySectorsService.create).toHaveBeenCalledWith({
      code: 'ADM',
      name: 'Administrativo',
      kind: 'administration',
      active: true
    });
    expect(wrapper.text()).toContain('Setor da empresa cadastrado com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.get('[data-testid="company-sector-name"]').setValue('Estoque Central');
    await wrapper.find('form[aria-label="Cadastro de setor da empresa"]').trigger('submit');
    await flushPromises();

    expect(companySectorsService.update).toHaveBeenCalledWith('sector-3', {
      code: 'ADM',
      name: 'Estoque Central',
      kind: 'administration',
      active: true
    });
  });

  it('archives company sectors through the exclude action', async () => {
    const wrapper = mount(CompanySectorsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flushPromises();

    expect(companySectorsService.remove).toHaveBeenCalledWith('sector-1');
    expect(wrapper.text()).toContain('Setor da empresa excluído com sucesso.');
  });
});
