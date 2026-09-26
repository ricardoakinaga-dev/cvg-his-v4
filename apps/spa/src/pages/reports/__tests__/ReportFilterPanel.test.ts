// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportFilterPanel from '../ReportFilterPanel.vue';

const baseProps = {
  filters: {
    dateFrom: '',
    dateTo: '',
    search: '',
    status: '',
    client: '',
    user: '',
    action: '',
    type: ''
  },
  loading: false,
  exporting: false,
  cancellationReportView: 'history',
  dateFromLabel: 'De',
  dateToLabel: 'Até',
  inventoryPeriodHint: null,
  isDeletedSalesCounterSalesReport: false,
  isCancellationHistoryReport: false,
  isServiceInvoicesReport: false,
  isAdvancePaymentsReport: false,
  isAppointmentsReport: true,
  isInventoryMovementsReport: false,
  isInventoryProductsReport: false,
  isInventoryStockReport: false,
  isInventoryInvoicesReport: false,
  isAuditAppointments: false,
  auditActionOptions: [],
  auditTypeOptions: []
};

describe('ReportFilterPanel', () => {
  it('keeps filter state page-owned and emits typed update/apply intents', async () => {
    const wrapper = mount(ReportFilterPanel, { props: baseProps });

    const inputs = wrapper.findAll('input');
    await inputs[0]?.setValue('2026-09-01');
    await wrapper.findAll('button').find((button) => button.text().includes('Aplicar'))?.trigger('click');

    expect(wrapper.emitted('update-filter')).toEqual([['dateFrom', '2026-09-01']]);
    expect(wrapper.emitted('apply')).toEqual([[]]);
  });

  it('renders report-specific controls and emits reset/change intents', async () => {
    const wrapper = mount(ReportFilterPanel, {
      props: {
        ...baseProps,
        isDeletedSalesCounterSalesReport: true,
        isCancellationHistoryReport: true,
        isAppointmentsReport: false,
        auditActionOptions: ['create'],
        auditTypeOptions: ['appointment']
      }
    });

    expect(wrapper.text()).toContain('Histórico por data de cancelamento');
    await wrapper.findAll('button').find((button) => button.text().includes('Limpar'))?.trigger('click');
    expect(wrapper.emitted('reset')).toEqual([[]]);
  });
});
