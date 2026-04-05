import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import DsSpinner from '../src/vue/DsSpinner.vue';

describe('DsSpinner', () => {
  it('renders a spinner without text by default', () => {
    const wrapper = mount(DsSpinner);
    expect(wrapper.classes()).toContain('ds-spinner');
    expect(wrapper.find('.ds-spinner-text').exists()).toBe(false);
    expect(wrapper.attributes('role')).toBe('status');
  });

  it('renders text when label prop is provided', () => {
    const wrapper = mount(DsSpinner, {
      props: { label: 'Carregando itens...' }
    });
    expect(wrapper.find('.ds-spinner-wrapper').exists()).toBe(true);
    expect(wrapper.find('.ds-spinner-text').text()).toBe('Carregando itens...');
    expect(wrapper.attributes('aria-live')).toBe('polite');
  });

  it('renders text when slot is used', () => {
    const wrapper = mount(DsSpinner, {
      slots: { default: 'Carregando via slot...' }
    });
    expect(wrapper.find('.ds-spinner-text').text()).toBe('Carregando via slot...');
  });

  it('applies correct size classes', () => {
    const wrapper = mount(DsSpinner, {
      props: { size: 'lg' }
    });
    expect(wrapper.classes()).toContain('ds-spinner--lg');
  });
});
