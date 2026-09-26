// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportSummaryDetails from '../ReportSummaryDetails.vue';

describe('ReportSummaryDetails', () => {
  it('renders readonly cards and report assumptions', () => {
    const wrapper = mount(ReportSummaryDetails, {
      props: {
        reportReady: true,
        cards: [{ label: 'Total', value: 'R$ 1.200,00', icon: '💰' }],
        reportNote: 'Valores derivados da consulta persistida.'
      }
    });

    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('R$ 1.200,00');
    expect(wrapper.text()).toContain('Valores derivados da consulta persistida.');
  });

  it('does not render empty summary when the report is not ready', () => {
    const wrapper = mount(ReportSummaryDetails, {
      props: { reportReady: false, cards: [], reportNote: '' }
    });

    expect(wrapper.find('.report-summary').exists()).toBe(false);
    expect(wrapper.find('.report-assumptions').exists()).toBe(false);
  });
});
