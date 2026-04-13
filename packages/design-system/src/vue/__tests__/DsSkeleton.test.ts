import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DsSkeleton from '../DsSkeleton.vue';

describe('DsSkeleton.vue', () => {
  it('renders a text skeleton with default accessibility label', () => {
    const wrapper = mount(DsSkeleton);

    expect(wrapper.classes()).toContain('ds-skeleton');
    expect(wrapper.classes()).toContain('ds-skeleton--text');
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.attributes('aria-label')).toBe('Carregando...');
    expect(wrapper.attributes('style')).toContain('width: 100%');
    expect(wrapper.attributes('style')).toContain('height: 16px');
  });

  it('respects explicit dimensions and disables animation', () => {
    const wrapper = mount(DsSkeleton, {
      props: {
        variant: 'card',
        width: '320px',
        height: '180px',
        animate: false,
        ariaLabel: 'Carregando cartão'
      }
    });

    expect(wrapper.classes()).toContain('ds-skeleton--card');
    expect(wrapper.classes()).not.toContain('ds-skeleton--animate');
    expect(wrapper.attributes('aria-label')).toBe('Carregando cartão');
    expect(wrapper.attributes('style')).toContain('width: 320px');
    expect(wrapper.attributes('style')).toContain('height: 180px');
  });
});
