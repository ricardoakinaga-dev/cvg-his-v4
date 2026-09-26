// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportQueryStatus from '../ReportQueryStatus.vue';

const baseProps = {
  error: 'Falha na consulta',
  success: 'Consulta atualizada',
  reportFiltersChanged: true
};

describe('ReportQueryStatus', () => {
  it('renders query feedback and keeps query status presentation-bound', () => {
    const wrapper = mount(ReportQueryStatus, { props: baseProps });

    expect(wrapper.text()).toContain('Falha na consulta');
    expect(wrapper.text()).toContain('Consulta atualizada');
    expect(wrapper.text()).toContain('Filtros alterados');
    expect(wrapper.find('.report-export-recovery').exists()).toBe(false);
  });
});
