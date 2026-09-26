// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { DataTableRow } from '@/components/DataTable.vue';
import ReportResultTable from '../ReportResultTable.vue';
import type { ReportSpec } from '../reportWorkbenchTypes';

const spec: ReportSpec = {
  title: 'Relatório de teste',
  group: 'Relatórios',
  subtitle: 'Consulta de teste',
  icon: '📋',
  primaryPath: '/reports',
  primaryAction: 'Exportar',
  tableTitle: 'Resultados da consulta',
  emptyTitle: 'Sem resultados',
  emptyDescription: 'A consulta não retornou registros.',
  columns: [
    { key: 'amount', label: 'Valor' },
    { key: 'status', label: 'Status' },
    { key: 'reconciliationStatus', label: 'Reconciliação' },
    { key: 'issuedAt', label: 'Emissão' }
  ],
  cards: () => [],
  rows: () => []
};

const row: DataTableRow = {
  id: 'report-row-1',
  amount: 123.45,
  status: 'open',
  reconciliationStatus: 'pending',
  issuedAt: '2026-09-22T00:00:00.000Z'
};

describe('ReportResultTable', () => {
  it('renders report-specific formatting while keeping execution state in props', () => {
    const wrapper = mount(ReportResultTable, {
      props: {
        spec,
        caption: 'Resultados da consulta',
        rows: [row],
        loading: false,
        loadFailed: false,
        reportReady: true,
        reportHasActiveFilters: false,
        executionId: 'execution-1',
        showFinancialStatusLabels: true
      }
    });

    expect(wrapper.find('.report-results').attributes('data-execution-id')).toBe('execution-1');
    expect(wrapper.text()).toContain('Resultados da consulta');
    expect(wrapper.text()).toContain('123,45');
    expect(wrapper.text()).toContain('Em aberto');
    expect(wrapper.text()).toContain('Pendente');
    expect(wrapper.text()).toContain('22/09/2026');
  });

  it('emits retry and reset intents for recoverable empty states', async () => {
    const wrapper = mount(ReportResultTable, {
      props: {
        spec,
        caption: 'Resultados da consulta',
        rows: [],
        loading: false,
        loadFailed: true,
        reportReady: false,
        reportHasActiveFilters: false
      }
    });

    const retryButton = wrapper.findAll('button').find((button) => button.text() === 'Tentar novamente');
    expect(retryButton).toBeTruthy();
    await retryButton!.trigger('click');
    expect(wrapper.emitted('retry')).toEqual([[]]);

    await wrapper.setProps({
      loadFailed: false,
      reportReady: true,
      reportHasActiveFilters: true
    });
    const resetButton = wrapper.findAll('button').find((button) => button.text() === 'Limpar filtros');
    expect(resetButton).toBeTruthy();
    await resetButton!.trigger('click');
    expect(wrapper.emitted('reset-filters')).toEqual([[]]);
  });
});
