import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import PriceTablesPage from '../PriceTablesPage.vue';
import PointOfSaleSyncPage from '../PointOfSaleSyncPage.vue';
import { completePosSyncJob, createPosSyncJob, listPosSyncJobs, listPriceTables } from '@/services/commercial';

vi.mock('@/services/commercial', () => ({
  listPriceTables: vi.fn(),
  createPosSyncJob: vi.fn(),
  completePosSyncJob: vi.fn(),
  listPosSyncJobs: vi.fn()
}));

async function flush() {
  await Promise.resolve();
  await nextTick();
}

beforeEach(() => {
  vi.mocked(listPriceTables).mockResolvedValue([
    {
      id: '2',
      legacyId: '2',
      description: 'TABELA FINAL DE SEMANA',
      context: 'Atendimentos e vendas fora da rotina semanal',
      isActive: true
    },
    {
      id: '1',
      legacyId: '1',
      description: 'TABELA MADRUGADA',
      context: 'Plantão, emergência e operação 24h',
      isActive: true
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
    expect(wrapper.text()).toContain('Buscar por ID ou descrição');
    expect(wrapper.text()).toContain('+ Incluir Nova Tabela');
    expect(wrapper.text()).toContain('TABELA FINAL DE SEMANA');
    expect(wrapper.text()).toContain('TABELA MADRUGADA');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Serviços');

    await wrapper.find('input[placeholder="Buscar por ID ou descrição"]').setValue('madrugada');

    expect(wrapper.text()).toContain('TABELA MADRUGADA');
    expect(wrapper.text()).not.toContain('TABELA FINAL DE SEMANA');
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
