import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

describe('SkeletonLoader', () => {
  it('renders with default props', () => {
    const wrapper = mount(SkeletonLoader);
    expect(wrapper.classes()).toContain('skeleton-loader');
    expect(wrapper.classes()).toContain('skeleton-loader--text');
    expect(wrapper.classes()).toContain('skeleton-loader--animate');
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.attributes('aria-label')).toBe('Carregando...');
  });

  it('applies variant class', () => {
    const wrapper = mount(SkeletonLoader, { props: { variant: 'heading' } });
    expect(wrapper.classes()).toContain('skeleton-loader--heading');
  });

  it('applies custom width and height', () => {
    const wrapper = mount(SkeletonLoader, { props: { width: '200px', height: '30px' } });
    expect(wrapper.attributes('style')).toContain('width: 200px');
    expect(wrapper.attributes('style')).toContain('height: 30px');
  });

  it('disables animation', () => {
    const wrapper = mount(SkeletonLoader, { props: { animate: false } });
    expect(wrapper.classes()).not.toContain('skeleton-loader--animate');
  });

  it('renders slot content', () => {
    const wrapper = mount(SkeletonLoader, {
      slots: { default: 'Loading content' }
    });
    expect(wrapper.text()).toContain('Loading content');
  });

  it('applies avatar border radius', () => {
    const wrapper = mount(SkeletonLoader, { props: { variant: 'avatar' } });
    expect(wrapper.classes()).toContain('skeleton-loader--avatar');
  });
});
