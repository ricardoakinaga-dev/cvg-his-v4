// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportExportRecovery from '../ReportExportRecovery.vue';

const baseProps = {
  exportPending: true,
  hasPendingExport: true,
  exportRetryAvailable: true,
  exporting: false
};

describe('ReportExportRecovery', () => {
  it('renders recovery copy and emits reconciliation intents', async () => {
    const wrapper = mount(ReportExportRecovery, { props: baseProps });

    expect(wrapper.text()).toContain('Verifique o artefato persistido');

    const buttons = wrapper.findAll('button');
    await buttons.find((button) => button.text().includes('Verificar exportação'))?.trigger('click');
    await buttons.find((button) => button.text().includes('Repetir com a mesma chave'))?.trigger('click');

    expect(wrapper.emitted('reconcile-export')).toEqual([[]]);
    expect(wrapper.emitted('retry-export')).toEqual([[]]);
  });

  it('does not render recovery controls when no export is pending', () => {
    const wrapper = mount(ReportExportRecovery, {
      props: { ...baseProps, exportPending: false }
    });

    expect(wrapper.find('.report-export-recovery').exists()).toBe(false);
  });
});
