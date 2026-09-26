// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportWorkbenchToolbar from '../ReportWorkbenchToolbar.vue';

const baseProps = {
  title: 'Relatório de agenda',
  breadcrumbs: ['Relatórios', 'Agenda'],
  subtitle: 'Recorte operacional',
  showActions: true,
  loading: false,
  exportable: true,
  exportLabel: 'Exportar CSV',
  exportLoading: false,
  exportDisabled: false,
  primaryDisabled: false,
  primaryLabel: 'Abrir agenda',
  primaryPath: '/appointments'
};

describe('ReportWorkbenchToolbar', () => {
  it('renders report identity and emits refresh/export intents', async () => {
    const wrapper = mount(ReportWorkbenchToolbar, { props: baseProps });

    expect(wrapper.text()).toContain('Relatório de agenda');
    expect(wrapper.text()).toContain('Recorte operacional');
    expect(wrapper.text()).toContain('Exportar CSV');

    const buttons = wrapper.findAll('button');
    await buttons.find((button) => button.text().includes('Atualizar'))?.trigger('click');
    await buttons.find((button) => button.text().includes('Exportar CSV'))?.trigger('click');

    expect(wrapper.emitted('refresh')).toEqual([[]]);
    expect(wrapper.emitted('export')).toEqual([[]]);
  });

  it('keeps the export action disabled when the page says the workflow is not ready', () => {
    const wrapper = mount(ReportWorkbenchToolbar, {
      props: { ...baseProps, exportDisabled: true, exportLoading: true }
    });

    expect(wrapper.findAll('button').find((button) => button.text().includes('Exportar CSV'))?.attributes('disabled')).toBeDefined();
  });
});
