// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportExportAction from '../ReportExportAction.vue';

describe('ReportExportAction', () => {
  it('renders the typed primary action and emits intent', async () => {
    const wrapper = mount(ReportExportAction, {
      props: { label: 'Exportar CSV', loading: false, disabled: false }
    });

    expect(wrapper.text()).toContain('Exportar CSV');
    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('export')).toEqual([[]]);
  });

  it('keeps the action disabled while the page workflow is not ready', () => {
    const wrapper = mount(ReportExportAction, {
      props: { label: 'Exportar CSV', loading: true, disabled: true }
    });

    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });
});
