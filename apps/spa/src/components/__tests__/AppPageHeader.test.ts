import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppPageHeader from '../AppPageHeader.vue';

describe('AppPageHeader', () => {
  it('renders title prop', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Page Title' }
    });
    expect(wrapper.find('.app-page-header__title').text()).toBe('Page Title');
  });

  it('renders subtitle prop', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title', subtitle: 'Subtitle text' }
    });
    expect(wrapper.find('.app-page-header__subtitle').text()).toBe('Subtitle text');
  });

  it('renders title slot', () => {
    const wrapper = mount(AppPageHeader, {
      slots: { title: 'Custom Title <em>HTML</em>' }
    });
    expect(wrapper.find('.app-page-header__title').html()).toContain('Custom Title');
  });

  it('renders subtitle slot', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' },
      slots: { subtitle: 'Custom Subtitle' }
    });
    expect(wrapper.find('.app-page-header__subtitle').text()).toBe('Custom Subtitle');
  });

  it('renders actions slot', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' },
      slots: {
        actions: '<button class="custom-action">Action</button>'
      }
    });
    expect(wrapper.find('.app-page-header__actions').exists()).toBe(true);
    expect(wrapper.find('.custom-action').exists()).toBe(true);
  });

  it('does not render actions slot when empty', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' }
    });
    expect(wrapper.find('.app-page-header__actions').exists()).toBe(false);
  });

  it('applies correct container class', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' }
    });
    expect(wrapper.find('.app-page-header').exists()).toBe(true);
  });
});
