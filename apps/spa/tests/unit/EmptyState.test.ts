import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from '@/components/EmptyState.vue';

describe('EmptyState', () => {
  it('renders icon, title and description', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: '📋', title: 'Empty', description: 'Nothing here' }
    });
    expect(wrapper.text()).toContain('📋');
    expect(wrapper.text()).toContain('Empty');
    expect(wrapper.text()).toContain('Nothing here');
  });

  it('renders action slot', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: '📋', title: 'Empty' },
      slots: { action: '<button>Click me</button>' }
    });
    expect(wrapper.text()).toContain('Click me');
  });

  it('applies size class', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: '📋', title: 'Empty', size: 'lg' }
    });
    expect(wrapper.classes()).toContain('empty-state--lg');
  });

  it('defaults to md size', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: '📋', title: 'Empty' }
    });
    expect(wrapper.classes()).toContain('empty-state--md');
  });

  it('hides description when not provided', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: '📋', title: 'Empty' }
    });
    expect(wrapper.find('.empty-state__desc').exists()).toBe(false);
  });
});
