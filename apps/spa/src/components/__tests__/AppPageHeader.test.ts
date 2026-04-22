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

  it('renders breadcrumb props in order', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title', breadcrumbs: ['Atendimento', 'Cadastros', 'Pacientes'] }
    });

    expect(wrapper.find('.app-page-header__breadcrumbs').exists()).toBe(true);
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Pacientes');
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

  it('renders standardized CTA props when no actions slot is provided', () => {
    const wrapper = mount(AppPageHeader, {
      props: {
        title: 'Title',
        primaryAction: {
          label: 'Novo',
          to: '/new'
        },
        secondaryActions: [
          {
            label: 'Atualizar',
            variant: 'secondary'
          }
        ]
      }
    });

    expect(wrapper.find('.app-page-header__actions').exists()).toBe(true);
    expect(wrapper.findAll('.ds-btn').length).toBe(2);
    expect(wrapper.text()).toContain('Novo');
    expect(wrapper.text()).toContain('Atualizar');
  });

  it('applies correct container class', () => {
    const wrapper = mount(AppPageHeader, {
      props: { title: 'Title' }
    });
    expect(wrapper.find('.app-page-header').exists()).toBe(true);
  });
});
