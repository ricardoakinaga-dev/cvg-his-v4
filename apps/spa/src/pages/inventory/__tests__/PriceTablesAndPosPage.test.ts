import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import PriceTablesPage from '../PriceTablesPage.vue';
import PointOfSaleSyncPage from '../PointOfSaleSyncPage.vue';
import {
  addPriceTableItem,
  archivePriceTable,
  completePosSyncJob,
  createPosSyncJob,
  createPriceTable,
  getPriceTableDetail,
  listPosSyncJobs,
  listPriceTables,
  updatePriceTable
} from '@/services/commercial';
import { productsService } from '@/services/products';
import { servicesService } from '@/services/services';

vi.mock('@/services/commercial', () => ({
  listPriceTables: vi.fn(),
  getPriceTableDetail: vi.fn(),
  createPriceTable: vi.fn(),
  updatePriceTable: vi.fn(),
  archivePriceTable: vi.fn(),
  addPriceTableItem: vi.fn(),
  createPosSyncJob: vi.fn(),
  completePosSyncJob: vi.fn(),
  listPosSyncJobs: vi.fn()
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: vi.fn()
  }
}));

async function flush() {
  await flushPromises();
  await Promise.resolve();
  await nextTick();
}

beforeEach(() => {
  vi.mocked(listPriceTables).mockResolvedValue([
    {
      id: '2',
      accountId: 'account-1',
      legacyId: '2',
      description: 'TABELA FINAL DE SEMANA',
      context: 'Atendimentos e vendas fora da rotina semanal',
      isActive: true,
      startsAt: null,
      endsAt: null,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: '1',
      accountId: 'account-1',
      legacyId: '1',
      description: 'TABELA MADRUGADA',
      context: 'Plantão, emergência e operação 24h',
      isActive: true,
      startsAt: null,
      endsAt: null,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ]);
  vi.mocked(getPriceTableDetail).mockResolvedValue({
    id: '2',
    accountId: 'account-1',
    legacyId: '2',
    description: 'TABELA FINAL DE SEMANA',
    context: 'Atendimentos e vendas fora da rotina semanal',
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z',
    items: [
      {
        id: 'pti-1',
        accountId: 'account-1',
        priceTableId: '2',
        itemKind: 'product',
        itemId: 'prod-1',
        price: 99.9,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]
  });
  vi.mocked(createPriceTable).mockResolvedValue({
    id: '3',
    accountId: 'account-1',
    legacyId: '3',
    description: 'TABELA PLANTAO',
    context: 'Emergência',
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  });
  vi.mocked(updatePriceTable).mockResolvedValue({
    id: '3',
    accountId: 'account-1',
    legacyId: '3',
    description: 'TABELA PLANTAO PREMIUM',
    context: 'Emergência',
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  });
  vi.mocked(archivePriceTable).mockResolvedValue(undefined);
  vi.mocked(addPriceTableItem).mockResolvedValue({
    id: 'pti-2',
    accountId: 'account-1',
    priceTableId: '2',
    itemKind: 'product',
    itemId: 'prod-1',
    price: 120,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  });
  vi.mocked(productsService.list).mockResolvedValue([
    {
      id: 'prod-1',
      accountId: 'account-1',
      name: 'Vacina V10',
      code: 'VAC10',
      description: null,
      basePrice: 100,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ]);
  vi.mocked(servicesService.list).mockResolvedValue([
    {
      id: 'svc-1',
      accountId: 'account-1',
      name: 'Consulta',
      code: 'CONS',
      description: null,
      basePrice: 180,
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ]);
  vi.mocked(createPosSyncJob).mockResolvedValue({
    id: 'pos-job-1',
    syncKind: 'stock',
    status: 'queued',
    processedCount: 0,
    requestedAt: '2026-04-24T00:00:00.000Z',
    finishedAt: null,
    errorMessage: null
  });
  vi.mocked(completePosSyncJob).mockResolvedValue({
    id: 'pos-job-1',
    syncKind: 'stock',
    status: 'completed',
    processedCount: 128,
    requestedAt: '2026-04-24T00:00:00.000Z',
    finishedAt: '2026-04-24T00:00:10.000Z',
    errorMessage: null
  });
  vi.mocked(listPosSyncJobs).mockResolvedValue([
    {
      id: 'pos-job-old',
      syncKind: 'clients',
      status: 'completed',
      processedCount: 64,
      requestedAt: '2026-04-24T00:00:00.000Z',
      finishedAt: '2026-04-24T00:00:10.000Z',
      errorMessage: null
    }
  ]);
});

describe('PriceTablesPage', () => {
  it('renders Vetus price table evidence and filters by id or description', async () => {
    const wrapper = mount(PriceTablesPage);
    await flush();

    expect(wrapper.text()).toContain('Tabelas de Preço');
    expect(wrapper.get('[data-testid="price-table-search"]').attributes('placeholder')).toBe('Buscar por ID ou descrição');
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('TABELA FINAL DE SEMANA');
    expect(wrapper.text()).toContain('TABELA MADRUGADA');

    await wrapper.find('[data-testid="price-table-search"]').setValue('madrugada');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flush();

    expect(listPriceTables).toHaveBeenLastCalledWith({ search: 'madrugada', active: true });
  });

  it('creates, updates, archives and links price table items', async () => {
    const wrapper = mount(PriceTablesPage);
    await flush();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Nova Tabela')!.trigger('click');
    await wrapper.get('[data-testid="price-table-id"]').setValue('3');
    await wrapper.get('[data-testid="price-table-description"]').setValue('TABELA PLANTAO');
    await wrapper.get('[data-testid="price-table-context"]').setValue('Emergência');
    await wrapper.find('form[aria-label="Cadastro de tabela de preço"]').trigger('submit');
    await flush();

    expect(createPriceTable).toHaveBeenCalledWith({
      legacyId: '3',
      description: 'TABELA PLANTAO',
      context: 'Emergência',
      startsAt: null,
      endsAt: null,
      isActive: true
    });
    expect(wrapper.text()).toContain('Tabela de preço cadastrada com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await flush();
    await wrapper.get('[data-testid="price-table-description"]').setValue('TABELA PLANTAO PREMIUM');
    await wrapper.find('form[aria-label="Cadastro de tabela de preço"]').trigger('submit');
    await flush();

    expect(updatePriceTable).toHaveBeenCalledWith('3', expect.objectContaining({
      description: 'TABELA PLANTAO PREMIUM'
    }));

    await wrapper.get('[data-testid="price-table-item-id"]').setValue('prod-1');
    await wrapper.get('[data-testid="price-table-item-price"]').setValue(120);
    await wrapper.find('form[aria-label="Vincular item à tabela de preço"]').trigger('submit');
    await flush();

    expect(addPriceTableItem).toHaveBeenCalledWith('3', {
      itemKind: 'product',
      itemId: 'prod-1',
      price: 120
    });

    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flush();

    expect(archivePriceTable).toHaveBeenCalledWith('3');
    expect(wrapper.text()).toContain('Tabela de preço excluída com sucesso.');
  });
});

describe('PointOfSaleSyncPage', () => {
  it('renders the confirmed POS synchronization actions', async () => {
    const wrapper = mount(PointOfSaleSyncPage);

    expect(wrapper.text()).toContain('Pontos de venda');
    expect(wrapper.text()).toContain('Selecione o tipo de sincronização com o Sistema de Pontos de Venda');
    expect(wrapper.text()).toContain('Sincronizar Estoque');
    expect(wrapper.text()).toContain('Sincronizar clientes');
    await flush();
    expect(wrapper.text()).toContain('Relatório operacional de jobs PDV');
    expect(wrapper.text()).toContain('pos-job-old');

    const syncButton = wrapper.findAll('button').find((button) => button.text() === 'Sincronizar Estoque');
    expect(syncButton).toBeTruthy();
    await syncButton!.trigger('click');
    await flush();

    expect(wrapper.text()).toContain('Sincronização iniciada com sucesso!');
    expect(wrapper.text()).toContain('background');
    expect(wrapper.text()).toContain('Sincronização finalizada');
    expect(wrapper.text()).toContain('pos-job-1');
  });
});
