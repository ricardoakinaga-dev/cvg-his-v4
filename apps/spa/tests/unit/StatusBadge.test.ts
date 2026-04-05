import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from '@/components/StatusBadge.vue';

describe('StatusBadge', () => {
  it('renders label', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Ativo' } });
    expect(wrapper.text()).toContain('Ativo');
  });

  it('applies variant class via DsBadge', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Success', variant: 'success' } });
    expect(wrapper.classes()).toContain('ds-badge--success');
  });

  it('applies size class via DsBadge', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Small', size: 'sm' } });
    expect(wrapper.classes()).toContain('ds-badge--sm');
  });

  it('renders icon when provided', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'WA', icon: '📱' } });
    expect(wrapper.text()).toContain('📱');
    expect(wrapper.text()).toContain('WA');
  });

  it('defaults to default variant and md size', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Default' } });
    expect(wrapper.classes()).toContain('ds-badge--default');
    expect(wrapper.classes()).toContain('ds-badge--md');
  });

  it('supports all variants', () => {
    const variants = ['default', 'success', 'warning', 'danger', 'info', 'neutral'] as const;
    for (const v of variants) {
      const wrapper = mount(StatusBadge, { props: { label: v, variant: v } });
      const expectedClass = v === 'neutral' ? 'ds-badge--default' : `ds-badge--${v}`;
      expect(wrapper.classes()).toContain(expectedClass);
    }
  });
});
