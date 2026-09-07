import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

describe('DsIcon', () => {
  it('renders a decorative local SVG for legacy icon names', () => {
    const wrapper = mount(DsIcon, { props: { name: '📅', size: 'lg' } });
    const svg = wrapper.find('svg');

    expect(svg.exists()).toBe(true);
    expect(svg.classes()).toContain('ds-icon--lg');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('path').length).toBeGreaterThan(0);
  });

  it('exposes an accessible name when one is provided', () => {
    const wrapper = mount(DsIcon, { props: { name: 'alert', label: 'Atenção' } });
    const svg = wrapper.find('svg');

    expect(svg.attributes('role')).toBe('img');
    expect(svg.attributes('aria-label')).toBe('Atenção');
    expect(svg.attributes('aria-hidden')).toBeUndefined();
  });

  it.each([
    'reception',
    'test-tube',
    'syringe',
    'target',
    'tools',
    'palette',
    'droplet',
    'wrench',
    'building',
    'factory',
    'arrow-right',
    'credit-card',
    'settings',
    'check-circle'
  ])('resolves the operational icon %s without the generic spark fallback', (name) => {
    const wrapper = mount(DsIcon, { props: { name } });

    expect(wrapper.find('svg').attributes('data-icon')).not.toBe('spark');
  });
});
