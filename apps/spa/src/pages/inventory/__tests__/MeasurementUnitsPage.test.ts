import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MeasurementUnitsPage from '../MeasurementUnitsPage.vue';
import { measurementUnitsService } from '@/services/measurementUnits';

vi.mock('@/services/measurementUnits', () => ({
  measurementUnitsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

const measurementUnitResponse = {
  items: [
    {
      id: 'mu-1',
      accountId: 'account-1',
      code: 'UN',
      description: 'Unidade',
      decimalPlaces: 0,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'mu-2',
      accountId: 'account-1',
      code: 'KG',
      description: 'Quilograma',
      decimalPlaces: 3,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ],
  totalItems: 2
};

describe('MeasurementUnitsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(measurementUnitsService.list).mockResolvedValue(structuredClone(measurementUnitResponse));
    vi.mocked(measurementUnitsService.create).mockResolvedValue({
      id: 'mu-3',
      accountId: 'account-1',
      code: 'CX',
      description: 'Caixa',
      decimalPlaces: 0,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
    vi.mocked(measurementUnitsService.update).mockResolvedValue({
      ...measurementUnitResponse.items[0],
      description: 'Unidade Comercial'
    });
    vi.mocked(measurementUnitsService.remove).mockResolvedValue(undefined);
  });

  it('renders the Vetus-like measurement units catalog', async () => {
    const wrapper = mount(MeasurementUnitsPage);
    await flushPromises();

    expect(measurementUnitsService.list).toHaveBeenCalledWith({
      search: undefined,
      precision: undefined,
      active: true
    });
    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain('EstoqueCadastrosUnidadesdeMedida');
    expect(wrapper.text()).toContain('Incluir Nova Unidade');
    expect(wrapper.get('[data-testid="measurement-unit-search"]').attributes('placeholder')).toBe('Buscar por código ou descrição');
    expect(wrapper.text()).toContain('Descrição:');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('Código:');
    expect(wrapper.text()).toContain('UN');
    expect(wrapper.text()).toContain('Decimais:');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('filters by code, description and precision through the measurement units API', async () => {
    const wrapper = mount(MeasurementUnitsPage);
    await flushPromises();

    await wrapper.get('[data-testid="measurement-unit-search"]').setValue('UN');
    await wrapper.get('[data-testid="measurement-unit-precision-filter"]').setValue('integer');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(measurementUnitsService.list).toHaveBeenLastCalledWith({
      search: 'UN',
      precision: 'integer',
      active: true
    });
  });

  it('creates and updates measurement units through the durable catalog API', async () => {
    const wrapper = mount(MeasurementUnitsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Nova Unidade')!.trigger('click');
    await wrapper.get('[data-testid="measurement-unit-code"]').setValue('cx');
    await wrapper.get('[data-testid="measurement-unit-description"]').setValue('Caixa');
    await wrapper.get('[data-testid="measurement-unit-decimal-places"]').setValue(0);
    await wrapper.find('form[aria-label="Cadastro de unidade de medida"]').trigger('submit');
    await flushPromises();

    expect(measurementUnitsService.create).toHaveBeenCalledWith({
      code: 'CX',
      description: 'Caixa',
      decimalPlaces: 0,
      active: true
    });
    expect(wrapper.text()).toContain('Unidade de medida cadastrada com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.get('[data-testid="measurement-unit-description"]').setValue('Unidade Comercial');
    await wrapper.find('form[aria-label="Cadastro de unidade de medida"]').trigger('submit');
    await flushPromises();

    expect(measurementUnitsService.update).toHaveBeenCalledWith('mu-3', {
      code: 'CX',
      description: 'Unidade Comercial',
      decimalPlaces: 0,
      active: true
    });
  });

  it('archives measurement units through the exclude action', async () => {
    const wrapper = mount(MeasurementUnitsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flushPromises();

    expect(measurementUnitsService.remove).toHaveBeenCalledWith('mu-1');
    expect(wrapper.text()).toContain('Unidade de medida excluída com sucesso.');
  });
});
