import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CounterSalesKpiSummary from '../CounterSalesKpiSummary.vue';

describe('CounterSalesKpiSummary', () => {
  it('renders the four page-provided KPI labels in the operational order', () => {
    const wrapper = mount(CounterSalesKpiSummary, {
      props: {
        openSalesLabel: '2 aberta(s)',
        closedSalesLabel: '5 fechada(s)',
        openBalanceLabel: 'R$ 120,00',
        grossSalesLabel: 'R$ 980,00'
      }
    });

    expect(wrapper.get('section').attributes('aria-label')).toBe('Indicadores das comandas');
    expect(wrapper.findAll('.ds-stat-card')).toHaveLength(4);
    expect(wrapper.text()).toContain('2 aberta(s)');
    expect(wrapper.text()).toContain('5 fechada(s)');
    expect(wrapper.text()).toContain('R$ 120,00');
    expect(wrapper.text()).toContain('R$ 980,00');
  });
});
