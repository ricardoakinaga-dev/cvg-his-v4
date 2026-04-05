import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppDetailSection from '../AppDetailSection.vue';

describe('AppDetailSection', () => {
  it('renders DsCard with app-detail-section class', () => {
    const wrapper = mount(AppDetailSection, {
      slots: { default: 'Content' }
    });
    expect(wrapper.find('.app-detail-section').exists()).toBe(true);
    expect(wrapper.find('.ds-card').exists()).toBe(true);
  });

  it('renders title prop inside DsCard header', () => {
    const wrapper = mount(AppDetailSection, {
      props: { title: 'Details' },
      slots: { default: 'Content' }
    });
    expect(wrapper.find('.ds-card__title').text()).toBe('Details');
    expect(wrapper.find('.ds-card__header').exists()).toBe(true);
  });

  it('renders default slot content wrapped in app-detail-section__content', () => {
    const wrapper = mount(AppDetailSection, {
      slots: { default: '<p>Paragraph</p>' }
    });
    const contentWrapper = wrapper.find('.app-detail-section__content');
    expect(contentWrapper.exists()).toBe(true);
    expect(contentWrapper.html()).toContain('Paragraph');
  });

  it('renders without title', () => {
    const wrapper = mount(AppDetailSection, {
      slots: { default: 'No title' }
    });
    expect(wrapper.find('.ds-card__header').exists()).toBe(false);
    expect(wrapper.text()).toContain('No title');
  });
});
